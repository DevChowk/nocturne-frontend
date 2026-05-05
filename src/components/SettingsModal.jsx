import ModalBase from './ModalBase';
import { useSettings } from '../hooks/useSettings';

function Toggle({ checked, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
      style={{
        background: checked ? '#ba9eff' : 'rgba(72,72,71,0.6)',
      }}
    >
      <span
        className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
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

export default function SettingsModal({ onClose, devices }) {
  const { settings, updateSetting } = useSettings();

  const reduceMotionState = settings.reduceMotion; // null | true | false

  const videoOptions = devices?.video ?? [];
  const audioOptions = devices?.audio ?? [];

  return (
    <ModalBase maxWidth="max-w-lg" onClose={onClose}>
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(186,158,255,0.15)' }}>
            <span className="material-symbols-outlined text-primary" aria-hidden="true">settings</span>
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

      <div className="px-6 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
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

      <footer className="px-6 py-4 border-t border-white/5 flex justify-end">
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
