import { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';

const SESSION_DISMISS_KEY = 'bump.emailBannerDismissed';

// Slim banner shown to users whose email isn't verified yet. Soft nag —
// nothing's actually blocked. Persists dismissal for the browser session
// only (sessionStorage) so it nags again next visit.
export default function EmailVerifyBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(SESSION_DISMISS_KEY) === '1'; } catch { return false; }
  });
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  if (!user || user.emailVerified || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(SESSION_DISMISS_KEY, '1'); } catch { /* private mode */ }
  };

  const resend = async () => {
    setResending(true);
    setError('');
    try {
      await api.post('/api/auth/verify/send');
      setResent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send. Try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      role="status"
      className="flex items-center gap-2 px-3 py-2 border-b border-white/5"
      style={{ background: 'rgba(186,158,255,0.08)' }}
    >
      <span className="material-symbols-outlined text-primary flex-shrink-0" aria-hidden="true" style={{ fontSize: 18 }}>mark_email_unread</span>
      <p className="text-xs text-on-surface flex-1 min-w-0 truncate">
        {resent ? (
          <>Verification email sent — check your inbox.</>
        ) : error ? (
          <span className="text-error">{error}</span>
        ) : (
          <><span className="font-semibold">Verify your email.</span> <span className="text-on-surface-variant">We sent a link to {user.email}.</span></>
        )}
      </p>
      {!resent && (
        <button
          type="button"
          onClick={resend}
          disabled={resending}
          className="text-xs font-semibold text-primary hover:text-primary-fixed flex-shrink-0 disabled:opacity-50"
        >
          {resending ? 'Sending…' : 'Resend'}
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="flex items-center justify-center w-6 h-6 rounded-full text-on-surface-variant/70 hover:text-on-surface-variant flex-shrink-0"
      >
        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>close</span>
      </button>
    </div>
  );
}
