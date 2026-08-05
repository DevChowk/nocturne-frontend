import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';

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
    <div className="flex items-center gap-3 px-4 rounded-xl bg-surface-container-low border border-outline-variant/40">
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
            className="btn-sticker inline-flex items-center gap-1 !px-3 !py-1.5 text-xs"
          >
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>chat_bubble</span>
            Message
          </button>
        )}
        {onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            disabled={busy}
            className="btn-sticker-outline !px-3 !py-1.5 text-xs disabled:opacity-50"
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
            className="btn-sticker inline-flex items-center gap-1 !px-3 !py-1.5 text-xs disabled:opacity-50"
          >
            {primaryIcon && <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>{primaryIcon}</span>}
            {primaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// Horizontal 3-tab strip per the Design Book Friends spec: one row of
// ACCEPTED / RECEIVED / SENT with inline counts; selected tab wears the
// sticker yellow. Matches the segmented-control vocabulary used by
// SettingsModal's ThemeSwitch so the whole app speaks the same shape.
function TabBar({ tab, setTab, counts }) {
  const tabs = [
    { key: 'accepted', label: 'Accepted', count: counts.accepted },
    { key: 'received', label: 'Received', count: counts.received },
    { key: 'sent',     label: 'Sent',     count: counts.sent },
  ];
  return (
    <div
      className="inline-flex w-full overflow-hidden"
      style={{
        border: '2px solid rgb(var(--color-stroke-rgb))',
        borderRadius: 12,
        background: 'rgb(var(--color-surface-high-rgb))',
      }}
      role="tablist"
    >
      {tabs.map((t, i) => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setTab(t.key)}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-colors"
            style={{
              background: active ? 'rgb(var(--color-primary-rgb))' : 'transparent',
              color: active ? '#14000A' : 'rgb(var(--color-on-surface-variant-rgb))',
              borderLeft: i === 0 ? 'none' : '2px solid rgb(var(--color-stroke-rgb))',
            }}
          >
            <span className="uppercase tracking-wider text-[11px]">{t.label}</span>
            <span
              className="font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: active ? 'rgba(20,0,10,0.15)' : 'rgb(var(--color-surface-highest-rgb))',
                color: 'inherit',
              }}
            >
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function FriendsPage() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ friends: [], pendingReceived: [], pendingSent: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  // Default tab lands on "received" when there's a pending request to
  // action, otherwise the main "accepted" list. Users usually come here
  // to respond to someone, so surfacing that first saves a tap.
  const [tab, setTab] = useState('accepted');
  useEffect(() => {
    if (data.pendingReceived.length > 0 && tab === 'accepted' && data.friends.length === 0) {
      setTab('received');
    }
    // Only nudges on initial load; user's manual tab picks are respected after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.pendingReceived.length, data.friends.length]);

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

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-4">
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
            <TabBar
              tab={tab}
              setTab={setTab}
              counts={{
                accepted: data.friends.length,
                received: data.pendingReceived.length,
                sent: data.pendingSent.length,
              }}
            />

            {tab === 'accepted' && (
              data.friends.length === 0 ? (
                <p className="text-on-surface-variant text-sm px-1 pt-2">
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
              )
            )}

            {tab === 'received' && (
              data.pendingReceived.length === 0 ? (
                <p className="text-on-surface-variant text-sm px-1 pt-2">No new requests.</p>
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
              )
            )}

            {tab === 'sent' && (
              data.pendingSent.length === 0 ? (
                <p className="text-on-surface-variant text-sm px-1 pt-2">You haven't sent any requests.</p>
              ) : (
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
              )
            )}
          </>
        )}
      </main>
    </div>
  );
}
