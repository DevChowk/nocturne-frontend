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

    const s = io('http://localhost:3001', {
      auth: { token },
      forceNew: true,
      withCredentials: true,
    });

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
      setError(err.message);
      setIsConnected(false);
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
