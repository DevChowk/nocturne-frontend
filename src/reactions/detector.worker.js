// Camera-reaction detection, off the main thread.
//
// Owns MediaPipe, classify.js and trigger.js, and posts back only a fired
// label. Frames never leave the device and never reach the page as pixels —
// the main thread only learns that "thumbs_up" happened.
//
// Two frame sources, both handled here:
// Frames arrive as ImageBitmaps posted one at a time by the page, already
// downscaled — see frames.js for why that beats a transferred track stream.
//
// Because inference no longer competes with rendering, the loop can run ~3x
// faster than the main-thread version did. It still paces itself: a worker
// that pegs a core would starve WebRTC's encoder on a 2-core laptop.
import { classifyFace, classifyGesture } from './classify.js';
import { createTrigger } from './trigger.js';
import { createVision, preferredDelegate } from './vision.js';

// ~12 samples/sec when frames are cheap.
const TARGET_INTERVAL_MS = 80;
// Idle at least this many times the last inference cost, so a slow device
// backs off instead of pegging its core.
const BUDGET_RATIO = 1.5;
// Hand samples per face sample. Hands still get most of the budget (gesture
// latency is what users feel), but the face pass now also drives the framing
// boxes, so it runs often enough for those to keep up with a person settling
// into frame — about 2-3 box updates a second.
const HANDS_PER_FACE = 2;
const FACE_DROP_MS = 150;

let vision = null;
let trigger = null;
let phase = 'idle'; // 'idle' | 'run' | 'paused' | 'stopped'
let busy = false;
let lastFrameAt = 0;
let handsSinceFace = 0;
let faceOn = true;
const cost = { hand: { avg: 0, n: 0 }, face: { avg: 0, n: 0 } };

const post = (msg) => self.postMessage(msg);

const record = (channel, ms) => {
  const c = cost[channel];
  c.n += 1;
  if (c.n <= 2) return; // warm-up frames are not representative
  c.avg = c.avg ? c.avg * 0.8 + ms * 0.2 : ms;
  if (channel === 'face' && faceOn && c.avg > FACE_DROP_MS) {
    faceOn = false;
    post({ type: 'log', text: `face model averaging ${Math.round(c.avg)}ms, hands only for this call` });
  }
};

// One inference plus the trigger. Returns nothing; fires via postMessage.
// One line per call once the loop has settled, so a slow device is
// diagnosable from a user's console without extra tooling.
let sampleCount = 0;
let firstSampleAt = 0;
const STATS_AFTER = 40;

const reportStats = (now) => {
  sampleCount += 1;
  if (sampleCount === 1) firstSampleAt = now;
  if (sampleCount !== STATS_AFTER) return;
  const perSample = (now - firstSampleAt) / (STATS_AFTER - 1);
  post({
    type: 'log',
    text: `pace: ${Math.round(perSample)}ms/sample, hand ${Math.round(cost.hand.avg)}ms, face ${faceOn ? `${Math.round(cost.face.avg)}ms` : 'off'}`,
  });
};

// Only send boxes when they actually moved — at rest this drops most of the
// messages and, more importantly, most of the React re-renders they cause.
const BOX_EPSILON = 0.01;
let lastBoxes = [];

const boxesChanged = (boxes) => {
  if (boxes.length !== lastBoxes.length) return true;
  return boxes.some((b, i) => {
    const p = lastBoxes[i];
    return Math.abs(b.x - p.x) > BOX_EPSILON || Math.abs(b.y - p.y) > BOX_EPSILON
      || Math.abs(b.w - p.w) > BOX_EPSILON || Math.abs(b.h - p.h) > BOX_EPSILON;
  });
};

const detect = (frame) => {
  const channel = faceOn && handsSinceFace >= HANDS_PER_FACE ? 'face' : 'hand';
  handsSinceFace = channel === 'hand' ? handsSinceFace + 1 : 0;
  const t0 = performance.now();
  let candidate = null;
  if (channel === 'hand') {
    candidate = classifyGesture(vision.hands(frame));
  } else {
    const { categories, boxes } = vision.face(frame);
    candidate = classifyFace(categories);
    if (boxesChanged(boxes)) {
      lastBoxes = boxes;
      post({ type: 'faces', boxes });
    }
  }
  const now = performance.now();
  record(channel, now - t0);
  const label = trigger.observe({ channel, candidate }, now);
  if (label) post({ type: 'reaction', label });
  reportStats(now);
  return now - t0;
};

const handleFrame = (frame) => {
  if (phase !== 'run' || !vision) return;
  // Pace: never sooner than the target, and never more than 1/(1+ratio) of
  // this worker's time on inference.
  const now = performance.now();
  const gap = Math.max(TARGET_INTERVAL_MS, cost.hand.avg * BUDGET_RATIO);
  if (now - lastFrameAt < gap) return;
  lastFrameAt = now;
  try {
    detect(frame);
  } catch (err) {
    post({ type: 'log', text: `inference failed: ${err.message}` });
  }
};

// The page keeps ONE worker for the session and pauses it between the lobby
// and a call, so models load once rather than on every transition —
// re-initialising MediaPipe used to land right when a call started.
//
// `loading` matters as much as the cache: React's dev double-mount sends two
// 'start' messages back to back, and without it both begin loading and the
// worker ends up with two full sets of models, one of them orphaned.
let loading = false;
let wantRun = false;

const load = async () => {
  loading = true;
  const first = preferredDelegate();
  try {
    vision = await createVision(first);
  } catch (err) {
    post({ type: 'log', text: `${first} delegate unavailable (${err.message}), falling back` });
    try {
      vision = await createVision(first === 'GPU' ? 'CPU' : 'GPU');
    } catch (err2) {
      loading = false;
      post({ type: 'status', status: 'error', detail: err2.message });
      return;
    }
  }
  loading = false;
  if (!wantRun) return; // paused again before the models finished
  phase = 'run';
  post({ type: 'status', status: 'ready' });
};

const start = async () => {
  trigger = createTrigger();
  sampleCount = 0;
  lastBoxes = [];
  wantRun = true;
  if (vision) {
    phase = 'run';
    post({ type: 'status', status: 'ready' });
    return;
  }
  if (loading) return; // a load is already in flight; it will flip us to 'run'
  await load();
};

self.onmessage = async (e) => {
  const msg = e.data;
  if (!msg) return;
  if (msg.type === 'start') {
    try {
      await start();
    } catch (err) {
      post({ type: 'status', status: 'error', detail: err.message });
    }
    return;
  }
  if (msg.type === 'pause') {
    wantRun = false;
    if (phase === 'run') phase = 'paused';
    return;
  }
  if (msg.type === 'frame') {
    // Bitmap path: drop the frame if an inference is already running, rather
    // than queueing stale pictures behind it.
    if (busy || phase !== 'run') { msg.bitmap.close(); return; }
    busy = true;
    try {
      handleFrame(msg.bitmap);
    } finally {
      msg.bitmap.close();
      busy = false;
    }
    return;
  }
  if (msg.type === 'stop') {
    phase = 'stopped';
    try { vision?.close(); } catch { /* already closed */ }
    vision = null;
    self.close();
  }
};
