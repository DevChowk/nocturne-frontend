import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthHeader from '../components/AuthHeader';
import AuthFooter from '../components/AuthFooter';
import useAuthModals from '../hooks/useAuthModals';
import { GRADIENT, gradientTextStyle } from '../constants/theme';
import { MIN_AGE_YEARS, USERNAME_REGEX, ageInYears } from '../constants/policy';

const FEATURES = [
  { icon: 'videocam', color: 'text-secondary', title: 'Cinema-Grade Video', desc: 'Ultra-low latency streaming for real-time vibe.' },
  { icon: 'security', color: 'text-primary', title: 'Private & Secure', desc: 'End-to-end encryption for every interaction.' },
];

export default function SignupPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { openTerms, openPrivacy, modals } = useAuthModals();

  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) { setError('You must accept the Terms of Service and Privacy Policy.'); return; }
    if (!USERNAME_REGEX.test(username)) {
      setError('Username must be 3–20 chars: lowercase letters, digits, _ or .');
      return;
    }
    if (!dob) { setError('Please enter your date of birth.'); return; }
    const dobDate = new Date(dob);
    if (Number.isNaN(dobDate.getTime())) { setError('Invalid date of birth.'); return; }
    const age = ageInYears(dobDate);
    if (age < MIN_AGE_YEARS) {
      setError(`You must be at least ${MIN_AGE_YEARS} years old to sign up.`);
      return;
    }
    if (age > 120) { setError('Invalid date of birth.'); return; }
    setError('');
    setLoading(true);
    try {
      await register({ email, password, username, dateOfBirth: dobDate.toISOString() });
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex flex-col font-body">
      <AuthHeader to="/login" linkText="Already a member?" linkHighlight="Sign In" />

      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4 relative overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full blur-[120px] pointer-events-none"
          style={{ background: 'rgba(186,158,255,0.1)' }} />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full blur-[120px] pointer-events-none"
          style={{ background: 'rgba(0,207,252,0.1)' }} />

        <div className="w-full max-w-[1100px] grid md:grid-cols-2 gap-12 items-center">
          {/* Left branding */}
          <div className="hidden md:block">
            <h1 className="text-6xl font-headline font-extrabold tracking-tighter leading-tight mb-6">
              Enter the <br />
              <span style={gradientTextStyle}>
                Electric Pulse.
              </span>
            </h1>
            <p className="text-on-surface-variant text-lg max-w-md mb-8 leading-relaxed">
              Experience high-fidelity human connection. Minimalist, atmospheric, Join the next generation of social interaction.
            </p>
            <div className="space-y-4">
              {FEATURES.map(f => (
                <div key={f.icon} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center">
                    <span className={`material-symbols-outlined ${f.color}`}>{f.icon}</span>
                  </div>
                  <div>
                    <p className="font-headline font-semibold text-on-surface">{f.title}</p>
                    <p className="text-on-surface-variant text-sm">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Registration form */}
          <div className="w-full">
            <div className="bg-surface-container-low rounded-xl p-8 md:p-10 border border-white/[0.03]"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              <div className="mb-8">
                <h2 className="text-3xl font-headline font-bold text-on-surface mb-2">Create Account</h2>
                <p className="text-on-surface-variant">Join the community and start connecting tonight.</p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-xs font-label font-bold text-on-surface-variant tracking-wide px-1">EMAIL ADDRESS</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg" aria-hidden="true">mail</span>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="alex@example.com"
                      autoComplete="email"
                      required
                      className="w-full bg-surface-container-highest border-none rounded-lg py-4 pl-12 pr-4 text-on-surface placeholder-outline focus:outline-none focus:ring-1 focus:ring-secondary/30 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-label font-bold text-on-surface-variant tracking-wide px-1">USERNAME</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm" aria-hidden="true">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase())}
                      placeholder="alex.nocturne"
                      autoComplete="username"
                      required
                      minLength={3}
                      maxLength={20}
                      className="w-full bg-surface-container-highest border-none rounded-lg py-4 pl-9 pr-4 text-on-surface placeholder-outline focus:outline-none focus:ring-1 focus:ring-secondary/30 transition-all"
                    />
                  </div>
                  <p className="text-xs text-on-surface-variant px-1">3–20 characters. Lowercase letters, digits, underscore, or dot.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-label font-bold text-on-surface-variant tracking-wide px-1">DATE OF BIRTH</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg" aria-hidden="true">cake</span>
                    <input
                      type="date"
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                      max={today}
                      required
                      className="w-full bg-surface-container-highest border-none rounded-lg py-4 pl-12 pr-4 text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary/30 transition-all"
                    />
                  </div>
                  <p className="text-xs text-on-surface-variant px-1">You must be at least {MIN_AGE_YEARS}.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-label font-bold text-on-surface-variant tracking-wide px-1">PASSWORD</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg" aria-hidden="true">lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      required
                      className="w-full bg-surface-container-highest border-none rounded-lg py-4 pl-12 pr-12 text-on-surface placeholder-outline focus:outline-none focus:ring-1 focus:ring-secondary/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl" aria-hidden="true">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  <p className="text-xs text-on-surface-variant px-1">Use at least 6 characters.</p>
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="w-5 h-5 rounded bg-surface-container-highest cursor-pointer mt-0.5 accent-primary"
                  />
                  <label htmlFor="terms" className="text-sm text-on-surface-variant leading-snug cursor-pointer">
                    I agree to the{' '}
                    <button type="button" onClick={openTerms} className="text-secondary hover:underline">Terms of Service</button>
                    {' '}and{' '}
                    <button type="button" onClick={openPrivacy} className="text-secondary hover:underline">Privacy Policy</button>.
                  </label>
                </div>

                {error && <p className="text-error text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-full text-black font-bold tracking-tight transition-all transform active:scale-95 flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
                  style={{ backgroundImage: GRADIENT, boxShadow: '0 0 24px rgba(186,158,255,0.15)' }}
                >
                  {loading ? 'Creating...' : 'Create Account'}
                  {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
                </button>
              </form>

              <p className="md:hidden mt-8 text-center text-on-surface-variant text-sm">
                Already have an account? <Link to="/login" className="text-primary font-semibold ml-1 hover:underline">Log In</Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <AuthFooter onPrivacy={openPrivacy} onTerms={openTerms} />
      {modals}
    </div>
  );
}
