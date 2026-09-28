// How camera frames reach the detector worker.
//
// A bitmap per tick, not a transferred MediaStreamTrackProcessor stream. The
// stream path costs the page nothing per frame, but it binds the worker to
// ONE track: a camera switch or a mobile re-acquire ends that stream silently
// and detection stops. Grabbing from the <video> re-reads whatever track is
// current, works in every browser rather than Chrome only, and costs ~1-2ms
// of main-thread time per frame — about 2% at 12fps.
//
// `resizeWidth` alone preserves the aspect ratio, and 320 is already the size
// the models want, so the worker passes these straight through without a
// second copy.
const TARGET_WIDTH = 320;

// A decoded frame from a live, enabled camera track. After camera-off the
// element can keep showing its last frame with readyState >= 2, so the track
// itself is the source of truth.
export const hasLiveFrame = (video) => {
  if (!video || video.readyState < 2) return false;
  const track = video.srcObject?.getVideoTracks?.()[0];
  return !!track && track.readyState === 'live' && track.enabled && !track.muted;
};

export const grabBitmap = async (video) => {
  if (!hasLiveFrame(video)) return null;
  try {
    return await createImageBitmap(video, { resizeWidth: TARGET_WIDTH, resizeQuality: 'low' });
  } catch {
    // Happens if the track dies mid-grab; the next tick will try again.
    return null;
  }
};
