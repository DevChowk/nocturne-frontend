import { useState } from 'react';
import { GRADIENT } from '../constants/theme';
import { MIN_AGE_YEARS, ageInYears } from '../constants/policy';
import { useAuth } from '../hooks/useAuth';
import ModalBase from './ModalBase';

// Age gate + one-tap entry to a guest session. Visitors who arrive on the
// landing page and pick "Try as guest" land here. Same DOB-entry pattern as
// signup so the entry barrier is consistent — we *attest* 18+, we don't
// verify it (real verification would defeat the no-signup-friction goal).
// Backend gets the DOB + a device fingerprint and issues a short-lived
// guest JWT that downstream sockets and routes recognise.
export default function GuestEntryModal({ onClose }) {
  const { loginAsGuest } = useAuth();
  const [dob, setDob] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!dob) return setError('Please enter your date of birth.');
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return setError('Invalid date.');
    const age = ageInYears(d);
    if (age < MIN_AGE_YEARS) return setError(`You must be at least ${MIN_AGE_YEARS} to use Bumpp.`);
    if (age > 120) return setError('Invalid date of birth.');
    setSubmitting(true);
    try {
      await loginAsGuest({ dateOfBirth: new Date(dob).toISOString() });
      // loginAsGuest navigates to /home on success; modal unmounts with the page.
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start a guest session. Try again.');
      setSubmitting(false);
    }
  };

  return (
    <ModalBase maxWidth="max-w-md" onClose={onClose}>
      <header className="px-6 pt-7 pb-4 text-center border-b border-outline-variant/40">
        <div
          className="mx-auto mb-3 flex items-center justify-center rounded-full bg-primary text-on-primary"
          style={{ width: 64, height: 64, boxShadow: '0 8px 30px rgba(255,212,0,0.35)' }}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 30 }}>person_raised_hand</span>
        </div>
        <h2 className="font-headline font-extrabold text-on-surface text-xl mb-1">Try Bumpp as a guest</h2>
        <p className="text-on-surface-variant text-sm">No signup. Random matches. Limited features.</p>
      </header>

      <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-label font-bold text-on-surface-variant tracking-wide uppercase" htmlFor="guest-dob">
            Date of birth
          </label>
          <input
            id="guest-dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            max={today}
            required
            className="block w-full min-w-0 appearance-none field-sticker px-4 [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:min-h-[1.5em]"
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
          <p className="text-xs text-on-surface-variant">You must be at least {MIN_AGE_YEARS}. We don't store your DOB for guests, just attest 18+.</p>
        </div>

        <ul className="text-xs text-on-surface-variant space-y-1.5 px-1 pt-1">
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-primary mt-px" aria-hidden="true" style={{ fontSize: 16 }}>check_circle</span>
            <span>Random video chat with strangers, no profile needed.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-on-surface-variant/70 mt-px" aria-hidden="true" style={{ fontSize: 16 }}>do_not_disturb_on</span>
            <span>No friends, no messages, no language/interest filters.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-on-surface-variant/70 mt-px" aria-hidden="true" style={{ fontSize: 16 }}>timer</span>
            <span>3 matches per session — sign up to keep chatting.</span>
          </li>
        </ul>

        {error && <p className="text-error text-sm" role="alert">{error}</p>}

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="btn-sticker w-full disabled:opacity-60"
          >
            {submitting ? 'Starting…' : 'Start chatting'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm hover:bg-surface-bright transition-colors active:scale-[0.98] disabled:opacity-50"
            style={{ border: '2px solid rgb(var(--color-stroke-rgb))' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
