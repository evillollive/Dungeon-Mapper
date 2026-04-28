import type { TileTheme } from './index';
import type { TileType } from '../types/map';
import { jitterColor, drawWallDepth, tileHash } from './artUtils';

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
  },
  gridColor: '#2d3561',
  drawTile(ctx: CanvasRenderingContext2D, type: TileType, x: number, y: number, size: number) {
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
        drawWallDepth(ctx, px, py, size, 'shadow', color, 0.5);
        ctx.fillStyle = '#262626';
        ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(px + 2, py + 2, s - 4, 2);
        ctx.fillRect(px + 2, py + 2, 2, s - 4);
        // Rough stone block mortar lines
        const wh = tileHash(x, y);
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + 2, py + Math.round(s / 3));
        ctx.lineTo(px + s - 2, py + Math.round(s / 3));
        ctx.moveTo(px + 2, py + Math.round(s * 2 / 3));
        ctx.lineTo(px + s - 2, py + Math.round(s * 2 / 3));
        // Vertical mortar seam offset by hash
        const vx = px + 2 + (s - 4) * (0.3 + wh * 0.4);
        ctx.moveTo(vx, py + 2);
        ctx.lineTo(vx, py + s - 2);
        ctx.stroke();
        break;
      }

      case 'secret-door': {
        // Render as a wall, with a faint 'S' overlay for the mapper.
        ctx.fillStyle = '#262626';
        ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(px + 2, py + 2, s - 4, 2);
        ctx.fillRect(px + 2, py + 2, 2, s - 4);
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
  },
};
