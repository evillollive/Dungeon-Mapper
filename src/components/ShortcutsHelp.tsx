import React, { useEffect } from 'react';
import type { KeyBinding, ShortcutCategory } from '../hooks/keyBindings';

interface ShortcutsHelpProps {
  bindings: KeyBinding[];
  onClose: () => void;
}

const CATEGORY_ORDER: ShortcutCategory[] = ['Tools', 'View', 'Canvas', 'Edit', 'File', 'Help'];

const ShortcutsHelp: React.FC<ShortcutsHelpProps> = ({ bindings, onClose }) => {
  // Esc closes the modal — handled here so the global shortcut hook can
  // suppress its own bindings while a modal is open without losing the
  // ability to dismiss it.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const grouped = new Map<ShortcutCategory, KeyBinding[]>();
  for (const cat of CATEGORY_ORDER) grouped.set(cat, []);
  for (const b of bindings) {
    const list = grouped.get(b.category);
    if (list) list.push(b);
  }

  return (
    <div
      className="generate-dialog-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-help-title"
    >
      <div className="generate-dialog" style={{ maxWidth: 640 }}>
        <div className="generate-dialog-title-row">
          <h2 id="shortcuts-help-title" className="generate-dialog-title">
            ❓ Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close keyboard shortcuts"
          >
            ✕
          </button>
        </div>
        <div className="shortcuts-help-body">
          {CATEGORY_ORDER.map(cat => {
            const list = grouped.get(cat) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={cat} className="shortcuts-help-section" aria-label={`${cat} shortcuts`}>
                <h3 className="shortcuts-help-heading">{cat}</h3>
                <table className="shortcuts-help-table">
                  <tbody>
                    {list.map(b => (
                      <tr key={b.id}>
                        <th scope="row"><kbd>{b.keys}</kbd></th>
                        <td>{b.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
          <p className="shortcuts-help-note">
            Shortcuts are skipped while you're typing in a text field or while
            a modal dialog is open. Some browser-reserved combinations
            (Ctrl+N, Ctrl+O, Ctrl+S) may not reach the app — use the header
            buttons or the listed alternates as a fallback.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsHelp;
