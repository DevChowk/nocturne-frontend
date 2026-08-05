import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GuestEntryModal from '../components/GuestEntryModal';

// Landing hero rebuilt to match the Design Book cover + page 06:
// serif-heavy display H1 ("talk to a random human") with the last word
// captured inside a chunky yellow sticker-highlight; punchy sub-hero
// with punctuated cadence; sticker CTA + guest link; three status chips
// beneath (live count / no-signup / 18+) for social-proof + expectation
// setting at a glance.
export default function LandingPage() {
  const navigate = useNavigate();
  const [showGuestEntry, setShowGuestEntry] = useState(false);

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
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="text-on-surface font-bold text-sm underline decoration-primary decoration-[3px] underline-offset-4 hover:decoration-4"
        >
          log in
        </button>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 flex flex-col items-center px-6 pt-6 pb-16 md:pt-16 text-center">
        <h1
          className="font-headline font-extrabold text-on-surface leading-[0.95]"
          style={{ fontSize: 'clamp(2.6rem, 8vw, 5.5rem)', letterSpacing: '-0.045em', textWrap: 'balance', maxWidth: '13ch' }}
        >
          talk to a random{' '}
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
            human
          </span>
        </h1>

        <p
          className="text-on-surface-variant font-body mt-8 max-w-xl leading-relaxed"
          style={{ fontSize: 'clamp(0.95rem, 2vw, 1.1rem)' }}
        >
          One tap and you're face to face with a stranger somewhere. Skip whenever.
          No profile, no feed, no algorithm.
        </p>

        {/* Preview stage — subtle textured panel evoking "your camera goes here";
            pure decoration, keeps the hero from feeling like a wall of text. */}
        <div
          className="w-full max-w-lg mt-10 flex items-center justify-center"
          style={{
            height: 'clamp(180px, 32vw, 260px)',
            background:
              'repeating-linear-gradient(135deg, rgb(var(--color-surface-high-rgb)) 0 12px, rgb(var(--color-surface-highest-rgb)) 12px 24px)',
            border: '2px solid rgb(var(--color-stroke-rgb))',
            borderRadius: 18,
            boxShadow: '5px 5px 0 rgb(var(--color-stroke-rgb))',
          }}
        >
          <span className="chip-sticker" style={{ background: 'rgb(var(--color-surface-rgb))' }}>
            someone, right now
          </span>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="btn-sticker mt-10 inline-flex items-center gap-3 px-9 py-4 text-lg"
        >
          bumpp me
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 22 }}>arrow_forward</span>
        </button>

        {/* Guest entry — secondary */}
        <button
          type="button"
          onClick={() => setShowGuestEntry(true)}
          className="mt-3 text-on-surface-variant hover:text-on-surface text-sm font-semibold underline underline-offset-4 decoration-[2px]"
        >
          or try as a guest
        </button>

        {/* Trust chips row — cobalt live-dot chip, guest-yellow "no signup",
            coral-outlined 18+ marker. Reinforces "instant + safe + adult". */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <span
            className="chip-sticker"
            style={{ color: '#3F52FF', background: 'rgb(var(--color-surface-rgb))' }}
          >
            <span className="chip-dot" />
            12,481 online
          </span>
          <span
            className="chip-sticker"
            style={{ background: 'rgb(var(--color-primary-rgb))', color: '#14000A' }}
          >
            no signup
          </span>
          <span
            className="chip-sticker"
            style={{ background: 'rgb(var(--color-tertiary-rgb))', color: '#FFFFFF' }}
          >
            18+
          </span>
        </div>
      </main>

      {showGuestEntry && <GuestEntryModal onClose={() => setShowGuestEntry(false)} />}
    </div>
  );
}
