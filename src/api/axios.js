import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints handle their own errors (login surfaces suspension inline,
// register surfaces validation messages). The interceptor below only
// auto-redirects for non-auth requests where the 401/403 came mid-session.
const isAuthEndpoint = (url = '') =>
  url.includes('/api/auth/login') ||
  url.includes('/api/auth/register') ||
  url.includes('/api/auth/google');

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || '';

    if (status === 401 && !isAuthEndpoint(url)) {
      // Token died mid-session.
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (status === 403 && !isAuthEndpoint(url)) {
      // Suspension landed mid-session. Persist the date so the login page
      // can render a banner explaining what happened.
      const until = err.response?.data?.suspendedUntil;
      if (until) {
        try { localStorage.setItem('suspendedUntil', until); } catch { /* quota */ }
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
