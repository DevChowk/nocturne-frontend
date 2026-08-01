import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GRADIENT, gradientTextStyle } from '../constants/theme';
import GuestEntryModal from '../components/GuestEntryModal';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showGuestEntry, setShowGuestEntry] = useState(false);

  return (
    <div className="relative bg-background text-on-background font-body" style={{ height: '100vh', overflow: 'hidden' }}>

      {/* ── Ambient glows ── */}
      <div className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.18) 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute rounded-full blur-3xl"
        style={{ width: 480, height: 480, top: '10%', left: '-8%', background: 'rgba(186,158,255,0.07)' }} />
      <div className="pointer-events-none absolute rounded-full blur-3xl"
        style={{ width: 420, height: 420, bottom: '5%', right: '-6%', background: 'rgba(0,207,252,0.06)' }} />

      {/* ── Header ── */}
      <header className="absolute top-0 left-0 right-0 z-30 flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-3">
          <img src="/favicon.png" alt="Bumpp" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-xl font-bold tracking-tighter text-white uppercase font-headline">Bumpp</span>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
        <h1 className="font-headline font-extrabold tracking-tight leading-none mb-5"
          style={{ fontSize: 'clamp(2.6rem, 7vw, 5.5rem)' }}>
          Embrace the{' '}
          <span style={gradientTextStyle}>midnight connection.</span>
        </h1>

        <p className="text-on-surface-variant font-body max-w-lg mx-auto mb-10 leading-relaxed"
          style={{ fontSize: 'clamp(0.95rem, 2vw, 1.15rem)' }}>
          Bumpp: The fastest way to run into someone new. One tap, one face, one real conversation.
          Minimal. Secure. Instant.
        </p>

        {/* CTA Button */}
        <div className="relative mb-4" style={{ display: 'inline-block' }}>
          <div className="absolute -inset-1 rounded-full blur-md opacity-40" style={{ backgroundImage: GRADIENT }} />
          <button
            onClick={() => navigate('/login')}
            className="relative flex items-center gap-3 font-headline font-bold rounded-full transition-all duration-200 active:scale-95"
            style={{
              backgroundImage: GRADIENT,
              color: '#000',
              padding: '1rem 2.5rem',
              fontSize: '1.1rem',
              letterSpacing: '-0.01em',
            }}
          >
            Get Started
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 22 }}>bolt</span>
          </button>
        </div>

        {/* Guest entry — opens the age-gate modal. Visually secondary so
            signup stays the primary CTA. */}
        <button
          type="button"
          onClick={() => setShowGuestEntry(true)}
          className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-white/5 text-sm font-semibold transition-colors"
        >
          <span>Or try as a guest</span>
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>arrow_forward</span>
        </button>
      </main>

      {showGuestEntry && <GuestEntryModal onClose={() => setShowGuestEntry(false)} />}
    </div>
  );
}
