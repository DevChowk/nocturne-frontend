import { useEffect, useRef } from 'react';

// Inbound NSFW scanner. Every ~2s while enabled, samples the latest frame
// from a remote <video> element and runs NSFW.js (TensorFlow.js MobileNet
// under the hood). If the combined Porn+Hentai+Sexy probability crosses
// the threshold on TWO CONSECUTIVE scans (4s window), `onFlag` fires.
//
// The two-scan debounce suppresses single-frame false positives — bare
// shoulders, close-ups of skin, etc. — without delaying real detection
// for more than ~4s.
//
// Failure modes (network blocking the model download, GPU error, etc.)
// are logged but never throw; the call still works, just without
// protection. This is "fail-open" — preferred over breaking calls when
// the moderation layer has a hiccup.

const SCAN_INTERVAL_MS = 2000;
const NSFW_THRESHOLD = 0.7;
const CONSECUTIVE_FLAGS_TO_TRIGGER = 2;

// On low-power devices (saveData hint or fewer than 4 cores), halve the
// scan rate. Battery and thermal more important than 2s vs 4s detection
// latency on a phone.
const intervalForDevice = () => {
  if (typeof navigator === 'undefined') return SCAN_INTERVAL_MS;
  const conn = navigator.connection;
  const saveData = conn?.saveData === true;
  const lowCores = (navigator.hardwareConcurrency || 4) < 4;
  return saveData || lowCores ? SCAN_INTERVAL_MS * 2 : SCAN_INTERVAL_MS;
};

// One global model load promise — the model is ~5MB so we don't want to
// re-download on every call. tfjs caches it in IndexedDB after first load.
let modelPromise = null;
const getModel = async () => {
  if (!modelPromise) {
    // Dynamic import so the ~3MB JS payload doesn't ship until first call.
    modelPromise = (async () => {
      const nsfwjs = await import('nsfwjs');
      // MobilenetV2 — lighter than the default Inception; ~5MB model.
      return nsfwjs.load();
    })().catch((err) => {
      // Reset so the next attempt can retry. Otherwise a transient network
      // failure permanently disables moderation.
      modelPromise = null;
      throw err;
    });
  }
  return modelPromise;
};

const scoreNSFW = (predictions) =>
  predictions
    .filter((p) => p.className === 'Porn' || p.className === 'Hentai' || p.className === 'Sexy')
    .reduce((sum, p) => sum + p.probability, 0);

export function useNsfwScanner({ videoRef, enabled, onFlag }) {
  const consecutiveFlagsRef = useRef(0);
  const onFlagRef = useRef(onFlag);
  // Track onFlag via a ref so a re-render with a new callback doesn't
  // restart the scanner.
  useEffect(() => { onFlagRef.current = onFlag; }, [onFlag]);

  useEffect(() => {
    if (!enabled || !videoRef?.current) return;

    let cancelled = false;
    let intervalId = null;
    const interval = intervalForDevice();

    const tick = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      // readyState < 2 = no decoded frame yet. Skip — we'll try next tick.
      if (!video || video.readyState < 2) return;

      let model;
      try {
        model = await getModel();
      } catch (err) {
        console.warn('[nsfw] model load failed (fail-open):', err.message);
        return;
      }
      if (cancelled) return;

      try {
        const predictions = await model.classify(video);
        if (cancelled) return;
        const score = scoreNSFW(predictions);
        if (score > NSFW_THRESHOLD) {
          consecutiveFlagsRef.current += 1;
          if (consecutiveFlagsRef.current >= CONSECUTIVE_FLAGS_TO_TRIGGER) {
            consecutiveFlagsRef.current = 0;
            onFlagRef.current?.({ score, predictions });
          }
        } else {
          consecutiveFlagsRef.current = 0;
        }
      } catch (err) {
        // tfjs occasionally throws on small/odd frames; one bad scan
        // shouldn't kill the loop.
        console.warn('[nsfw] scan failed:', err.message);
      }
    };

    // Reset debounce when (re-)mounting.
    consecutiveFlagsRef.current = 0;
    // Kick off the first scan after a small delay so the video has time
    // to start playing (otherwise the very first scan tends to fail with
    // readyState < 2).
    const startTimer = setTimeout(tick, 1000);
    intervalId = setInterval(tick, interval);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (intervalId) clearInterval(intervalId);
      consecutiveFlagsRef.current = 0;
    };
  }, [enabled, videoRef]);
}
