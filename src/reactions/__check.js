#!/usr/bin/env node
// Camera-reaction logic assertions. Plain node, zero dependencies, non-zero
// exit on failure:
//   npm test
//
// Covers the two pure modules that decide what gets sent to a stranger:
// classify.js (one frame → label) and trigger.js (labels over time → send).
// Frame fixtures stand in for MediaPipe; clocks are synthetic.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { classifyGesture, classifyFace, GESTURE_ALLOWLIST } from './classify.js';
import { createTrigger } from './trigger.js';
import { REACTION_LABELS, isReactionLabel, isSafeGifUrl } from './labels.js';

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed += 1;
  } catch (err) {
    console.error(`\n  ✗ ${name}\n    ${err.message}\n`);
    process.exitCode = 1;
  }
};

// ── fixtures ─────────────────────────────────────────────────────────────
const hand = (categoryName, score) => [[{ categoryName, score }]];
const face = (scores) => Object.entries(scores).map(([categoryName, score]) => ({ categoryName, score }));
const smile = (v) => ({ mouthSmileLeft: v, mouthSmileRight: v });
const eyeWide = (v) => ({ eyeWideLeft: v, eyeWideRight: v });

// Feed [t, channel, candidate] steps; collect [t, label] for every fire.
const run = (trigger, steps) => {
  const fires = [];
  for (const [t, channel, candidate] of steps) {
    const r = trigger.observe({ channel, candidate }, t);
    if (r) fires.push([t, r]);
  }
  return fires;
};
const frames = (channel, candidate, from, to, step = 250) => {
  const out = [];
  for (let t = from; t <= to; t += step) out.push([t, channel, candidate]);
  return out;
};
const byTime = (...lists) => lists.flat().sort((a, b) => a[0] - b[0]);

// ── labels ───────────────────────────────────────────────────────────────
test('labels: prototype keys are not labels', () => {
  for (const l of Object.keys(REACTION_LABELS)) assert.ok(isReactionLabel(l));
  for (const bad of ['__proto__', 'constructor', 'toString', '', 42, null, undefined]) {
    assert.equal(isReactionLabel(bad), false, `accepted ${String(bad)}`);
  }
});

test('labels: match the server catalog exactly', () => {
  const here = fileURLToPath(import.meta.url);
  const serverCatalog = new URL('../../../nocturne-backend/server/reactions/catalog.js', import.meta.url);
  if (!existsSync(serverCatalog)) {
    console.warn('  (skipped: backend catalog not found next to the frontend)');
    return;
  }
  const { LABELS } = createRequire(here)(fileURLToPath(serverCatalog));
  assert.deepEqual([...Object.keys(REACTION_LABELS)].sort(), [...LABELS].sort());
});

test('labels: only https giphy.com URLs are safe to render', () => {
  assert.ok(isSafeGifUrl('https://media1.giphy.com/media/x/200w.webp'));
  assert.ok(isSafeGifUrl('https://giphy.com/x'));
  for (const bad of [
    'http://media1.giphy.com/x.webp',
    'https://giphy.com.evil.example/x',
    'https://evil.example/?giphy.com',
    'javascript:alert(1)',
    'data:image/gif;base64,AAAA',
    '',
    null,
  ]) {
    assert.equal(isSafeGifUrl(bad), false, `accepted ${bad}`);
  }
});

// ── classifyGesture ──────────────────────────────────────────────────────
test('gesture: each mapped gesture yields its label', () => {
  const cases = [
    ['Thumb_Up', 'thumbs_up'],
    ['Thumb_Down', 'thumbs_down'],
    ['Victory', 'peace'],
    ['ILoveYou', 'love'],
    ['Open_Palm', 'wave'],
  ];
  for (const [cat, label] of cases) {
    assert.equal(classifyGesture(hand(cat, 0.95))?.label, label, cat);
    assert.ok(isReactionLabel(label));
  }
});

test('gesture: below-threshold scores are ignored, and the palm needs more', () => {
  assert.equal(classifyGesture(hand('Thumb_Up', 0.59)), null);
  assert.equal(classifyGesture(hand('Thumb_Up', 0.6))?.label, 'thumbs_up');
  // MediaPipe's reference thumbs-up photo scores in this band
  assert.equal(classifyGesture(hand('Thumb_Up', 0.69))?.label, 'thumbs_up');
  assert.equal(classifyGesture(hand('Open_Palm', 0.79)), null);
  assert.equal(classifyGesture(hand('Open_Palm', 0.8))?.label, 'wave');
});

test('gesture: None, fist and pointing never map', () => {
  for (const cat of ['None', 'Closed_Fist', 'Pointing_Up']) {
    assert.equal(classifyGesture(hand(cat, 0.99)), null, cat);
  }
});

test('gesture: malformed input returns null', () => {
  for (const bad of [null, undefined, 'x', [], [[]], [null], [['x']], hand('constructor', 1), hand('Thumb_Up', '0.9'), hand('Thumb_Up', NaN)]) {
    assert.equal(classifyGesture(bad), null, JSON.stringify(bad));
  }
});

test('gesture: with two hands, the strongest mapped one wins', () => {
  const two = [[{ categoryName: 'Victory', score: 0.65 }], [{ categoryName: 'Thumb_Up', score: 0.9 }]];
  assert.equal(classifyGesture(two).label, 'thumbs_up');
});

test('gesture: the allowlist asks for None plus every mapped gesture', () => {
  assert.deepEqual(GESTURE_ALLOWLIST, ['None', 'Thumb_Up', 'Thumb_Down', 'Victory', 'ILoveYou', 'Open_Palm']);
});

// ── classifyFace ─────────────────────────────────────────────────────────
test('face: a big open-mouthed smile is a laugh', () => {
  assert.equal(classifyFace(face({ ...smile(0.7), jawOpen: 0.4 }))?.label, 'laugh');
});

test('face: a plain closed-mouth smile is NOT a reaction', () => {
  assert.equal(classifyFace(face({ ...smile(0.9), jawOpen: 0.1 })), null);
});

test('face: talking (jaw open, nothing else) is NOT a reaction', () => {
  assert.equal(classifyFace(face({ jawOpen: 0.6, ...smile(0.1) })), null);
  assert.equal(classifyFace(face({ jawOpen: 0.6, browInnerUp: 0.6, ...smile(0.1) })), null, 'needs wide eyes too');
});

test('face: jaw + raised brows + wide eyes without a smile is surprise', () => {
  assert.equal(classifyFace(face({ jawOpen: 0.6, browInnerUp: 0.6, ...eyeWide(0.4), ...smile(0.1) }))?.label, 'surprise');
});

test('face: laugh wins over surprise when the mouth is smiling', () => {
  assert.equal(classifyFace(face({ jawOpen: 0.6, browInnerUp: 0.6, ...eyeWide(0.4), ...smile(0.7) }))?.label, 'laugh');
  // smiling too much for surprise, not enough for laugh → nothing
  assert.equal(classifyFace(face({ jawOpen: 0.6, browInnerUp: 0.6, ...eyeWide(0.4), ...smile(0.45) })), null);
});

test('face: one eye closed and the other open is a wink; a blink is not', () => {
  assert.equal(classifyFace(face({ eyeBlinkLeft: 0.8, eyeBlinkRight: 0.1 }))?.label, 'wink');
  assert.equal(classifyFace(face({ eyeBlinkLeft: 0.05, eyeBlinkRight: 0.7 }))?.label, 'wink');
  assert.equal(classifyFace(face({ eyeBlinkLeft: 0.9, eyeBlinkRight: 0.9 })), null, 'blink');
  assert.equal(classifyFace(face({ eyeBlinkLeft: 0.8, eyeBlinkRight: 0.3 })), null, 'half-closed other eye');
});

test('face: malformed input returns null', () => {
  for (const bad of [null, undefined, [], 'x', [null], [{ categoryName: 'jawOpen', score: 'big' }], face({ constructor: 1 })]) {
    assert.equal(classifyFace(bad), null, JSON.stringify(bad));
  }
});

// ── trigger ──────────────────────────────────────────────────────────────
test('trigger: a single frame never fires', () => {
  assert.deepEqual(run(createTrigger(), [[0, 'hand', 'thumbs_up']]), []);
});

test('trigger: a hold fires exactly once, however long it lasts', () => {
  assert.deepEqual(run(createTrigger(), frames('hand', 'thumbs_up', 0, 20000)), [[500, 'thumbs_up']]);
});

test('trigger: works at the slow-device frame rate too', () => {
  assert.deepEqual(run(createTrigger(), frames('hand', 'thumbs_up', 0, 3000, 500)), [[500, 'thumbs_up']]);
});

test('trigger: re-firing the same label needs a return to neutral', () => {
  const noCooldown = { globalCooldownMs: 0, labelCooldownMs: 0 };
  const steps = [
    ...frames('hand', 'thumbs_up', 0, 1000),
    [1250, 'hand', null],
    [1500, 'hand', null],
    ...frames('hand', 'thumbs_up', 1750, 3000),
  ];
  assert.deepEqual(run(createTrigger(noCooldown), steps), [[500, 'thumbs_up'], [2250, 'thumbs_up']]);
});

test('trigger: one dropped frame keeps the hold; two restart it', () => {
  const oneMiss = [[0, 'hand', 'peace'], [250, 'hand', 'peace'], [500, 'hand', null], [750, 'hand', 'peace'], [1000, 'hand', 'peace']];
  assert.deepEqual(run(createTrigger(), oneMiss), [[750, 'peace']]);
  const twoMisses = [
    [0, 'hand', 'peace'], [250, 'hand', 'peace'], [500, 'hand', null], [750, 'hand', null],
    ...frames('hand', 'peace', 1000, 2000),
  ];
  assert.deepEqual(run(createTrigger(), twoMisses), [[1500, 'peace']]);
});

test('trigger: flickering between two labels never fires', () => {
  const steps = [];
  for (let t = 0; t <= 5000; t += 250) steps.push([t, 'hand', (t / 250) % 2 ? 'peace' : 'thumbs_up']);
  assert.deepEqual(run(createTrigger(), steps), []);
});

test('trigger: the global cooldown spaces out different labels', () => {
  const steps = [
    ...frames('hand', 'thumbs_up', 0, 750),
    [1000, 'hand', null],
    [1250, 'hand', null],
    ...frames('hand', 'peace', 1500, 4500),
  ];
  assert.deepEqual(run(createTrigger(), steps), [[500, 'thumbs_up'], [3500, 'peace']]);
});

test('trigger: the per-label cooldown holds back a repeat of the same label', () => {
  const steps = [
    ...frames('hand', 'thumbs_up', 0, 750),
    ...frames('hand', null, 1000, 1500),
    ...frames('hand', 'thumbs_up', 1750, 12000),
  ];
  assert.deepEqual(run(createTrigger(), steps), [[500, 'thumbs_up'], [10500, 'thumbs_up']]);
});

test('trigger: a held hand gesture suppresses the face channel', () => {
  const steps = byTime(
    frames('hand', 'thumbs_up', 0, 3000),
    frames('hand', null, 3250, 5000),
    frames('face', 'laugh', 125, 5000),
  );
  // The laugh clears its own hold early on, but the thumbs up is still up.
  // Once the hand drops (reset at 3500) and the global cooldown from the
  // thumbs up expires, the laugh lands on the next face frame.
  assert.deepEqual(run(createTrigger(), steps), [[500, 'thumbs_up'], [3625, 'laugh']]);
});

test('trigger: the face channel fires on its own with a longer hold', () => {
  assert.deepEqual(run(createTrigger(), frames('face', 'laugh', 0, 3000)), [[750, 'laugh']]);
});

test('trigger: a wink needs only a short hold, a one-frame blip never fires', () => {
  assert.deepEqual(run(createTrigger(), frames('face', 'wink', 0, 1000)), [[500, 'wink']]);
  assert.deepEqual(run(createTrigger(), [[0, 'face', 'wink'], [250, 'face', null], [500, 'face', null]]), []);
});

test('trigger: a pause longer than staleMs drops a half-built hold', () => {
  // Two samples, short of the hold, then a gap well past staleMs. Without
  // the stale reset the old hold would complete on the first frame back.
  const steps = [
    ...frames('hand', 'thumbs_up', 0, 250),
    ...frames('hand', 'thumbs_up', 2000, 3500),
  ];
  assert.deepEqual(run(createTrigger(), steps), [[2500, 'thumbs_up']]);
});

test('trigger: reset() forgets holds, fired labels and cooldowns', () => {
  const t = createTrigger();
  assert.deepEqual(run(t, frames('hand', 'thumbs_up', 0, 750)), [[500, 'thumbs_up']]);
  t.reset();
  assert.deepEqual(run(t, frames('hand', 'thumbs_up', 1000, 1750)), [[1500, 'thumbs_up']]);
});

test('trigger: unknown channels and non-string candidates are ignored', () => {
  const t = createTrigger();
  assert.equal(t.observe({ channel: 'toString', candidate: 'wave' }, 0), null);
  assert.equal(t.observe({ channel: '__proto__', candidate: 'wave' }, 0), null);
  const steps = frames('hand', 42, 0, 2000);
  assert.deepEqual(run(t, steps), []);
});

if (process.exitCode) console.error(`reactions: FAILED (${passed} passed)`);
else console.log(`reactions: ${passed} checks passed`);
