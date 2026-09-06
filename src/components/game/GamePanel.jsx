import { useEffect, useRef } from 'react';
import { gameById } from '../../games/catalog';
import GamePicker from './GamePicker';
import GameResult from './GameResult';

// The dock sits on the page ground like the chat rail, so it uses the theme
// tokens (.card-sticker / .btn-sticker-outline). It deliberately does NOT use
// the .chip-video black-scrim vocabulary, which is calibrated for surfaces
// that sit on always-dark footage.
export default function GamePanel({ game, peerLabel }) {
  const headingRef = useRef(null);
  const entry = gameById(game.gameId);
  const Body = entry?.Component;

  // Focus moves to the heading on open so keyboard users land inside the dock,
  // and returns to whatever opened it on close. NOT a focus trap — this is a
  // dock, not a modal, and Skip must stay reachable at all times.
  useEffect(() => {
    const opener = document.activeElement;
    headingRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  // Announced once per change. `polite`, never `assertive`: this must not
  // interrupt a live conversation mid-sentence.
  const announcement = (() => {
    if (game.phase === 'over') {
      if (game.result?.draw) return 'Game over. Draw.';
      return game.result?.winnerSlot === game.mySlot ? 'Game over. You won.' : 'Game over. They won.';
    }
    if (game.phase !== 'playing') return '';
    if (game.turn === 'both') return game.state?.youCommitted ? 'Locked in. Waiting for your opponent.' : 'Your move.';
    return game.turn === game.mySlot ? 'Your turn.' : `Waiting for ${peerLabel}.`;
  })();

  return (
    <>
      <header
        className="flex-shrink-0 flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '2px solid rgb(var(--color-rule-rgb))' }}
      >
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-mono uppercase text-[11px] tracking-[0.16em] text-on-surface-variant outline-none"
        >
          {entry?.title || 'Play'}
        </h2>
        <button
          type="button"
          onClick={game.closePanel}
          aria-label="Hide game"
          className="flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          style={{ width: 24, height: 24 }}
        >
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>close</span>
        </button>
      </header>

      <div role="status" aria-live="polite" className="sr-only">{announcement}</div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3">
        {game.phase === 'idle' && (
          <GamePicker
            onPick={game.invite}
            blocked={game.blocked}
            peerLabel={peerLabel}
          />
        )}

        {game.phase === 'inviting' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-on-surface-variant">Asking {peerLabel}…</p>
            <button type="button" onClick={game.quit} className="text-xs text-on-surface-variant underline">
              Cancel
            </button>
          </div>
        )}

        {game.phase === 'starting' && (
          <p className="text-sm text-on-surface-variant text-center py-6">Starting…</p>
        )}

        {game.phase === 'invited' && game.incomingInvite && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-on-surface">
              {peerLabel} wants to play <b>{game.incomingInvite.title}</b>
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={game.acceptInvite} className="btn-sticker-outline px-4 py-1.5 text-sm">
                Play
              </button>
              <button
                type="button"
                onClick={game.declineInvite}
                className="px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-surface"
              >
                No thanks
              </button>
            </div>
          </div>
        )}

        {(game.phase === 'playing' || game.phase === 'over') && Body && (
          <div className="flex flex-col gap-3">
            <Body
              state={game.state}
              mySlot={game.mySlot}
              turn={game.turn}
              pendingMove={game.pendingMove}
              onMove={game.sendMove}
              peerLabel={peerLabel}
            />
            {game.phase === 'playing' && (
              <p className="text-center text-xs text-on-surface-variant" aria-hidden="true">
                {announcement}
              </p>
            )}
            {game.phase === 'over' && (
              <GameResult
                result={game.result}
                mySlot={game.mySlot}
                onRematch={game.rematch}
                onPickAnother={game.quit}
              />
            )}
          </div>
        )}

        {game.notice === 'peer_quit' && (
          <p className="mt-3 text-center text-xs text-on-surface-variant">{peerLabel} left the game.</p>
        )}
        {game.notice === 'declined' && game.phase === 'idle' && (
          <p className="mt-3 text-center text-xs text-on-surface-variant">
            {game.blocked ? `${peerLabel} would rather just talk.` : 'Not this time.'}
          </p>
        )}
        {game.error && (
          <p className="mt-3 text-center text-xs" style={{ color: 'rgb(var(--color-tertiary-rgb))' }}>{game.error}</p>
        )}
      </div>

      {game.phase === 'playing' && (
        <footer className="flex-shrink-0 p-3" style={{ borderTop: '2px solid rgb(var(--color-rule-rgb))' }}>
          <button
            type="button"
            onClick={game.quit}
            className="w-full text-xs text-on-surface-variant hover:text-on-surface py-1"
          >
            End game
          </button>
        </footer>
      )}
    </>
  );
}
