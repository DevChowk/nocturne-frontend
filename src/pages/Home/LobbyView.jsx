import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GRADIENT } from '../../constants/theme';
import ProfileModal from '../../components/ProfileModal';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';
import SettingsModal from '../../components/SettingsModal';
import ProfileEditModal from '../../components/ProfileEditModal';

export default function LobbyView({ user, isConnected, socketError, status, findMatch, cancel, logout, localStream, mediaError, micEnabled, cameraEnabled, toggleMic, toggleCamera, localVideoRef, mirrorLocal, devices }) {
  const username = user?.username || user?.email?.split('@')[0] || 'You';
  const initial = username[0]?.toUpperCase() ?? '?';
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const navigate = useNavigate();

  // Wire the persistent local stream into the lobby preview <video>.
  useEffect(() => {
    if (localVideoRef?.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoRef]);

  return (
    <div className="bg-background text-on-surface font-body" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Ambient glows */}
      <div className="pointer-events-none fixed rounded-full blur-3xl" style={{ width: 400, height: 400, top: '15%', left: '-8%', background: 'rgba(186,158,255,0.08)', zIndex: 0 }} />
      <div className="pointer-events-none fixed rounded-full blur-3xl" style={{ width: 350, height: 350, bottom: '10%', right: '-6%', background: 'rgba(0,207,252,0.05)', zIndex: 0 }} />

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-6 py-4 flex-shrink-0" style={{ background: '#0e0e0e' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 26, fontVariationSettings: "'FILL' 1" }}>bedroom_parent</span>
            <span className="text-xl font-bold tracking-tighter text-white uppercase font-headline">Nocturne</span>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: '#131313' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: isConnected ? '#00cffc' : '#ff6e84', boxShadow: isConnected ? '0 0 6px #00cffc' : 'none' }} />
            <span className="text-on-surface-variant font-label uppercase tracking-wider" style={{ fontSize: 11 }}>
              {isConnected ? 'Online' : 'Disconnected'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="hidden sm:inline text-on-surface-variant text-xs md:text-sm font-label truncate max-w-[140px] md:max-w-[220px]">{user?.username ? `@${user.username}` : user?.email}</span>
          <button
            onClick={() => setShowProfile(true)}
            aria-label="Open profile menu"
            title="Profile"
            className="flex items-center justify-center rounded-full font-bold font-headline transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 flex-shrink-0"
            style={{
              width: 40, height: 40, fontSize: 16,
              background: 'rgba(186,158,255,0.15)',
              color: '#ba9eff',
              boxShadow: '0 0 12px rgba(186,158,255,0.15)',
            }}
          >
            {initial}
          </button>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="relative z-10 flex flex-1 overflow-hidden" style={{ paddingBottom: 80 }}>
        {/* Sidebar */}
        <nav className="hidden md:flex flex-col flex-shrink-0 pt-6 pb-6" style={{ width: 240, background: '#131313' }}>
          {/* User info */}
          <div className="flex items-center gap-3 px-5 mb-8">
            <div className="flex-shrink-0 flex items-center justify-center rounded-xl font-bold font-headline text-lg"
              style={{ width: 42, height: 42, background: 'rgba(186,158,255,0.15)', color: '#ba9eff' }}>
              {initial}
            </div>
            <div>
              <p className="text-white font-bold font-headline text-sm leading-tight">{isConnected ? 'Connected' : 'Offline'}</p>
              <p className="text-on-surface-variant font-label" style={{ fontSize: 11 }}>{username}</p>
            </div>
          </div>

        </nav>

        {/* Main canvas */}
        <main className="flex flex-col md:flex-row flex-1 gap-3 md:gap-4 p-3 md:p-4 overflow-hidden">
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
                      <div className="flex items-center justify-center rounded-full" style={{ width: 80, height: 80, background: 'rgba(255,110,132,0.15)', color: '#ff6e84' }}>
                        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 40 }}>videocam_off</span>
                      </div>
                      <p className="font-headline font-semibold text-white">Camera unavailable</p>
                      <p className="text-on-surface-variant text-xs max-w-[260px]">
                        Grant camera and microphone permission in your browser to start matching.
                      </p>
                    </>
                  ) : !localStream ? (
                    <>
                      <span className="material-symbols-outlined text-primary animate-pulse" aria-hidden="true" style={{ fontSize: 40 }}>hourglass</span>
                      <p className="text-on-surface-variant font-label text-xs uppercase tracking-widest">Requesting camera…</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center rounded-full font-bold font-headline text-4xl"
                        style={{ width: 96, height: 96, background: 'rgba(186,158,255,0.1)', color: '#ba9eff', boxShadow: '0 0 40px rgba(186,158,255,0.1)' }}>
                        {initial}
                      </div>
                      <p className="text-on-surface-variant font-label text-xs uppercase tracking-widest">Camera Off</p>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-5" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
              <h2 className="text-lg font-bold font-headline text-white">{username} (You)</h2>
              <p className="text-on-surface-variant font-label uppercase tracking-widest" style={{ fontSize: 10 }}>
                Local Feed • {isConnected ? 'Active' : 'Offline'}
              </p>
            </div>
            {/* Mic / camera quick toggles in lobby */}
            {localStream && (
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={toggleMic}
                  aria-pressed={!micEnabled}
                  aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
                  title={micEnabled ? 'Mute' : 'Unmute'}
                  className="flex items-center justify-center rounded-full border backdrop-blur-md transition-all duration-200 active:scale-95"
                  style={{
                    width: 44, height: 44,
                    ...(micEnabled
                      ? { background: 'rgba(19,19,19,0.6)', borderColor: 'rgba(186,158,255,0.25)', color: '#ba9eff' }
                      : { background: 'rgba(167,1,56,0.5)', borderColor: 'rgba(167,1,56,0.6)', color: '#ff6e84' }),
                  }}
                >
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">{micEnabled ? 'mic' : 'mic_off'}</span>
                </button>
                <button
                  onClick={toggleCamera}
                  aria-pressed={!cameraEnabled}
                  aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                  title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
                  className="flex items-center justify-center rounded-full border backdrop-blur-md transition-all duration-200 active:scale-95"
                  style={{
                    width: 44, height: 44,
                    ...(cameraEnabled
                      ? { background: 'rgba(19,19,19,0.6)', borderColor: 'rgba(186,158,255,0.25)', color: '#ba9eff' }
                      : { background: 'rgba(167,1,56,0.5)', borderColor: 'rgba(167,1,56,0.6)', color: '#ff6e84' }),
                  }}
                >
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">{cameraEnabled ? 'videocam' : 'videocam_off'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Searching / idle / peer_left panel */}
          <div className="relative flex-1 rounded-xl overflow-hidden flex flex-col items-center justify-center" style={{ background: '#131313' }}>
            {status === 'waiting' ? (
              <div className="relative flex items-center justify-center w-full h-full shimmer">
                <div className="absolute w-40 h-40 rounded-full border border-primary/30 pulse-ring" />
                <div className="absolute w-56 h-56 rounded-full border border-primary/20 pulse-ring" style={{ animationDelay: '0.5s' }} />
                <div className="absolute w-72 h-72 rounded-full border border-primary/10 pulse-ring" style={{ animationDelay: '1s' }} />
                <div className="z-10 text-center px-6">
                  <div className="flex items-center justify-center mx-auto mb-5 rounded-full"
                    style={{ width: 80, height: 80, background: '#20201f', boxShadow: '0 0 40px rgba(139,92,246,0.25)' }}>
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 40, fontVariationSettings: "'FILL' 1" }}>radar</span>
                  </div>
                  <h3 className="text-xl font-bold font-headline text-white mb-2">Searching for Stranger...</h3>
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
                  <p className="text-on-surface-variant font-label uppercase tracking-widest" style={{ fontSize: 10 }}>Secure Nocturne Pulse</p>
                </div>
              </div>
            ) : (
              <div className="z-10 text-center px-8">
                {status === 'peer_left' && <p className="text-error text-sm mb-4 font-label">Your match disconnected.</p>}
                {socketError && <p className="text-error text-sm mb-4 font-label">Couldn't connect to the server. Check your internet connection.</p>}
                <div className="flex items-center justify-center mx-auto mb-5 rounded-full"
                  style={{ width: 80, height: 80, background: '#20201f', boxShadow: '0 0 40px rgba(139,92,246,0.2)' }}>
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 40 }}>people</span>
                </div>
                <h3 className="text-xl font-bold font-headline text-white mb-2">
                  {status === 'peer_left' ? 'Match Ended' : 'Ready to Connect'}
                </h3>
                <p className="text-on-surface-variant font-label mb-6 text-sm">
                  {status === 'peer_left' ? 'Find a new connection below.' : 'Start a random video chat.'}
                </p>
                <button
                  onClick={findMatch}
                  disabled={!isConnected}
                  className="px-8 py-3.5 rounded-full text-black font-bold font-headline transition-all duration-300 active:scale-95 disabled:opacity-50"
                  style={{ backgroundImage: GRADIENT, fontSize: '0.95rem' }}>
                  {status === 'peer_left' ? 'Find New Match' : 'Find Match'}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex justify-center items-center gap-8 px-4 pb-5 pt-3 rounded-t-3xl"
        style={{ background: 'rgba(19,19,19,0.85)', backdropFilter: 'blur(20px)', boxShadow: '0 -8px 32px rgba(139,92,246,0.12)' }}>
        <button
          onClick={status === 'waiting' ? undefined : findMatch}
          disabled={!isConnected}
          className="flex flex-col items-center gap-1 rounded-full p-3 transition-transform hover:scale-105 disabled:opacity-40"
          style={{ backgroundImage: GRADIENT, color: '#000' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>skip_next</span>
          <span className="font-label uppercase tracking-widest" style={{ fontSize: 9 }}>Next</span>
        </button>
        <button
          onClick={status === 'waiting' ? cancel : undefined}
          className="flex flex-col items-center gap-1 p-3 rounded-xl transition-colors"
          style={{ color: status === 'waiting' ? '#ff6e84' : 'rgba(173,170,170,0.3)', cursor: status === 'waiting' ? 'pointer' : 'not-allowed' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>stop_circle</span>
          <span className="font-label uppercase tracking-widest" style={{ fontSize: 9 }}>Stop</span>
        </button>
      </nav>

      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onSettings={() => {
            setShowProfile(false);
            setShowSettings(true);
          }}
          onEditProfile={() => {
            setShowProfile(false);
            setShowProfileEdit(true);
          }}
          onFriends={() => {
            setShowProfile(false);
            navigate('/friends');
          }}
          onMessages={() => {
            setShowProfile(false);
            navigate('/messages');
          }}
          onLogout={() => {
            setShowProfile(false);
            setShowLogoutConfirm(true);
          }}
        />
      )}
      {showProfileEdit && (
        <ProfileEditModal onClose={() => setShowProfileEdit(false)} />
      )}
      {showLogoutConfirm && (
        <LogoutConfirmModal
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={() => {
            setShowLogoutConfirm(false);
            logout();
          }}
        />
      )}
      {showSettings && (
        <SettingsModal
          devices={devices}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
