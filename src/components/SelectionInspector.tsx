import React, { useMemo } from 'react';
import type { PlacedStamp, Token, MapNote, LightSource, DungeonMap, StampDef } from '../types/map';
import { getStampDef } from '../utils/stampCatalog';

// ── Types ──────────────────────────────────────────────────────────────

export interface SelectionInspectorProps {
  // Map data for the empty-state summary
  map: DungeonMap;
  themeId: string;
  themeName: string;

  // Selection IDs
  selectedPlacedStampId: number | null;
  selectedTokenId: number | null;
  selectedNoteId: number | null;

  // Data arrays
  stamps: PlacedStamp[];
  tokens: Token[];
  notes: MapNote[];
  lightSources: LightSource[];
  customStamps?: readonly StampDef[];

  // Stamp callbacks
  onUpdateStamp: (id: number, patch: Partial<Omit<PlacedStamp, 'id' | 'stampId'>>) => void;
  onRemoveStamp: (id: number) => void;
  onBringStampToFront: (id: number) => void;
  onSendStampToBack: (id: number) => void;
  onSelectPlacedStamp: (id: number | null) => void;

  // Token callbacks
  onUpdateToken: (id: number, patch: Partial<Omit<Token, 'id'>>) => void;
  onRemoveToken: (id: number) => void;
  onSelectToken: (id: number | null) => void;

  // Note callbacks
  onUpdateNote: (id: number, label: string, description: string) => void;
  onDeleteNote: (id: number) => void;
  onSelectNote: (id: number | null) => void;

  // Light callbacks
  onRemoveLightSource: (id: number) => void;
}

// ── Token kind labels ──────────────────────────────────────────────────

const TOKEN_KIND_LABELS: Record<string, string> = {
  player: 'Player',
  npc: 'NPC',
  monster: 'Monster',
};

// ── Component ──────────────────────────────────────────────────────────

const SelectionInspector: React.FC<SelectionInspectorProps> = ({
  map,
  themeId,
  themeName,
  selectedPlacedStampId,
  selectedTokenId,
  selectedNoteId,
  stamps,
  tokens,
  notes,
  lightSources,
  customStamps = [],
  onUpdateStamp,
  onRemoveStamp,
  onBringStampToFront,
  onSendStampToBack,
  onSelectPlacedStamp,
  onUpdateToken,
  onRemoveToken,
  onSelectToken,
  onUpdateNote,
  onDeleteNote,
  onSelectNote,
  // Light source removal reserved for future light inspector
  onRemoveLightSource: _removeLightSource,
}) => {
  // ── Resolve selections ──────────────────────────────────────────────

  const selectedStamp = useMemo(
    () => (selectedPlacedStampId != null ? stamps.find(s => s.id === selectedPlacedStampId) ?? null : null),
    [stamps, selectedPlacedStampId],
  );

  const selectedToken = useMemo(
    () => (selectedTokenId != null ? tokens.find(t => t.id === selectedTokenId) ?? null : null),
    [tokens, selectedTokenId],
  );

  const selectedNote = useMemo(
    () => (selectedNoteId != null ? notes.find(n => n.id === selectedNoteId) ?? null : null),
    [notes, selectedNoteId],
  );

  // ── Map summary for the empty state ────────────────────────────────

  const tileCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const tiles = map.tiles;
    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        const t = String(tiles[y][x]);
        counts[t] = (counts[t] ?? 0) + 1;
      }
    }
    return counts;
  }, [map.tiles]);

  // ── Stamp inspector ─────────────────────────────────────────────────

  if (selectedStamp) {
    const stampDef = getStampDef(selectedStamp.stampId, customStamps);
    const stampLabel = stampDef?.name ?? selectedStamp.stampId;

    const handleRotate = (deg: number) => {
      onUpdateStamp(selectedStamp.id, { rotation: (selectedStamp.rotation + deg + 360) % 360 });
    };

    return (
      <div className="selection-inspector" role="region" aria-label="Selection inspector">
        <div className="inspector-header">
          <span className="inspector-type-badge">📌 Stamp</span>
          <button
            type="button"
            className="tool-btn compact"
            onClick={() => onSelectPlacedStamp(null)}
            title="Deselect"
            aria-label="Deselect stamp"
          >✕</button>
        </div>
        <div className="inspector-title">{stampLabel}</div>

        <div className="inspector-section">
          <div className="inspector-section-label">POSITION</div>
          <div className="inspector-row">
            <span className="inspector-field-label">X</span>
            <span className="inspector-field-value">{selectedStamp.x}</span>
            <span className="inspector-field-label" style={{ marginLeft: 8 }}>Y</span>
            <span className="inspector-field-value">{selectedStamp.y}</span>
          </div>
        </div>

        <div className="inspector-section">
          <div className="inspector-section-label">TRANSFORM</div>
          {/* Rotation */}
          <div className="inspector-row">
            <span className="inspector-field-label">Rotate</span>
            <button type="button" className="tool-btn compact" onClick={() => handleRotate(-90)} title="Rotate 90° counter-clockwise" aria-label="Rotate counter-clockwise">↺</button>
            <button type="button" className="tool-btn compact" onClick={() => handleRotate(90)} title="Rotate 90° clockwise [Shift+R]" aria-label="Rotate clockwise">↻</button>
            <span className="inspector-field-value">{selectedStamp.rotation}°</span>
          </div>
          {/* Flip */}
          <div className="inspector-row">
            <span className="inspector-field-label">Flip</span>
            <button
              type="button"
              className={`tool-btn compact ${selectedStamp.flipX ? 'active' : ''}`}
              onClick={() => onUpdateStamp(selectedStamp.id, { flipX: !selectedStamp.flipX })}
              title="Flip horizontally [Shift+H]"
              aria-label="Flip horizontally"
              aria-pressed={selectedStamp.flipX}
            >⇔</button>
            <button
              type="button"
              className={`tool-btn compact ${selectedStamp.flipY ? 'active' : ''}`}
              onClick={() => onUpdateStamp(selectedStamp.id, { flipY: !selectedStamp.flipY })}
              title="Flip vertically [Shift+V]"
              aria-label="Flip vertically"
              aria-pressed={selectedStamp.flipY}
            >⇕</button>
          </div>
          {/* Scale */}
          <div className="inspector-row">
            <span className="inspector-field-label">Scale</span>
            <input
              type="range"
              min="0.25"
              max="4"
              step="0.25"
              value={selectedStamp.scale}
              onChange={e => onUpdateStamp(selectedStamp.id, { scale: parseFloat(e.target.value) })}
              title={`Scale: ${selectedStamp.scale}×`}
              aria-label="Stamp scale"
              className="inspector-slider"
            />
            <span className="inspector-field-value">{selectedStamp.scale}×</span>
          </div>
          {/* Opacity */}
          <div className="inspector-row">
            <span className="inspector-field-label">Opacity</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={selectedStamp.opacity}
              onChange={e => onUpdateStamp(selectedStamp.id, { opacity: parseFloat(e.target.value) })}
              title={`Opacity: ${Math.round(selectedStamp.opacity * 100)}%`}
              aria-label="Stamp opacity"
              className="inspector-slider"
            />
            <span className="inspector-field-value">{Math.round(selectedStamp.opacity * 100)}%</span>
          </div>
        </div>

        <div className="inspector-section">
          <div className="inspector-section-label">ACTIONS</div>
          <div className="inspector-row">
            <button
              type="button"
              className={`tool-btn compact ${selectedStamp.locked ? 'active' : ''}`}
              onClick={() => onUpdateStamp(selectedStamp.id, { locked: !selectedStamp.locked })}
              title={selectedStamp.locked ? 'Unlock stamp' : 'Lock stamp (prevent moving)'}
              aria-label={selectedStamp.locked ? 'Unlock stamp' : 'Lock stamp'}
              aria-pressed={selectedStamp.locked}
            >{selectedStamp.locked ? '🔒' : '🔓'}</button>
            <button type="button" className="tool-btn compact" onClick={() => onBringStampToFront(selectedStamp.id)} title="Bring to front" aria-label="Bring stamp to front">⬆</button>
            <button type="button" className="tool-btn compact" onClick={() => onSendStampToBack(selectedStamp.id)} title="Send to back" aria-label="Send stamp to back">⬇</button>
            <button
              type="button"
              className="tool-btn compact"
              onClick={() => { onRemoveStamp(selectedStamp.id); onSelectPlacedStamp(null); }}
              title="Delete selected stamp [Delete/Backspace]"
              aria-label="Delete stamp"
              style={{ color: '#dc2626' }}
            >🗑</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Token inspector ─────────────────────────────────────────────────

  if (selectedToken) {
    return (
      <div className="selection-inspector" role="region" aria-label="Selection inspector">
        <div className="inspector-header">
          <span className="inspector-type-badge">🎭 Token</span>
          <button
            type="button"
            className="tool-btn compact"
            onClick={() => onSelectToken(null)}
            title="Deselect"
            aria-label="Deselect token"
          >✕</button>
        </div>
        <div className="inspector-title">{selectedToken.label || '(unnamed)'}</div>

        <div className="inspector-section">
          <div className="inspector-section-label">PROPERTIES</div>
          <div className="inspector-row">
            <span className="inspector-field-label">Kind</span>
            <span className="inspector-field-value">{TOKEN_KIND_LABELS[selectedToken.kind] ?? selectedToken.kind}</span>
          </div>
          <div className="inspector-row">
            <span className="inspector-field-label">Position</span>
            <span className="inspector-field-value">({selectedToken.x}, {selectedToken.y})</span>
          </div>
          {(selectedToken.size ?? 1) > 1 && (
            <div className="inspector-row">
              <span className="inspector-field-label">Size</span>
              <span className="inspector-field-value">{selectedToken.size}×{selectedToken.size}</span>
            </div>
          )}
          {selectedToken.icon && (
            <div className="inspector-row">
              <span className="inspector-field-label">Icon</span>
              <span className="inspector-field-value">{selectedToken.icon}</span>
            </div>
          )}
          {selectedToken.color && (
            <div className="inspector-row">
              <span className="inspector-field-label">Color</span>
              <span className="inspector-field-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: selectedToken.color, border: '1px solid #999' }} />
                {selectedToken.color}
              </span>
            </div>
          )}
        </div>

        <div className="inspector-section">
          <div className="inspector-section-label">LABEL</div>
          <input
            type="text"
            className="inspector-text-input"
            value={selectedToken.label}
            onChange={e => onUpdateToken(selectedToken.id, { label: e.target.value })}
            aria-label="Token label"
          />
        </div>

        <div className="inspector-section">
          <div className="inspector-section-label">ACTIONS</div>
          <div className="inspector-row">
            <button
              type="button"
              className="tool-btn compact"
              onClick={() => { onRemoveToken(selectedToken.id); onSelectToken(null); }}
              title="Delete token"
              aria-label="Delete token"
              style={{ color: '#dc2626' }}
            >🗑 Delete</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Note inspector ──────────────────────────────────────────────────

  if (selectedNote) {
    return (
      <div className="selection-inspector" role="region" aria-label="Selection inspector">
        <div className="inspector-header">
          <span className="inspector-type-badge">📝 Note</span>
          <button
            type="button"
            className="tool-btn compact"
            onClick={() => onSelectNote(null)}
            title="Deselect"
            aria-label="Deselect note"
          >✕</button>
        </div>
        <div className="inspector-title">{selectedNote.label || '(untitled)'}</div>

        <div className="inspector-section">
          <div className="inspector-section-label">POSITION</div>
          <div className="inspector-row">
            <span className="inspector-field-label">X</span>
            <span className="inspector-field-value">{selectedNote.x}</span>
            <span className="inspector-field-label" style={{ marginLeft: 8 }}>Y</span>
            <span className="inspector-field-value">{selectedNote.y}</span>
          </div>
          {selectedNote.kind && (
            <div className="inspector-row">
              <span className="inspector-field-label">Kind</span>
              <span className="inspector-field-value">{selectedNote.kind === 'room' ? 'Room' : 'Point of Interest'}</span>
            </div>
          )}
        </div>

        <div className="inspector-section">
          <div className="inspector-section-label">LABEL</div>
          <input
            type="text"
            className="inspector-text-input"
            value={selectedNote.label}
            onChange={e => onUpdateNote(selectedNote.id, e.target.value, selectedNote.description)}
            aria-label="Note label"
          />
        </div>

        <div className="inspector-section">
          <div className="inspector-section-label">DESCRIPTION</div>
          <textarea
            className="inspector-textarea"
            value={selectedNote.description}
            onChange={e => onUpdateNote(selectedNote.id, selectedNote.label, e.target.value)}
            aria-label="Note description"
            rows={3}
          />
        </div>

        <div className="inspector-section">
          <div className="inspector-section-label">ACTIONS</div>
          <div className="inspector-row">
            <button
              type="button"
              className="tool-btn compact"
              onClick={() => { onDeleteNote(selectedNote.id); onSelectNote(null); }}
              title="Delete note"
              aria-label="Delete note"
              style={{ color: '#dc2626' }}
            >🗑 Delete</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty-state: Map info summary ───────────────────────────────────

  const totalTiles = map.meta.width * map.meta.height;
  const floorCount = tileCounts['floor'] ?? 0;
  const wallCount = tileCounts['wall'] ?? 0;
  const emptyCount = tileCounts['empty'] ?? 0;
  const stampCount = stamps.length;
  const tokenCount = tokens.length;
  const noteCount = notes.length;
  const lightCount = lightSources.length;

  return (
    <div className="selection-inspector empty-state" role="region" aria-label="Map information">
      <div className="inspector-header">
        <span className="inspector-type-badge">🗺️ Map Info</span>
      </div>
      <div className="inspector-title">{map.meta.name || '(untitled)'}</div>

      <div className="inspector-section">
        <div className="inspector-section-label">DIMENSIONS</div>
        <div className="inspector-row">
          <span className="inspector-field-label">Size</span>
          <span className="inspector-field-value">{map.meta.width} × {map.meta.height}</span>
        </div>
        <div className="inspector-row">
          <span className="inspector-field-label">Total tiles</span>
          <span className="inspector-field-value">{totalTiles}</span>
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-label">THEME</div>
        <div className="inspector-row">
          <span className="inspector-field-label">Active</span>
          <span className="inspector-field-value">{themeName}</span>
        </div>
        <div className="inspector-row">
          <span className="inspector-field-label">ID</span>
          <span className="inspector-field-value" style={{ fontSize: '0.6rem', opacity: 0.7 }}>{themeId}</span>
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-label">TILE COUNTS</div>
        <div className="inspector-row">
          <span className="inspector-field-label">Floor</span>
          <span className="inspector-field-value">{floorCount}</span>
        </div>
        <div className="inspector-row">
          <span className="inspector-field-label">Wall</span>
          <span className="inspector-field-value">{wallCount}</span>
        </div>
        <div className="inspector-row">
          <span className="inspector-field-label">Empty</span>
          <span className="inspector-field-value">{emptyCount}</span>
        </div>
        {Object.entries(tileCounts)
          .filter(([key]) => !['floor', 'wall', 'empty'].includes(key))
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([key, count]) => (
            <div className="inspector-row" key={key}>
              <span className="inspector-field-label">{key}</span>
              <span className="inspector-field-value">{count}</span>
            </div>
          ))}
      </div>

      <div className="inspector-section">
        <div className="inspector-section-label">OBJECTS</div>
        <div className="inspector-row">
          <span className="inspector-field-label">Stamps</span>
          <span className="inspector-field-value">{stampCount}</span>
        </div>
        <div className="inspector-row">
          <span className="inspector-field-label">Tokens</span>
          <span className="inspector-field-value">{tokenCount}</span>
        </div>
        <div className="inspector-row">
          <span className="inspector-field-label">Notes</span>
          <span className="inspector-field-value">{noteCount}</span>
        </div>
        <div className="inspector-row">
          <span className="inspector-field-label">Lights</span>
          <span className="inspector-field-value">{lightCount}</span>
        </div>
      </div>
    </div>
  );
};

export default SelectionInspector;
