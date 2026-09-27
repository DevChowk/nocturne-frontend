// Turn one frame of MediaPipe output into at most one reaction label.
//
// Pure: plain objects in, `{ label, score } | null` out, no MediaPipe import,
// so src/reactions/__check.js can drive it under Node with fixtures. Whether a
// label actually FIRES is trigger.js's job — this only answers "what does this
// single frame look like?".
//
// The face thresholds are starting points, not tuned values. Blendshapes are
// noisy and faces move involuntarily (talking opens the jaw, blinks look like
// winks), so every rule is deliberately conservative: a missed reaction costs
// nothing, a false one sends a GIF to a stranger.

// Gesture Recognizer canned categories → our labels. Closed_Fist and
// Pointing_Up are left out on purpose: both fire constantly while people talk
// with their hands. Open_Palm gets a higher bar for the same reason.
//
// 0.6, not higher: MediaPipe's own reference thumb_up.jpg scores 0.69-0.72
// through this model, so a 0.7 bar flickers on a textbook thumbs up. The
// hold in trigger.js, not this score, is what filters out passing shapes.
const GESTURES = new Map([
  ['Thumb_Up',   { label: 'thumbs_up',   min: 0.6 }],
  ['Thumb_Down', { label: 'thumbs_down', min: 0.6 }],
  ['Victory',    { label: 'peace',       min: 0.6 }],
  ['ILoveYou',   { label: 'love',        min: 0.6 }],
  ['Open_Palm',  { label: 'wave',        min: 0.8 }],
]);

// The canned categories the recognizer is asked for. 'None' is included so
// the model can say "no gesture" instead of forcing its best guess.
export const GESTURE_ALLOWLIST = ['None', ...GESTURES.keys()];

export const FACE_THRESHOLDS = Object.freeze({
  laughSmile: 0.6,       // avg mouthSmileLeft/Right
  laughJaw: 0.35,        // jawOpen — a laugh, not a closed-mouth smile
  surpriseJaw: 0.5,
  surpriseBrow: 0.5,     // browInnerUp
  surpriseEyeWide: 0.3,  // avg eyeWideLeft/Right
  surpriseMaxSmile: 0.3, // a wide-open smiling mouth is a laugh
  winkClosed: 0.6,       // the winking eye's eyeBlink
  winkOpen: 0.2,         // the OTHER eye must stay open — a blink closes both
});

const isScore = (v) => typeof v === 'number' && Number.isFinite(v);

// `gestures` is GestureRecognizerResult.gestures: one array of categories per
// detected hand, best first. With several hands, the strongest mapped one wins.
export function classifyGesture(gestures) {
  if (!Array.isArray(gestures)) return null;
  let best = null;
  for (const hand of gestures) {
    const top = Array.isArray(hand) ? hand[0] : null;
    if (!top || typeof top.categoryName !== 'string' || !isScore(top.score)) continue;
    const rule = GESTURES.get(top.categoryName);
    if (!rule || top.score < rule.min) continue;
    if (!best || top.score > best.score) best = { label: rule.label, score: top.score };
  }
  return best;
}

// `categories` is FaceLandmarkerResult.faceBlendshapes[0].categories — the 52
// named blendshape scores for the first face.
export function classifyFace(categories, t = FACE_THRESHOLDS) {
  if (!Array.isArray(categories) || categories.length === 0) return null;
  const s = new Map();
  for (const c of categories) {
    if (c && typeof c.categoryName === 'string' && isScore(c.score)) s.set(c.categoryName, c.score);
  }
  const get = (name) => s.get(name) ?? 0;
  const smile = (get('mouthSmileLeft') + get('mouthSmileRight')) / 2;
  const jaw = get('jawOpen');

  if (smile >= t.laughSmile && jaw >= t.laughJaw) return { label: 'laugh', score: smile };

  const eyeWide = (get('eyeWideLeft') + get('eyeWideRight')) / 2;
  if (
    jaw >= t.surpriseJaw &&
    get('browInnerUp') >= t.surpriseBrow &&
    eyeWide >= t.surpriseEyeWide &&
    smile < t.surpriseMaxSmile
  ) {
    return { label: 'surprise', score: jaw };
  }

  const blinkL = get('eyeBlinkLeft');
  const blinkR = get('eyeBlinkRight');
  const closed = Math.max(blinkL, blinkR);
  const open = Math.min(blinkL, blinkR);
  if (closed >= t.winkClosed && open <= t.winkOpen) return { label: 'wink', score: closed };

  return null;
}
