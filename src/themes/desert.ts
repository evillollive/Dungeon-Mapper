import type { TileTheme } from './index';
import type { TileType } from '../types/map';
import { jitterColor, drawWallDepth } from './artUtils';

export const desertTheme: TileTheme = {
  id: 'desert',
  name: 'Desert',
  tiles: [
    { id: 'empty', label: 'Open Sands' }, { id: 'floor', label: 'Sand' }, { id: 'wall', label: 'Sandstone' },
    { id: 'door-h', label: 'Tomb Door (H)' }, { id: 'door-v', label: 'Tomb Door (V)' },
    { id: 'secret-door', label: 'Hidden Chamber' },
    { id: 'locked-door-h', label: 'Locked Tomb Door (H)' }, { id: 'locked-door-v', label: 'Locked Tomb Door (V)' },
    { id: 'trapped-door-h', label: 'Trapped Tomb Door (H)' }, { id: 'trapped-door-v', label: 'Trapped Tomb Door (V)' },
    { id: 'portcullis', label: 'Sand Gate' }, { id: 'archway', label: 'Desert Arch' }, { id: 'barricade', label: 'Sand Barricade' },
    { id: 'stairs-up', label: 'Steps Up' }, { id: 'stairs-down', label: 'Steps Down' },
    { id: 'water', label: 'Oasis' }, { id: 'pillar', label: 'Cactus' },
    { id: 'trap', label: 'Quicksand' }, { id: 'treasure', label: 'Relic' }, { id: 'start', label: 'Caravan' },
  ],
  emptyTileId: 'empty',
  cssVars: {},
  tileColors: {
    empty: '#6b4a1a', floor: '#e8c878', wall: '#a86a32',
    'door-h': '#7a4a20', 'door-v': '#7a4a20',
    'secret-door': '#a86a32',
    'locked-door-h': '#6a4018', 'locked-door-v': '#6a4018',
    'trapped-door-h': '#8b3a14', 'trapped-door-v': '#8b3a14',
    portcullis: '#8a6a32', archway: '#c8a058', barricade: '#7a5a20',
    'stairs-up': '#c8a058', 'stairs-down': '#a07a40',
    water: '#3a9ec8', pillar: '#3a7a3a',
    trap: '#8b6914', treasure: '#d4af37', start: '#c83838',
  },
  gridColor: '#6a5020',
  drawTile(ctx: CanvasRenderingContext2D, type: TileType, x: number, y: number, size: number) {
    const px = x * size;
    const py = y * size;
    ctx.fillStyle = this.tileColors[type];
    ctx.fillRect(px, py, size, size);
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(px, py, size, size);

    const cx = px + size / 2;
    const cy = py + size / 2;
    const s = size;

    switch (type) {
      case 'empty': {
        // Soft dune ridge across the open sands.
        ctx.strokeStyle = '#8b5a20';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + 1, py + s * 0.65);
        ctx.quadraticCurveTo(cx, py + s * 0.45, px + s - 1, py + s * 0.65);
        ctx.stroke();
        break;
      }

      case 'floor': {
        ctx.fillStyle = jitterColor(this.tileColors.floor, x, y, 0.08);
        ctx.fillRect(px, py, size, size);
        // Scattered sand grains and a faint ripple.
        ctx.fillStyle = '#c8a868';
        for (let i = 0; i < 5; i++) {
          const dx = px + 2 + (i * 37) % (s - 4);
          const dy = py + 2 + (i * 23) % (s - 4);
          ctx.fillRect(dx, dy, 1, 1);
        }
        ctx.strokeStyle = '#c8a868';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + 2, py + s - 3);
        ctx.quadraticCurveTo(cx, py + s - 5, px + s - 2, py + s - 3);
        ctx.stroke();
        break;
      }

      case 'wall': {
        ctx.fillStyle = jitterColor(this.tileColors[type], x, y, 0.06);
        ctx.fillRect(px, py, size, size);
        drawWallDepth(ctx, px, py, size, 'shadow', this.tileColors[type], 0.4);
        // Sandstone bricks (offset rows).
        ctx.strokeStyle = '#6b3d10';
        ctx.lineWidth = 0.75;
        const rows = 3;
        for (let i = 1; i < rows; i++) {
          const wy = py + i * (s / rows);
          ctx.beginPath();
          ctx.moveTo(px + 1, wy);
          ctx.lineTo(px + s - 1, wy);
          ctx.stroke();
        }
        // Vertical seams, offset per row.
        ctx.beginPath();
        ctx.moveTo(cx, py + 1);
        ctx.lineTo(cx, py + s / rows);
        ctx.moveTo(px + s * 0.25, py + s / rows);
        ctx.lineTo(px + s * 0.25, py + (2 * s) / rows);
        ctx.moveTo(px + s * 0.75, py + s / rows);
        ctx.lineTo(px + s * 0.75, py + (2 * s) / rows);
        ctx.moveTo(cx, py + (2 * s) / rows);
        ctx.lineTo(cx, py + s - 1);
        ctx.stroke();
        break;
      }

      case 'secret-door': {
        // Sandstone bricks with a faint 'S' overlay.
        ctx.strokeStyle = '#6b3d10';
        ctx.lineWidth = 0.75;
        const rows = 3;
        for (let i = 1; i < rows; i++) {
          const wy = py + i * (s / rows);
          ctx.beginPath();
          ctx.moveTo(px + 1, wy);
          ctx.lineTo(px + s - 1, wy);
          ctx.stroke();
        }
        const fontSize = Math.max(7, Math.floor(s * 0.6));
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#c8a84b';
        ctx.fillText('S', cx, cy + 1);
        break;
      }

      case 'door-h': {
        // Stone slab door with hieroglyph stripes.
        ctx.fillStyle = '#7a4a20';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
        ctx.beginPath();
        ctx.moveTo(cx, cy - 3);
        ctx.lineTo(cx, cy + 3);
        ctx.stroke();
        break;
      }

      case 'door-v': {
        ctx.fillStyle = '#7a4a20';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy);
        ctx.lineTo(cx + 3, cy);
        ctx.stroke();
        break;
      }

      case 'locked-door-h': {
        ctx.fillStyle = '#7a4a20';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
        ctx.beginPath();
        ctx.moveTo(cx, cy - 3);
        ctx.lineTo(cx, cy + 3);
        ctx.stroke();
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 2, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(cx - 2, cy - 1, 4, 3);
        break;
      }

      case 'locked-door-v': {
        ctx.fillStyle = '#7a4a20';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy);
        ctx.lineTo(cx + 3, cy);
        ctx.stroke();
        ctx.strokeStyle = '#d4af37';
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 2, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(cx - 2, cy - 1, 4, 3);
        break;
      }

      case 'trapped-door-h': {
        ctx.fillStyle = '#7a4a20';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#cc4422';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 3);
        ctx.lineTo(cx + 3, cy + 3);
        ctx.moveTo(cx + 3, cy - 3);
        ctx.lineTo(cx - 3, cy + 3);
        ctx.stroke();
        break;
      }

      case 'trapped-door-v': {
        ctx.fillStyle = '#7a4a20';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#cc4422';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 3);
        ctx.lineTo(cx + 3, cy + 3);
        ctx.moveTo(cx + 3, cy - 3);
        ctx.lineTo(cx - 3, cy + 3);
        ctx.stroke();
        break;
      }

      case 'portcullis': {
        ctx.strokeStyle = '#6b3d10';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const lx = px + 3 + i * ((s - 6) / 3);
          ctx.beginPath();
          ctx.moveTo(lx, py + 2);
          ctx.lineTo(lx, py + s - 2);
          ctx.stroke();
        }
        for (let i = 0; i < 3; i++) {
          const ly = py + 4 + i * ((s - 8) / 2);
          ctx.beginPath();
          ctx.moveTo(px + 2, ly);
          ctx.lineTo(px + s - 2, ly);
          ctx.stroke();
        }
        break;
      }

      case 'archway': {
        ctx.fillStyle = '#a86a32';
        ctx.fillRect(px + 2, cy, s * 0.15, s / 2 - 2);
        ctx.fillRect(px + s - 2 - s * 0.15, cy, s * 0.15, s / 2 - 2);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.32, Math.PI, 0);
        ctx.stroke();
        break;
      }

      case 'barricade': {
        ctx.strokeStyle = '#8b6914';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.moveTo(px + s - 3, py + 3);
        ctx.lineTo(px + 3, py + s - 3);
        ctx.stroke();
        ctx.fillStyle = '#6b4a1a';
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
        break;
      }

      case 'stairs-up': {
        ctx.strokeStyle = '#6b4a1a';
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
        break;
      }

      case 'stairs-down': {
        ctx.strokeStyle = '#6b4a1a';
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
        break;
      }

      case 'water': {
        // Oasis pool with palm shadow ripples.
        ctx.strokeStyle = '#7accee';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const wy = py + 4 + i * (s / 3.5);
          ctx.beginPath();
          ctx.moveTo(px + 2, wy);
          for (let wx = 0; wx < s - 4; wx += 4) {
            ctx.quadraticCurveTo(px + 2 + wx + 1, wy - 2, px + 2 + wx + 2, wy);
            ctx.quadraticCurveTo(px + 2 + wx + 3, wy + 2, px + 2 + wx + 4, wy);
          }
          ctx.stroke();
        }
        break;
      }

      case 'pillar': {
        // Saguaro cactus.
        ctx.fillStyle = '#2a6a2a';
        ctx.fillRect(cx - 1.5, py + 3, 3, s - 6);
        ctx.fillRect(cx - s * 0.25, cy - 1, s * 0.1, s * 0.25);
        ctx.fillRect(cx + s * 0.15, cy - 2, s * 0.1, s * 0.28);
        // Rounded tops.
        ctx.beginPath();
        ctx.arc(cx, py + 3, 1.5, 0, Math.PI * 2);
        ctx.arc(cx - s * 0.2, cy - 1, s * 0.05, 0, Math.PI * 2);
        ctx.arc(cx + s * 0.2, cy - 2, s * 0.05, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'trap': {
        // Quicksand: concentric swirling arcs.
        ctx.strokeStyle = '#5a3a08';
        ctx.lineWidth = 1;
        for (let r = s * 0.12; r <= s * 0.32; r += s * 0.1) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0.2 * Math.PI, 1.6 * Math.PI);
          ctx.stroke();
        }
        break;
      }

      case 'treasure': {
        // Ankh-style relic on a pedestal.
        ctx.fillStyle = '#8b6914';
        ctx.fillRect(cx - s * 0.25, cy + s * 0.1, s * 0.5, s * 0.15);
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.arc(cx, cy - s * 0.1, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 1, cy - s * 0.05, 2, s * 0.2);
        ctx.fillRect(cx - s * 0.12, cy + s * 0.02, s * 0.24, 2);
        break;
      }

      case 'start': {
        // Caravan tent: triangle.
        ctx.fillStyle = '#c83838';
        ctx.beginPath();
        ctx.moveTo(cx, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.lineTo(px + 3, py + s - 3);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#f0e0a0';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, py + 3);
        ctx.lineTo(cx, py + s - 3);
        ctx.stroke();
        break;
      }
    }
  },
};
