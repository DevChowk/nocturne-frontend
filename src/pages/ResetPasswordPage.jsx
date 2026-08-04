import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import AuthHeader from '../components/AuthHeader';
import AuthFooter from '../components/AuthFooter';
import useAuthModals from '../hooks/useAuthModals';
import { GRADIENT, gradientTextStyle } from '../constants/theme';

const MIN_PASSWORD_LENGTH = 6;

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const { openTerms, openPrivacy, modals } = useAuthModals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords don\'t match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/reset', { token, password });
      setDone(true);
      // Auto-bounce to /login after a beat so the user can sign in with
      // the new password.
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex flex-col font-body">
      <AuthHeader to="/login" linkText="" linkHighlight="Sign In" />

      <main className="flex-grow flex items-center justify-center relative overflow-hidden px-4 pt-32 pb-12">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]"
          style={{ background: 'rgba(255,212,0,0.1)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px]"
          style={{ background: 'rgba(63,82,255,0.1)' }} />

        <div className="w-full max-w-[480px] z-10">
          <div className="glass-panel border border-outline-variant/40 rounded-xl p-8 md:p-10"
            style={{ boxShadow: '0 0 24px rgba(255,212,0,0.15)' }}>

            {done ? (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center mx-auto rounded-full bg-primary text-on-primary"
                  style={{ width: 64, height: 64, boxShadow: '0 8px 30px rgba(255,212,0,0.35)' }}>
                  <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 32 }}>check_circle</span>
                </div>
                <h1 className="font-headline text-2xl font-extrabold" style={gradientTextStyle}>Password updated</h1>
                <p className="text-on-surface-variant text-sm">Redirecting you to sign in…</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h1 className="font-headline text-2xl md:text-3xl font-extrabold mb-2" style={gradientTextStyle}>Set a new password</h1>
                  <p className="text-on-surface-variant text-sm">Pick something memorable but hard to guess.</p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-1.5">
                    <label className="font-label text-sm font-semibold text-on-surface-variant ml-1" htmlFor="new-password">New password</label>
                    <div className="relative">
                      <input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        required
                        minLength={MIN_PASSWORD_LENGTH}
                        className="w-full bg-surface-container-highest border-none rounded-lg py-4 pl-5 pr-12 text-on-surface placeholder-outline focus:outline-none focus:ring-1 focus:ring-secondary/30 transition-all duration-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40 transition-colors"
                      >
                        <span className="material-symbols-outlined text-xl" aria-hidden="true">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-label text-sm font-semibold text-on-surface-variant ml-1" htmlFor="confirm-password">Confirm password</label>
                    <input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      className="w-full bg-surface-container-highest border-none rounded-lg py-4 px-5 text-on-surface placeholder-outline focus:outline-none focus:ring-1 focus:ring-secondary/30 transition-all duration-300"
                    />
                  </div>

                  {error && <p className="text-error text-sm text-center">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-sticker w-full mt-4 py-4 px-6 text-lg disabled:opacity-60"
                  >
                    {loading ? 'Updating…' : 'Update password'}
                  </button>
                </form>

                <div className="text-center mt-6">
                  <Link to="/forgot" className="text-on-surface-variant hover:text-on-surface text-sm transition-colors">
                    Need a new link?
                  </Link>
                </div>
              </>
            )}
          </div>

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
