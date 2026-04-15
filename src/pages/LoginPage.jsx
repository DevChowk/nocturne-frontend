import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthHeader from '../components/AuthHeader';
import AuthFooter from '../components/AuthFooter';
import useAuthModals from '../hooks/useAuthModals';
import { GRADIENT } from '../constants/theme';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { openTerms, openPrivacy, modals } = useAuthModals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Invalid credentials');
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
          {/* Login card */}
          <div className="glass-panel border border-outline-variant/10 rounded-xl p-8 md:p-10"
            style={{ boxShadow: '0 0 24px rgba(186,158,255,0.15)' }}>

            {/* Social auth */}
            <div className="space-y-4 mb-8">
              <button className="w-full flex items-center justify-center gap-3 bg-surface-container-high hover:bg-surface-bright text-on-surface font-semibold py-3.5 px-6 rounded-full transition-all duration-300 active:scale-[0.98]">
                <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </button>
              <button className="w-full flex items-center justify-center gap-3 bg-surface-container-high hover:bg-surface-bright text-on-surface font-semibold py-3.5 px-6 rounded-full transition-all duration-300 active:scale-[0.98]">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.88-3.12 1.87-2.39 5.98.74 7.23-.62 1.56-1.44 3.12-2.79 3.9zM12.03 7.25c-.02-2.23 1.84-4.13 4-4.25.23 2.52-2.11 4.54-4 4.25z" fill="currentColor"/>
                </svg>
                <span>Continue with Apple</span>
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
                <div className="flex justify-between items-center px-1">
                  <label className="font-label text-sm font-semibold text-on-surface-variant" htmlFor="password">Password</label>
                  <button type="button" className="text-sm font-semibold text-secondary hover:text-secondary-fixed transition-colors">Forgot?</button>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
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
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-on-surface-variant font-medium leading-relaxed">
              By signing in, you confirm you are 18 years or older.
            </p>
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
