import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useResendVerification } from '../hooks/useResendVerification';
import { useGraceCountdown, formatGraceLeft } from '../hooks/useVerification';

const SESSION_DISMISS_KEY = 'bump.emailBannerDismissed';

// Slim banner shown to unverified users while they're still inside the grace
// window. Soft nag — the app stays usable until the deadline, after which
// ProtectedRoute swaps in the hard VerificationGate instead of this. Shows a
// live countdown so the deadline isn't a surprise. Dismissal lasts the browser
// session only (sessionStorage) so it nags again next visit.
export default function EmailVerifyBanner() {
  const { user } = useAuth();
  const { resend, sending, sent, error, cooldown } = useResendVerification();
  const msLeft = useGraceCountdown(user);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(SESSION_DISMISS_KEY) === '1'; } catch { return false; }
  });

  if (!user || user.emailVerified || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(SESSION_DISMISS_KEY, '1'); } catch { /* private mode */ }
  };

  const resendLabel = sending ? 'Sending…' : cooldown > 0 ? `${cooldown}s` : 'Resend';

  return (
    <div
      role="status"
      className="flex items-center gap-2 px-3 py-2 border-b border-white/5"
      style={{ background: 'rgba(186,158,255,0.08)' }}
    >
      <span className="material-symbols-outlined text-primary flex-shrink-0" aria-hidden="true" style={{ fontSize: 18 }}>mark_email_unread</span>
      <p className="text-xs text-on-surface flex-1 min-w-0 truncate">
        {sent && !error ? (
          <>Verification email sent — check your inbox.</>
        ) : error ? (
          <span className="text-error">{error}</span>
        ) : (
          <>
            <span className="font-semibold">Verify your email.</span>{' '}
            <span className="text-on-surface-variant">We sent a link to {user.email}.</span>
            {msLeft != null && (
              <span className="text-primary font-semibold"> {formatGraceLeft(msLeft)} left.</span>
            )}
          </>
        )}
      </p>
      <button
        type="button"
        onClick={resend}
        disabled={sending || cooldown > 0}
        className="text-xs font-semibold text-primary hover:text-primary-fixed flex-shrink-0 disabled:opacity-50"
      >
        {resendLabel}
      </button>
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
