import type { TileTheme } from './index';
import type { TileType } from '../types/map';
import { jitterColor, drawWallDepth, tileHash } from './artUtils';

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
    { id: 'background', label: 'Sand' },
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
    background: '#3a3020',
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
        // Stippled sand dots
        const sandShades = ['#c8a868', '#b89858'];
        for (let i = 0; i < 10; i++) {
          const h = tileHash(x * 7 + i, y * 11 + i);
          const h2 = tileHash(x * 13 + i, y * 3 + i);
          const dx = px + 2 + h * (s - 4);
          const dy = py + 2 + h2 * (s - 4);
          ctx.fillStyle = sandShades[i % 2];
          ctx.fillRect(dx, dy, 1, 1);
        }
        // Bottom ripple line
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
        // Erosion cracks
        ctx.strokeStyle = '#4a2a08';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
          const ch = tileHash(x * 7 + i, y * 11 + i);
          const ch2 = tileHash(x * 13 + i, y * 5 + i);
          const crx = px + 3 + ch * (s - 6);
          const cry = py + 3 + ch2 * (s - 6);
          ctx.beginPath();
          ctx.moveTo(crx, cry);
          ctx.lineTo(crx + 2, cry + 2);
          ctx.stroke();
        }
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
        // Hieroglyph diamond accents
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.18, cy);
        ctx.lineTo(cx - s * 0.18 - 1.5, cy - 1.5);
        ctx.lineTo(cx - s * 0.18, cy - 3);
        ctx.lineTo(cx - s * 0.18 + 1.5, cy - 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.18, cy);
        ctx.lineTo(cx + s * 0.18 - 1.5, cy - 1.5);
        ctx.lineTo(cx + s * 0.18, cy - 3);
        ctx.lineTo(cx + s * 0.18 + 1.5, cy - 1.5);
        ctx.closePath();
        ctx.fill();
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
        // Hieroglyph diamond accents
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.moveTo(cx, cy - s * 0.18);
        ctx.lineTo(cx - 1.5, cy - s * 0.18 - 1.5);
        ctx.lineTo(cx, cy - s * 0.18 - 3);
        ctx.lineTo(cx + 1.5, cy - s * 0.18 - 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx, cy + s * 0.18);
        ctx.lineTo(cx - 1.5, cy + s * 0.18 - 1.5);
        ctx.lineTo(cx, cy + s * 0.18 - 3);
        ctx.lineTo(cx + 1.5, cy + s * 0.18 - 1.5);
        ctx.closePath();
        ctx.fill();
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
        // Oasis pool with palm silhouette
        const h0 = tileHash(x, y);
        // Irregular oval pool shape in blue
        ctx.fillStyle = '#4ab8e0';
        ctx.beginPath();
        ctx.ellipse(cx, cy + s * 0.05, s * 0.35, s * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        // Darker pool edge
        ctx.strokeStyle = '#2a8ab0';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(cx, cy + s * 0.05, s * 0.35, s * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Calm ripple inside
        ctx.strokeStyle = '#7accee';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy + s * 0.05, s * 0.2, s * 0.14, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Palm tree silhouette — position varies by tileHash
        const palmX = px + s * 0.2 + h0 * s * 0.15;
        const palmBaseY = cy - s * 0.1;
        ctx.strokeStyle = '#3a6a20';
        ctx.lineWidth = 1.2;
        // Curved trunk
        ctx.beginPath();
        ctx.moveTo(palmX, palmBaseY + s * 0.15);
        ctx.quadraticCurveTo(palmX - s * 0.05, palmBaseY, palmX + s * 0.02, palmBaseY - s * 0.2);
        ctx.stroke();
        // Fronds (fan-shaped lines at top)
        const tipX = palmX + s * 0.02;
        const tipY = palmBaseY - s * 0.2;
        ctx.strokeStyle = '#2a5a18';
        ctx.lineWidth = 0.7;
        for (let i = -2; i <= 2; i++) {
          const angle = -Math.PI / 2 + i * 0.4;
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX + Math.cos(angle) * s * 0.12, tipY + Math.sin(angle) * s * 0.1);
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
        // Quicksand swirl — spiral pattern from center outward
        const th = tileHash(x, y);
        // Spiral (2-3 loops)
        ctx.strokeStyle = '#6a4a10';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const loops = 2.5 + th * 0.5;
        const maxR = s * 0.35;
        for (let a = 0; a < loops * Math.PI * 2; a += 0.15) {
          const r = (a / (loops * Math.PI * 2)) * maxR;
          const sx = cx + Math.cos(a) * r;
          const sy = cy + Math.sin(a) * r;
          if (a === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        // Scattered sand dots around the outside
        ctx.fillStyle = '#7a5a18';
        for (let i = 0; i < 6; i++) {
          const dh = tileHash(x * 5 + i, y * 9 + i);
          const dh2 = tileHash(x * 11 + i, y * 3 + i);
          const angle = dh * Math.PI * 2;
          const dist = s * 0.35 + dh2 * s * 0.08;
          ctx.fillRect(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 1, 1);
        }
        break;
      }

      case 'treasure': {
        // Ankh relic on a pedestal
        // Pedestal base
        ctx.fillStyle = '#8b6914';
        ctx.fillRect(cx - s * 0.22, cy + s * 0.2, s * 0.44, s * 0.12);
        // Pedestal top edge highlight
        ctx.fillStyle = '#a07a20';
        ctx.fillRect(cx - s * 0.22, cy + s * 0.2, s * 0.44, 1.5);
        // Ankh — oval loop at top
        ctx.strokeStyle = '#8a6020';
        ctx.lineWidth = 1.2;
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.ellipse(cx, cy - s * 0.15, s * 0.08, s * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Ankh hole (empty center of loop)
        ctx.fillStyle = this.tileColors.treasure;
        ctx.beginPath();
        ctx.ellipse(cx, cy - s * 0.15, s * 0.04, s * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        // Vertical line down
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(cx - 1, cy - s * 0.06, 2, s * 0.28);
        // Horizontal crossbar
        ctx.fillRect(cx - s * 0.1, cy + s * 0.02, s * 0.2, 2);
        // Bronze outline on shaft
        ctx.strokeStyle = '#8a6020';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - 1, cy - s * 0.06, 2, s * 0.28);
        break;
      }

      case 'start': {
        // Caravan tent/camp — peaked roof, flag/pennant, ground lines
        // Tent body (triangle with two slanting sides)
        ctx.fillStyle = '#c83838';
        ctx.beginPath();
        ctx.moveTo(cx, py + 4);
        ctx.lineTo(px + s - 4, py + s - 4);
        ctx.lineTo(px + 4, py + s - 4);
        ctx.closePath();
        ctx.fill();
        // Tent outline
        ctx.strokeStyle = '#8a1818';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx, py + 4);
        ctx.lineTo(px + s - 4, py + s - 4);
        ctx.lineTo(px + 4, py + s - 4);
        ctx.closePath();
        ctx.stroke();
        // Center pole line
        ctx.strokeStyle = '#f0e0a0';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, py + 4);
        ctx.lineTo(cx, py + s - 4);
        ctx.stroke();
        // Tent opening (darker V at bottom center)
        ctx.fillStyle = '#6a1818';
        ctx.beginPath();
        ctx.moveTo(cx, py + s * 0.55);
        ctx.lineTo(cx - s * 0.1, py + s - 4);
        ctx.lineTo(cx + s * 0.1, py + s - 4);
        ctx.closePath();
        ctx.fill();
        // Flag/pennant at the peak
        ctx.fillStyle = '#f0e0a0';
        ctx.beginPath();
        ctx.moveTo(cx, py + 4);
        ctx.lineTo(cx + s * 0.12, py + 2);
        ctx.lineTo(cx + s * 0.06, py + 6);
        ctx.closePath();
        ctx.fill();
        // Ground lines at base
        ctx.strokeStyle = '#8b5a20';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + 2, py + s - 3);
        ctx.lineTo(px + s - 2, py + s - 3);
        ctx.stroke();
        break;
      }

      case 'background': {
        ctx.fillStyle = '#3a3020';
        ctx.fillRect(px, py, s, s);
        ctx.strokeStyle = '#4a4030';
        ctx.lineWidth = 0.6;
        for (let i = 0; i < 3; i++) {
          const dy = py + (i + 0.3) * s / 3;
          const offset = tileHash(x * 5 + i, y * 9) * 3;
          ctx.beginPath();
          ctx.moveTo(px, dy + offset);
          ctx.quadraticCurveTo(px + s * 0.3, dy - 2 + offset, px + s * 0.6, dy + 1 + offset);
          ctx.quadraticCurveTo(px + s * 0.8, dy + 3 + offset, px + s, dy + offset);
          ctx.stroke();
        }
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = jitterColor('#4a3e2a', 10, x * 11 + i, y * 7 + i);
          ctx.fillRect(px + tileHash(x * 3 + i, y * 11) * s, py + tileHash(x * 9 + i, y + i) * s, 1, 1);
        }
        break;
      }
    }
  },
};
