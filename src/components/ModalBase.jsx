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
        className={`card-sticker relative w-full ${maxWidth} flex flex-col overflow-hidden max-h-[90vh]`}
      >
        {children}
      </div>
    </div>
  );
}
