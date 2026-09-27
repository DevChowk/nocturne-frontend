import { useEffect, useState } from 'react';
import { REACTION_LABELS } from '../reactions/labels.js';

// Camera reactions floating over a video panel. Rendered as a SIBLING of the
// panel's <video>, never a wrapper, and never inside the mirrored element —
// so the video invariants in VideoCallView hold and GIF text reads the right
// way round on the self-view.
//
// Layering: z-[15] sits above the panel gradient and chips (z-10) and below
// the Connecting overlay, MobileLiveChat (z-20) and banners (z-30). Centered,
// so it clears the corner chips and the friend/report buttons.

const SHOW_MS = 3000;
// A GIF that arrives late still gets this long on screen...
const GIF_MIN_MS = 2000;
// ...but a bubble never outlives this, however late the GIF was.
const MAX_LIFE_MS = 4500;

const prefersReducedMotion = () =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion');

function ReactionBubble({ item, onExpire }) {
  const meta = REACTION_LABELS[item.label];
  // Reduced motion: Giphy's still frame instead of the animation (the global
  // .reduce-motion rule already stops the pop-in).
  const src = item.gif
    ? (prefersReducedMotion() && item.gif.stillUrl ? item.gif.stillUrl : item.gif.url)
    : null;
  // The emoji paints immediately and the GIF swaps in when it decodes. Waiting
  // for the image before showing anything cost up to a second of dead time on
  // every reaction, which is most of what made the feature feel slow.
  const [phase, setPhase] = useState('emoji'); // 'emoji' | 'gif'
  const [mountedAt] = useState(() => Date.now());

  useEffect(() => {
    const elapsed = Date.now() - mountedAt;
    const delay = phase === 'gif'
      ? Math.min(Math.max(GIF_MIN_MS, SHOW_MS - elapsed), Math.max(0, MAX_LIFE_MS - elapsed))
      : SHOW_MS;
    const t = setTimeout(() => onExpire(item.id), delay);
    return () => clearTimeout(t);
  }, [phase, mountedAt, item.id, onExpire]);

  if (!meta) return null;

  return (
    <div
      className="relative flex flex-col items-center reaction-pop"
      role="img"
      aria-label={meta.title}
    >
      {src && (
        // Mounted from the start even while hidden, so the browser fetches and
        // decodes it behind the emoji; `hidden` still loads an <img>.
        <div
          className={`overflow-hidden rounded-xl ${phase === 'gif' ? '' : 'hidden'}`}
          style={{
            width: 'clamp(96px, 32vmin, 200px)',
            // Theme-independent, like .chip-video: video is always dark, so
            // the frame only has to separate itself from the footage.
            border: '2px solid #F7F4EE',
            boxShadow: '4px 4px 0 rgba(0, 0, 0, 0.55)',
            background: 'rgba(0, 0, 0, 0.35)',
          }}
        >
          <img
            src={src}
            alt=""
            width={item.gif.width || undefined}
            height={item.gif.height || undefined}
            className="block w-full h-auto"
            // The peer never opted into loading from Giphy; at least don't
            // tell Giphy which page they were on.
            referrerPolicy="no-referrer"
            decoding="async"
            draggable={false}
            onLoad={() => setPhase('gif')}
            onError={() => setPhase('emoji')}
          />
        </div>
      )}
      {phase === 'emoji' && (
        <span className="text-6xl md:text-7xl leading-none select-none" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.45))' }}>
          {meta.emoji}
        </span>
      )}
      {phase === 'gif' && (
        // Giphy's terms require visible attribution wherever their API is used.
        <span className="chip-video mt-1.5" style={{ fontSize: 8, padding: '3px 7px' }}>Powered by GIPHY</span>
      )}
    </div>
  );
}

// Sits beside the YOU chip on the self-view. Because reactions fire on their
// own, the user must always be able to see the camera is being read, and stop
// it in one tap — this is that control. Hidden while detection is simply idle
// (camera off, peer still connecting), so it never claims to be on when it isn't.
const CHIP = {
  loading: { text: 'Reactions…', title: 'Loading camera reactions' },
  ready: { text: 'Reactions on', title: 'Pause camera reactions', dot: true },
  error: { text: 'Reactions off', title: 'Camera reactions couldn’t start on this device' },
  unsupported: { text: 'Reactions off', title: 'Camera reactions are off while Data Saver is on' },
};

export function ReactionStatusChip({ status, paused, onToggle }) {
  const c = paused
    ? { text: 'Reactions paused', title: 'Resume camera reactions' }
    : CHIP[status];
  if (!c) return null;
  const broken = !paused && (status === 'error' || status === 'unsupported');
  return (
    <button
      type="button"
      onClick={broken ? undefined : onToggle}
      disabled={broken}
      aria-pressed={!broken ? !paused : undefined}
      aria-label={c.title}
      title={c.title}
      className="chip-video transition-opacity active:scale-95 disabled:opacity-60 disabled:cursor-default"
    >
      {c.dot && <span className="chip-dot" style={{ color: 'rgb(var(--color-primary-rgb))' }} aria-hidden="true" />}
      {c.text}
    </button>
  );
}

export default function ReactionOverlay({ items, onExpire, className = '', announce = false }) {
  return (
    <div
      className={`absolute inset-0 z-[15] pointer-events-none flex items-center justify-center gap-3 ${className}`}
      aria-live={announce ? 'polite' : undefined}
    >
      {items.map((item) => (
        <ReactionBubble key={item.id} item={item} onExpire={onExpire} />
      ))}
    </div>
  );
}
