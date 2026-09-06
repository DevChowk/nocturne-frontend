// Slot 'a' is X, 'b' is O — paired with a colour, but never colour ALONE
// (WCAG 1.4.1): the glyph carries the same information.
const GLYPH = { a: 'close', b: 'radio_button_unchecked' };
const COLOR = {
  a: 'rgb(var(--color-primary-rgb))',
  b: 'rgb(var(--color-secondary-rgb))',
};

export default function TicTacToe({ state, mySlot, turn, pendingMove, onMove }) {
  if (!state) return null;
  const myTurn = turn === mySlot && !state.over;
  const board = state.board.slice();
  // Optimistic: a move is always legal if it was your turn, so paint it now
  // and let the next game_state reconcile.
  if (pendingMove && Number.isInteger(pendingMove.index) && board[pendingMove.index] === null) {
    board[pendingMove.index] = mySlot;
  }

  const cellLabel = (i, owner) => {
    const pos = ['top left', 'top centre', 'top right', 'middle left', 'centre', 'middle right', 'bottom left', 'bottom centre', 'bottom right'][i];
    if (!owner) return `${pos}, empty`;
    return `${pos}, ${owner === mySlot ? 'yours' : 'theirs'}`;
  };

  return (
    <div
      role="grid"
      aria-label="Tic Tac Toe board"
      className="grid grid-cols-3 gap-1.5 mx-auto w-full max-w-[240px]"
    >
      {board.map((owner, i) => {
        const inLine = state.line?.includes(i);
        const optimistic = pendingMove?.index === i && state.board[i] === null;
        return (
          <button
            key={i}
            type="button"
            role="gridcell"
            disabled={!myTurn || owner !== null}
            onClick={() => onMove({ index: i })}
            aria-label={cellLabel(i, owner)}
            className="aspect-square flex items-center justify-center rounded-lg transition-transform active:scale-95 disabled:active:scale-100"
            style={{
              border: '2px solid rgb(var(--color-stroke-rgb))',
              background: inLine ? 'rgb(var(--color-primary-rgb) / 0.22)' : 'rgb(var(--color-surface-high-rgb))',
              opacity: optimistic ? 0.5 : 1,
            }}
          >
            {owner && (
              <span
                className="material-symbols-outlined piece-drop"
                aria-hidden="true"
                style={{ fontSize: 34, color: COLOR[owner], fontWeight: 700 }}
              >
                {GLYPH[owner]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
