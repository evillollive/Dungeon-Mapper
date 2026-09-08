import type { ReactNode } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import Icon from './Icon';

export default function ShellDialog({ title, onClose, children }: {
  title: string; onClose: () => void; children: ReactNode;
}) {
  const ref = useFocusTrap<HTMLDivElement>();
  return <div className="shell-dialog-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={ref} className="shell-dialog" role="dialog" aria-modal="true" aria-label={title}
      onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
      <div className="shell-dialog-heading"><h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label={`Close ${title}`}><Icon name="close" />Close</button>
      </div>
      {children}
    </div>
  </div>;
}
