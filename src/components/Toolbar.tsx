import React from 'react';
import type { ToolType, TileType } from '../types/map';
import { ALL_TILE_TYPES, TILE_LABELS } from '../types/map';
import { TILE_COLORS } from '../utils/mapUtils';

interface ToolbarProps {
  activeTool: ToolType;
  activeTile: TileType;
  onSetTool: (tool: ToolType) => void;
  onSetTile: (tile: TileType) => void;
}

const TOOLS: { id: ToolType; label: string; shortcut: string; icon: string }[] = [
  { id: 'paint',      label: 'Paint',       shortcut: 'P', icon: '✏️' },
  { id: 'erase',      label: 'Erase',       shortcut: 'E', icon: '🧹' },
  { id: 'fill',       label: 'Fill',        shortcut: 'F', icon: '🪣' },
  { id: 'eyedropper', label: 'Eyedropper',  shortcut: 'I', icon: '💧' },
  { id: 'note',       label: 'Add Note',    shortcut: 'N', icon: '📍' },
];

function TilePreview({ type, size = 28 }: { type: TileType; size?: number }) {
  const color = TILE_COLORS[type];
  return (
    <span
      className="tile-preview"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        background: color,
        border: '1px solid #2d3561',
        flexShrink: 0,
        verticalAlign: 'middle',
      }}
    />
  );
}

const Toolbar: React.FC<ToolbarProps> = ({ activeTool, activeTile, onSetTool, onSetTile }) => {
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <div className="toolbar-label">TOOLS</div>
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => onSetTool(tool.id)}
            title={`${tool.label} [${tool.shortcut}]`}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-name">{tool.label}</span>
            <span className="tool-shortcut">[{tool.shortcut}]</span>
          </button>
        ))}
      </div>

      <div className="toolbar-section">
        <div className="toolbar-label">TILES</div>
        <div className="tile-palette">
          {ALL_TILE_TYPES.map(tileType => (
            <button
              key={tileType}
              className={`tile-btn ${activeTile === tileType ? 'active' : ''}`}
              onClick={() => onSetTile(tileType)}
              title={TILE_LABELS[tileType]}
            >
              <TilePreview type={tileType} size={22} />
              <span className="tile-btn-label">{TILE_LABELS[tileType]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
