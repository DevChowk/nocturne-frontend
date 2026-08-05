import ModalBase from './ModalBase';
import { useSettings } from '../hooks/useSettings';

// Sticker toggle — 2px theme-aware stroke, yellow fill on, near-black knob.
// 32×18 pill per the Design Book spec; knob is 12×12 so it sits with 2px
// breathing room inside the stroke on both extremes. Focus lays down a
// cobalt aura like the field.
function Toggle({ checked, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className="relative inline-flex flex-shrink-0 items-center rounded-full transition-colors focus:outline-none"
      style={{
        width: 34,
        height: 20,
        border: '2px solid rgb(var(--color-stroke-rgb))',
        background: checked
          ? 'rgb(var(--color-primary-rgb))'
          : 'rgb(var(--color-surface-highest-rgb))',
      }}
    >
      <span
        className="inline-block rounded-full transition-transform"
        style={{
          width: 12,
          height: 12,
          background: 'rgb(var(--color-stroke-rgb))',
          transform: checked ? 'translateX(16px)' : 'translateX(2px)',
        }}
      />
    </button>
  );
}

function Row({ label, hint, control }) {
  return (
    <div className="flex items-start justify-between gap-4 px-1 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface">{label}</p>
        {hint && <p className="text-xs text-on-surface-variant mt-0.5">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
      <span className="material-symbols-outlined text-primary" aria-hidden="true" style={{ fontSize: 18 }}>{icon}</span>
      <h3 className="font-headline font-bold text-xs uppercase tracking-widest text-on-surface-variant">{title}</h3>
    </div>
  );
}

// Sticker segmented control — 2px black stroke wraps the trio, each
// segment separated by internal 2px dividers, selected segment yellow.
// Matches the Design Book segmented spec (Foundations page 03).
function ThemeSwitch({ value, onChange }) {
  const options = [
    { key: 'system', icon: 'devices', label: 'System' },
    { key: 'light',  icon: 'light_mode', label: 'Light' },
    { key: 'dark',   icon: 'dark_mode', label: 'Dark' },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex overflow-hidden"
      style={{
        border: '2px solid rgb(var(--color-stroke-rgb))',
        borderRadius: 10,
        background: 'rgb(var(--color-surface-high-rgb))',
      }}
    >
      {options.map((o, i) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.key)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors"
            style={{
              background: active ? 'rgb(var(--color-primary-rgb))' : 'transparent',
              color: active ? '#14000A' : 'rgb(var(--color-on-surface-variant-rgb))',
              borderLeft: i === 0 ? 'none' : '2px solid rgb(var(--color-stroke-rgb))',
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>{o.icon}</span>
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function SettingsModal({ onClose, devices }) {
  const { settings, updateSetting } = useSettings();

  const reduceMotionState = settings.reduceMotion; // null | true | false

  const videoOptions = devices?.video ?? [];
  const audioOptions = devices?.audio ?? [];

  return (
    <ModalBase maxWidth="max-w-lg" onClose={onClose}>
      <header className="px-6 py-5 flex items-center justify-between border-b border-outline-variant/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary text-on-primary">
            <span className="material-symbols-outlined" aria-hidden="true">settings</span>
          </div>
          <h2 className="font-headline text-lg font-bold text-on-surface">Settings</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close settings"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-bright transition-colors active:scale-90"
        >
          <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">close</span>
        </button>
      </header>

      <div className="px-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {/* Video */}
        <SectionHeader icon="videocam" title="Video" />
        <Row
          label="Mirror my video"
          hint="Flip your local preview horizontally. The other person sees you normally."
          control={
            <Toggle
              checked={settings.mirrorLocal}
              onChange={(v) => updateSetting('mirrorLocal', v)}
              ariaLabel="Mirror my video"
            />
          }
        />
        <Row
          label="Camera"
          hint={videoOptions.length === 0 ? 'No cameras detected yet.' : 'Pick which camera to use.'}
          control={
            <select
              value={settings.videoDeviceId ?? ''}
              onChange={(e) => updateSetting('videoDeviceId', e.target.value || null)}
              disabled={videoOptions.length === 0}
              aria-label="Camera"
              className="bg-surface-container-highest text-on-surface text-sm rounded-lg px-3 py-2 border-none focus:outline-none focus:ring-1 focus:ring-secondary/30 disabled:opacity-50 max-w-[200px]"
            >
              <option value="">System default</option>
              {videoOptions.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          }
        />

        {/* Audio */}
        <SectionHeader icon="mic" title="Audio" />
        <Row
          label="Microphone"
          hint={audioOptions.length === 0 ? 'No microphones detected yet.' : 'Pick which mic to use.'}
          control={
            <select
              value={settings.audioDeviceId ?? ''}
              onChange={(e) => updateSetting('audioDeviceId', e.target.value || null)}
              disabled={audioOptions.length === 0}
              aria-label="Microphone"
              className="bg-surface-container-highest text-on-surface text-sm rounded-lg px-3 py-2 border-none focus:outline-none focus:ring-1 focus:ring-secondary/30 disabled:opacity-50 max-w-[200px]"
            >
              <option value="">System default</option>
              {audioOptions.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${i + 1}`}
                </option>
              ))}
            </select>
          }
        />

        {/* Appearance */}
        <SectionHeader icon="palette" title="Appearance" />
        <Row
          label="Theme"
          hint={
            settings.theme === 'system'
              ? 'Following your device — flips automatically when the OS toggles.'
              : settings.theme === 'light'
              ? 'Always light, regardless of your device setting.'
              : 'Always dark, regardless of your device setting.'
          }
          control={
            <ThemeSwitch
              value={settings.theme}
              onChange={(v) => updateSetting('theme', v)}
            />
          }
        />

        {/* Notifications */}
        <SectionHeader icon="notifications" title="Notifications" />
        <Row
          label="Match-found sound"
          hint="Play a short chime when someone is matched with you."
          control={
            <Toggle
              checked={settings.matchSound}
              onChange={(v) => updateSetting('matchSound', v)}
              ariaLabel="Match-found sound"
            />
          }
        />

        {/* Accessibility */}
        <SectionHeader icon="accessibility_new" title="Accessibility" />
        <Row
          label="Reduce motion"
          hint={
            reduceMotionState === null
              ? 'Following your system preference. Toggle to override.'
              : reduceMotionState
              ? 'On — pulse rings and shimmer animations are disabled.'
              : 'Off — animations play regardless of system preference.'
          }
          control={
            <div className="flex items-center gap-2">
              <Toggle
                checked={reduceMotionState === true}
                onChange={(v) => updateSetting('reduceMotion', v ? true : null)}
                ariaLabel="Reduce motion"
              />
              {reduceMotionState !== null && (
                <button
                  type="button"
                  onClick={() => updateSetting('reduceMotion', null)}
                  className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors"
                  title="Reset to system preference"
                >
                  Reset
                </button>
              )}
            </div>
          }
        />
      </div>

      <footer className="px-6 border-t border-outline-variant/40 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 rounded-full bg-surface-container-high text-on-surface text-sm font-semibold hover:bg-surface-bright transition-colors active:scale-95"
        >
          Done
        </button>
      </footer>
    </ModalBase>
  );
}
