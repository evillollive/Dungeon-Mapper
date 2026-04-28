import type { TileTheme } from './index';
import type { TileType } from '../types/map';
import { jitterColor, drawWallDepth, tileHash } from './artUtils';

// Starship theme: the interior of a deep-space vessel — riveted bulkheads,
// metal deck plating, neon blast doors, and humming data cores. This carries
// the classic ship-corridor feel that the original "Sci-Fi" theme depicted.
export const starshipTheme: TileTheme = {
  id: 'starship',
  name: 'Starship',
  tiles: [
    { id: 'empty', label: 'Void' }, { id: 'floor', label: 'Deck' }, { id: 'wall', label: 'Bulkhead' },
    { id: 'door-h', label: 'Blast Door (H)' }, { id: 'door-v', label: 'Blast Door (V)' },
    { id: 'secret-door', label: 'Hidden Hatch' },
    { id: 'locked-door-h', label: 'Locked Blast Door (H)' }, { id: 'locked-door-v', label: 'Locked Blast Door (V)' },
    { id: 'trapped-door-h', label: 'Trapped Blast Door (H)' }, { id: 'trapped-door-v', label: 'Trapped Blast Door (V)' },
    { id: 'portcullis', label: 'Blast Shield' }, { id: 'archway', label: 'Open Bulkhead' }, { id: 'barricade', label: 'Emergency Barrier' },
    { id: 'stairs-up', label: 'Ladder Up' }, { id: 'stairs-down', label: 'Ladder Down' },
    { id: 'water', label: 'Coolant' }, { id: 'pillar', label: 'Support' },
    { id: 'trap', label: 'Laser Grid' }, { id: 'treasure', label: 'Data Core' }, { id: 'start', label: 'Airlock' },
  ],
  emptyTileId: 'empty',
  cssVars: {},
  tileColors: {
    empty: '#050a0f', floor: '#1a2b3c', wall: '#0d2233',
    'door-h': '#00c8ff', 'door-v': '#00c8ff',
    'secret-door': '#0d2233',
    'locked-door-h': '#2a4a7a', 'locked-door-v': '#2a4a7a',
    'trapped-door-h': '#7a1a1a', 'trapped-door-v': '#7a1a1a',
    portcullis: '#4a5a6a', archway: '#3a5a6a', barricade: '#5a4a3a',
    'stairs-up': '#00ff9f', 'stairs-down': '#00cc7a',
    water: '#0066aa', pillar: '#334466', trap: '#ff0066',
    treasure: '#ff9900', start: '#00ffcc',
  },
  gridColor: '#1a3050',
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
        ctx.strokeStyle = '#2a4060';
        ctx.lineWidth = 0.5;
        const step = Math.max(4, Math.floor(s / 4));
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(px + i * step, py);
          ctx.lineTo(px + i * step, py + s);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(px, py + i * step);
          ctx.lineTo(px + s, py + i * step);
          ctx.stroke();
        }
        // Rivet dots at alternating corners based on tileHash
        const h = tileHash(x, y);
        ctx.fillStyle = '#2a4060';
        if (h < 0.5) {
          ctx.beginPath();
          ctx.arc(px + 3, py + 3, 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px + s - 3, py + s - 3, 1, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(px + s - 3, py + 3, 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px + 3, py + s - 3, 1, 0, Math.PI * 2);
          ctx.fill();
        }
        // Subtle center panel mark (+ shape)
        ctx.strokeStyle = '#2a4060';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - 2, cy);
        ctx.lineTo(cx + 2, cy);
        ctx.moveTo(cx, cy - 2);
        ctx.lineTo(cx, cy + 2);
        ctx.stroke();
        break;
      }

      case 'wall': {
        ctx.fillStyle = jitterColor(this.tileColors[type], x, y, 0.06);
        ctx.fillRect(px, py, size, size);
        drawWallDepth(ctx, px, py, size, 'glow', '#00c8ff', 0.5);
        ctx.strokeStyle = '#00c8ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
        ctx.fillStyle = '#0a1520';
        ctx.fillRect(px + 3, py + 3, s - 6, s - 6);
        // Corner rivet dots
        ctx.fillStyle = '#4a7090';
        const rivetInset = 5;
        const corners: [number, number][] = [
          [px + rivetInset, py + rivetInset],
          [px + s - rivetInset, py + rivetInset],
          [px + rivetInset, py + s - rivetInset],
          [px + s - rivetInset, py + s - rivetInset],
        ];
        for (const [rx, ry] of corners) {
          ctx.beginPath();
          ctx.arc(rx, ry, 1, 0, Math.PI * 2);
          ctx.fill();
        }
        // Center horizontal seam
        ctx.strokeStyle = '#4a7090';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + 4, cy);
        ctx.lineTo(px + s - 4, cy);
        ctx.stroke();
        break;
      }

      case 'secret-door': {
        // Bulkhead with a subtle 'S' marker.
        ctx.strokeStyle = '#00c8ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
        ctx.fillStyle = '#0a1520';
        ctx.fillRect(px + 3, py + 3, s - 6, s - 6);
        const fontSize = Math.max(7, Math.floor(s * 0.6));
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#00c8ff';
        ctx.fillText('S', cx, cy + 1);
        break;
      }

      case 'door-h': {
        ctx.fillStyle = '#003050';
        ctx.fillRect(px + 2, cy - 3, (s - 4) / 2 - 2, 6);
        ctx.fillRect(cx + 2, cy - 3, (s - 4) / 2 - 2, 6);
        ctx.strokeStyle = '#00c8ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 2, cy - 3, (s - 4) / 2 - 2, 6);
        ctx.strokeRect(cx + 2, cy - 3, (s - 4) / 2 - 2, 6);
        // Chevron hazard stripes on each door half
        ctx.save();
        ctx.strokeStyle = '#ff990066';
        ctx.lineWidth = 1;
        const halfW = (s - 4) / 2 - 2;
        for (let hi = 0; hi < 2; hi++) {
          const hx = hi === 0 ? px + 2 : cx + 2;
          ctx.save();
          ctx.beginPath();
          ctx.rect(hx, cy - 3, halfW, 6);
          ctx.clip();
          for (let si = 0; si < 3; si++) {
            const offset = hx + si * (halfW / 3);
            ctx.beginPath();
            ctx.moveTo(offset, cy - 3);
            ctx.lineTo(offset + 6, cy + 3);
            ctx.stroke();
          }
          ctx.restore();
        }
        ctx.restore();
        break;
      }

      case 'door-v': {
        ctx.fillStyle = '#003050';
        ctx.fillRect(cx - 3, py + 2, 6, (s - 4) / 2 - 2);
        ctx.fillRect(cx - 3, cy + 2, 6, (s - 4) / 2 - 2);
        ctx.strokeStyle = '#00c8ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 3, py + 2, 6, (s - 4) / 2 - 2);
        ctx.strokeRect(cx - 3, cy + 2, 6, (s - 4) / 2 - 2);
        // Chevron hazard stripes on each door half (rotated)
        ctx.save();
        ctx.strokeStyle = '#ff990066';
        ctx.lineWidth = 1;
        const halfH = (s - 4) / 2 - 2;
        for (let hi = 0; hi < 2; hi++) {
          const hy = hi === 0 ? py + 2 : cy + 2;
          ctx.save();
          ctx.beginPath();
          ctx.rect(cx - 3, hy, 6, halfH);
          ctx.clip();
          for (let si = 0; si < 3; si++) {
            const offset = hy + si * (halfH / 3);
            ctx.beginPath();
            ctx.moveTo(cx - 3, offset);
            ctx.lineTo(cx + 3, offset + 6);
            ctx.stroke();
          }
          ctx.restore();
        }
        ctx.restore();
        break;
      }

      case 'locked-door-h': {
        ctx.fillStyle = '#003050';
        ctx.fillRect(px + 2, cy - 3, (s - 4) / 2 - 2, 6);
        ctx.fillRect(cx + 2, cy - 3, (s - 4) / 2 - 2, 6);
        ctx.strokeStyle = '#00c8ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 2, cy - 3, (s - 4) / 2 - 2, 6);
        ctx.strokeRect(cx + 2, cy - 3, (s - 4) / 2 - 2, 6);
        // LED lock indicator
        ctx.fillStyle = '#ff3300';
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'locked-door-v': {
        ctx.fillStyle = '#003050';
        ctx.fillRect(cx - 3, py + 2, 6, (s - 4) / 2 - 2);
        ctx.fillRect(cx - 3, cy + 2, 6, (s - 4) / 2 - 2);
        ctx.strokeStyle = '#00c8ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 3, py + 2, 6, (s - 4) / 2 - 2);
        ctx.strokeRect(cx - 3, cy + 2, 6, (s - 4) / 2 - 2);
        // LED lock indicator
        ctx.fillStyle = '#ff3300';
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'trapped-door-h': {
        ctx.fillStyle = '#003050';
        ctx.fillRect(px + 2, cy - 3, (s - 4) / 2 - 2, 6);
        ctx.fillRect(cx + 2, cy - 3, (s - 4) / 2 - 2, 6);
        ctx.strokeStyle = '#00c8ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 2, cy - 3, (s - 4) / 2 - 2, 6);
        ctx.strokeRect(cx + 2, cy - 3, (s - 4) / 2 - 2, 6);
        // Danger X
        ctx.strokeStyle = '#ff0066';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 3);
        ctx.lineTo(cx + 3, cy + 3);
        ctx.moveTo(cx + 3, cy - 3);
        ctx.lineTo(cx - 3, cy + 3);
        ctx.stroke();
        break;
      }

      case 'trapped-door-v': {
        ctx.fillStyle = '#003050';
        ctx.fillRect(cx - 3, py + 2, 6, (s - 4) / 2 - 2);
        ctx.fillRect(cx - 3, cy + 2, 6, (s - 4) / 2 - 2);
        ctx.strokeStyle = '#00c8ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 3, py + 2, 6, (s - 4) / 2 - 2);
        ctx.strokeRect(cx - 3, cy + 2, 6, (s - 4) / 2 - 2);
        // Danger X
        ctx.strokeStyle = '#ff0066';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 3);
        ctx.lineTo(cx + 3, cy + 3);
        ctx.moveTo(cx + 3, cy - 3);
        ctx.lineTo(cx - 3, cy + 3);
        ctx.stroke();
        break;
      }

      case 'portcullis': {
        // Blast shield grid
        ctx.strokeStyle = '#7a9ab0';
        ctx.lineWidth = 1.5;
        const g = s * 0.3;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + i * g, py + 3);
          ctx.lineTo(cx + i * g, py + s - 3);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(px + 3, cy + i * g);
          ctx.lineTo(px + s - 3, cy + i * g);
          ctx.stroke();
        }
        // Corner LED accents
        ctx.fillStyle = '#00c8ff';
        ctx.fillRect(px + 3, py + 3, 2, 2);
        ctx.fillRect(px + s - 5, py + s - 5, 2, 2);
        break;
      }

      case 'archway': {
        // Open bulkhead frame
        ctx.strokeStyle = '#00c8ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + s - 3);
        ctx.lineTo(px + 3, py + 5);
        ctx.lineTo(px + 6, py + 3);
        ctx.lineTo(px + s - 6, py + 3);
        ctx.lineTo(px + s - 3, py + 5);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.stroke();
        break;
      }

      case 'barricade': {
        // Emergency barrier — angular hazard stripes
        ctx.fillStyle = '#3a3025';
        ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
        ctx.strokeStyle = '#ff9900';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.moveTo(px + s - 3, py + 3);
        ctx.lineTo(px + 3, py + s - 3);
        ctx.stroke();
        // Corner markers
        ctx.fillStyle = '#ff9900';
        ctx.fillRect(px + 3, py + 3, 2, 2);
        ctx.fillRect(px + s - 5, py + 3, 2, 2);
        break;
      }

      case 'stairs-up': {
        ctx.strokeStyle = '#00ff9f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, py + 3);
        ctx.lineTo(cx, py + s - 3);
        ctx.moveTo(cx - 3, py + 6);
        ctx.lineTo(cx, py + 3);
        ctx.lineTo(cx + 3, py + 6);
        ctx.stroke();
        break;
      }

      case 'stairs-down': {
        ctx.strokeStyle = '#00cc7a';
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
        ctx.strokeStyle = '#00e0ff';
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
        ctx.strokeStyle = '#00c8ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, s / 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#0a1530';
        ctx.beginPath();
        ctx.arc(cx, cy, s / 4 - 1, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'trap': {
        ctx.strokeStyle = '#ff0066';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.moveTo(px + s - 3, py + 3);
        ctx.lineTo(px + 3, py + s - 3);
        ctx.stroke();
        ctx.strokeStyle = '#ff006688';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.moveTo(px + s - 3, py + 3);
        ctx.lineTo(px + 3, py + s - 3);
        ctx.stroke();
        break;
      }

      case 'treasure': {
        ctx.strokeStyle = '#ff9900';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ff990044';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff9900';
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
        break;
      }

      case 'start': {
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.moveTo(cx - 2, cy - 3);
        ctx.lineTo(cx + 4, cy);
        ctx.lineTo(cx - 2, cy + 3);
        ctx.closePath();
        ctx.fill();
        break;
      }
    }
  },
};
