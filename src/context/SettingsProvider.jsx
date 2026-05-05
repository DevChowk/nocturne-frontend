import { useState, useCallback, useEffect } from 'react';
import { SettingsContext, DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './SettingsContext';

function loadStoredSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
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

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}
