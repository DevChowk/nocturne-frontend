import ModalBase from './ModalBase';

export default function ProfileModal({ user, onClose, onSettings, onEditProfile, onFriends, onLogout }) {
  const username = user?.username || user?.email?.split('@')[0] || 'You';
  const initial = username[0]?.toUpperCase() ?? '?';
  const displayName = user?.displayName || username;
  const pendingCount = user?.pendingFriendCount || 0;

  return (
    <ModalBase maxWidth="max-w-md" onClose={onClose}>
      {/* Header with avatar + identity */}
      <header className="px-6 pt-8 pb-6 flex flex-col items-center text-center border-b border-white/5">
        <div
          className="flex items-center justify-center rounded-full font-bold font-headline mb-4"
          style={{
            width: 80, height: 80, fontSize: 36,
            background: 'rgba(186,158,255,0.15)',
            color: '#ba9eff',
            boxShadow: '0 0 40px rgba(186,158,255,0.15)',
          }}
        >
          {initial}
        </div>
        <p className="font-headline font-bold text-on-surface text-lg">{displayName}</p>
        {user?.username && <p className="text-primary text-sm font-label">@{user.username}</p>}
        <p className="text-on-surface-variant text-xs mt-1 break-all">{user?.email}</p>
        {user?.bio && <p className="text-on-surface-variant text-sm mt-3 max-w-[280px]">{user.bio}</p>}
      </header>

      {/* Actions */}
      <div className="px-4 py-3 space-y-1">
        <button
          type="button"
          onClick={onEditProfile}
          aria-label="Edit profile"
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-left text-on-surface hover:bg-primary/10 transition-colors active:scale-[0.99]"
        >
          <span className="material-symbols-outlined text-primary" aria-hidden="true" style={{ fontSize: 22 }}>person</span>
          <span className="flex-1 text-sm font-semibold">Edit profile</span>
          <span className="material-symbols-outlined opacity-60" aria-hidden="true" style={{ fontSize: 18 }}>chevron_right</span>
        </button>

        <button
          type="button"
          onClick={onFriends}
          aria-label={pendingCount > 0 ? `Friends — ${pendingCount} pending requests` : 'Friends'}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-left text-on-surface hover:bg-primary/10 transition-colors active:scale-[0.99]"
        >
          <span className="material-symbols-outlined text-primary" aria-hidden="true" style={{ fontSize: 22 }}>group</span>
          <span className="flex-1 text-sm font-semibold">Friends</span>
          {pendingCount > 0 && (
            <span
              className="flex items-center justify-center text-[10px] font-bold rounded-full px-2 min-w-[20px] h-5"
              style={{ background: '#ff97b5', color: '#380018' }}
              aria-label={`${pendingCount} pending`}
            >
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
          <span className="material-symbols-outlined opacity-60" aria-hidden="true" style={{ fontSize: 18 }}>chevron_right</span>
        </button>

        <button
          type="button"
          onClick={onSettings}
          aria-label="Open settings"
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-left text-on-surface hover:bg-primary/10 transition-colors active:scale-[0.99]"
        >
          <span className="material-symbols-outlined text-primary" aria-hidden="true" style={{ fontSize: 22 }}>settings</span>
          <span className="flex-1 text-sm font-semibold">Settings</span>
          <span className="material-symbols-outlined opacity-60" aria-hidden="true" style={{ fontSize: 18 }}>chevron_right</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-left text-error hover:bg-error-container/15 transition-colors active:scale-[0.99]"
        >
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 22 }}>logout</span>
          <span className="flex-1 text-sm font-semibold">Log out</span>
          <span className="material-symbols-outlined opacity-60" aria-hidden="true" style={{ fontSize: 18 }}>chevron_right</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-white/5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-bright text-sm font-semibold transition-colors active:scale-95"
        >
          Close
        </button>
      </footer>
    </ModalBase>
  );
}
