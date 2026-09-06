// Top bar used across the authenticated app. Design Book layout: brand
// lockup alone on the left, and a right cluster of ONLINE — N (bare mono),
// settings gear, avatar. Ruled off from the body with the 2px layout
// rule. Identical look and responsive sizing on every page so the user
// always sees the same header regardless of which screen they're on.
import { SHOW_ONLINE_COUNT } from '../constants/features';

export default function AppHeader({ user, isConnected, onlineCount, onProfileClick, onFriendsToggle, friendsCollapsed, isGuest, onSettingsClick }) {
  const initial = isGuest
    ? 'G'
    : (user?.displayName?.[0] || user?.username?.[0] || user?.email?.[0] || '?').toUpperCase();

  return (
    <header
      className="relative z-30 flex items-center justify-between px-4 py-2.5 md:px-6 md:py-4 mb-2 md:mb-4 flex-shrink-0"
      style={{ background: 'rgb(var(--color-bg-rgb))', borderBottom: '2px solid rgb(var(--color-rule-rgb))' }}
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Theme-aware lockup — light version has dark navy wordmark; dark
            version has paper-white wordmark. The `.dark` class on <html>
            is stamped by SettingsProvider based on the theme setting. */}
        <div className="flex-shrink-0">
          <img src="/logo-lockup.svg" alt="Bumpp" className="h-6 md:h-7 w-auto dark:hidden" />
          <img src="/logo-lockup-dark.svg" alt="Bumpp" aria-hidden="true" className="h-6 md:h-7 w-auto hidden dark:block" />
        </div>
      </div>
      {/* Right cluster — Design Book header order: online count, settings,
          avatar. The count is bare mono type on the ground, not a chip: it's
          data, so it needs no container to be found.

          The server-wide total is currently switched off (see
          constants/features.js). The DISCONNECTED state deliberately still
          shows: that isn't a headcount, it's the user needing to know their
          socket dropped and matching won't work. */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        {(!isConnected || SHOW_ONLINE_COUNT) && (
          <span
            className="font-mono uppercase tabular-nums flex-shrink-0 whitespace-nowrap"
            style={{
              fontSize: 11,
              letterSpacing: '0.16em',
              color: isConnected ? 'rgb(var(--color-on-surface-rgb))' : '#FF4F4F',
            }}
            title={isConnected ? 'People online now' : 'Disconnected from server'}
          >
            {!isConnected
              ? 'Disconnected'
              : typeof onlineCount === 'number'
                ? <>Online <span aria-hidden="true" className="opacity-40">—</span> {onlineCount.toLocaleString()}</>
                : 'Online'}
          </span>
        )}
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
        {/* Settings gear — bare icon, not a filled button. Sits between the
            count and the avatar exactly as in the Design Book header. */}
        {onSettingsClick && (
          <button
            type="button"
            onClick={onSettingsClick}
            aria-label="Open settings"
            title="Settings"
            className="hidden sm:flex items-center justify-center flex-shrink-0 text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full w-8 h-8"
          >
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 22 }}>settings</span>
          </button>
        )}
        <button
          onClick={onProfileClick}
          aria-label="Open profile menu"
          title="Profile"
          className="flex items-center justify-center rounded-full font-bold font-headline transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 flex-shrink-0 w-8 h-8 md:w-10 md:h-10 text-sm md:text-base"
          style={{ background: 'rgb(var(--color-secondary-rgb))', color: '#FFFFFF' }}
        >
          {initial}
        </button>
      </div>
    </header>
  );
}
