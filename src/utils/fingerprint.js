// Cheap browser fingerprint — no third-party SaaS. Combines a localStorage
// UUID (handles same-browser repeat detection) with a hash of the things
// the browser tells us about itself (canvas render, screen geometry, UA,
// timezone, etc.). The server stores (fpHash, uuid, ip) as three separate
// signals; a match on any two = "same person" for ban purposes.
//
// Limitations: motivated abusers can defeat each signal individually
// (incognito clears storage, different browser changes UA + canvas, VPN
// changes IP). The two-of-three policy makes evasion materially harder
// without paying for FingerprintJS.

const UUID_KEY = 'bump.guestUuid';

const ensureUuid = () => {
  try {
    let id = localStorage.getItem(UUID_KEY);
    if (id) return id;
    // crypto.randomUUID is in every shipping browser since 2022.
    id = (crypto.randomUUID && crypto.randomUUID()) ||
      // Fallback for older browsers / non-secure contexts.
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(UUID_KEY, id);
    return id;
  } catch {
    // Private mode / storage blocked — generate ephemeral id. The fp hash
    // still has signal even when the uuid changes per session.
    return `eph-${Math.random().toString(36).slice(2, 12)}`;
  }
};

// Render a fixed off-screen scene; the resulting pixel buffer varies
// subtly with GPU + driver + browser. Hash it down. Wrapped in try so a
// hostile browser (canvas blocked, fingerprint-defense extension) just
// contributes an empty string instead of throwing.
const canvasSignal = () => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 220;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#069';
    ctx.fillRect(0, 0, 220, 30);
    ctx.fillStyle = '#fff';
    ctx.fillText('Bump fp 👋 ✨', 4, 6);
    return canvas.toDataURL();
  } catch { return ''; }
};

// FNV-1a 32-bit. Tiny, deterministic, no deps.
const hash = (str) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};

// Snapshot of stable-enough environment traits. Same browser+OS+device
// usually produces the same string; switching browser or major OS update
// changes it.
const envSignal = () => {
  const n = typeof navigator !== 'undefined' ? navigator : {};
  const s = typeof screen !== 'undefined' ? screen : {};
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* old browser */ }
  return [
    n.userAgent || '',
    n.language || '',
    n.platform || '',
    n.hardwareConcurrency || '',
    n.deviceMemory || '',
    n.maxTouchPoints || '',
    s.width || '',
    s.height || '',
    s.colorDepth || '',
    s.pixelDepth || '',
    new Date().getTimezoneOffset(),
    tz,
  ].join('|');
};

// Public API: returns { uuid, fpHash } the guest auth endpoint expects.
// Both pieces travel together so the server can match on either signal.
export function getDeviceFingerprint() {
  const uuid = ensureUuid();
  const fpHash = hash(envSignal() + '|' + canvasSignal());
  return { uuid, fpHash };
}
