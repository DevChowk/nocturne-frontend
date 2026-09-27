import { useEffect, useRef, useState } from 'react';
import { classifyFace, classifyGesture } from '../reactions/classify.js';
import { createTrigger } from '../reactions/trigger.js';

// On-device gesture + expression detection for camera reactions. While
// enabled, samples the user's OWN camera from the self-view <video> and calls
// `onDetect(label)` when trigger.js decides a reaction should be sent.
// Frames never leave the device — only the label does, via onDetect.
//
// Reads the self-view element rather than subscribing to useLocalMedia's
// track-swap callback: that callback only fires on the camera toggle, while
// the self-view already follows every swap (toggle, device change, mobile
// re-acquire). The mirror is a CSS transform, so MediaPipe sees real frames.
//
// Same posture as useNsfwScanner: lazy model, throttled loop, fail-open.
//
// Cost control, since inference runs on the main thread next to the call UI:
//  - hands are sampled twice as often as faces: a gesture is deliberate and
//    its latency is what users feel, while an expression can wait a beat
//  - the gap after each inference is at least BUDGET_RATIO x its average
//    cost, so detection never takes more than ~20% of the main thread. A
//    ratio of 3 measurably starved a 2-core laptop during a call: frames
//    slowed until the STOP_MS guard below shut detection off mid-call
//  - a face model averaging over FACE_DROP_MS is dropped for the call; a hand
//    model averaging over STOP_MS (a visible freeze every frame) or repeated
//    inference errors stop detection for the call and report 'error'
//  - skipped entirely while the tab is hidden or the camera track isn't live
//  - never runs at all under the browser's Save-Data hint

const BASE_TICK_MS = 80;
const BUDGET_RATIO = 4;
// Hand samples per face sample. Raising this shortens the gesture-to-GIF lag
// without spending more CPU.
const HANDS_PER_FACE = 2;
const FACE_DROP_MS = 100;
const STOP_MS = 150;
const MAX_CONSECUTIVE_ERRORS = 5;
// The first inferences include model warm-up (and shader compilation on the
// GPU delegate) and can take 200ms-4s; counting them would trip every limit.
const WARMUP_SAMPLES = 3;

// Deferred so the MediaPipe wrapper (and its ?url imports) only enters the
// module graph when a detector actually runs.
const getVision = () => import('../reactions/vision.js').then((m) => m.getVision());

const saveDataOn = () => typeof navigator !== 'undefined' && navigator.connection?.saveData === true;

const baseTickForDevice = () => {
  if (typeof navigator === 'undefined') return BASE_TICK_MS;
  const lowCores = (navigator.hardwareConcurrency || 4) < 4;
  const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory < 4;
  return lowCores || lowMemory ? BASE_TICK_MS * 2 : BASE_TICK_MS;
};

// A decoded frame from a live, enabled camera track. After camera-off the
// element can keep showing its last frame with readyState >= 2, so the track
// itself is the source of truth.
const hasLiveFrame = (video) => {
  if (!video || video.readyState < 2) return false;
  const track = video.srcObject?.getVideoTracks?.()[0];
  return !!track && track.readyState === 'live' && track.enabled && !track.muted;
};

// status: 'off' | 'loading' | 'ready' | 'error' | 'unsupported'
export function useReactionDetector({ videoRef, enabled, onDetect }) {
  // Only ever set from async callbacks; 'idle' reads as 'loading' while enabled.
  const [loadState, setLoadState] = useState('idle');
  const onDetectRef = useRef(onDetect);
  useEffect(() => { onDetectRef.current = onDetect; }, [onDetect]);

  const unsupported = saveDataOn();

  useEffect(() => {
    if (!enabled || unsupported) return undefined;

    let cancelled = false;
    let timer = null;
    const trigger = createTrigger();
    const baseTick = baseTickForDevice();
    const cost = { hand: { avg: 0, n: 0 }, face: { avg: 0, n: 0 } };
    let faceOn = true;
    let lastChannel = 'face';
    let handsSinceFace = 0;
    let errors = 0;

    const stop = (reason) => {
      console.warn(`[reactions] detection stopped for this call: ${reason}`);
      setLoadState('error');
    };

    const record = (channel, ms) => {
      const c = cost[channel];
      c.n += 1;
      if (c.n <= WARMUP_SAMPLES) return;
      c.avg = c.avg ? c.avg * 0.8 + ms * 0.2 : ms;
      if (channel === 'face' && faceOn && c.avg > FACE_DROP_MS) {
        faceOn = false;
        console.warn(`[reactions] face model averaging ${Math.round(c.avg)}ms, hands only for this call`);
      }
    };

    // Returns false when the loop should end.
    const step = (vision) => {
      const video = videoRef.current;
      if (document.hidden || !hasLiveFrame(video)) return true;
      const channel = faceOn && handsSinceFace >= HANDS_PER_FACE ? 'face' : 'hand';
      handsSinceFace = channel === 'hand' ? handsSinceFace + 1 : 0;
      lastChannel = channel;
      try {
        const t0 = performance.now();
        const candidate = channel === 'hand'
          ? classifyGesture(vision.hands(video))?.label ?? null
          : classifyFace(vision.face(video))?.label ?? null;
        const now = performance.now();
        errors = 0;
        record(channel, now - t0);
        const label = trigger.observe({ channel, candidate }, now);
        if (label) onDetectRef.current?.(label);
      } catch (err) {
        // One odd frame mid-resize is survivable. A broken WebGL context
        // throws on every frame — don't spin on it.
        errors += 1;
        if (errors >= MAX_CONSECUTIVE_ERRORS) {
          stop(`inference keeps failing (${err.message})`);
          return false;
        }
        return true;
      }
      if (cost.hand.avg > STOP_MS) {
        stop(`hand model averaging ${Math.round(cost.hand.avg)}ms per frame`);
        return false;
      }
      return true;
    };

    const tick = (vision) => {
      if (cancelled) return;
      if (!step(vision)) return;
      const last = cost[lastChannel].avg;
      timer = setTimeout(() => tick(vision), Math.max(baseTick, last * BUDGET_RATIO));
    };

    getVision()
      .then((vision) => {
        if (cancelled) return;
        setLoadState('ready');
        tick(vision);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[reactions] model load failed (fail-open):', err.message);
        setLoadState('error');
      });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, unsupported, videoRef]);

  let status = 'off';
  if (unsupported) status = 'unsupported';
  else if (enabled) status = loadState === 'idle' ? 'loading' : loadState;
  return { status };
}

export default useReactionDetector;
