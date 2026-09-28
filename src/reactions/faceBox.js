// Face framing boxes: turning MediaPipe landmarks into a rectangle you can
// position over a <video>.
//
// Pure, no imports, so src/reactions/__check.js can test the geometry — which
// is where this kind of feature goes wrong (mirrored previews, and object-fit:
// cover cropping the picture the box is supposed to sit on).

// MediaPipe returns landmarks normalized to the image it was given, so the
// bounds are resolution-independent: the same numbers work whatever size the
// frame was downscaled to.
export function boundsFromLandmarks(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of landmarks) {
    const x = p?.x;
    const y = p?.y;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (minX > maxX || minY > maxY) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// The face mesh hugs the skin: it stops at the jaw and the hairline, so a box
// drawn straight from it reads as "too tight" and clips the forehead. Grow it
// a little, more above than below, and keep it inside the frame.
const PAD_X = 0.12;
const PAD_TOP = 0.28;
const PAD_BOTTOM = 0.08;

export function padBounds(box) {
  if (!box) return null;
  const x = box.x - box.w * PAD_X;
  const y = box.y - box.h * PAD_TOP;
  const w = box.w * (1 + PAD_X * 2);
  const h = box.h * (1 + PAD_TOP + PAD_BOTTOM);
  const left = Math.max(0, x);
  const top = Math.max(0, y);
  return {
    x: left,
    y: top,
    w: Math.min(1 - left, w + Math.min(0, x)),
    h: Math.min(1 - top, h + Math.min(0, y)),
  };
}

// Map a normalized box onto the pixels actually visible in the element.
//
// Both previews use object-fit: cover, so the video is scaled up until it
// covers the box and the overflow is cropped evenly — normalized coordinates
// are NOT simply clientWidth * x. And the self-view is usually mirrored with a
// CSS transform, which the overlay does not inherit, so the box has to be
// flipped to match what the user sees.
export function projectBox(box, { videoWidth, videoHeight, clientWidth, clientHeight, mirrored = false }) {
  if (!box || !videoWidth || !videoHeight || !clientWidth || !clientHeight) return null;
  const scale = Math.max(clientWidth / videoWidth, clientHeight / videoHeight);
  const drawnW = videoWidth * scale;
  const drawnH = videoHeight * scale;
  const offsetX = (drawnW - clientWidth) / 2;
  const offsetY = (drawnH - clientHeight) / 2;

  const width = box.w * drawnW;
  const height = box.h * drawnH;
  const left = box.x * drawnW - offsetX;
  const top = box.y * drawnH - offsetY;
  return {
    left: mirrored ? clientWidth - (left + width) : left,
    top,
    width,
    height,
  };
}

// True when the box is entirely outside the visible area, so the caller can
// skip rendering rather than drawing a rectangle off-screen.
export function isOffscreen(rect, { clientWidth, clientHeight }) {
  if (!rect) return true;
  return rect.left + rect.width <= 0
    || rect.top + rect.height <= 0
    || rect.left >= clientWidth
    || rect.top >= clientHeight;
}
