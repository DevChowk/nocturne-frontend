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
    heading: "All quiet on the Bump front",
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

export default function LobbyView({ user, isConnected, socketError, status, findMatch, cancel, localStream, mediaError, micEnabled, cameraEnabled, toggleMic, toggleCamera, localVideoRef, mirrorLocal, lastEndReason, onlineCount, onProfileClick }) {
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
      <div className="pointer-events-none fixed rounded-full blur-3xl" style={{ width: 400, height: 400, top: '15%', left: '-8%', background: 'rgba(186,158,255,0.08)', zIndex: 0 }} />
      <div className="pointer-events-none fixed rounded-full blur-3xl" style={{ width: 350, height: 350, bottom: '10%', right: '-6%', background: 'rgba(0,207,252,0.05)', zIndex: 0 }} />

      {/* Body */}
      <div className="relative z-10 flex flex-1 overflow-hidden min-h-0">
        {/* Main canvas */}
        <main className="flex flex-col md:flex-row flex-1 gap-3 md:gap-4 px-2 md:px-4 overflow-hidden">
          {/* Local feed panel */}
          <div className="relative flex-1 rounded-xl overflow-hidden" style={{ background: '#131313', border: '1px solid rgba(186,158,255,0.12)' }}>
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
                      <div className="flex items-center justify-center rounded-full w-14 h-14 md:w-20 md:h-20" style={{ background: 'rgba(255,110,132,0.15)', color: '#ff6e84' }}>
                        <span className="material-symbols-outlined text-[28px] md:text-[40px]" aria-hidden="true">videocam_off</span>
                      </div>
                      <p className="font-headline font-semibold text-white">Camera unavailable</p>
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
                      <div className="flex items-center justify-center rounded-full font-bold font-headline w-24 h-24 text-4xl md:w-[120px] md:h-[120px] md:text-5xl"
                        style={{ background: 'rgba(186,158,255,0.1)', color: '#ba9eff', boxShadow: '0 0 40px rgba(186,158,255,0.1)' }}>
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
            <div className="absolute top-3 right-3 md:top-5 md:right-5 flex items-center gap-1 opacity-65 pointer-events-none select-none z-10">
              <img src="/favicon.png" alt="" aria-hidden="true" className="w-4 h-4 md:w-5 md:h-5 rounded object-cover" />
              <span className="text-white font-bold tracking-tighter uppercase font-headline text-xs md:text-sm">Bump</span>
            </div>
          </div>

          {/* Searching / idle / peer_left panel */}
          <div className="relative flex-1 rounded-xl overflow-hidden flex flex-col items-center justify-center" style={{ background: '#131313', border: '1px solid rgba(186,158,255,0.12)' }}>
            {status === 'waiting' && waitingLong && quietMessage ? (
              <div className="z-10 text-center px-8 py-10 max-w-sm">
                <div className="flex items-center justify-center mx-auto mb-3 md:mb-5 rounded-full w-14 h-14 md:w-20 md:h-20"
                  style={{ background: '#20201f', boxShadow: '0 0 40px rgba(139,92,246,0.18)' }}>
                  <span className="material-symbols-outlined text-primary text-[28px] md:text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>{quietMessage.icon}</span>
                </div>
                <h3 className="text-base md:text-xl font-bold font-headline text-white mb-1.5 md:mb-2">{quietMessage.heading}</h3>
                <p className="text-on-surface-variant font-label mb-4 md:mb-6 text-xs md:text-sm leading-relaxed">
                  {quietMessage.subtitle}
                </p>
                <div className="flex items-center justify-center gap-2 text-on-surface-variant" style={{ fontSize: 11 }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="font-label uppercase tracking-widest">Still searching</span>
                </div>
              </div>
            ) : status === 'waiting' ? (
              <div className="relative flex items-center justify-center w-full h-full shimmer">
                <div className="absolute w-40 h-40 rounded-full border border-primary/30 pulse-ring" />
                <div className="absolute w-56 h-56 rounded-full border border-primary/20 pulse-ring" style={{ animationDelay: '0.5s' }} />
                <div className="absolute w-72 h-72 rounded-full border border-primary/10 pulse-ring" style={{ animationDelay: '1s' }} />
                <div className="z-10 text-center px-6">
                  <div className="flex items-center justify-center mx-auto mb-3 md:mb-5 rounded-full w-14 h-14 md:w-20 md:h-20"
                    style={{ background: '#20201f', boxShadow: '0 0 40px rgba(139,92,246,0.25)' }}>
                    <span className="material-symbols-outlined text-primary text-[28px] md:text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>radar</span>
                  </div>
                  <h3 className="text-base md:text-xl font-bold font-headline text-white mb-1.5 md:mb-2">Searching for Stranger...</h3>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-on-surface-variant font-label uppercase tracking-widest" style={{ fontSize: 10 }}>Scanning nodes</span>
                    <span className="flex gap-1">
                      {[0, 0.2, 0.4].map((d, i) => (
                        <span key={i} className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                      ))}
                    </span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                  <h2 className="text-base font-bold font-headline text-on-surface-variant">Incoming Connection...</h2>
                  <p className="text-on-surface-variant font-label uppercase tracking-widest" style={{ fontSize: 10 }}>Secure Bump Pulse</p>
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
                <div className="flex items-center justify-center mx-auto mb-3 md:mb-5 rounded-full w-14 h-14 md:w-20 md:h-20"
                  style={{ background: '#20201f', boxShadow: '0 0 40px rgba(139,92,246,0.2)' }}>
                  <span className="material-symbols-outlined text-primary text-[28px] md:text-[40px]">people</span>
                </div>
                <h3 className="text-base md:text-xl font-bold font-headline text-white mb-1.5 md:mb-2">
                  {status === 'peer_left' ? 'Match Ended' : 'Ready to Connect'}
                </h3>
                <p className="text-on-surface-variant font-label mb-4 md:mb-6 text-xs md:text-sm">
                  {status === 'peer_left' ? 'Find a new connection below.' : 'Start a random video chat.'}
                </p>
                <button
                  onClick={findMatch}
                  disabled={!isConnected}
                  className="px-6 py-2.5 md:px-8 md:py-3.5 rounded-full text-black font-bold font-headline transition-all duration-300 active:scale-95 disabled:opacity-50 text-sm md:text-[0.95rem]"
                  style={{ backgroundImage: GRADIENT }}>
                  {status === 'peer_left' ? 'Find New Match' : 'Find Match'}
                </button>
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
