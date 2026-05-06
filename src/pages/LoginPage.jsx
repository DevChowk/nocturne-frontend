import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../hooks/useAuth';
import AuthHeader from '../components/AuthHeader';
import AuthFooter from '../components/AuthFooter';
import useAuthModals from '../hooks/useAuthModals';
import { GRADIENT } from '../constants/theme';

// Read once on mount: if the user got bounced here from a 403 mid-session,
// the axios interceptor stored the date in localStorage. Render the banner,
// clear stale entries automatically.
function readStoredSuspension() {
  try {
    const raw = localStorage.getItem('suspendedUntil');
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime()) || d <= new Date()) {
      localStorage.removeItem('suspendedUntil');
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

function formatSuspensionUntil(d) {
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const opts = sameDay
    ? { hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
  return d.toLocaleString(undefined, opts);
}

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [suspendedUntil, setSuspendedUntil] = useState(readStoredSuspension);
  const { openTerms, openPrivacy, modals } = useAuthModals();

  const handleSuspensionFromError = (err) => {
    const until = err.response?.data?.suspendedUntil;
    if (err.response?.status === 403 && until) {
      try { localStorage.setItem('suspendedUntil', until); } catch { /* quota */ }
      const d = new Date(until);
      setSuspendedUntil(d);
      setError('');
      return true;
    }
    return false;
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setError('');
        setLoading(true);
        await googleLogin(tokenResponse.access_token);
      } catch (err) {
        if (!handleSuspensionFromError(err)) {
          setError(err.response?.data?.message || 'Google sign-in failed');
        }
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google sign-in failed'),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // Successful login means we're not suspended; clear any stale banner.
      try { localStorage.removeItem('suspendedUntil'); } catch { /* quota */ }
      setSuspendedUntil(null);
    } catch (err) {
      if (!handleSuspensionFromError(err)) {
        setError(err.response?.data?.message || err.response?.data?.error || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex flex-col font-body">
      <AuthHeader to="/signup" linkText="Don't have an account?" linkHighlight="Sign Up" />

      <main className="flex-grow flex items-center justify-center relative overflow-hidden px-4 pt-32 pb-12">
        {/* Ambient glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]"
          style={{ background: 'rgba(186,158,255,0.1)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px]"
          style={{ background: 'rgba(0,207,252,0.1)' }} />

        <div className="w-full max-w-[480px] z-10">
          {/* Suspension banner — shown when the user just got bounced or
              their account is currently restricted. Persists across the
              redirect via localStorage. */}
          {suspendedUntil && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-xl border p-4"
              style={{ background: 'rgba(167,1,56,0.12)', borderColor: 'rgba(255,110,132,0.3)' }}
            >
              <span className="material-symbols-outlined text-error mt-0.5" aria-hidden="true">block</span>
              <div className="flex-1 min-w-0">
                <p className="font-headline font-bold text-error text-sm">Account suspended</p>
                <p className="text-on-surface-variant text-xs mt-1">
                  Try again after <span className="text-on-surface font-semibold">{formatSuspensionUntil(suspendedUntil)}</span>.
                </p>
              </div>
            </div>
          )}

          {/* Login card */}
          <div className="glass-panel border border-outline-variant/10 rounded-xl p-8 md:p-10"
            style={{ boxShadow: '0 0 24px rgba(186,158,255,0.15)' }}>

            {/* Social auth */}
            <div className="space-y-4 mb-8">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-surface-container-high hover:bg-surface-bright text-on-surface font-semibold py-3.5 px-6 rounded-full transition-all duration-300 active:scale-[0.98] disabled:opacity-60"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center mb-8">
              <div className="flex-grow h-px bg-outline-variant/20" />
              <span className="flex-shrink mx-4 text-on-surface-variant text-sm font-medium tracking-widest uppercase">Or email</span>
              <div className="flex-grow h-px bg-outline-variant/20" />
            </div>

            {/* Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="font-label text-sm font-semibold text-on-surface-variant ml-1" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@nocturne.com"
                  required
                  className="w-full bg-surface-container-highest border-none rounded-lg py-4 px-5 text-on-surface placeholder-outline focus:outline-none focus:ring-1 focus:ring-secondary/30 transition-all duration-300"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-label text-sm font-semibold text-on-surface-variant ml-1" htmlFor="password">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-surface-container-highest border-none rounded-lg py-4 pl-5 pr-12 text-on-surface placeholder-outline focus:outline-none focus:ring-1 focus:ring-secondary/30 transition-all duration-300"
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
              </div>

              {error && <p className="text-error text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-4 px-6 rounded-full text-black font-bold text-lg transition-all duration-300 active:scale-[0.98] disabled:opacity-60"
                style={{ backgroundImage: GRADIENT, boxShadow: loading ? 'none' : '0 0 24px rgba(186,158,255,0.3)' }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Bottom links */}
          <div className="mt-8 text-center">
            <div className="flex justify-center items-center gap-6 text-xs text-outline font-semibold tracking-wide">
              <button type="button" onClick={openPrivacy} className="hover:text-on-surface transition-colors">Privacy Policy</button>
              <div className="w-1 h-1 rounded-full bg-outline-variant" />
              <button type="button" onClick={openTerms} className="hover:text-on-surface transition-colors">Terms of Service</button>
            </div>
          </div>
        </div>
      </main>

      <AuthFooter onPrivacy={openPrivacy} onTerms={openTerms} />
      {modals}
    </div>
  );
}
