import { useState, useCallback, useEffect } from 'react';
import { SettingsContext, DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './SettingsContext';

// Pre-rename key. Read once on first load so users who set preferences
// before the Bump rename don't lose their mirror toggle, match sound, or
// saved device IDs. Safe to remove this fallback after a few months.
const LEGACY_STORAGE_KEY = 'nocturneSettings';

function loadStoredSettings() {
  try {
    let raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        raw = legacy;
        localStorage.setItem(SETTINGS_STORAGE_KEY, legacy);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadStoredSettings);

  // Persist to localStorage on every change.
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore (private mode / quota)
    }
  }, [settings]);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Theme wiring: stamp `data-theme="light"` / `data-theme="dark"` on
  // <html> when the user picks a specific mode, and REMOVE the attribute
  // when they pick "system" so the `prefers-color-scheme` media query in
  // index.css takes over. Also toggles Tailwind's `.dark` class since
  // tailwind.config.js has `darkMode: 'class'` — any `dark:*` utility
  // that survives from before will keep working. Runs once on mount and
  // again whenever the theme setting changes.
  useEffect(() => {
    const html = document.documentElement;
    const applyTheme = () => {
      const t = settings.theme;
      if (t === 'light') {
        html.setAttribute('data-theme', 'light');
        html.classList.remove('dark');
      } else if (t === 'dark') {
        html.setAttribute('data-theme', 'dark');
        html.classList.add('dark');
      } else {
        html.removeAttribute('data-theme');
        // Follow OS preference for the `.dark` class too.
        const osDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        html.classList.toggle('dark', !!osDark);
      }
    };
    applyTheme();
    // When on "system", react to OS-level theme flips in real time so the
    // .dark class stays synchronized (the CSS media query already does).
    if (settings.theme === 'system' && window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => applyTheme();
      mql.addEventListener?.('change', onChange);
      return () => mql.removeEventListener?.('change', onChange);
    }
  }, [settings.theme]);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}
