/**
 * Standalone map renderer — draws a DungeonMap to an offscreen canvas at
 * any tile size, independent of the on-screen MapCanvas React component.
 *
 * Used by the print-optimized / high-DPI export to re-render the map at
 * 300 px-per-cell (= 300 DPI at 1 inch per cell) without touching the
 * visible canvas or its device-pixel-ratio scaling.
 */

import type { DungeonMap, ViewMode, Token, ShapeMarker, AnnotationStroke } from '../types/map';
import { TOKEN_KIND_COLORS } from '../types/map';
import { getTheme } from '../themes/index';
import { drawPrintTile, PRINT_BG, PRINT_GRID } from '../themes/printMode';
import { drawTileOverlay } from '../themes/tileOverlays';
import { isTokenFogged } from './tokenVisibility';
import { ICON_BY_ID } from './iconLibrary';

// Screen-mode canvas styling (mirrored from MapCanvas.tsx).
const SCREEN_BG = '#f4f1e4';
const SCREEN_GRID = '#5fb8c9';
const FOG_PLAYER_FILL = '#6b7280';
const FOG_GM_FILL = 'rgba(107, 114, 128, 0.55)';
const EXPLORED_PLAYER_FILL = 'rgba(107, 114, 128, 0.55)';
const EXPLORED_GM_FILL = 'rgba(107, 114, 128, 0.35)';

export interface RenderMapOptions {
  /** Pixels per tile cell. At 300 DPI with 1 inch = 1 cell this is 300. */
  tileSize: number;
  /** Theme id to use for tile colors. */
  themeId: string;
  /** When true, render in black-and-white print mode. */
  printMode?: boolean;
  /** GM or player view mode. Defaults to 'gm'. */
  viewMode?: ViewMode;
}

/**
 * Render the map to a new offscreen `<canvas>`. The returned canvas is
 * not attached to the DOM — the caller can draw it, export it as a blob,
 * or slice it into pages.
 */
export function renderMapToCanvas(
  map: DungeonMap,
  opts: RenderMapOptions,
): HTMLCanvasElement {
  const { tileSize, themeId, printMode = false, viewMode = 'gm' } = opts;
  const theme = getTheme(themeId);
  const { width, height } = map.meta;
  const isPlayerView = viewMode === 'player';
  const fogActive = map.fogEnabled ?? false;
  const fog = map.fog;

  const canvasW = width * tileSize;
  const canvasH = height * tileSize;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = printMode ? PRINT_BG : SCREEN_BG;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Tiles
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = map.tiles[y]?.[x];
      if (!tile) continue;
      if (printMode) {
        drawPrintTile(ctx, tile.type, x, y, tileSize);
      } else if (tile.type !== 'empty') {
        const tileTheme = tile.theme ? getTheme(tile.theme) : theme;
        tileTheme.drawTile(ctx, tile.type, x, y, tileSize);
        drawTileOverlay(ctx, tile.type, x, y, tileSize, tileTheme.tileColors[tile.type]);
      }
    }
  }

  // Grid lines
  ctx.strokeStyle = printMode ? PRINT_GRID : SCREEN_GRID;
  ctx.lineWidth = Math.max(0.5, tileSize * 0.02);
  for (let y = 0; y <= height; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * tileSize);
    ctx.lineTo(canvasW, y * tileSize);
    ctx.stroke();
  }
  for (let x = 0; x <= width; x++) {
    ctx.beginPath();
    ctx.moveTo(x * tileSize, 0);
    ctx.lineTo(x * tileSize, canvasH);
    ctx.stroke();
  }

  // Notes
  const isFogged = (nx: number, ny: number) => fogActive && !!fog?.[ny]?.[nx];
  const visibleNotes = (fogActive && isPlayerView)
    ? map.notes.filter(n => {
        if (!isFogged(n.x, n.y)) return true;
        if (dynamicFogActive && map.explored?.[n.y]?.[n.x]) return true;
        return false;
      })
    : map.notes;
  for (const note of visibleNotes) {
    const px = note.x * tileSize + tileSize / 2;
    const py = note.y * tileSize + tileSize / 2;
    const radius = tileSize * 0.38;
    if (printMode) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.25;
      ctx.stroke();
      ctx.fillStyle = '#000000';
    } else {
      ctx.fillStyle = '#f0c040';
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8b6914';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#1a1a2e';
    }
    ctx.font = `bold ${Math.max(8, tileSize * 0.45)}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(note.id), px, py + 0.5);
  }

  // Annotations
  for (const stroke of map.annotations ?? []) {
    if (isPlayerView && stroke.kind === 'gm') continue;
    renderAnnotation(ctx, stroke, tileSize);
  }

  // Shape markers
  for (const marker of map.markers ?? []) {
    renderMarker(ctx, marker, tileSize);
  }

  // Tokens
  const tokens = map.tokens ?? [];
  const dynamicFogActive = (map.dynamicFogEnabled ?? false) && fogActive;
  const visibleTokens = (fogActive && isPlayerView)
    ? tokens.filter(t => !isTokenFogged(t, fog, undefined, dynamicFogActive ? map.explored : undefined))
    : tokens;
  for (const token of visibleTokens) {
    renderToken(ctx, token, tileSize);
  }

  // Fog overlay
  const renderFog = fogActive && fog;
  if (renderFog) {
    if (dynamicFogActive && map.explored) {
      // 3-state fog for export: hidden (opaque) / explored (dimmed) / revealed (clear).
      // Note: exported images don't have ephemeral playerVisible, so explored
      // cells are rendered dimmed and unexplored fogged cells are opaque.
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!fog[y]?.[x]) continue;
          const isExplored = map.explored[y]?.[x] ?? false;
          ctx.save();
          ctx.fillStyle = isExplored
            ? (isPlayerView ? EXPLORED_PLAYER_FILL : EXPLORED_GM_FILL)
            : (isPlayerView ? FOG_PLAYER_FILL : FOG_GM_FILL);
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
          ctx.restore();
        }
      }
    } else {
      ctx.save();
      ctx.fillStyle = isPlayerView ? FOG_PLAYER_FILL : FOG_GM_FILL;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (fog[y]?.[x]) {
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
          }
        }
      }
      ctx.restore();
    }
  }

  return canvas;
}

// ── Internal helpers (mirror MapCanvas.tsx drawing) ──────────────────

function renderToken(
  ctx: CanvasRenderingContext2D,
  token: Token,
  tileSize: number,
) {
  const size = Math.max(1, Math.floor(token.size ?? 1));
  const px = token.x * tileSize + (tileSize * size) / 2;
  const py = token.y * tileSize + (tileSize * size) / 2;
  const radius = tileSize * size * 0.42;
  const fill = token.color ?? TOKEN_KIND_COLORS[token.kind];

  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(1, tileSize * size * 0.08);
  ctx.strokeStyle = '#1a1a2e';
  ctx.stroke();

  const iconDef = token.icon ? ICON_BY_ID.get(token.icon) : undefined;
  if (iconDef) {
    const iconSize = radius * 1.5;
    const scale = iconSize / 512;
    ctx.save();
    ctx.translate(px - iconSize / 2, py - iconSize / 2);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fill(new Path2D(iconDef.path));
    ctx.restore();
  } else {
    const glyph = token.icon ?? (token.label?.[0] ?? token.kind[0] ?? '?').toUpperCase();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(8, tileSize * size * 0.5)}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, px, py + 0.5);
  }
  ctx.restore();
}

function renderAnnotation(
  ctx: CanvasRenderingContext2D,
  stroke: AnnotationStroke,
  tileSize: number,
) {
  if (stroke.points.length === 0) return;
  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = Math.max(1, stroke.width * tileSize);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < stroke.points.length; i++) {
    const px = stroke.points[i].x * tileSize;
    const py = stroke.points[i].y * tileSize;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  if (stroke.points.length === 1) {
    const p = stroke.points[0];
    ctx.fillStyle = stroke.color;
    ctx.beginPath();
    ctx.arc(p.x * tileSize, p.y * tileSize, Math.max(1, stroke.width * tileSize / 2), 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.stroke();
  }
  ctx.restore();
}

function renderMarker(
  ctx: CanvasRenderingContext2D,
  marker: ShapeMarker,
  tileSize: number,
) {
  const cx = marker.x * tileSize + tileSize / 2;
  const cy = marker.y * tileSize + tileSize / 2;
  const r = marker.size * tileSize;
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = marker.color;
  ctx.beginPath();
  if (marker.shape === 'circle') {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  } else if (marker.shape === 'square') {
    ctx.rect(cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
  }
  ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = marker.color;
  ctx.lineWidth = Math.max(1, tileSize * 0.08);
  ctx.stroke();
  ctx.restore();
}
