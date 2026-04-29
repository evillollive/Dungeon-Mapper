import React, { useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import type { DungeonMap, DungeonProject } from '../types/map';
import { exportProjectJSON, importProjectJSON, exportMapPNG } from '../utils/export';

interface MapHeaderProps {
  map: DungeonMap;
  project: DungeonProject;
  onSetName: (name: string) => void;
  onResize: (w: number, h: number) => void;
  onSetTileSize: (size: number) => void;
  onClear: () => void;
  onNew: () => void;
  onLoadProject: (project: DungeonProject) => void;
  onExportSVG: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  printMode: boolean;
  onTogglePrintMode: () => void;
  uiScale: number;
  uiScaleOptions: readonly number[];
  onSetUIScale: (scale: number) => void;
  getCanvas: () => HTMLCanvasElement | null;
  viewMode: 'gm' | 'player';
  onToggleViewMode: () => void;
  /** Open the in-app keyboard shortcuts overlay. */
  onShowShortcuts: () => void;
  /** Open the print-optimized export dialog. */
  onOpenExportDialog: () => void;
  /** Open the curated sample-map browser. */
  onOpenPremadeMaps: () => void;
}

/**
 * Imperative actions exposed by `MapHeader` so global keyboard shortcuts in
 * `App.tsx` can drive the same New / Import / Export buttons the header
 * shows, including the same confirmation prompts and hidden file picker.
 */
export interface MapHeaderHandle {
  triggerNew: () => void;
  triggerImport: () => void;
  triggerExportJSON: () => void;
  triggerExportPNG: () => void;
}

const GRID_SIZES = [8, 16, 24, 32, 48, 64, 96, 128];

const MapHeader = forwardRef<MapHeaderHandle, MapHeaderProps>(({
  map, project, onSetName, onResize, onSetTileSize, onClear, onNew, onLoadProject,
  onExportSVG, onUndo, onRedo, canUndo, canRedo, printMode, onTogglePrintMode,
  uiScale, uiScaleOptions, onSetUIScale, getCanvas,
  viewMode, onToggleViewMode, onShowShortcuts, onOpenExportDialog, onOpenPremadeMaps,
}, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClear = useCallback(() => {
    if (window.confirm('Clear the entire map? This cannot be undone.')) {
      onClear();
    }
  }, [onClear]);

  const handleNew = useCallback(() => {
    if (window.confirm('Create a new map? Unsaved changes will be lost.')) {
      onNew();
    }
  }, [onNew]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const loaded = await importProjectJSON(file);
      onLoadProject(loaded);
    } catch (err) {
      alert('Failed to import: ' + (err as Error).message);
    }
    e.target.value = '';
  };

  const handleExportPNG = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    exportMapPNG(canvas, map.meta.name);
  }, [getCanvas, map.meta.name]);

  const handleExportJSON = useCallback(() => exportProjectJSON(project), [project]);

  const triggerImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  useImperativeHandle(ref, () => ({
    triggerNew: handleNew,
    triggerImport,
    triggerExportJSON: handleExportJSON,
    triggerExportPNG: handleExportPNG,
  }), [handleNew, triggerImport, handleExportJSON, handleExportPNG]);

  return (
    <header className="map-header">
      <div className="header-left">
        <span className="app-title" aria-hidden="true">⚔ DUNGEON MAPPER</span>
        <input
          className="map-name-input"
          value={map.meta.name}
          onChange={e => onSetName(e.target.value)}
          placeholder="Map name..."
          title="Map name"
          aria-label="Map name"
        />
      </div>

      <div className="header-center">
        <label className="header-label">SIZE:</label>
        <select
          className="grid-select"
          value={map.meta.width}
          onChange={e => {
            const v = Number(e.target.value);
            onResize(v, map.meta.height);
          }}
          title="Map width"
          aria-label="Map width in tiles"
        >
          {GRID_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="header-label" aria-hidden="true">×</span>
        <select
          className="grid-select"
          value={map.meta.height}
          onChange={e => {
            const v = Number(e.target.value);
            onResize(map.meta.width, v);
          }}
          title="Map height"
          aria-label="Map height in tiles"
        >
          {GRID_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label className="header-label" style={{ marginLeft: 8 }}>TILE:</label>
        <select
          className="grid-select"
          value={map.meta.tileSize}
          onChange={e => onSetTileSize(Number(e.target.value))}
          title="Tile size (px)"
          aria-label="Tile size in pixels"
        >
          {[12, 16, 20, 24, 32].map(s => <option key={s} value={s}>{s}px</option>)}
        </select>

        <label className="header-label" style={{ marginLeft: 8 }}>UI:</label>
        <select
          className="grid-select"
          value={uiScale}
          onChange={e => onSetUIScale(Number(e.target.value))}
          title="UI scale — make buttons and text larger or smaller [Ctrl+= / Ctrl+−]"
          aria-label="UI scale"
          aria-keyshortcuts="Control+= Control+-"
        >
          {uiScaleOptions.map(s => (
            <option key={s} value={s}>{Math.round(s * 100)}%</option>
          ))}
        </select>
      </div>

      <div className="header-right">
        <button
          type="button"
          className={`header-btn ${viewMode === 'player' ? 'active' : ''}`}
          onClick={onToggleViewMode}
          title="Toggle Player View — switches to a fog-of-war-aware, player-safe UI with limited tools (drawing + tokens). Toggle off to return to the GM view. [Shift+V]"
          aria-label={viewMode === 'player' ? 'Switch to GM view' : 'Switch to Player view'}
          aria-pressed={viewMode === 'player'}
          aria-keyshortcuts="Shift+V"
        >
          {viewMode === 'player' ? '👁 Player View' : '🛡 GM View'}
        </button>
        <button
          type="button"
          className={`header-btn ${printMode ? 'active' : ''}`}
          onClick={onTogglePrintMode}
          title="Toggle Print / B&W mode — renders tiles as high-contrast monochrome glyphs suitable for printing [Shift+P]"
          aria-label="Toggle print (black and white) mode"
          aria-pressed={printMode}
          aria-keyshortcuts="Shift+P"
        >
          🖨 Print
        </button>
        <button type="button" className="header-btn" onClick={onUndo} disabled={!canUndo} title="Undo [Ctrl+Z]" aria-label="Undo" aria-keyshortcuts="Control+Z">↩ Undo</button>
        <button type="button" className="header-btn" onClick={onRedo} disabled={!canRedo} title="Redo [Ctrl+Y]" aria-label="Redo" aria-keyshortcuts="Control+Y Control+Shift+Z">↪ Redo</button>
        <button type="button" className="header-btn" onClick={handleNew} title="New Map [Ctrl+Alt+N]" aria-label="New map" aria-keyshortcuts="Control+Alt+N">New</button>
        <button type="button" className="header-btn" onClick={onOpenPremadeMaps} title="Load a ready-to-use sample map" aria-label="Load sample map">Samples</button>
        <button type="button" className="header-btn danger" onClick={handleClear} title="Clear Map" aria-label="Clear map">Clear</button>
        <button type="button" className="header-btn" onClick={handleExportJSON} title="Export JSON [Ctrl+S]" aria-label="Export map as JSON" aria-keyshortcuts="Control+S">↓ JSON</button>
        <button type="button" className="header-btn" onClick={handleExportPNG} title="Export PNG [Ctrl+Shift+S]" aria-label="Export map as PNG image" aria-keyshortcuts="Control+Shift+S">↓ PNG</button>
        <button type="button" className="header-btn" onClick={onExportSVG} title="Export SVG [Ctrl+Alt+S]" aria-label="Export map as SVG" aria-keyshortcuts="Control+Alt+S">↓ SVG</button>
        <button type="button" className="header-btn" onClick={onOpenExportDialog} title="Print-Optimized Export — high-DPI PNG with page tiling [Ctrl+Shift+P]" aria-label="Print-optimized export" aria-keyshortcuts="Control+Shift+P">🖨 Print Export</button>
        <button type="button" className="header-btn" onClick={() => fileInputRef.current?.click()} title="Import JSON [Ctrl+O]" aria-label="Import map from JSON file" aria-keyshortcuts="Control+O">↑ Import</button>
        <button
          type="button"
          className="header-btn"
          onClick={onShowShortcuts}
          title="Show keyboard shortcuts [?]"
          aria-label="Show keyboard shortcuts"
          aria-keyshortcuts="?"
        >
          ❓ Shortcuts
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          aria-hidden="true"
          tabIndex={-1}
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      </div>
    </header>
  );
});

MapHeader.displayName = 'MapHeader';

export default MapHeader;
