import { Link } from 'react-router-dom';
import { GRADIENT, gradientTextStyle } from '../constants/theme';

export default function AuthHeader({ to, linkText, linkHighlight }) {
  return (
    <header
      className="fixed top-0 w-full z-50 backdrop-blur-2xl flex justify-between items-center h-20 px-6 md:px-12"
      style={{ background: 'rgba(14,14,14,0.8)', boxShadow: '0 1px 0 0 rgba(255,255,255,0.03)' }}
    >
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundImage: GRADIENT }}>
          <span className="material-symbols-outlined text-black text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            nightlight_round
          </span>
        </div>
        <span className="text-2xl font-bold tracking-tighter font-headline" style={gradientTextStyle}>
          Nocturne
        </span>
      </div>
      <Link to={to} className="text-on-surface-variant hover:text-on-surface transition-colors font-label text-sm">
        {linkText} <span className="text-primary font-semibold ml-1">{linkHighlight}</span>
      </Link>
    </header>
  );
}
