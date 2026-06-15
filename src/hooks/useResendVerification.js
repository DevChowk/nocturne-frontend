import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

// Resend the verification email, sharing one implementation between the soft
// banner and the hard gate. Mirrors the backend's 60s cooldown: on success we
// start a 60s lockout; on a 429 we adopt the server's retryAfter so the button
// stays disabled until the real cooldown elapses.
export function useResendVerification() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const resend = useCallback(async () => {
    if (sending || cooldown > 0) return;
    setSending(true);
    setError('');
    try {
      await api.post('/api/auth/verify/send');
      setSent(true);
      setCooldown(60);
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        const retryAfter = err.response?.data?.retryAfter || 60;
        setCooldown(retryAfter);
        setError(`Please wait ${retryAfter}s before requesting another email.`);
      } else {
        setError(err.response?.data?.message || 'Could not send. Try again.');
      }
    } finally {
      setSending(false);
    }
  }, [sending, cooldown]);

  return { resend, sending, sent, error, cooldown };
}
