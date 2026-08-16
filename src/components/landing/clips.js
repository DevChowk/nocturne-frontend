// Manifest + tuning for the landing-page clip wall.
//
// THIS IS THE SWAP POINT. To change the footage: drop files into
// public/clips/<version>/, bump CLIP_BASE, and edit TILES. No component
// code changes.
//
// The clips are licensed Pexels stock of real people (see
// public/clips/v1/CREDITS.txt for photographers, and
// scripts/fetch-pexels-clips.sh to re-fetch). The Pexels licence allows
// commercial use with no attribution, but it does ask that you not imply
// the people shown endorse your product — which is what a wall of faces on
// a video-chat homepage can read as. The wall used to carry a "demo
// footage" caption for that reason; it was removed as a design call.
// If that ever needs answering, the cheapest fixes are a line in the
// footer or in Terms, or swapping these for footage you shot yourself.

// Versioned directory: files in public/ ship unhashed, so `immutable`
// caching (see public/_headers) means the ONLY way to change a clip is to
// change its URL. Bump this to invalidate.
export const CLIP_BASE = '/clips/v1';

export const clipSrc = (id) => `${CLIP_BASE}/${id}.mp4`;
export const clipPoster = (id) => `${CLIP_BASE}/${id}.jpg`;

// One entry = one tile = one call.
//   them      – required, the stranger's clip (top panel)
//   you       – optional. When null the bottom panel renders the real
//               camera-off state instead, which is both cheaper (one less
//               decoder) and truer: that seat is empty because YOU haven't
//               taken it yet.
//   country   – optional second chip, desktop only
// Pairings are offset so no tile shows the same person twice, and every
// clip appears in both roles across the wall — a face you saw as a stranger
// turns up as somebody's self-view, which is what a real matching pool
// looks like. One seat is deliberately left empty.
export const TILES = [
  { id: 't01', them: 'c01', you: 'c05', country: 'BR' },
  { id: 't02', them: 'c02', you: 'c06', country: 'PL' },
  { id: 't03', them: 'c03', you: 'c07', country: 'JP' },
  { id: 't04', them: 'c04', you: 'c08', country: 'MX' },
  { id: 't05', them: 'c05', you: 'c09', country: 'DE' },
  { id: 't06', them: 'c06', you: 'c10', country: 'IN' },
  { id: 't07', them: 'c07', you: 'c11', country: 'CA' },
  { id: 't08', them: 'c08', you: 'c12', country: 'ES' },
  { id: 't09', them: 'c09', you: null,  country: 'KR' },
];

// Seconds per full loop, per column. Deliberately coprime-ish so the
// columns don't visibly resynchronise. Bigger tiles travel further per
// loop, so these are slower than they look.
export const COLUMN_SPEEDS = [86, 68, 100];
export const COLUMN_DIRECTIONS = ['up', 'down', 'up'];

// Concurrency caps on VIDEO ELEMENTS (not tiles). Everything else is a
// poster. iOS Safari's AVPlayer limits and Android thermals are the real
// constraints here, not bandwidth.
export const MAX_CONCURRENT = { mobile: 2, tablet: 4, desktop: 6 };

// Round-robin tiles into `n` columns, repeating the list until every column
// holds at least `minPerColumn`. The repeat is load-bearing: a track shorter
// than the visible wall would show its own end.
export function buildColumns(tiles, n, minPerColumn = 3) {
  if (!tiles.length || n < 1) return [];
  const columns = Array.from({ length: n }, () => []);
  let i = 0;
  // Keep dealing until the shortest column is long enough.
  while (columns.some((c) => c.length < minPerColumn)) {
    columns[i % n].push(tiles[i % tiles.length]);
    i += 1;
    if (i > n * minPerColumn * 4) break; // paranoia; can't loop forever
  }
  return columns;
}
