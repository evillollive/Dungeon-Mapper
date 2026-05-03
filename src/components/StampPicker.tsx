import React, { useState, useMemo } from 'react';
import type { ToolType, StampCategory } from '../types/map';
import { BUILT_IN_STAMPS, STAMP_CATEGORY_LABELS } from '../utils/stampCatalog';

interface StampPickerProps {
  activeTool: ToolType;
  selectedStampId: string | null;
  onSetTool: (tool: ToolType) => void;
  onSelectStamp: (stampId: string) => void;
  onClearStamps: () => void;
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
}) => {
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');

  const filteredStamps = useMemo(() => {
    if (filterCategory === 'all') return BUILT_IN_STAMPS;
    return BUILT_IN_STAMPS.filter(s => s.category === filterCategory);
  }, [filterCategory]);

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
