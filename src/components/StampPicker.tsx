import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { ToolType, StampCategory, StampDef } from '../types/map';
import { BUILT_IN_STAMPS, STAMP_CATEGORY_LABELS } from '../utils/stampCatalog';

interface StampPickerProps {
  activeTool: ToolType;
  selectedStampId: string | null;
  /** Current map theme id — used to filter theme-specific stamps. */
  themeId: string;
  onSetTool: (tool: ToolType) => void;
  onSelectStamp: (stampId: string) => void;
  onClearStamps: () => void;
  // Custom stamps
  customStamps?: readonly StampDef[];
  onSaveCustomStamp?: (stamp: StampDef) => void;
  onDeleteCustomStamp?: (stampId: string) => void;
}

const STAMP_TOOLS: { id: ToolType; label: string; icon: string; title: string }[] = [
  { id: 'stamp', label: 'Place', icon: '📌', title: 'Place stamp — click on the map to place the selected stamp' },
  { id: 'move-stamp', label: 'Move', icon: '✋', title: 'Move stamp — drag placed stamps to reposition them' },
  { id: 'remove-stamp', label: 'Remove', icon: '🗑', title: 'Remove stamp — click a placed stamp to delete it' },
];

type FilterCategory = 'all' | 'theme' | StampCategory;
const FILTER_CATEGORIES: FilterCategory[] = ['all', 'theme', 'furniture', 'dungeon-dressing', 'nature', 'structures', 'markers', 'custom'];

const StampPicker: React.FC<StampPickerProps> = ({
  activeTool, selectedStampId, themeId, onSetTool, onSelectStamp, onClearStamps,
  customStamps = [], onSaveCustomStamp, onDeleteCustomStamp,
}) => {
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [uploadName, setUploadName] = useState('');
  const uploadRef = useRef<HTMLInputElement>(null);

  const filteredStamps = useMemo(() => {
    if (filterCategory === 'custom') return customStamps as StampDef[];
    if (filterCategory === 'theme') return BUILT_IN_STAMPS.filter(s => s.themeId === themeId);
    if (filterCategory === 'all') return BUILT_IN_STAMPS.filter(s => !s.themeId || s.themeId === themeId);
    return BUILT_IN_STAMPS.filter(s => s.category === filterCategory && (!s.themeId || s.themeId === themeId));
  }, [filterCategory, customStamps, themeId]);

  const handleCustomUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onSaveCustomStamp) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be 2 MB or smaller.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const name = uploadName.trim() || file.name.replace(/\.[^.]+$/, '');
      const stamp: StampDef = {
        id: `custom-${Date.now()}`,
        name,
        category: 'custom',
        viewBox: '0 0 512 512',
        imageDataUrl: dataUrl,
      };
      onSaveCustomStamp(stamp);
      setUploadName('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [uploadName, onSaveCustomStamp]);

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
          <div key={stamp.id} style={{ position: 'relative', display: 'contents' }}>
            <button
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
              style={{ position: 'relative' }}
            >
              {stamp.imageDataUrl ? (
                <img
                  src={stamp.imageDataUrl}
                  width="32"
                  height="32"
                  alt={stamp.name}
                  style={{ objectFit: 'contain' }}
                />
              ) : (
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
              )}
              <span className="stamp-grid-item-label">{stamp.name}</span>
              {/* Delete overlay for custom stamps */}
              {filterCategory === 'custom' && onDeleteCustomStamp && (
                <button
                  type="button"
                  onClick={ev => { ev.stopPropagation(); onDeleteCustomStamp(stamp.id); }}
                  title={`Delete custom stamp "${stamp.name}"`}
                  aria-label={`Delete stamp ${stamp.name}`}
                  style={{
                    position: 'absolute', top: 1, right: 1,
                    width: 14, height: 14, fontSize: '0.55rem',
                    background: '#dc2626', color: '#fff',
                    border: 'none', borderRadius: 2, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1, padding: 0,
                  }}
                >✕</button>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Custom stamp upload UI */}
      {filterCategory === 'custom' && (
        <div style={{ marginTop: 8 }}>
          <input
            ref={uploadRef}
            type="file"
            accept="image/png,image/svg+xml,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={handleCustomUpload}
            aria-label="Upload custom stamp image"
          />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
            <input
              type="text"
              className="modal-input"
              placeholder="Stamp name…"
              value={uploadName}
              onChange={e => setUploadName(e.target.value)}
              style={{ flex: 1, fontSize: '0.72rem', padding: '2px 4px' }}
              aria-label="Custom stamp name"
            />
          </div>
          <button
            type="button"
            className="tool-btn"
            onClick={() => uploadRef.current?.click()}
            title="Upload PNG/SVG/JPEG/WebP image (max 2 MB)"
            aria-label="Upload custom stamp"
          >
            <span className="tool-icon" aria-hidden="true">⬆️</span>
            <span className="tool-name">Upload Image</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default StampPicker;
