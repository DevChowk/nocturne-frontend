import { useEffect, useRef } from 'react';

// Tight curated list. No categories or search — that's emoji-mart territory.
// Sorted roughly by likelihood-of-use in casual chat.
const POPULAR_EMOJIS = [
  '😀', '😂', '🥰', '😊', '😎', '🤔', '😢', '😭',
  '😡', '🥹', '😱', '😴', '🤣', '😘', '🥲', '😉',
  '👍', '👎', '👏', '🙏', '👋', '🤝', '💪', '✌️',
  '❤️', '💔', '🔥', '✨', '🎉', '⭐', '💯', '⚡',
  '👀', '💀', '🤷', '🙌', '🥳', '😅', '🤩', '😏',
];

// Floating popover. Caller positions a wrapping element; this just renders
// the grid with click-outside + Esc dismissal. Designed for desktop only —
// caller hides it on mobile.
export default function EmojiPicker({ onPick, onClose, anchor = 'top' }) {
  const ref = useRef(null);

  useEffect(() => {
    const onMouseDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    // Defer the listener-add by one tick so the click that opened the
    // picker doesn't immediately close it on the same event loop.
    const t = setTimeout(() => {
      document.addEventListener('mousedown', onMouseDown);
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Pick an emoji"
      className={`absolute ${anchor === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 z-30 grid grid-cols-8 gap-1 p-2 rounded-xl backdrop-blur-md border border-on-surface/10 shadow-xl`}
      style={{ background: 'rgb(var(--color-surface-low-rgb) / 0.95)' }}
    >
      {POPULAR_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onPick?.(emoji);
            onClose?.();
          }}
          aria-label={`Insert ${emoji}`}
          className="flex items-center justify-center rounded-lg hover:bg-on-surface/10 transition-colors active:scale-90"
          style={{ width: 32, height: 32, fontSize: 18 }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
