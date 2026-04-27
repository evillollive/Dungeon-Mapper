import React from 'react';
import type { ToolType, TileType, MarkerShape } from '../types/map';
import { ALL_TILE_TYPES, TILE_LABELS, MARKER_SHAPES, MARKER_COLORS, MARKER_SHAPE_LABELS } from '../types/map';
import { getTheme, THEME_LIST } from '../themes/index';
import { drawTileOverlay } from '../themes/tileOverlays';
import TokenToolsSection from './TokenToolsSection';

interface ToolbarProps {
  activeTool: ToolType;
  activeTile: TileType;
  themeId: string;
  onSetTool: (tool: ToolType) => void;
  onSetTile: (tile: TileType) => void;
  onSetTheme: (theme: string, preserveExisting?: boolean) => void;
  preserveOnThemeSwitch: boolean;
  onTogglePreserveOnThemeSwitch: () => void;
  fogEnabled: boolean;
  /**
   * GM-only preview toggle. The fog-of-war controls themselves now live in
   * the Player toolbar (the GM still drives the map even on the player
   * side), but the GM may opt in to a translucent overlay so they can see
   * which cells are currently hidden from players.
   */
  gmShowFog: boolean;
  onToggleGmShowFog: () => void;
  /** Open the procedural map-generation dialog. GM-only. */
  onOpenGenerateMap: () => void;
  // Shape marker tool settings
  markerShape: MarkerShape;
  markerColor: string;
  markerSize: number;
  onSetMarkerShape: (s: MarkerShape) => void;
  onSetMarkerColor: (c: string) => void;
  onSetMarkerSize: (s: number) => void;
  onClearMarkers: () => void;
}

const TOOLS: { id: ToolType; label: string; shortcut: string; icon: string }[] = [
  { id: 'paint',      label: 'Paint',       shortcut: 'P', icon: '✏️' },
  { id: 'erase',      label: 'Erase',       shortcut: 'E', icon: '🧹' },
  { id: 'fill',       label: 'Fill',        shortcut: 'F', icon: '🪣' },
  { id: 'note',       label: 'Add Note',    shortcut: 'N', icon: '📍' },
  { id: 'line',       label: 'Line',        shortcut: 'L', icon: '📏' },
  { id: 'rect',       label: 'Rectangle',   shortcut: 'R', icon: '⬛' },
  { id: 'select',     label: 'Select',      shortcut: 'S', icon: '⬜' },
];

function TilePreview({ type, size = 28, themeId }: { type: TileType; size?: number; themeId: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const theme = getTheme(themeId);
    canvas.width = size;
    canvas.height = size;

    // Draw themed tile at position (0,0).
    theme.drawTile(ctx, type, 0, 0, size);
    // Add print-mode-inspired glyph overlay.
    drawTileOverlay(ctx, type, 0, 0, size, theme.tileColors[type]);
  }, [type, size, themeId]);

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

const Toolbar: React.FC<ToolbarProps> = ({
  activeTool, activeTile, themeId, onSetTool, onSetTile,
  onSetTheme, preserveOnThemeSwitch, onTogglePreserveOnThemeSwitch,
  fogEnabled, gmShowFog, onToggleGmShowFog, onOpenGenerateMap,
  markerShape, markerColor, markerSize, onSetMarkerShape, onSetMarkerColor,
  onSetMarkerSize, onClearMarkers,
}) => {
  const theme = getTheme(themeId);
  const tileLabels = React.useMemo(() => {
    const map = new Map<TileType, string>();
    for (const t of theme.tiles) map.set(t.id, t.label);
    return map;
  }, [theme]);
  const tileLabel = (tileType: TileType): string =>
    tileLabels.get(tileType) ?? TILE_LABELS[tileType];
  return (
    <div className="toolbar">
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
            {THEME_LIST.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
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
      </div>

      <div className="toolbar-section">
        <div className="toolbar-label">FOG OF WAR</div>
        <label
          className={`tool-btn ${gmShowFog ? 'active' : ''}`}
          style={{ cursor: 'pointer' }}
          title={
            fogEnabled
              ? 'Show Fog (preview) — overlay a translucent grey wash on cells that are currently hidden from players. The map stays visible to you; this is a GM-only preview. Fog controls live on the Player toolbar.'
              : 'Show Fog has no effect until fog-of-war is enabled. Switch to the Player view to enable fog and reveal/hide cells.'
          }
        >
          <span className="tool-icon" aria-hidden="true">🌫</span>
          <span className="tool-name">Show Fog</span>
          <input
            type="checkbox"
            checked={gmShowFog}
            onChange={onToggleGmShowFog}
            disabled={!fogEnabled}
            aria-label="Show fog preview overlay"
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
              type="button"
              className={`tile-btn ${activeTile === tileType ? 'active' : ''}`}
              onClick={() => onSetTile(tileType)}
              title={tileLabel(tileType)}
              aria-label={`${tileLabel(tileType)} tile`}
              aria-pressed={activeTile === tileType}
            >
              <TilePreview type={tileType} size={22} themeId={themeId} />
              <span className="tile-btn-label">{tileLabel(tileType)}</span>
            </button>
          ))}
        </div>
      </div>

      <TokenToolsSection activeTool={activeTool} onSetTool={onSetTool} />

      <div className="toolbar-section">
        <div className="toolbar-label">MARKERS</div>
        <button
          type="button"
          className={`tool-btn ${activeTool === 'marker' ? 'active' : ''}`}
          onClick={() => onSetTool('marker')}
          title="Place a shape marker (spell area, hazard zone, etc.)"
          aria-label="Place marker"
          aria-pressed={activeTool === 'marker'}
        >
          <span className="tool-icon" aria-hidden="true">🔵</span>
          <span className="tool-name">Place</span>
        </button>
        <button
          type="button"
          className={`tool-btn ${activeTool === 'remove-marker' ? 'active' : ''}`}
          onClick={() => onSetTool('remove-marker')}
          title="Remove a marker — click a marker to delete it."
          aria-label="Remove marker"
          aria-pressed={activeTool === 'remove-marker'}
        >
          <span className="tool-icon" aria-hidden="true">✕</span>
          <span className="tool-name">Remove</span>
        </button>
        <button
          type="button"
          className="tool-btn"
          onClick={onClearMarkers}
          title="Remove all markers from the map."
          aria-label="Clear all markers"
        >
          <span className="tool-icon" aria-hidden="true">🗑</span>
          <span className="tool-name">Clear All</span>
        </button>
        <div className="toolbar-sub-label" style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, marginBottom: 2 }}>Shape</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {MARKER_SHAPES.map(s => (
            <button
              key={s}
              type="button"
              className={`tile-btn ${markerShape === s ? 'active' : ''}`}
              onClick={() => onSetMarkerShape(s)}
              title={MARKER_SHAPE_LABELS[s]}
              aria-label={`${MARKER_SHAPE_LABELS[s]} marker shape`}
              aria-pressed={markerShape === s}
              style={{ padding: 2, width: 'auto' }}
            >
              <span aria-hidden="true" style={{ fontSize: 16 }}>
                {s === 'circle' ? '●' : s === 'square' ? '■' : '◆'}
              </span>
            </button>
          ))}
        </div>
        <div className="toolbar-sub-label" style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, marginBottom: 2 }}>Color</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {MARKER_COLORS.map(c => (
            <button
              key={c}
              type="button"
              className={`tile-btn ${markerColor === c ? 'active' : ''}`}
              onClick={() => onSetMarkerColor(c)}
              title={`Color: ${c}`}
              aria-label={`Marker color ${c}`}
              aria-pressed={markerColor === c}
              style={{ padding: 2, width: 'auto', justifyContent: 'center' }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: 18,
                  height: 18,
                  background: c,
                  border: '1px solid #2d3561',
                  borderRadius: markerShape === 'circle' ? '50%' : 0,
                }}
              />
            </button>
          ))}
        </div>
        <div className="toolbar-sub-label" style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, marginBottom: 2 }}>Radius</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            type="range"
            min={1}
            max={10}
            value={markerSize}
            onChange={e => onSetMarkerSize(Number(e.target.value))}
            title={`Marker radius: ${markerSize} tiles`}
            aria-label="Marker radius"
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: '0.7rem', minWidth: 16, textAlign: 'center' }}>{markerSize}</span>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
