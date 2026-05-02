import { Link } from 'react-router-dom';
import { GRADIENT, gradientTextStyle } from '../constants/theme';

export default function NotFoundPage() {
  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />

      <h1 className="font-headline font-extrabold tracking-tight leading-none mb-4 relative" style={{ fontSize: 'clamp(4rem, 16vw, 9rem)', ...gradientTextStyle }}>
        404
      </h1>
      <p className="font-headline font-bold text-2xl md:text-3xl text-on-surface mb-3 relative">
        Lost in the night.
      </p>
      <p className="text-on-surface-variant max-w-sm mb-10 relative">
        The page you're looking for doesn't exist or has drifted into the void.
      </p>

      <Link
        to="/"
        className="relative flex items-center gap-2 font-headline font-bold rounded-full transition-all duration-200 active:scale-95 text-black px-8 py-3.5"
        style={{ backgroundImage: GRADIENT }}
      >
        Take me home
        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20 }}>arrow_forward</span>
      </Link>
    </div>
  );
}
