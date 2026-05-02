import type { TileTheme } from './index';
import type { TileType } from '../types/map';
import { jitterColor, drawWallDepth, tileHash } from './artUtils';

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
    { id: 'background', label: 'Ocean' },
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
    background: '#0a1a2a',
  },
  gridColor: '#2a1a0a',
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
        ctx.fillStyle = jitterColor(this.tileColors.floor, x, y, 0.08);
        ctx.fillRect(px, py, size, size);
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
        // Extra knot dots
        ctx.fillStyle = '#5a3a18';
        for (let i = 0; i < 2; i++) {
          const kh = tileHash(x * 7 + i, y * 11 + i);
          const kh2 = tileHash(x * 13 + i, y * 3 + i);
          ctx.fillRect(px + 3 + kh * (s - 6), py + 3 + kh2 * (s - 6), 1, 1);
        }
        // Tiny wood grain line
        ctx.strokeStyle = '#8a6540';
        ctx.lineWidth = 0.3;
        const gh = tileHash(x * 3, y * 7);
        const gy = py + 3 + gh * (s - 6);
        ctx.beginPath();
        ctx.moveTo(px + 2, gy);
        ctx.lineTo(px + s * 0.4, gy + 0.5);
        ctx.stroke();
        break;
      }

      case 'wall': {
        ctx.fillStyle = jitterColor(this.tileColors[type], x, y, 0.06);
        ctx.fillRect(px, py, size, size);
        drawWallDepth(ctx, px, py, size, 'shadow', this.tileColors[type], 0.5);
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
        // Nail heads
        ctx.fillStyle = '#2a2a2a';
        for (let i = 0; i < 2; i++) {
          const nh = tileHash(x * 5 + i, y * 9 + i);
          const nh2 = tileHash(x * 11 + i, y * 7 + i);
          const nx = px + 3 + nh * (s - 6);
          const ny = py + 3 + nh2 * (s - 6);
          ctx.beginPath();
          ctx.arc(nx, ny, 0.7, 0, Math.PI * 2);
          ctx.fill();
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
        // Trapdoor hatch
        ctx.fillStyle = '#5a3a18';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
        // Hatch outline
        ctx.strokeStyle = '#3a2a0a';
        ctx.lineWidth = 0.6;
        ctx.strokeRect(cx - s * 0.15, cy - 2, s * 0.3, 4);
        // Ring pull
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
        ctx.stroke();
        // Hinge marks at edges
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(px + 3, cy - 1, 1.5, 2);
        ctx.fillRect(px + s - 4.5, cy - 1, 1.5, 2);
        break;
      }

      case 'door-v': {
        // Trapdoor hatch (vertical)
        ctx.fillStyle = '#5a3a18';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
        // Hatch outline
        ctx.strokeStyle = '#3a2a0a';
        ctx.lineWidth = 0.6;
        ctx.strokeRect(cx - 2, cy - s * 0.15, 4, s * 0.3);
        // Ring pull
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
        ctx.stroke();
        // Hinge marks at edges
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(cx - 1, py + 3, 2, 1.5);
        ctx.fillRect(cx - 1, py + s - 4.5, 2, 1.5);
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
        // Bilge water with wooden planks
        // Horizontal plank lines
        ctx.strokeStyle = '#6a4a28';
        ctx.lineWidth = 1;
        const plankCount = 3;
        for (let i = 0; i < plankCount; i++) {
          const plankY = py + 3 + i * ((s - 6) / (plankCount - 1));
          ctx.beginPath();
          ctx.moveTo(px + 1, plankY);
          ctx.lineTo(px + s - 1, plankY);
          ctx.stroke();
        }
        // Wavy blue water lines between planks (seeping water)
        ctx.strokeStyle = '#6abce8';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < plankCount - 1; i++) {
          const baseY = py + 3 + i * ((s - 6) / (plankCount - 1));
          const nextY = py + 3 + (i + 1) * ((s - 6) / (plankCount - 1));
          const wy = (baseY + nextY) / 2;
          const waveOff = tileHash(x + i * 3, y + i * 7) * 2;
          ctx.beginPath();
          ctx.moveTo(px + 3, wy);
          for (let wx = 0; wx < s - 6; wx += 4) {
            ctx.quadraticCurveTo(px + 3 + wx + 1, wy - 1.5 + waveOff, px + 3 + wx + 2, wy);
            ctx.quadraticCurveTo(px + 3 + wx + 3, wy + 1.5 - waveOff, px + 3 + wx + 4, wy);
          }
          ctx.stroke();
        }
        // Knot dots on planks
        ctx.fillStyle = '#4a3018';
        for (let i = 0; i < 2; i++) {
          const kx = px + 4 + tileHash(x * 7 + i, y * 11) * (s - 8);
          const ky = py + 4 + tileHash(x * 11, y * 7 + i) * (s - 8);
          ctx.fillRect(kx, ky, 1, 1);
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
        // Cannon — barrel with wheel and fuse
        // Cannon barrel (slightly tapered rectangle pointing right)
        ctx.fillStyle = '#2a2a2a';
        const barrelX = cx - s * 0.28;
        const barrelY = cy - s * 0.1;
        const barrelW = s * 0.5;
        const barrelH = s * 0.18;
        ctx.beginPath();
        ctx.moveTo(barrelX, barrelY);
        ctx.lineTo(barrelX + barrelW, barrelY + barrelH * 0.15);
        ctx.lineTo(barrelX + barrelW, barrelY + barrelH * 0.85);
        ctx.lineTo(barrelX, barrelY + barrelH);
        ctx.closePath();
        ctx.fill();
        // Barrel highlight
        ctx.strokeStyle = '#4a4a4a';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        // Muzzle opening
        ctx.fillStyle = '#0a0a0a';
        ctx.beginPath();
        ctx.arc(barrelX + barrelW, barrelY + barrelH / 2, barrelH * 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Wheel underneath
        ctx.strokeStyle = '#5a3818';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx - s * 0.05, cy + s * 0.15, s * 0.08, 0, Math.PI * 2);
        ctx.stroke();
        // Wheel spokes
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.05 - s * 0.06, cy + s * 0.15);
        ctx.lineTo(cx - s * 0.05 + s * 0.06, cy + s * 0.15);
        ctx.moveTo(cx - s * 0.05, cy + s * 0.15 - s * 0.06);
        ctx.lineTo(cx - s * 0.05, cy + s * 0.15 + s * 0.06);
        ctx.stroke();
        // Fuse line at the back end (red)
        ctx.strokeStyle = '#cc4422';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(barrelX, barrelY + barrelH / 2);
        ctx.quadraticCurveTo(barrelX - s * 0.08, barrelY - s * 0.05, barrelX - s * 0.12, barrelY - s * 0.1);
        ctx.stroke();
        // Spark at fuse tip
        ctx.fillStyle = '#ff6622';
        ctx.beginPath();
        ctx.arc(barrelX - s * 0.12, barrelY - s * 0.1, 1, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'treasure': {
        // Skull-marked treasure chest
        const chestW = s * 0.55;
        const chestH = s * 0.4;
        const chestX = cx - chestW / 2;
        const chestY = cy - chestH / 2;
        // Chest body (dark brown)
        ctx.fillStyle = '#5a3818';
        ctx.fillRect(chestX, chestY + chestH * 0.3, chestW, chestH * 0.7);
        // Rounded top / lid
        ctx.fillStyle = '#6a4828';
        ctx.beginPath();
        ctx.ellipse(cx, chestY + chestH * 0.3, chestW / 2, chestH * 0.3, 0, Math.PI, 0);
        ctx.fill();
        // Gold trim outlines
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(chestX, chestY + chestH * 0.3, chestW, chestH * 0.7);
        ctx.beginPath();
        ctx.ellipse(cx, chestY + chestH * 0.3, chestW / 2, chestH * 0.3, 0, Math.PI, 0);
        ctx.stroke();
        // Gold band across middle
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(chestX, chestY + chestH * 0.28, chestW, 1.5);
        // Skull emblem on front — small circle
        ctx.fillStyle = '#e0d8c0';
        ctx.beginPath();
        ctx.arc(cx, cy + chestH * 0.15, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
        // Crossed bones (two crossed lines below skull)
        ctx.strokeStyle = '#e0d8c0';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.07, cy + chestH * 0.25);
        ctx.lineTo(cx + s * 0.07, cy + chestH * 0.38);
        ctx.moveTo(cx + s * 0.07, cy + chestH * 0.25);
        ctx.lineTo(cx - s * 0.07, cy + chestH * 0.38);
        ctx.stroke();
        break;
      }

      case 'start': {
        // Anchor — vertical shaft, ring at top, curved flukes, rope
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1.2;
        // Ring at top
        ctx.beginPath();
        ctx.arc(cx, py + s * 0.2, s * 0.07, 0, Math.PI * 2);
        ctx.stroke();
        // Rope line from the ring
        ctx.strokeStyle = '#c8a04b';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.07, py + s * 0.2);
        ctx.quadraticCurveTo(cx + s * 0.2, py + s * 0.12, cx + s * 0.25, py + s * 0.08);
        ctx.stroke();
        // Vertical shaft
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, py + s * 0.27);
        ctx.lineTo(cx, py + s * 0.78);
        ctx.stroke();
        // Horizontal crossbar
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.2, py + s * 0.42);
        ctx.lineTo(cx + s * 0.2, py + s * 0.42);
        ctx.stroke();
        // Curved flukes (hooks) at bottom
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, py + s * 0.78);
        ctx.quadraticCurveTo(cx - s * 0.25, py + s * 0.78, cx - s * 0.22, py + s * 0.62);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, py + s * 0.78);
        ctx.quadraticCurveTo(cx + s * 0.25, py + s * 0.78, cx + s * 0.22, py + s * 0.62);
        ctx.stroke();
        // Fluke tips (small pointed ends)
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.22, py + s * 0.62);
        ctx.lineTo(cx - s * 0.18, py + s * 0.58);
        ctx.moveTo(cx + s * 0.22, py + s * 0.62);
        ctx.lineTo(cx + s * 0.18, py + s * 0.58);
        ctx.stroke();
        break;
      }

      case 'background': {
        ctx.fillStyle = '#0a1a2a';
        ctx.fillRect(px, py, s, s);
        ctx.strokeStyle = '#1a3a5a';
        ctx.lineWidth = 0.7;
        for (let i = 0; i < 4; i++) {
          const wy = py + (i + 0.5) * s / 4;
          const offset = tileHash(x * 7 + i, y * 3) * 4;
          ctx.beginPath();
          ctx.moveTo(px, wy + offset);
          ctx.quadraticCurveTo(px + s * 0.25, wy - 3 + offset, px + s * 0.5, wy + offset);
          ctx.quadraticCurveTo(px + s * 0.75, wy + 3 + offset, px + s, wy + offset);
          ctx.stroke();
        }
        break;
      }
    }
  },
};
