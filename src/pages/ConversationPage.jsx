import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { GRADIENT } from '../constants/theme';
import EmojiPicker from '../components/EmojiPicker';

function MessageBubble({ msg, peerLabel }) {
  const time = new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return (
    <div className={`flex flex-col gap-1 ${msg.mine ? 'items-end' : ''}`}>
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
        {msg.mine ? 'You' : peerLabel}
      </span>
      <div
        className="max-w-[75%] text-[13px] leading-snug [overflow-wrap:anywhere]"
        style={{
          padding: '8px 12px',
          background: msg.mine
            ? 'rgb(var(--color-primary-rgb))'
            : 'rgb(var(--color-surface-high-rgb))',
          color: msg.mine ? '#14000A' : 'rgb(var(--color-on-surface-rgb))',
          borderRadius: msg.mine ? '11px 11px 3px 11px' : '11px 11px 11px 3px',
        }}
      >
        {msg.body}
      </div>
      <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest">{time}</span>
    </div>
  );
}

export default function ConversationPage() {
  const { friendId } = useParams();
  const { token, refreshUser } = useAuth();
  const { socket } = useSocket(token);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [peer, setPeer] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const endRef = useRef(null);
  const navigate = useNavigate();

  // Load history + peer profile + mark-as-read on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [historyRes, friendsRes] = await Promise.all([
          api.get(`/api/messages/${friendId}`),
          api.get('/api/friends'),
        ]);
        if (cancelled) return;
        setMessages(historyRes.data.messages);
        // Find peer profile from any friend / pending list.
        const all = [
          ...friendsRes.data.friends,
          ...friendsRes.data.pendingReceived,
          ...friendsRes.data.pendingSent,
        ];
        const match = all.find((e) => String(e.user.id) === String(friendId));
        setPeer(match?.user || null);
        // Mark unread incoming as read; refresh badge.
        await api.patch(`/api/messages/${friendId}/read`).catch(() => {});
        refreshUser();
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Could not load conversation.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [friendId, refreshUser]);

  // Live updates via socket.
  useEffect(() => {
    if (!socket) return;
    const onReceived = ({ message }) => {
      if (String(message.from) === String(friendId)) {
        setMessages((prev) => [...prev, { ...message, mine: false }]);
        // Auto-mark-as-read since we're staring at the conversation.
        api.patch(`/api/messages/${friendId}/read`).catch(() => {});
      }
    };
    const onSent = ({ message }) => {
      // Only used for multi-tab sync; current tab gets the message via the
      // ack callback. Skip if we already have this message id.
      if (String(message.to) === String(friendId)) {
        setMessages((prev) => prev.some((m) => String(m.id) === String(message.id))
          ? prev
          : [...prev, { ...message, mine: true }]);
      }
    };
    socket.on('dm_message_received', onReceived);
    socket.on('dm_message_sent', onSent);
    return () => {
      socket.off('dm_message_received', onReceived);
      socket.off('dm_message_sent', onSent);
    };
  }, [socket, friendId]);

  // Auto-scroll to latest.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(
    (e) => {
      e.preventDefault();
      const text = draft.trim();
      if (!text || sending || !socket) return;
      setSending(true);
      socket.emit('dm_message', { to: friendId, body: text }, (response) => {
        setSending(false);
        if (response?.ok) {
          setMessages((prev) => prev.some((m) => String(m.id) === String(response.message.id))
            ? prev
            : [...prev, { ...response.message, mine: true }]);
          setDraft('');
        } else {
          setError(
            response?.error === 'not_friends'
              ? 'You can only message accepted friends.'
              : response?.error === 'invalid_body'
              ? 'Message can\'t be empty or over 2000 chars.'
              : 'Could not send. Try again.'
          );
        }
      });
    },
    [socket, friendId, draft, sending]
  );

  const peerLabel = peer?.displayName || (peer?.username ? `@${peer.username}` : 'Friend');

  return (
    <div className="bg-background text-on-surface font-body min-h-full flex flex-col">
      <header
        className="px-4 py-2.5 md:px-6 md:py-4 flex items-center gap-3 border-b border-outline-variant/40 sticky top-0 z-10"
        style={{ background: 'rgb(var(--color-bg-rgb))' }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-full font-bold font-headline bg-primary text-on-primary"
            style={{ width: 36, height: 36, fontSize: 16 }}
          >
            {(peer?.displayName?.[0] || peer?.username?.[0] || '?').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-headline font-bold text-sm text-on-surface truncate">{peerLabel}</p>
            {peer?.username && peer?.displayName && (
              <p className="text-on-surface-variant text-xs truncate">@{peer.username}</p>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined animate-pulse text-primary" aria-hidden="true" style={{ fontSize: 36 }}>hourglass</span>
          </div>
        ) : error ? (
          <p className="text-error text-sm" role="alert">{error}</p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-on-surface-variant mb-3" aria-hidden="true" style={{ fontSize: 36 }}>chat</span>
            <p className="text-on-surface-variant text-sm">No messages yet — send the first one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} peerLabel={peerLabel} />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </main>

      <form
        onSubmit={send}
        className="sticky bottom-0 max-w-2xl w-full mx-auto px-4 border-t border-outline-variant/40"
        style={{ background: 'rgb(var(--color-bg-rgb))' }}
      >
        <div className="relative flex items-center">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message..."
            maxLength={2000}
            autoComplete="off"
            className="field-sticker w-full pl-5 pr-24 md:pr-24 text-sm !rounded-full"
          />
          {/* Emoji picker — desktop only. Mobile keyboards ship with one. */}
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            aria-label="Pick emoji"
            className="hidden md:inline-flex absolute right-12 items-center justify-center w-9 h-9 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40 transition-colors"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">mood</span>
          </button>
          {emojiOpen && (
            <EmojiPicker
              onPick={(emoji) => setDraft((d) => d + emoji)}
              onClose={() => setEmojiOpen(false)}
              anchor="top"
            />
          )}
          <button
            type="submit"
            aria-label="Send"
            disabled={!draft.trim() || sending}
            className="absolute right-1.5 flex items-center justify-center w-10 h-10 rounded-full text-black transition-transform active:scale-95 disabled:opacity-40"
            style={{ backgroundImage: GRADIENT }}
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
