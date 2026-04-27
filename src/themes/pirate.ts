import type { TileTheme } from './index';
import type { TileType } from '../types/map';

export const pirateTheme: TileTheme = {
  id: 'pirate',
  name: 'Pirate',
  tiles: [
    { id: 'empty', label: 'Open Sea' }, { id: 'floor', label: 'Deck' }, { id: 'wall', label: 'Hull' },
    { id: 'door-h', label: 'Hatch (H)' }, { id: 'door-v', label: 'Hatch (V)' },
    { id: 'secret-door', label: 'Smuggler Hatch' },
    { id: 'locked-door-h', label: 'Locked Hatch (H)' }, { id: 'locked-door-v', label: 'Locked Hatch (V)' },
    { id: 'trapped-door-h', label: 'Trapped Hatch (H)' }, { id: 'trapped-door-v', label: 'Trapped Hatch (V)' },
    { id: 'portcullis', label: 'Chain Gate' }, { id: 'archway', label: 'Open Port' }, { id: 'barricade', label: 'Cargo Barricade' },
    { id: 'stairs-up', label: 'Ladder Up' }, { id: 'stairs-down', label: 'Hold Down' },
    { id: 'water', label: 'Bilge' }, { id: 'pillar', label: 'Mast' },
    { id: 'trap', label: 'Cannon' }, { id: 'treasure', label: 'Booty' }, { id: 'start', label: 'Anchor' },
  ],
  emptyTileId: 'empty',
  cssVars: {},
  tileColors: {
    empty: '#0a2540', floor: '#b58550', wall: '#5a3818',
    'door-h': '#7a4a20', 'door-v': '#7a4a20',
    'secret-door': '#5a3818',
    'locked-door-h': '#6a3a18', 'locked-door-v': '#6a3a18',
    'trapped-door-h': '#8a2a10', 'trapped-door-v': '#8a2a10',
    portcullis: '#4a4a4a', archway: '#8a6a3a', barricade: '#5a3a18',
    'stairs-up': '#a07a4a', 'stairs-down': '#6a4a28',
    water: '#1e6890', pillar: '#3a2410',
    trap: '#2a2a2a', treasure: '#d4af37', start: '#c0c0c0',
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
      case 'empty': {
        // Faint wave crests on the open sea.
        ctx.strokeStyle = '#1a3a60';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 2; i++) {
          const wy = py + 3 + i * (s / 2.2);
          ctx.beginPath();
          ctx.moveTo(px + 2, wy);
          ctx.quadraticCurveTo(px + s / 2, wy - 2, px + s - 2, wy);
          ctx.stroke();
        }
        break;
      }

      case 'floor': {
        // Wooden deck planks (horizontal boards with seams).
        ctx.strokeStyle = '#7a5530';
        ctx.lineWidth = 0.5;
        const planks = 3;
        for (let i = 1; i < planks; i++) {
          const wy = py + i * (s / planks);
          ctx.beginPath();
          ctx.moveTo(px + 1, wy);
          ctx.lineTo(px + s - 1, wy);
          ctx.stroke();
        }
        // A few caulking nails.
        ctx.fillStyle = '#3a2410';
        ctx.fillRect(px + 2, py + 2, 1, 1);
        ctx.fillRect(px + s - 3, py + s - 3, 1, 1);
        break;
      }

      case 'wall': {
        // Curved hull planking.
        ctx.strokeStyle = '#3a1f08';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const wy = py + 2 + i * ((s - 4) / 2);
          ctx.beginPath();
          ctx.moveTo(px + 1, wy);
          ctx.quadraticCurveTo(cx, wy + 2, px + s - 1, wy);
          ctx.stroke();
        }
        break;
      }

      case 'secret-door': {
        // Hull planking with a faint 'S' overlay.
        ctx.strokeStyle = '#3a1f08';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const wy = py + 2 + i * ((s - 4) / 2);
          ctx.beginPath();
          ctx.moveTo(px + 1, wy);
          ctx.quadraticCurveTo(cx, wy + 2, px + s - 1, wy);
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
        ctx.fillStyle = '#5a3a18';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
        // Iron ring.
        ctx.strokeStyle = '#888';
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'door-v': {
        ctx.fillStyle = '#5a3a18';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#888';
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'locked-door-h': {
        ctx.fillStyle = '#5a3a18';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
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
        ctx.fillStyle = '#5a3a18';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#d4af37';
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 2, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(cx - 2, cy - 1, 4, 3);
        break;
      }

      case 'trapped-door-h': {
        ctx.fillStyle = '#5a3a18';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#c8a84b';
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
        ctx.fillStyle = '#5a3a18';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#c8a84b';
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
        ctx.strokeStyle = '#888888';
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
        ctx.fillStyle = '#5a3818';
        ctx.fillRect(px + 2, cy, s * 0.15, s / 2 - 2);
        ctx.fillRect(px + s - 2 - s * 0.15, cy, s * 0.15, s / 2 - 2);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.32, Math.PI, 0);
        ctx.stroke();
        break;
      }

      case 'barricade': {
        ctx.strokeStyle = '#7a4a20';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.moveTo(px + s - 3, py + 3);
        ctx.lineTo(px + 3, py + s - 3);
        ctx.stroke();
        ctx.fillStyle = '#3a2410';
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
        break;
      }

      case 'stairs-up': {
        // Rope ladder going up.
        ctx.strokeStyle = '#d8b070';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + s * 0.3, py + 2);
        ctx.lineTo(px + s * 0.3, py + s - 2);
        ctx.moveTo(px + s * 0.7, py + 2);
        ctx.lineTo(px + s * 0.7, py + s - 2);
        ctx.stroke();
        const rungs = 4;
        for (let i = 0; i < rungs; i++) {
          const ry = py + 3 + i * ((s - 6) / (rungs - 1));
          ctx.beginPath();
          ctx.moveTo(px + s * 0.3, ry);
          ctx.lineTo(px + s * 0.7, ry);
          ctx.stroke();
        }
        break;
      }

      case 'stairs-down': {
        // Hold opening with descending steps.
        ctx.strokeStyle = '#3a2410';
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
        ctx.strokeStyle = '#6abce8';
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
        // Mast: brown vertical pole with a cross-spar.
        ctx.fillStyle = '#5a3818';
        ctx.fillRect(cx - 1.5, py + 2, 3, s - 4);
        ctx.fillStyle = '#3a2410';
        ctx.fillRect(px + s * 0.2, cy - 0.5, s * 0.6, 1.5);
        break;
      }

      case 'trap': {
        // Cannon: dark circle (muzzle) with carriage.
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5a3818';
        ctx.fillRect(px + s * 0.2, cy + s * 0.2, s * 0.6, s * 0.15);
        ctx.fillStyle = '#cc4422';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'treasure': {
        // Treasure chest with X.
        ctx.fillStyle = '#7a4a18';
        ctx.fillRect(cx - s * 0.25, cy - s * 0.18, s * 0.5, s * 0.36);
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(cx - s * 0.25, cy - s * 0.05, s * 0.5, s * 0.06);
        ctx.strokeStyle = '#ffe080';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - s * 0.25, cy - s * 0.18, s * 0.5, s * 0.36);
        break;
      }

      case 'start': {
        // Anchor.
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, py + s * 0.25, s * 0.08, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, py + s * 0.33);
        ctx.lineTo(cx, py + s - 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.25, py + s - 3);
        ctx.quadraticCurveTo(cx, py + s + s * 0.05, cx + s * 0.25, py + s - 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.18, py + s * 0.45);
        ctx.lineTo(cx + s * 0.18, py + s * 0.45);
        ctx.stroke();
        break;
      }
    }
  },
};
