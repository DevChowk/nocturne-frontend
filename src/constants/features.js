// Switches for things that are built and working but deliberately not shown
// right now. Keeping them as flags rather than deleting or commenting out the
// code means what's behind them stays real, linted code that can't rot.

// The TOTAL number of people on the server ("Online — 2,412").
//
// Off everywhere it appeared: the landing page header, the app header, and
// the searching screen. Behind it, the socket's online_count broadcast and
// GET /api/stats/online both still run — this only controls whether a user
// is shown the figure.
//
// NOT related to the friends sidebar's "Friends — 3 online", which counts
// the user's own friends rather than the whole server, and stays visible.
export const SHOW_ONLINE_COUNT = false;

// Camera reactions: on-device hand-gesture + expression detection that floats
// a matching GIF over the call for both people. Opt-in twice over — this env
// flag shows the Settings toggle, and each user still has to turn it on.
//
// Cosmetic only. The backend's REACTIONS_ENABLED is authoritative: with it
// off, the client sees its reactions time out and stops offering the feature.
export const REACTIONS_ENABLED = import.meta.env.VITE_REACTIONS_ENABLED === 'true';
