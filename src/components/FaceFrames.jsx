import { useEffect, useState } from 'react';
import { isOffscreen, projectBox } from '../reactions/faceBox.js';

// Framing boxes over your own camera: one bracket-cornered rectangle per face
// the detector can see, so you can tell at a glance that you're in shot.
//
// A sibling of the <video>, never a wrapper — same rule as ReactionOverlay,
// because the panels' video elements must never be re-parented.
//
// The boxes come from the face pass that already runs for expressions, so they
// update 2-3 times a second rather than every frame. That is fine for framing,
// where the subject is mostly still, and it costs no extra inference.

const CORNER = 14; // px of visible bracket at each corner

export default function FaceFrames({ boxes, videoRef, mirrored = false }) {
  // Re-project on resize: the same normalized box maps to different pixels
  // when the panel changes size (sidebar toggles, orientation changes).
  const [size, setSize] = useState(null);

  useEffect(() => {
    const video = videoRef?.current;
    if (!video || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => setSize({
      clientWidth: video.clientWidth,
      clientHeight: video.clientHeight,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
    });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(video);
    return () => ro.disconnect();
  }, [videoRef, boxes]);

  if (!boxes?.length || !size?.videoWidth || !size.clientWidth) return null;

  return (
    <div className="absolute inset-0 z-[12] pointer-events-none" aria-hidden="true">
      {boxes.map((box, i) => {
        const rect = projectBox(box, { ...size, mirrored });
        if (!rect || isOffscreen(rect, size)) return null;
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: Math.round(rect.left),
              top: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              // Corner brackets rather than a full rectangle: lighter over a
              // face, and it reads as a viewfinder instead of a detection box.
              // Theme-independent white, like .chip-video — video is always dark.
              background: `
                linear-gradient(#F7F4EE, #F7F4EE) left top, linear-gradient(#F7F4EE, #F7F4EE) left top,
                linear-gradient(#F7F4EE, #F7F4EE) right top, linear-gradient(#F7F4EE, #F7F4EE) right top,
                linear-gradient(#F7F4EE, #F7F4EE) left bottom, linear-gradient(#F7F4EE, #F7F4EE) left bottom,
                linear-gradient(#F7F4EE, #F7F4EE) right bottom, linear-gradient(#F7F4EE, #F7F4EE) right bottom`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${CORNER}px 2px, 2px ${CORNER}px, ${CORNER}px 2px, 2px ${CORNER}px,
                               ${CORNER}px 2px, 2px ${CORNER}px, ${CORNER}px 2px, 2px ${CORNER}px`,
              borderRadius: 6,
              filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.55))',
              opacity: 0.85,
            }}
          />
        );
      })}
    </div>
  );
}
