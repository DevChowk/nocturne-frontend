import { Link } from 'react-router-dom';

export default function AuthHeader({ to, linkText, linkHighlight }) {
  return (
    <header
      className="fixed top-0 w-full z-50 backdrop-blur-2xl flex justify-between items-center gap-3 h-20 px-4 sm:px-6 md:px-12 border-b border-outline-variant/40"
      style={{ background: 'rgb(var(--color-bg-rgb) / 0.8)' }}
    >
      <div className="flex items-center min-w-0">
        {/* Theme-aware lockup — .dark class on <html> swaps to the paper-
            white version in dark mode. */}
        <img src="/logo-lockup.svg" alt="Bumpp" className="h-8 sm:h-10 w-auto dark:hidden" />
        <img src="/logo-lockup-dark.svg" alt="Bumpp" aria-hidden="true" className="h-8 sm:h-10 w-auto hidden dark:block" />
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
