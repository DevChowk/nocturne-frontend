import ModalBase from './ModalBase';

export default function ProfileModal({ user, onClose, onLogout, onSettings }) {
  const username = user?.email?.split('@')[0] ?? 'You';
  const initial = username[0]?.toUpperCase() ?? '?';

  return (
    <ModalBase maxWidth="max-w-md" onClose={onClose}>
      {/* Header with avatar + email */}
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
        <p className="font-headline font-bold text-on-surface text-lg">{username}</p>
        <p className="text-on-surface-variant text-sm break-all">{user?.email}</p>
      </header>

      {/* Actions */}
      <div className="px-4 py-3 space-y-1">
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
