// Decides when a per-frame label (classify.js) becomes a reaction that is
// actually SENT. Reactions are fully automatic, so this state machine is the
// only thing standing between a user's face and a GIF on a stranger's screen.
// The rules, in order:
//
//  1. Hold — a label must be seen for `holdMs` (face: `faceHoldMs`, wink:
//     shorter) across at least `minHits` frames. One frame never fires.
//  2. One dropped frame is tolerated; `maxMisses + 1` in a row ends the hold.
//     A different label restarts it.
//  3. Fire once per hold. The label that fired can't fire again until it has
//     been gone for `neutralFrames` frames AND `neutralMs` — so smiling
//     through a whole call sends one GIF, not one every cooldown.
//  4. Hands outrank face: while a hand gesture is being held, the face channel
//     can't fire (people smile while giving a thumbs up).
//  5. Cooldowns — `globalCooldownMs` between any two reactions,
//     `labelCooldownMs` between two of the same label.
//  6. A channel not observed for `staleMs` (tab hidden, camera off, model
//     paused) drops its hold, so an old half-hold can't complete later.
//
// Pure, no imports: src/reactions/__check.js drives it with synthetic clocks.

export const TRIGGER_DEFAULTS = Object.freeze({
  holdMs: 450,
  faceHoldMs: 600,
  labelHoldMs: Object.freeze({ wink: 350 }), // a deliberate wink is short; a blink is ~150ms on both eyes
  minHits: 2,
  maxMisses: 1,
  neutralFrames: 2,
  neutralMs: 500,
  globalCooldownMs: 3000,
  labelCooldownMs: 10000,
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

  // `candidate` is a label string, or null for "nothing this frame".
  // Returns the label to send, or null.
  const observe = ({ channel, candidate }, now) => {
    const ch = channel === 'hand' || channel === 'face' ? channels[channel] : null;
    if (!ch) return null;
    const label = typeof candidate === 'string' ? candidate : null;

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
    if (ch.hits < o.minHits || now - ch.since < holdFor(channel, label)) return null;
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
