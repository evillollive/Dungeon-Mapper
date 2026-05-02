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
    { id: 'background', label: 'Dusty Ground' },
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
    background: '#2a2010',
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
        // Water trough — wooden trough with water inside
        const trW = s * 0.7;
        const trH = s * 0.4;
        const trX = cx - trW / 2;
        const trY = cy - trH / 2;
        // Side planks
        ctx.fillStyle = '#6b3d1e';
        ctx.fillRect(trX, trY, s * 0.08, trH);
        ctx.fillRect(trX + trW - s * 0.08, trY, s * 0.08, trH);
        // Bottom plank
        ctx.fillRect(trX, trY + trH - s * 0.06, trW, s * 0.06);
        // Water fill
        ctx.fillStyle = '#7ac8e8';
        ctx.fillRect(trX + s * 0.08, trY + s * 0.04, trW - s * 0.16, trH - s * 0.1);
        // Ripple lines
        ctx.strokeStyle = '#a0e0ff';
        ctx.lineWidth = 0.5;
        const rh = tileHash(x, y);
        ctx.beginPath();
        ctx.moveTo(trX + s * 0.12, cy - s * 0.04 + rh * 2);
        ctx.quadraticCurveTo(cx, cy - s * 0.08 + rh * 2, trX + trW - s * 0.12, cy - s * 0.04 + rh * 2);
        ctx.stroke();
        if (rh > 0.3) {
          ctx.beginPath();
          ctx.moveTo(trX + s * 0.15, cy + s * 0.04);
          ctx.quadraticCurveTo(cx, cy + s * 0.08, trX + trW - s * 0.15, cy + s * 0.04);
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
        // Bear trap — circular base with two jaw arcs and zigzag teeth
        ctx.strokeStyle = '#4a3a2a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
        ctx.stroke();
        // Upper jaw arc
        ctx.strokeStyle = '#3a3030';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy + s * 0.08, s * 0.22, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        // Lower jaw arc
        ctx.beginPath();
        ctx.arc(cx, cy - s * 0.08, s * 0.22, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        // Zigzag teeth on upper jaw
        ctx.strokeStyle = '#5a4a3a';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const tx = cx - s * 0.16 + i * s * 0.08;
          ctx.moveTo(tx, cy - s * 0.12);
          ctx.lineTo(tx + s * 0.04, cy - s * 0.06);
        }
        ctx.stroke();
        // Zigzag teeth on lower jaw
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const tx = cx - s * 0.16 + i * s * 0.08;
          ctx.moveTo(tx, cy + s * 0.12);
          ctx.lineTo(tx + s * 0.04, cy + s * 0.06);
        }
        ctx.stroke();
        break;
      }

      case 'treasure': {
        // Gold nuggets — scattered irregular nuggets
        const nh0 = tileHash(x, y);
        const nh1 = tileHash(x + 3, y + 7);
        const nh2 = tileHash(x + 11, y + 5);
        const nh3 = tileHash(x + 7, y + 13);
        const nuggets = [
          { nx: cx - s * 0.15 + nh0 * s * 0.08, ny: cy - s * 0.1 + nh1 * s * 0.06, nr: s * 0.09 },
          { nx: cx + s * 0.1 + nh1 * s * 0.06, ny: cy + s * 0.05 + nh2 * s * 0.06, nr: s * 0.07 },
          { nx: cx - s * 0.05 + nh2 * s * 0.04, ny: cy + s * 0.15 + nh3 * s * 0.04, nr: s * 0.06 },
          { nx: cx + s * 0.18 - nh3 * s * 0.06, ny: cy - s * 0.12 + nh0 * s * 0.04, nr: s * 0.08 },
        ];
        for (const nug of nuggets) {
          ctx.fillStyle = '#d4af37';
          ctx.beginPath();
          ctx.arc(nug.nx, nug.ny, nug.nr, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#8b7520';
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
        break;
      }

      case 'start': {
        // Saloon swinging doors — two batwing door panels seen from above
        const doorW = s * 0.28;
        const doorH = s * 0.55;
        const doorTop = cy - doorH / 2;
        // Left door panel (angled inward)
        ctx.fillStyle = '#8b5a2b';
        ctx.save();
        ctx.translate(cx - s * 0.02, doorTop);
        ctx.rotate(-0.25);
        ctx.fillRect(-doorW, 0, doorW, doorH);
        ctx.strokeStyle = '#5a3818';
        ctx.lineWidth = 0.75;
        ctx.strokeRect(-doorW, 0, doorW, doorH);
        ctx.restore();
        // Right door panel (angled inward)
        ctx.fillStyle = '#8b5a2b';
        ctx.save();
        ctx.translate(cx + s * 0.02, doorTop);
        ctx.rotate(0.25);
        ctx.fillRect(0, 0, doorW, doorH);
        ctx.strokeStyle = '#5a3818';
        ctx.lineWidth = 0.75;
        ctx.strokeRect(0, 0, doorW, doorH);
        ctx.restore();
        // Hinge circles at top of each door
        ctx.fillStyle = '#3a2a10';
        ctx.beginPath();
        ctx.arc(cx - s * 0.04, doorTop + 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + s * 0.04, doorTop + 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'background': {
        ctx.fillStyle = '#2a2010';
        ctx.fillRect(px, py, s, s);
        ctx.strokeStyle = '#1e1808';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 4; i++) {
          const h = tileHash(x * 9 + i, y * 7 + i);
          const lx = px + h * s * 0.8 + s * 0.1;
          const ly = py + tileHash(x + i * 3, y * 11 + i) * s;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + (tileHash(x * 3 + i, y * 5) - 0.5) * s * 0.4, ly + (tileHash(x * 7 + i, y) - 0.5) * s * 0.3);
          ctx.stroke();
        }
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = jitterColor('#3a3018', 12, x * 5 + i, y * 9 + i);
          ctx.fillRect(px + tileHash(x * 11 + i, y * 3) * s, py + tileHash(x + i, y * 7 + i) * s, 1.5, 1.5);
        }
        break;
      }
    }
  },
};
