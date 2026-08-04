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

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={panelRef}
        className={`relative w-full ${maxWidth} flex flex-col bg-surface-container-low rounded-xl border border-outline-variant/40 overflow-hidden max-h-[90vh]`}
        style={{ boxShadow: '0 0 40px rgba(245,183,0,0.15)' }}
      >
        {children}
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"
          style={{ background: 'rgba(255,212,0,0.05)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16"
          style={{ background: 'rgba(63,82,255,0.05)' }}
        />
      </div>
    </div>
  );
}
