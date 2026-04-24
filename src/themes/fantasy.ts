import type { TileTheme } from './index';
import type { TileType } from '../types/map';

export const fantasyTheme: TileTheme = {
  id: 'fantasy',
  name: 'Fantasy',
  tiles: [
    { id: 'empty', label: 'Empty' }, { id: 'floor', label: 'Floor' }, { id: 'wall', label: 'Wall' },
    { id: 'door-h', label: 'Door (H)' }, { id: 'door-v', label: 'Door (V)' },
    { id: 'secret-door', label: 'Secret Door' },
    { id: 'stairs-up', label: 'Stairs Up' }, { id: 'stairs-down', label: 'Stairs Down' },
    { id: 'water', label: 'Water' }, { id: 'pillar', label: 'Pillar' },
    { id: 'trap', label: 'Trap' }, { id: 'treasure', label: 'Treasure' }, { id: 'start', label: 'Start' },
  ],
  emptyTileId: 'empty',
  cssVars: {},
  tileColors: {
    empty: '#1a1a2e', floor: '#c8b89a', wall: '#4a4a4a',
    'door-h': '#8b6914', 'door-v': '#8b6914',
    'secret-door': '#4a4a4a',
    'stairs-up': '#7a9e7e', 'stairs-down': '#5a7a5e',
    water: '#1e5f8e', pillar: '#6a6a6a', trap: '#8e1e1e',
    treasure: '#d4af37', start: '#2e8b57',
  },
  drawTile(ctx: CanvasRenderingContext2D, type: TileType, x: number, y: number, size: number) {
    const px = x * size;
    const py = y * size;
    const color = this.tileColors[type];

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

      case 'secret-door': {
        // Render as a wall, with a faint 'S' overlay for the mapper.
        ctx.fillStyle = '#333333';
        ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
        ctx.fillStyle = '#5a5a5a';
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
  },
};
