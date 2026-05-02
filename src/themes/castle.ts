import type { TileTheme } from './index';
import type { TileType } from '../types/map';
import { jitterColor, drawWallDepth, tileHash } from './artUtils';

// Castle theme: an aboveground stone keep — polished sandstone halls, heavy
// oak doors with gold hinges, crenellated battlement walls, a moat, and a
// royal banner marking the great hall entrance.
export const castleTheme: TileTheme = {
  id: 'castle',
  name: 'Castle',
  tiles: [
    { id: 'empty', label: 'Courtyard' }, { id: 'floor', label: 'Stone Tile' }, { id: 'wall', label: 'Battlement' },
    { id: 'door-h', label: 'Oak Door (H)' }, { id: 'door-v', label: 'Oak Door (V)' },
    { id: 'secret-door', label: 'Hidden Passage' },
    { id: 'locked-door-h', label: 'Locked Oak Door (H)' }, { id: 'locked-door-v', label: 'Locked Oak Door (V)' },
    { id: 'trapped-door-h', label: 'Trapped Oak Door (H)' }, { id: 'trapped-door-v', label: 'Trapped Oak Door (V)' },
    { id: 'portcullis', label: 'Castle Portcullis' }, { id: 'archway', label: 'Stone Archway' }, { id: 'barricade', label: 'Wooden Barricade' },
    { id: 'stairs-up', label: 'Stairs Up' }, { id: 'stairs-down', label: 'Stairs Down' },
    { id: 'water', label: 'Moat' }, { id: 'pillar', label: 'Column' },
    { id: 'trap', label: 'Murder Hole' }, { id: 'treasure', label: 'Royal Hoard' }, { id: 'start', label: 'Great Hall' },
    { id: 'background', label: 'Stone' },
  ],
  emptyTileId: 'empty',
  cssVars: {},
  tileColors: {
    empty: '#1f1a14', floor: '#d8c9a3', wall: '#b89a6a',
    'door-h': '#5a3a1a', 'door-v': '#5a3a1a',
    'secret-door': '#b89a6a',
    'locked-door-h': '#4a2a10', 'locked-door-v': '#4a2a10',
    'trapped-door-h': '#5a1515', 'trapped-door-v': '#5a1515',
    portcullis: '#555555', archway: '#7a7060', barricade: '#5a4020',
    'stairs-up': '#c8b88a', 'stairs-down': '#a89868',
    water: '#2a6a9e', pillar: '#9a8a6a',
    trap: '#8e1e1e', treasure: '#d4af37', start: '#a0202a',
    background: '#3a3028',
  },
  gridColor: '#5a4a30',
  drawTile(ctx: CanvasRenderingContext2D, type: TileType, x: number, y: number, size: number) {
    const px = x * size;
    const py = y * size;
    const color = this.tileColors[type];

    ctx.fillStyle = color;
    ctx.fillRect(px, py, size, size);

    ctx.strokeStyle = this.gridColor;
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
        // Proper checkerboard pattern
        const isDark = (x + y) % 2 === 0;
        ctx.fillStyle = jitterColor(isDark ? '#c0b088' : color, x, y, 0.03);
        ctx.fillRect(px, py, size, size);
        // Thin cross seam through center
        ctx.strokeStyle = '#a89868';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px, cy);
        ctx.lineTo(px + s, cy);
        ctx.moveTo(cx, py);
        ctx.lineTo(cx, py + s);
        ctx.stroke();
        break;
      }

      case 'wall': {
        ctx.fillStyle = jitterColor(color, x, y, 0.06);
        ctx.fillRect(px, py, size, size);
        drawWallDepth(ctx, px, py, size, 'shadow', color, 0.4);
        // Sandstone block with a darker mortar shadow and a crenellated top edge.
        ctx.fillStyle = '#9c7e4e';
        ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
        ctx.fillStyle = '#d8b87a';
        ctx.fillRect(px + 2, py + 2, s - 4, 2);
        ctx.fillRect(px + 2, py + 2, 2, s - 4);
        // Ashlar masonry mortar lines
        const wh = tileHash(x, y);
        ctx.strokeStyle = '#6a5028';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + 2, py + Math.round(s / 3));
        ctx.lineTo(px + s - 2, py + Math.round(s / 3));
        ctx.moveTo(px + 2, py + Math.round(s * 2 / 3));
        ctx.lineTo(px + s - 2, py + Math.round(s * 2 / 3));
        // Offset vertical seams per row (masonry bond)
        const seamOffset = (y % 2 === 0) ? 0.35 : 0.65;
        const vx = px + 2 + (s - 4) * (seamOffset + wh * 0.15);
        ctx.moveTo(vx, py + 2);
        ctx.lineTo(vx, py + s - 2);
        ctx.stroke();
        // Crenel notch along the top.
        ctx.fillStyle = '#1f1a14';
        const notchW = Math.max(2, Math.floor(s / 4));
        ctx.fillRect(cx - notchW / 2, py + 2, notchW, 2);
        break;
      }

      case 'secret-door': {
        // Render as a battlement wall with a faint 'S' overlay for the mapper.
        ctx.fillStyle = '#9c7e4e';
        ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
        ctx.fillStyle = '#d8b87a';
        ctx.fillRect(px + 2, py + 2, s - 4, 2);
        ctx.fillRect(px + 2, py + 2, 2, s - 4);
        const fontSize = Math.max(7, Math.floor(s * 0.6));
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#5a3a1a';
        ctx.fillText('S', cx, cy + 1);
        break;
      }

      case 'door-h': {
        // Heavy oak plank with gold hinge bands.
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        // Plank seam lines across the door body
        ctx.strokeStyle = '#3a2410';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + 2, cy - 1);
        ctx.lineTo(px + s - 2, cy - 1);
        ctx.moveTo(px + 2, cy + 1);
        ctx.lineTo(px + s - 2, cy + 1);
        ctx.moveTo(cx, cy - 3);
        ctx.lineTo(cx, cy + 3);
        ctx.stroke();
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(px + 2, cy - 3, 3, 6);
        ctx.fillRect(px + s - 5, cy - 3, 3, 6);
        break;
      }

      case 'door-v': {
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        // Plank seam lines across the door body
        ctx.strokeStyle = '#3a2410';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - 1, py + 2);
        ctx.lineTo(cx - 1, py + s - 2);
        ctx.moveTo(cx + 1, py + 2);
        ctx.lineTo(cx + 1, py + s - 2);
        ctx.moveTo(cx - 3, cy);
        ctx.lineTo(cx + 3, cy);
        ctx.stroke();
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(cx - 3, py + 2, 6, 3);
        ctx.fillRect(cx - 3, py + s - 5, 6, 3);
        break;
      }

      case 'locked-door-h': {
        // Heavy oak plank with lock
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#3a2410';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 3);
        ctx.lineTo(cx, cy + 3);
        ctx.stroke();
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(px + 2, cy - 3, 3, 6);
        ctx.fillRect(px + s - 5, cy - 3, 3, 6);
        // Lock symbol
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(cx, cy - 1, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 1.5, cy, 3, 3);
        break;
      }

      case 'locked-door-v': {
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#3a2410';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy);
        ctx.lineTo(cx + 3, cy);
        ctx.stroke();
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(cx - 3, py + 2, 6, 3);
        ctx.fillRect(cx - 3, py + s - 5, 6, 3);
        // Lock symbol
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(cx, cy - 1, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 1.5, cy, 3, 3);
        break;
      }

      case 'trapped-door-h': {
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#3a2410';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 3);
        ctx.lineTo(cx, cy + 3);
        ctx.stroke();
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(px + 2, cy - 3, 3, 6);
        ctx.fillRect(px + s - 5, cy - 3, 3, 6);
        // Red danger X
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - 4);
        ctx.lineTo(cx + 4, cy + 4);
        ctx.moveTo(cx + 4, cy - 4);
        ctx.lineTo(cx - 4, cy + 4);
        ctx.stroke();
        break;
      }

      case 'trapped-door-v': {
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#3a2410';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy);
        ctx.lineTo(cx + 3, cy);
        ctx.stroke();
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(cx - 3, py + 2, 6, 3);
        ctx.fillRect(cx - 3, py + s - 5, 6, 3);
        // Red danger X
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - 4);
        ctx.lineTo(cx + 4, cy + 4);
        ctx.moveTo(cx + 4, cy - 4);
        ctx.lineTo(cx - 4, cy + 4);
        ctx.stroke();
        break;
      }

      case 'portcullis': {
        // Heavy castle gate grid
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 2;
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
        break;
      }

      case 'archway': {
        // Stone pillars with ornate arc
        ctx.fillStyle = '#c8b88a';
        ctx.fillRect(px + 3, cy, 5, s / 2 - 2);
        ctx.fillRect(px + s - 8, cy, 5, s / 2 - 2);
        ctx.strokeStyle = '#d8c8a0';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s / 2 - 5, Math.PI, 0);
        ctx.stroke();
        break;
      }

      case 'barricade': {
        // Crossed wooden planks
        ctx.fillStyle = '#7a6040';
        ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
        ctx.strokeStyle = '#3a2010';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.moveTo(px + s - 3, py + 3);
        ctx.lineTo(px + 3, py + s - 3);
        ctx.stroke();
        break;
      }

      case 'stairs-up': {
        ctx.strokeStyle = '#fff8dc';
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
        ctx.strokeStyle = '#e0c060';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + 2, cy - 3);
        ctx.lineTo(cx + 5, cy);
        ctx.lineTo(cx + 2, cy + 3);
        ctx.stroke();
        break;
      }

      case 'stairs-down': {
        ctx.strokeStyle = '#7a6a3a';
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
        ctx.strokeStyle = '#e0c060';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + 2, cy - 3);
        ctx.lineTo(cx + 5, cy);
        ctx.lineTo(cx + 2, cy + 3);
        ctx.stroke();
        break;
      }

      case 'water': {
        // Castle moat — gentle wave ripples with lily pads
        ctx.strokeStyle = '#7ac8f0';
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
        // Lily pads — dark green ovals positioned by tileHash
        const lh1 = tileHash(x, y);
        const lh2 = tileHash(x + 5, y + 3);
        ctx.fillStyle = '#2a6a2a';
        ctx.beginPath();
        ctx.ellipse(
          px + s * (0.2 + lh1 * 0.3), py + s * (0.25 + lh2 * 0.2),
          s * 0.08, s * 0.06, lh1 * Math.PI, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(
          px + s * (0.55 + lh2 * 0.25), py + s * (0.6 + lh1 * 0.15),
          s * 0.07, s * 0.05, lh2 * Math.PI, 0, Math.PI * 2
        );
        ctx.fill();
        break;
      }

      case 'pillar': {
        // Stone column with a capital and base.
        const r = s / 4;
        ctx.fillStyle = '#bcab85';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff8dc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        // Capital ring.
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'trap': {
        // Murder hole — red X with square border and arrow-slit markers
        ctx.strokeStyle = '#8e1e1e';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 3, py + 3, s - 6, s - 6);
        // Arrow-slit markers on left and right sides
        ctx.fillStyle = '#4a0e0e';
        // Left arrow slit
        ctx.fillRect(px + 3, cy - 3, 2, 6);
        // Right arrow slit
        ctx.fillRect(px + s - 5, cy - 3, 2, 6);
        // Murder hole X
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 6, py + 6);
        ctx.lineTo(px + s - 6, py + s - 6);
        ctx.moveTo(px + s - 6, py + 6);
        ctx.lineTo(px + 6, py + s - 6);
        ctx.stroke();
        break;
      }

      case 'treasure': {
        // Crowned chest — gold lid with a small crown silhouette.
        const tw = s * 0.55;
        const th = s * 0.35;
        const tx = cx - tw / 2;
        const ty = cy - th / 2 + th * 0.15;
        ctx.fillStyle = '#8b6914';
        ctx.fillRect(tx, ty + th * 0.4, tw, th * 0.6);
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(tx, ty, tw, th * 0.5);
        ctx.strokeStyle = '#fff8dc';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(tx, ty + th * 0.4, tw, th * 0.6);
        ctx.strokeRect(tx, ty, tw, th * 0.5);
        // Tiny crown above the chest.
        ctx.fillStyle = '#e0c060';
        ctx.beginPath();
        const crownY = ty - th * 0.35;
        ctx.moveTo(tx + tw * 0.1, ty);
        ctx.lineTo(tx + tw * 0.1, crownY);
        ctx.lineTo(tx + tw * 0.3, crownY + th * 0.2);
        ctx.lineTo(tx + tw * 0.5, crownY);
        ctx.lineTo(tx + tw * 0.7, crownY + th * 0.2);
        ctx.lineTo(tx + tw * 0.9, crownY);
        ctx.lineTo(tx + tw * 0.9, ty);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'start': {
        // Royal banner on a staff marking the great hall entrance.
        ctx.strokeStyle = '#3a2410';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 3, py + 2);
        ctx.lineTo(cx - 3, py + s - 2);
        ctx.stroke();
        ctx.fillStyle = '#a0202a';
        ctx.beginPath();
        ctx.moveTo(cx - 3, py + 3);
        ctx.lineTo(cx + 5, py + 3);
        ctx.lineTo(cx + 2, py + 3 + s * 0.2);
        ctx.lineTo(cx + 5, py + 3 + s * 0.4);
        ctx.lineTo(cx - 3, py + 3 + s * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#e0c060';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        break;
      }

      case 'background': {
        ctx.fillStyle = '#3a3028';
        ctx.fillRect(px, py, s, s);
        ctx.strokeStyle = '#2a2018';
        ctx.lineWidth = 0.5;
        const brickH = s / 4;
        for (let row = 0; row < 4; row++) {
          const offset = row % 2 === 0 ? 0 : s / 2;
          ctx.beginPath();
          ctx.moveTo(px, py + row * brickH);
          ctx.lineTo(px + s, py + row * brickH);
          ctx.stroke();
          for (let col = 0; col < 3; col++) {
            const bx = px + offset + col * s;
            if (bx > px && bx < px + s) {
              ctx.beginPath();
              ctx.moveTo(bx, py + row * brickH);
              ctx.lineTo(bx, py + (row + 1) * brickH);
              ctx.stroke();
            }
          }
        }
        break;
      }
    }
  },
};
