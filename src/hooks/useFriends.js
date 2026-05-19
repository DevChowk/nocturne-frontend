import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';

// Owns the friends list + per-friend online status. Fetches once when a
// socket is available, then live-updates via friend_online / friend_offline
// pushes from the server. Mutations (accept / remove) trigger a refetch so
// the sidebar can grow / shrink without us re-implementing the diff here.
export function useFriends(socket) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      const { data } = await api.get('/api/friends');
      setFriends(Array.isArray(data.friends) ? data.friends : []);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    refetch();

    const setOnline = (userId, online) => {
      const id = String(userId);
      setFriends((prev) => prev.map((f) =>
        String(f.user.id) === id ? { ...f, user: { ...f.user, online } } : f
      ));
    };

    const onOnline = (data) => setOnline(data.userId, true);
    const onOffline = (data) => setOnline(data.userId, false);
    const onAccepted = () => refetch();
    const onRemoved = () => refetch();

    socket.on('friend_online', onOnline);
    socket.on('friend_offline', onOffline);
    socket.on('friend_accepted', onAccepted);
    socket.on('friend_removed', onRemoved);
    return () => {
      socket.off('friend_online', onOnline);
      socket.off('friend_offline', onOffline);
      socket.off('friend_accepted', onAccepted);
      socket.off('friend_removed', onRemoved);
    };
  }, [socket, refetch]);

  return { friends, loading, error, refetch };
}
