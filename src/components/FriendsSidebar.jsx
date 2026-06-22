import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// Desktop-only left rail listing the user's accepted friends with a
// live online indicator. Hidden on mobile (md:flex). Online friends
// float to the top so the user sees who's reachable first.
// A floating chevron handle on the card's right edge collapses the rail
// out of view; tap it again to bring it back. The handle stays visible
// when collapsed (pinned to the screen's left edge) so the rail is always
// re-openable.
//
// `collapsed` + `onToggle` are owned by HomePage so the AppHeader's friends
// button can drive the same state.
export default function FriendsSidebar({ friends, loading, collapsed, onToggle }) {
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

  // The outer aside collapses to width 0 when hidden — flex stops giving it
  // any horizontal space, the main view fills the row. The handle is anchored
  // to the aside's right edge with a half-out translate, so it stays floating
  // at x=0 of the viewport while collapsed and at the sidebar's outer edge
  // when expanded. Transition the width for a smooth slide.
  return (
    <aside
      className={`hidden md:flex flex-shrink-0 relative flex-col pb-2 md:pb-2 transition-[width,padding] duration-300 ease-out ${
        collapsed
          ? 'w-0 pl-0 pr-0 overflow-visible'
          : 'w-64 lg:w-[300px] pl-3 md:pl-4 pr-0'
      }`}
      aria-hidden={collapsed}
    >
      {!collapsed && (
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
      )}

      {/* Floating handle. Pinned to the aside's right edge with a half-out
          translate so half of it sits inside the card border (expanded) or
          at x=0 of the viewport (collapsed). Round, blurred backdrop so it
          reads as a control regardless of what's behind it. */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Show friends list' : 'Hide friends list'}
        aria-expanded={!collapsed}
        title={collapsed ? 'Show friends' : 'Hide friends'}
        className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 z-20 flex items-center justify-center w-14 h-14 rounded-full transition-transform active:scale-90 hover:scale-110"
        style={{
          background: 'rgba(19,19,19,0.95)',
          border: '1.5px solid rgba(186,158,255,0.55)',
          color: '#ba9eff',
          boxShadow: '0 4px 18px rgba(0,0,0,0.6), 0 0 24px rgba(186,158,255,0.35)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <span
          className="material-symbols-outlined transition-transform duration-300"
          aria-hidden="true"
          style={{ fontSize: 30, transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
        >
          chevron_right
        </span>
      </button>
    </aside>
  );
}
