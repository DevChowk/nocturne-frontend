import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import CallTile from './CallTile';
import {
  TILES, COLUMN_SPEEDS, COLUMN_DIRECTIONS, MAX_CONCURRENT, buildColumns,
} from './clips';

// The landing-page clip wall: columns of mini in-call tiles drifting past,
// so a first-time visitor can SEE what a Bumpp call looks like instead of
// reading a promise about it.
//
// Everything expensive is gated. The wall pauses when it scrolls out of
// view or the tab is hidden, only a handful of videos are ever mounted at
// once, and it degrades — in this order — to posters-only, then to a static
// grid, then to bare gradients if no media exists at all. It must never be
// the reason this page is slow, and it must never look broken.

// Decides how many videos may exist at once. Mirrors the capability
// sniffing already used by hooks/useNsfwScanner.js so there's one house
// style for "how much can this device take".
function playbackBudget() {
  if (typeof window === 'undefined') return { mode: 'poster', cap: 0 };

  const conn = navigator.connection;
  // Someone on a metered/slow connection did not ask to download a wall of
  // video to look at a homepage.
  if (conn?.saveData === true) return { mode: 'poster', cap: 0 };
  if (['slow-2g', '2g'].includes(conn?.effectiveType)) return { mode: 'poster', cap: 0 };

  // Autoplaying video IS motion. Someone who asked for less of it gets
  // stills, not just a wall that has stopped sliding.
  if (document.documentElement.classList.contains('reduce-motion')) {
    return { mode: 'poster', cap: 0 };
  }
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return { mode: 'poster', cap: 0 };
  }

  const w = window.innerWidth;
  let cap = w >= 1024 ? MAX_CONCURRENT.desktop
    : w >= 768 ? MAX_CONCURRENT.tablet
    : MAX_CONCURRENT.mobile;

  // Weak devices get half. deviceMemory is Chromium-only; absent means
  // "assume fine" rather than "assume bad".
  const cores = navigator.hardwareConcurrency;
  const mem = navigator.deviceMemory;
  if ((cores && cores < 4) || (mem && mem < 4)) cap = Math.max(1, Math.floor(cap / 2));

  return { mode: 'video', cap };
}

// Fewer columns than the wall could physically fit: at four the tiles get
// too small to read a face, which is the entire point of the wall.
function columnCountFor(width) {
  if (width >= 1024) return 3;
  return 2;
}

export default function ClipWall({ className = '', style }) {
  const wallRef = useRef(null);
  const [columnCount, setColumnCount] = useState(
    () => columnCountFor(typeof window === 'undefined' ? 1280 : window.innerWidth)
  );
  const [budget, setBudget] = useState(() => ({ mode: 'poster', cap: 0 }));
  // Assume visible where IntersectionObserver isn't available, so the wall
  // still animates rather than sitting permanently paused.
  const [visible, setVisible] = useState(
    () => typeof IntersectionObserver === 'undefined'
  );
  // Clips that failed to load (404, decode error). State rather than a ref
  // because the selection below is derived during render.
  const [dead, setDead] = useState(() => new Set());

  const columns = useMemo(
    () => buildColumns(TILES, columnCount),
    [columnCount]
  );

  // Narrow tiles can't carry the country chip or the watermark — at two
  // columns on a phone a panel is ~150px wide and the chips would own it.
  const compact = columnCount <= 2;

  // Resolve the budget after mount (not during render — it reads the DOM
  // class that SettingsProvider stamps) and keep it current on resize.
  useEffect(() => {
    const recompute = () => {
      setBudget(playbackBudget());
      setColumnCount(columnCountFor(window.innerWidth));
    };
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, []);

  // One observer on the whole wall, not one per tile: if the wall isn't on
  // screen, nothing in it should be costing anything.
  useEffect(() => {
    const el = wallRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Backgrounded tabs already throttle, but explicit teardown means a
  // landing page left open in a background tab costs nothing at all.
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible'
  );
  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const active = visible && tabVisible;
  const playing = active && budget.mode === 'video' && budget.cap > 0;

  // Which tile instances may mount a video. Derived, not state: it is a
  // pure function of the budget and the column layout, and deriving it
  // avoids a render-then-correct pass every time either changes.
  // Deliberately stable — reselecting from scroll position every frame
  // would churn mounts and defeat the point of the cap.
  const live = useMemo(() => {
    const none = { them: new Set(), you: new Set() };
    if (!playing) return none;
    const candidates = [];
    columns.forEach((col, ci) => {
      col.forEach((tile, ti) => {
        if (!dead.has(tile.them)) candidates.push({ key: `${ci}:${ti}`, tile });
      });
    });
    // The budget counts VIDEO ELEMENTS, not tiles, and a tile with a "you"
    // clip needs two. Spend most of it on breadth — a wall where four tiles
    // are moving looks more alive than one where two are moving twice as
    // hard — and the remainder on depth, so some tiles show a full call.
    const youBudget = Math.floor(budget.cap / 3);
    const themBudget = budget.cap - youBudget;
    const step = Math.max(1, Math.floor(candidates.length / themBudget));
    const them = new Set();
    for (let i = 0; i < candidates.length && them.size < themBudget; i += step) {
      them.add(candidates[i].key);
    }
    const you = new Set();
    for (const { key, tile } of candidates) {
      if (you.size >= youBudget) break;
      if (them.has(key) && tile.you) you.add(key);
    }
    return { them, you };
  }, [playing, columns, budget.cap, dead]);

  // First autoplay rejection answers for the whole wall — don't let six
  // elements each fail independently.
  const handleBlocked = useCallback(() => {
    setBudget((b) => (b.mode === 'poster' ? b : { mode: 'poster', cap: 0 }));
  }, []);

  // A tap anywhere counts as the user gesture that unlocks playback, so an
  // iOS Low Power Mode visitor who touches the CTA gets the wall alive.
  useEffect(() => {
    if (budget.mode !== 'poster') return;
    const retry = () => setBudget(playbackBudget());
    document.addEventListener('pointerdown', retry, { once: true });
    return () => document.removeEventListener('pointerdown', retry);
  }, [budget.mode]);

  // A dead clip is never selected again; its tile falls back to its poster
  // and the rest of the wall is unaffected.
  const handleError = useCallback((id) => {
    setDead((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  if (!columns.length) return null;

  return (
    <div className={className} style={style}>
      <div
        ref={wallRef}
        // Decorative: the headline and the online count carry the message.
        // pointer-events-none also stops it stealing taps from the CTA.
        aria-hidden="true"
        className={`relative overflow-hidden pointer-events-none ${active ? '' : 'clip-wall-paused'}`}
        style={{
          border: '2px solid rgb(var(--color-rule-rgb))',
          borderRadius: 14,
          height: '100%',
        }}
      >
        <div className="clip-wall-fade clip-wall-fade-top" />
        <div className="clip-wall-fade clip-wall-fade-bottom" />

        <div className="flex h-full" style={{ gap: 10, padding: 10 }}>
          {columns.map((col, ci) => (
            <div
              key={ci}
              className="clip-column flex-1 min-w-0 overflow-hidden"
              style={{
                '--drift-duration': `${COLUMN_SPEEDS[ci % COLUMN_SPEEDS.length]}s`,
                // Negative delay starts each column part-way through its
                // loop, so the wall looks alive on the very first frame
                // instead of every column snapping from the top together.
                '--drift-delay': `${-ci * 9}s`,
              }}
            >
              <div
                className={`clip-track ${
                  COLUMN_DIRECTIONS[ci % COLUMN_DIRECTIONS.length] === 'down' ? 'clip-track-down' : ''
                }`}
              >
                {/* The list twice — see the -50% loop in index.css. */}
                {[...col, ...col].map((tile, i) => {
                  const copyIndex = i % col.length;
                  const key = `${ci}:${copyIndex}`;
                  // Only the first copy may hold a video; the duplicate is
                  // purely visual filler, so it never doubles the decoders.
                  const isFirstCopy = i < col.length;
                  const themLive = isFirstCopy && live.them.has(key);
                  const youLive = isFirstCopy && live.you.has(key);
                  return (
                    <CallTile
                      key={`${tile.id}-${i}`}
                      tile={tile}
                      playThem={themLive}
                      playYou={youLive && !!tile.you}
                      compact={compact}
                      onBlocked={handleBlocked}
                      onError={handleError}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
