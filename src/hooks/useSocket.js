import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket(token) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      console.log('[useSocket] no token, skipping');
      return;
    }

    console.log('[useSocket] connecting with token:', token.slice(0, 20) + '...');

    const s = io(import.meta.env.VITE_API_URL, {
      auth: { token },
      forceNew: true,
      transports: ["polling", "websocket"],
      extraHeaders: {
        "ngrok-skip-browser-warning": "true",
      },
    });

    // Socket is an external system; consumers re-render when it appears/disappears.
    // The single extra render on mount is intentional and matches React's own
    // guidance for syncing external systems.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(s);

    s.on('connect', () => {
      console.log('[useSocket] connected, id:', s.id);
      setIsConnected(true);
      setError(null);
    });
    s.on('disconnect', (reason) => {
      console.log('[useSocket] disconnected, reason:', reason);
      setIsConnected(false);
    });
    s.on('connect_error', (err) => {
      console.error('[useSocket] connect_error:', err.message);
      // Unverified past the grace deadline. Don't clear auth / bounce to
      // /login — that loops (login succeeds, but the socket still rejects).
      // Instead signal the app to surface the verification gate. The user
      // stays authenticated; ProtectedRoute swaps in <VerificationGate />.
      if (err.message.includes('email not verified')) {
        window.dispatchEvent(new Event('bump:verification-required'));
        setIsConnected(false);
        return;
      }
      if (err.message.startsWith('Authentication error')) {
        // "session_replaced" means the user logged in on another device.
        // Surface a distinct signal so the frontend can show a "you've
        // been signed in elsewhere" toast instead of a generic bounce.
        if (err.message.includes('session_replaced')) {
          try { sessionStorage.setItem('bump.sessionReplaced', '1'); } catch { /* private mode */ }
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      setError(err.message);
      setIsConnected(false);
    });

    // Emitted by the server the moment a connected user's grace deadline
    // passes, just before it drops their sockets. Same handling: nudge the
    // app to re-check /me and show the gate.
    s.on('verification_required', () => {
      window.dispatchEvent(new Event('bump:verification-required'));
    });

    // Server pushes this to the OLD device when the user signs in
    // somewhere else — arrives ~250ms before the same socket is
    // force-disconnected. Handled inline (not via connect_error) so the
    // old tab can log out cleanly before the underlying connection
    // drops. Flag in sessionStorage tells LoginPage to show a toast.
    s.on('session_replaced', () => {
      try { sessionStorage.setItem('bump.sessionReplaced', '1'); } catch { /* private mode */ }
      window.dispatchEvent(new Event('bump:session-replaced'));
    });

    return () => {
      console.log('[useSocket] cleanup, disconnecting');
      s.disconnect();
      setSocket(null);
      setIsConnected(false);
      setError(null);
    };
  }, [token]);

  return { socket, isConnected, error };
}
