import React from 'react';
import type { ToolType, TileType } from '../types/map';
import { ALL_TILE_TYPES, TILE_LABELS } from '../types/map';
import { getTheme } from '../themes/index';

interface ToolbarProps {
  activeTool: ToolType;
  activeTile: TileType;
  themeId: string;
  onSetTool: (tool: ToolType) => void;
  onSetTile: (tile: TileType) => void;
  preserveOnThemeSwitch: boolean;
  onTogglePreserveOnThemeSwitch: () => void;
}

const TOOLS: { id: ToolType; label: string; shortcut: string; icon: string }[] = [
  { id: 'paint',      label: 'Paint',       shortcut: 'P', icon: '✏️' },
  { id: 'erase',      label: 'Erase',       shortcut: 'E', icon: '🧹' },
  { id: 'fill',       label: 'Fill',        shortcut: 'F', icon: '🪣' },
  { id: 'eyedropper', label: 'Eyedropper',  shortcut: 'I', icon: '💧' },
  { id: 'note',       label: 'Add Note',    shortcut: 'N', icon: '📍' },
  { id: 'line',       label: 'Line',        shortcut: 'L', icon: '📏' },
  { id: 'rect',       label: 'Rectangle',   shortcut: 'R', icon: '⬛' },
  { id: 'select',     label: 'Select',      shortcut: 'S', icon: '⬜' },
];

function TilePreview({ type, size = 28, themeId }: { type: TileType; size?: number; themeId: string }) {
  const color = getTheme(themeId).tileColors[type];
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

const Toolbar: React.FC<ToolbarProps> = ({
  activeTool, activeTile, themeId, onSetTool, onSetTile,
  preserveOnThemeSwitch, onTogglePreserveOnThemeSwitch,
}) => {
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
        <label
          className={`tool-btn ${preserveOnThemeSwitch ? 'active' : ''}`}
          style={{ cursor: 'pointer' }}
          title="When on, switching themes keeps any tiles you've already painted in their original style instead of restyling them. Lets you combine terrain styles on one map. Off by default — newly painted tiles always use the currently selected theme."
        >
          <span className="tool-icon">🎨</span>
          <span className="tool-name">Preserve</span>
          <input
            type="checkbox"
            checked={preserveOnThemeSwitch}
            onChange={onTogglePreserveOnThemeSwitch}
            style={{ margin: 0 }}
          />
        </label>
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
              <TilePreview type={tileType} size={22} themeId={themeId} />
              <span className="tile-btn-label">{TILE_LABELS[tileType]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
