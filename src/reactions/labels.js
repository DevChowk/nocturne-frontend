// Client mirror of the server's reaction labels
// (nocturne-backend/server/reactions/catalog.js). Ids MUST match — the server
// rejects anything it doesn't recognise.
//
// Pure data, no imports: src/reactions/__check.js runs this under plain Node.
// The emoji is what the overlay shows when there is no GIF (no Giphy key on
// the server, empty pool, or the image didn't load in time).
export const REACTION_LABELS = Object.freeze({
  thumbs_up:   { emoji: '👍', title: 'Thumbs up' },
  thumbs_down: { emoji: '👎', title: 'Thumbs down' },
  peace:       { emoji: '✌️', title: 'Peace' },
  love:        { emoji: '🤟', title: 'Love you' },
  wave:        { emoji: '👋', title: 'Hi' },
  laugh:       { emoji: '😂', title: 'Laughing' },
  surprise:    { emoji: '😮', title: 'Surprised' },
  wink:        { emoji: '😉', title: 'Wink' },
});

// hasOwn, not `in`: '__proto__' and 'constructor' are "in" every object.
export const isReactionLabel = (x) => typeof x === 'string' && Object.hasOwn(REACTION_LABELS, x);

// Defence in depth — the server already only relays Giphy URLs, but an <img>
// pointing anywhere else would leak the viewer's IP to that host.
export const isSafeGifUrl = (raw) => {
  if (typeof raw !== 'string') return false;
  let u;
  try { u = new URL(raw); } catch { return false; }
  return u.protocol === 'https:' && (u.hostname === 'giphy.com' || u.hostname.endsWith('.giphy.com'));
};
