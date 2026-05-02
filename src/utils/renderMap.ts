/**
 * Standalone map renderer — draws a DungeonMap to an offscreen canvas at
 * any tile size, independent of the on-screen MapCanvas React component.
 *
 * Used by the print-optimized / high-DPI export to re-render the map at
 * 300 px-per-cell (= 300 DPI at 1 inch per cell) without touching the
 * visible canvas or its device-pixel-ratio scaling.
 */

import type { CustomThemeDefinition, DungeonMap, ViewMode, Token, ShapeMarker, AnnotationStroke, PlacedStamp } from '../types/map';
import { TOKEN_KIND_COLORS, isBuiltInTileType } from '../types/map';
import { drawPrintTile, PRINT_BG, PRINT_GRID } from '../themes/printMode';
import { drawTileOverlay } from '../themes/tileOverlays';
import { isTokenFogged } from './tokenVisibility';
import { ICON_BY_ID } from './iconLibrary';
import { getStampDef } from './stampCatalog';
import { getSemanticTileType, getThemeWithCustom } from './customThemes';
import type { TileDrawContext } from '../themes';

// Screen-mode canvas styling (mirrored from MapCanvas.tsx).
const SCREEN_BG = '#f4f1e4';
const FOG_PLAYER_FILL = '#6b7280';
const FOG_GM_FILL = 'rgba(107, 114, 128, 0.55)';
const EXPLORED_PLAYER_FILL = 'rgba(107, 114, 128, 0.55)';
const EXPLORED_GM_FILL = 'rgba(107, 114, 128, 0.35)';

/** Fog edge feathering for export renderer (mirrors MapCanvas.tsx version). */
function drawFogFeather(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tileSize: number,
  isFogged: (x: number, y: number) => boolean,
  fogRgb: [number, number, number],
  fogAlpha: number,
): void {
  const fp = Math.max(1, Math.round(tileSize * 0.08));
  ctx.save();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isFogged(x, y)) continue;
      const px = x * tileSize;
      const py = y * tileSize;
      if (y > 0 && isFogged(x, y - 1)) {
        const g = ctx.createLinearGradient(0, py, 0, py + fp);
        g.addColorStop(0, `rgba(${fogRgb[0]},${fogRgb[1]},${fogRgb[2]},${fogAlpha})`);
        g.addColorStop(1, `rgba(${fogRgb[0]},${fogRgb[1]},${fogRgb[2]},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(px, py, tileSize, fp);
      }
      if (y < height - 1 && isFogged(x, y + 1)) {
        const bot = py + tileSize;
        const g = ctx.createLinearGradient(0, bot, 0, bot - fp);
        g.addColorStop(0, `rgba(${fogRgb[0]},${fogRgb[1]},${fogRgb[2]},${fogAlpha})`);
        g.addColorStop(1, `rgba(${fogRgb[0]},${fogRgb[1]},${fogRgb[2]},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(px, bot - fp, tileSize, fp);
      }
      if (x > 0 && isFogged(x - 1, y)) {
        const g = ctx.createLinearGradient(px, 0, px + fp, 0);
        g.addColorStop(0, `rgba(${fogRgb[0]},${fogRgb[1]},${fogRgb[2]},${fogAlpha})`);
        g.addColorStop(1, `rgba(${fogRgb[0]},${fogRgb[1]},${fogRgb[2]},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(px, py, fp, tileSize);
      }
      if (x < width - 1 && isFogged(x + 1, y)) {
        const rt = px + tileSize;
        const g = ctx.createLinearGradient(rt, 0, rt - fp, 0);
        g.addColorStop(0, `rgba(${fogRgb[0]},${fogRgb[1]},${fogRgb[2]},${fogAlpha})`);
        g.addColorStop(1, `rgba(${fogRgb[0]},${fogRgb[1]},${fogRgb[2]},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(rt - fp, py, fp, tileSize);
      }
    }
  }
  ctx.restore();
}

export interface RenderMapOptions {
  /** Pixels per tile cell. At 300 DPI with 1 inch = 1 cell this is 300. */
  tileSize: number;
  /** Theme id to use for tile colors. */
  themeId: string;
  /** When true, render in black-and-white print mode. */
  printMode?: boolean;
  /** GM or player view mode. Defaults to 'gm'. */
  viewMode?: ViewMode;
  /**
   * Feet per tile cell for the scale bar. When set (> 0), a scale bar is
   * drawn in the bottom-right corner of the exported image. Default: 0
   * (no scale bar).
   */
  feetPerCell?: number;
  /** Project-scoped custom themes available for rendering custom tiles. */
  customThemes?: readonly CustomThemeDefinition[];
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
  const { tileSize, themeId, printMode = false, viewMode = 'gm', feetPerCell = 0, customThemes = [] } = opts;
  const theme = getThemeWithCustom(themeId, customThemes);
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

  const tileDrawContext: TileDrawContext = {
    getTileBaseType: (x, y) => {
      const type = map.tiles[y]?.[x]?.type;
      return type ? getSemanticTileType(type, customThemes) : undefined;
    },
  };

  // Tiles
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = map.tiles[y]?.[x];
      if (!tile) continue;
      if (printMode) {
        drawPrintTile(ctx, getSemanticTileType(tile.type, customThemes), x, y, tileSize);
      } else if (tile.type !== 'empty') {
        const tileTheme = tile.theme ? getThemeWithCustom(tile.theme, customThemes) : theme;
        tileTheme.drawTile(ctx, tile.type, x, y, tileSize, tileDrawContext);
        if (isBuiltInTileType(tile.type)) {
          drawTileOverlay(ctx, tile.type, x, y, tileSize, tileTheme.tileColors[tile.type]);
        }
      }
    }
  }

  // Grid lines
  ctx.strokeStyle = printMode ? PRINT_GRID : theme.gridColor;
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
  const dynamicFogActive = (map.dynamicFogEnabled ?? false) && fogActive;
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

  // Stamps
  for (const stamp of map.stamps ?? []) {
    renderStamp(ctx, stamp, tileSize);
  }

  // Tokens
  const tokens = map.tokens ?? [];
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

    // Fog edge feathering for exported images.
    const fogRgb: [number, number, number] = [107, 114, 128];
    const fogAlpha = isPlayerView ? 1.0 : 0.55;
    const isCellFogged = (fx: number, fy: number): boolean => {
      if (fx < 0 || fy < 0 || fx >= width || fy >= height) return false;
      return !!fog[fy]?.[fx];
    };
    drawFogFeather(ctx, width, height, tileSize, isCellFogged, fogRgb, fogAlpha);
  }

  // Scale bar — bottom-right corner
  if (feetPerCell > 0) {
    // Choose a round number of cells for the scale bar (at least 1, at most
    // 1/4 of the map width). Prefer lengths that produce round foot values.
    const maxBarCells = Math.max(1, Math.floor(width / 4));
    let barCells = 1;
    for (const candidate of [10, 5, 4, 3, 2, 1]) {
      if (candidate <= maxBarCells) { barCells = candidate; break; }
    }
    const barFeet = barCells * feetPerCell;
    const barPx = barCells * tileSize;
    const margin = tileSize * 0.5;
    const barHeight = Math.max(4, tileSize * 0.12);
    const fontSize = Math.max(10, tileSize * 0.35);
    const barX = canvasW - margin - barPx;
    const barY = canvasH - margin - barHeight;
    const labelText = `${barFeet} ft`;

    // Bar rectangle
    ctx.save();
    ctx.fillStyle = printMode ? '#000000' : '#1a1a2e';
    ctx.fillRect(barX, barY, barPx, barHeight);
    // End ticks
    const tickH = barHeight * 2;
    ctx.fillRect(barX, barY - (tickH - barHeight) / 2, Math.max(1, tileSize * 0.03), tickH);
    ctx.fillRect(barX + barPx - Math.max(1, tileSize * 0.03), barY - (tickH - barHeight) / 2, Math.max(1, tileSize * 0.03), tickH);
    // Label above bar
    ctx.font = `bold ${fontSize}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    // Shadow for readability
    ctx.fillStyle = printMode ? '#ffffff' : 'rgba(244, 241, 228, 0.85)';
    const labelX = barX + barPx / 2;
    const labelY = barY - barHeight * 0.3;
    const textW = ctx.measureText(labelText).width;
    const pad = fontSize * 0.25;
    ctx.fillRect(labelX - textW / 2 - pad, labelY - fontSize - pad, textW + pad * 2, fontSize + pad * 2);
    ctx.fillStyle = printMode ? '#000000' : '#1a1a2e';
    ctx.fillText(labelText, labelX, labelY);
    ctx.restore();
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
  // GM strokes use a dashed pattern to visually distinguish them.
  if (stroke.kind === 'gm') {
    const dash = Math.max(4, stroke.width * tileSize * 2.5);
    ctx.setLineDash([dash, dash * 0.6]);
  }
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

function renderStamp(
  ctx: CanvasRenderingContext2D,
  stamp: PlacedStamp,
  tileSize: number,
) {
  const def = getStampDef(stamp.stampId);
  if (!def) return;

  const cx = (stamp.x + 0.5) * tileSize;
  const cy = (stamp.y + 0.5) * tileSize;
  const scale = stamp.scale || 1;
  const drawSize = tileSize * scale;

  ctx.save();
  ctx.globalAlpha = stamp.opacity ?? 1;
  ctx.translate(cx, cy);
  if (stamp.rotation) ctx.rotate((stamp.rotation * Math.PI) / 180);
  if (stamp.flipX) ctx.scale(-1, 1);
  if (stamp.flipY) ctx.scale(1, -1);

  const vb = def.viewBox.split(/\s+/).map(Number);
  const vbW = vb[2] || 512;
  const vbH = vb[3] || 512;
  const svgScale = drawSize / Math.max(vbW, vbH);

  ctx.translate(-drawSize / 2, -drawSize / 2);
  ctx.scale(svgScale, svgScale);

  if (def.paths && def.paths.length > 0) {
    for (const p of def.paths) {
      const path2d = new Path2D(p.path);
      if (p.fill) { ctx.fillStyle = p.fill; ctx.fill(path2d); }
      if (p.stroke) { ctx.strokeStyle = p.stroke; ctx.lineWidth = p.strokeWidth ?? 1; ctx.stroke(path2d); }
    }
  } else if (def.svgPath) {
    const path2d = new Path2D(def.svgPath);
    ctx.fillStyle = '#4a4a4a';
    ctx.fill(path2d);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = Math.max(1, 2 / svgScale);
    ctx.stroke(path2d);
  }
  ctx.restore();
}
