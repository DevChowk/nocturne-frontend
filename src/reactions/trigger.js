// Decides when a per-frame label (classify.js) becomes a reaction that is
// actually SENT. Reactions are fully automatic, so this state machine is the
// only thing standing between a user's face and a GIF on a stranger's screen.
// The rules, in order:
//
//  1. Fast path — a HAND candidate scoring at or above `fastScore` fires on
//     its first frame. A clear thumbs up is unambiguous, and waiting for a
//     second frame was the main source of missed gestures.
//  2. Hold — anything weaker must be seen for `holdMs` (face: `faceHoldMs`,
//     wink: shorter) across at least `minHits` frames. One frame never fires.
//  3. Up to `maxMisses` dropped frames are tolerated mid-hold; more than that
//     ends it. A different label restarts it.
//  4. Fire once per hold. The label that fired can't fire again until it has
//     been gone for `neutralFrames` frames AND `neutralMs` — so holding one
//     gesture sends one GIF, however long you hold it.
//  5. Hands outrank face: while a hand gesture is being held, the face channel
//     can't fire (people smile while giving a thumbs up).
//  6. Cooldowns — `globalCooldownMs` between any two reactions,
//     `labelCooldownMs` between two of the same label.
//  7. A channel not observed for `staleMs` (tab hidden, camera off, model
//     paused) drops its hold, so an old half-hold can't complete later.
//
// Pure, no imports: src/reactions/__check.js drives it with synthetic clocks.

export const TRIGGER_DEFAULTS = Object.freeze({
  // Tuned for the worker's ~10-12 samples/sec. A clear gesture fires on frame
  // one; everything else still needs sustained evidence.
  fastScore: 0.85,
  holdMs: 250,
  faceHoldMs: 400,
  labelHoldMs: Object.freeze({ wink: 250 }), // a deliberate wink is short; a blink is ~150ms on both eyes
  minHits: 2,
  maxMisses: 2,
  neutralFrames: 2,
  neutralMs: 350,
  globalCooldownMs: 1500,
  labelCooldownMs: 4000,
  staleMs: 1500,
});

const freshChannel = () => ({
  label: null,
  since: 0,
  hits: 0,
  misses: 0,
  lastObservedAt: -Infinity,
  firedLabel: null,
  firedLastSeen: 0,
  firedGoneFrames: 0,
});

// Accepts `{ label, score }` (what classify.js returns), a bare label string,
// or null/undefined for "nothing this frame".
const readCandidate = (candidate) => {
  if (typeof candidate === 'string') return { label: candidate, score: 0 };
  if (candidate && typeof candidate.label === 'string') {
    return { label: candidate.label, score: typeof candidate.score === 'number' ? candidate.score : 0 };
  }
  return { label: null, score: 0 };
};

export function createTrigger(options = {}) {
  const o = { ...TRIGGER_DEFAULTS, ...options };
  let channels;
  let lastFireAt;
  let labelFiredAt;

  const reset = () => {
    channels = { hand: freshChannel(), face: freshChannel() };
    lastFireAt = -Infinity;
    labelFiredAt = new Map();
  };
  reset();

  const holdFor = (channel, label) =>
    Object.hasOwn(o.labelHoldMs, label) ? o.labelHoldMs[label]
      : channel === 'face' ? o.faceHoldMs : o.holdMs;

  const handActive = (now) => {
    const h = channels.hand;
    return h.label !== null && now - h.lastObservedAt <= o.staleMs;
  };

  // Returns the label to send, or null.
  const observe = ({ channel, candidate }, now) => {
    const ch = channel === 'hand' || channel === 'face' ? channels[channel] : null;
    if (!ch) return null;
    const { label, score } = readCandidate(candidate);

    if (now - ch.lastObservedAt > o.staleMs) {
      ch.label = null;
      ch.hits = 0;
      ch.misses = 0;
    }
    ch.lastObservedAt = now;

    if (ch.firedLabel !== null) {
      if (label === ch.firedLabel) {
        ch.firedLastSeen = now;
        ch.firedGoneFrames = 0;
      } else {
        ch.firedGoneFrames += 1;
        if (ch.firedGoneFrames >= o.neutralFrames && now - ch.firedLastSeen >= o.neutralMs) {
          ch.firedLabel = null;
        }
      }
    }

    if (label === null) {
      if (ch.label !== null) {
        ch.misses += 1;
        if (ch.misses > o.maxMisses) {
          ch.label = null;
          ch.hits = 0;
          ch.misses = 0;
        }
      }
      return null;
    }

    if (label === ch.label) {
      ch.hits += 1;
      ch.misses = 0;
    } else {
      ch.label = label;
      ch.since = now;
      ch.hits = 1;
      ch.misses = 0;
    }

    if (label === ch.firedLabel) return null;

    // Rule 1: an unmistakable hand gesture doesn't wait for a second frame.
    const strong = channel === 'hand' && score >= o.fastScore;
    if (!strong && (ch.hits < o.minHits || now - ch.since < holdFor(channel, label))) return null;

    if (channel === 'face' && handActive(now)) return null;
    if (now - lastFireAt < o.globalCooldownMs) return null;
    if (now - (labelFiredAt.get(label) ?? -Infinity) < o.labelCooldownMs) return null;

    lastFireAt = now;
    labelFiredAt.set(label, now);
    ch.firedLabel = label;
    ch.firedLastSeen = now;
    ch.firedGoneFrames = 0;
    return label;
  };

  return { observe, reset };
}
