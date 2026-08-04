// Shared bottom-bar of round controls used by both Lobby and Video Call.
// Callers pass an array of `controls` describing which buttons to render
// and how they behave; this component owns the layout, sizing, and visual
// treatment so the two screens always look identical.
import { GRADIENT } from '../constants/theme';

const ICON_CLASS = 'material-symbols-outlined text-[18px] md:text-[22px]';

function NextButton({ onClick, disabled, loading, title }) {
  return (
    <button
      type="button"
      onClick={loading ? undefined : onClick}
      disabled={disabled || loading}
      aria-label={loading ? 'Searching' : (title || 'Next')}
      title={loading ? 'Searching' : (title || 'Next')}
      className="flex items-center justify-center text-black rounded-full p-2 md:p-3 shadow-lg hover:scale-110 transition-transform duration-200 disabled:cursor-not-allowed"
      style={{ backgroundImage: GRADIENT, boxShadow: '0 4px 20px rgba(255,212,0,0.2)', opacity: disabled && !loading ? 0.4 : 1 }}
    >
      <span className={`${ICON_CLASS} ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : 'skip_next'}</span>
    </button>
  );
}

function ToggleButton({ enabled, onClick, label, iconOn, iconOff }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!enabled}
      aria-label={label}
      className="flex items-center justify-center rounded-full p-2 md:p-3 shadow-lg transition-all duration-200 active:scale-95"
      style={enabled
        // Solid yellow with a soft glow — same clean edge as NextButton.
        ? { background: 'rgb(var(--color-primary-rgb))', color: '#14000A', boxShadow: '0 4px 20px rgba(255,212,0,0.2)' }
        // Off/muted — solid coral, matching shadow style.
        : { background: 'rgb(var(--color-tertiary-rgb))', color: '#FFFFFF', boxShadow: '0 4px 20px rgba(255,79,79,0.2)' }}
    >
      <span className={ICON_CLASS}>{enabled ? iconOn : iconOff}</span>
    </button>
  );
}

// Solid fills with soft glow shadows — matches the NextButton visual
// vocabulary (clean edge, no border ring). State is signaled by color
// alone: yellow for actionable, cobalt for connected, coral for danger.
const FRIEND_STYLE = {
  accepted: { background: 'rgb(var(--color-secondary-rgb))', color: '#FFFFFF', boxShadow: '0 4px 20px rgba(63,82,255,0.25)' },
  sent:     { background: 'rgb(var(--color-primary-rgb))',   color: '#14000A', boxShadow: '0 4px 20px rgba(255,212,0,0.2)' },
  received: { background: 'rgb(var(--color-tertiary-rgb))',  color: '#FFFFFF', boxShadow: '0 4px 20px rgba(255,79,79,0.25)' },
  none:     { background: 'rgb(var(--color-primary-rgb))',   color: '#14000A', boxShadow: '0 4px 20px rgba(255,212,0,0.2)' },
};
const FRIEND_ICON = { accepted: 'check_circle', sent: 'hourglass_top', received: 'person_add_alt', none: 'person_add' };

function FriendButton({ status = 'none', onClick, busy }) {
  const disabled = busy || status === 'accepted' || status === 'sent';
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={
        status === 'accepted' ? 'Friends'
        : status === 'sent' ? 'Friend request sent'
        : status === 'received' ? 'Accept friend request'
        : 'Add friend'
      }
      className="flex items-center justify-center rounded-full p-2 md:p-3 shadow-lg transition-all duration-200 active:scale-95 disabled:cursor-default"
      style={{ ...FRIEND_STYLE[status] || FRIEND_STYLE.none, opacity: 1 }}
    >
      <span className={ICON_CLASS} aria-hidden="true">{FRIEND_ICON[status] || FRIEND_ICON.none}</span>
    </button>
  );
}

function ChatButton({ active, onClick, unread = 0 }) {
  const hasUnread = !active && unread > 0;
  // Cap at "3+" so the pill stays tiny and we don't end up rendering
  // double-digit counts on a 18px badge.
  const badge = unread > 3 ? '3+' : String(unread);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        hasUnread
          ? `Show chat (${unread} new ${unread === 1 ? 'message' : 'messages'})`
          : active ? 'Hide chat' : 'Show chat'
      }
      aria-pressed={active}
      title={active ? 'Hide chat' : 'Show chat'}
      className="relative flex items-center justify-center rounded-full p-2 md:p-3 shadow-lg transition-all duration-200 active:scale-95"
      style={active
        // Active chat = solid yellow — matches all other on-states.
        ? { background: 'rgb(var(--color-primary-rgb))', color: '#14000A', boxShadow: '0 4px 20px rgba(255,212,0,0.2)' }
        // Idle = theme-aware surface. Softer shadow since it's the "off" state.
        : { background: 'rgb(var(--color-surface-highest-rgb))', color: 'rgb(var(--color-on-surface-variant-rgb))' }}
    >
      <span className={ICON_CLASS}>chat_bubble</span>
      {/* Unread indicator — only shown while chat is collapsed. A pill with
          the count once we have one (so the user can tell "new" vs "lots of
          new"). Positioned to clip the top-right of the icon. */}
      {hasUnread && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full text-[10px] font-bold leading-none text-black"
          style={{ background: '#FFD400', boxShadow: '0 0 8px rgba(255,212,0,0.6)' }}
          aria-hidden="true"
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function StopButton({ onClick, disabled, title }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={title || 'Stop'}
      title={title || 'Stop'}
      className="flex items-center justify-center rounded-full p-2 md:p-3 shadow-lg transition-all duration-300 active:scale-95 disabled:cursor-not-allowed"
      style={disabled
        // Disabled = neutral surface with muted icon. Avoids the "washed
        // pink" look that faded coral gets on the warm-putty ground when
        // opacity is applied. Same pattern as the chat idle state.
        ? { background: 'rgb(var(--color-surface-highest-rgb))', color: 'rgb(var(--color-on-surface-variant-rgb))' }
        // Active = solid coral, matches the mic/cam-off treatment.
        : { background: 'rgb(var(--color-tertiary-rgb))', color: '#FFFFFF', boxShadow: '0 4px 20px rgba(255,79,79,0.25)' }}
    >
      <span className={ICON_CLASS}>stop_circle</span>
    </button>
  );
}

const renderControl = (c, i) => {
  switch (c.type) {
    case 'next':   return <NextButton key={i} {...c} />;
    case 'mic':    return <ToggleButton key={i} enabled={c.enabled} onClick={c.onClick} iconOn="mic" iconOff="mic_off" label={c.enabled ? 'Mute mic' : 'Unmute mic'} />;
    case 'cam':    return <ToggleButton key={i} enabled={c.enabled} onClick={c.onClick} iconOn="videocam" iconOff="videocam_off" label={c.enabled ? 'Turn off camera' : 'Turn on camera'} />;
    case 'friend': return <FriendButton key={i} {...c} />;
    case 'chat':   return <ChatButton key={i} {...c} />;
    case 'stop':   return <StopButton key={i} {...c} />;
    default:       return null;
  }
};

export default function CallControlsBar({ controls }) {
  return (
    <div className="flex-shrink-0 w-full px-2 md:px-4 pt-2 md:pt-4 pb-4 md:pb-4">
      <nav
        className="w-full flex justify-center px-4 py-2 bg-surface-container-low/70 backdrop-blur-xl rounded-2xl border border-outline-variant/40"
        style={{ boxShadow: '0 -8px 30px rgba(255,212,0,0.15)' }}
      >
        <div className="flex items-center justify-center gap-x-6 w-full">
          {controls.map(renderControl)}
        </div>
      </nav>
    </div>
  );
}
