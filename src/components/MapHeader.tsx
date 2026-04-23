import React, { useRef } from 'react';
import type { DungeonMap } from '../types/map';
import { exportMapJSON, importMapJSON, exportMapPNG } from '../utils/export';

interface MapHeaderProps {
  map: DungeonMap;
  onSetName: (name: string) => void;
  onResize: (w: number, h: number) => void;
  onSetTileSize: (size: number) => void;
  onClear: () => void;
  onNew: () => void;
  onLoad: (map: DungeonMap) => void;
  getCanvas: () => HTMLCanvasElement | null;
}

const GRID_SIZES = [8, 16, 24, 32, 48, 64];

const MapHeader: React.FC<MapHeaderProps> = ({
  map, onSetName, onResize, onSetTileSize, onClear, onNew, onLoad, getCanvas
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    if (window.confirm('Clear the entire map? This cannot be undone.')) {
      onClear();
    }
  };

  const handleNew = () => {
    if (window.confirm('Create a new map? Unsaved changes will be lost.')) {
      onNew();
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const loaded = await importMapJSON(file);
      onLoad(loaded);
    } catch (err) {
      alert('Failed to import map: ' + (err as Error).message);
    }
    e.target.value = '';
  };

  const handleExportPNG = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    exportMapPNG(canvas, map.meta.name);
  };

  return (
    <header className="map-header">
      <div className="header-left">
        <span className="app-title">⚔ DUNGEON MAPPER</span>
        <input
          className="map-name-input"
          value={map.meta.name}
          onChange={e => onSetName(e.target.value)}
          placeholder="Map name..."
          title="Map name"
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
        >
          {GRID_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="header-label">×</span>
        <select
          className="grid-select"
          value={map.meta.height}
          onChange={e => {
            const v = Number(e.target.value);
            onResize(map.meta.width, v);
          }}
          title="Map height"
        >
          {GRID_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label className="header-label" style={{ marginLeft: 8 }}>TILE:</label>
        <select
          className="grid-select"
          value={map.meta.tileSize}
          onChange={e => onSetTileSize(Number(e.target.value))}
          title="Tile size (px)"
        >
          {[12, 16, 20, 24, 32].map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
      </div>

      <div className="header-right">
        <button className="header-btn" onClick={handleNew} title="New Map">New</button>
        <button className="header-btn danger" onClick={handleClear} title="Clear Map">Clear</button>
        <button className="header-btn" onClick={() => exportMapJSON(map)} title="Export JSON">↓ JSON</button>
        <button className="header-btn" onClick={handleExportPNG} title="Export PNG">↓ PNG</button>
        <button className="header-btn" onClick={() => fileInputRef.current?.click()} title="Import JSON">↑ Import</button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      </div>
    </header>
  );
};

export default MapHeader;
