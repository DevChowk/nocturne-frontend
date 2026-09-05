import { useNavigate } from 'react-router-dom';
import ModalBase from './ModalBase';
import { useAuth } from '../hooks/useAuth';

// Shown when the server emits `guest_limit_reached`. Two CTAs: take the
// guest to /signup (the conversion goal), or let them end the session.
// Rebuilt to match Design Book "Caps hit" spec (page 11): oversized
// yellow tile with the sparkle heading + monospace SESSION/TODAY stat
// chips underneath, then the perk list, then the CTAs.
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

  // Server can send actual counts via the `info` payload; fall back to
  // the guest cap defaults so the chips always render meaningful values.
  const sessionUsed = info?.sessionUsed ?? 3;
  const sessionCap = info?.sessionCap ?? 3;
  const todayUsed = info?.todayUsed ?? sessionUsed;
  const todayCap = info?.todayCap ?? 30;

  return (
    <ModalBase maxWidth="max-w-md" onClose={onClose}>
      {/* Oversized yellow tile — the star of the modal. Sits inside the
          card-sticker frame the ModalBase provides, so the yellow reads
          as a sub-tile (not the whole modal). */}
      <div
        className="mx-6 mt-6 px-6 py-8 text-center"
        style={{
          background: 'rgb(var(--color-primary-rgb))',
          color: '#14000A',
          border: '2px solid rgb(var(--color-stroke-rgb))',
          borderRadius: 14,
          boxShadow: '4px 4px 0 rgb(var(--color-stroke-rgb))',
        }}
      >
        <div className="text-2xl mb-2" aria-hidden="true">✨</div>
        <h2 className="font-headline font-extrabold text-2xl leading-tight mb-2">
          You're hooked, huh?
        </h2>
        <p className="text-sm opacity-80 mb-4">
          {info?.message || "You've used up this session's matches."}
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span
            className="chip-sticker"
            style={{ background: 'rgba(20,0,10,0.15)', color: '#14000A', borderColor: '#14000A' }}
          >
            {sessionUsed}/{sessionCap} session
          </span>
          <span
            className="chip-sticker"
            style={{ background: 'rgba(20,0,10,0.15)', color: '#14000A', borderColor: '#14000A' }}
          >
            {todayUsed}/{todayCap} today
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar px-6 py-5">
        <ul className="text-sm text-on-surface space-y-2.5">
          <li className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary mt-px" aria-hidden="true" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>all_inclusive</span>
            <span>Unlimited matches, no per-session cap.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary mt-px" aria-hidden="true" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>group</span>
            <span>Add friends, swap messages, build a profile.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary mt-px" aria-hidden="true" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>language</span>
            <span>Pick languages + interests so matches feel less random.</span>
          </li>
        </ul>
      </div>

      <footer className="flex-shrink-0 px-6 pb-6 pt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSignup}
          className="btn-sticker w-full"
        >
          Sign up — it's free
        </button>
        <button
          type="button"
          onClick={handleEnd}
          className="btn-sticker-outline w-full text-sm"
        >
          End session
        </button>
      </footer>
    </ModalBase>
  );
}
