import { useEffect } from 'react';

/**
 * Dismisses a floating element (dropdown/menu/suggestions) when the user clicks
 * outside it OR scrolls the page. Prevents the two common bugs: menus that stay
 * open after clicking elsewhere, and menus that keep the page height inflated so
 * it "scrolls down".
 *
 * @param {React.RefObject} ref     - wrapper element that should stay "inside"
 * @param {() => void} onDismiss     - called to close the element
 * @param {boolean} active           - only listen while the element is open
 */
export default function useClickOutside(ref, onDismiss, active = true) {
  useEffect(() => {
    if (!active) return undefined;

    const handlePointer = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onDismiss();
    };
    // Closing on scroll also collapses the extra document height the open menu
    // added, which is what made the page appear to "scroll down".
    const handleScroll = () => onDismiss();

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [ref, onDismiss, active]);
}
