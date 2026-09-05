import { memo, useEffect, useRef } from 'react';
import { clipSrc, clipPoster } from './clips';

// One mini in-call screen. This is a deliberate hand-copy of the real thing
// (pages/Home/VideoCallView.jsx L179-343): same two-panel stack, same
// .chip-video vocabulary, same --color-rule-rgb frames, shrunk to a wall
// tile. The wall's whole job is to be a picture of the product, so if the
// in-call screen changes, THIS MUST CHANGE TOO.
//
// Not shared with the real panels on purpose: those carry WebRTC refs,
// friend/report actions, reconnect overlays and a chat dock, none of which
// belong on a landing page.

// Chip sizing: .chip-video is scaled for a full-screen panel (10px text,
// 4px 10px padding). Tiles are smaller than that, so the scale is
// overridden inline. The class still carries the identity that matters —
// mono, .14em tracking, uppercase, black scrim, blur.
const CHIP = { padding: '3px 8px', fontSize: 9 };

// Mounted only when the parent selects this panel for playback. Unmounting
// (rather than pausing) is what actually releases the decoder.
function ClipVideo({ id, mirrored, onBlocked, onError }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Set muted imperatively as well as via the attribute: the classic iOS
    // autoplay failure is a video that is muted in the DOM but not yet on
    // the element when play() is called.
    el.muted = true;
    const p = el.play();
    if (p?.catch) {
      p.catch((err) => {
        // NotAllowedError is the expected one — iOS Low Power Mode blocks
        // even muted inline autoplay. Tell the parent so the WHOLE wall
        // drops to posters instead of each tile failing separately.
        if (err?.name === 'NotAllowedError') onBlocked?.();
        else onError?.(id);
      });
    }
  }, [id, onBlocked, onError]);

  return (
    <video
      ref={ref}
      src={clipSrc(id)}
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
      disablePictureInPicture
      disableRemotePlayback
      tabIndex={-1}
      aria-hidden="true"
      onError={() => onError?.(id)}
      className="absolute inset-0 w-full h-full object-cover"
      style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
    />
  );
}

function Panel({ id, playing, mirrored, alt, children, onBlocked, onError }) {
  return (
    <div className={`${alt ? 'video-stage-alt' : 'video-stage'} relative flex-1 min-h-0 overflow-hidden`}>
      {id && (
        <img
          src={clipPoster(id)}
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchpriority="low"
          className="absolute inset-0 w-full h-full object-cover"
          style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
          // A missing poster falls through to the .video-stage gradient,
          // which is exactly the decorative panel this wall replaced.
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      {id && playing && (
        <ClipVideo id={id} mirrored={mirrored} onBlocked={onBlocked} onError={onError} />
      )}
      <div className="absolute inset-0 video-gradient-overlay pointer-events-none" />
      {children}
    </div>
  );
}

function CallTile({ tile, playThem, playYou, compact, onBlocked, onError }) {
  return (
    <div
      className="relative flex flex-col overflow-hidden select-none"
      style={{
        aspectRatio: '9 / 16',
        borderRadius: 12,
        border: '2px solid rgb(var(--color-rule-rgb))',
        // Shows through the 2px row gap as the inter-panel rule, so the
        // divider costs no extra element.
        background: 'rgb(var(--color-rule-rgb))',
        rowGap: 2,
      }}
    >
      {/* Stranger — top panel, as on mobile in-call. */}
      <Panel id={tile.them} playing={playThem} onBlocked={onBlocked} onError={onError}>
        {!compact && tile.country && (
          <div className="absolute top-2 left-2 z-10">
            <span className="chip-video" style={CHIP}>{tile.country}</span>
          </div>
        )}
      </Panel>

      {/* You — bottom panel. With no clip, this renders the real camera-off
          state, which reads as an empty seat waiting for the visitor. */}
      <Panel id={tile.you} playing={playYou} mirrored alt onBlocked={onBlocked} onError={onError}>
        {/* Empty seat. Grey, not yellow — the Design Book's control-colour
            law reads grey as "idle, not yet relevant", which is exactly
            what this is. A yellow badge here reads as a missing asset. */}
        {!tile.you && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 26,
                height: 26,
                background: 'rgba(247,244,238,0.07)',
                border: '1px solid rgba(247,244,238,0.16)',
              }}
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
                style={{ fontSize: 14, color: 'rgba(247,244,238,0.32)' }}
              >
                person
              </span>
            </div>
          </div>
        )}
        <div className="absolute top-2 left-2 z-10">
          <span className="chip-video" style={CHIP}>You</span>
        </div>
      </Panel>
    </div>
  );
}

export default memo(CallTile);
