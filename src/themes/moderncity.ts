import type { TileTheme } from './index';
import type { TileType } from '../types/map';

export const moderncityTheme: TileTheme = {
  id: 'moderncity',
  name: 'Modern City',
  tiles: [
    { id: 'empty', label: 'Lot' }, { id: 'floor', label: 'Sidewalk' }, { id: 'wall', label: 'Building' },
    { id: 'door-h', label: 'Doorway (H)' }, { id: 'door-v', label: 'Doorway (V)' },
    { id: 'secret-door', label: 'Hidden Door' },
    { id: 'stairs-up', label: 'Stairs Up' }, { id: 'stairs-down', label: 'Stairs Down' },
    { id: 'water', label: 'Fountain' }, { id: 'pillar', label: 'Lamp Post' },
    { id: 'trap', label: 'Manhole' }, { id: 'treasure', label: 'ATM' }, { id: 'start', label: 'Bus Stop' },
  ],
  emptyTileId: 'empty',
  cssVars: {},
  tileColors: {
    empty: '#3a3a3a', floor: '#b8b8b8', wall: '#6c6c6c',
    'door-h': '#4a90c2', 'door-v': '#4a90c2',
    'secret-door': '#6c6c6c',
    'stairs-up': '#cfcfcf', 'stairs-down': '#9a9a9a',
    water: '#4ea7d8', pillar: '#2a2a2a', trap: '#3a3a3a',
    treasure: '#1f7a3a', start: '#d24545',
  },
  drawTile(ctx: CanvasRenderingContext2D, type: TileType, x: number, y: number, size: number) {
    const px = x * size;
    const py = y * size;
    ctx.fillStyle = this.tileColors[type];
    ctx.fillRect(px, py, size, size);
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(px, py, size, size);

    const cx = px + size / 2;
    const cy = py + size / 2;
    const s = size;

    switch (type) {
      case 'empty': {
        // Empty city lot: a few specks of debris/gravel
        ctx.fillStyle = '#555555';
        ctx.fillRect(px + s * 0.25, py + s * 0.3, 1, 1);
        ctx.fillRect(px + s * 0.6, py + s * 0.5, 1, 1);
        ctx.fillRect(px + s * 0.4, py + s * 0.75, 1, 1);
        break;
      }

      case 'floor': {
        // Concrete sidewalk paneling: an L-shaped seam in the corner
        ctx.strokeStyle = '#8a8a8a';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + s / 2, py);
        ctx.lineTo(px + s / 2, py + s / 2);
        ctx.lineTo(px, py + s / 2);
        ctx.stroke();
        break;
      }

      case 'wall': {
        // Brick/window facade: outer block + grid of windows
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
        ctx.fillStyle = '#ffd84a';
        const winW = Math.max(1, (s - 6) / 3);
        const winH = Math.max(1, (s - 6) / 3);
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 2; col++) {
            const wx = px + 2 + col * (winW + 1);
            const wy = py + 2 + row * (winH + 1);
            ctx.fillRect(wx, wy, winW, winH);
          }
        }
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px + 1, py + 1, s - 2, s - 2);
        break;
      }

      case 'secret-door': {
        // Plain building facade with a faint 'S' overlay (no windows hint
        // at a hidden interior).
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px + 1, py + 1, s - 2, s - 2);
        const fontSize = Math.max(7, Math.floor(s * 0.6));
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#4a90c2';
        ctx.fillText('S', cx, cy + 1);
        break;
      }

      case 'door-h': {
        // Glass double-door horizontal
        ctx.fillStyle = '#cfe6f4';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#2a4a5a';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
        ctx.beginPath();
        ctx.moveTo(cx, cy - 3);
        ctx.lineTo(cx, cy + 3);
        ctx.stroke();
        // handles
        ctx.fillStyle = '#222222';
        ctx.fillRect(cx - 2, cy - 1, 1, 2);
        ctx.fillRect(cx + 1, cy - 1, 1, 2);
        break;
      }

      case 'door-v': {
        // Glass double-door vertical
        ctx.fillStyle = '#cfe6f4';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#2a4a5a';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy);
        ctx.lineTo(cx + 3, cy);
        ctx.stroke();
        // handles
        ctx.fillStyle = '#222222';
        ctx.fillRect(cx - 1, cy - 2, 2, 1);
        ctx.fillRect(cx - 1, cy + 1, 2, 1);
        break;
      }

      case 'stairs-up': {
        // Three stair lines + up arrow
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const ly = py + 4 + i * ((s - 8) / 3);
          ctx.beginPath();
          ctx.moveTo(px + 3, ly);
          ctx.lineTo(px + s - 3, ly);
          ctx.stroke();
        }
        ctx.strokeStyle = '#1a4a8a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, py + s - 3);
        ctx.lineTo(cx, py + 3);
        ctx.moveTo(cx - 3, py + 6);
        ctx.lineTo(cx, py + 3);
        ctx.lineTo(cx + 3, py + 6);
        ctx.stroke();
        break;
      }

      case 'stairs-down': {
        // Three stair lines + down arrow
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const ly = py + 4 + i * ((s - 8) / 3);
          ctx.beginPath();
          ctx.moveTo(px + 3, ly);
          ctx.lineTo(px + s - 3, ly);
          ctx.stroke();
        }
        ctx.strokeStyle = '#1a4a8a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, py + 3);
        ctx.lineTo(cx, py + s - 3);
        ctx.moveTo(cx - 3, py + s - 6);
        ctx.lineTo(cx, py + s - 3);
        ctx.lineTo(cx + 3, py + s - 6);
        ctx.stroke();
        break;
      }

      case 'water': {
        // Round plaza fountain
        ctx.fillStyle = '#9a9a9a';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4ea7d8';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cfe6f4';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#cfe6f4';
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
        break;
      }

      case 'pillar': {
        // Street lamp post: pole with bulb
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, py + s - 2);
        ctx.lineTo(cx, py + s * 0.3);
        ctx.stroke();
        // arm
        ctx.beginPath();
        ctx.moveTo(cx, py + s * 0.3);
        ctx.lineTo(cx + s * 0.2, py + s * 0.3);
        ctx.stroke();
        // bulb
        ctx.fillStyle = '#ffe680';
        ctx.beginPath();
        ctx.arc(cx + s * 0.22, py + s * 0.35, Math.max(1.5, s * 0.1), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#806a1a';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        // base
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(cx - 2, py + s - 3, 4, 2);
        break;
      }

      case 'trap': {
        // Manhole cover
        ctx.fillStyle = '#1f1f1f';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5a5a5a';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.32, 0, Math.PI * 2);
        ctx.stroke();
        // grate slots
        ctx.strokeStyle = '#5a5a5a';
        ctx.lineWidth = 0.75;
        for (let i = -2; i <= 2; i++) {
          const ly = cy + i * 1.5;
          ctx.beginPath();
          ctx.moveTo(cx - s * 0.22, ly);
          ctx.lineTo(cx + s * 0.22, ly);
          ctx.stroke();
        }
        break;
      }

      case 'treasure': {
        // ATM kiosk
        ctx.fillStyle = '#0f3a1f';
        ctx.fillRect(cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.6);
        ctx.strokeStyle = '#cfe6c4';
        ctx.lineWidth = 0.75;
        ctx.strokeRect(cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.6);
        // screen
        ctx.fillStyle = '#9adfb0';
        ctx.fillRect(cx - s * 0.22, cy - s * 0.22, s * 0.44, s * 0.22);
        // keypad
        ctx.fillStyle = '#cfcfcf';
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 3; col++) {
            ctx.fillRect(cx - s * 0.18 + col * (s * 0.13), cy + s * 0.02 + row * (s * 0.1), s * 0.08, s * 0.06);
          }
        }
        // dollar mark
        ctx.fillStyle = '#ffd84a';
        ctx.fillRect(cx - 1, cy - s * 0.18, 2, s * 0.14);
        break;
      }

      case 'start': {
        // Bus stop sign
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, py + s - 3);
        ctx.lineTo(cx, py + s * 0.3);
        ctx.stroke();
        // sign
        ctx.fillStyle = '#d24545';
        ctx.fillRect(cx - s * 0.28, py + s * 0.15, s * 0.56, s * 0.22);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.75;
        ctx.strokeRect(cx - s * 0.28, py + s * 0.15, s * 0.56, s * 0.22);
        // "B"
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 2, py + s * 0.2, 1, s * 0.12);
        ctx.fillRect(cx - 2, py + s * 0.2, 3, 1);
        ctx.fillRect(cx - 2, py + s * 0.255, 3, 1);
        ctx.fillRect(cx - 2, py + s * 0.31, 3, 1);
        ctx.fillRect(cx + 1, py + s * 0.2, 1, s * 0.12);
        // base
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(cx - 2, py + s - 3, 4, 2);
        break;
      }
    }
  },
};
