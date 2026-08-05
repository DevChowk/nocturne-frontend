import { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { MIN_AGE_YEARS, USERNAME_REGEX, ageInYears } from '../constants/policy';

// Playful pool of username suggestions per the Design Book onboarding
// spec ("Pick a name strangers will remember."). Kept small and rotated
// so shuffling shows a visible change without pulling from a giant list.
const NAME_POOL = [
  'yolkgoblin', '2am_nate', 'shuffle.pls', 'bumppfan_04', 'someone.here',
  'no_camera_kid', 'phonestand', 'bad_wifi_ari', 'not_a_bot',
  'up_late_late', 'stranger.jpg', 'quiet_type_9', 'mic_off_pls',
];
function pickThree(exclude = new Set()) {
  const pool = NAME_POOL.filter((n) => !exclude.has(n));
  const out = [];
  const copy = [...pool];
  while (out.length < 3 && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

export default function OnboardingModal() {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Initial 3 suggestions — a Set is passed to pickThree so re-picking
  // avoids the ones already visible (subsequent shuffle iterations feel
  // "fresh" instead of showing the same options).
  const [suggestions, setSuggestions] = useState(() => pickThree());
  const shuffle = () => setSuggestions((prev) => pickThree(new Set(prev)));

  const validateLocal = () => {
    if (!USERNAME_REGEX.test(username)) {
      return 'Username must be 3–20 chars: lowercase letters, digits, _ or .';
    }
    if (!dob) return 'Please enter your date of birth.';
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return 'Invalid date.';
    const age = ageInYears(d);
    if (age < MIN_AGE_YEARS) return `You must be at least ${MIN_AGE_YEARS} to use Bumpp.`;
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
        className="relative w-full max-w-md flex flex-col bg-surface-container-low rounded-xl border border-outline-variant/40 overflow-hidden max-h-[90vh]"
        style={{ boxShadow: '0 0 40px rgba(245,183,0,0.2)' }}
      >
        <header className="px-6 pt-8 pb-6 text-center border-b border-outline-variant/40">
          <div
            className="mx-auto mb-4 flex items-center justify-center rounded-full font-bold font-headline bg-primary text-on-primary"
            style={{
              width: 72, height: 72, fontSize: 32,
              boxShadow: '0 8px 30px rgba(255,212,0,0.35)',
            }}
          >
            {initial}
          </div>
          <h2 className="font-headline font-extrabold text-on-surface text-2xl mb-1">Pick a name strangers will remember.</h2>
          <p className="text-on-surface-variant text-sm">Lowercase, 3–20 chars. Change it later if you hate it.</p>
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
                placeholder="alex.bump"
                autoComplete="username"
                required
                minLength={3}
                maxLength={20}
                className="w-full field-sticker pl-9 pr-4"
              />
            </div>
            {/* Suggestion chips — three at a time; the "shuffle" chip re-rolls
                the pool (excluding what's currently shown) so a user hunting
                for the "vibe" of a name sees fresh options each tap. */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setUsername(s)}
                  className="chip-sticker hover:opacity-80"
                  style={{ background: 'rgb(var(--color-surface-high-rgb))' }}
                >
                  {s}
                </button>
              ))}
              <button
                type="button"
                onClick={shuffle}
                aria-label="Shuffle suggestions"
                className="chip-sticker"
                style={{ background: 'rgb(var(--color-primary-rgb))', color: '#14000A' }}
              >
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 12 }}>shuffle</span>
                shuffle
              </button>
            </div>
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
              className="w-full field-sticker px-4"
            />
            <p className="text-xs text-on-surface-variant">You must be at least {MIN_AGE_YEARS}. We never share this.</p>
          </div>

          {error && <p className="text-error text-sm" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="btn-sticker w-full mt-2 disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
