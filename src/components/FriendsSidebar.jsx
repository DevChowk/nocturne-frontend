import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// Desktop-only left rail listing the user's accepted friends with a
// live online indicator. Hidden on mobile (md:flex). Online friends
// float to the top so the user sees who's reachable first.
export default function FriendsSidebar({ friends, loading }) {
  const navigate = useNavigate();

  const sorted = useMemo(() => {
    return [...friends].sort((a, b) => {
      const ao = a.user.online ? 1 : 0;
      const bo = b.user.online ? 1 : 0;
      if (ao !== bo) return bo - ao;
      const an = (a.user.displayName || a.user.username || '').toLowerCase();
      const bn = (b.user.displayName || b.user.username || '').toLowerCase();
      return an.localeCompare(bn);
    });
  }, [friends]);

  const onlineCount = friends.filter((f) => f.user.online).length;

  return (
    <aside className="hidden md:flex flex-shrink-0 w-64 lg:w-[300px] flex-col px-3 md:px-4 pb-3 md:pb-4">
      <div className="flex-1 min-h-0 flex flex-col rounded-xl overflow-hidden" style={{ background: '#131313', border: '1px solid rgba(186,158,255,0.12)' }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
          <h2 className="font-headline font-bold text-on-surface text-base">Friends</h2>
          <span className="text-on-surface-variant text-[10px] font-label uppercase tracking-widest tabular-nums">
            {loading ? '…' : `${onlineCount}/${friends.length}`}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar py-2 min-h-0">
        {!loading && friends.length === 0 && (
          <div className="px-5 py-6 text-center">
            <p className="text-on-surface-variant text-xs font-label">
              No friends yet. Tap the Friend button during a call to add the people you meet.
            </p>
          </div>
        )}
        {!loading && friends.length > 0 && (
          <p className="px-5 pb-1.5 pt-1 text-on-surface-variant text-[10px] font-label uppercase tracking-widest">
            Online — {onlineCount}
          </p>
        )}
        {sorted.map((entry) => {
          const u = entry.user;
          const name = u.displayName || u.username || 'Unknown';
          const initial = (u.displayName?.[0] || u.username?.[0] || '?').toUpperCase();
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => navigate(`/messages/${u.id}`)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
            >
              <div className="relative flex-shrink-0">
                <div
                  className="flex items-center justify-center rounded-full font-bold font-headline"
                  style={{ width: 36, height: 36, fontSize: 14, background: 'rgba(186,158,255,0.15)', color: '#ba9eff' }}
                >
                  {initial}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${u.online ? 'bg-secondary' : 'bg-on-surface-variant/40'}`}
                  style={{ borderColor: '#0e0e0e', background: u.online ? '#00cffc' : 'rgba(173,170,170,0.4)' }}
                  aria-label={u.online ? 'Online' : 'Offline'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-on-surface text-sm font-semibold truncate">{name}</p>
                <p className="text-on-surface-variant text-[11px] truncate">
                  {u.online ? 'Online' : 'Offline'}
                </p>
              </div>
            </button>
          );
        })}
        </div>
      </div>
    </aside>
  );
}
