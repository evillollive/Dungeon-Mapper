import React from 'react';
import type { CustomThemeDefinition, EdgeBlendSettings, EdgeBlendStyle, HandDrawnSettings, HandDrawnStyle, PaperTexturePattern, PaperTextureSettings, StampDef, ToolType, TileType } from '../types/map';
import { ALL_TILE_TYPES, TILE_LABELS, DEFAULT_PAPER_TEXTURE, DEFAULT_EDGE_BLEND, DEFAULT_HAND_DRAWN, isBuiltInTileType } from '../types/map';
import { drawTileOverlay } from '../themes/tileOverlays';
import { buildThemeList, getCustomTileLabel, getThemeWithCustom } from '../utils/customThemes';
import { getPaperTint } from '../themes';
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
  // Paper texture
  paperTexture?: PaperTextureSettings;
  onSetPaperTexture?: (settings: PaperTextureSettings) => void;
  onUpdatePaperTexture?: (patch: Partial<PaperTextureSettings>) => void;
  onClearPaperTexture?: () => void;
  // Edge blending
  edgeBlend?: EdgeBlendSettings;
  onSetEdgeBlend?: (settings: EdgeBlendSettings) => void;
  onUpdateEdgeBlend?: (patch: Partial<EdgeBlendSettings>) => void;
  onClearEdgeBlend?: () => void;
  // Hand-drawn mode
  handDrawn?: HandDrawnSettings;
  onSetHandDrawn?: (settings: HandDrawnSettings) => void;
  onUpdateHandDrawn?: (patch: Partial<HandDrawnSettings>) => void;
  onClearHandDrawn?: () => void;
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
  onOpenCustomThemeBuilder,
  selectedStampId, onSelectStamp, onClearStamps,
  customStamps, onSaveCustomStamp, onDeleteCustomStamp,
  wallColor, wallThickness, onSetWallColor, onSetWallThickness,
  pathColor, pathWidth, onSetPathColor, onSetPathWidth,
  onClearWalls, onClearPaths,
  paperTexture, onSetPaperTexture, onUpdatePaperTexture, onClearPaperTexture,
  edgeBlend, onSetEdgeBlend, onUpdateEdgeBlend, onClearEdgeBlend,
  handDrawn, onSetHandDrawn, onUpdateHandDrawn, onClearHandDrawn,
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

      {/* Paper Texture layer controls */}
      <div className="toolbar-section">
        <div className="toolbar-label">PAPER TEXTURE</div>
        <label
          className={`tool-btn ${paperTexture?.enabled ? 'active' : ''}`}
          style={{ cursor: 'pointer' }}
          title="Enable a parchment / paper background texture behind the tile grid"
        >
          <span className="tool-icon" aria-hidden="true">📜</span>
          <span className="tool-name">Enable</span>
          <input
            type="checkbox"
            checked={paperTexture?.enabled ?? false}
            onChange={() => {
              if (paperTexture?.enabled) {
                onClearPaperTexture?.();
              } else {
                onSetPaperTexture?.(DEFAULT_PAPER_TEXTURE);
              }
            }}
            aria-label="Enable paper texture"
            style={{ margin: 0 }}
          />
        </label>
        {paperTexture?.enabled && (
          <>
            <label className="tool-btn" style={{ cursor: 'pointer' }} title="Paper texture pattern">
              <span className="tool-icon" aria-hidden="true">🎨</span>
              <span className="tool-name">Pattern</span>
              <select
                className="grid-select"
                value={paperTexture.pattern}
                onChange={e => onUpdatePaperTexture?.({ pattern: e.target.value as PaperTexturePattern })}
                title="Texture pattern"
              >
                <option value="parchment">Parchment</option>
                <option value="linen">Linen</option>
                <option value="canvas">Canvas</option>
                <option value="watercolor">Watercolor</option>
                <option value="marble">Marble</option>
              </select>
            </label>
            <label className="tool-btn" style={{ cursor: 'pointer', flexWrap: 'wrap' }} title={`Opacity: ${Math.round(paperTexture.opacity * 100)}%`}>
              <span className="tool-icon" aria-hidden="true">👁</span>
              <span className="tool-name">Opacity</span>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={paperTexture.opacity}
                onChange={e => onUpdatePaperTexture?.({ opacity: Number(e.target.value) })}
                style={{ width: 60 }}
                title={`Opacity: ${Math.round(paperTexture.opacity * 100)}%`}
              />
            </label>
            <label className="tool-btn" style={{ cursor: 'pointer', flexWrap: 'wrap' }} title={`Grain: ${Math.round(paperTexture.grain * 100)}%`}>
              <span className="tool-icon" aria-hidden="true">🌾</span>
              <span className="tool-name">Grain</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={paperTexture.grain}
                onChange={e => onUpdatePaperTexture?.({ grain: Number(e.target.value) })}
                style={{ width: 60 }}
                title={`Grain: ${Math.round(paperTexture.grain * 100)}%`}
              />
            </label>
            <label className="tool-btn" style={{ cursor: 'pointer', flexWrap: 'wrap' }} title={`Vignette: ${Math.round(paperTexture.vignette * 100)}%`}>
              <span className="tool-icon" aria-hidden="true">🔲</span>
              <span className="tool-name">Vignette</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={paperTexture.vignette}
                onChange={e => onUpdatePaperTexture?.({ vignette: Number(e.target.value) })}
                style={{ width: 60 }}
                title={`Vignette: ${Math.round(paperTexture.vignette * 100)}%`}
              />
            </label>
            <label className="tool-btn" style={{ cursor: 'pointer' }} title="Custom tint colour (overrides theme default)">
              <span className="tool-icon" aria-hidden="true">💧</span>
              <span className="tool-name">Tint</span>
              <input
                type="color"
                value={paperTexture.tintOverride ?? getPaperTint(themeId)}
                onChange={e => onUpdatePaperTexture?.({ tintOverride: e.target.value })}
                style={{ width: 28, height: 20, border: 'none', cursor: 'pointer', padding: 0 }}
                title="Tint colour"
              />
              {paperTexture.tintOverride && (
                <button
                  type="button"
                  className="tool-btn"
                  onClick={() => onUpdatePaperTexture?.({ tintOverride: undefined })}
                  title="Reset to theme default tint"
                  style={{ fontSize: '0.7em', padding: '2px 4px', minWidth: 'auto' }}
                >
                  ↺
                </button>
              )}
            </label>
          </>
        )}
      </div>

      {/* Edge Blending controls */}
      <div className="toolbar-section">
        <div className="toolbar-label">EDGE BLENDING</div>
        <label
          className={`tool-btn ${edgeBlend?.enabled ? 'active' : ''}`}
          style={{ cursor: 'pointer' }}
          title="Soften boundaries between adjacent tile types with stochastic blending"
        >
          <span className="tool-icon" aria-hidden="true">🌊</span>
          <span className="tool-name">Enable</span>
          <input
            type="checkbox"
            checked={edgeBlend?.enabled ?? false}
            onChange={() => {
              if (edgeBlend?.enabled) {
                onClearEdgeBlend?.();
              } else {
                onSetEdgeBlend?.(DEFAULT_EDGE_BLEND);
              }
            }}
            aria-label="Enable edge blending"
            style={{ margin: 0 }}
          />
        </label>
        {edgeBlend?.enabled && (
          <>
            <label className="tool-btn" style={{ cursor: 'pointer' }} title="Blend style">
              <span className="tool-icon" aria-hidden="true">✨</span>
              <span className="tool-name">Style</span>
              <select
                className="grid-select"
                value={edgeBlend.style}
                onChange={e => onUpdateEdgeBlend?.({ style: e.target.value as EdgeBlendStyle })}
                title="Blend style"
              >
                <option value="dither">Dither</option>
                <option value="smooth">Smooth</option>
                <option value="stipple">Stipple</option>
              </select>
            </label>
            <label className="tool-btn" style={{ cursor: 'pointer', flexWrap: 'wrap' }} title={`Intensity: ${Math.round(edgeBlend.intensity * 100)}%`}>
              <span className="tool-icon" aria-hidden="true">📐</span>
              <span className="tool-name">Intensity</span>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={edgeBlend.intensity}
                onChange={e => onUpdateEdgeBlend?.({ intensity: Number(e.target.value) })}
                style={{ width: 60 }}
                title={`Intensity: ${Math.round(edgeBlend.intensity * 100)}%`}
              />
            </label>
            <label className="tool-btn" style={{ cursor: 'pointer', flexWrap: 'wrap' }} title={`Opacity: ${Math.round(edgeBlend.opacity * 100)}%`}>
              <span className="tool-icon" aria-hidden="true">👁</span>
              <span className="tool-name">Opacity</span>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={edgeBlend.opacity}
                onChange={e => onUpdateEdgeBlend?.({ opacity: Number(e.target.value) })}
                style={{ width: 60 }}
                title={`Opacity: ${Math.round(edgeBlend.opacity * 100)}%`}
              />
            </label>
          </>
        )}
      </div>

      {/* Hand-Drawn Mode controls */}
      <div className="toolbar-section">
        <div className="toolbar-label">HAND-DRAWN</div>
        <label
          className={`tool-btn ${handDrawn?.enabled ? 'active' : ''}`}
          style={{ cursor: 'pointer' }}
          title="Render grid with wobbly hand-drawn strokes and cross-hatch shading on walls"
        >
          <span className="tool-icon" aria-hidden="true">✍️</span>
          <span className="tool-name">Enable</span>
          <input
            type="checkbox"
            checked={handDrawn?.enabled ?? false}
            onChange={() => {
              if (handDrawn?.enabled) {
                onClearHandDrawn?.();
              } else {
                onSetHandDrawn?.(DEFAULT_HAND_DRAWN);
              }
            }}
            aria-label="Enable hand-drawn mode"
            style={{ margin: 0 }}
          />
        </label>
        {handDrawn?.enabled && (
          <>
            <label className="tool-btn" style={{ cursor: 'pointer' }} title="Hand-drawn style">
              <span className="tool-icon" aria-hidden="true">🖊️</span>
              <span className="tool-name">Style</span>
              <select
                className="grid-select"
                value={handDrawn.style}
                onChange={e => onUpdateHandDrawn?.({ style: e.target.value as HandDrawnStyle })}
                title="Drawing style"
              >
                <option value="sketchy">Sketchy</option>
                <option value="pencil">Pencil</option>
                <option value="ink">Ink</option>
              </select>
            </label>
            <label className="tool-btn" style={{ cursor: 'pointer', flexWrap: 'wrap' }} title={`Wobble: ${Math.round(handDrawn.wobble * 100)}%`}>
              <span className="tool-icon" aria-hidden="true">〰️</span>
              <span className="tool-name">Wobble</span>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={handDrawn.wobble}
                onChange={e => onUpdateHandDrawn?.({ wobble: Number(e.target.value) })}
                style={{ width: 60 }}
                title={`Wobble: ${Math.round(handDrawn.wobble * 100)}%`}
              />
            </label>
            <label className="tool-btn" style={{ cursor: 'pointer', flexWrap: 'wrap' }} title={`Cross-hatch: ${Math.round(handDrawn.crossHatch * 100)}%`}>
              <span className="tool-icon" aria-hidden="true">▧</span>
              <span className="tool-name">Hatch</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={handDrawn.crossHatch}
                onChange={e => onUpdateHandDrawn?.({ crossHatch: Number(e.target.value) })}
                style={{ width: 60 }}
                title={`Cross-hatch density: ${Math.round(handDrawn.crossHatch * 100)}%`}
              />
            </label>
            <label className="tool-btn" style={{ cursor: 'pointer', flexWrap: 'wrap' }} title={`Opacity: ${Math.round(handDrawn.opacity * 100)}%`}>
              <span className="tool-icon" aria-hidden="true">👁</span>
              <span className="tool-name">Opacity</span>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={handDrawn.opacity}
                onChange={e => onUpdateHandDrawn?.({ opacity: Number(e.target.value) })}
                style={{ width: 60 }}
                title={`Opacity: ${Math.round(handDrawn.opacity * 100)}%`}
              />
            </label>
          </>
        )}
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
