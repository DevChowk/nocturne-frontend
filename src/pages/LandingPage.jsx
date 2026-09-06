import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GuestEntryModal from '../components/GuestEntryModal';
import ClipWall from '../components/landing/ClipWall';
import { useOnlineCount } from '../hooks/useOnlineCount';
import { useAuth } from '../hooks/useAuth';

// Landing hero per the Design Book cover + page 06: display H1 with the
// yellow sticker on ONE word, one sticker CTA, signup as text, and a live
// video panel alongside — here expanded into a wall of drifting in-call
// tiles so a first-time visitor can see what a Bumpp call actually looks
// like instead of reading a promise about it.
//
// Below 1024px the page stays the original single centred column, with the
// wall occupying the slot the decorative striped panel used to.

// The count is real (GET /api/stats/online). Below this many people it
// renders as the bare word "Online" instead of a figure: on a young product
// the honest number is often single digits, and "ONLINE — 3" does more
// damage than no number. Omitting is truthful; inflating would not be.
const COUNT_FLOOR = 5;

function OnlineCount() {
  const { count, state } = useOnlineCount();
  const showNumber = state === 'ok' && typeof count === 'number' && count >= COUNT_FLOOR;

  return (
    <span
      className="font-mono uppercase tabular-nums text-on-surface whitespace-nowrap"
      style={{ fontSize: 11, letterSpacing: '0.16em' }}
      title={showNumber ? 'People online right now' : undefined}
    >
      Online
      {showNumber && (
        <>
          <span aria-hidden="true" className="opacity-40"> — </span>
          {count.toLocaleString()}
        </>
      )}
    </span>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { token, isGuest } = useAuth();
  const [showGuestEntry, setShowGuestEntry] = useState(false);

  // The yellow button starts a session, per the Design Book: "One yellow
  // Start. Signup is text, never a competing sticker button — guest entry is
  // the default path."
  //
  // A guest who already has a live session can be sitting on this page
  // (PublicOnlyRoute lets guests through so they can convert). Sending them
  // back through the age gate would mint a SECOND guest session and burn
  // their match quota, so they go straight to the lobby.
  const start = () => {
    if (token && isGuest) navigate('/home');
    else setShowGuestEntry(true);
  };

  return (
    <div className="relative bg-background text-on-background font-body" style={{ minHeight: '100vh' }}>
      {/* Ambient warm-tint wash — a very soft yellow glow behind the hero
          so the ground feels lit, not flat, on the muted linen bg. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 42%, rgba(255,212,0,0.14) 0%, transparent 60%)' }}
      />

      {/* ── Header ── */}
      <header className="relative z-30 flex justify-between items-center px-6 py-5 md:px-10">
        <div className="flex items-center">
          <img src="/logo-lockup.svg" alt="Bumpp" className="h-8 w-auto dark:hidden" />
          <img src="/logo-lockup-dark.svg" alt="Bumpp" aria-hidden="true" className="h-8 w-auto hidden dark:block" />
        </div>
        <div className="flex items-center gap-3 md:gap-5">
          <OnlineCount />
          {/* A real button, not underlined text. Returning users arrive
              looking for a way back in, and the only affordance here used to
              be a small text link that reads as body copy. Outline, never
              yellow — the sticker fill belongs to the one CTA in the hero. */}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="btn-sticker-outline text-sm whitespace-nowrap"
            style={{ paddingBlock: 8, paddingInline: 18, fontWeight: 800 }}
          >
            log in
          </button>
        </div>
      </header>

      {/* ── Hero ──
          Centre-stacked below lg, two columns above it (copy left, wall
          right) — the Design Book's page-06 arrangement. */}
      <main
        className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-6 pb-16 md:pt-16
                   flex flex-col items-center text-center
                   lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-x-12
                   lg:items-center lg:text-left"
      >
        {/* Copy is split in two so a SINGLE ClipWall can sit between the
            halves when stacked and beside both when the grid kicks in.
            Two walls would mean two observer sets and double the poster
            requests for one visible result. */}
        <div className="flex flex-col items-center lg:items-start w-full lg:col-start-1 lg:row-start-1">
          {/* The brand as a verb — the whole idea of the product is bumping
              into someone you'd never have met. The sticker sits on one word
              only, per the Design Book. */}
          <h1
            className="font-headline font-extrabold text-on-surface leading-[0.95]"
            style={{ fontSize: 'clamp(2.6rem, 8vw, 5.5rem)', letterSpacing: '-0.045em', textWrap: 'balance', maxWidth: '14ch' }}
          >
            go{' '}
            <span
              className="inline-block align-baseline"
              style={{
                background: 'rgb(var(--color-primary-rgb))',
                color: '#14000A',
                padding: '0.05em 0.35em',
                border: '2px solid rgb(var(--color-stroke-rgb))',
                borderRadius: '0.5em',
                boxShadow: '4px 4px 0 rgb(var(--color-stroke-rgb))',
                transform: 'rotate(-1.5deg)',
              }}
            >
              bumpp
            </span>{' '}
            into someone
          </h1>

          <p
            className="text-on-surface-variant font-body mt-8 max-w-xl lg:max-w-md leading-relaxed"
            style={{ fontSize: 'clamp(0.95rem, 2vw, 1.1rem)' }}
          >
            One tap and you're looking at a stranger somewhere on earth.
            Stay a second, stay all night. No feed, no algorithm, nothing to scroll.
          </p>

        </div>

        {/* The wall: between the copy halves when stacked, right-hand column
            spanning both rows once the grid kicks in. */}
        <ClipWall className="w-full max-w-lg lg:max-w-none mt-10 lg:mt-0
                             h-[clamp(230px,56vw,320px)] lg:h-[min(68vh,540px)]
                             lg:col-start-2 lg:row-start-1 lg:row-span-2" />

        <div className="flex flex-col items-center lg:items-start w-full lg:col-start-1 lg:row-start-2">
          {/* Primary CTA — starts a guest session. */}
          <button
            type="button"
            onClick={start}
            className="btn-sticker mt-10 inline-flex items-center gap-3 px-9 py-4 text-lg"
          >
            bumpp me
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 22 }}>arrow_forward</span>
          </button>

          {/* Signup is text, never a competing sticker button. */}
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="mt-3 text-on-surface-variant hover:text-on-surface text-sm font-semibold underline underline-offset-4 decoration-[2px]"
          >
            or sign up and never run out
          </button>

          <p
            className="font-mono uppercase text-on-surface-variant mt-6"
            style={{ fontSize: 10.5, letterSpacing: '0.16em' }}
          >
            18+ only · 3 free bumpps, no signup
          </p>
        </div>
      </main>

      {showGuestEntry && <GuestEntryModal onClose={() => setShowGuestEntry(false)} />}
    </div>
  );
}
