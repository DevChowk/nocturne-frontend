import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { GRADIENT, gradientTextStyle } from '../constants/theme';

export default function VerifyPage() {
  const { token } = useParams();
  const { token: authToken, refreshUser } = useAuth();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'ok' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.post('/api/auth/verify', { token })
      .then(() => {
        if (cancelled) return;
        setStatus('ok');
        setMessage('Your email is verified.');
        // If they happen to be logged in, refresh /me so the banner clears.
        if (authToken) refreshUser?.();
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(err.response?.data?.message || 'Could not verify this link.');
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />

      <div className="relative max-w-md w-full">
        {status === 'verifying' && (
          <>
            <span className="material-symbols-outlined animate-pulse text-primary mb-4 inline-block" aria-hidden="true" style={{ fontSize: 56 }}>hourglass</span>
            <h1 className="font-headline font-bold text-2xl text-on-surface mb-2">Verifying your email</h1>
            <p className="text-on-surface-variant text-sm">Hold tight…</p>
          </>
        )}
        {status === 'ok' && (
          <>
            <h1 className="font-headline font-extrabold leading-none mb-3" style={{ fontSize: 'clamp(2.5rem, 7vw, 4rem)', ...gradientTextStyle }}>
              Verified
            </h1>
            <p className="text-on-surface text-lg mb-2">{message}</p>
            <p className="text-on-surface-variant mb-8">You can close this tab or head back to the app.</p>
            <Link
              to={authToken ? '/home' : '/login'}
              className="inline-flex items-center gap-2 font-headline font-bold rounded-full transition-all duration-200 active:scale-95 text-black px-8 py-3.5"
              style={{ backgroundImage: GRADIENT }}
            >
              {authToken ? 'Go to Bumpp' : 'Sign in'}
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20 }}>arrow_forward</span>
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <span className="material-symbols-outlined text-error mb-4 inline-block" aria-hidden="true" style={{ fontSize: 56 }}>error</span>
            <h1 className="font-headline font-bold text-2xl text-on-surface mb-2">Verification failed</h1>
            <p className="text-on-surface-variant mb-8">{message}</p>
            <Link
              to={authToken ? '/home' : '/login'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-surface-container-high text-on-surface font-semibold text-sm hover:bg-surface-bright transition-colors"
            >
              {authToken ? 'Back to home' : 'Back to login'}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
