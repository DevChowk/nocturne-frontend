import ModalBase from './ModalBase';
import { GRADIENT } from '../constants/theme';

const USER_RESPONSIBILITIES = [
  'Provide accurate and complete information during registration.',
  'Maintain the confidentiality of your login credentials.',
  'Notify Nocturne immediately of any unauthorized use of your account.',
];

const PROHIBITED_ITEMS = [
  { icon: 'block', label: 'Harassment or Hate Speech' },
  { icon: 'no_photography', label: 'Non-consensual Recording' },
  { icon: 'person_off', label: 'Impersonating Others' },
  { icon: 'emergency_home', label: 'Illegal Content Sharing' },
];

function SectionHeading({ num, title, accent = 'text-secondary' }) {
  return (
    <h2 className="font-headline text-lg font-bold text-on-surface mb-3 flex items-center gap-2">
      <span className={`${accent} font-mono text-sm`}>{num}.</span> {title}
    </h2>
  );
}

export default function TermsModal({ onClose }) {
  return (
    <ModalBase>
      {/* Header */}
      <header className="p-8 pb-4 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Terms of Service</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" style={{ boxShadow: '0 0 8px #00cffc' }} />
            <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant font-semibold">
              Last Updated: October 2023
            </span>
          </div>
        </div>
        <div className="p-3 bg-surface-container-high rounded-full text-primary" style={{ boxShadow: '0 0 15px rgba(186,158,255,0.1)' }}>
          <span className="material-symbols-outlined text-3xl">shield_person</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
        <div className="space-y-10 text-on-surface-variant leading-relaxed">
          <article>
            <SectionHeading num="01" title="Introduction" />
            <p>Welcome to Nocturne. By accessing or using our platform, you agree to be bound by these Terms of Service. This is a legal agreement between you and Nocturne regarding your use of our real-time video connection services. Please read these terms carefully before proceeding. If you do not agree to these terms, you must cease use of the service immediately.</p>
          </article>

          <article>
            <SectionHeading num="02" title="User Responsibilities" />
            <div className="space-y-4">
              <p>You are responsible for maintaining the security of your account and any activity that occurs under your profile. You agree to:</p>
              <ul className="space-y-3 pl-4 border-l border-outline-variant/30">
                {USER_RESPONSIBILITIES.map(item => (
                  <li key={item} className="flex gap-3">
                    <span className="material-symbols-outlined text-primary text-sm mt-1">check_circle</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className="p-6 bg-surface-container-high/50 rounded-xl border border-outline-variant/10">
            <SectionHeading num="03" title="Prohibited Conduct" accent="text-error" />
            <p className="mb-4">To maintain our environment of digital intimacy and respect, the following actions are strictly prohibited:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PROHIBITED_ITEMS.map(item => (
                <div key={item.icon} className="flex items-center gap-3 p-3 bg-surface-dim rounded-lg">
                  <span className="material-symbols-outlined text-error text-xl">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </article>

          <article>
            <SectionHeading num="04" title="Termination" />
            <p>Nocturne reserves the right to terminate or suspend your access to the Service at any time, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. All provisions of the Terms which by their nature should survive termination shall survive termination, including ownership provisions, warranty disclaimers, and limitations of liability.</p>
          </article>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="p-8 pt-6 flex flex-col sm:flex-row items-center gap-4 border-t border-outline-variant/5"
        style={{ background: 'linear-gradient(to top, #131313, transparent)' }}
      >
        <p className="flex-1 text-xs text-on-surface-variant max-sm:text-center">
          By clicking Close or interacting with the app, you acknowledge that you have read and understood these terms.
        </p>
        <button
          onClick={onClose}
          className="w-full sm:w-auto px-10 py-3 rounded-full text-black font-headline font-bold text-sm tracking-wide transition-all duration-300 active:scale-95"
          style={{ backgroundImage: GRADIENT, boxShadow: '0 4px 20px rgba(186,158,255,0.25)' }}
        >
          Close
        </button>
      </footer>
    </ModalBase>
  );
}
