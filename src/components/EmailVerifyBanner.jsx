import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useResendVerification } from '../hooks/useResendVerification';
import { useGraceCountdown, formatGraceLeft } from '../hooks/useVerification';

const SESSION_DISMISS_KEY = 'bump.emailBannerDismissed';

// The banner ground is brand yellow in both themes, so its foreground can't
// come from the theme tokens — on yellow, ink is the only legal text colour.
const INK = '#14000A';
const INK_MUTED = 'rgba(20,0,10,0.72)';

// Slim banner shown to unverified users while they're still inside the grace
// window. Soft nag — the app stays usable until the deadline, after which
// ProtectedRoute swaps in the hard VerificationGate instead of this. Shows a
// live countdown so the deadline isn't a surprise. Dismissal lasts the browser
// session only (sessionStorage) so it nags again next visit.
export default function EmailVerifyBanner() {
  const { user, isGuest } = useAuth();
  const { resend, sending, sent, error, cooldown } = useResendVerification();
  const msLeft = useGraceCountdown(user);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(SESSION_DISMISS_KEY) === '1'; } catch { return false; }
  });

  // Guests have no email to verify — banner is irrelevant for them.
  if (isGuest || !user || user.emailVerified || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(SESSION_DISMISS_KEY, '1'); } catch { /* private mode */ }
  };

  const resendLabel = sending ? 'Sending…' : cooldown > 0 ? `${cooldown}s` : 'Resend';

  return (
    // Yellow, per the Design Book's auth law: "yellow banner during grace,
    // coral only once matching is actually gated". The gated state is
    // VerificationGate's job, not this one — this is a nag, not an error, and
    // a coral bar would read as something having gone wrong.
    //
    // Yellow is theme-invariant, so this bar looks identical in both themes
    // and every colour on it is a literal: ink is the ONLY text colour
    // allowed on yellow. (It used to be a hardcoded rgba(38,28,72) purple —
    // a colour from no palette — which put near-black light-theme text on a
    // dark ground and made the whole banner unreadable.)
    //
    // In flow, NOT fixed: ProtectedRoute wraps the app in a flex column
    // expecting this to claim a sliver at the top. Positioning it fixed took
    // it out of flow and floated it over the app header instead.
    <div
      role="status"
      className="flex-shrink-0 relative z-[60] flex items-center gap-2 px-3 py-2"
      style={{
        background: 'rgb(var(--color-primary-rgb))',
        color: INK,
        borderBottom: `2px solid ${INK}`,
      }}
    >
      <span className="material-symbols-outlined flex-shrink-0" aria-hidden="true" style={{ fontSize: 18 }}>
        {error ? 'error' : 'mark_email_unread'}
      </span>
      <p className="text-xs flex-1 min-w-0 truncate">
        {sent && !error ? (
          <span className="font-semibold">Verification email sent — check your inbox.</span>
        ) : error ? (
          <span className="font-semibold">{error}</span>
        ) : (
          <>
            <span className="font-bold">Verify your email.</span>{' '}
            <span style={{ color: INK_MUTED }}>We sent a link to {user.email}.</span>
            {msLeft != null && (
              <span className="font-bold"> {formatGraceLeft(msLeft)} left.</span>
            )}
          </>
        )}
      </p>
      <button
        type="button"
        onClick={resend}
        disabled={sending || cooldown > 0}
        className="text-xs font-bold underline underline-offset-2 decoration-2 flex-shrink-0 disabled:opacity-50 disabled:no-underline"
        style={{ color: INK }}
      >
        {resendLabel}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 transition-colors hover:bg-black/10"
        style={{ color: INK }}
      >
        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>close</span>
      </button>
    </div>
  );
}
