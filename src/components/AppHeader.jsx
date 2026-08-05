// Top bar used across the authenticated app: BUMP brand on the left,
// online-count pill, then user identity + profile-menu trigger on the
// right. Identical look and responsive sizing in every page so the user
// always sees the same header regardless of which screen they're on.
export default function AppHeader({ user, isConnected, onlineCount, onProfileClick, onFriendsToggle, friendsCollapsed, isGuest }) {
  const initial = isGuest
    ? 'G'
    : (user?.displayName?.[0] || user?.username?.[0] || user?.email?.[0] || '?').toUpperCase();

  return (
    <header
      className="relative z-30 flex items-center justify-between px-4 py-2.5 md:px-6 md:py-4 mb-2 md:mb-4 flex-shrink-0 border-b border-outline-variant/40"
      style={{ background: 'rgb(var(--color-bg-rgb))' }}
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Theme-aware lockup — light version has dark navy wordmark; dark
            version has paper-white wordmark. The `.dark` class on <html>
            is stamped by SettingsProvider based on the theme setting. */}
        <div className="flex-shrink-0">
          <img src="/logo-lockup.svg" alt="Bumpp" className="h-6 md:h-7 w-auto dark:hidden" />
          <img src="/logo-lockup-dark.svg" alt="Bumpp" aria-hidden="true" className="h-6 md:h-7 w-auto hidden dark:block" />
        </div>
        <div
          className="chip-sticker flex-shrink-0 tabular-nums"
          style={{ color: isConnected ? '#3F52FF' : '#FF4F4F' }}
          title={isConnected ? 'People online now' : 'Disconnected from server'}
        >
          <span
            className={`chip-dot ${isConnected ? 'animate-pulse' : ''}`}
            style={{ boxShadow: isConnected ? '0 0 6px #3F52FF' : 'none' }}
          />
          {!isConnected ? (
            <span>Disconnected</span>
          ) : typeof onlineCount === 'number' ? (
            <>
              <span className="text-on-surface">{onlineCount.toLocaleString()}</span>
              <span className="text-on-surface-variant hidden sm:inline">online</span>
            </>
          ) : (
            <span>Online</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        {/* Friends toggle — desktop only (sidebar is desktop-only). Shows
            people-icon at all times so users see the friends list exists;
            click to collapse/expand. A small dot indicator on the icon when
            the sidebar is hidden, so it's clear what's happening. */}
        {onFriendsToggle && (
          <button
            type="button"
            onClick={onFriendsToggle}
            aria-label={friendsCollapsed ? 'Show friends list' : 'Hide friends list'}
            aria-pressed={!friendsCollapsed}
            title={friendsCollapsed ? 'Show friends' : 'Hide friends'}
            className="flex items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-primary text-on-primary shadow-lg"
          >
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20 }}>group</span>
          </button>
        )}
        <button
          onClick={onProfileClick}
          aria-label="Open profile menu"
          title="Profile"
          className="flex items-center justify-center rounded-full font-bold font-headline transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 flex-shrink-0 w-8 h-8 md:w-10 md:h-10 text-sm md:text-base bg-primary text-on-primary shadow-lg"
        >
          {initial}
        </button>
      </div>
    </header>
  );
}
