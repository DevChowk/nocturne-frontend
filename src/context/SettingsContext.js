import { createContext } from 'react';

export const SettingsContext = createContext(null);

// Bumped when a stored settings blob needs migrating. v2: Sunbaked (light)
// became the product default, so anyone still carrying the old implicit
// 'system' theme is moved to 'light' once — see SettingsProvider.
export const SETTINGS_VERSION = 2;

export const DEFAULT_SETTINGS = {
  mirrorLocal: true,        // S1
  matchSound: true,         // S2
  reduceMotion: null,       // S3 — null = follow OS preference; true/false = manual override
  videoDeviceId: null,      // S4 — null = system default
  audioDeviceId: null,      // S5 — null = system default
  theme: 'light',           // S6 — 'light' | 'dark' | 'system'
  v: SETTINGS_VERSION,
};

export const SETTINGS_STORAGE_KEY = 'bumpSettings';
