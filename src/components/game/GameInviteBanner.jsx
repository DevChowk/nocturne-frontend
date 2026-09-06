import { useEffect, useState } from 'react';

// Modelled on the friend-request banner in VideoCallView (same role, pill
// geometry, accept/decline/dismiss triad, and 20s auto-dismiss). An
// undismissable prompt sitting over a stranger's face is itself a griefing
// vector, so this one always has an exit.
const AUTO_DISMISS_MS = 20000;

export default function GameInviteBanner({ invite, peerLabel, onAccept, onDecline, offset }) {
  // Dismissal is per-invite: the parent keys this component on inviteId, so a
  // fresh invite gets a fresh component rather than a reset effect.
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!invite || dismissed) return undefined;
    const t = setTimeout(() => setDismissed(true), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [invite, dismissed]);

  if (!invite || dismissed) return null;

  return (
    <div
      role="alert"
      className={`absolute ${offset ? 'top-14 md:top-16' : 'top-2 md:top-3'} left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-1.5 py-1 rounded-full backdrop-blur-md border border-on-surface/10 shadow-lg max-w-[92vw]`}
      style={{ background: 'rgb(var(--color-surface-low-rgb) / 0.85)' }}
    >
      <span
        className="flex-shrink-0 flex items-center justify-center rounded-full bg-primary text-on-primary"
        style={{ width: 26, height: 26 }}
        aria-hidden="true"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>sports_esports</span>
      </span>
      <span className="text-xs text-on-surface font-semibold truncate max-w-[130px] sm:max-w-[200px]">
        {peerLabel} <span className="font-normal text-on-surface-variant">wants to play {invite.title}</span>
      </span>
      <button
        type="button"
        onClick={onAccept}
        aria-label={`Accept game invite: ${invite.title}`}
        title="Play"
        className="flex items-center justify-center rounded-full transition-transform active:scale-90"
        style={{ width: 28, height: 28, background: 'rgba(63,82,255,0.18)', color: '#3F52FF' }}
      >
        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>check</span>
      </button>
      <button
        type="button"
        onClick={onDecline}
        aria-label="Decline game invite"
        title="No thanks"
        className="flex items-center justify-center rounded-full transition-transform active:scale-90"
        style={{ width: 28, height: 28, background: 'rgba(255,79,79,0.22)', color: '#FF4F4F' }}
      >
        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>close</span>
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss for now"
        title="Dismiss"
        className="flex-shrink-0 flex items-center justify-center text-on-surface-variant/70 hover:text-on-surface-variant ml-0.5"
        style={{ width: 20, height: 20 }}
      >
        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 14 }}>close_small</span>
      </button>
    </div>
  );
}
