import { useEffect, useState } from 'react';

// Live headcount for the landing page.
//
// Deliberately NOT using api/axios: that client sends an
// `ngrok-skip-browser-warning` header (which would turn this simple GET into
// a preflighted CORS request, doubling the round trips), attaches a bearer
// token we don't want on a public endpoint, and its response interceptor
// hard-redirects to /login on any 401/403 — catastrophic behaviour for a
// marketing page.
//
// Returns { count, state } where state is 'loading' | 'ok' | 'error'.
// The caller decides what to render; this hook never invents a number.

const POLL_MS = 30000;
const TIMEOUT_MS = 4000;

export function useOnlineCount() {
  const [count, setCount] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || '';
    let cancelled = false;
    let timer = null;

    const load = async () => {
      // Don't poll a tab nobody is looking at.
      if (document.visibilityState !== 'visible') return;
      const ctrl = new AbortController();
      const kill = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(`${base}/api/stats/online`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        // Guard the payload — rendering NaN would be worse than rendering
        // nothing.
        if (Number.isFinite(data?.online)) {
          setCount(data.online);
          setState('ok');
        } else {
          throw new Error('bad payload');
        }
      } catch {
        // Keep the last good value on a blip; only report error if we have
        // never had a number at all.
        if (!cancelled) setState((s) => (s === 'ok' ? 'ok' : 'error'));
      } finally {
        clearTimeout(kill);
      }
    };

    load();
    timer = setInterval(load, POLL_MS);
    // Refresh immediately when the tab comes back, rather than waiting out
    // the remainder of the interval.
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return { count, state };
}
