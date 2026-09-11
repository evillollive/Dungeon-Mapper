import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

type FocusLayer = 'sheet' | 'dialog';
const traps: { container: HTMLElement; layer: FocusLayer }[] = [];

function focusableElements(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(node => {
    if (node.matches(':disabled, input[type="hidden"], [tabindex="-1"]')) return false;
    for (let parent: HTMLElement | null = node; parent; parent = parent.parentElement) {
      if (parent.matches('[hidden], [inert], [aria-hidden="true"]')) return false;
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
      if (parent instanceof HTMLDetailsElement && !parent.open &&
        !parent.querySelector(':scope > summary')?.contains(node)) return false;
    }
    return true;
  });
}

function focusFirst(container: HTMLElement) {
  if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
  (focusableElements(container)[0] ?? container).focus();
}

/**
 * Traps keyboard focus inside the referenced container element.
 *
 * When the hook mounts it moves focus into the container (to the first
 * focusable element or the container itself). Tab / Shift-Tab cycling
 * wraps around the container's focusable descendants. When the hook
 * unmounts it returns focus to the element that was focused before the
 * trap was activated.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  { onEscape, layer = 'dialog' }: { onEscape?: () => void; layer?: FocusLayer } = {},
) {
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const escapeRef = useRef(onEscape);
  useEffect(() => { escapeRef.current = onEscape; }, [onEscape]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    // Responsive sheets may mount underneath an existing dialog on resize.
    // Nested effects may also mount before their parent.
    const childIndex = traps.findIndex(trap => container.contains(trap.container) ||
      (layer === 'sheet' && trap.layer === 'dialog'));
    const entry = { container, layer };
    traps.splice(childIndex < 0 ? traps.length : childIndex, 0, entry);
    const isActive = () => traps.at(-1) === entry;

    if (isActive()) focusFirst(container);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !isActive()) return;
      if (e.key === 'Escape' && escapeRef.current) {
        e.preventDefault();
        e.stopPropagation();
        escapeRef.current();
      }
      if (e.key !== 'Tab') return;

      const nodes = focusableElements(container);
      e.preventDefault();
      if (nodes.length === 0) {
        focusFirst(container);
        return;
      }

      const current = nodes.indexOf(document.activeElement as HTMLElement);
      const next = current < 0 ? (e.shiftKey ? nodes.length - 1 : 0)
        : (current + (e.shiftKey ? -1 : 1) + nodes.length) % nodes.length;
      nodes[next].focus();
    };
    const handleFocusIn = (event: FocusEvent) => {
      if (isActive() && event.target instanceof Node && !container.contains(event.target)) focusFirst(container);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      const ownedFocus = isActive();
      traps.splice(traps.indexOf(entry), 1);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      if (ownedFocus) {
        const remaining = traps.at(-1)?.container;
        const previous = previousFocusRef.current;
        if (previous?.isConnected && (!remaining || remaining.contains(previous))) previous.focus();
        else if (remaining?.isConnected) focusFirst(remaining);
        else document.getElementById('dm-canvas-area')?.focus();
      }
    };
  }, [layer]);

  return containerRef;
}
