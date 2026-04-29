import React from 'react';
import type { ToolType, TileType, MarkerShape, MeasureShape, LightSourcePreset } from '../types/map';
import type { BackgroundImage } from '../types/map';
import { ALL_TILE_TYPES, TILE_LABELS, MARKER_SHAPES, MARKER_COLORS, MARKER_SHAPE_LABELS, MEASURE_SHAPES, MEASURE_SHAPE_LABELS, LIGHT_SOURCE_PRESETS } from '../types/map';
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
  // Background image
  backgroundImage?: BackgroundImage;
  onImportBackgroundImage: (bg: BackgroundImage) => void;
  onUpdateBackgroundImage: (patch: Partial<BackgroundImage>) => void;
  onClearBackgroundImage: () => void;
  // Measure tool settings
  measureShape: MeasureShape;
  measureFeetPerCell: number;
  onSetMeasureShape: (s: MeasureShape) => void;
  onSetMeasureFeetPerCell: (n: number) => void;
  // Light source tool settings
  lightPreset: LightSourcePreset;
  lightRadius: number;
  lightColor: string;
  onSetLightPreset: (p: LightSourcePreset) => void;
  onSetLightRadius: (r: number) => void;
  onSetLightColor: (c: string) => void;
  onClearLightSources: () => void;
  // Stair link tool state
  stairLinkSource: { level: number; x: number; y: number } | null;
  stairLinkCount: number;
  onClearStairLinks: () => void;
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
  backgroundImage, onImportBackgroundImage, onUpdateBackgroundImage, onClearBackgroundImage,
  measureShape, measureFeetPerCell, onSetMeasureShape, onSetMeasureFeetPerCell,
  lightPreset, lightRadius, lightColor, onSetLightPreset, onSetLightRadius, onSetLightColor, onClearLightSources,
  stairLinkSource, stairLinkCount, onClearStairLinks,
}) => {
  const theme = getTheme(themeId);
  const bgFileRef = React.useRef<HTMLInputElement>(null);
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
        <button
          type="button"
          className={`tool-btn ${activeTool === 'fov' ? 'active' : ''}`}
          onClick={() => onSetTool(activeTool === 'fov' ? 'paint' : 'fov')}
          title="Line of Sight — click a cell to visualize which cells are visible from that point, with walls blocking the view. Click the same cell again to clear. [O]"
          aria-label="Line of Sight / FOV tool"
          aria-pressed={activeTool === 'fov'}
          aria-keyshortcuts="O"
        >
          <span className="tool-icon" aria-hidden="true">👁</span>
          <span className="tool-name">Sight</span>
          <span className="tool-shortcut" aria-hidden="true">[O]</span>
        </button>
      </div>

      <div className="toolbar-section">
        <div className="toolbar-label">MEASURE</div>
        <button
          type="button"
          className={`tool-btn ${activeTool === 'measure' ? 'active' : ''}`}
          onClick={() => onSetTool('measure')}
          title="Measure distance — click and drag to measure distance between two points. Choose shape for area templates (circle, cone, line). [M]"
          aria-label="Measure tool"
          aria-pressed={activeTool === 'measure'}
          aria-keyshortcuts="M"
        >
          <span className="tool-icon" aria-hidden="true">📐</span>
          <span className="tool-name">Measure</span>
          <span className="tool-shortcut" aria-hidden="true">[M]</span>
        </button>
        <div className="toolbar-sub-label" style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, marginBottom: 2 }}>Shape</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {MEASURE_SHAPES.map(s => (
            <button
              key={s}
              type="button"
              className={`tile-btn ${measureShape === s ? 'active' : ''}`}
              onClick={() => onSetMeasureShape(s)}
              title={MEASURE_SHAPE_LABELS[s]}
              aria-label={`${MEASURE_SHAPE_LABELS[s]} measurement shape`}
              aria-pressed={measureShape === s}
              style={{ padding: 2, width: 'auto', fontSize: '0.6rem' }}
            >
              <span aria-hidden="true" style={{ fontSize: 14 }}>
                {s === 'ruler' ? '📏' : s === 'circle' ? '⭕' : s === 'cone' ? '🔺' : '╱'}
              </span>
              <span className="tile-btn-label" style={{ fontSize: '0.55rem' }}>{MEASURE_SHAPE_LABELS[s]}</span>
            </button>
          ))}
        </div>
        <div className="toolbar-sub-label" style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, marginBottom: 2 }}>Scale</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            type="number"
            min={1}
            max={100}
            value={measureFeetPerCell}
            onChange={e => {
              const v = Number(e.target.value);
              if (v >= 1 && v <= 100) onSetMeasureFeetPerCell(v);
            }}
            title={`Scale: ${measureFeetPerCell} ft per cell`}
            aria-label="Feet per cell"
            style={{ width: 48, textAlign: 'center', fontSize: '0.7rem' }}
          />
          <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>ft/cell</span>
        </div>
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

      <div className="toolbar-section">
        <div className="toolbar-label">BACKGROUND</div>
        <input
          ref={bgFileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              onImportBackgroundImage({
                dataUrl,
                offsetX: 0,
                offsetY: 0,
                scale: 1,
                opacity: 0.5,
              });
            };
            reader.readAsDataURL(file);
            // Reset so the same file can be re-imported.
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="tool-btn"
          onClick={() => bgFileRef.current?.click()}
          title="Import a PNG/JPG image as a background layer behind the tile grid. Useful for tracing existing battlemaps."
          aria-label="Import background image"
        >
          <span className="tool-icon" aria-hidden="true">🖼</span>
          <span className="tool-name">Import</span>
        </button>
        {backgroundImage && (
          <>
            <button
              type="button"
              className="tool-btn"
              onClick={onClearBackgroundImage}
              title="Remove the background image."
              aria-label="Remove background image"
            >
              <span className="tool-icon" aria-hidden="true">✕</span>
              <span className="tool-name">Remove</span>
            </button>
            <div className="toolbar-sub-label" style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, marginBottom: 2 }}>Opacity</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(backgroundImage.opacity * 100)}
                onChange={e => onUpdateBackgroundImage({ opacity: Number(e.target.value) / 100 })}
                title={`Background opacity: ${Math.round(backgroundImage.opacity * 100)}%`}
                aria-label="Background image opacity"
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '0.7rem', minWidth: 24, textAlign: 'center' }}>
                {Math.round(backgroundImage.opacity * 100)}%
              </span>
            </div>
            <div className="toolbar-sub-label" style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, marginBottom: 2 }}>Scale</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="range"
                min={10}
                max={500}
                value={Math.round(backgroundImage.scale * 100)}
                onChange={e => onUpdateBackgroundImage({ scale: Number(e.target.value) / 100 })}
                title={`Background scale: ${Math.round(backgroundImage.scale * 100)}%`}
                aria-label="Background image scale"
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '0.7rem', minWidth: 28, textAlign: 'center' }}>
                {Math.round(backgroundImage.scale * 100)}%
              </span>
            </div>
            <div className="toolbar-sub-label" style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, marginBottom: 2 }}>Offset X</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="range"
                min={-50}
                max={50}
                step={0.5}
                value={backgroundImage.offsetX}
                onChange={e => onUpdateBackgroundImage({ offsetX: Number(e.target.value) })}
                title={`Background X offset: ${backgroundImage.offsetX} tiles`}
                aria-label="Background image X offset"
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '0.7rem', minWidth: 24, textAlign: 'center' }}>
                {backgroundImage.offsetX}
              </span>
            </div>
            <div className="toolbar-sub-label" style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, marginBottom: 2 }}>Offset Y</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="range"
                min={-50}
                max={50}
                step={0.5}
                value={backgroundImage.offsetY}
                onChange={e => onUpdateBackgroundImage({ offsetY: Number(e.target.value) })}
                title={`Background Y offset: ${backgroundImage.offsetY} tiles`}
                aria-label="Background image Y offset"
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '0.7rem', minWidth: 24, textAlign: 'center' }}>
                {backgroundImage.offsetY}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="toolbar-section">
        <div className="toolbar-label">LIGHT</div>
        <button
          type="button"
          className={`tool-btn ${activeTool === 'light' ? 'active' : ''}`}
          onClick={() => onSetTool('light')}
          title="Place a light source — click a cell to place a torch, lantern, or magical light. Illuminated cells are visible through fog when Dynamic Fog is enabled. [I]"
          aria-label="Place light source"
          aria-pressed={activeTool === 'light'}
          aria-keyshortcuts="I"
        >
          <span className="tool-icon" aria-hidden="true">🕯</span>
          <span className="tool-name">Place</span>
          <span className="tool-shortcut" aria-hidden="true">[I]</span>
        </button>
        <button
          type="button"
          className={`tool-btn ${activeTool === 'remove-light' ? 'active' : ''}`}
          onClick={() => onSetTool('remove-light')}
          title="Remove a light source — click a cell containing a light to delete it."
          aria-label="Remove light source"
          aria-pressed={activeTool === 'remove-light'}
        >
          <span className="tool-icon" aria-hidden="true">✕</span>
          <span className="tool-name">Remove</span>
        </button>
        <button
          type="button"
          className="tool-btn"
          onClick={onClearLightSources}
          title="Remove all light sources from the map."
          aria-label="Clear all light sources"
        >
          <span className="tool-icon" aria-hidden="true">🗑</span>
          <span className="tool-name">Clear All</span>
        </button>
        <div className="toolbar-sub-label" style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, marginBottom: 2 }}>Preset</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {LIGHT_SOURCE_PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              className={`tile-btn ${lightPreset === p.id ? 'active' : ''}`}
              onClick={() => onSetLightPreset(p.id)}
              title={`${p.label} — radius ${p.radius} cells`}
              aria-label={`${p.label} light preset`}
              aria-pressed={lightPreset === p.id}
              style={{ padding: '2px 4px', width: 'auto' }}
            >
              <span aria-hidden="true" style={{ fontSize: 14 }}>{p.icon}</span>
              <span className="tile-btn-label" style={{ fontSize: '0.55rem' }}>{p.label}</span>
            </button>
          ))}
        </div>
        <div className="toolbar-sub-label" style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, marginBottom: 2 }}>Radius</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            type="range"
            min={1}
            max={20}
            value={lightRadius}
            onChange={e => onSetLightRadius(Number(e.target.value))}
            title={`Light radius: ${lightRadius} cells`}
            aria-label="Light radius in cells"
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: '0.7rem', minWidth: 20, textAlign: 'center' }}>{lightRadius}</span>
        </div>
        <div className="toolbar-sub-label" style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, marginBottom: 2 }}>Color</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {[
            { color: '#f97316', label: 'Torch orange' },
            { color: '#fbbf24', label: 'Lantern amber' },
            { color: '#fef08a', label: 'Pale yellow' },
            { color: '#ffffff', label: 'White' },
            { color: '#a78bfa', label: 'Magical violet' },
            { color: '#34d399', label: 'Arcane green' },
            { color: '#60a5fa', label: 'Ice blue' },
            { color: '#f87171', label: 'Infernal red' },
          ].map(({ color, label }) => (
            <button
              key={color}
              type="button"
              className={`tile-btn ${lightColor === color ? 'active' : ''}`}
              onClick={() => onSetLightColor(color)}
              title={label}
              aria-label={`Light color: ${label}`}
              aria-pressed={lightColor === color}
              style={{ padding: 2, width: 'auto', justifyContent: 'center' }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: 18,
                  height: 18,
                  background: color,
                  border: '1px solid #2d3561',
                  borderRadius: '50%',
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* ── STAIR LINKS ── */}
      <div className="toolbar-section">
        <div className="toolbar-label">STAIR LINKS</div>
        <button
          type="button"
          className={`tool-btn ${activeTool === 'link-stair' ? 'active' : ''}`}
          onClick={() => onSetTool('link-stair')}
          title="Link Stairs — click a stairs tile, switch levels, click the destination stairs tile to connect them. [K]"
          aria-label="Link Stairs tool"
          aria-pressed={activeTool === 'link-stair'}
        >
          <span className="tool-icon" aria-hidden="true">🔗</span>
          <span className="tool-name">Link</span>
          <span className="tool-shortcut" aria-hidden="true">[K]</span>
        </button>
        {activeTool === 'link-stair' && (
          <div className="toolbar-sub-label" style={{ fontSize: '0.6rem', opacity: 0.8, marginTop: 4, lineHeight: 1.3 }}>
            {stairLinkSource
              ? `Source: (${stairLinkSource.x},${stairLinkSource.y}) on L${stairLinkSource.level + 1}. Switch levels and click destination stairs.`
              : 'Click a stairs tile to start linking.'}
          </div>
        )}
        <button
          type="button"
          className="tool-btn"
          onClick={onClearStairLinks}
          title="Remove all stair links involving this level."
          aria-label="Clear stair links for this level"
          disabled={stairLinkCount === 0}
        >
          <span className="tool-icon" aria-hidden="true">🗑</span>
          <span className="tool-name">Clear Links</span>
        </button>
        <div className="toolbar-sub-label" style={{ fontSize: '0.6rem', opacity: 0.6, marginTop: 2 }}>
          {stairLinkCount} link{stairLinkCount !== 1 ? 's' : ''} total
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
