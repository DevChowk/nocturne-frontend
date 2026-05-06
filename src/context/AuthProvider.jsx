import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
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
    setToken(data.token);
    setUser(data.user);
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

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/login');
  }, [navigate]);

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

  // True when the user is authed but hasn't completed onboarding (no username yet).
  const needsOnboarding = !!token && !loading && !!user && !user.username;

  return (
    <AuthContext.Provider value={{ user, token, loading, needsOnboarding, login, googleLogin, register, logout, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
