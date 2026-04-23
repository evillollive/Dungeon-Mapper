import type { TileTheme } from './index';
import type { TileType } from '../types/map';

export const wildernessTheme: TileTheme = {
  id: 'wilderness',
  name: 'Wilderness',
  tiles: [
    { id: 'empty', label: 'Void' }, { id: 'floor', label: 'Grass' }, { id: 'wall', label: 'Trees' },
    { id: 'door-h', label: 'Gate (H)' }, { id: 'door-v', label: 'Gate (V)' },
    { id: 'stairs-up', label: 'Hill Up' }, { id: 'stairs-down', label: 'Hill Down' },
    { id: 'water', label: 'River' }, { id: 'pillar', label: 'Boulder' },
    { id: 'trap', label: 'Snare' }, { id: 'treasure', label: 'Cache' }, { id: 'start', label: 'Camp' },
  ],
  emptyTileId: 'empty',
  cssVars: {},
  tileColors: {
    empty: '#0a1a05', floor: '#3a7a2a', wall: '#1a3a0a',
    'door-h': '#8b6914', 'door-v': '#8b6914',
    'stairs-up': '#7a9e7e', 'stairs-down': '#5a7a5e',
    water: '#1e5f8e', pillar: '#6a4a2a', trap: '#8e1e1e',
    treasure: '#d4af37', start: '#50fa7b',
  },
  drawTile(ctx: CanvasRenderingContext2D, type: TileType, x: number, y: number, size: number) {
    const px = x * size;
    const py = y * size;
    ctx.fillStyle = this.tileColors[type];
    ctx.fillRect(px, py, size, size);
    ctx.strokeStyle = '#2d3561';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(px, py, size, size);

    const cx = px + size / 2;
    const cy = py + size / 2;
    const s = size;

    switch (type) {
      case 'empty':
        break;

      case 'floor': {
        ctx.fillStyle = '#2a6a1a';
        for (let i = 0; i < 4; i++) {
          const dx = px + 2 + (i * 31) % (s - 4);
          const dy = py + 2 + (i * 17) % (s - 4);
          ctx.fillRect(dx, dy, 1, 2);
        }
        break;
      }

      case 'wall': {
        ctx.fillStyle = '#4a2a10';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a5a0a';
        ctx.beginPath();
        ctx.arc(cx, cy - s * 0.1, s * 0.35, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'door-h': {
        ctx.fillStyle = '#5a3a10';
        ctx.fillRect(px + 2, cy - 2, s - 4, 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, cy - 2, s - 4, 4);
        break;
      }

      case 'door-v': {
        ctx.fillStyle = '#5a3a10';
        ctx.fillRect(cx - 2, py + 2, 4, s - 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 2, py + 2, 4, s - 4);
        break;
      }

      case 'stairs-up': {
        ctx.strokeStyle = '#a0d0a0';
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
        ctx.strokeStyle = '#80b080';
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
        ctx.strokeStyle = '#4ab4e8';
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
        ctx.fillStyle = '#8a6a3a';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#6a4a2a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'trap': {
        ctx.strokeStyle = '#cc3333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.moveTo(px + s - 3, py + 3);
        ctx.lineTo(px + 3, py + s - 3);
        ctx.stroke();
        break;
      }

      case 'treasure': {
        ctx.fillStyle = '#8b6914';
        ctx.fillRect(cx - s * 0.2, cy - s * 0.15, s * 0.4, s * 0.3);
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(cx - s * 0.2, cy - s * 0.22, s * 0.4, s * 0.12);
        ctx.strokeStyle = '#ffe080';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - s * 0.2, cy - s * 0.22, s * 0.4, s * 0.37);
        break;
      }

      case 'start': {
        ctx.fillStyle = '#40e060';
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
        break;
      }
    }
  },
};
