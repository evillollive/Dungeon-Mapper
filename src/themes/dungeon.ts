import type { TileDrawContext, TileTheme } from './index';
import type { BuiltInTileType, TileType } from '../types/map';
import { jitterColor, drawWallDepth, tileHash } from './artUtils';

const WALL_SEAM_HASH_OFFSET_X = 13;
const WALL_SEAM_HASH_OFFSET_Y = 29;
const WALL_THICKNESS_RATIO = 0.58;
const WALL_CORNER_RADIUS_RATIO = 0.12;
const WALL_SEGMENT_OVERLAP_RATIO = 0.02;

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStoneBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, '#f2f4ee');
  gradient.addColorStop(0.28, '#bfc5be');
  gradient.addColorStop(0.72, '#858d88');
  gradient.addColorStop(1, '#424947');

  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = '#101312';
  ctx.lineWidth = Math.max(0.75, Math.min(width, height) * 0.08);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = Math.max(0.75, Math.min(width, height) * 0.06);
  ctx.beginPath();
  ctx.moveTo(x + radius, y + ctx.lineWidth);
  ctx.lineTo(x + width - radius, y + ctx.lineWidth);
  ctx.moveTo(x + ctx.lineWidth, y + radius);
  ctx.lineTo(x + ctx.lineWidth, y + height - radius);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.moveTo(x + radius, y + height - ctx.lineWidth);
  ctx.lineTo(x + width - radius, y + height - ctx.lineWidth);
  ctx.moveTo(x + width - ctx.lineWidth, y + radius);
  ctx.lineTo(x + width - ctx.lineWidth, y + height - radius);
  ctx.stroke();
}

function isWallLike(baseType: BuiltInTileType | undefined): boolean {
  return baseType === 'wall' || baseType === 'secret-door';
}

function drawWallSeam(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  s: number,
  x: number,
  y: number,
  orientation: 'horizontal' | 'vertical',
): void {
  const h = tileHash(x + WALL_SEAM_HASH_OFFSET_X, y + WALL_SEAM_HASH_OFFSET_Y);
  ctx.strokeStyle = 'rgba(20,24,23,0.55)';
  ctx.lineWidth = Math.max(0.5, s * 0.035);
  ctx.beginPath();
  if (orientation === 'horizontal') {
    const sx = px + s * (0.35 + h * 0.3);
    ctx.moveTo(sx, py + s * 0.28);
    ctx.lineTo(sx, py + s * 0.72);
  } else {
    const sy = py + s * (0.35 + h * 0.3);
    ctx.moveTo(px + s * 0.28, sy);
    ctx.lineTo(px + s * 0.72, sy);
  }
  ctx.stroke();
}

function drawDungeonWall(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  s: number,
  x: number,
  y: number,
  context?: TileDrawContext,
): void {
  const t = Math.max(5, s * WALL_THICKNESS_RATIO);
  const half = s / 2;
  const band = t / 2;
  const r = Math.max(2, s * WALL_CORNER_RADIUS_RATIO);
  const overlap = s * WALL_SEGMENT_OVERLAP_RATIO;

  ctx.fillStyle = '#111514';
  ctx.fillRect(px, py, s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(px + s * 0.08, py + s * 0.1, s * 0.94, s * 0.94);

  if (!context) {
    drawStoneBlock(ctx, px + s * 0.14, py + s * 0.14, s * 0.72, s * 0.72, r);
    return;
  }

  const north = isWallLike(context.getTileBaseType(x, y - 1));
  const east = isWallLike(context.getTileBaseType(x + 1, y));
  const south = isWallLike(context.getTileBaseType(x, y + 1));
  const west = isWallLike(context.getTileBaseType(x - 1, y));
  const horizontal = east || west;
  const vertical = north || south;
  const straightHorizontal = east && west && !north && !south;
  const straightVertical = north && south && !east && !west;

  if (straightHorizontal) {
    drawStoneBlock(ctx, px - overlap, py + half - band, s + overlap * 2, t, r);
    drawWallSeam(ctx, px, py, s, x, y, 'horizontal');
    return;
  }

  if (straightVertical) {
    drawStoneBlock(ctx, px + half - band, py - overlap, t, s + overlap * 2, r);
    drawWallSeam(ctx, px, py, s, x, y, 'vertical');
    return;
  }

  if (north) drawStoneBlock(ctx, px + half - band, py - overlap, t, half + band, r);
  if (south) drawStoneBlock(ctx, px + half - band, py + half - band, t, half + band + overlap, r);
  if (west) drawStoneBlock(ctx, px - overlap, py + half - band, half + band, t, r);
  if (east) drawStoneBlock(ctx, px + half - band, py + half - band, half + band + overlap, t, r);

  if (!horizontal && !vertical) {
    drawStoneBlock(ctx, px + s * 0.14, py + s * 0.14, s * 0.72, s * 0.72, r);
  } else {
    drawStoneBlock(ctx, px + half - band, py + half - band, t, t, r);
  }
}

// Dungeon theme: a gritty subterranean crawl — damp stone walls, rough flagged
// floors, iron-bound timber doors, and torchlit gold accents. This carries the
// classic underground dungeon feel that the original "Fantasy" theme depicted.
export const dungeonTheme: TileTheme = {
  id: 'dungeon',
  name: 'Dungeon',
  tiles: [
    { id: 'empty', label: 'Void' }, { id: 'floor', label: 'Flagstone' }, { id: 'wall', label: 'Stone Wall' },
    { id: 'door-h', label: 'Iron Door (H)' }, { id: 'door-v', label: 'Iron Door (V)' },
    { id: 'secret-door', label: 'Secret Door' },
    { id: 'locked-door-h', label: 'Locked Iron Door (H)' }, { id: 'locked-door-v', label: 'Locked Iron Door (V)' },
    { id: 'trapped-door-h', label: 'Trapped Iron Door (H)' }, { id: 'trapped-door-v', label: 'Trapped Iron Door (V)' },
    { id: 'portcullis', label: 'Iron Portcullis' }, { id: 'archway', label: 'Stone Archway' }, { id: 'barricade', label: 'Wooden Barricade' },
    { id: 'stairs-up', label: 'Stairs Up' }, { id: 'stairs-down', label: 'Stairs Down' },
    { id: 'water', label: 'Underground Pool' }, { id: 'pillar', label: 'Pillar' },
    { id: 'trap', label: 'Trap' }, { id: 'treasure', label: 'Treasure' }, { id: 'start', label: 'Entrance' },
    { id: 'background', label: 'Cave Rock' },
  ],
  emptyTileId: 'empty',
  cssVars: {},
  tileColors: {
    empty: '#0f0f1c', floor: '#8a7a60', wall: '#3a3a3a',
    'door-h': '#6b4f1d', 'door-v': '#6b4f1d',
    'secret-door': '#3a3a3a',
    'locked-door-h': '#5a3a0d', 'locked-door-v': '#5a3a0d',
    'trapped-door-h': '#6b1a1a', 'trapped-door-v': '#6b1a1a',
    portcullis: '#4a4a4a', archway: '#7a6a50', barricade: '#5a4020',
    'stairs-up': '#7a9e7e', 'stairs-down': '#5a7a5e',
    water: '#1a4f7a', pillar: '#5a5a5a', trap: '#8e1e1e',
    treasure: '#d4af37', start: '#2e8b57',
    background: '#2a2218',
  },
  gridColor: '#2d3561',
  drawTile(ctx: CanvasRenderingContext2D, type: TileType, x: number, y: number, size: number, context?: TileDrawContext) {
    const px = x * size;
    const py = y * size;
    const color = this.tileColors[type];

    ctx.fillStyle = color;
    ctx.fillRect(px, py, size, size);

    ctx.strokeStyle = this.gridColor;
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
        ctx.fillStyle = jitterColor(this.tileColors.floor, x, y, 0.08);
        ctx.fillRect(px, py, size, size);
        // Stone flagstone mortar lines
        const fh = tileHash(x, y);
        ctx.strokeStyle = '#5a4a30';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px, py + s * 0.35);
        ctx.lineTo(px + s, py + s * 0.35);
        ctx.moveTo(px, py + s * 0.7);
        ctx.lineTo(px + s, py + s * 0.7);
        ctx.moveTo(px + s * (0.3 + fh * 0.4), py);
        ctx.lineTo(px + s * (0.3 + fh * 0.4), py + s);
        ctx.stroke();
        // Subtle mortar fleck to suggest rough flagstones.
        ctx.fillStyle = '#2a2418';
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
        break;
      }

      case 'wall': {
        ctx.fillStyle = jitterColor(color, x, y, 0.06);
        ctx.fillRect(px, py, size, size);
        drawWallDepth(ctx, px, py, size, 'shadow', color, 0.6);
        drawDungeonWall(ctx, px, py, s, x, y, context);
        break;
      }

      case 'secret-door': {
        drawDungeonWall(ctx, px, py, s, x, y, context);
        const fontSize = Math.max(7, Math.floor(s * 0.6));
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#c8a84b';
        ctx.fillText('S', cx, cy + 1);
        break;
      }

      case 'door-h': {
        ctx.fillStyle = '#c8a84b';
        ctx.fillRect(px + 2, cy - 2, s - 4, 4);
        // Iron band stripes at 1/3 and 2/3
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 0.5;
        const doorW = s - 4;
        ctx.beginPath();
        ctx.moveTo(px + 2 + doorW / 3, cy - 2);
        ctx.lineTo(px + 2 + doorW / 3, cy + 2);
        ctx.moveTo(px + 2 + doorW * 2 / 3, cy - 2);
        ctx.lineTo(px + 2 + doorW * 2 / 3, cy + 2);
        ctx.stroke();
        // Rivet dot
        ctx.fillStyle = '#555555';
        ctx.beginPath();
        ctx.arc(cx, cy, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f0f1c';
        ctx.fillRect(cx - 3, cy - 2, 6, 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1.5;
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
        // Iron band stripes at 1/3 and 2/3
        const doorH = s - 4;
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - 2, py + 2 + doorH / 3);
        ctx.lineTo(cx + 2, py + 2 + doorH / 3);
        ctx.moveTo(cx - 2, py + 2 + doorH * 2 / 3);
        ctx.lineTo(cx + 2, py + 2 + doorH * 2 / 3);
        ctx.stroke();
        // Rivet dot
        ctx.fillStyle = '#555555';
        ctx.beginPath();
        ctx.arc(cx, cy, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f0f1c';
        ctx.fillRect(cx - 2, cy - 3, 4, 6);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, py + 2);
        ctx.lineTo(cx, cy - 4);
        ctx.moveTo(cx, cy + 4);
        ctx.lineTo(cx, py + s - 2);
        ctx.stroke();
        break;
      }

      case 'locked-door-h': {
        ctx.fillStyle = '#c8a84b';
        ctx.fillRect(px + 2, cy - 2, s - 4, 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.beginPath();
        ctx.moveTo(px + 2, cy);
        ctx.lineTo(px + s - 2, cy);
        ctx.stroke();
        // Lock symbol
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(cx, cy - 1, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 1.5, cy, 3, 3);
        break;
      }

      case 'locked-door-v': {
        ctx.fillStyle = '#c8a84b';
        ctx.fillRect(cx - 2, py + 2, 4, s - 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.beginPath();
        ctx.moveTo(cx, py + 2);
        ctx.lineTo(cx, py + s - 2);
        ctx.stroke();
        // Lock symbol
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(cx, cy - 1, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 1.5, cy, 3, 3);
        break;
      }

      case 'trapped-door-h': {
        ctx.fillStyle = '#c8a84b';
        ctx.fillRect(px + 2, cy - 2, s - 4, 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.beginPath();
        ctx.moveTo(px + 2, cy);
        ctx.lineTo(px + s - 2, cy);
        ctx.stroke();
        // Red danger X
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 3);
        ctx.lineTo(cx + 3, cy + 3);
        ctx.moveTo(cx + 3, cy - 3);
        ctx.lineTo(cx - 3, cy + 3);
        ctx.stroke();
        break;
      }

      case 'trapped-door-v': {
        ctx.fillStyle = '#c8a84b';
        ctx.fillRect(cx - 2, py + 2, 4, s - 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.beginPath();
        ctx.moveTo(cx, py + 2);
        ctx.lineTo(cx, py + s - 2);
        ctx.stroke();
        // Red danger X
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 3);
        ctx.lineTo(cx + 3, cy + 3);
        ctx.moveTo(cx + 3, cy - 3);
        ctx.lineTo(cx - 3, cy + 3);
        ctx.stroke();
        break;
      }

      case 'portcullis': {
        // Grid/grill pattern
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1.5;
        const g = s * 0.3;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + i * g, py + 3);
          ctx.lineTo(cx + i * g, py + s - 3);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(px + 3, cy + i * g);
          ctx.lineTo(px + s - 3, cy + i * g);
          ctx.stroke();
        }
        break;
      }

      case 'archway': {
        // Two pillars with an arc
        ctx.fillStyle = '#a09070';
        ctx.fillRect(px + 3, cy, 4, s / 2 - 2);
        ctx.fillRect(px + s - 7, cy, 4, s / 2 - 2);
        ctx.strokeStyle = '#a09070';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, s / 2 - 5, Math.PI, 0);
        ctx.stroke();
        break;
      }

      case 'barricade': {
        // Crossed wooden planks
        ctx.fillStyle = '#7a6040';
        ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
        ctx.strokeStyle = '#3a2010';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.moveTo(px + s - 3, py + 3);
        ctx.lineTo(px + 3, py + s - 3);
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
        // Underground pool — concentric oval ripples with torchlight reflections
        const wh = tileHash(x, y);
        const wh2 = tileHash(x + 3, y + 7);
        const offX = (wh - 0.5) * s * 0.15;
        const offY = (wh2 - 0.5) * s * 0.15;
        ctx.strokeStyle = '#3a7a9a';
        ctx.lineWidth = 0.7;
        for (let ri = 1; ri <= 3; ri++) {
          ctx.beginPath();
          ctx.ellipse(cx + offX, cy + offY, s * 0.12 * ri, s * 0.08 * ri, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Torchlight highlight dots
        ctx.fillStyle = '#8ac8e8';
        const dotH = tileHash(x + 5, y + 11);
        ctx.beginPath();
        ctx.arc(cx + offX + s * 0.06, cy + offY - s * 0.04, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + offX - s * 0.1, cy + offY + s * (0.02 + dotH * 0.06), 0.8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'pillar': {
        ctx.fillStyle = '#777';
        ctx.beginPath();
        ctx.arc(cx, cy, s / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#bbb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, s / 4, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'trap': {
        // Pressure plate trap — recessed plate with seam and spike hints
        const plateInset = s * 0.15;
        ctx.fillStyle = '#6a1010';
        ctx.fillRect(px + plateInset, py + plateInset, s - plateInset * 2, s - plateInset * 2);
        // Seam/crack line around edge
        ctx.strokeStyle = '#4a0a0a';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + plateInset, py + plateInset, s - plateInset * 2, s - plateInset * 2);
        // Inner recessed shadow
        ctx.strokeStyle = '#aa3333';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px + plateInset + 2, py + plateInset + 2, s - plateInset * 2 - 4, s - plateInset * 2 - 4);
        // Triangular spike hints at corners
        ctx.fillStyle = '#cc4444';
        const sp = plateInset + 1;
        // Top-left spike
        ctx.beginPath();
        ctx.moveTo(px + sp, py + sp);
        ctx.lineTo(px + sp + 3, py + sp);
        ctx.lineTo(px + sp, py + sp + 3);
        ctx.closePath();
        ctx.fill();
        // Bottom-right spike
        ctx.beginPath();
        ctx.moveTo(px + s - sp, py + s - sp);
        ctx.lineTo(px + s - sp - 3, py + s - sp);
        ctx.lineTo(px + s - sp, py + s - sp - 3);
        ctx.closePath();
        ctx.fill();
        // Top-right spike
        ctx.beginPath();
        ctx.moveTo(px + s - sp, py + sp);
        ctx.lineTo(px + s - sp - 3, py + sp);
        ctx.lineTo(px + s - sp, py + sp + 3);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'treasure': {
        // Gold chest with lock and spilling coins
        const tw = s * 0.5;
        const th = s * 0.35;
        const tx = cx - tw / 2;
        const ty = cy - th / 2;
        // Chest body (dark brown)
        ctx.fillStyle = '#5a3a10';
        ctx.fillRect(tx, ty + th * 0.4, tw, th * 0.6);
        // Gold trim lid
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(tx, ty, tw, th * 0.45);
        // Lid outline
        ctx.strokeStyle = '#8b6914';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(tx, ty, tw, th * 0.45);
        ctx.strokeRect(tx, ty + th * 0.4, tw, th * 0.6);
        // Circular lock on front
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(cx, ty + th * 0.55, tw * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(cx, ty + th * 0.55, tw * 0.05, 0, Math.PI * 2);
        ctx.fill();
        // Spilling gold coins on the right side
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(tx + tw + 2, ty + th * 0.7, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e6c200';
        ctx.beginPath();
        ctx.arc(tx + tw + 1, ty + th * 0.4, s * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ccaa00';
        ctx.beginPath();
        ctx.arc(tx + tw + 3, ty + th * 0.9, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'start': {
        // Stone archway entrance with mossy green tint
        const pillarW = s * 0.15;
        const archTop = py + s * 0.25;
        // Left stone pillar
        ctx.fillStyle = '#4a6a4a';
        ctx.fillRect(px + 3, archTop + s * 0.15, pillarW, s * 0.55);
        // Right stone pillar
        ctx.fillRect(px + s - 3 - pillarW, archTop + s * 0.15, pillarW, s * 0.55);
        // Curved arch at top (mossy green stones)
        ctx.strokeStyle = '#5a7a5a';
        ctx.lineWidth = pillarW * 0.8;
        ctx.beginPath();
        ctx.arc(cx, archTop + s * 0.15, s * 0.5 - 3 - pillarW / 2, Math.PI, 0);
        ctx.stroke();
        // Pillar stone line details
        ctx.strokeStyle = '#3a5a3a';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + 3, archTop + s * 0.35);
        ctx.lineTo(px + 3 + pillarW, archTop + s * 0.35);
        ctx.moveTo(px + 3, archTop + s * 0.5);
        ctx.lineTo(px + 3 + pillarW, archTop + s * 0.5);
        ctx.moveTo(px + s - 3 - pillarW, archTop + s * 0.35);
        ctx.lineTo(px + s - 3, archTop + s * 0.35);
        ctx.moveTo(px + s - 3 - pillarW, archTop + s * 0.5);
        ctx.lineTo(px + s - 3, archTop + s * 0.5);
        ctx.stroke();
        // Downward entry arrow below arch
        ctx.fillStyle = '#b0e0b0';
        ctx.beginPath();
        ctx.moveTo(cx, py + s - 3);
        ctx.lineTo(cx - 3, py + s - 7);
        ctx.lineTo(cx + 3, py + s - 7);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(cx - 1, py + s - 10, 2, 4);
        break;
      }

      case 'background': {
        ctx.fillStyle = '#2a2218';
        ctx.fillRect(px, py, s, s);
        ctx.strokeStyle = '#1a1610';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 8; i++) {
          const h = tileHash(x * 13 + i, y * 7 + i);
          const lx = px + h * s;
          const ly = py + tileHash(x + i, y * 3 + i) * s;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + (h - 0.5) * s * 0.3, ly + (tileHash(x * 5 + i, y) - 0.5) * s * 0.3);
          ctx.stroke();
        }
        for (let i = 0; i < 6; i++) {
          const h = tileHash(x * 9 + i, y * 11 + i);
          ctx.fillStyle = jitterColor('#3a3228', 15, x * 7 + i, y * 3 + i);
          ctx.fillRect(px + h * s * 0.9, py + tileHash(x + i * 3, y * 5) * s * 0.9, 2, 2);
        }
        break;
      }
    }
  },
};
