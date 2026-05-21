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
      style={{ backgroundImage: GRADIENT, boxShadow: '0 4px 20px rgba(186,158,255,0.2)', opacity: disabled && !loading ? 0.4 : 1 }}
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
      className="flex items-center justify-center rounded-full p-2 md:p-3 border transition-all duration-200 active:scale-95"
      style={enabled
        ? { background: 'rgba(186,158,255,0.12)', borderColor: 'rgba(186,158,255,0.25)', color: '#ba9eff' }
        : { background: 'rgba(167,1,56,0.2)', borderColor: 'rgba(167,1,56,0.4)', color: '#ff6e84' }}
    >
      <span className={ICON_CLASS}>{enabled ? iconOn : iconOff}</span>
    </button>
  );
}

const FRIEND_STYLE = {
  accepted: { background: 'rgba(0,207,252,0.15)',  borderColor: 'rgba(0,207,252,0.4)',  color: '#00cffc' },
  sent:     { background: 'rgba(186,158,255,0.18)', borderColor: 'rgba(186,158,255,0.35)', color: '#ba9eff' },
  received: { background: 'rgba(255,151,181,0.15)', borderColor: 'rgba(255,151,181,0.35)', color: '#ff97b5' },
  none:     { background: 'rgba(186,158,255,0.12)', borderColor: 'rgba(186,158,255,0.25)', color: '#ba9eff' },
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
      className="flex items-center justify-center rounded-full p-2 md:p-3 border transition-all duration-200 active:scale-95 disabled:cursor-default"
      style={{ ...FRIEND_STYLE[status] || FRIEND_STYLE.none, opacity: 1 }}
    >
      <span className={ICON_CLASS} aria-hidden="true">{FRIEND_ICON[status] || FRIEND_ICON.none}</span>
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
      className="flex items-center justify-center rounded-full p-2 md:p-3 border border-error-container/40 transition-all duration-300 active:scale-95"
      style={{ background: 'rgba(167,1,56,0.2)', color: '#ff6e84', opacity: disabled ? 0.4 : 1 }}
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
    case 'stop':   return <StopButton key={i} {...c} />;
    default:       return null;
  }
};

export default function CallControlsBar({ controls }) {
  return (
    <div className="flex-shrink-0 w-full px-2 md:px-4 pt-2 md:pt-4 pb-2 md:pb-2">
      <nav
        className="w-full flex justify-center px-4 py-2 bg-surface-container-low/60 backdrop-blur-xl rounded-2xl"
        style={{ boxShadow: '0 -8px 30px rgba(139,92,246,0.15)' }}
      >
        <div
          className="grid items-center justify-items-center w-full max-w-xs"
          style={{ gridTemplateColumns: `repeat(${controls.length}, minmax(0, 1fr))` }}
        >
          {controls.map(renderControl)}
        </div>
      </nav>
    </div>
  );
}
