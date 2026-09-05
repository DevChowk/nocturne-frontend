import { useEffect, useRef } from 'react';

export default function ModalBase({ children, onClose, maxWidth = 'max-w-2xl' }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    // Focus trap: keep Tab cycling inside the modal panel.
    const panel = panelRef.current;
    if (!panel) return;
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = panel.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', onKey);
    // Move initial focus into the panel.
    const firstFocusable = panel.querySelector('button, [href], input, [tabindex]:not([tabindex="-1"])');
    firstFocusable?.focus();
    return () => panel.removeEventListener('keydown', onKey);
  }, []);

  // Freeze the page behind the modal. Without this, scrolling past the end
  // of a modal's content chains to the page underneath — most visible on
  // phones, where the backdrop drags around behind the panel.
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, []);

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      // Keep the panel clear of the iOS home indicator / browser chrome.
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      {/* The panel is the only height authority: it fills at most the
          viewport minus the backdrop padding, and its children divide that
          up (fixed header, flex-1 scrolling body, fixed footer). Children
          must NOT set their own vh caps — a 70vh body next to a header and
          footer overflows the panel and gets clipped off-screen.
          dvh rather than vh so mobile browser chrome is accounted for. */}
      <div
        ref={panelRef}
        className={`card-sticker relative w-full ${maxWidth} flex flex-col overflow-hidden max-h-full`}
        style={{ maxHeight: 'calc(100dvh - 2rem)' }}
      >
        {children}
      </div>
    </div>
  );
}
