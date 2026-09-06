// Bottom control bar for the in-call screen. Callers pass an array of
// `controls` describing which buttons to render and how they behave; this
// component owns the layout, sizing, and visual treatment.
//
// Design Book law: exactly one sticker button per view. In a call that's
// Skip — the action people take most — so it renders as the yellow sticker
// while everything else stays a round single-fill control. Colour carries
// state: yellow = active/actionable, coral = danger/off, cobalt =
// connected, grey = idle.

import { FRIEND_STYLE, FRIEND_ICON, FRIEND_LABEL } from '../constants/friendStatus';

const ICON_CLASS = 'material-symbols-outlined text-[18px] md:text-[22px]';

function SkipButton({ onClick, disabled, loading, title }) {
  return (
    <button
      type="button"
      onClick={loading ? undefined : onClick}
      disabled={disabled || loading}
      aria-label={loading ? 'Searching' : (title || 'Skip')}
      title={loading ? 'Searching' : (title || 'Skip')}
      className="btn-sticker inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed"
      style={{ paddingBlock: 10, paddingInline: 22, fontSize: 15, opacity: disabled && !loading ? 0.4 : 1 }}
    >
      <span className={`${ICON_CLASS} ${loading ? 'animate-spin' : ''}`} aria-hidden="true">
        {loading ? 'progress_activity' : 'skip_next'}
      </span>
      Skip
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
        // Solid yellow with a soft glow — no border ring.
        ? { background: 'rgb(var(--color-primary-rgb))', color: '#14000A', boxShadow: '0 4px 20px rgba(255,212,0,0.2)' }
        // Off/muted — solid coral, matching shadow style.
        : { background: 'rgb(var(--color-tertiary-rgb))', color: '#FFFFFF', boxShadow: '0 4px 20px rgba(255,79,79,0.2)' }}
    >
      <span className={ICON_CLASS}>{enabled ? iconOn : iconOff}</span>
    </button>
  );
}


function FriendButton({ status = 'none', onClick, busy }) {
  const disabled = busy || status === 'accepted' || status === 'sent';
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={FRIEND_LABEL[status] || FRIEND_LABEL.none}
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

// Modelled on ChatButton — the file's own template for "toggle with a badge".
// Deliberately NOT a second .btn-sticker: the Design Book allows exactly one
// sticker button per view, and in-call that is Skip.
function GameButton({ active, onClick, unread = 0, attention = false }) {
  const hasBadge = !active && (attention || unread > 0);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={attention ? 'Game invite waiting' : active ? 'Hide game' : 'Play a game'}
      aria-pressed={active}
      title={active ? 'Hide game' : 'Play a game'}
      className="relative flex items-center justify-center rounded-full p-2 md:p-3 shadow-lg transition-all duration-200 active:scale-95"
      style={active
        ? { background: 'rgb(var(--color-primary-rgb))', color: '#14000A', boxShadow: '0 4px 20px rgba(255,212,0,0.2)' }
        : { background: 'rgb(var(--color-surface-highest-rgb))', color: 'rgb(var(--color-on-surface-variant-rgb))' }}
    >
      <span className={ICON_CLASS}>sports_esports</span>
      {hasBadge && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full text-[10px] font-bold leading-none text-black"
          style={{ background: '#FFD400', boxShadow: '0 0 8px rgba(255,212,0,0.6)' }}
          aria-hidden="true"
        >
          {attention ? '!' : unread > 3 ? '3+' : String(unread)}
        </span>
      )}
    </button>
  );
}

const renderControl = (c, i) => {
  switch (c.type) {
    case 'skip':   return <SkipButton key={i} {...c} />;
    case 'mic':    return <ToggleButton key={i} enabled={c.enabled} onClick={c.onClick} iconOn="mic" iconOff="mic_off" label={c.enabled ? 'Mute mic' : 'Unmute mic'} />;
    case 'cam':    return <ToggleButton key={i} enabled={c.enabled} onClick={c.onClick} iconOn="videocam" iconOff="videocam_off" label={c.enabled ? 'Turn off camera' : 'Turn on camera'} />;
    case 'friend': return <FriendButton key={i} {...c} />;
    case 'chat':   return <ChatButton key={i} {...c} />;
    case 'game':   return <GameButton key={i} {...c} />;
    case 'stop':   return <StopButton key={i} {...c} />;
    default:       return null;
  }
};

// The bar is a ruled row on the page ground, not a floating glass card —
// the Design Book separates it from the stage with the 2px layout rule
// and nothing else.
export default function CallControlsBar({ controls }) {
  return (
    <nav
      className="flex-shrink-0 w-full flex items-center justify-center gap-2 md:gap-4 px-3 md:px-4 py-3 mt-2 md:mt-4"
      style={{ borderTop: '2px solid rgb(var(--color-rule-rgb))' }}
    >
      {controls.map(renderControl)}
    </nav>
  );
}
