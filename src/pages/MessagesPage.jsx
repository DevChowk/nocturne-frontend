import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';

function ConversationRow({ convo }) {
  const { user, lastMessage, unreadCount } = convo;
  const initial = (user.displayName?.[0] || user.username?.[0] || '?').toUpperCase();
  const label = user.displayName || (user.username ? `@${user.username}` : 'Unknown');
  const preview = lastMessage.mine ? `You: ${lastMessage.body}` : lastMessage.body;
  const time = new Date(lastMessage.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const unread = unreadCount > 0;

  return (
    <Link
      to={`/messages/${user.id}`}
      className="flex items-center gap-3 px-4 rounded-xl bg-surface-container-low border border-outline-variant/40 hover:border-primary/20 transition-colors active:scale-[0.99]"
    >
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-full font-bold font-headline bg-primary text-on-primary"
        style={{ width: 44, height: 44, fontSize: 18 }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`font-headline text-sm truncate ${unread ? 'font-extrabold text-on-surface' : 'font-semibold text-on-surface'}`}>
            {label}
          </p>
          <span className="text-[10px] text-on-surface-variant flex-shrink-0">{time}</span>
        </div>
        <p className={`text-xs truncate ${unread ? 'text-on-surface' : 'text-on-surface-variant'}`}>
          {preview}
        </p>
      </div>
      {unread && (
        <span
          className="flex-shrink-0 flex items-center justify-center text-[10px] font-bold rounded-full px-2 min-w-[20px] h-5"
          style={{ background: '#FFD400', color: '#000' }}
          aria-label={`${unreadCount} unread`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}

export default function MessagesPage() {
  const { token } = useAuth();
  const { socket } = useSocket(token);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/messages');
      setConversations(data.conversations);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh the list whenever a new DM lands or we send one — naive but
  // correct, and the list endpoint is cheap.
  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on('dm_message_received', refresh);
    socket.on('dm_message_sent', refresh);
    return () => {
      socket.off('dm_message_received', refresh);
      socket.off('dm_message_sent', refresh);
    };
  }, [socket, load]);

  return (
    <div className="bg-background text-on-surface font-body min-h-full flex flex-col">
      <header
        className="px-4 py-2.5 md:px-6 md:py-4 flex items-center justify-between border-b border-outline-variant/40 sticky top-0 z-10"
        style={{ background: 'rgb(var(--color-bg-rgb))' }}
      >
        <div className="flex items-center gap-3">
          <Link to="/home" aria-label="Back to home" className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          </Link>
          <h1 className="font-headline font-extrabold text-xl text-on-surface tracking-tight">Messages</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined animate-pulse text-primary" aria-hidden="true" style={{ fontSize: 36 }}>hourglass</span>
          </div>
        ) : error ? (
          <p className="text-error text-sm" role="alert">{error}</p>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6">
            <span className="material-symbols-outlined text-on-surface-variant mb-3" aria-hidden="true" style={{ fontSize: 40 }}>chat</span>
            <p className="font-headline font-semibold text-on-surface mb-1">No messages yet</p>
            <p className="text-on-surface-variant text-sm max-w-sm">
              Match someone, become friends, then start a conversation from{' '}
              <Link to="/friends" className="text-primary hover:underline">Friends</Link>.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => (
              <ConversationRow key={c.user.id} convo={c} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
