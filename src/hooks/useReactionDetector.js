import { useEffect, useRef, useState } from 'react';
import { classifyFace, classifyGesture } from '../reactions/classify.js';
import { createTrigger } from '../reactions/trigger.js';
import { grabBitmap, hasLiveFrame } from '../reactions/frames.js';
// `?worker` so Vite bundles the worker and its imports into one CLASSIC
// script, in dev as well as in build. Both halves matter: MediaPipe loads its
// wasm runtime with importScripts(), which a module worker does not have (it
// fails with "ModuleFactory not set"), and a plain `new Worker(new URL(...))`
// is served unbundled in dev, where the import statements then throw.
import DetectorWorker from '../reactions/detector.worker.js?worker';

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
// TWO PATHS:
//  - Worker (normal): detector.worker.js runs MediaPipe on its own thread and
//    this hook only ships it a small ImageBitmap every ~70ms. Inference no
//    longer competes with rendering, so it samples ~3x faster than before.
//  - Main thread (fallback): the original in-page loop, used when a module
//    worker can't start. Deliberately conservative — it shares the thread
//    with the call UI, so it caps itself at ~20% of it.
//
// Same posture as useNsfwScanner throughout: lazy models, throttled, fail-open.

// Slightly faster than the worker's own target so it never sits idle waiting.
const PUMP_INTERVAL_MS = 70;

// Stable identity so a disabled detector doesn't hand consumers a new array
// on every render.
const EMPTY_BOXES = [];

// ONE worker per session, paused rather than terminated when detection stops.
// Rebuilding it on every lobby/call transition meant re-loading and re-warming
// MediaPipe exactly when a call began. It holds the models (~30MB) until the
// page goes away, which is the same memory the old per-call worker used while
// running. Null again if it ever fails, so the fallback can take over.
let sharedWorker = null;
let workerBroken = false;

// ── main-thread fallback ─────────────────────────────────────────────────
const FALLBACK_TICK_MS = 80;
const FALLBACK_BUDGET_RATIO = 4;
const FALLBACK_HANDS_PER_FACE = 2;
const FALLBACK_FACE_DROP_MS = 100;
const FALLBACK_STOP_MS = 150;
const MAX_CONSECUTIVE_ERRORS = 5;
const WARMUP_SAMPLES = 3;

const saveDataOn = () => typeof navigator !== 'undefined' && navigator.connection?.saveData === true;

const lowPowerDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const lowCores = (navigator.hardwareConcurrency || 4) < 4;
  const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory < 4;
  return lowCores || lowMemory;
};

// Returns a cleanup function.
function runMainThreadLoop({ videoRef, onLabel, onState, onFaces }) {
  let cancelled = false;
  let timer = null;
  const trigger = createTrigger();
  const baseTick = lowPowerDevice() ? FALLBACK_TICK_MS * 2 : FALLBACK_TICK_MS;
  const cost = { hand: { avg: 0, n: 0 }, face: { avg: 0, n: 0 } };
  let faceOn = true;
  let lastChannel = 'face';
  let handsSinceFace = 0;
  let errors = 0;

  const stop = (reason) => {
    console.warn(`[reactions] detection stopped for this call: ${reason}`);
    onState('error');
  };

  const record = (channel, ms) => {
    const c = cost[channel];
    c.n += 1;
    if (c.n <= WARMUP_SAMPLES) return;
    c.avg = c.avg ? c.avg * 0.8 + ms * 0.2 : ms;
    if (channel === 'face' && faceOn && c.avg > FALLBACK_FACE_DROP_MS) {
      faceOn = false;
      console.warn(`[reactions] face model averaging ${Math.round(c.avg)}ms, hands only for this call`);
    }
  };

  const step = (vision) => {
    const video = videoRef.current;
    if (document.hidden || !hasLiveFrame(video)) return true;
    const channel = faceOn && handsSinceFace >= FALLBACK_HANDS_PER_FACE ? 'face' : 'hand';
    handsSinceFace = channel === 'hand' ? handsSinceFace + 1 : 0;
    lastChannel = channel;
    try {
      const t0 = performance.now();
      let candidate = null;
      if (channel === 'hand') {
        candidate = classifyGesture(vision.hands(video));
      } else {
        const { categories, boxes } = vision.face(video);
        candidate = classifyFace(categories);
        onFaces(boxes);
      }
      const now = performance.now();
      errors = 0;
      record(channel, now - t0);
      const label = trigger.observe({ channel, candidate }, now);
      if (label) onLabel(label);
    } catch (err) {
      // One odd frame mid-resize is survivable. A broken WebGL context throws
      // on every frame — don't spin on it.
      errors += 1;
      if (errors >= MAX_CONSECUTIVE_ERRORS) {
        stop(`inference keeps failing (${err.message})`);
        return false;
      }
      return true;
    }
    if (cost.hand.avg > FALLBACK_STOP_MS) {
      stop(`hand model averaging ${Math.round(cost.hand.avg)}ms per frame`);
      return false;
    }
    return true;
  };

  const tick = (vision) => {
    if (cancelled) return;
    if (!step(vision)) return;
    const last = cost[lastChannel].avg;
    timer = setTimeout(() => tick(vision), Math.max(baseTick, last * FALLBACK_BUDGET_RATIO));
  };

  import('../reactions/vision.js')
    .then((m) => m.getVision().then((vision) => ({ vision, warmUp: m.warmUp })))
    .then(({ vision, warmUp }) => {
      if (cancelled) return;
      // Pay MediaPipe's first-inference cost now rather than on the user's
      // first gesture. The worker path doesn't need this — its own first
      // frames do the warming while nothing is waiting on them.
      warmUp(vision, videoRef.current);
      if (cancelled) return;
      onState('ready');
      tick(vision);
    })
    .catch((err) => {
      if (cancelled) return;
      console.warn('[reactions] model load failed (fail-open):', err.message);
      onState('error');
    });

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}

// status: 'off' | 'loading' | 'ready' | 'error' | 'unsupported'
export function useReactionDetector({ videoRef, enabled, onDetect }) {
  // Only ever set from async callbacks; 'idle' reads as 'loading' while enabled.
  const [loadState, setLoadState] = useState('idle');
  // Normalized framing boxes, one per face the camera can see.
  const [faceBoxes, setFaceBoxes] = useState([]);
  const onDetectRef = useRef(onDetect);
  useEffect(() => { onDetectRef.current = onDetect; }, [onDetect]);

  const unsupported = saveDataOn();

  useEffect(() => {
    if (!enabled || unsupported) return undefined;

    let stopped = false;
    let worker = null;
    let pump = null;
    let stopFallback = null;
    let grabbing = false;

    const fire = (label) => onDetectRef.current?.(label);
    const setState = (s) => { if (!stopped) setLoadState(s); };
    const setFaces = (boxes) => { if (!stopped) setFaceBoxes(Array.isArray(boxes) ? boxes : []); };

    const startFallback = (reason) => {
      if (stopped || stopFallback) return;
      console.warn(`[reactions] worker unavailable (${reason}); running on the main thread`);
      stopFallback = runMainThreadLoop({ videoRef, onLabel: fire, onState: setState, onFaces: setFaces });
    };

    // Tear the shared worker down for good — used only on failure.
    const dropWorker = () => {
      const failed = worker;
      worker = null;
      sharedWorker = null;
      workerBroken = true;
      try { failed?.terminate(); } catch { /* already gone */ }
      if (pump) { clearInterval(pump); pump = null; }
    };

    const sendFrame = async () => {
      if (stopped || !worker || grabbing || document.hidden) return;
      grabbing = true;
      try {
        const bitmap = await grabBitmap(videoRef.current);
        if (!bitmap) return;
        if (stopped || !worker) { bitmap.close(); return; }
        worker.postMessage({ type: 'frame', bitmap }, [bitmap]);
      } finally {
        grabbing = false;
      }
    };

    if (!workerBroken) {
      try {
        sharedWorker = sharedWorker || new DetectorWorker();
        worker = sharedWorker;
      } catch (err) {
        workerBroken = true;
        startFallback(err.message);
      }
    } else {
      startFallback('worker failed earlier this session');
    }

    if (worker) {
      worker.onmessage = (e) => {
        const msg = e.data;
        if (!msg || stopped) return;
        if (msg.type === 'reaction') { fire(msg.label); return; }
        if (msg.type === 'faces') { setFaces(msg.boxes); return; }
        if (msg.type === 'log') { console.warn(`[reactions] ${msg.text}`); return; }
        if (msg.type !== 'status') return;
        if (msg.status === 'ready') { setState('ready'); return; }
        // The worker started but could not build the models. Don't strand the
        // user on "Reactions off" — the main thread can still try.
        dropWorker();
        startFallback(msg.detail || 'worker could not load the models');
      };
      worker.onerror = (e) => {
        // A worker that can't start (blocked script, old browser) lands here.
        dropWorker();
        startFallback(e.message || 'worker error');
      };
      worker.postMessage({ type: 'start' });
      pump = setInterval(sendFrame, PUMP_INTERVAL_MS);
    }

    return () => {
      stopped = true;
      setFaceBoxes([]);
      if (pump) clearInterval(pump);
      if (worker) {
        // Pause, don't terminate: the next call reuses the loaded models.
        try { worker.postMessage({ type: 'pause' }); } catch { /* already gone */ }
        worker.onmessage = null;
        worker.onerror = null;
      }
      stopFallback?.();
    };
  }, [enabled, unsupported, videoRef]);

  let status = 'off';
  if (unsupported) status = 'unsupported';
  else if (enabled) status = loadState === 'idle' ? 'loading' : loadState;
  return { status, faceBoxes: enabled ? faceBoxes : EMPTY_BOXES };
}

export default useReactionDetector;
