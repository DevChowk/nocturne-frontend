// Top bar used across the authenticated app: BUMP brand on the left,
// online-count pill, then user identity + profile-menu trigger on the
// right. Identical look and responsive sizing in every page so the user
// always sees the same header regardless of which screen they're on.
export default function AppHeader({ user, isConnected, onlineCount, onProfileClick }) {
  const initial = (user?.displayName?.[0] || user?.username?.[0] || user?.email?.[0] || '?').toUpperCase();

  return (
    <header
      className="relative z-30 flex items-center justify-between px-4 py-2.5 md:px-6 md:py-4 mb-2 md:mb-4 flex-shrink-0"
      style={{ background: '#0e0e0e' }}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2 flex-shrink-0">
          <img src="/favicon.png" alt="Bump" className="w-6 h-6 md:w-7 md:h-7 rounded-lg object-cover" />
          <span className="text-base md:text-xl font-bold tracking-tighter text-white uppercase font-headline">Bump</span>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full flex-shrink-0"
          style={{ background: '#131313' }}
          title={isConnected ? 'People online now' : 'Disconnected from server'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'animate-pulse' : ''}`}
            style={{ background: isConnected ? '#00cffc' : '#ff6e84', boxShadow: isConnected ? '0 0 6px #00cffc' : 'none' }}
          />
          <span className="font-label tabular-nums" style={{ fontSize: 11 }}>
            {!isConnected ? (
              <span className="text-on-surface-variant uppercase tracking-wider">Disconnected</span>
            ) : typeof onlineCount === 'number' ? (
              <>
                <span className="font-semibold text-on-surface">{onlineCount.toLocaleString()}</span>
                <span className="text-on-surface-variant ml-1 uppercase tracking-wider hidden sm:inline">online</span>
              </>
            ) : (
              <span className="text-on-surface-variant uppercase tracking-wider">Online</span>
            )}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-on-surface-variant text-xs md:text-sm font-label truncate max-w-[100px] sm:max-w-[140px] md:max-w-[220px]">
          {user?.username ? `@${user.username}` : user?.email}
        </span>
        <button
          onClick={onProfileClick}
          aria-label="Open profile menu"
          title="Profile"
          className="flex items-center justify-center rounded-full font-bold font-headline transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 flex-shrink-0 w-8 h-8 md:w-10 md:h-10 text-sm md:text-base"
          style={{ background: 'rgba(186,158,255,0.15)', color: '#ba9eff', boxShadow: '0 0 12px rgba(186,158,255,0.15)' }}
        >
          {initial}
        </button>
      </div>
    </header>
  );
}
