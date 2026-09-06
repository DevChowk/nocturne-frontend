import { GAMES } from '../../games/catalog';

export default function GamePicker({ onPick, disabled, blocked, peerLabel }) {
  if (blocked) {
    return (
      <p className="text-center text-xs text-on-surface-variant px-4 py-6">
        {peerLabel} isn’t up for a game right now. Maybe next match.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-on-surface-variant text-center mb-1">
        Pick one and we’ll ask {peerLabel}.
      </p>
      {GAMES.map((g) => (
        <button
          key={g.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(g.id)}
          className="card-sticker flex items-center gap-3 px-3 py-2.5 text-left transition-transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          <span
            className="flex-shrink-0 flex items-center justify-center rounded-lg"
            style={{ width: 34, height: 34, background: 'rgb(var(--color-primary-rgb))', color: '#14000A' }}
          >
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20 }}>{g.icon}</span>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-on-surface truncate">{g.title}</span>
            <span className="block text-[11px] text-on-surface-variant truncate">{g.blurb}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
