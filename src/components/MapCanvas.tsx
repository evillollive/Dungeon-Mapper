import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import type { DungeonMap, TileType, ToolType } from '../types/map';
import { getTheme } from '../themes/index';
import { drawPrintTile, PRINT_BG, PRINT_GRID } from '../themes/printMode';

// Screen-mode canvas styling: light graph-paper background with cyan grid lines,
// evoking traditional engineering / quad-ruled graph paper regardless of theme.
const SCREEN_BG = '#f4f1e4';
const SCREEN_GRID = '#5fb8c9';

interface MapCanvasProps {
  map: DungeonMap;
  activeTool: ToolType;
  activeTile: TileType;
  themeId: string;
  printMode: boolean;
  selectedNoteId: number | null;
  onSetTile: (x: number, y: number, type: TileType) => void;
  onSetTiles: (tiles: { x: number; y: number; type: TileType }[]) => void;
  onFillTile: (x: number, y: number, type: TileType) => void;
  onPickTile: (type: TileType) => void;
  onAddNote: (x: number, y: number) => void;
  onSelectNote: (id: number | null) => void;
  onEraseTiles: (tiles: { x: number; y: number }[]) => void;
}

export interface MapCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

const MINIMAP_MAX_W = 160;
const MINIMAP_MAX_H = 120;

function bresenhamLine(x0: number, y0: number, x1: number, y1: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0;
  let cy = y0;
  while (true) {
    points.push({ x: cx, y: cy });
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
  return points;
}

function rectOutline(x0: number, y0: number, x1: number, y1: number): { x: number; y: number }[] {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const points: { x: number; y: number }[] = [];
  for (let x = minX; x <= maxX; x++) {
    points.push({ x, y: minY });
    if (minY !== maxY) points.push({ x, y: maxY });
  }
  for (let y = minY + 1; y < maxY; y++) {
    points.push({ x: minX, y });
    if (minX !== maxX) points.push({ x: maxX, y });
  }
  return points;
}

const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(({
  map,
  activeTool,
  activeTile,
  themeId,
  printMode,
  selectedNoteId,
  onSetTile,
  onSetTiles,
  onFillTile,
  onPickTile,
  onAddNote,
  onSelectNote,
  onEraseTiles,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  const { meta, tiles, notes } = map;
  const { tileSize } = meta;

  // Main render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const theme = getTheme(themeId);

    const w = meta.width * tileSize;
    const h = meta.height * tileSize;
    canvas.width = w;
    canvas.height = h;

    ctx.fillStyle = printMode ? PRINT_BG : SCREEN_BG;
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < meta.height; y++) {
      for (let x = 0; x < meta.width; x++) {
        const tile = tiles[y]?.[x];
        if (tile) {
          if (printMode) {
            drawPrintTile(ctx, tile.type, x, y, tileSize);
          } else if (tile.type !== 'empty') {
            // Skip 'empty' tiles in screen mode so the light graph-paper
            // background (SCREEN_BG) shows through instead of the theme's
            // dark "empty" color.
            theme.drawTile(ctx, tile.type, x, y, tileSize);
          }
        }
      }
    }

    ctx.strokeStyle = printMode ? PRINT_GRID : SCREEN_GRID;
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

    notes.forEach(note => {
      const px = note.x * tileSize + tileSize / 2;
      const py = note.y * tileSize + tileSize / 2;
      const radius = tileSize * 0.38;
      const isSelected = note.id === selectedNoteId;
      if (printMode) {
        // Outlined circle with a black number — works equally well in B&W print.
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = isSelected ? 2 : 1.25;
        ctx.stroke();
        ctx.fillStyle = '#000000';
      } else {
        ctx.fillStyle = isSelected ? '#e94560' : '#f0c040';
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#fff' : '#8b6914';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#1a1a2e';
      }
      ctx.font = `bold ${Math.max(8, tileSize * 0.45)}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(note.id), px, py + 0.5);
    });

    // Ghost preview for line/rect
    if (isDragging && dragStart && dragEnd && (activeTool === 'line' || activeTool === 'rect')) {
      const ghostPoints = activeTool === 'line'
        ? bresenhamLine(dragStart.x, dragStart.y, dragEnd.x, dragEnd.y)
        : rectOutline(dragStart.x, dragStart.y, dragEnd.x, dragEnd.y);
      ctx.save();
      ctx.globalAlpha = 0.5;
      for (const p of ghostPoints) {
        if (p.x >= 0 && p.x < meta.width && p.y >= 0 && p.y < meta.height) {
          ctx.fillStyle = printMode ? '#000000' : (theme.tileColors[activeTile] ?? '#888');
          ctx.fillRect(p.x * tileSize, p.y * tileSize, tileSize, tileSize);
        }
      }
      ctx.restore();
    }

    // Selection box
    if (selection) {
      ctx.save();
      ctx.strokeStyle = printMode ? '#000000' : '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        selection.x * tileSize,
        selection.y * tileSize,
        selection.w * tileSize,
        selection.h * tileSize
      );
      ctx.setLineDash([]);
      ctx.restore();
    }
  }, [map, tiles, notes, meta, tileSize, selectedNoteId, themeId, printMode, isDragging, dragStart, dragEnd, activeTool, activeTile, selection]);

  // Minimap render
  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const theme = getTheme(themeId);

    const mTile = Math.max(1, Math.min(Math.floor(MINIMAP_MAX_W / meta.width), Math.floor(MINIMAP_MAX_H / meta.height)));
    const mW = meta.width * mTile;
    const mH = meta.height * mTile;

    canvas.width = mW;
    canvas.height = mH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = printMode ? PRINT_BG : SCREEN_BG;
    ctx.fillRect(0, 0, mW, mH);

    for (let y = 0; y < meta.height; y++) {
      for (let x = 0; x < meta.width; x++) {
        const tile = tiles[y]?.[x];
        if (tile && tile.type !== 'empty') {
          ctx.fillStyle = printMode ? '#000000' : theme.tileColors[tile.type];
          ctx.fillRect(x * mTile, y * mTile, mTile, mTile);
        }
      }
    }

    const containerEl = containerRef.current;
    if (containerEl && zoom > 0) {
      const vw = containerEl.clientWidth / zoom / tileSize;
      const vh = containerEl.clientHeight / zoom / tileSize;
      const vcx = meta.width / 2 - pan.x / (zoom * tileSize);
      const vcy = meta.height / 2 - pan.y / (zoom * tileSize);
      const vx = (vcx - vw / 2) * mTile;
      const vy = (vcy - vh / 2) * mTile;
      ctx.strokeStyle = printMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(vx, vy, vw * mTile, vh * mTile);
    }
  }, [map, tiles, meta, tileSize, themeId, printMode, zoom, pan]);

  // Selection keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (activeTool === 'select' && selection) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          const eraseList: { x: number; y: number }[] = [];
          for (let y = selection.y; y < selection.y + selection.h; y++) {
            for (let x = selection.x; x < selection.x + selection.w; x++) {
              eraseList.push({ x, y });
            }
          }
          onEraseTiles(eraseList);
        } else if (e.key === 'Escape') {
          setSelection(null);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTool, selection, onEraseTiles]);

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
    const coords = getTileCoords(e);

    if (activeTool === 'line' || activeTool === 'rect') {
      if (coords) {
        setDragStart(coords);
        setDragEnd(coords);
        setIsDragging(true);
      }
    } else if (activeTool === 'select') {
      if (coords) {
        setDragStart(coords);
        setDragEnd(coords);
        setIsDragging(true);
        setSelection({ x: coords.x, y: coords.y, w: 1, h: 1 });
      }
    } else {
      handleCanvasAction(e);
    }
  }, [activeTool, getTileCoords, handleCanvasAction]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      const dx = e.clientX - lastPanPos.current.x;
      const dy = e.clientY - lastPanPos.current.y;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      return;
    }

    const coords = getTileCoords(e);
    if (coords) setMousePos(coords);

    if (!isMouseDownRef.current) return;

    if ((activeTool === 'line' || activeTool === 'rect') && isDragging && coords) {
      setDragEnd(coords);
    } else if (activeTool === 'select' && isDragging && coords && dragStart) {
      setDragEnd(coords);
      setSelection({
        x: Math.min(dragStart.x, coords.x),
        y: Math.min(dragStart.y, coords.y),
        w: Math.abs(coords.x - dragStart.x) + 1,
        h: Math.abs(coords.y - dragStart.y) + 1,
      });
    } else if (activeTool === 'paint' || activeTool === 'erase') {
      handleCanvasAction(e);
    }
  }, [activeTool, isDragging, dragStart, getTileCoords, handleCanvasAction]);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;

    if (isMouseDownRef.current) {
      if ((activeTool === 'line' || activeTool === 'rect') && isDragging && dragStart && dragEnd) {
        const points = activeTool === 'line'
          ? bresenhamLine(dragStart.x, dragStart.y, dragEnd.x, dragEnd.y)
          : rectOutline(dragStart.x, dragStart.y, dragEnd.x, dragEnd.y);
        onSetTiles(points.map(p => ({ ...p, type: activeTile })));
      } else if (activeTool === 'select' && isDragging && dragStart && dragEnd) {
        setSelection({
          x: Math.min(dragStart.x, dragEnd.x),
          y: Math.min(dragStart.y, dragEnd.y),
          w: Math.abs(dragEnd.x - dragStart.x) + 1,
          h: Math.abs(dragEnd.y - dragStart.y) + 1,
        });
      }
    }

    isMouseDownRef.current = false;
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [activeTool, isDragging, dragStart, dragEnd, activeTile, onSetTiles]);

  const handleMouseLeave = useCallback(() => {
    isMouseDownRef.current = false;
    isPanningRef.current = false;
    setMousePos(null);
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    }
  }, [isDragging]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Zooming with the mouse wheel was found to be far too easy to trigger
    // by accident. Require an explicit modifier — Shift held, or Caps Lock
    // toggled on — before treating wheel events as zoom input. Without a
    // modifier, the wheel is a no-op (and we let it bubble naturally).
    const capsOn = typeof e.getModifierState === 'function' && e.getModifierState('CapsLock');
    if (!e.shiftKey && !capsOn) return;
    e.preventDefault();
    setZoom(prev => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      return Math.max(0.25, Math.min(4, prev + delta));
    });
  }, []);

  const handleMinimapClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mTile = Math.max(1, Math.min(Math.floor(MINIMAP_MAX_W / meta.width), Math.floor(MINIMAP_MAX_H / meta.height)));
    const tileX = (e.clientX - rect.left) / mTile;
    const tileY = (e.clientY - rect.top) / mTile;
    const newPanX = (meta.width / 2 - tileX) * zoom * tileSize;
    const newPanY = (meta.height / 2 - tileY) * zoom * tileSize;
    setPan({ x: newPanX, y: newPanY });
  }, [meta, zoom, tileSize]);

  const cursorStyle = activeTool === 'eyedropper' ? 'crosshair'
    : activeTool === 'fill' ? 'cell'
    : activeTool === 'note' ? 'copy'
    : activeTool === 'select' ? 'default'
    : 'crosshair';

  return (
    <div className="canvas-wrapper" ref={containerRef}>
      <div className="canvas-viewport">
        <div
          className="canvas-transform-container"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              cursor: cursorStyle,
              imageRendering: 'pixelated',
              display: 'block',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onContextMenu={e => e.preventDefault()}
            onWheel={handleWheel}
          />
        </div>
      </div>
      <div className="zoom-controls" title="Mouse-wheel zoom requires Shift or Caps Lock">
        <button onClick={() => setZoom(z => Math.min(4, z + 0.25))}>+</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}>-</button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
        <span className="zoom-hint">⇧ / ⇪ + wheel</span>
      </div>
      {mousePos && (
        <div className="coord-display">
          X: {mousePos.x} &nbsp; Y: {mousePos.y}
        </div>
      )}
      <canvas
        ref={minimapRef}
        className="minimap-canvas"
        onClick={handleMinimapClick}
        title="Minimap - click to pan"
      />
    </div>
  );
});

MapCanvas.displayName = 'MapCanvas';

export default MapCanvas;
