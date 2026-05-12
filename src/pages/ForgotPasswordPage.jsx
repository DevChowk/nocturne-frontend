import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import AuthHeader from '../components/AuthHeader';
import AuthFooter from '../components/AuthFooter';
import useAuthModals from '../hooks/useAuthModals';
import { GRADIENT, gradientTextStyle } from '../constants/theme';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { openTerms, openPrivacy, modals } = useAuthModals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/forgot', { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send reset link. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex flex-col font-body">
      <AuthHeader to="/login" linkText="Remembered it?" linkHighlight="Sign In" />

      <main className="flex-grow flex items-center justify-center relative overflow-hidden px-4 pt-32 pb-12">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]"
          style={{ background: 'rgba(186,158,255,0.1)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px]"
          style={{ background: 'rgba(0,207,252,0.1)' }} />

        <div className="w-full max-w-[480px] z-10">
          <div className="glass-panel border border-outline-variant/10 rounded-xl p-8 md:p-10"
            style={{ boxShadow: '0 0 24px rgba(186,158,255,0.15)' }}>

            {submitted ? (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center mx-auto rounded-full"
                  style={{ width: 64, height: 64, background: 'rgba(186,158,255,0.15)', boxShadow: '0 0 24px rgba(186,158,255,0.2)' }}>
                  <span className="material-symbols-outlined text-primary" aria-hidden="true" style={{ fontSize: 32 }}>mark_email_read</span>
                </div>
                <h1 className="font-headline text-2xl font-extrabold" style={gradientTextStyle}>Check your inbox</h1>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  If an account exists for <span className="text-on-surface font-semibold">{email}</span>, we just sent a password-reset link. It expires in 1 hour.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 mt-2 px-6 py-3 rounded-full bg-surface-container-high text-on-surface font-semibold text-sm hover:bg-surface-bright transition-colors"
                >
                  Back to sign in
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h1 className="font-headline text-2xl md:text-3xl font-extrabold mb-2" style={gradientTextStyle}>Forgot password?</h1>
                  <p className="text-on-surface-variant text-sm">Enter your email and we'll send a reset link.</p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-1.5">
                    <label className="font-label text-sm font-semibold text-on-surface-variant ml-1" htmlFor="email">Email address</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@bump.app"
                      required
                      className="w-full bg-surface-container-highest border-none rounded-lg py-4 px-5 text-on-surface placeholder-outline focus:outline-none focus:ring-1 focus:ring-secondary/30 transition-all duration-300"
                    />
                  </div>

                  {error && <p className="text-error text-sm text-center">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-4 py-4 px-6 rounded-full text-black font-bold text-lg transition-all duration-300 active:scale-[0.98] disabled:opacity-60"
                    style={{ backgroundImage: GRADIENT, boxShadow: loading ? 'none' : '0 0 24px rgba(186,158,255,0.3)' }}
                  >
                    {loading ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>

                <div className="text-center mt-6">
                  <Link to="/login" className="text-on-surface-variant hover:text-on-surface text-sm transition-colors">
                    Back to sign in
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
