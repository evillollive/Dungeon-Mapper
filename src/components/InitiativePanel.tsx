import React, { useState } from 'react';
import type { Token, ViewMode } from '../types/map';
import { TOKEN_KIND_COLORS } from '../types/map';
import { ICON_BY_ID } from '../utils/iconLibrary';

/**
 * Right-hand-side panel showing the active turn order. Tokens are listed in
 * the order they were placed; the GM can drag entries to reorder them. Each
 * entry is clickable to highlight the corresponding token on the map. The
 * GM (only) may rename entries inline and clear the entire list.
 *
 * The component is shown in both GM and Player views so everyone at the
 * table can see whose turn is up. Player view is read-only — no rename,
 * no reorder, no clear.
 */

interface InitiativePanelProps {
  tokens: Token[];
  /** Ordered list of token ids defining the initiative order. */
  initiative: number[];
  /** Currently highlighted token (also rendered with a ring on the map). */
  selectedTokenId: number | null;
  onSelectToken: (id: number | null) => void;
  /** Rename a token (the entry's display label). GM-only. */
  onRenameToken: (id: number, label: string) => void;
  /** Reorder the initiative list by moving an entry. GM-only. */
  onReorder: (fromIndex: number, toIndex: number) => void;
  /** Wipe the entire initiative list. Tokens themselves are preserved. */
  onClear: () => void;
  viewMode: ViewMode;
}

const InitiativePanel: React.FC<InitiativePanelProps> = ({
  tokens, initiative, selectedTokenId, onSelectToken,
  onRenameToken, onReorder, onClear, viewMode,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const isGm = viewMode === 'gm';

  // Resolve initiative ids to live token records, dropping any stale ids
  // (defensive — `removeToken` already prunes initiative, but a hand-edited
  // map could leave a dangling id).
  const tokensById = React.useMemo(() => {
    const map = new Map<number, Token>();
    for (const t of tokens) map.set(t.id, t);
    return map;
  }, [tokens]);
  const entries = initiative
    .map(id => tokensById.get(id))
    .filter((t): t is Token => !!t);

  const startEdit = (token: Token) => {
    setEditingId(token.id);
    setEditLabel(token.label);
  };

  const saveEdit = (id: number) => {
    const trimmed = editLabel.trim();
    if (trimmed.length > 0) onRenameToken(id, trimmed);
    setEditingId(null);
  };

  const handleClear = () => {
    if (entries.length === 0) return;
    if (window.confirm('Clear the initiative list? Tokens on the map will be left alone.')) {
      onClear();
    }
  };

  return (
    <div className="initiative-panel">
      <div className="initiative-header">
        <span className="toolbar-label">INITIATIVE</span>
        {isGm && entries.length > 0 && (
          <button
            type="button"
            className="initiative-clear-btn"
            onClick={handleClear}
            title="Clear the initiative list. Tokens stay on the map."
          >
            Clear
          </button>
        )}
      </div>

      {entries.length === 0 && (
        <div className="initiative-empty">
          No tokens yet.<br />
          {isGm
            ? 'Place a token from the Tokens section to add it here.'
            : 'Drop a token on the map to add it here.'}
        </div>
      )}

      <div className="initiative-list">
        {entries.map((token, idx) => {
          const isSelected = token.id === selectedTokenId;
          const isDragOver = isGm && dragOverIndex === idx && dragIndex !== null && dragIndex !== idx;
          return (
            <div
              key={token.id}
              className={[
                'initiative-item',
                isSelected ? 'selected' : '',
                isDragOver ? 'drag-over' : '',
              ].filter(Boolean).join(' ')}
              draggable={isGm && editingId !== token.id}
              onDragStart={isGm ? (e) => {
                setDragIndex(idx);
                // Required for Firefox to actually start the drag.
                e.dataTransfer.effectAllowed = 'move';
                try { e.dataTransfer.setData('text/plain', String(idx)); } catch { /* ignore */ }
              } : undefined}
              onDragOver={isGm ? (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverIndex !== idx) setDragOverIndex(idx);
              } : undefined}
              onDragLeave={isGm ? () => {
                if (dragOverIndex === idx) setDragOverIndex(null);
              } : undefined}
              onDrop={isGm ? (e) => {
                e.preventDefault();
                if (dragIndex !== null && dragIndex !== idx) onReorder(dragIndex, idx);
                setDragIndex(null);
                setDragOverIndex(null);
              } : undefined}
              onDragEnd={isGm ? () => {
                setDragIndex(null);
                setDragOverIndex(null);
              } : undefined}
              onClick={() => onSelectToken(isSelected ? null : token.id)}
            >
              <span className="initiative-order">{idx + 1}</span>
              <span
                className="initiative-swatch"
                style={{
                  background: token.color ?? TOKEN_KIND_COLORS[token.kind],
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={token.kind}
              >
                {(() => {
                  const iconDef = token.icon ? ICON_BY_ID.get(token.icon) : undefined;
                  if (iconDef) {
                    return (
                      <svg viewBox="0 0 512 512" width={12} height={12} aria-hidden="true">
                        <path d={iconDef.path} fill="#ffffff" />
                      </svg>
                    );
                  }
                  return null;
                })()}
              </span>
              {editingId === token.id ? (
                <input
                  className="initiative-input"
                  value={editLabel}
                  autoFocus
                  onChange={e => setEditLabel(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onBlur={() => saveEdit(token.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); saveEdit(token.id); }
                    else if (e.key === 'Escape') { e.preventDefault(); setEditingId(null); }
                  }}
                />
              ) : (
                <span className="initiative-name" title={token.label}>{token.label}</span>
              )}
              {isGm && editingId !== token.id && (
                <button
                  type="button"
                  className="initiative-edit-btn"
                  onClick={e => { e.stopPropagation(); startEdit(token); }}
                  title="Rename"
                >✎</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InitiativePanel;
