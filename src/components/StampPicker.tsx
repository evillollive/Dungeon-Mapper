import React, { useState, useMemo, useCallback } from 'react';
import type { ToolType, StampCategory, PlacedStamp } from '../types/map';
import { BUILT_IN_STAMPS, STAMP_CATEGORY_LABELS } from '../utils/stampCatalog';

interface StampPickerProps {
  activeTool: ToolType;
  selectedStampId: string | null;
  onSetTool: (tool: ToolType) => void;
  onSelectStamp: (stampId: string) => void;
  onClearStamps: () => void;
  // Transform controls
  stamps: PlacedStamp[];
  selectedPlacedStampId: number | null;
  onSelectPlacedStamp: (id: number | null) => void;
  onUpdateStamp: (id: number, patch: Partial<Omit<PlacedStamp, 'id' | 'stampId'>>) => void;
  onRemoveStamp: (id: number) => void;
  onBringToFront: (id: number) => void;
  onSendToBack: (id: number) => void;
}

const STAMP_TOOLS: { id: ToolType; label: string; icon: string; title: string }[] = [
  { id: 'stamp', label: 'Place', icon: '📌', title: 'Place stamp — click on the map to place the selected stamp' },
  { id: 'move-stamp', label: 'Move', icon: '✋', title: 'Move stamp — drag placed stamps to reposition them' },
  { id: 'remove-stamp', label: 'Remove', icon: '🗑', title: 'Remove stamp — click a placed stamp to delete it' },
];

type FilterCategory = 'all' | StampCategory;
const FILTER_CATEGORIES: FilterCategory[] = ['all', 'furniture', 'dungeon-dressing', 'nature', 'structures', 'markers'];

const StampPicker: React.FC<StampPickerProps> = ({
  activeTool, selectedStampId, onSetTool, onSelectStamp, onClearStamps,
  stamps, selectedPlacedStampId, onSelectPlacedStamp, onUpdateStamp, onRemoveStamp,
  onBringToFront, onSendToBack,
}) => {
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');

  const filteredStamps = useMemo(() => {
    if (filterCategory === 'all') return BUILT_IN_STAMPS;
    return BUILT_IN_STAMPS.filter(s => s.category === filterCategory);
  }, [filterCategory]);

  const selectedPlaced = useMemo(
    () => selectedPlacedStampId != null ? stamps.find(s => s.id === selectedPlacedStampId) ?? null : null,
    [stamps, selectedPlacedStampId],
  );

  const handleRotate = useCallback((deg: number) => {
    if (selectedPlacedStampId == null) return;
    const current = selectedPlaced?.rotation ?? 0;
    onUpdateStamp(selectedPlacedStampId, { rotation: (current + deg + 360) % 360 });
  }, [selectedPlacedStampId, selectedPlaced, onUpdateStamp]);

  const handleFlipX = useCallback(() => {
    if (selectedPlacedStampId == null || !selectedPlaced) return;
    onUpdateStamp(selectedPlacedStampId, { flipX: !selectedPlaced.flipX });
  }, [selectedPlacedStampId, selectedPlaced, onUpdateStamp]);

  const handleFlipY = useCallback(() => {
    if (selectedPlacedStampId == null || !selectedPlaced) return;
    onUpdateStamp(selectedPlacedStampId, { flipY: !selectedPlaced.flipY });
  }, [selectedPlacedStampId, selectedPlaced, onUpdateStamp]);

  return (
    <div className="toolbar-section">
      <div className="toolbar-label">STAMPS</div>

      {/* Stamp tool buttons */}
      <div className="stamp-tools">
        {STAMP_TOOLS.map(tool => (
          <button
            key={tool.id}
            type="button"
            className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => onSetTool(tool.id)}
            title={tool.title}
            aria-label={`${tool.label} stamp tool`}
            aria-pressed={activeTool === tool.id}
          >
            <span className="tool-icon" aria-hidden="true">{tool.icon}</span>
            <span className="tool-name">{tool.label}</span>
          </button>
        ))}
        <button
          type="button"
          className="tool-btn"
          onClick={onClearStamps}
          title="Remove all placed stamps from the current level"
          aria-label="Clear all stamps"
        >
          <span className="tool-icon" aria-hidden="true">🧹</span>
          <span className="tool-name">Clear</span>
        </button>
      </div>

      {/* Transform controls — shown when a placed stamp is selected */}
      {selectedPlaced && (
        <div className="stamp-transform-controls">
          <div className="toolbar-label" style={{ fontSize: '0.7rem', marginBottom: '2px' }}>
            SELECTED STAMP
            <button
              type="button"
              className="tool-btn"
              onClick={() => onSelectPlacedStamp(null)}
              title="Deselect stamp"
              aria-label="Deselect stamp"
              style={{ marginLeft: 'auto', padding: '0 4px', fontSize: '0.65rem' }}
            >✕</button>
          </div>

          {/* Rotation */}
          <div className="stamp-transform-row">
            <span className="stamp-transform-label">Rotate</span>
            <button type="button" className="tool-btn compact" onClick={() => handleRotate(-90)} title="Rotate 90° counter-clockwise" aria-label="Rotate counter-clockwise">↺</button>
            <button type="button" className="tool-btn compact" onClick={() => handleRotate(90)} title="Rotate 90° clockwise [Shift+R]" aria-label="Rotate clockwise">↻</button>
            <span className="stamp-transform-value">{selectedPlaced.rotation}°</span>
          </div>

          {/* Flip */}
          <div className="stamp-transform-row">
            <span className="stamp-transform-label">Flip</span>
            <button type="button" className={`tool-btn compact ${selectedPlaced.flipX ? 'active' : ''}`} onClick={handleFlipX} title="Flip horizontally [Shift+H]" aria-label="Flip horizontally" aria-pressed={selectedPlaced.flipX}>⇔</button>
            <button type="button" className={`tool-btn compact ${selectedPlaced.flipY ? 'active' : ''}`} onClick={handleFlipY} title="Flip vertically [Shift+V]" aria-label="Flip vertically" aria-pressed={selectedPlaced.flipY}>⇕</button>
          </div>

          {/* Scale */}
          <div className="stamp-transform-row">
            <span className="stamp-transform-label">Scale</span>
            <input
              type="range"
              min="0.25"
              max="4"
              step="0.25"
              value={selectedPlaced.scale}
              onChange={e => onUpdateStamp(selectedPlacedStampId!, { scale: parseFloat(e.target.value) })}
              title={`Scale: ${selectedPlaced.scale}×`}
              aria-label="Stamp scale"
              className="stamp-slider"
            />
            <span className="stamp-transform-value">{selectedPlaced.scale}×</span>
          </div>

          {/* Opacity */}
          <div className="stamp-transform-row">
            <span className="stamp-transform-label">Opacity</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={selectedPlaced.opacity}
              onChange={e => onUpdateStamp(selectedPlacedStampId!, { opacity: parseFloat(e.target.value) })}
              title={`Opacity: ${Math.round(selectedPlaced.opacity * 100)}%`}
              aria-label="Stamp opacity"
              className="stamp-slider"
            />
            <span className="stamp-transform-value">{Math.round(selectedPlaced.opacity * 100)}%</span>
          </div>

          {/* Lock + Z-order + Delete */}
          <div className="stamp-transform-row">
            <button
              type="button"
              className={`tool-btn compact ${selectedPlaced.locked ? 'active' : ''}`}
              onClick={() => onUpdateStamp(selectedPlacedStampId!, { locked: !selectedPlaced.locked })}
              title={selectedPlaced.locked ? 'Unlock stamp' : 'Lock stamp (prevent moving)'}
              aria-label={selectedPlaced.locked ? 'Unlock stamp' : 'Lock stamp'}
              aria-pressed={selectedPlaced.locked}
            >{selectedPlaced.locked ? '🔒' : '🔓'}</button>
            <button type="button" className="tool-btn compact" onClick={() => onBringToFront(selectedPlacedStampId!)} title="Bring to front" aria-label="Bring stamp to front">⬆</button>
            <button type="button" className="tool-btn compact" onClick={() => onSendToBack(selectedPlacedStampId!)} title="Send to back" aria-label="Send stamp to back">⬇</button>
            <button
              type="button"
              className="tool-btn compact"
              onClick={() => { onRemoveStamp(selectedPlacedStampId!); onSelectPlacedStamp(null); }}
              title="Delete selected stamp [Delete/Backspace]"
              aria-label="Delete stamp"
              style={{ color: '#dc2626' }}
            >🗑</button>
          </div>
        </div>
      )}

      {/* Category filter tabs */}
      <div className="stamp-category-tabs" role="tablist" aria-label="Stamp categories">
        {FILTER_CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            role="tab"
            className={`stamp-category-tab ${filterCategory === cat ? 'active' : ''}`}
            onClick={() => setFilterCategory(cat)}
            aria-selected={filterCategory === cat}
            aria-label={`Show ${STAMP_CATEGORY_LABELS[cat]} stamps`}
          >
            {STAMP_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Stamp grid */}
      <div className="stamp-grid" role="listbox" aria-label="Available stamps">
        {filteredStamps.map(stamp => (
          <button
            key={stamp.id}
            type="button"
            role="option"
            className={`stamp-grid-item ${selectedStampId === stamp.id ? 'active' : ''}`}
            onClick={() => {
              onSelectStamp(stamp.id);
              if (activeTool !== 'stamp' && activeTool !== 'move-stamp' && activeTool !== 'remove-stamp') {
                onSetTool('stamp');
              }
            }}
            title={stamp.name}
            aria-label={stamp.name}
            aria-selected={selectedStampId === stamp.id}
          >
            <svg
              viewBox={stamp.viewBox}
              width="32"
              height="32"
              fill="none"
              stroke="currentColor"
              strokeWidth="20"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {stamp.svgPath && <path d={stamp.svgPath} />}
              {stamp.paths?.map((p, i) => (
                <path
                  key={i}
                  d={p.path}
                  fill={p.fill ?? 'none'}
                  stroke={p.stroke ?? 'currentColor'}
                  strokeWidth={p.strokeWidth ?? 20}
                />
              ))}
            </svg>
            <span className="stamp-grid-item-label">{stamp.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StampPicker;
