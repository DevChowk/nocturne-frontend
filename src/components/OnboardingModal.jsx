import { useState } from 'react';
import { GRADIENT } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { MIN_AGE_YEARS, USERNAME_REGEX, ageInYears } from '../constants/policy';

export default function OnboardingModal() {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const validateLocal = () => {
    if (!USERNAME_REGEX.test(username)) {
      return 'Username must be 3–20 chars: lowercase letters, digits, _ or .';
    }
    if (!dob) return 'Please enter your date of birth.';
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return 'Invalid date.';
    const age = ageInYears(d);
    if (age < MIN_AGE_YEARS) return `You must be at least ${MIN_AGE_YEARS} to use Nocturne.`;
    if (age > 120) return 'Invalid date of birth.';
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const localErr = validateLocal();
    if (localErr) { setError(localErr); return; }
    setSubmitting(true);
    try {
      await updateProfile({ username, dateOfBirth: new Date(dob).toISOString() });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save. Try a different username.');
    } finally {
      setSubmitting(false);
    }
  };

  // Cap DOB picker at "today" so the input doesn't allow future dates.
  const today = new Date().toISOString().slice(0, 10);
  const initial = (user?.email?.[0] || '?').toUpperCase();

  // Note: this modal is intentionally NOT closable. The user lands on /home
  // after auth and gets stuck here until they fill in username + DOB.
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur-md p-4" role="dialog" aria-modal="true">
      <div
        className="relative w-full max-w-md flex flex-col bg-surface-container-low rounded-xl border border-white/5 overflow-hidden max-h-[90vh]"
        style={{ boxShadow: '0 0 40px rgba(132,85,239,0.2)' }}
      >
        <header className="px-6 pt-8 pb-6 text-center border-b border-white/5">
          <div
            className="mx-auto mb-4 flex items-center justify-center rounded-full font-bold font-headline"
            style={{
              width: 72, height: 72, fontSize: 32,
              background: 'rgba(186,158,255,0.15)',
              color: '#ba9eff',
              boxShadow: '0 0 32px rgba(186,158,255,0.18)',
            }}
          >
            {initial}
          </div>
          <h2 className="font-headline font-extrabold text-on-surface text-2xl mb-1">Welcome to Nocturne</h2>
          <p className="text-on-surface-variant text-sm">Pick a username so people know who they're meeting.</p>
        </header>

        <form onSubmit={onSubmit} className="px-6 py-6 space-y-5 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <label className="text-xs font-label font-bold text-on-surface-variant tracking-wide uppercase" htmlFor="onb-username">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm" aria-hidden="true">@</span>
              <input
                id="onb-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="alex.nocturne"
                autoComplete="username"
                required
                minLength={3}
                maxLength={20}
                className="w-full bg-surface-container-highest border-none rounded-lg py-3.5 pl-9 pr-4 text-on-surface placeholder-outline focus:outline-none focus:ring-1 focus:ring-secondary/30 transition-all"
              />
            </div>
            <p className="text-xs text-on-surface-variant">3–20 characters. Lowercase letters, digits, underscore, or dot.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-label font-bold text-on-surface-variant tracking-wide uppercase" htmlFor="onb-dob">
              Date of birth
            </label>
            <input
              id="onb-dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={today}
              required
              className="w-full bg-surface-container-highest border-none rounded-lg py-3.5 px-4 text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary/30 transition-all"
            />
            <p className="text-xs text-on-surface-variant">You must be at least {MIN_AGE_YEARS}. We never share this.</p>
          </div>

          {error && <p className="text-error text-sm" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3.5 rounded-full text-black font-bold transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundImage: GRADIENT, boxShadow: submitting ? 'none' : '0 0 24px rgba(186,158,255,0.3)' }}
          >
            {submitting ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
