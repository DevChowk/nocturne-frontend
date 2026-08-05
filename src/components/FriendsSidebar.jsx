import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// Desktop-only right rail listing the user's accepted friends with a
// live online indicator. Hidden on mobile (md:flex). Online friends
// float to the top so the user sees who's reachable first.
//
// Per the Design Book lobby, the rail sits on the RIGHT of the stage,
// separated by the 2px layout rule, and scrolls inside itself — the
// body of /home never scrolls.
//
// `collapsed` is owned by HomePage so the AppHeader's friends button drives
// the same state.
export default function FriendsSidebar({ friends, loading, collapsed }) {
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
  // any horizontal space and the main view fills the row. Transition the
  // width for a smooth slide; the divider stroke goes with it.
  return (
    <aside
      className={`hidden md:flex flex-shrink-0 relative flex-col pb-2 md:pb-2 transition-[width,padding] duration-300 ease-out ${
        collapsed
          ? 'w-0 pl-0 pr-0 overflow-visible'
          : 'w-60 lg:w-[280px] pl-0 pr-0'
      }`}
      style={collapsed ? undefined : { borderLeft: '2px solid rgb(var(--color-rule-rgb))' }}
      aria-hidden={collapsed}
    >
      {!collapsed && (
        // No container border — the sidebar sits on the page ground per
        // the Design Book Friends spec ("desktop-only, scrolls inside
        // itself"). Just the mono header + row list.
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Mono uppercase header matching Design Book Friends sidebar spec:
              "FRIENDS — N ONLINE" as a single label, no separate count chip. */}
          <div className="px-5 pt-4 pb-3 flex-shrink-0">
            <p className="font-mono text-on-surface-variant uppercase tabular-nums" style={{ fontSize: 11, letterSpacing: '0.16em' }}>
              Friends — {loading ? '…' : `${onlineCount} online`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          {!loading && friends.length === 0 && (
            <div className="px-5 py-6 text-center">
              <p className="text-on-surface-variant text-xs font-label">
                No friends yet. Tap the Friend button during a call to add the people you meet.
              </p>
            </div>
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
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-on-surface/5 transition-colors text-left"
              >
                <div className="relative flex-shrink-0">
                  {/* Dark ink avatar per Design Book Friends spec — solid
                      flat #14000A circle with a small cobalt online dot at
                      the bottom-right (bordered by the page ground so it
                      reads clean when the row hovers). Yellow avatars are
                      reserved for identity chips in headers / modals; the
                      sidebar list needs quieter, denser rows. */}
                  <div
                    className="flex items-center justify-center rounded-full font-bold font-headline"
                    style={{
                      width: 30, height: 30, fontSize: 13,
                      background: 'rgb(var(--color-stroke-rgb))',
                      color: 'rgb(var(--color-bg-rgb))',
                    }}
                  >
                    {initial}
                  </div>
                  {u.online && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 rounded-full"
                      style={{
                        width: 10, height: 10,
                        background: '#3F52FF',
                        border: '2px solid rgb(var(--color-bg-rgb))',
                      }}
                      aria-label="Online"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface text-sm font-bold truncate">{name}</p>
                </div>
              </button>
            );
          })}
          </div>
          {/* Design Book footer annotation — small explanatory text sitting
              at the bottom of the sidebar column so first-time users know
              why the sidebar isn't on mobile. */}
          <p className="px-5 pt-3 pb-4 text-on-surface-variant text-[11px] leading-snug">
            Sidebar is desktop-only and scrolls inside itself.
          </p>
        </div>
      )}

    </aside>
  );
}
