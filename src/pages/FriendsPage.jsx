import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { GRADIENT } from '../constants/theme';

function Avatar({ user }) {
  const label = user?.displayName || user?.username || '?';
  const initial = label[0]?.toUpperCase() ?? '?';
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full font-bold font-headline bg-primary text-on-primary"
      style={{ width: 44, height: 44, fontSize: 18 }}
    >
      {initial}
    </div>
  );
}

function FriendRow({ entry, busy, onPrimary, primaryLabel, primaryIcon, onSecondary, secondaryLabel, onMessage }) {
  const { user } = entry;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40">
      <Avatar user={user} />
      <div className="flex-1 min-w-0">
        <p className="font-headline font-semibold text-on-surface text-sm truncate">
          {user.displayName || user.username || 'Anonymous'}
        </p>
        {user.username && user.displayName && (
          <p className="text-on-surface-variant text-xs truncate">@{user.username}</p>
        )}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {onMessage && (
          <button
            type="button"
            onClick={onMessage}
            aria-label="Message"
            title="Message"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-high text-primary hover:bg-surface-bright transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">chat_bubble</span>
          </button>
        )}
        {onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            disabled={busy}
            className="px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-bright text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {secondaryLabel}
          </button>
        )}
        {onPrimary && (
          <button
            type="button"
            onClick={onPrimary}
            disabled={busy}
            aria-label={primaryLabel}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-black text-xs font-bold transition-colors active:scale-95 disabled:opacity-50"
            style={{ backgroundImage: GRADIENT }}
          >
            {primaryIcon && <span className="material-symbols-outlined text-base" aria-hidden="true">{primaryIcon}</span>}
            {primaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, count, children }) {
  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between px-1">
        <h2 className="font-headline font-bold text-on-surface text-sm uppercase tracking-widest">{title}</h2>
        <span className="text-on-surface-variant text-xs font-label">{count}</span>
      </header>
      {children}
    </section>
  );
}

export default function FriendsPage() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ friends: [], pendingReceived: [], pendingSent: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/friends');
      setData(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load friends.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const accept = async (userId) => {
    setBusyId(userId);
    try {
      await api.post(`/api/friends/${userId}/accept`);
      await load();
      refreshUser();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (userId) => {
    setBusyId(userId);
    try {
      await api.delete(`/api/friends/${userId}`);
      await load();
      refreshUser();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-4 py-2.5 md:px-6 md:py-4 flex items-center justify-between border-b border-outline-variant/40 sticky top-0 z-10" style={{ background: 'rgb(var(--color-bg-rgb))' }}>
        <div className="flex items-center gap-3">
          <Link to="/home" aria-label="Back to home" className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          </Link>
          <h1 className="font-headline font-extrabold text-xl text-on-surface tracking-tight">Friends</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-8">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined animate-pulse text-primary" aria-hidden="true" style={{ fontSize: 36 }}>hourglass</span>
          </div>
        )}

        {!loading && error && (
          <p className="text-error text-sm" role="alert">{error}</p>
        )}

        {!loading && !error && (
          <>
            <Section title="Requests received" count={data.pendingReceived.length}>
              {data.pendingReceived.length === 0 ? (
                <p className="text-on-surface-variant text-sm px-1">No new requests.</p>
              ) : (
                <div className="space-y-2">
                  {data.pendingReceived.map((entry) => (
                    <FriendRow
                      key={entry.id}
                      entry={entry}
                      busy={busyId === entry.user.id}
                      onPrimary={() => accept(entry.user.id)}
                      primaryLabel="Accept"
                      primaryIcon="check"
                      onSecondary={() => remove(entry.user.id)}
                      secondaryLabel="Decline"
                    />
                  ))}
                </div>
              )}
            </Section>

            <Section title="Friends" count={data.friends.length}>
              {data.friends.length === 0 ? (
                <p className="text-on-surface-variant text-sm px-1">
                  Match someone you click with — when you both tap Add Friend in a call, they show up here.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.friends.map((entry) => (
                    <FriendRow
                      key={entry.id}
                      entry={entry}
                      busy={busyId === entry.user.id}
                      onMessage={() => navigate(`/messages/${entry.user.id}`)}
                      onSecondary={() => remove(entry.user.id)}
                      secondaryLabel="Remove"
                    />
                  ))}
                </div>
              )}
            </Section>

            {data.pendingSent.length > 0 && (
              <Section title="Requests sent" count={data.pendingSent.length}>
                <div className="space-y-2">
                  {data.pendingSent.map((entry) => (
                    <FriendRow
                      key={entry.id}
                      entry={entry}
                      busy={busyId === entry.user.id}
                      onSecondary={() => remove(entry.user.id)}
                      secondaryLabel="Cancel"
                    />
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
