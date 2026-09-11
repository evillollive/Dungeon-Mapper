import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { ToolType, StampCategory, StampDef } from '../types/map';
import { BUILT_IN_STAMPS, STAMP_CATEGORY_LABELS } from '../utils/stampCatalog';
import { useAssetFavorites } from '../hooks/useAssetFavorites';
import { FOLIO_THEME_ID } from '../themes/folio-v1/art';

interface StampPickerProps {
  activeTool: ToolType;
  selectedStampId: string | null;
  /** Current map theme id — used to filter theme-specific stamps. */
  themeId: string;
  onSetTool: (tool: ToolType) => void;
  onSelectStamp: (stampId: string) => void;
  onClearStamps: () => void;
  unavailableFolioFurnishings?: boolean;
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
  unavailableFolioFurnishings,
  customStamps = [], onSaveCustomStamp, onDeleteCustomStamp,
}) => {
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [uploadName, setUploadName] = useState('');
  const uploadRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { favorites, toggle, error } = useAssetFavorites('stamps');

  const filteredStamps = useMemo(() => {
    return [...BUILT_IN_STAMPS, ...customStamps].filter(stamp =>
      (filterCategory === 'all' ? !stamp.themeId || stamp.themeId === themeId :
        filterCategory === 'theme' ? stamp.themeId === themeId :
          stamp.category === filterCategory && (!stamp.themeId || stamp.themeId === themeId)) &&
      `${stamp.name} ${stamp.category}`.toLowerCase().includes(query.trim().toLowerCase()) &&
      (!favoritesOnly || favorites.includes(stamp.id)));
  }, [filterCategory, customStamps, themeId, query, favoritesOnly, favorites]);

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
      {themeId === FOLIO_THEME_ID && <p className="folio-pack-preview">
        Dungeon Folio furnishings v1. Choose Theme to see the eight-piece set.
        Sizes start in a common cell scale; each placed object remains adjustable.
      </p>}
      {unavailableFolioFurnishings && <p role="status">
        A saved Folio furnishing is unavailable. A placeholder is shown; its saved ID is retained.
      </p>}
      <label className="asset-search">Search stamps<input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <button type="button" className="tool-btn" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(!favoritesOnly)}>Favorite stamps only</button>
      {error && <p role="status">{error}</p>}
      <p role="status">{filteredStamps.length} stamps</p>

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
      <div className="stamp-grid" role="group" aria-label="Available stamps">
        {filteredStamps.map(stamp => (
          <div key={stamp.id} className="asset-card">
            <button
              type="button"
              className={`stamp-grid-item ${selectedStampId === stamp.id ? 'active' : ''}`}
              onClick={() => {
                onSelectStamp(stamp.id);
                if (activeTool !== 'stamp' && activeTool !== 'move-stamp' && activeTool !== 'remove-stamp') {
                  onSetTool('stamp');
                }
              }}
              title={stamp.name}
              aria-label={stamp.name}
              aria-pressed={selectedStampId === stamp.id}
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
                      stroke={p.stroke ?? 'none'}
                      strokeWidth={p.strokeWidth ?? 20}
                    />
                  ))}
                </svg>
              )}
              <span className="stamp-grid-item-label">{stamp.name}</span>
            </button>
            <button type="button" className="asset-favorite" aria-label={`Favorite ${stamp.name}`} aria-pressed={favorites.includes(stamp.id)}
              onClick={() => toggle(stamp.id)}>{favorites.includes(stamp.id) ? 'Favorited' : 'Favorite'}</button>
            {/* Delete button outside the stamp button to avoid nested interactive elements */}
            {stamp.category === 'custom' && onDeleteCustomStamp && (
              <button
                type="button"
                onClick={() => onDeleteCustomStamp(stamp.id)}
                title={`Delete custom stamp "${stamp.name}"`}
                aria-label={`Delete stamp ${stamp.name}`}
                className="asset-delete"
              >Delete</button>
            )}
          </div>
        ))}
      </div>
      {filteredStamps.length === 0 && <p>No matching stamps. Change the search, category or favorites filter.</p>}

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
