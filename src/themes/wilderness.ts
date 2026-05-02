import type { TileTheme } from './index';
import type { TileType } from '../types/map';
import { jitterColor, drawWallDepth, tileHash } from './artUtils';

export const wildernessTheme: TileTheme = {
  id: 'wilderness',
  name: 'Wilderness',
  tiles: [
    { id: 'empty', label: 'Void' }, { id: 'floor', label: 'Grass' }, { id: 'wall', label: 'Trees' },
    { id: 'door-h', label: 'Gate (H)' }, { id: 'door-v', label: 'Gate (V)' },
    { id: 'secret-door', label: 'Hidden Path' },
    { id: 'locked-door-h', label: 'Locked Gate (H)' }, { id: 'locked-door-v', label: 'Locked Gate (V)' },
    { id: 'trapped-door-h', label: 'Trapped Gate (H)' }, { id: 'trapped-door-v', label: 'Trapped Gate (V)' },
    { id: 'portcullis', label: 'Fence Gate' }, { id: 'archway', label: 'Natural Arch' }, { id: 'barricade', label: 'Log Barricade' },
    { id: 'stairs-up', label: 'Hill Up' }, { id: 'stairs-down', label: 'Hill Down' },
    { id: 'water', label: 'River' }, { id: 'pillar', label: 'Boulder' },
    { id: 'trap', label: 'Snare' }, { id: 'treasure', label: 'Cache' }, { id: 'start', label: 'Camp' },
    { id: 'background', label: 'Undergrowth' },
  ],
  emptyTileId: 'empty',
  cssVars: {},
  tileColors: {
    empty: '#0a1a05', floor: '#3a7a2a', wall: '#1a3a0a',
    'door-h': '#8b6914', 'door-v': '#8b6914',
    'secret-door': '#1a3a0a',
    'locked-door-h': '#7a5a14', 'locked-door-v': '#7a5a14',
    'trapped-door-h': '#7a3014', 'trapped-door-v': '#7a3014',
    portcullis: '#5a4a2a', archway: '#6a8a5a', barricade: '#5a3a1a',
    'stairs-up': '#7a9e7e', 'stairs-down': '#5a7a5e',
    water: '#1e5f8e', pillar: '#6a4a2a', trap: '#8e1e1e',
    treasure: '#d4af37', start: '#50fa7b',
    background: '#1a2a10',
  },
  gridColor: '#1a3a10',
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
      case 'empty':
        break;

      case 'floor': {
        ctx.fillStyle = jitterColor(this.tileColors.floor, x, y, 0.08);
        ctx.fillRect(px, py, size, size);
        // Hash-seeded grass blade strokes
        const grassColors = ['#2a6a1a', '#4a8a2a'];
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 6; i++) {
          const h = tileHash(x * 7 + i, y * 13 + i);
          const h2 = tileHash(x * 11 + i, y * 3 + i);
          const bx = px + 2 + h * (s - 4);
          const by = py + 2 + h2 * (s - 4);
          const angle = (h * 2 - 1) * 0.6;
          ctx.strokeStyle = grassColors[i % 2];
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.sin(angle) * 3, by - Math.cos(angle) * 3.5);
          ctx.stroke();
        }
        break;
      }

      case 'wall': {
        ctx.fillStyle = jitterColor(this.tileColors[type], x, y, 0.06);
        ctx.fillRect(px, py, size, size);
        drawWallDepth(ctx, px, py, size, 'shadow', this.tileColors[type], 0.4);
        ctx.fillStyle = '#4a2a10';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a5a0a';
        ctx.beginPath();
        ctx.arc(cx, cy - s * 0.1, s * 0.35, 0, Math.PI * 2);
        ctx.fill();
        // Leaf highlights
        ctx.fillStyle = '#3a8a1a';
        for (let i = 0; i < 3; i++) {
          const lh = tileHash(x * 5 + i, y * 9 + i);
          const lh2 = tileHash(x * 9 + i, y * 5 + i);
          const lx = cx + (lh * 2 - 1) * s * 0.25;
          const ly = cy - s * 0.1 + (lh2 * 2 - 1) * s * 0.22;
          ctx.fillRect(lx, ly, 1, 1);
        }
        break;
      }

      case 'secret-door': {
        // Same tree shape as a wall, with a faint 'S' overlay.
        ctx.fillStyle = '#4a2a10';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a5a0a';
        ctx.beginPath();
        ctx.arc(cx, cy - s * 0.1, s * 0.35, 0, Math.PI * 2);
        ctx.fill();
        const fontSize = Math.max(7, Math.floor(s * 0.5));
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#c8a84b';
        ctx.fillText('S', cx, cy + 1);
        break;
      }

      case 'door-h': {
        ctx.fillStyle = '#5a3a10';
        ctx.fillRect(px + 2, cy - 2, s - 4, 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, cy - 2, s - 4, 4);
        // Crossbar
        ctx.strokeStyle = '#6a4a20';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 3);
        ctx.lineTo(cx, cy + 3);
        ctx.stroke();
        // Nail pegs
        ctx.fillStyle = '#3a2a0a';
        ctx.fillRect(cx - s * 0.2, cy - 0.5, 1, 1);
        ctx.fillRect(cx + s * 0.2, cy - 0.5, 1, 1);
        break;
      }

      case 'door-v': {
        ctx.fillStyle = '#5a3a10';
        ctx.fillRect(cx - 2, py + 2, 4, s - 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 2, py + 2, 4, s - 4);
        // Crossbar
        ctx.strokeStyle = '#6a4a20';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy);
        ctx.lineTo(cx + 3, cy);
        ctx.stroke();
        // Nail pegs
        ctx.fillStyle = '#3a2a0a';
        ctx.fillRect(cx - 0.5, cy - s * 0.2, 1, 1);
        ctx.fillRect(cx - 0.5, cy + s * 0.2, 1, 1);
        break;
      }

      case 'locked-door-h': {
        ctx.fillStyle = '#5a3a10';
        ctx.fillRect(px + 2, cy - 2, s - 4, 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, cy - 2, s - 4, 4);
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
        ctx.fillStyle = '#5a3a10';
        ctx.fillRect(cx - 2, py + 2, 4, s - 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 2, py + 2, 4, s - 4);
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
        ctx.fillStyle = '#5a3a10';
        ctx.fillRect(px + 2, cy - 2, s - 4, 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, cy - 2, s - 4, 4);
        // Danger X
        ctx.strokeStyle = '#cc3333';
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
        ctx.fillStyle = '#5a3a10';
        ctx.fillRect(cx - 2, py + 2, 4, s - 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 2, py + 2, 4, s - 4);
        ctx.strokeStyle = '#cc3333';
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
        // Fence gate — wooden bar grid
        ctx.strokeStyle = '#8a7a50';
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
        // Natural arch — two stone pillars with an organic arc
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(px + 3, cy, s * 0.15, s / 2 - 2);
        ctx.fillRect(px + s - 3 - s * 0.15, cy, s * 0.15, s / 2 - 2);
        ctx.strokeStyle = '#8aaa6a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.32, Math.PI, 0);
        ctx.stroke();
        break;
      }

      case 'barricade': {
        // Log barricade — crossed logs
        ctx.strokeStyle = '#6a4a1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.moveTo(px + s - 3, py + 3);
        ctx.lineTo(px + 3, py + s - 3);
        ctx.stroke();
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(px + 2, cy - 1.5, s - 4, 3);
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
        // Flowing river with current lines and ">" arrows
        const wh = tileHash(x, y);
        ctx.strokeStyle = '#6ac8f0';
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

        // Current arrows between waves
        ctx.strokeStyle = '#90d8ff';
        ctx.lineWidth = 0.8;
        const arrowCount = 2 + (wh > 0.6 ? 1 : 0);
        for (let i = 0; i < arrowCount; i++) {
          const ax = px + s * (0.2 + ((wh * 73 + i * 37) % 60) / 100);
          const ay = py + s * (0.25 + i * 0.25);
          const aSize = s * 0.06;
          ctx.beginPath();
          ctx.moveTo(ax - aSize, ay - aSize);
          ctx.lineTo(ax + aSize, ay);
          ctx.lineTo(ax - aSize, ay + aSize);
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
        // Bear trap: circle base with jaw arcs and teeth
        ctx.strokeStyle = '#993322';
        ctx.lineWidth = 1.5;

        // Trap base circle
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
        ctx.stroke();

        // Left jaw arc with teeth
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(cx - s * 0.05, cy, s * 0.32, Math.PI * 0.6, Math.PI * 1.4);
        ctx.stroke();
        // Left jaw teeth
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const a = Math.PI * 0.7 + i * (Math.PI * 0.6 / 4);
          const bx = cx - s * 0.05 + Math.cos(a) * s * 0.32;
          const by = cy + Math.sin(a) * s * 0.32;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(a) * (-s * 0.06), by + Math.sin(a) * (-s * 0.06));
          ctx.stroke();
        }

        // Right jaw arc with teeth
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(cx + s * 0.05, cy, s * 0.32, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const a = -Math.PI * 0.3 + i * (Math.PI * 0.6 / 4);
          const bx = cx + s * 0.05 + Math.cos(a) * s * 0.32;
          const by = cy + Math.sin(a) * s * 0.32;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(a) * (-s * 0.06), by + Math.sin(a) * (-s * 0.06));
          ctx.stroke();
        }
        break;
      }

      case 'treasure': {
        // Buried supply cache: mound with "X" marks the spot
        // Mound shape
        ctx.fillStyle = '#8b6a3a';
        ctx.beginPath();
        ctx.moveTo(px + s * 0.15, cy + s * 0.15);
        ctx.quadraticCurveTo(cx - s * 0.1, cy - s * 0.25, cx, cy - s * 0.28);
        ctx.quadraticCurveTo(cx + s * 0.1, cy - s * 0.25, px + s * 0.85, cy + s * 0.15);
        ctx.closePath();
        ctx.fill();

        // Dirt base
        ctx.fillStyle = '#6a5030';
        ctx.fillRect(px + s * 0.12, cy + s * 0.1, s * 0.76, s * 0.12);

        // "X" marks the spot
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        const xSize = s * 0.1;
        ctx.beginPath();
        ctx.moveTo(cx - xSize, cy - s * 0.12 - xSize);
        ctx.lineTo(cx + xSize, cy - s * 0.12 + xSize);
        ctx.moveTo(cx + xSize, cy - s * 0.12 - xSize);
        ctx.lineTo(cx - xSize, cy - s * 0.12 + xSize);
        ctx.stroke();
        break;
      }

      case 'start': {
        // Campfire: ring of stones with flame
        const sh = tileHash(x, y);

        // Stone ring (7 stones)
        ctx.fillStyle = '#6a6a6a';
        const stoneCount = 7;
        for (let i = 0; i < stoneCount; i++) {
          const a = (i / stoneCount) * Math.PI * 2;
          const jitter = ((sh * 97 + i * 13) % 10 - 5) * 0.01;
          const stoneR = s * (0.32 + jitter);
          const stX = cx + Math.cos(a) * stoneR;
          const stY = cy + Math.sin(a) * stoneR;
          ctx.beginPath();
          ctx.arc(stX, stY, s * 0.05, 0, Math.PI * 2);
          ctx.fill();
        }

        // Flames: 3 triangular points
        const flameColors = ['#ff4400', '#ff8800', '#ffcc00'];
        const flameHeights = [0.22, 0.18, 0.15];
        const flameOffsets = [-0.06, 0.02, 0.08];
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = flameColors[i];
          const fOff = flameOffsets[i] + (sh - 0.5) * 0.04;
          ctx.beginPath();
          ctx.moveTo(cx + fOff * s - s * 0.04, cy + s * 0.05);
          ctx.lineTo(cx + fOff * s, cy - s * flameHeights[i]);
          ctx.lineTo(cx + fOff * s + s * 0.04, cy + s * 0.05);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }

      case 'background': {
        ctx.fillStyle = '#1a2a10';
        ctx.fillRect(px, py, s, s);
        for (let i = 0; i < 14; i++) {
          const gx = px + tileHash(x * 11 + i, y * 7) * s;
          const gy = py + tileHash(x * 3 + i, y * 13 + i) * s;
          ctx.strokeStyle = jitterColor('#2a4a18', 20, x * 7 + i, y + i);
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx + (tileHash(x + i, y * 9) - 0.5) * 4, gy - 2 - tileHash(x * 5 + i, y) * 4);
          ctx.stroke();
        }
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = jitterColor('#2a3a18', 10, x * 9 + i, y * 3 + i);
          ctx.fillRect(px + tileHash(x * 7 + i, y * 5) * s, py + tileHash(x + i * 2, y * 11) * s, 1, 1);
        }
        break;
      }
    }
  },
};
