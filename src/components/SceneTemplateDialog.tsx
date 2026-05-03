import React, { useState } from 'react';
import type { SceneTemplate } from '../types/map';

interface SceneTemplateDialogProps {
  templates: SceneTemplate[];
  /** Current selection to save as a template (null if no selection active). */
  selection: { x: number; y: number; w: number; h: number } | null;
  onSave: (name: string, sel: { x: number; y: number; w: number; h: number }) => void;
  onDelete: (templateId: string) => void;
  onRename: (templateId: string, newName: string) => void;
  onApply: (templateId: string, ox: number, oy: number) => void;
  onClose: () => void;
}

const SceneTemplateDialog: React.FC<SceneTemplateDialogProps> = ({
  templates,
  selection,
  onSave,
  onDelete,
  onRename,
  onApply,
  onClose,
}) => {
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [applyX, setApplyX] = useState(0);
  const [applyY, setApplyY] = useState(0);

  const handleSave = () => {
    const name = newName.trim();
    if (!name || !selection) return;
    onSave(name, selection);
    setNewName('');
  };

  const handleStartRename = (t: SceneTemplate) => {
    setRenamingId(t.id);
    setRenameValue(t.name);
  };

  const handleRename = () => {
    if (!renamingId) return;
    const name = renameValue.trim();
    if (name) onRename(renamingId, name);
    setRenamingId(null);
  };

  const handleApply = () => {
    if (!applyingId) return;
    onApply(applyingId, applyX, applyY);
    setApplyingId(null);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Scene Templates">
      <div className="modal-panel" style={{ minWidth: 340, maxWidth: 480 }}>
        <div className="modal-header">
          <span>📋 Scene Templates</span>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Save new template from selection */}
        <div className="modal-section">
          <div className="modal-section-label">Save from Selection</div>
          {selection ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="text"
                className="modal-input"
                placeholder="Template name…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                style={{ flex: 1 }}
                aria-label="New template name"
              />
              <button
                type="button"
                className="tool-btn"
                onClick={handleSave}
                disabled={!newName.trim()}
                aria-label="Save template"
              >Save</button>
            </div>
          ) : (
            <div style={{ fontSize: '0.75rem', opacity: 0.65 }}>
              Use the Select tool to choose a region, then open this dialog to save it as a template.
            </div>
          )}
        </div>

        {/* Template list */}
        <div className="modal-section" style={{ maxHeight: 320, overflowY: 'auto' }}>
          <div className="modal-section-label">Saved Templates ({templates.length})</div>
          {templates.length === 0 && (
            <div style={{ fontSize: '0.75rem', opacity: 0.55 }}>No templates yet.</div>
          )}
          {templates.map(t => (
            <div key={t.id} style={{ marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
              {renamingId === t.id ? (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
                  <input
                    type="text"
                    className="modal-input"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenamingId(null); }}
                    style={{ flex: 1 }}
                    autoFocus
                    aria-label="Rename template"
                  />
                  <button type="button" className="tool-btn compact" onClick={handleRename} aria-label="Confirm rename">✓</button>
                  <button type="button" className="tool-btn compact" onClick={() => setRenamingId(null)} aria-label="Cancel rename">✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{t.name}</span>
                  <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>{t.width}×{t.height}</span>
                </div>
              )}
              {applyingId === t.id ? (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.72rem' }}>
                    X: <input
                      type="number"
                      className="modal-input"
                      value={applyX}
                      onChange={e => setApplyX(Number(e.target.value))}
                      style={{ width: 52 }}
                      aria-label="Apply X offset"
                    />
                  </label>
                  <label style={{ fontSize: '0.72rem' }}>
                    Y: <input
                      type="number"
                      className="modal-input"
                      value={applyY}
                      onChange={e => setApplyY(Number(e.target.value))}
                      style={{ width: 52 }}
                      aria-label="Apply Y offset"
                    />
                  </label>
                  <button type="button" className="tool-btn compact" onClick={handleApply} aria-label="Confirm apply">Apply</button>
                  <button type="button" className="tool-btn compact" onClick={() => setApplyingId(null)} aria-label="Cancel apply">Cancel</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    className="tool-btn compact"
                    onClick={() => { setApplyingId(t.id); setApplyX(0); setApplyY(0); }}
                    title="Apply this template to the map at a given offset"
                    aria-label={`Apply template ${t.name}`}
                  >📌 Apply</button>
                  <button
                    type="button"
                    className="tool-btn compact"
                    onClick={() => handleStartRename(t)}
                    title="Rename this template"
                    aria-label={`Rename template ${t.name}`}
                  >✏️</button>
                  <button
                    type="button"
                    className="tool-btn compact"
                    onClick={() => onDelete(t.id)}
                    title="Delete this template"
                    aria-label={`Delete template ${t.name}`}
                    style={{ color: '#dc2626' }}
                  >🗑</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SceneTemplateDialog;
