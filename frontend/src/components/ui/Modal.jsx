import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Design-system modal shell. Consistent backdrop, radius, shadow, scroll-lock,
// ESC / overlay-to-close, and dialog semantics. Content-agnostic.
const SIZES = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };

export default function Modal({ open, onClose, title, size = 'md', children }) {
  const panelRef = useRef(null);
  // Keep the latest onClose without making it an effect dependency. Parents
  // usually pass a fresh inline onClose every render; if the setup effect
  // depended on it, it would re-run on every keystroke and panelRef.focus()
  // would steal focus out of inputs (you could only type one word at a time).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title || 'Dialog'}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full ${SIZES[size] || SIZES.md} bg-white dark:bg-dark-card rounded-card shadow-modal max-h-[90vh] flex flex-col outline-none`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-light-border dark:border-dark-border shrink-0">
            <h2 className="font-semibold text-lg text-light-text dark:text-dark-text">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-lg hover:bg-light-card dark:hover:bg-dark-card transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
