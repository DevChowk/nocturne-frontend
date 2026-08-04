import { Link } from 'react-router-dom';

export default function AuthHeader({ to, linkText, linkHighlight }) {
  return (
    <header
      className="fixed top-0 w-full z-50 backdrop-blur-2xl flex justify-between items-center gap-3 h-20 px-4 sm:px-6 md:px-12 border-b border-outline-variant/40"
      style={{ background: 'rgb(var(--color-bg-rgb) / 0.8)' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <img src="/favicon.png" alt="Bumpp" className="w-10 h-10 flex-shrink-0 rounded-xl object-cover" />
        {/* Solid on-surface color (near-black in light, paper-white in dark)
            so the wordmark stays legible in both themes. The yellow gradient
            was invisible on the cream light-mode ground. */}
        <span className="text-xl sm:text-2xl font-bold tracking-tighter font-headline text-on-surface">
          Bumpp
        </span>
      </div>
      {/* Link highlight uses on-surface (solid dark/white) for guaranteed
          contrast, with a chunky yellow underline as the brand nod — reads
          in both themes without relying on yellow alone for legibility. */}
      <Link to={to} className="text-on-surface-variant hover:text-on-surface transition-colors font-label text-xs sm:text-sm text-right whitespace-nowrap">
        <span className="hidden sm:inline">{linkText} </span>
        <span className="text-on-surface font-bold sm:ml-1 underline decoration-primary decoration-[3px] underline-offset-4">
          {linkHighlight}
        </span>
      </Link>
    </header>
  );
}
