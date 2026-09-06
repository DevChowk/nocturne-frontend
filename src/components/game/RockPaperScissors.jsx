const CHOICES = [
  { id: 'rock', label: 'Rock', icon: 'back_hand' },
  { id: 'paper', label: 'Paper', icon: 'sign_language' },
  { id: 'scissors', label: 'Scissors', icon: 'content_cut' },
];

const ICON = Object.fromEntries(CHOICES.map((c) => [c.id, c.icon]));

// Simultaneous hidden moves. The server never sends us the opponent's choice
// until both are locked, so there is nothing here to reveal early — the UI
// shows "locked in", never a spinner that implies an outcome is computing,
// and never a countdown (there is no server timer).
export default function RockPaperScissors({ state, mySlot, pendingMove, onMove, peerLabel }) {
  if (!state) return null;
  const me = mySlot;
  const them = mySlot === 'a' ? 'b' : 'a';
  const committed = state.youCommitted || !!pendingMove;
  const myChoice = pendingMove?.choice || null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-4 font-mono text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
        <span>You <b className="text-on-surface text-sm">{state.scores[me]}</b></span>
        <span className="opacity-50">·</span>
        <span>Round {Math.min(state.round, state.target * 2 - 1)}</span>
        <span className="opacity-50">·</span>
        <span><b className="text-on-surface text-sm">{state.scores[them]}</b> Them</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {CHOICES.map((c) => {
          const chosen = myChoice === c.id;
          return (
            <button
              key={c.id}
              type="button"
              disabled={committed}
              onClick={() => onMove({ choice: c.id })}
              aria-label={c.label}
              aria-pressed={chosen}
              className="flex flex-col items-center justify-center gap-1 rounded-xl py-3 transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100"
              style={{
                border: '2px solid rgb(var(--color-stroke-rgb))',
                background: chosen ? 'rgb(var(--color-primary-rgb))' : 'rgb(var(--color-surface-high-rgb))',
                color: chosen ? '#14000A' : 'rgb(var(--color-on-surface-rgb))',
                boxShadow: chosen ? '2px 2px 0 rgb(var(--color-stroke-rgb))' : 'none',
              }}
            >
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 24 }}>{c.icon}</span>
              <span className="text-[11px] font-semibold">{c.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-on-surface-variant min-h-[1.5rem]">
        {committed && !state.peerCommitted && <>Locked in — waiting for {peerLabel}.</>}
        {committed && state.peerCommitted && <>Revealing…</>}
        {!committed && state.peerCommitted && <>{peerLabel} has locked in. Your pick?</>}
        {!committed && !state.peerCommitted && <>Pick one. You both reveal at once.</>}
      </p>

      {state.history.length > 0 && (
        <ol className="flex flex-col gap-1 text-xs">
          {state.history.slice(-3).reverse().map((h, i) => {
            const mine = h[me];
            const theirs = h[them];
            const verdict = h.winner === null ? 'Tie' : h.winner === me ? 'You won' : 'They won';
            return (
              <li key={state.history.length - i} className="flex items-center justify-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>{ICON[mine]}</span>
                <span className="opacity-60">vs</span>
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>{ICON[theirs]}</span>
                <span className="font-semibold text-on-surface">{verdict}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
