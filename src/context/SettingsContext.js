import { createContext } from 'react';

export const SettingsContext = createContext(null);

export const DEFAULT_SETTINGS = {
  mirrorLocal: true,        // S1
  matchSound: true,         // S2
  reduceMotion: null,       // S3 — null = follow OS preference; true/false = manual override
  videoDeviceId: null,      // S4 — null = system default
  audioDeviceId: null,      // S5 — null = system default
  theme: 'system',          // S6 — 'system' | 'light' | 'dark'
};

export const SETTINGS_STORAGE_KEY = 'bumpSettings';
