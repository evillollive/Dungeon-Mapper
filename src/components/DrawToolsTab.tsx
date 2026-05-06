import React from 'react';
import type { CustomThemeDefinition, StampDef, ToolType, TileType } from '../types/map';
import { ALL_TILE_TYPES, TILE_LABELS, isBuiltInTileType } from '../types/map';
import { drawTileOverlay } from '../themes/tileOverlays';
import { buildThemeList, getCustomTileLabel, getThemeWithCustom } from '../utils/customThemes';
import StampPicker from './StampPicker';

interface DrawToolsTabProps {
  activeTool: ToolType;
  activeTile: TileType;
  themeId: string;
  customThemes: readonly CustomThemeDefinition[];
  onSetTool: (tool: ToolType) => void;
  onSetTile: (tile: TileType) => void;
  onSetTheme: (theme: string, preserveExisting?: boolean) => void;
  preserveOnThemeSwitch: boolean;
  onTogglePreserveOnThemeSwitch: () => void;
  onOpenCustomThemeBuilder: () => void;
  onOpenGenerateMap: () => void;
  onOpenPremadeMaps: () => void;
  // Stamp tool integration
  selectedStampId: string | null;
  onSelectStamp: (stampId: string) => void;
  onClearStamps: () => void;
  // Custom stamps
  customStamps?: readonly StampDef[];
  onSaveCustomStamp?: (stamp: StampDef) => void;
  onDeleteCustomStamp?: (stampId: string) => void;
  // Wall & Path tools
  wallColor: string;
  wallThickness: number;
  onSetWallColor: (c: string) => void;
  onSetWallThickness: (w: number) => void;
  pathColor: string;
  pathWidth: number;
  onSetPathColor: (c: string) => void;
  onSetPathWidth: (w: number) => void;
  onClearWalls: () => void;
  onClearPaths: () => void;
}

const TOOLS: { id: ToolType; label: string; shortcut: string; icon: string }[] = [
  { id: 'paint',      label: 'Paint',       shortcut: 'P', icon: '✏️' },
  { id: 'erase',      label: 'Erase',       shortcut: 'E', icon: '🧹' },
  { id: 'fill',       label: 'Fill',        shortcut: 'F', icon: '🪣' },
  { id: 'note',       label: 'Add Note',    shortcut: 'N', icon: '📍' },
  { id: 'line',       label: 'Line',        shortcut: 'L', icon: '📏' },
  { id: 'rect',       label: 'Rectangle',   shortcut: 'R', icon: '⬛' },
  { id: 'select',     label: 'Select',      shortcut: 'S', icon: '⬜' },
  { id: 'wall',       label: 'Wall',        shortcut: 'W', icon: '🧱' },
  { id: 'path',       label: 'Path',        shortcut: 'Shift+W', icon: '🛤️' },
];

function TilePreview({
  type,
  size = 28,
  themeId,
  customThemes = [],
}: { type: TileType; size?: number; themeId: string; customThemes?: readonly CustomThemeDefinition[] }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const theme = getThemeWithCustom(themeId, customThemes);
    canvas.width = size;
    canvas.height = size;

    theme.drawTile(ctx, type, 0, 0, size);
    if (isBuiltInTileType(type)) {
      drawTileOverlay(ctx, type, 0, 0, size, theme.tileColors[type]);
    }
  }, [type, size, themeId, customThemes]);

  return (
    <canvas
      ref={canvasRef}
      className="tile-preview"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: '1px solid #2d3561',
        flexShrink: 0,
        verticalAlign: 'middle',
      }}
    />
  );
}

const DrawToolsTab: React.FC<DrawToolsTabProps> = ({
  activeTool, activeTile, themeId, customThemes, onSetTool, onSetTile,
  onSetTheme, preserveOnThemeSwitch, onTogglePreserveOnThemeSwitch,
  onOpenCustomThemeBuilder, onOpenGenerateMap, onOpenPremadeMaps,
  selectedStampId, onSelectStamp, onClearStamps,
  customStamps, onSaveCustomStamp, onDeleteCustomStamp,
  wallColor, wallThickness, onSetWallColor, onSetWallThickness,
  pathColor, pathWidth, onSetPathColor, onSetPathWidth,
  onClearWalls, onClearPaths,
}) => {
  const theme = getThemeWithCustom(themeId, customThemes);
  const themeList = React.useMemo(() => buildThemeList(customThemes), [customThemes]);
  const tileLabels = React.useMemo(() => {
    const map = new Map<TileType, string>();
    for (const t of theme.tiles) map.set(t.id, t.label);
    return map;
  }, [theme]);
  const tileLabel = (tileType: TileType): string =>
    tileLabels.get(tileType) ?? (isBuiltInTileType(tileType) ? TILE_LABELS[tileType] : getCustomTileLabel(tileType, customThemes) ?? 'Custom Tile');
  const paletteTiles = React.useMemo(() => {
    const custom = theme.tiles
      .map(t => t.id)
      .filter(t => !isBuiltInTileType(t));
    return [...ALL_TILE_TYPES, ...custom];
  }, [theme.tiles]);

  return (
    <>
      <div className="toolbar-section">
        <div className="toolbar-label">TOOLS</div>
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            type="button"
            className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => onSetTool(tool.id)}
            title={`${tool.label} [${tool.shortcut}]`}
            aria-label={`${tool.label} tool`}
            aria-pressed={activeTool === tool.id}
            aria-keyshortcuts={tool.shortcut}
          >
            <span className="tool-icon" aria-hidden="true">{tool.icon}</span>
            <span className="tool-name">{tool.label}</span>
            <span className="tool-shortcut" aria-hidden="true">[{tool.shortcut}]</span>
          </button>
        ))}
      </div>

      {/* Wall & Path tool settings — shown when wall/path tool is active */}
      {(activeTool === 'wall' || activeTool === 'wall-erase') && (
        <div className="toolbar-section">
          <div className="toolbar-label">WALL SETTINGS</div>
          <label className="tool-btn" style={{ cursor: 'pointer' }}>
            <span className="tool-icon" aria-hidden="true">🎨</span>
            <span className="tool-name">Color</span>
            <input
              type="color"
              value={wallColor}
              onChange={e => onSetWallColor(e.target.value)}
              style={{ width: 28, height: 20, border: 'none', cursor: 'pointer', padding: 0 }}
              title="Wall color"
            />
          </label>
          <label className="tool-btn" style={{ cursor: 'pointer' }}>
            <span className="tool-icon" aria-hidden="true">📐</span>
            <span className="tool-name">Thickness</span>
            <select
              className="grid-select"
              value={String(wallThickness)}
              onChange={e => onSetWallThickness(Number(e.target.value))}
              title="Wall thickness"
            >
              <option value="0.04">Thin</option>
              <option value="0.08">Medium</option>
              <option value="0.15">Thick</option>
              <option value="0.25">Heavy</option>
            </select>
          </label>
          <button
            type="button"
            className="tool-btn"
            onClick={() => onSetTool('wall-erase')}
            title="Erase wall segments — click a wall to remove it"
            aria-label="Erase walls"
            aria-pressed={activeTool === 'wall-erase'}
          >
            <span className="tool-icon" aria-hidden="true">🧹</span>
            <span className="tool-name">Erase Walls</span>
          </button>
          <button type="button" className="tool-btn" onClick={onClearWalls} title="Remove all wall segments">
            <span className="tool-icon" aria-hidden="true">🗑️</span>
            <span className="tool-name">Clear All</span>
          </button>
        </div>
      )}

      {(activeTool === 'path' || activeTool === 'path-erase') && (
        <div className="toolbar-section">
          <div className="toolbar-label">PATH SETTINGS</div>
          <label className="tool-btn" style={{ cursor: 'pointer' }}>
            <span className="tool-icon" aria-hidden="true">🎨</span>
            <span className="tool-name">Color</span>
            <input
              type="color"
              value={pathColor}
              onChange={e => onSetPathColor(e.target.value)}
              style={{ width: 28, height: 20, border: 'none', cursor: 'pointer', padding: 0 }}
              title="Path color"
            />
          </label>
          <label className="tool-btn" style={{ cursor: 'pointer' }}>
            <span className="tool-icon" aria-hidden="true">📐</span>
            <span className="tool-name">Width</span>
            <select
              className="grid-select"
              value={String(pathWidth)}
              onChange={e => onSetPathWidth(Number(e.target.value))}
              title="Path width"
            >
              <option value="0.15">Narrow</option>
              <option value="0.3">Medium</option>
              <option value="0.5">Wide</option>
              <option value="0.8">Road</option>
            </select>
          </label>
          <button
            type="button"
            className="tool-btn"
            onClick={() => onSetTool('path-erase')}
            title="Erase path segments — click a path to remove it"
            aria-label="Erase paths"
            aria-pressed={activeTool === 'path-erase'}
          >
            <span className="tool-icon" aria-hidden="true">🧹</span>
            <span className="tool-name">Erase Paths</span>
          </button>
          <button type="button" className="tool-btn" onClick={onClearPaths} title="Remove all path segments">
            <span className="tool-icon" aria-hidden="true">🗑️</span>
            <span className="tool-name">Clear All</span>
          </button>
        </div>
      )}

      <div className="toolbar-section">
        <div className="toolbar-label">THEME</div>
        <label
          className="tool-btn"
          style={{ cursor: 'pointer' }}
          title="Map theme — choose the visual style used to render tiles"
        >
          <span className="tool-icon">🗺</span>
          <span className="tool-name">Theme</span>
          <select
            className="grid-select"
            value={themeId}
            onChange={e => onSetTheme(e.target.value, preserveOnThemeSwitch)}
            onClick={e => e.stopPropagation()}
            title="Map theme"
          >
            {themeList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <button
          type="button"
          className="tool-btn"
          onClick={onOpenCustomThemeBuilder}
          title="Create or edit project-scoped custom themes and custom tiles"
          aria-label="Open custom theme builder"
        >
          <span className="tool-icon" aria-hidden="true">🧩</span>
          <span className="tool-name">Custom</span>
        </button>
        <label
          className={`tool-btn ${preserveOnThemeSwitch ? 'active' : ''}`}
          style={{ cursor: 'pointer' }}
          title="When on, switching themes keeps any tiles you've already painted in their original style instead of restyling them. Lets you combine terrain styles on one map. Off by default — newly painted tiles always use the currently selected theme."
        >
          <span className="tool-icon" aria-hidden="true">🎨</span>
          <span className="tool-name">Preserve</span>
          <input
            type="checkbox"
            checked={preserveOnThemeSwitch}
            onChange={onTogglePreserveOnThemeSwitch}
            aria-label="Preserve existing tiles when switching themes"
            style={{ margin: 0 }}
          />
        </label>
        <button
          type="button"
          className="tool-btn"
          onClick={onOpenGenerateMap}
          title="Procedurally generate a random map (dungeon, terrain, cavern, …) in the current theme. Replaces the current map; tile / fog changes can be undone. [G]"
          aria-label="Generate map"
          aria-keyshortcuts="G"
        >
          <span className="tool-icon" aria-hidden="true">🎲</span>
          <span className="tool-name">Generate</span>
          <span className="tool-shortcut" aria-hidden="true">[G]</span>
        </button>
        <button
          type="button"
          className="tool-btn"
          onClick={onOpenPremadeMaps}
          title="Browse and load a ready-to-use sample map with themed names, tokens, light sources, and fog-of-war"
          aria-label="Load sample map"
        >
          <span className="tool-icon" aria-hidden="true">📦</span>
          <span className="tool-name">Samples</span>
        </button>
      </div>

      <div className="toolbar-section">
        <div className="toolbar-label">TILES</div>
        <div className="tile-palette">
          {paletteTiles.map(tileType => (
            <button
              key={tileType}
              type="button"
              className={`tile-btn ${activeTile === tileType ? 'active' : ''}`}
              onClick={() => onSetTile(tileType)}
              title={tileLabel(tileType)}
              aria-label={`${tileLabel(tileType)} tile`}
              aria-pressed={activeTile === tileType}
            >
              <TilePreview type={tileType} size={22} themeId={themeId} customThemes={customThemes} />
              <span className="tile-btn-label">{tileLabel(tileType)}</span>
            </button>
          ))}
        </div>
      </div>

      <StampPicker
        activeTool={activeTool}
        selectedStampId={selectedStampId}
        themeId={themeId}
        onSetTool={onSetTool}
        onSelectStamp={onSelectStamp}
        onClearStamps={onClearStamps}
        customStamps={customStamps}
        onSaveCustomStamp={onSaveCustomStamp}
        onDeleteCustomStamp={onDeleteCustomStamp}
      />
    </>
  );
};

export default DrawToolsTab;
