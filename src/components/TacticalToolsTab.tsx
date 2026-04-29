import React from 'react';
import type { ToolType, MarkerShape, MeasureShape, LightSourcePreset } from '../types/map';
import { MARKER_SHAPES, MARKER_COLORS, MARKER_SHAPE_LABELS, MEASURE_SHAPES, MEASURE_SHAPE_LABELS, LIGHT_SOURCE_PRESETS } from '../types/map';
import TokenToolsSection from './TokenToolsSection';

interface TacticalToolsTabProps {
  activeTool: ToolType;
  onSetTool: (tool: ToolType) => void;
  fogEnabled: boolean;
  gmShowFog: boolean;
  onToggleGmShowFog: () => void;
  // Markers
  markerShape: MarkerShape;
  markerColor: string;
  markerSize: number;
  onSetMarkerShape: (s: MarkerShape) => void;
  onSetMarkerColor: (c: string) => void;
  onSetMarkerSize: (s: number) => void;
  onClearMarkers: () => void;
  // Measure
  measureShape: MeasureShape;
  measureFeetPerCell: number;
  onSetMeasureShape: (s: MeasureShape) => void;
  onSetMeasureFeetPerCell: (n: number) => void;
  // Light source
  lightPreset: LightSourcePreset;
  lightRadius: number;
  lightColor: string;
  onSetLightPreset: (p: LightSourcePreset) => void;
  onSetLightRadius: (r: number) => void;
  onSetLightColor: (c: string) => void;
  onClearLightSources: () => void;
}

const TacticalToolsTab: React.FC<TacticalToolsTabProps> = ({
  activeTool, onSetTool,
  fogEnabled, gmShowFog, onToggleGmShowFog,
  markerShape, markerColor, markerSize,
  onSetMarkerShape, onSetMarkerColor, onSetMarkerSize, onClearMarkers,
  measureShape, measureFeetPerCell, onSetMeasureShape, onSetMeasureFeetPerCell,
  lightPreset, lightRadius, lightColor,
  onSetLightPreset, onSetLightRadius, onSetLightColor, onClearLightSources,
}) => {
  return (
    <>
      <div className="toolbar-section">
        <div className="toolbar-label">FOG OF WAR</div>
        <label
          className={`tool-btn ${gmShowFog ? 'active' : ''}`}
          style={{ cursor: 'pointer' }}
          title={
            fogEnabled
              ? 'Show Fog (preview) — overlay a translucent grey wash on cells that are currently hidden from players. The map stays visible to you; this is an Edit-mode-only preview. Fog controls live on the Present toolbar.'
              : 'Show Fog has no effect until fog-of-war is enabled. Switch to Present mode to enable fog and reveal/hide cells.'
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
    </>
  );
};

export default TacticalToolsTab;
