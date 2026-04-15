export default function AuthFooter({ onPrivacy, onTerms }) {
  return (
    <footer className="w-full py-8 border-t bg-background" style={{ borderColor: 'rgba(32,32,31,0.3)' }}>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-12 max-w-7xl mx-auto">
        <span className="font-headline font-bold text-primary">Nocturne</span>
        <p className="font-body text-sm text-on-surface-variant">© 2024 Nocturne. Experience the Electric Pulse.</p>
        <nav className="flex gap-6">
          <button
            type="button"
            onClick={onPrivacy}
            className="text-on-surface-variant hover:text-secondary transition-all duration-300 font-body text-sm"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={onTerms}
            className="text-on-surface-variant hover:text-secondary transition-all duration-300 font-body text-sm"
          >
            Terms of Service
          </button>
          <a href="#" className="text-on-surface-variant hover:text-secondary transition-all duration-300 font-body text-sm">
            Help
          </a>
        </nav>
      </div>
    </footer>
  );
}
