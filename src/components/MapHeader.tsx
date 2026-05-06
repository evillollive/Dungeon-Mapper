import React, { useRef, forwardRef, useImperativeHandle, useCallback, useState, useEffect } from 'react';
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
  /** Open the Generate Hub (procedural generation + sample maps). */
  onOpenGenerateHub: () => void;
  /** Layout density: 'rail' (icon rail + panel) or 'tabs' (classic tab toolbar). */
  layoutDensity: 'rail' | 'tabs';
  onSetLayoutDensity: (density: 'rail' | 'tabs') => void;
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
  viewMode, onToggleViewMode, onShowShortcuts, onOpenExportDialog, onOpenGenerateHub,
  layoutDensity, onSetLayoutDensity,
}, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  // Close overflow menu when clicking outside.
  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [overflowOpen]);

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

        <label className="header-label" style={{ marginLeft: 8 }}>LAYOUT:</label>
        <select
          className="grid-select"
          value={layoutDensity}
          onChange={e => onSetLayoutDensity(e.target.value as 'rail' | 'tabs')}
          title="Layout density — switch between icon rail and classic tab toolbar"
          aria-label="Layout density"
        >
          <option value="rail">Rail</option>
          <option value="tabs">Tabs</option>
        </select>
      </div>

      <div className="header-right">
        <button
          type="button"
          className={`header-btn ${viewMode === 'player' ? 'active' : ''}`}
          onClick={onToggleViewMode}
          title="Toggle Present mode — switches to a fog-of-war-aware, player-safe UI with limited tools (drawing + tokens). Toggle off to return to Edit mode. [Shift+V]"
          aria-label={viewMode === 'player' ? 'Switch to Edit mode' : 'Switch to Present mode'}
          aria-pressed={viewMode === 'player'}
          aria-keyshortcuts="Shift+V"
        >
          👁 Present
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
        {/* ── Overflow menu: Export / Import / Print Export / Clear / Shortcuts ── */}
        <div className="header-overflow-wrap" ref={overflowRef}>
          <button
            type="button"
            className="header-btn"
            onClick={() => setOverflowOpen(o => !o)}
            aria-label="More actions"
            aria-expanded={overflowOpen}
            aria-haspopup="true"
            title="More actions — Export, Import, Clear, Shortcuts"
          >
            ⋮ More
          </button>
          {overflowOpen && (
            <div className="header-overflow-menu" role="menu" aria-label="More actions">
              <button role="menuitem" onClick={() => { handleExportJSON(); setOverflowOpen(false); }} title="Export JSON [Ctrl+S]">↓ JSON</button>
              <button role="menuitem" onClick={() => { handleExportPNG(); setOverflowOpen(false); }} title="Export PNG [Ctrl+Shift+S]">↓ PNG</button>
              <button role="menuitem" onClick={() => { onExportSVG(); setOverflowOpen(false); }} title="Export SVG [Ctrl+Alt+S]">↓ SVG</button>
              <button role="menuitem" onClick={() => { onOpenExportDialog(); setOverflowOpen(false); }} title="Print-Optimized Export [Ctrl+Shift+P]">🖨 Print Export</button>
              <hr className="header-overflow-sep" />
              <button role="menuitem" onClick={() => { onOpenGenerateHub(); setOverflowOpen(false); }} title="Generate Hub — procedural generation and sample maps [G]">🗺️ Generate Hub</button>
              <button role="menuitem" onClick={() => { fileInputRef.current?.click(); setOverflowOpen(false); }} title="Import JSON [Ctrl+O]">↑ Import</button>
              <button role="menuitem" className="danger" onClick={() => { handleClear(); setOverflowOpen(false); }} title="Clear Map" aria-label="Clear entire map">🗑 Clear</button>
              <hr className="header-overflow-sep" />
              <button role="menuitem" onClick={() => { onShowShortcuts(); setOverflowOpen(false); }} title="Show keyboard shortcuts [?]">❓ Shortcuts</button>
            </div>
          )}
        </div>
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
