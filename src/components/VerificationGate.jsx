import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useResendVerification } from '../hooks/useResendVerification';
import { GRADIENT, gradientTextStyle } from '../constants/theme';

// Full-screen, non-dismissible gate shown once an unverified account is past
// its grace deadline. Replaces the app entirely (see ProtectedRoute) — the
// backend rejects the socket + outbound REST actions for these users anyway,
// so there's nothing usable behind it until they verify.
export default function VerificationGate() {
  const { user, logout, refreshUser } = useAuth();
  const { resend, sending, sent, error, cooldown } = useResendVerification();
  const [checking, setChecking] = useState(false);

  // After clicking the link in their inbox, the user comes back here and taps
  // "I've verified" — re-fetch /me; if emailVerified flipped true the gate
  // unmounts and the app returns.
  const recheck = async () => {
    setChecking(true);
    try { await refreshUser(); } finally { setChecking(false); }
  };

  const resendLabel = sending
    ? 'Sending…'
    : cooldown > 0
      ? `Resend in ${cooldown}s`
      : 'Resend email';

  return (
    <div className="bg-background text-on-background font-body min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
      <div className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,212,0,0.12) 0%, transparent 70%)' }} />

      <div className="relative max-w-md w-full">
        <span className="material-symbols-outlined text-primary mb-4 inline-block" aria-hidden="true" style={{ fontSize: 56 }}>
          mark_email_unread
        </span>
        <h1 className="font-headline font-extrabold leading-none mb-4"
          style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', ...gradientTextStyle }}>
          Verify your email
        </h1>
        <p className="text-on-surface text-base mb-2">
          Your free preview of Bumpp has ended.
        </p>
        <p className="text-on-surface-variant text-sm mb-8">
          To keep using Bumpp, confirm your email. We sent a link to{' '}
          <span className="font-semibold text-on-surface">{user?.email}</span>.
          Click it, then come back here.
        </p>

        {sent && !error && (
          <p className="text-sm text-primary mb-4" role="status">
            Verification email sent — check your inbox (and spam).
          </p>
        )}
        {error && (
          <p className="text-sm text-error mb-4" role="alert">{error}</p>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={recheck}
            disabled={checking}
            className="btn-sticker inline-flex items-center justify-center gap-2 px-8 py-3.5 disabled:opacity-60"
          >
            {checking ? 'Checking…' : "I've verified — continue"}
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20 }}>arrow_forward</span>
          </button>

          <button
            type="button"
            onClick={resend}
            disabled={sending || cooldown > 0}
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-surface-container-high text-on-surface font-semibold text-sm hover:bg-surface-bright transition-colors disabled:opacity-50"
          >
            {resendLabel}
          </button>

          <button
            type="button"
            onClick={logout}
            className="text-xs text-on-surface-variant/70 hover:text-on-surface-variant mt-2"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
