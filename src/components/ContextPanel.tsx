import type { ReactNode } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

function ContextSheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useFocusTrap<HTMLElement>({ onEscape: onClose, layer: 'sheet' });
  return <aside ref={ref} className="right-panel context-panel context-sheet" role="dialog" aria-modal="true" aria-label="Context panel">
    {children}
  </aside>;
}

export default function ContextPanel({ mobile, children, onClose }: { mobile: boolean; children: ReactNode; onClose: () => void }) {
  return mobile ? <ContextSheet onClose={onClose}>{children}</ContextSheet>
    : <aside className="right-panel context-panel" aria-label="Context panel">{children}</aside>;
}
