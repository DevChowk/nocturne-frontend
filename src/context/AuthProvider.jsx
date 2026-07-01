import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from './AuthContext';
import { getDeviceFingerprint } from '../utils/fingerprint';

const GUEST_FLAG_KEY = 'bump.isGuest';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  // Guest sessions reuse the same token slot as registered users so the
  // axios bearer header + every existing protected component just work.
  // The flag tells the rest of the app to skip /me, hide registered-only
  // features, and surface signup CTAs.
  const [isGuest, setIsGuest] = useState(() => {
    try { return localStorage.getItem(GUEST_FLAG_KEY) === '1'; } catch { return false; }
  });
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    // Guests have no User row — calling /me would 401/403 and yank them
    // out. Trust the cached user shape stamped at loginAsGuest() time.
    if (isGuest) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api.get('/api/auth/me')
      .then(({ data }) => {
        if (cancelled) return;
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
      })
      .catch((err) => {
        // 401 (token dead) and 403 (suspension) are both handled by the
        // axios interceptor — it clears auth, persists suspendedUntil to
        // localStorage when present, and redirects to /login.
        // Other errors (server down, network) keep the cached user.
        const status = err.response?.status;
        if (status !== 401 && status !== 403) {
          console.warn('[auth] /me failed, keeping cached user:', err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAuth = useCallback((data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    // Clear the guest flag — saveAuth is only called for register/login/
    // google, all of which mint a real user token. A guest who converts
    // by signing up needs to shed the isGuest flag here or downstream
    // gates (friends UI, EmailVerifyBanner, etc.) stay wrong.
    try { localStorage.removeItem(GUEST_FLAG_KEY); } catch { /* private mode */ }
    setToken(data.token);
    setUser(data.user);
    setIsGuest(false);
  }, []);

  const register = useCallback(async ({ email, password, username, dateOfBirth }) => {
    const { data } = await api.post('/api/auth/register', { email, password, username, dateOfBirth });
    saveAuth(data);
    navigate('/home');
  }, [saveAuth, navigate]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    saveAuth(data);
    navigate('/home');
  }, [saveAuth, navigate]);

  const googleLogin = useCallback(async (accessToken) => {
    const { data } = await api.post('/api/auth/google', { accessToken });
    saveAuth(data);
    navigate('/home');
  }, [saveAuth, navigate]);

  // Spin up an anonymous guest session. Computes a homemade device
  // fingerprint client-side, sends it along with the DOB attestation, and
  // stashes the returned guest token in the same `token` slot used by
  // registered users so axios + protected routes don't need to know.
  const loginAsGuest = useCallback(async ({ dateOfBirth }) => {
    const { uuid, fpHash } = getDeviceFingerprint();
    const { data } = await api.post('/api/auth/guest', {
      dateOfBirth,
      uuid,
      fpHash,
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.guest));
    try { localStorage.setItem(GUEST_FLAG_KEY, '1'); } catch { /* private mode */ }
    setToken(data.token);
    setUser(data.guest);
    setIsGuest(true);
    navigate('/home');
    return data;
  }, [navigate]);

  const logout = useCallback(async () => {
    // Tell the server to blocklist the token so it can't be reused if it
    // ever leaks. Fire-and-forget — even if the request fails (network /
    // server down), we still clear local state and navigate; the token
    // would only stay valid until its natural 7d expiry. Skipped for
    // guests — their tokens expire on their own short clock and the
    // server has no User row to blocklist against.
    if (!isGuest) {
      try { await api.post('/api/auth/logout'); } catch { /* ignore */ }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    try { localStorage.removeItem(GUEST_FLAG_KEY); } catch { /* private mode */ }
    setToken(null);
    setUser(null);
    setIsGuest(false);
    navigate(isGuest ? '/' : '/login');
  }, [navigate, isGuest]);

  // Profile updates (username, displayName, bio, dateOfBirth). Refreshes
  // the cached user on success and bubbles errors so callers can show
  // validation messages.
  const updateProfile = useCallback(async (patch) => {
    const { data } = await api.patch('/api/auth/me', patch);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  // Re-fetch the cached user. Useful after side-effect actions like
  // accepting a friend request that change pendingFriendCount.
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch {
      // 401/403 are auto-handled by the axios interceptor; other errors
      // we just swallow — the cached user is still good.
      return null;
    }
  }, []);

  // The socket layer dispatches 'bump:verification-required' when the server
  // rejects/kicks an unverified user past their grace deadline. Re-fetch /me
  // so emailVerificationRequired flips true and ProtectedRoute shows the gate.
  useEffect(() => {
    const onRequired = () => { refreshUser(); };
    window.addEventListener('bump:verification-required', onRequired);
    return () => window.removeEventListener('bump:verification-required', onRequired);
  }, [refreshUser]);

  // 'bump:session-replaced' fires when this device's user has just signed
  // in somewhere else. Clear local auth and land them on /login (the
  // sessionStorage flag was already set by useSocket so LoginPage can
  // show a "signed in elsewhere" note). Avoid the /logout POST — the
  // token is already invalid on the server.
  useEffect(() => {
    const onReplaced = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      try { localStorage.removeItem(GUEST_FLAG_KEY); } catch { /* private mode */ }
      setToken(null);
      setUser(null);
      setIsGuest(false);
      navigate('/login', { replace: true });
    };
    window.addEventListener('bump:session-replaced', onReplaced);
    return () => window.removeEventListener('bump:session-replaced', onReplaced);
  }, [navigate]);

  // True when the user is authed but hasn't completed onboarding (no
  // username yet). Guests never get prompted — they have no User row to
  // patch, so onboarding wouldn't make sense for them.
  const needsOnboarding = !!token && !loading && !!user && !user.username && !isGuest;

  return (
    <AuthContext.Provider value={{ user, token, loading, needsOnboarding, isGuest, login, googleLogin, register, loginAsGuest, logout, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
