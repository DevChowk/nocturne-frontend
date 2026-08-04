import { useNavigate } from 'react-router-dom';
import { GRADIENT } from '../constants/theme';
import ModalBase from './ModalBase';

export default function ProfileModal({ user, onClose, onSettings, onEditProfile, onLogout, isGuest }) {
  const navigate = useNavigate();
  const username = user?.username || user?.email?.split('@')[0] || 'You';
  const initial = isGuest ? 'G' : (username[0]?.toUpperCase() ?? '?');
  const displayName = isGuest ? 'Guest' : (user?.displayName || username);

  return (
    <ModalBase maxWidth="max-w-md" onClose={onClose}>
      {/* Header with avatar + identity */}
      <header className="px-6 pt-8 pb-6 flex flex-col items-center text-center border-b border-outline-variant/40">
        <div
          className="flex items-center justify-center rounded-full font-bold font-headline mb-4 bg-primary text-on-primary"
          style={{
            width: 80, height: 80, fontSize: 36,
            boxShadow: '0 8px 30px rgba(255,212,0,0.35)',
          }}
        >
          {initial}
        </div>
        <p className="font-headline font-bold text-on-surface text-lg">{displayName}</p>
        {!isGuest && user?.username && <p className="text-on-surface-variant text-sm font-label font-semibold">@{user.username}</p>}
        {!isGuest && <p className="text-on-surface-variant text-xs mt-1 break-all">{user?.email}</p>}
        {isGuest && <p className="text-on-surface-variant text-xs mt-1">Anonymous session</p>}
        {!isGuest && user?.bio && <p className="text-on-surface-variant text-sm mt-3 max-w-[280px]">{user.bio}</p>}
      </header>

      {/* Actions */}
      <div className="px-4 py-3 space-y-1">
        {isGuest ? (
          // Guest profile menu — settings still works (mic device pick),
          // but Edit Profile is irrelevant and Log out becomes "End guest
          // session". A signup CTA sits at the top to drive conversion
          // from this prominent surface.
          <>
            <button
              type="button"
              onClick={() => { onClose?.(); navigate('/signup'); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-left text-black font-bold transition-transform active:scale-[0.98]"
              style={{ backgroundImage: GRADIENT, boxShadow: '0 0 18px rgba(255,212,0,0.25)' }}
            >
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 22 }}>auto_awesome</span>
              <span className="flex-1 text-sm">Sign up to unlock everything</span>
              <span className="material-symbols-outlined opacity-70" aria-hidden="true" style={{ fontSize: 18 }}>arrow_forward</span>
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
              <span className="flex-1 text-sm font-semibold">End guest session</span>
              <span className="material-symbols-outlined opacity-60" aria-hidden="true" style={{ fontSize: 18 }}>chevron_right</span>
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-outline-variant/40 flex justify-end">
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
