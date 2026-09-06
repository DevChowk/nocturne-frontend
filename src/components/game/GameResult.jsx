export default function GameResult({ result, mySlot, onRematch, onPickAnother }) {
  const won = result?.winnerSlot === mySlot;
  const draw = !!result?.draw;
  const headline = draw ? 'Draw' : won ? 'You won' : 'They won';
  const tone = draw
    ? 'rgb(var(--color-on-surface-variant-rgb))'
    : won
      ? 'rgb(var(--color-primary-rgb))'
      : 'rgb(var(--color-secondary-rgb))';

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <p className="font-headline font-extrabold text-xl" style={{ color: tone }}>{headline}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onRematch} className="btn-sticker-outline px-4 py-1.5 text-sm">
          Rematch
        </button>
        <button
          type="button"
          onClick={onPickAnother}
          className="px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-surface"
        >
          Another game
        </button>
      </div>
    </div>
  );
}
