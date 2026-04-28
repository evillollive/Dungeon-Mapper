import type { TileTheme } from './index';
import type { TileType } from '../types/map';
import { jitterColor, drawWallDepth, tileHash } from './artUtils';

export const oldwestTheme: TileTheme = {
  id: 'oldwest',
  name: 'Old West',
  tiles: [
    { id: 'empty', label: 'Dust' }, { id: 'floor', label: 'Dirt' }, { id: 'wall', label: 'Plank Wall' },
    { id: 'door-h', label: 'Saloon Door (H)' }, { id: 'door-v', label: 'Saloon Door (V)' },
    { id: 'secret-door', label: 'Hidden Passage' },
    { id: 'locked-door-h', label: 'Locked Plank Door (H)' }, { id: 'locked-door-v', label: 'Locked Plank Door (V)' },
    { id: 'trapped-door-h', label: 'Trapped Plank Door (H)' }, { id: 'trapped-door-v', label: 'Trapped Plank Door (V)' },
    { id: 'portcullis', label: 'Jail Gate' }, { id: 'archway', label: 'Open Doorway' }, { id: 'barricade', label: 'Wooden Barricade' },
    { id: 'stairs-up', label: 'Stairs Up' }, { id: 'stairs-down', label: 'Stairs Down' },
    { id: 'water', label: 'Water Trough' }, { id: 'pillar', label: 'Post' },
    { id: 'trap', label: 'Bear Trap' }, { id: 'treasure', label: 'Gold' }, { id: 'start', label: 'Entrance' },
  ],
  emptyTileId: 'empty',
  cssVars: {},
  tileColors: {
    empty: '#2b1a0a', floor: '#c8a878', wall: '#6b3d1e',
    'door-h': '#8b5a2b', 'door-v': '#8b5a2b',
    'secret-door': '#6b3d1e',
    'locked-door-h': '#7a4a20', 'locked-door-v': '#7a4a20',
    'trapped-door-h': '#8b3a1e', 'trapped-door-v': '#8b3a1e',
    portcullis: '#555555', archway: '#a08050', barricade: '#6b4420',
    'stairs-up': '#a0956a', 'stairs-down': '#857a55',
    water: '#3a7a9e', pillar: '#8b6914', trap: '#8b0000',
    treasure: '#d4af37', start: '#4a7a2a',
  },
  gridColor: '#3a2a18',
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
        ctx.fillStyle = '#3a2510';
        for (let i = 0; i < 3; i++) {
          const dx = px + 3 + i * (s / 3);
          const dy = py + 3 + i * (s / 4);
          ctx.fillRect(dx, dy, 1, 1);
        }
        break;
      }

      case 'floor': {
        ctx.fillStyle = jitterColor(this.tileColors.floor, x, y, 0.08);
        ctx.fillRect(px, py, size, size);
        ctx.fillStyle = '#b09060';
        for (let i = 0; i < 5; i++) {
          const dx = px + 2 + (i * 37) % (s - 4);
          const dy = py + 2 + (i * 23) % (s - 4);
          ctx.fillRect(dx, dy, 1, 1);
        }
        // Boot print marks
        const bh0 = tileHash(x, y);
        const bh1 = tileHash(x + 5, y + 7);
        ctx.fillStyle = '#8a6a40';
        ctx.fillRect(px + 3 + bh0 * (s - 8), py + 3 + bh1 * (s - 8), 3, 1);
        if (bh0 > 0.4) {
          ctx.fillRect(px + 3 + bh1 * (s - 8), py + 5 + bh0 * (s - 10), 3, 1);
        }
        break;
      }

      case 'wall': {
        ctx.fillStyle = jitterColor(this.tileColors[type], x, y, 0.06);
        ctx.fillRect(px, py, size, size);
        drawWallDepth(ctx, px, py, size, 'hard-edge', this.tileColors[type], 0.5);
        ctx.strokeStyle = '#4a2a10';
        ctx.lineWidth = 1;
        const planks = 3;
        for (let i = 1; i < planks; i++) {
          const wy = py + i * (s / planks);
          ctx.beginPath();
          ctx.moveTo(px + 1, wy);
          ctx.lineTo(px + s - 1, wy);
          ctx.stroke();
        }
        // Nail dots
        ctx.fillStyle = '#1a1a1a';
        const nh0 = tileHash(x, y);
        const nh1 = tileHash(x + 3, y + 5);
        const nh2 = tileHash(x + 11, y + 13);
        ctx.fillRect(px + 3 + nh0 * (s - 6), py + 3 + nh1 * (s - 6), 1, 1);
        ctx.fillRect(px + 3 + nh1 * (s - 6), py + 3 + nh2 * (s - 6), 1, 1);
        ctx.fillRect(px + 3 + nh2 * (s - 6), py + 3 + nh0 * (s - 6), 1, 1);
        break;
      }

      case 'secret-door': {
        // Plank wall with a faint 'S' for the mapper.
        ctx.strokeStyle = '#4a2a10';
        ctx.lineWidth = 1;
        const planks = 3;
        for (let i = 1; i < planks; i++) {
          const wy = py + i * (s / planks);
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
        ctx.fillStyle = '#6b3d1e';
        ctx.fillRect(px + 2, py + 2, (s - 4) / 2 - 1, s - 4);
        ctx.fillRect(cx + 1, py + 2, (s - 4) / 2 - 1, s - 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, py + 2, (s - 4) / 2 - 1, s - 4);
        ctx.strokeRect(cx + 1, py + 2, (s - 4) / 2 - 1, s - 4);
        // Louver slats inside each door panel
        ctx.strokeStyle = '#4a2a10';
        ctx.lineWidth = 0.5;
        const leftMid = px + 2 + ((s - 4) / 2 - 1) / 2;
        const rightMid = cx + 1 + ((s - 4) / 2 - 1) / 2;
        const slat1y = py + 2 + (s - 4) * 0.35;
        const slat2y = py + 2 + (s - 4) * 0.55;
        ctx.beginPath();
        ctx.moveTo(leftMid - 3, slat1y);
        ctx.lineTo(leftMid + 3, slat1y);
        ctx.moveTo(leftMid - 3, slat2y);
        ctx.lineTo(leftMid + 3, slat2y);
        ctx.moveTo(rightMid - 3, slat1y);
        ctx.lineTo(rightMid + 3, slat1y);
        ctx.moveTo(rightMid - 3, slat2y);
        ctx.lineTo(rightMid + 3, slat2y);
        ctx.stroke();
        break;
      }

      case 'door-v': {
        ctx.fillStyle = '#6b3d1e';
        ctx.fillRect(px + 2, py + 2, s - 4, (s - 4) / 2 - 1);
        ctx.fillRect(px + 2, cy + 1, s - 4, (s - 4) / 2 - 1);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, py + 2, s - 4, (s - 4) / 2 - 1);
        ctx.strokeRect(px + 2, cy + 1, s - 4, (s - 4) / 2 - 1);
        // Louver slats inside each door panel (rotated)
        ctx.strokeStyle = '#4a2a10';
        ctx.lineWidth = 0.5;
        const topMid = py + 2 + ((s - 4) / 2 - 1) / 2;
        const botMid = cy + 1 + ((s - 4) / 2 - 1) / 2;
        const slatV1x = px + 2 + (s - 4) * 0.35;
        const slatV2x = px + 2 + (s - 4) * 0.55;
        ctx.beginPath();
        ctx.moveTo(slatV1x, topMid - 3);
        ctx.lineTo(slatV1x, topMid + 3);
        ctx.moveTo(slatV2x, topMid - 3);
        ctx.lineTo(slatV2x, topMid + 3);
        ctx.moveTo(slatV1x, botMid - 3);
        ctx.lineTo(slatV1x, botMid + 3);
        ctx.moveTo(slatV2x, botMid - 3);
        ctx.lineTo(slatV2x, botMid + 3);
        ctx.stroke();
        break;
      }

      case 'locked-door-h': {
        ctx.fillStyle = '#6b3d1e';
        ctx.fillRect(px + 2, py + 2, (s - 4) / 2 - 1, s - 4);
        ctx.fillRect(cx + 1, py + 2, (s - 4) / 2 - 1, s - 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, py + 2, (s - 4) / 2 - 1, s - 4);
        ctx.strokeRect(cx + 1, py + 2, (s - 4) / 2 - 1, s - 4);
        // Lock symbol
        ctx.strokeStyle = '#ffe080';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 2.5, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#ffe080';
        ctx.fillRect(cx - 2.5, cy - 1, 5, 4);
        break;
      }

      case 'locked-door-v': {
        ctx.fillStyle = '#6b3d1e';
        ctx.fillRect(px + 2, py + 2, s - 4, (s - 4) / 2 - 1);
        ctx.fillRect(px + 2, cy + 1, s - 4, (s - 4) / 2 - 1);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, py + 2, s - 4, (s - 4) / 2 - 1);
        ctx.strokeRect(px + 2, cy + 1, s - 4, (s - 4) / 2 - 1);
        ctx.strokeStyle = '#ffe080';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 2.5, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#ffe080';
        ctx.fillRect(cx - 2.5, cy - 1, 5, 4);
        break;
      }

      case 'trapped-door-h': {
        ctx.fillStyle = '#6b3d1e';
        ctx.fillRect(px + 2, py + 2, (s - 4) / 2 - 1, s - 4);
        ctx.fillRect(cx + 1, py + 2, (s - 4) / 2 - 1, s - 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, py + 2, (s - 4) / 2 - 1, s - 4);
        ctx.strokeRect(cx + 1, py + 2, (s - 4) / 2 - 1, s - 4);
        // Danger X
        ctx.strokeStyle = '#cc2222';
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
        ctx.fillStyle = '#6b3d1e';
        ctx.fillRect(px + 2, py + 2, s - 4, (s - 4) / 2 - 1);
        ctx.fillRect(px + 2, cy + 1, s - 4, (s - 4) / 2 - 1);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, py + 2, s - 4, (s - 4) / 2 - 1);
        ctx.strokeRect(px + 2, cy + 1, s - 4, (s - 4) / 2 - 1);
        ctx.strokeStyle = '#cc2222';
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
        // Jail gate — iron bar grid
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 1.5;
        const bars = 4;
        for (let i = 1; i < bars; i++) {
          const bx = px + i * (s / bars);
          ctx.beginPath();
          ctx.moveTo(bx, py + 2);
          ctx.lineTo(bx, py + s - 2);
          ctx.stroke();
        }
        for (let i = 1; i < 3; i++) {
          const by = py + i * (s / 3);
          ctx.beginPath();
          ctx.moveTo(px + 2, by);
          ctx.lineTo(px + s - 2, by);
          ctx.stroke();
        }
        break;
      }

      case 'archway': {
        // Open doorway — two wooden posts with an arc
        ctx.fillStyle = '#8b6914';
        ctx.fillRect(px + 3, cy, s * 0.15, s / 2 - 2);
        ctx.fillRect(px + s - 3 - s * 0.15, cy, s * 0.15, s / 2 - 2);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.32, Math.PI, 0);
        ctx.stroke();
        break;
      }

      case 'barricade': {
        // Wooden barricade — crossed planks
        ctx.strokeStyle = '#8b5a2b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.moveTo(px + s - 3, py + 3);
        ctx.lineTo(px + 3, py + s - 3);
        ctx.stroke();
        ctx.fillStyle = '#6b4420';
        ctx.fillRect(px + 2, cy - 1.5, s - 4, 3);
        break;
      }

      case 'stairs-up': {
        ctx.strokeStyle = '#5a4020';
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
        ctx.strokeStyle = '#5a4020';
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
        ctx.strokeStyle = '#7ac8e8';
        ctx.lineWidth = 1;
        for (let i = 0; i < 2; i++) {
          const wy = py + 5 + i * (s / 2.5);
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
        ctx.fillStyle = '#6b4010';
        ctx.fillRect(cx - s * 0.15, py + 2, s * 0.3, s - 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - s * 0.15, py + 2, s * 0.3, s - 4);
        break;
      }

      case 'trap': {
        ctx.strokeStyle = '#cc2222';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.2, cy);
        ctx.lineTo(cx + s * 0.2, cy);
        ctx.stroke();
        break;
      }

      case 'treasure': {
        ctx.fillStyle = '#8b5a14';
        ctx.fillRect(cx - s * 0.25, cy - s * 0.15, s * 0.5, s * 0.3);
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(cx - s * 0.25, cy - s * 0.22, s * 0.5, s * 0.15);
        ctx.strokeStyle = '#ffe080';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - s * 0.25, cy - s * 0.22, s * 0.5, s * 0.37);
        break;
      }

      case 'start': {
        ctx.strokeStyle = '#6abf6a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, py + 3);
        ctx.lineTo(cx, py + s - 3);
        ctx.stroke();
        ctx.fillStyle = '#6abf6a';
        ctx.beginPath();
        ctx.moveTo(cx - 3, py + 6);
        ctx.lineTo(cx, py + 3);
        ctx.lineTo(cx + 3, py + 6);
        ctx.fill();
        break;
      }
    }
  },
};
