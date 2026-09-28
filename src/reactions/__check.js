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
import { boundsFromLandmarks, padBounds, projectBox, isOffscreen } from './faceBox.js';

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

// ── face framing boxes ───────────────────────────────────────────────────
const lm = (...pts) => pts.map(([x, y]) => ({ x, y, z: 0 }));

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

test('faceBox: bounds are the extremes of the landmarks', () => {
  const b = boundsFromLandmarks(lm([0.4, 0.3], [0.6, 0.3], [0.5, 0.7], [0.45, 0.5]));
  near(b.x, 0.4, 'x');
  near(b.y, 0.3, 'y');
  near(b.w, 0.2, 'w');
  near(b.h, 0.4, 'h');
});

test('faceBox: malformed landmarks give no box', () => {
  for (const bad of [null, undefined, [], 'x', [{}], [{ x: 'a', y: 1 }], [{ x: NaN, y: NaN }]]) {
    assert.equal(boundsFromLandmarks(bad), null, JSON.stringify(bad));
  }
});

test('faceBox: padding grows the box but never leaves the frame', () => {
  const padded = padBounds({ x: 0.4, y: 0.3, w: 0.2, h: 0.4 });
  assert.ok(padded.w > 0.2 && padded.h > 0.4);
  const clamped = padBounds({ x: 0.0, y: 0.0, w: 1, h: 1 });
  assert.ok(clamped.x >= 0 && clamped.y >= 0);
  assert.ok(clamped.x + clamped.w <= 1.0001, `right edge ${clamped.x + clamped.w}`);
  assert.ok(clamped.y + clamped.h <= 1.0001, `bottom edge ${clamped.y + clamped.h}`);
});

test('faceBox: with no cropping the box maps straight onto the element', () => {
  const rect = projectBox({ x: 0.25, y: 0.5, w: 0.5, h: 0.25 },
    { videoWidth: 640, videoHeight: 480, clientWidth: 640, clientHeight: 480 });
  assert.deepEqual(rect, { left: 160, top: 240, width: 320, height: 120 });
});

test('faceBox: object-cover cropping is accounted for', () => {
  // 16:9 element showing a 4:3 camera: the video is scaled to cover, so the
  // top and bottom are cropped and a centred box must move up accordingly.
  const size = { videoWidth: 640, videoHeight: 480, clientWidth: 1600, clientHeight: 900 };
  const rect = projectBox({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 }, size);
  // scale = max(1600/640, 900/480) = 2.5 → drawn 1600x1200, 150px cropped top+bottom
  assert.deepEqual(rect, { left: 400, top: 150, width: 800, height: 600 });
  // A box centred in the source stays centred in the element.
  const centred = projectBox({ x: 0.45, y: 0.45, w: 0.1, h: 0.1 }, size);
  assert.ok(Math.abs((centred.left + centred.width / 2) - 800) < 0.001);
  assert.ok(Math.abs((centred.top + centred.height / 2) - 450) < 0.001);
});

test('faceBox: mirroring flips the box to match a mirrored preview', () => {
  const size = { videoWidth: 640, videoHeight: 480, clientWidth: 640, clientHeight: 480 };
  const box = { x: 0.1, y: 0.2, w: 0.2, h: 0.2 };
  const plain = projectBox(box, size);
  const mirrored = projectBox(box, { ...size, mirrored: true });
  assert.equal(mirrored.top, plain.top, 'mirroring must not move the box vertically');
  assert.equal(mirrored.width, plain.width);
  assert.equal(mirrored.left, 640 - (plain.left + plain.width));
  // Mirroring twice is the identity.
  const back = 640 - (mirrored.left + mirrored.width);
  assert.equal(back, plain.left);
});

test('faceBox: missing dimensions produce no rectangle', () => {
  const box = { x: 0.1, y: 0.1, w: 0.2, h: 0.2 };
  assert.equal(projectBox(box, { videoWidth: 0, videoHeight: 480, clientWidth: 640, clientHeight: 480 }), null);
  assert.equal(projectBox(box, { videoWidth: 640, videoHeight: 480, clientWidth: 0, clientHeight: 480 }), null);
  assert.equal(projectBox(null, { videoWidth: 640, videoHeight: 480, clientWidth: 640, clientHeight: 480 }), null);
});

test('faceBox: fully cropped-out boxes are reported offscreen', () => {
  const size = { clientWidth: 640, clientHeight: 480 };
  assert.equal(isOffscreen({ left: 10, top: 10, width: 100, height: 100 }, size), false);
  assert.equal(isOffscreen({ left: -150, top: 10, width: 100, height: 100 }, size), true);
  assert.equal(isOffscreen({ left: 700, top: 10, width: 100, height: 100 }, size), true);
  assert.equal(isOffscreen({ left: 10, top: 600, width: 100, height: 100 }, size), true);
  assert.equal(isOffscreen(null, size), true);
});

// ── trigger ──────────────────────────────────────────────────────────────
// classify.js returns { label, score }; `g` builds one, `weak` stays under
// the fast-path score so those cases exercise the hold instead.
const g = (label, score) => ({ label, score });
const weak = (label) => g(label, 0.7);
const strong = (label) => g(label, 0.9);

test('trigger: a single weak frame never fires', () => {
  assert.deepEqual(run(createTrigger(), [[0, 'hand', weak('thumbs_up')]]), []);
});

test('trigger: one unmistakable hand frame fires immediately', () => {
  assert.deepEqual(run(createTrigger(), [[0, 'hand', strong('thumbs_up')]]), [[0, 'thumbs_up']]);
});

test('trigger: the fast path is hand-only — a strong face frame still holds', () => {
  assert.deepEqual(run(createTrigger(), [[0, 'face', g('laugh', 0.99)]]), []);
  assert.deepEqual(run(createTrigger(), frames('face', g('laugh', 0.99), 0, 2000)), [[500, 'laugh']]);
});

test('trigger: a weak gesture still needs a sustained hold', () => {
  assert.deepEqual(run(createTrigger(), frames('hand', weak('thumbs_up'), 0, 20000)), [[250, 'thumbs_up']]);
});

test('trigger: a strong gesture held on still fires only once', () => {
  assert.deepEqual(run(createTrigger(), frames('hand', strong('thumbs_up'), 0, 20000)), [[0, 'thumbs_up']]);
});

test('trigger: re-firing the same label needs a return to neutral', () => {
  const noCooldown = { globalCooldownMs: 0, labelCooldownMs: 0 };
  const held = frames('hand', strong('peace'), 0, 500);
  // Still held, no neutral in between: one fire only.
  assert.deepEqual(run(createTrigger(noCooldown), held), [[0, 'peace']]);
  const withNeutral = [
    ...held,
    [750, 'hand', null], [1000, 'hand', null], [1250, 'hand', null],
    ...frames('hand', strong('peace'), 1500, 2000),
  ];
  assert.deepEqual(run(createTrigger(noCooldown), withNeutral), [[0, 'peace'], [1500, 'peace']]);
});

test('trigger: two dropped frames keep a hold, three restart it', () => {
  const slowHold = { holdMs: 700 };
  const twoMisses = [
    [0, 'hand', weak('peace')], [250, 'hand', weak('peace')],
    [500, 'hand', null], [750, 'hand', null],
    ...frames('hand', weak('peace'), 1000, 1500),
  ];
  assert.deepEqual(run(createTrigger(slowHold), twoMisses), [[1000, 'peace']]);
  const threeMisses = [
    [0, 'hand', weak('peace')], [250, 'hand', weak('peace')],
    [500, 'hand', null], [750, 'hand', null], [1000, 'hand', null],
    ...frames('hand', weak('peace'), 1250, 2500),
  ];
  assert.deepEqual(run(createTrigger(slowHold), threeMisses), [[2000, 'peace']]);
});

test('trigger: flickering between two labels never fires', () => {
  const steps = [];
  for (let t = 0; t <= 5000; t += 250) steps.push([t, 'hand', weak((t / 250) % 2 ? 'peace' : 'thumbs_up')]);
  assert.deepEqual(run(createTrigger(), steps), []);
});

test('trigger: the global cooldown spaces out different labels', () => {
  const steps = [
    [0, 'hand', strong('thumbs_up')],
    ...frames('hand', strong('peace'), 250, 2000),
  ];
  assert.deepEqual(run(createTrigger(), steps), [[0, 'thumbs_up'], [1500, 'peace']]);
});

test('trigger: the per-label cooldown holds back a repeat of the same label', () => {
  const steps = [
    [0, 'hand', strong('thumbs_up')],
    [250, 'hand', null], [500, 'hand', null], [750, 'hand', null],
    ...frames('hand', strong('thumbs_up'), 1000, 5000),
  ];
  assert.deepEqual(run(createTrigger(), steps), [[0, 'thumbs_up'], [4000, 'thumbs_up']]);
});

test('trigger: a held hand gesture suppresses the face channel', () => {
  const steps = byTime(
    frames('hand', weak('thumbs_up'), 0, 3000),
    frames('hand', null, 3250, 5000),
    frames('face', weak('laugh'), 125, 5000),
  );
  // The laugh clears its own hold early, but the thumbs up owns the channel
  // until the hand has been gone long enough to drop its hold.
  assert.deepEqual(run(createTrigger(), steps), [[250, 'thumbs_up'], [3875, 'laugh']]);
});

test('trigger: the face channel fires on its own with a longer hold', () => {
  assert.deepEqual(run(createTrigger(), frames('face', weak('laugh'), 0, 3000)), [[500, 'laugh']]);
});

test('trigger: a wink needs two frames, a one-frame blip never fires', () => {
  assert.deepEqual(run(createTrigger(), frames('face', weak('wink'), 0, 1000)), [[250, 'wink']]);
  assert.deepEqual(run(createTrigger(), [[0, 'face', weak('wink')], [250, 'face', null], [500, 'face', null]]), []);
});

test('trigger: a pause longer than staleMs drops a half-built hold', () => {
  const steps = [
    ...frames('hand', weak('thumbs_up'), 0, 250),
    ...frames('hand', weak('thumbs_up'), 2000, 3500),
  ];
  // Without the stale reset the old hold would complete on the first frame back.
  assert.deepEqual(run(createTrigger({ holdMs: 700 }), steps), [[2750, 'thumbs_up']]);
});

test('trigger: reset() forgets holds, fired labels and cooldowns', () => {
  const t = createTrigger();
  assert.deepEqual(run(t, [[0, 'hand', strong('thumbs_up')]]), [[0, 'thumbs_up']]);
  t.reset();
  assert.deepEqual(run(t, [[250, 'hand', strong('thumbs_up')]]), [[250, 'thumbs_up']]);
});

test('trigger: unknown channels and malformed candidates are ignored', () => {
  const t = createTrigger();
  assert.equal(t.observe({ channel: 'toString', candidate: strong('wave') }, 0), null);
  assert.equal(t.observe({ channel: '__proto__', candidate: strong('wave') }, 0), null);
  for (const bad of [42, {}, { label: 7 }, { score: 0.9 }, []]) {
    assert.deepEqual(run(createTrigger(), frames('hand', bad, 0, 2000)), [], JSON.stringify(bad));
  }
});

test('trigger: a bare label string still works and takes the hold path', () => {
  assert.deepEqual(run(createTrigger(), [[0, 'hand', 'thumbs_up']]), []);
  assert.deepEqual(run(createTrigger(), frames('hand', 'thumbs_up', 0, 1000)), [[250, 'thumbs_up']]);
});

if (process.exitCode) console.error(`reactions: FAILED (${passed} passed)`);
else console.log(`reactions: ${passed} checks passed`);
