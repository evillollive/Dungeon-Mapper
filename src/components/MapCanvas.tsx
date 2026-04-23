import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import type { DungeonMap, TileType, ToolType } from '../types/map';
import { TILE_COLORS } from '../utils/mapUtils';

interface MapCanvasProps {
  map: DungeonMap;
  activeTool: ToolType;
  activeTile: TileType;
  selectedNoteId: number | null;
  onSetTile: (x: number, y: number, type: TileType) => void;
  onFillTile: (x: number, y: number, type: TileType) => void;
  onPickTile: (type: TileType) => void;
  onAddNote: (x: number, y: number) => void;
  onSelectNote: (id: number | null) => void;
}

export interface MapCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  type: TileType,
  x: number,
  y: number,
  size: number
) {
  const px = x * size;
  const py = y * size;
  const color = TILE_COLORS[type];

  ctx.fillStyle = color;
  ctx.fillRect(px, py, size, size);

  ctx.strokeStyle = '#2d3561';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(px, py, size, size);

  const cx = px + size / 2;
  const cy = py + size / 2;
  const s = size;

  ctx.lineWidth = 1.5;

  switch (type) {
    case 'empty':
      break;

    case 'floor': {
      ctx.fillStyle = '#3a3020';
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
      break;
    }

    case 'wall': {
      ctx.fillStyle = '#333333';
      ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
      ctx.fillStyle = '#5a5a5a';
      ctx.fillRect(px + 2, py + 2, s - 4, 2);
      ctx.fillRect(px + 2, py + 2, 2, s - 4);
      break;
    }

    case 'door-h': {
      ctx.fillStyle = '#c8a84b';
      ctx.fillRect(px + 2, cy - 2, s - 4, 4);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(cx - 3, cy - 2, 6, 4);
      ctx.strokeStyle = '#c8a84b';
      ctx.beginPath();
      ctx.moveTo(px + 2, cy);
      ctx.lineTo(cx - 4, cy);
      ctx.moveTo(cx + 4, cy);
      ctx.lineTo(px + s - 2, cy);
      ctx.stroke();
      break;
    }

    case 'door-v': {
      ctx.fillStyle = '#c8a84b';
      ctx.fillRect(cx - 2, py + 2, 4, s - 4);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(cx - 2, cy - 3, 4, 6);
      ctx.strokeStyle = '#c8a84b';
      ctx.beginPath();
      ctx.moveTo(cx, py + 2);
      ctx.lineTo(cx, cy - 4);
      ctx.moveTo(cx, cy + 4);
      ctx.lineTo(cx, py + s - 2);
      ctx.stroke();
      break;
    }

    case 'stairs-up': {
      ctx.strokeStyle = '#e0d5c1';
      ctx.lineWidth = 1;
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        const sy = py + 2 + i * ((s - 4) / steps);
        const ex = px + 2 + (i + 1) * ((s - 4) / steps);
        ctx.beginPath();
        ctx.moveTo(px + 2, sy);
        ctx.lineTo(ex, sy);
        ctx.lineTo(ex, sy + (s - 4) / steps);
        ctx.stroke();
      }
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + 2, cy - 3);
      ctx.lineTo(cx + 5, cy);
      ctx.lineTo(cx + 2, cy + 3);
      ctx.stroke();
      break;
    }

    case 'stairs-down': {
      ctx.strokeStyle = '#b0c8b0';
      ctx.lineWidth = 1;
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        const sy = py + s - 2 - i * ((s - 4) / steps);
        const ex = px + 2 + (i + 1) * ((s - 4) / steps);
        ctx.beginPath();
        ctx.moveTo(px + 2, sy);
        ctx.lineTo(ex, sy);
        ctx.lineTo(ex, sy - (s - 4) / steps);
        ctx.stroke();
      }
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + 2, cy - 3);
      ctx.lineTo(cx + 5, cy);
      ctx.lineTo(cx + 2, cy + 3);
      ctx.stroke();
      break;
    }

    case 'water': {
      ctx.strokeStyle = '#4ab4e8';
      ctx.lineWidth = 1;
      for (let wy = 0; wy < 3; wy++) {
        const waveY = py + 4 + wy * (s / 3.5);
        ctx.beginPath();
        ctx.moveTo(px + 2, waveY);
        for (let wx = 0; wx < s - 4; wx += 4) {
          ctx.quadraticCurveTo(px + 2 + wx + 1, waveY - 2, px + 2 + wx + 2, waveY);
          ctx.quadraticCurveTo(px + 2 + wx + 3, waveY + 2, px + 2 + wx + 4, waveY);
        }
        ctx.stroke();
      }
      break;
    }

    case 'pillar': {
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.arc(cx, cy, s / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, s / 4, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 'trap': {
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 3, py + 3);
      ctx.lineTo(px + s - 3, py + s - 3);
      ctx.moveTo(px + s - 3, py + 3);
      ctx.lineTo(px + 3, py + s - 3);
      ctx.stroke();
      break;
    }

    case 'treasure': {
      const tw = s * 0.5;
      const th = s * 0.35;
      const tx = cx - tw / 2;
      const ty = cy - th / 2;
      ctx.fillStyle = '#8b6914';
      ctx.fillRect(tx, ty + th * 0.4, tw, th * 0.6);
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(tx, ty, tw, th * 0.5);
      ctx.beginPath();
      ctx.arc(cx, ty + th * 0.25, tw * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff8dc';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(tx, ty + th * 0.4, tw, th * 0.6);
      ctx.strokeRect(tx, ty, tw, th * 0.5);
      break;
    }

    case 'start': {
      ctx.fillStyle = '#50fa7b';
      ctx.beginPath();
      ctx.moveTo(cx, py + 3);
      ctx.lineTo(cx + 4, cy);
      ctx.lineTo(cx + 2, cy);
      ctx.lineTo(cx + 2, py + s - 3);
      ctx.lineTo(cx - 2, py + s - 3);
      ctx.lineTo(cx - 2, cy);
      ctx.lineTo(cx - 4, cy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2e8b57';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      break;
    }
  }
}

const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(({
  map,
  activeTool,
  activeTile,
  selectedNoteId,
  onSetTile,
  onFillTile,
  onPickTile,
  onAddNote,
  onSelectNote,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  const { meta, tiles, notes } = map;
  const { tileSize } = meta;

  // Render map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = meta.width * tileSize;
    const h = meta.height * tileSize;
    canvas.width = w;
    canvas.height = h;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Draw tiles
    for (let y = 0; y < meta.height; y++) {
      for (let x = 0; x < meta.width; x++) {
        const tile = tiles[y]?.[x];
        if (tile) {
          drawTile(ctx, tile.type, x, y, tileSize);
        }
      }
    }

    // Draw grid overlay for empty cells
    ctx.strokeStyle = '#2d3561';
    ctx.lineWidth = 0.5;
    for (let y = 0; y <= meta.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * tileSize);
      ctx.lineTo(w, y * tileSize);
      ctx.stroke();
    }
    for (let x = 0; x <= meta.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * tileSize, 0);
      ctx.lineTo(x * tileSize, h);
      ctx.stroke();
    }

    // Draw notes
    notes.forEach(note => {
      const px = note.x * tileSize + tileSize / 2;
      const py = note.y * tileSize + tileSize / 2;
      const radius = tileSize * 0.38;

      const isSelected = note.id === selectedNoteId;
      ctx.fillStyle = isSelected ? '#e94560' : '#f0c040';
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#fff' : '#8b6914';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#1a1a2e';
      ctx.font = `bold ${Math.max(8, tileSize * 0.45)}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(note.id), px, py + 0.5);
    });
  }, [map, tiles, notes, meta, tileSize, selectedNoteId]);

  const getTileCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / tileSize);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / tileSize);
    if (x < 0 || x >= meta.width || y < 0 || y >= meta.height) return null;
    return { x, y };
  }, [tileSize, meta.width, meta.height]);

  const handleCanvasAction = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getTileCoords(e);
    if (!coords) return;
    const { x, y } = coords;

    if (activeTool === 'paint') {
      onSetTile(x, y, activeTile);
    } else if (activeTool === 'erase') {
      onSetTile(x, y, 'empty');
    } else if (activeTool === 'fill') {
      onFillTile(x, y, activeTile);
    } else if (activeTool === 'eyedropper') {
      const tileType = tiles[y]?.[x]?.type;
      if (tileType) onPickTile(tileType);
    } else if (activeTool === 'note') {
      // Check if clicking existing note
      const existingNote = notes.find(n => n.x === x && n.y === y);
      if (existingNote) {
        onSelectNote(existingNote.id === selectedNoteId ? null : existingNote.id);
      } else {
        onAddNote(x, y);
      }
    }
  }, [activeTool, activeTile, getTileCoords, onSetTile, onFillTile, onPickTile, onAddNote, onSelectNote, tiles, notes, selectedNoteId]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) {
      isPanningRef.current = true;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
      return;
    }
    isMouseDownRef.current = true;
    if (activeTool === 'fill' || activeTool === 'eyedropper' || activeTool === 'note') {
      handleCanvasAction(e);
    } else {
      handleCanvasAction(e);
    }
  }, [activeTool, handleCanvasAction]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      const dx = e.clientX - lastPanPos.current.x;
      const dy = e.clientY - lastPanPos.current.y;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      return;
    }
    if (!isMouseDownRef.current) return;
    if (activeTool === 'paint' || activeTool === 'erase') {
      handleCanvasAction(e);
    }
  }, [activeTool, handleCanvasAction]);

  const handleMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
    isPanningRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      return Math.max(0.25, Math.min(4, prev + delta));
    });
  }, []);

  return (
    <div className="canvas-wrapper" ref={containerRef}>
      <div className="canvas-viewport">
        <div className="canvas-transform-container" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center' }}>
          <canvas
            ref={canvasRef}
            style={{
              cursor: activeTool === 'eyedropper' ? 'crosshair'
                    : activeTool === 'fill' ? 'cell'
                    : activeTool === 'note' ? 'copy'
                    : 'crosshair',
              imageRendering: 'pixelated',
              display: 'block',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={e => e.preventDefault()}
            onWheel={handleWheel}
          />
        </div>
      </div>
      <div className="zoom-controls">
        <button onClick={() => setZoom(z => Math.min(4, z + 0.25))}>+</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}>-</button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
      </div>
    </div>
  );
});

MapCanvas.displayName = 'MapCanvas';

export default MapCanvas;
