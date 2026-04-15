import ModalBase from './ModalBase';
import { GRADIENT, gradientTextStyle } from '../constants/theme';

const DATA_ITEMS = [
  { strong: 'Session Data:', text: 'Temporary tokens used to maintain secure handshakes between peers.' },
  { strong: 'Technical Specs:', text: 'Camera resolution and bandwidth capability for optimized streaming.' },
];

const VIDEO_ITEMS = [
  { title: 'End-to-End Privacy', desc: 'Real-time video streams are routed via WebRTC protocols with DTLS encryption. We cannot view or record your sessions.' },
  { title: 'Zero Storage Policy', desc: 'Nocturne does not store video frames on our servers. Once a session ends, the transient data is purged from memory.' },
];

const RIGHTS = ['Right to Erasure', 'Data Portability', 'Object to Processing'];

function SectionHeader({ icon, iconBg, iconColor, title }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
        <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
      </div>
      <h2 className="font-headline text-xl font-bold text-on-surface">{title}</h2>
    </div>
  );
}

export default function PrivacyModal({ onClose }) {
  return (
    <ModalBase maxWidth="max-w-3xl">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/5">
        <div>
          <h1 className="font-headline text-2xl font-extrabold tracking-tight" style={gradientTextStyle}>
            Privacy Policy
          </h1>
          <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant mt-1 block">
            Version 2.4 • Effective Jan 2024
          </span>
        </div>
        <button
          onClick={onClose}
          className="group flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-bright transition-all duration-300 active:scale-90"
        >
          <span className="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface">close</span>
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-10 space-y-12 no-scrollbar">
        {/* Data Collection */}
        <section>
          <SectionHeader icon="analytics" iconBg="rgba(186,158,255,0.1)" iconColor="text-primary" title="Data Collection" />
          <div className="space-y-4 text-on-surface-variant leading-relaxed">
            <p>At Nocturne, your presence is ephemeral. We collect minimal technical metadata to ensure connection stability, including device identifiers and approximate network location. Unlike traditional platforms, we do not log your interactions or build a behavioral profile.</p>
            <ul className="space-y-3 pl-2 border-l border-primary/20">
              {DATA_ITEMS.map(item => (
                <li key={item.strong} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span><strong className="text-on-surface">{item.strong}</strong> {item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Use of Information */}
        <section className="p-6 rounded-xl bg-surface-container-high/40" style={{ boxShadow: 'inset 0 0 0 1px rgba(186,158,255,0.1)' }}>
          <SectionHeader icon="share" iconBg="rgba(0,207,252,0.1)" iconColor="text-secondary" title="Use of Information" />
          <p className="text-on-surface-variant leading-relaxed">We leverage information solely to curate the "Electric Pulse" of our community. Your data is never sold. We use anonymized usage patterns to improve our matching algorithms and prevent malicious activity within the ecosystem.</p>
        </section>

        {/* Video Security */}
        <section>
          <SectionHeader icon="videocam_off" iconBg="rgba(255,151,181,0.1)" iconColor="text-tertiary" title="Video Security" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VIDEO_ITEMS.map(item => (
              <div key={item.title} className="p-5 bg-surface-container rounded-xl border border-white/5">
                <h3 className="text-on-surface font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-on-surface-variant">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Your Rights */}
        <section>
          <SectionHeader icon="gavel" iconBg="rgba(174,141,255,0.1)" iconColor="text-primary-fixed" title="Your Rights" />
          <p className="text-on-surface-variant leading-relaxed mb-6">You maintain absolute sovereignty over your digital footprint. Under global privacy frameworks, including GDPR and CCPA, you have the following irrevocable rights:</p>
          <div className="space-y-3">
            {RIGHTS.map(right => (
              <div key={right} className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border-l-2 border-primary">
                <span className="text-on-surface font-medium">{right}</span>
                <span className="material-symbols-outlined text-on-surface-variant text-sm">arrow_forward_ios</span>
              </div>
            ))}
          </div>
        </section>

        <div className="pt-8 pb-4">
          <div className="flex flex-col items-center justify-center p-8 border border-dashed border-outline-variant/30 rounded-xl bg-surface-container-low/30">
            <span className="material-symbols-outlined text-4xl mb-4" style={{ color: 'rgba(173,170,170,0.2)' }}>security</span>
            <p className="text-center text-sm text-on-surface-variant max-w-sm">
              Questions about your privacy? Our dedicated safety team is available 24/7 at{' '}
              <span className="text-secondary">privacy@nocturne.io</span>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-8 bg-surface-container-low/80 backdrop-blur-md border-t border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <p className="text-xs text-on-surface-variant text-center md:text-left">By continuing to use Nocturne, you acknowledge these terms.</p>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-8 py-3 rounded-full bg-surface-container-high text-on-surface font-bold text-sm hover:bg-surface-bright transition-all duration-300 active:scale-95">
            Download PDF
          </button>
          <button
            onClick={onClose}
            className="flex-1 md:flex-none px-10 py-3 rounded-full text-black font-bold text-sm transition-all duration-300 active:scale-95"
            style={{ backgroundImage: GRADIENT, boxShadow: '0 0 20px rgba(186,158,255,0.3)' }}
          >
            I Understand
          </button>
        </div>
      </footer>
    </ModalBase>
  );
}
