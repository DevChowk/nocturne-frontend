import { useEffect, useState } from 'react';
import { GRADIENT } from '../../constants/theme';
import CallControlsBar from '../../components/CallControlsBar';

// Shown after WAITING_FALLBACK_MS of an empty queue. Pool of variants keeps
// the experience from feeling robotic when someone hits the dry-spell more
// than once. Picked at random when the fallback triggers.
const QUIET_MESSAGES = [
  {
    icon: 'bedtime',
    heading: "Oops — looks like everyone's sleeping",
    subtitle: "No one's free to chat right now. We'll keep looking — you'll connect the moment someone joins.",
  },
  {
    icon: 'nights_stay',
    heading: "The night's a little quiet...",
    subtitle: "Nobody's online to bump into yet. Hang tight — we'll match you the second someone shows up.",
  },
  {
    icon: 'coffee',
    heading: "Everyone's out for coffee",
    subtitle: "The room's empty for the moment. We're still listening for new arrivals.",
  },
  {
    icon: 'sentiment_calm',
    heading: "Shhh... it's pretty calm out there",
    subtitle: "Looks like the rest of the world is busy. We'll let you know the moment someone shows up.",
  },
  {
    icon: 'volume_off',
    heading: "All quiet on the Bumpp front",
    subtitle: "No takers right now. We'll connect you as soon as anyone joins the queue.",
  },
  {
    icon: 'weekend',
    heading: "Empty couches everywhere",
    subtitle: "You're early — stick around. Someone'll bump in any moment now.",
  },
  {
    icon: 'hourglass_empty',
    heading: "A patient soul, we see",
    subtitle: "Nobody else is looking right now. Stay with us — your match could be one second away.",
  },
];

const pickQuietMessage = () =>
  QUIET_MESSAGES[Math.floor(Math.random() * QUIET_MESSAGES.length)];

export default function LobbyView({ user, isGuest, isConnected, socketError, status, findMatch, cancel, localStream, mediaError, micEnabled, cameraEnabled, toggleMic, toggleCamera, localVideoRef, mirrorLocal, lastEndReason, onlineCount, onProfileClick }) {
  const username = user?.username || user?.email?.split('@')[0] || 'You';
  const initial = username[0]?.toUpperCase() ?? '?';

  // Wire the persistent local stream into the lobby preview <video>.
  useEffect(() => {
    if (localVideoRef?.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoRef]);

  // After 30s of waiting with no match, swap to a quiet-pool fallback.
  // Backend keeps searching — this is purely a UI change so the user isn't
  // staring at a forever-radar when the app is empty. A random message from
  // QUIET_MESSAGES is picked at the moment the fallback triggers, so the
  // same user hitting a dry spell twice in a row sees different copy.
  const WAITING_FALLBACK_MS = 30000;
  const [waitingLong, setWaitingLong] = useState(false);
  const [quietMessage, setQuietMessage] = useState(null);

  // Mono elapsed-time counter shown alongside the online-count chip while
  // searching. Design Book spec: "2.4K online · 0:04" — reassures the user
  // that we're still trying even when nothing visibly changes. Also
  // doubles as the reduce-motion fallback (design spec: swap the pulse
  // for a static ring and a mono timer) since the ring animation is
  // already disabled via the `.reduce-motion .pulse-ring` rule in CSS.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (status !== 'waiting') { setElapsed(0); return; }
    const startedAt = Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status]);
  const formatElapsed = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  useEffect(() => {
    if (status !== 'waiting') {
      setWaitingLong(false);
      setQuietMessage(null);
      return;
    }
    const t = setTimeout(() => {
      setQuietMessage(pickQuietMessage());
      setWaitingLong(true);
    }, WAITING_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <div className="text-on-surface font-body flex-1 min-h-0 min-w-0" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Ambient glows */}
      <div className="pointer-events-none fixed rounded-full blur-3xl" style={{ width: 400, height: 400, top: '15%', left: '-8%', background: 'rgba(255,212,0,0.08)', zIndex: 0 }} />
      <div className="pointer-events-none fixed rounded-full blur-3xl" style={{ width: 350, height: 350, bottom: '10%', right: '-6%', background: 'rgba(63,82,255,0.05)', zIndex: 0 }} />

      {/* Body */}
      <div className="relative z-10 flex flex-1 overflow-hidden min-h-0">
        {/* Main canvas */}
        <main className="flex flex-col md:flex-row flex-1 gap-3 md:gap-4 px-2 md:px-4 overflow-hidden">
          {/* Local feed panel */}
          <div className="video-stage relative flex-1 rounded-xl overflow-hidden" style={{ border: '1px solid rgb(var(--color-outline-variant-rgb) / 0.5)' }}>
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover"
              style={mirrorLocal ? { transform: 'scaleX(-1)' } : undefined}
              autoPlay playsInline muted
            />
            {(!cameraEnabled || !localStream) && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-container-low">
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
                      <div className="flex items-center justify-center rounded-full font-bold font-headline w-24 h-24 text-4xl md:w-[120px] md:h-[120px] md:text-5xl bg-primary text-on-primary shadow-lg"
                        style={{ boxShadow: '0 8px 30px rgba(255,212,0,0.35)' }}>
                        {initial}
                      </div>
                      <p className="hidden md:block text-on-surface-variant font-label text-xs uppercase tracking-widest">Camera Off</p>
                    </>
                  )}
                </div>
              </div>
            )}
            {/* Brand mark — top-right of the local panel. Same look as the
                in-call brand mark so users see consistent branding. */}
            <div className="absolute top-3 right-3 md:top-5 md:right-5 opacity-65 pointer-events-none select-none z-10">
              {/* Local video panel — always dark ground, always dark lockup. */}
              <img src="/logo-lockup-dark.svg" alt="" aria-hidden="true" className="h-4 md:h-5 w-auto" />
            </div>
          </div>

          {/* Searching / idle / peer_left panel */}
          <div className="video-stage-alt relative flex-1 rounded-xl overflow-hidden flex flex-col items-center justify-center" style={{ border: '1px solid rgb(var(--color-outline-variant-rgb) / 0.5)' }}>
            {status === 'waiting' && waitingLong && quietMessage ? (
              <div className="z-10 text-center px-8 py-10 max-w-sm">
                <div className="flex items-center justify-center mx-auto mb-3 md:mb-5 rounded-full w-14 h-14 md:w-20 md:h-20"
                  style={{ background: 'rgb(var(--color-surface-high-rgb))', boxShadow: '0 0 40px rgba(255,212,0,0.18)' }}>
                  <span className="material-symbols-outlined text-primary text-[28px] md:text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>{quietMessage.icon}</span>
                </div>
                <h3 className="text-base md:text-xl font-bold font-headline text-on-surface mb-1.5 md:mb-2">{quietMessage.heading}</h3>
                <p className="text-on-surface-variant font-label mb-4 md:mb-6 text-xs md:text-sm leading-relaxed">
                  {quietMessage.subtitle}
                </p>
                <div className="flex items-center justify-center gap-2 text-on-surface-variant" style={{ fontSize: 11 }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="font-label uppercase tracking-widest">Still searching</span>
                </div>
              </div>
            ) : status === 'waiting' ? (
              <div
                className="relative flex items-center justify-center w-full h-full overflow-hidden"
                style={{ background: 'radial-gradient(circle at 50% 45%, rgba(255,212,0,0.14), transparent 58%)' }}
              >
                {/* Concentric sonar rings — sizes match the Design Book radar
                    (58 / 104 / 150px), with alternating pulse cadence so the
                    rings never all fire together. */}
                <div className="absolute rounded-full border-2 border-primary/50 pulse-ring" style={{ width: 58, height: 58 }} />
                <div className="absolute rounded-full border-2 border-primary/30 pulse-ring" style={{ width: 104, height: 104, animationDelay: '0.5s' }} />
                <div className="absolute rounded-full border-2 border-primary/20 pulse-ring" style={{ width: 150, height: 150, animationDelay: '1s' }} />
                <div className="z-10 text-center px-6">
                  <div className="flex items-center justify-center mx-auto mb-4 rounded-full bg-primary text-on-primary"
                    style={{ width: 56, height: 56, boxShadow: '0 8px 30px rgba(255,212,0,0.35)' }}>
                    <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>sensors</span>
                  </div>
                  <h3 className="text-base md:text-xl font-bold font-headline text-on-surface mb-2">Finding someone…</h3>
                  <span className="chip-sticker" style={{ background: 'rgb(var(--color-surface-high-rgb))' }}>
                    <span className="chip-dot" style={{ background: '#3F52FF' }} />
                    {typeof onlineCount === 'number' ? `${onlineCount.toLocaleString()} online` : 'searching'}
                    <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
                    <span className="tabular-nums" aria-label={`Elapsed ${formatElapsed(elapsed)}`}>{formatElapsed(elapsed)}</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="z-10 text-center px-8">
                {status === 'peer_left' && lastEndReason === 'nsfw' && (
                  <p className="text-error text-sm mb-4 font-label">Call ended — inappropriate content detected.</p>
                )}
                {status === 'peer_left' && lastEndReason !== 'nsfw' && (
                  <p className="text-error text-sm mb-4 font-label">Your match disconnected.</p>
                )}
                {socketError && <p className="text-error text-sm mb-4 font-label">Couldn't connect to the server. Check your internet connection.</p>}
                <div className="flex items-center justify-center mx-auto mb-3 md:mb-5 rounded-full bg-primary text-on-primary"
                  style={{ width: 56, height: 56, boxShadow: '0 8px 30px rgba(255,212,0,0.35)' }}>
                  <span className="material-symbols-outlined text-[28px]">group</span>
                </div>
                <h3 className="text-base md:text-xl font-bold font-headline text-on-surface mb-1.5 md:mb-2">
                  {status === 'peer_left' ? 'Match Ended' : 'Ready to Connect'}
                </h3>
                <p className="text-on-surface-variant font-label mb-4 md:mb-6 text-xs md:text-sm">
                  {status === 'peer_left' ? 'Find a new connection below.' : 'Start a random video chat.'}
                </p>
                <button
                  onClick={findMatch}
                  disabled={!isConnected}
                  className="btn-sticker px-6 py-2.5 md:px-8 md:py-3.5 disabled:opacity-50 text-sm md:text-[0.95rem]"
                >
                  {status === 'peer_left' ? 'Find New Match' : 'Find Match'}
                </button>
                {/* Guest expectation-setter — no live count (server doesn't
                    expose one), so we surface the cap as a static hint. */}
                {isGuest && (
                  <div className="mt-6 flex justify-center">
                    <span
                      className="chip-sticker"
                      style={{ background: 'rgb(var(--color-primary-rgb))', color: '#14000A' }}
                    >
                      Guest · 3 matches / session
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Bottom nav */}
      <CallControlsBar
        controls={[
          { type: 'next', onClick: findMatch, disabled: !isConnected, loading: status === 'waiting', title: 'Find match' },
          { type: 'mic', enabled: micEnabled, onClick: toggleMic },
          { type: 'cam', enabled: cameraEnabled, onClick: toggleCamera },
          { type: 'stop', onClick: cancel, disabled: status !== 'waiting', title: 'Cancel search' },
        ]}
      />
    </div>
  );
}
