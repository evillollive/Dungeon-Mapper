import type { TileTheme } from './index';
import type { TileType } from '../types/map';
import { jitterColor, drawWallDepth, tileHash } from './artUtils';

export const moderncityTheme: TileTheme = {
  id: 'moderncity',
  name: 'Modern City',
  tiles: [
    { id: 'empty', label: 'Lot' }, { id: 'floor', label: 'Sidewalk' }, { id: 'wall', label: 'Building' },
    { id: 'door-h', label: 'Doorway (H)' }, { id: 'door-v', label: 'Doorway (V)' },
    { id: 'secret-door', label: 'Hidden Door' },
    { id: 'locked-door-h', label: 'Locked Doorway (H)' }, { id: 'locked-door-v', label: 'Locked Doorway (V)' },
    { id: 'trapped-door-h', label: 'Trapped Doorway (H)' }, { id: 'trapped-door-v', label: 'Trapped Doorway (V)' },
    { id: 'portcullis', label: 'Security Gate' }, { id: 'archway', label: 'Open Entry' }, { id: 'barricade', label: 'Road Barrier' },
    { id: 'stairs-up', label: 'Stairs Up' }, { id: 'stairs-down', label: 'Stairs Down' },
    { id: 'water', label: 'Fountain' }, { id: 'pillar', label: 'Lamp Post' },
    { id: 'trap', label: 'Manhole' }, { id: 'treasure', label: 'ATM' }, { id: 'start', label: 'Bus Stop' },
    { id: 'background', label: 'Asphalt' },
  ],
  emptyTileId: 'empty',
  cssVars: {},
  tileColors: {
    empty: '#3a3a3a', floor: '#b8b8b8', wall: '#6c6c6c',
    'door-h': '#4a90c2', 'door-v': '#4a90c2',
    'secret-door': '#6c6c6c',
    'locked-door-h': '#3a78a8', 'locked-door-v': '#3a78a8',
    'trapped-door-h': '#c24545', 'trapped-door-v': '#c24545',
    portcullis: '#4a4a4a', archway: '#8ab8d8', barricade: '#d89030',
    'stairs-up': '#cfcfcf', 'stairs-down': '#9a9a9a',
    water: '#4ea7d8', pillar: '#2a2a2a', trap: '#3a3a3a',
    treasure: '#1f7a3a', start: '#d24545',
    background: '#1a1a1a',
  },
  gridColor: '#2a2a2a',
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
        // Empty city lot: a few specks of debris/gravel
        ctx.fillStyle = '#555555';
        ctx.fillRect(px + s * 0.25, py + s * 0.3, 1, 1);
        ctx.fillRect(px + s * 0.6, py + s * 0.5, 1, 1);
        ctx.fillRect(px + s * 0.4, py + s * 0.75, 1, 1);
        break;
      }

      case 'floor': {
        ctx.fillStyle = jitterColor(this.tileColors.floor, x, y, 0.08);
        ctx.fillRect(px, py, size, size);
        // Concrete sidewalk paneling: an L-shaped seam in the corner
        ctx.strokeStyle = '#8a8a8a';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + s / 2, py);
        ctx.lineTo(px + s / 2, py + s / 2);
        ctx.lineTo(px, py + s / 2);
        ctx.stroke();
        // Aggregate/gravel speckles
        ctx.fillStyle = '#a0a0a0';
        const h0 = tileHash(x, y);
        const h1 = tileHash(x + 7, y + 3);
        const h2 = tileHash(x + 13, y + 11);
        const h3 = tileHash(x + 19, y + 17);
        ctx.fillRect(px + 3 + h0 * (s - 6), py + 3 + h1 * (s - 6), 1, 1);
        ctx.fillRect(px + 3 + h2 * (s - 6), py + 3 + h3 * (s - 6), 1, 1);
        ctx.fillRect(px + 3 + h1 * (s - 6), py + 3 + h2 * (s - 6), 1, 1);
        ctx.fillRect(px + 3 + h3 * (s - 6), py + 3 + h0 * (s - 6), 1, 1);
        break;
      }

      case 'wall': {
        ctx.fillStyle = jitterColor(this.tileColors[type], x, y, 0.06);
        ctx.fillRect(px, py, size, size);
        drawWallDepth(ctx, px, py, size, 'hard-edge', this.tileColors[type], 0.5);
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
        // Entry mark at bottom center
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(cx - 2, py + s - 4, 4, 3);
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
        // Push-bar on each door half
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + 4, cy);
        ctx.lineTo(cx - 1, cy);
        ctx.moveTo(cx + 1, cy);
        ctx.lineTo(px + s - 4, cy);
        ctx.stroke();
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
        // Push-bar on each door half
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, py + 4);
        ctx.lineTo(cx, cy - 1);
        ctx.moveTo(cx, cy + 1);
        ctx.lineTo(cx, py + s - 4);
        ctx.stroke();
        break;
      }

      case 'locked-door-h': {
        ctx.fillStyle = '#cfe6f4';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#2a4a5a';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
        ctx.beginPath();
        ctx.moveTo(cx, cy - 3);
        ctx.lineTo(cx, cy + 3);
        ctx.stroke();
        ctx.strokeStyle = '#1a4a8a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 2, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#1a4a8a';
        ctx.fillRect(cx - 2, cy - 1, 4, 3);
        break;
      }

      case 'locked-door-v': {
        ctx.fillStyle = '#cfe6f4';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#2a4a5a';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy);
        ctx.lineTo(cx + 3, cy);
        ctx.stroke();
        ctx.strokeStyle = '#1a4a8a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 2, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#1a4a8a';
        ctx.fillRect(cx - 2, cy - 1, 4, 3);
        break;
      }

      case 'trapped-door-h': {
        ctx.fillStyle = '#cfe6f4';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#2a4a5a';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
        ctx.beginPath();
        ctx.moveTo(cx, cy - 3);
        ctx.lineTo(cx, cy + 3);
        ctx.stroke();
        ctx.strokeStyle = '#c24545';
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
        ctx.fillStyle = '#cfe6f4';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#2a4a5a';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy);
        ctx.lineTo(cx + 3, cy);
        ctx.stroke();
        ctx.strokeStyle = '#c24545';
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
        ctx.strokeStyle = '#3a3a3a';
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
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
        break;
      }

      case 'archway': {
        ctx.fillStyle = '#6c6c6c';
        ctx.fillRect(px + 2, cy, s * 0.15, s / 2 - 2);
        ctx.fillRect(px + s - 2 - s * 0.15, cy, s * 0.15, s / 2 - 2);
        ctx.strokeStyle = '#4a90c2';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.32, Math.PI, 0);
        ctx.stroke();
        break;
      }

      case 'barricade': {
        ctx.strokeStyle = '#d89030';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.moveTo(px + s - 3, py + 3);
        ctx.lineTo(px + 3, py + s - 3);
        ctx.stroke();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 2);
        ctx.stroke();
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
        // Urban fountain — circular basin with inner ring and spray
        ctx.fillStyle = '#9a9a9a';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4ea7d8';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.32, 0, Math.PI * 2);
        ctx.fill();
        // Inner ring
        ctx.strokeStyle = '#8a8a8a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.16, 0, Math.PI * 2);
        ctx.stroke();
        // Spray lines from center
        ctx.strokeStyle = '#cfe6f4';
        ctx.lineWidth = 0.75;
        const sh = tileHash(x, y);
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2 + sh * 0.3;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * s * 0.12, cy + Math.sin(angle) * s * 0.12 - s * 0.08);
          ctx.stroke();
        }
        // Center nozzle
        ctx.fillStyle = '#8a8a8a';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
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
        // Manhole cover — circle with grid pattern and grip slots
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5a5a5a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.34, 0, Math.PI * 2);
        ctx.stroke();
        // Grid pattern — 2 horizontal + 2 vertical lines
        ctx.strokeStyle = '#4a4a4a';
        ctx.lineWidth = 0.75;
        const gridOff = s * 0.1;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.28, cy - gridOff);
        ctx.lineTo(cx + s * 0.28, cy - gridOff);
        ctx.moveTo(cx - s * 0.28, cy + gridOff);
        ctx.lineTo(cx + s * 0.28, cy + gridOff);
        ctx.moveTo(cx - gridOff, cy - s * 0.28);
        ctx.lineTo(cx - gridOff, cy + s * 0.28);
        ctx.moveTo(cx + gridOff, cy - s * 0.28);
        ctx.lineTo(cx + gridOff, cy + s * 0.28);
        ctx.stroke();
        // Grip slots on opposite sides
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(cx - s * 0.06, cy - s * 0.32, s * 0.12, s * 0.04);
        ctx.fillRect(cx - s * 0.06, cy + s * 0.28, s * 0.12, s * 0.04);
        break;
      }

      case 'treasure': {
        // Bank safe/ATM — rectangle with dial and keypad
        const safeW = s * 0.65;
        const safeH = s * 0.55;
        const safeX = cx - safeW / 2;
        const safeY = cy - safeH / 2;
        ctx.fillStyle = '#2a3a2a';
        ctx.fillRect(safeX, safeY, safeW, safeH);
        ctx.strokeStyle = '#6a8a6a';
        ctx.lineWidth = 1;
        ctx.strokeRect(safeX, safeY, safeW, safeH);
        // Circular dial/handle on the right
        ctx.strokeStyle = '#9ab89a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(safeX + safeW * 0.75, cy, s * 0.08, 0, Math.PI * 2);
        ctx.stroke();
        // Handle tick
        ctx.beginPath();
        ctx.moveTo(safeX + safeW * 0.75, cy);
        ctx.lineTo(safeX + safeW * 0.75, cy - s * 0.06);
        ctx.stroke();
        // Keypad grid (3x2 dots) on the left
        ctx.fillStyle = '#8aaa8a';
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 3; col++) {
            const kx = safeX + safeW * 0.12 + col * s * 0.08;
            const ky = cy - s * 0.06 + row * s * 0.1;
            ctx.beginPath();
            ctx.arc(kx, ky, s * 0.02, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // Dollar sign slot at top
        ctx.fillStyle = '#6a8a6a';
        ctx.fillRect(cx - s * 0.08, safeY + s * 0.03, s * 0.16, s * 0.03);
        break;
      }

      case 'start': {
        // Bus stop — vertical post with sign on top and bench at base
        // Post
        ctx.strokeStyle = '#6a6a6a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, py + s - 3);
        ctx.lineTo(cx, py + s * 0.25);
        ctx.stroke();
        // Sign on top
        ctx.fillStyle = '#d24545';
        ctx.fillRect(cx - s * 0.25, py + s * 0.1, s * 0.5, s * 0.2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.75;
        ctx.strokeRect(cx - s * 0.25, py + s * 0.1, s * 0.5, s * 0.2);
        // "B" on sign
        ctx.fillStyle = '#ffffff';
        const fontSize = Math.max(6, Math.floor(s * 0.14));
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('B', cx, py + s * 0.2);
        // Bench at base — horizontal line with 2 short legs
        ctx.strokeStyle = '#4a4a4a';
        ctx.lineWidth = 1;
        const benchY = py + s - s * 0.18;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.22, benchY);
        ctx.lineTo(cx + s * 0.22, benchY);
        ctx.stroke();
        // Bench legs
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.18, benchY);
        ctx.lineTo(cx - s * 0.18, benchY + s * 0.1);
        ctx.moveTo(cx + s * 0.18, benchY);
        ctx.lineTo(cx + s * 0.18, benchY + s * 0.1);
        ctx.stroke();
        // Base
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(cx - 2, py + s - 3, 4, 2);
        break;
      }

      case 'background': {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(px, py, s, s);
        for (let i = 0; i < 20; i++) {
          const dx = px + tileHash(x * 11 + i, y * 7) * s;
          const dy = py + tileHash(x * 3 + i, y * 13 + i) * s;
          const shade = tileHash(x * 5 + i, y * 9 + i);
          ctx.fillStyle = shade > 0.5 ? '#222222' : '#181818';
          ctx.fillRect(dx, dy, 1, 1);
        }
        break;
      }
    }
  },
};
