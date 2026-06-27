import { useNavigate } from 'react-router-dom';
import { GRADIENT } from '../constants/theme';
import ModalBase from './ModalBase';
import { useAuth } from '../hooks/useAuth';

// Shown when the server emits `guest_limit_reached`. Two CTAs: take the
// guest to /signup (the conversion goal), or let them end the session.
export default function GuestLimitModal({ info, onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleSignup = () => {
    onClose?.();
    navigate('/signup');
  };

  const handleEnd = async () => {
    onClose?.();
    await logout();
  };

  return (
    <ModalBase maxWidth="max-w-md" onClose={onClose}>
      <header className="px-6 pt-8 pb-5 text-center border-b border-white/5">
        <div
          className="mx-auto mb-3 flex items-center justify-center rounded-full"
          style={{ width: 64, height: 64, background: 'rgba(186,158,255,0.15)', color: '#ba9eff', boxShadow: '0 0 32px rgba(186,158,255,0.18)' }}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 30 }}>auto_awesome</span>
        </div>
        <h2 className="font-headline font-extrabold text-on-surface text-xl mb-1">You're hooked, huh?</h2>
        <p className="text-on-surface-variant text-sm">
          {info?.message || 'Sign up to keep chatting.'}
        </p>
      </header>

      <div className="px-6 py-5">
        <ul className="text-sm text-on-surface-variant space-y-2">
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-primary mt-px" aria-hidden="true" style={{ fontSize: 18 }}>all_inclusive</span>
            <span>Unlimited matches, no per-session cap.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-primary mt-px" aria-hidden="true" style={{ fontSize: 18 }}>group</span>
            <span>Add friends, swap messages, build a profile.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-primary mt-px" aria-hidden="true" style={{ fontSize: 18 }}>language</span>
            <span>Pick languages + interests so matches feel less random.</span>
          </li>
        </ul>
      </div>

      <footer className="px-6 pb-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSignup}
          className="w-full py-3 rounded-full text-black font-bold font-headline transition-all active:scale-[0.98]"
          style={{ backgroundImage: GRADIENT, boxShadow: '0 0 24px rgba(186,158,255,0.3)' }}
        >
          Sign up — it's free
        </button>
        <button
          type="button"
          onClick={handleEnd}
          className="w-full py-2.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-bright text-sm font-semibold transition-colors active:scale-95"
        >
          End session
        </button>
      </footer>
    </ModalBase>
  );
}
