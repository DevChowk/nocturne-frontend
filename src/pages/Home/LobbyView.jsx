import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { SHOW_ONLINE_COUNT } from '../../constants/features';

// Elapsed time is withheld for the first few seconds of a search — see the
// comment at the callsite.
const TIMER_REVEAL_S = 10;

// Shown after WAITING_FALLBACK_MS of an empty queue. Pool of variants keeps
// the experience from feeling robotic when someone hits the dry-spell more
// than once. Picked at random when the fallback triggers.
const QUIET_MESSAGES = [
  { icon: 'bedtime',         heading: "Oops — everyone's sleeping",   subtitle: "No one's free to chat right now. We'll keep looking." },
  { icon: 'nights_stay',     heading: "The night's a little quiet…",   subtitle: "Nobody's online to bump into yet. Hang tight." },
  { icon: 'coffee',          heading: "Everyone's out for coffee",     subtitle: "The room's empty for the moment. Still listening." },
  { icon: 'sentiment_calm',  heading: "Shhh… pretty calm out there",   subtitle: "The rest of the world is busy. We'll ping you." },
  { icon: 'volume_off',      heading: "All quiet on the Bumpp front",  subtitle: "No takers right now. We'll connect you as soon as anyone joins." },
  { icon: 'weekend',         heading: "Empty couches everywhere",      subtitle: "You're early — stick around. Someone'll bump in any moment." },
  { icon: 'hourglass_empty', heading: "A patient soul, we see",        subtitle: "Nobody else is looking right now. Your match is one second away." },
];
const pickQuietMessage = () =>
  QUIET_MESSAGES[Math.floor(Math.random() * QUIET_MESSAGES.length)];

// Small round button used for the inline mic/cam controls that float on
// the video preview. Solid yellow when the underlying track is enabled;
// coral when off (so users see the danger/off read at a glance).
function InlineCtrl({ enabled, onClick, label, iconOn, iconOff }) {
  const off = !enabled;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={off}
      className="flex items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
      style={{
        width: 40, height: 40,
        background: off ? 'rgb(var(--color-tertiary-rgb))' : 'rgb(var(--color-primary-rgb))',
        color: off ? '#FFFFFF' : '#14000A',
        boxShadow: off ? '0 4px 20px rgba(255,79,79,0.35)' : '0 4px 20px rgba(255,212,0,0.35)',
      }}
    >
      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20 }}>
        {enabled ? iconOn : iconOff}
      </span>
    </button>
  );
}

// Neutral variant for the flip (mirror) button — grey surface, not
// yellow, per the Design Book (it's a preference, not an activation).
function InlineNeutralCtrl({ active, onClick, label, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className="flex items-center justify-center rounded-full transition-transform active:scale-95"
      style={{
        width: 40, height: 40,
        // Grey = "idle, not yet relevant" in the Design Book's control
        // colour law. The tile is always on dark footage, so the dark-theme
        // grey is correct in both themes.
        background: active ? '#3F52FF' : '#2A2A38',
        color: active ? '#F7F4EE' : '#8C8598',
      }}
    >
      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20 }}>{icon}</span>
    </button>
  );
}

// Corner self-view for the queue screen. Owns its own <video> (and so its
// own srcObject binding) rather than borrowing the lobby's localVideoRef —
// that element is unmounted while searching, and a ref swap wouldn't
// re-trigger the parent's bind effect. Two elements sharing one
// MediaStream is fine.
function MiniSelfView({ stream, mirrored, enabled }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div
      className="absolute z-10 overflow-hidden video-stage-alt"
      style={{
        left: 14, bottom: 14, width: 108, height: 74, borderRadius: 9,
        border: '1px solid rgba(247,244,238,0.16)',
      }}
      aria-hidden="true"
    >
      {enabled && stream ? (
        <video
          ref={ref}
          className="w-full h-full object-cover"
          style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
          autoPlay playsInline muted
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="material-symbols-outlined text-white/40" style={{ fontSize: 20 }}>videocam_off</span>
        </div>
      )}
    </div>
  );
}

export default function LobbyView({
  user, isGuest, isConnected, socketError, status,
  findMatch, cancel,
  localStream, mediaError,
  micEnabled, cameraEnabled, toggleMic, toggleCamera,
  localVideoRef, mirrorLocal, lastEndReason, onlineCount,
}) {
  const username = user?.username || user?.email?.split('@')[0] || 'You';
  const initial = username[0]?.toUpperCase() ?? '?';
  const { updateSetting } = useSettings();

  useEffect(() => {
    if (localVideoRef?.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoRef]);

  // 30s-into-waiting fallback: swap the radar for a randomly picked
  // "quiet pool" copy variant so the user isn't staring at a forever-
  // spinning ring when the queue is genuinely empty.
  const WAITING_FALLBACK_MS = 30000;
  const [waitingLong, setWaitingLong] = useState(false);
  const [quietMessage, setQuietMessage] = useState(null);

  // Mono elapsed timer shown next to the online count while searching
  // (design spec: "2.4K online · 0:04"). Also serves as the reduce-
  // motion feedback since the pulse rings are CSS-disabled in that mode.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (status !== 'waiting') { setElapsed(0); return; }
    const startedAt = Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status]);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  useEffect(() => {
    if (status !== 'waiting') { setWaitingLong(false); setQuietMessage(null); return; }
    const t = setTimeout(() => { setQuietMessage(pickQuietMessage()); setWaitingLong(true); }, WAITING_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [status]);

  const isSearching = status === 'waiting';
  const isPeerLeft = status === 'peer_left';

  return (
    // Flat ground, no ambient wash: the Design Book lobby is one solid
    // putty/inky field so the yellow CTA and the dark video panel are the
    // only two things with any luminance of their own.
    <div className="text-on-surface font-body flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
      <main className="relative z-10 flex-1 min-h-0 flex flex-col gap-3 md:gap-4 px-2 md:px-4 pb-3 md:pb-4 overflow-hidden">
        {/* ── VIDEO PREVIEW PANEL ──
            2px frame in the layout-rule token (ink on light, #2A2A38 on
            dark) with the 14px radius. Deliberately NOT the sticker stroke:
            that vocabulary belongs to actions, and a paper-white ring would
            cut into the always-dark footage. */}
        <div
          className="video-stage relative flex-1 min-h-0 overflow-hidden"
          style={{
            border: '2px solid rgb(var(--color-rule-rgb))',
            borderRadius: 14,
          }}
        >
          {isSearching ? (
            /* SEARCHING MODE — the video area is entirely swapped for the
               radar panel of Design Book page 10. One pulse, one ring, one
               glow and nothing else: this screen is stared at for forty
               seconds, so there is deliberately nothing to look at. The
               local self-view survives in the corner (note 03) and Cancel
               lives inside the panel, not down in the CTA row. */
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 50% 45%, rgba(255,212,0,0.14), transparent 58%)' }}
              />

              {/* Concentric rings — the outer two are static (they survive
                  reduce-motion as plain rings); only the middle one pulses. */}
              <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 150, height: 150 }}>
                <div className="absolute rounded-full" style={{ width: 150, height: 150, border: '2px solid rgba(255,212,0,0.22)' }} />
                <div className="absolute rounded-full" style={{ width: 104, height: 104, border: '2px solid rgba(255,212,0,0.4)' }} />
                <div className="absolute rounded-full pulse-ring" style={{ width: 104, height: 104, border: '2px solid rgba(255,212,0,0.4)' }} />
                <div
                  className="relative flex items-center justify-center rounded-full bg-primary text-on-primary"
                  style={{ width: 58, height: 58, boxShadow: '0 4px 26px rgba(255,212,0,0.4)' }}
                >
                  <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {waitingLong && quietMessage ? quietMessage.icon : 'sensors'}
                  </span>
                </div>
              </div>

              <div className="z-10 text-center max-w-sm">
                <h3
                  className="font-headline text-white text-xl md:text-2xl"
                  style={{ fontWeight: 800, letterSpacing: '-0.03em' }}
                >
                  {waitingLong && quietMessage ? quietMessage.heading : 'Finding someone…'}
                </h3>
                {waitingLong && quietMessage && (
                  <p className="text-white/70 text-sm leading-relaxed mt-2">{quietMessage.subtitle}</p>
                )}
                {/* Bare mono line, not a chip — count and elapsed time are
                    data. The timer only appears at 10s: honesty beats a fake
                    progress bar, but a 0:01 ticking from the first frame
                    just makes four seconds feel like forty. */}
                <p
                  className="font-mono uppercase tabular-nums mt-3"
                  style={{ fontSize: 11, letterSpacing: '0.16em', color: 'rgba(247,244,238,0.6)' }}
                >
                  {SHOW_ONLINE_COUNT && typeof onlineCount === 'number'
                    ? `${onlineCount.toLocaleString()} online`
                    : 'Searching'}
                  {elapsed >= TIMER_REVEAL_S && (
                    <>
                      <span aria-hidden="true" className="opacity-50"> · </span>
                      <span>{fmt(elapsed)}</span>
                    </>
                  )}
                </p>
              </div>

              {/* Cancel sits in the panel with the radar it cancels. Outline
                  sticker, never coral — leaving the queue isn't a danger. */}
              <button
                type="button"
                onClick={cancel}
                className="btn-sticker-outline z-10 inline-flex items-center justify-center text-sm"
                style={{
                  background: 'rgba(20,20,32,0.85)',
                  color: '#F7F4EE',
                  borderColor: '#F7F4EE',
                  boxShadow: '3px 3px 0 #F7F4EE',
                  paddingBlock: 10,
                  paddingInline: 20,
                  fontWeight: 800,
                }}
              >
                Cancel
              </button>

              {/* Self-view — stays up while queued so you can fix your hair
                  before the match lands. */}
              <MiniSelfView stream={localStream} mirrored={mirrorLocal} enabled={cameraEnabled} />
            </div>
          ) : (
            <>
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover"
                style={mirrorLocal ? { transform: 'scaleX(-1)' } : undefined}
                autoPlay playsInline muted
              />

              {/* Camera-off / permission-denied / requesting overlay */}
              {(!cameraEnabled || !localStream) && (
                <div className="absolute inset-0 flex items-center justify-center video-stage">
                  <div className="flex flex-col items-center gap-3 text-center px-6">
                    {mediaError ? (
                      <>
                        <div className="flex items-center justify-center rounded-full w-14 h-14 md:w-20 md:h-20 bg-tertiary text-white" style={{ boxShadow: '0 8px 30px rgba(255,79,79,0.35)' }}>
                          <span className="material-symbols-outlined text-[28px] md:text-[40px]" aria-hidden="true">videocam_off</span>
                        </div>
                        <p className="font-headline font-semibold text-on-surface">Camera unavailable</p>
                        <p className="text-on-surface-variant text-xs max-w-[260px]">
                          Grant camera and microphone permission in your browser to start matching.
                        </p>
                      </>
                    ) : !localStream ? (
                      <>
                        <span className="material-symbols-outlined text-primary animate-pulse text-[28px] md:text-[40px]" aria-hidden="true">hourglass</span>
                        <p className="text-on-surface-variant font-label text-xs uppercase tracking-widest">Requesting camera…</p>
                      </>
                    ) : (
                      <>
                        <div
                          className="flex items-center justify-center rounded-full font-bold font-headline w-20 h-20 md:w-28 md:h-28 text-3xl md:text-5xl bg-primary text-on-primary"
                          style={{ boxShadow: '0 8px 30px rgba(255,212,0,0.35)' }}
                        >
                          {initial}
                        </div>
                        <p className="text-white/70 font-mono text-[10px] uppercase tracking-[0.18em]">Camera off</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Peer-left / socket-error banner (non-searching states only) */}
              {(isPeerLeft || socketError) && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
                  <span
                    className="chip-video"
                    style={{ background: '#FF4F4F', color: '#14000A' }}
                  >
                    {socketError
                      ? 'Reconnecting…'
                      : lastEndReason === 'nsfw' ? 'Call ended · NSFW' : 'Match disconnected'}
                  </span>
                </div>
              )}

              {/* Brand watermark — bumpp lockup, top-right, always dark
                  (video content is always visually dark regardless of theme). */}
              <div className="absolute top-3 right-3 md:top-5 md:right-5 opacity-65 pointer-events-none select-none z-10">
                <img src="/logo-lockup-dark.svg" alt="" aria-hidden="true" className="h-4 md:h-5 w-auto" />
              </div>

              {/* YOU · PREVIEW — video-overlay chip, bottom-left. */}
              <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4 z-10">
                <span className="chip-video">You · Preview</span>
              </div>

              {/* Inline media controls — bottom-right of the video panel per
                  Design Book. Mic + cam solid yellow round buttons; flip to
                  coral when the underlying track is disabled. Flip (mirror)
                  is the third control — neutral grey since it's a preference
                  toggle, not a hardware activation. */}
              <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 z-10 flex items-center gap-2">
                <InlineCtrl
                  enabled={micEnabled}
                  onClick={toggleMic}
                  label={micEnabled ? 'Mute mic' : 'Unmute mic'}
                  iconOn="mic"
                  iconOff="mic_off"
                />
                <InlineCtrl
                  enabled={cameraEnabled}
                  onClick={toggleCamera}
                  label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                  iconOn="videocam"
                  iconOff="videocam_off"
                />
                <InlineNeutralCtrl
                  active={mirrorLocal}
                  onClick={() => updateSetting('mirrorLocal', !mirrorLocal)}
                  label={mirrorLocal ? 'Turn off mirror' : 'Mirror preview'}
                  icon="flip"
                />
              </div>
            </>
          )}
        </div>

        {/* ── CTA ROW — below the video. Hidden while searching: the queue
            screen owns its own Cancel, and one sticker button per view. ── */}
        {!isSearching && (
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={findMatch}
            disabled={!isConnected}
            className="btn-sticker inline-flex items-center justify-center text-base disabled:opacity-50"
          >
            {isPeerLeft ? 'Find new match' : 'Find match'}
          </button>

          {/* Guest label + upsell — plain mono uppercase text on the page
              ground per Design Book (no filled chip). Signup link stacks
              directly under the counter label. */}
          {isGuest && (
            <div className="flex flex-col gap-1">
              <p
                className="font-mono text-on-surface uppercase tabular-nums"
                style={{ fontSize: 11, letterSpacing: '0.18em' }}
              >
                Guest <span aria-hidden="true" className="opacity-40">·</span> 3 per session
              </p>
              <a
                href="/signup"
                className="text-on-surface font-bold text-sm underline decoration-primary decoration-[3px] underline-offset-4 hover:decoration-4 whitespace-nowrap w-fit"
              >
                Sign up for unlimited
              </a>
            </div>
          )}
        </div>
        )}
      </main>
    </div>
  );
}
