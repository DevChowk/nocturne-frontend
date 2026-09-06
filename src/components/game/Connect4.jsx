const COLS = 7;
const ROWS = 6;

// Colour + shape, never colour alone.
const DISC = {
  a: { color: 'rgb(var(--color-primary-rgb))', glyph: 'circle' },
  b: { color: 'rgb(var(--color-secondary-rgb))', glyph: 'diamond' },
};

// The interactive target is the COLUMN, not the cell: 7 touch targets instead
// of 42, and 7 tab stops instead of 42.
export default function Connect4({ state, mySlot, turn, pendingMove, onMove }) {
  if (!state) return null;
  const myTurn = turn === mySlot && !state.over;

  const cols = state.cols.map((c) => c.slice());
  if (pendingMove && Number.isInteger(pendingMove.col) && cols[pendingMove.col]?.length < ROWS) {
    cols[pendingMove.col].push(mySlot);
  }

  const inLine = (c, r) => !!state.line?.some(([lc, lr]) => lc === c && lr === r);
  const isOptimistic = (c, r) => pendingMove?.col === c && r === state.cols[c].length;

  return (
    <div
      className="mx-auto w-full max-w-[300px] rounded-xl p-1.5"
      style={{ border: '2px solid rgb(var(--color-stroke-rgb))', background: 'rgb(var(--color-surface-high-rgb))' }}
    >
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: COLS }, (_, c) => {
          const full = cols[c].length >= ROWS;
          return (
            <button
              key={c}
              type="button"
              disabled={!myTurn || full}
              onClick={() => onMove({ col: c })}
              aria-label={`Drop in column ${c + 1}${full ? ', full' : `, ${cols[c].length} of ${ROWS} filled`}`}
              className="flex flex-col-reverse gap-1 rounded-md p-0.5 transition-colors disabled:cursor-default enabled:hover:bg-primary/10"
            >
              {Array.from({ length: ROWS }, (_, r) => {
                const owner = cols[c][r] || null;
                const disc = owner ? DISC[owner] : null;
                return (
                  <span
                    key={r}
                    aria-hidden="true"
                    className="aspect-square w-full flex items-center justify-center rounded-full"
                    style={{
                      background: 'rgb(var(--color-bg-rgb))',
                      boxShadow: inLine(c, r) ? '0 0 0 2px rgb(var(--color-primary-rgb))' : 'none',
                    }}
                  >
                    {disc && (
                      <span
                        className="material-symbols-outlined piece-drop"
                        style={{
                          fontSize: 20,
                          color: disc.color,
                          fontVariationSettings: "'FILL' 1",
                          opacity: isOptimistic(c, r) ? 0.5 : 1,
                        }}
                      >
                        {disc.glyph}
                      </span>
                    )}
                  </span>
                );
              })}
            </button>
          );
        })}
      </div>
    </div>
  );
}
