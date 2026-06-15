import { useEffect, useState } from 'react';

// Shared helpers for the email-verification grace window. The backend gives
// every email signup a grace period (verificationDeadline); once it passes,
// unverified users are hard-gated out of the core app (socket auth + REST).
// These hooks let the UI mirror that: a countdown while in grace, then a
// blocking gate the moment the deadline crosses.

const deadlineMsOf = (user) =>
  user?.verificationDeadline ? new Date(user.verificationDeadline).getTime() : null;

// Human-readable remaining time, e.g. "29m 58s", "4m", "45s".
export function formatGraceLeft(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  if (totalSec <= 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

// Whether the hard gate should show. The server flag (emailVerificationRequired)
// is authoritative, but we also derive it client-side from the deadline so the
// gate appears on time without waiting for a round-trip. A single timeout flips
// it when the deadline crosses — no per-second re-renders of the app tree.
export function useVerificationRequired(user) {
  const verified = !!user?.emailVerified;
  const deadlineMs = deadlineMsOf(user);
  const serverFlag = !!user?.emailVerificationRequired;
  // `now` only advances via the timeout below — reading it during render keeps
  // this hook pure (no Date.now() at render time).
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (verified || deadlineMs == null) return;
    const ms = deadlineMs - Date.now();
    if (ms <= 0) return; // already past — render below returns true
    const id = setTimeout(() => setNow(Date.now()), ms + 250);
    return () => clearTimeout(id);
  }, [verified, deadlineMs]);

  if (verified) return false;
  return serverFlag || (deadlineMs != null && now >= deadlineMs);
}

// Milliseconds left before the deadline, ticking each second. Returns null when
// verified, when there's no deadline, or once the deadline has already passed
// (at which point the gate — not the countdown — is what should show).
export function useGraceCountdown(user) {
  const verified = !!user?.emailVerified;
  const deadlineMs = deadlineMsOf(user);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (verified || deadlineMs == null) return;
    if (deadlineMs - Date.now() <= 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [verified, deadlineMs]);

  if (verified || deadlineMs == null) return null;
  const left = deadlineMs - now;
  return left > 0 ? left : null;
}
