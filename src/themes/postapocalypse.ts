import type { TileTheme } from './index';
import type { TileType } from '../types/map';
import { jitterColor, drawWallDepth, tileHash } from './artUtils';

export const postapocalypseTheme: TileTheme = {
  id: 'postapocalypse',
  name: 'Post-Apocalypse',
  tiles: [
    { id: 'empty', label: 'Wasteland' }, { id: 'floor', label: 'Rubble' }, { id: 'wall', label: 'Ruins' },
    { id: 'door-h', label: 'Barricade (H)' }, { id: 'door-v', label: 'Barricade (V)' },
    { id: 'secret-door', label: 'Hidden Stash' },
    { id: 'locked-door-h', label: 'Locked Barricade (H)' }, { id: 'locked-door-v', label: 'Locked Barricade (V)' },
    { id: 'trapped-door-h', label: 'Trapped Barricade (H)' }, { id: 'trapped-door-v', label: 'Trapped Barricade (V)' },
    { id: 'portcullis', label: 'Chain Gate' }, { id: 'archway', label: 'Ruined Arch' }, { id: 'barricade', label: 'Scrap Barricade' },
    { id: 'stairs-up', label: 'Debris Up' }, { id: 'stairs-down', label: 'Debris Down' },
    { id: 'water', label: 'Toxic Pool' }, { id: 'pillar', label: 'Rubble Pile' },
    { id: 'trap', label: 'Landmine' }, { id: 'treasure', label: 'Supplies' }, { id: 'start', label: 'Shelter' },
    { id: 'background', label: 'Rubble' },
  ],
  emptyTileId: 'empty',
  cssVars: {},
  tileColors: {
    empty: '#1a1208', floor: '#6b5a3a', wall: '#4a3a28',
    'door-h': '#8b6020', 'door-v': '#8b6020',
    'secret-door': '#4a3a28',
    'locked-door-h': '#7a5018', 'locked-door-v': '#7a5018',
    'trapped-door-h': '#8e3e1e', 'trapped-door-v': '#8e3e1e',
    portcullis: '#5a5a5a', archway: '#6a5a3a', barricade: '#5a4020',
    'stairs-up': '#7a6a4a', 'stairs-down': '#5a4a3a',
    water: '#2a4a1a', pillar: '#5a4a38', trap: '#8e3e1e',
    treasure: '#c09820', start: '#4a7a2a',
    background: '#2a2018',
  },
  gridColor: '#2a2018',
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
        ctx.fillStyle = '#2a2010';
        for (let i = 0; i < 3; i++) {
          const dx = px + 2 + (i * 29) % (s - 4);
          const dy = py + 2 + (i * 19) % (s - 4);
          ctx.fillRect(dx, dy, 2, 1);
        }
        break;
      }

      case 'floor': {
        ctx.fillStyle = jitterColor(this.tileColors.floor, x, y, 0.08);
        ctx.fillRect(px, py, size, size);
        ctx.strokeStyle = '#4a3a20';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 5);
        ctx.lineTo(px + 7, py + 3);
        ctx.moveTo(px + s - 5, py + s - 3);
        ctx.lineTo(px + s - 3, py + s - 7);
        ctx.stroke();
        for (let i = 0; i < 3; i++) {
          const dx = px + 2 + (i * 23) % (s - 4);
          const dy = py + 2 + (i * 31) % (s - 4);
          ctx.fillStyle = '#3a2a18';
          ctx.fillRect(dx, dy, 1, 1);
        }
        // Crack lines
        const ch0 = tileHash(x, y);
        const ch1 = tileHash(x + 7, y + 3);
        ctx.strokeStyle = '#3a2a18';
        ctx.lineWidth = 0.5;
        const angle0 = ch0 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(px + s * 0.3, py + s * 0.4);
        ctx.lineTo(px + s * 0.3 + Math.cos(angle0) * s * 0.3, py + s * 0.4 + Math.sin(angle0) * s * 0.25);
        ctx.stroke();
        if (ch1 > 0.4) {
          const angle1 = ch1 * Math.PI;
          ctx.beginPath();
          ctx.moveTo(px + s * 0.6, py + s * 0.7);
          ctx.lineTo(px + s * 0.6 + Math.cos(angle1) * s * 0.25, py + s * 0.7 + Math.sin(angle1) * s * 0.2);
          ctx.stroke();
        }
        break;
      }

      case 'wall': {
        ctx.fillStyle = jitterColor(this.tileColors[type], x, y, 0.06);
        ctx.fillRect(px, py, size, size);
        drawWallDepth(ctx, px, py, size, 'shadow', this.tileColors[type], 0.5);
        ctx.strokeStyle = '#6a5030';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 2, py + s / 3);
        ctx.lineTo(px + s - 2, py + s / 3);
        ctx.moveTo(px + 3, py + 2 * s / 3);
        ctx.lineTo(px + s - 3, py + 2 * s / 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.stroke();
        // Rebar line
        ctx.strokeStyle = '#8a4020';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + s / 3);
        ctx.lineTo(px + s - 3, py + s / 3);
        ctx.stroke();
        // Diagonal crack
        ctx.strokeStyle = '#2a1a10';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + s * 0.6, py + 2);
        ctx.lineTo(px + s * 0.4, py + s * 0.5);
        ctx.stroke();
        break;
      }

      case 'secret-door': {
        // Render as ruined wall with a faint 'S' overlay.
        ctx.strokeStyle = '#6a5030';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 2, py + s / 3);
        ctx.lineTo(px + s - 2, py + s / 3);
        ctx.moveTo(px + 3, py + 2 * s / 3);
        ctx.lineTo(px + s - 3, py + 2 * s / 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.stroke();
        const fontSize = Math.max(7, Math.floor(s * 0.55));
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#c09820';
        ctx.fillText('S', cx, cy + 1);
        break;
      }

      case 'door-h': {
        ctx.fillStyle = '#5a3a10';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#c08030';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
        ctx.beginPath();
        ctx.moveTo(px + 4, cy - 1);
        ctx.lineTo(px + s - 4, cy - 1);
        ctx.stroke();
        // Scrap metal bands
        ctx.strokeStyle = '#5a5a5a';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + 4, cy + 2);
        ctx.lineTo(px + s - 4, cy + 2);
        ctx.moveTo(px + 6, cy - 2);
        ctx.lineTo(px + s - 6, cy - 2);
        ctx.stroke();
        // Bolt mark
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(cx - 1, cy, 2, 1);
        break;
      }

      case 'door-v': {
        ctx.fillStyle = '#5a3a10';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#c08030';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
        // Scrap metal bands (rotated)
        ctx.strokeStyle = '#5a5a5a';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + 2, py + 4);
        ctx.lineTo(cx + 2, py + s - 4);
        ctx.moveTo(cx - 2, py + 6);
        ctx.lineTo(cx - 2, py + s - 6);
        ctx.stroke();
        // Bolt mark
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(cx, cy - 1, 1, 2);
        break;
      }

      case 'locked-door-h': {
        ctx.fillStyle = '#5a3a10';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#c08030';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#c09820';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 2, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#c09820';
        ctx.fillRect(cx - 2, cy - 1, 4, 3);
        break;
      }

      case 'locked-door-v': {
        ctx.fillStyle = '#5a3a10';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#c08030';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#c09820';
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 2, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#c09820';
        ctx.fillRect(cx - 2, cy - 1, 4, 3);
        break;
      }

      case 'trapped-door-h': {
        ctx.fillStyle = '#5a3a10';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#c08030';
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
        ctx.fillStyle = '#5a3a10';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#c08030';
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
        ctx.strokeStyle = '#7a7a7a';
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
        ctx.fillStyle = '#5a4a30';
        ctx.fillRect(px + 2, cy, s * 0.15, s / 2 - 2);
        ctx.fillRect(px + s - 2 - s * 0.15, cy, s * 0.15, s / 2 - 2);
        ctx.strokeStyle = '#8a7a50';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.32, Math.PI, 0);
        ctx.stroke();
        break;
      }

      case 'barricade': {
        ctx.strokeStyle = '#8b6020';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.moveTo(px + s - 3, py + 3);
        ctx.lineTo(px + 3, py + s - 3);
        ctx.stroke();
        ctx.fillStyle = '#5a3a10';
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
        break;
      }

      case 'stairs-up': {
        ctx.strokeStyle = '#8a7a50';
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
        ctx.strokeStyle = '#8a7a50';
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
        // Toxic pool — concentric ring ripples, radiation dots, toxic shimmer
        const h0 = tileHash(x, y);
        // Concentric ripple rings in sickly green
        ctx.strokeStyle = '#50a030';
        ctx.lineWidth = 0.8;
        for (let r = s * 0.1; r <= s * 0.38; r += s * 0.09) {
          ctx.beginPath();
          ctx.arc(cx + (h0 - 0.5) * s * 0.1, cy + (h0 - 0.5) * s * 0.08, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Radiation warning dots (bright green spots)
        ctx.fillStyle = '#80ff40';
        const dotCount = 2 + Math.floor(h0 * 2);
        for (let i = 0; i < dotCount; i++) {
          const dh = tileHash(x * 7 + i, y * 11 + i);
          const dh2 = tileHash(x * 13 + i, y * 3 + i);
          ctx.beginPath();
          ctx.arc(px + 4 + dh * (s - 8), py + 4 + dh2 * (s - 8), 1, 0, Math.PI * 2);
          ctx.fill();
        }
        // Toxic shimmer — thin horizontal streaks
        ctx.strokeStyle = '#60c04080';
        ctx.lineWidth = 0.4;
        for (let i = 0; i < 3; i++) {
          const sy = py + 3 + tileHash(x + i * 5, y + i * 3) * (s - 6);
          const sx = px + 2 + tileHash(x + i * 9, y + i * 7) * (s * 0.3);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + s * 0.35, sy);
          ctx.stroke();
        }
        break;
      }

      case 'pillar': {
        ctx.fillStyle = '#7a6a48';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3a2a18';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.stroke();
        break;
      }

      case 'trap': {
        // Landmine — partially buried circular disc with trigger pin
        const th = tileHash(x, y);
        // Dirt mound lines around the edges
        ctx.strokeStyle = '#5a4a30';
        ctx.lineWidth = 0.6;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + th * 0.5;
          const r1 = s * 0.3;
          const r2 = s * 0.38;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
          ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
          ctx.stroke();
        }
        // Buried disc (flattened oval, bottom half)
        ctx.fillStyle = '#4a4a4a';
        ctx.beginPath();
        ctx.ellipse(cx, cy + s * 0.04, s * 0.22, s * 0.13, 0, 0, Math.PI);
        ctx.fill();
        // Disc top half (lighter metal)
        ctx.fillStyle = '#6a6a6a';
        ctx.beginPath();
        ctx.ellipse(cx, cy + s * 0.04, s * 0.22, s * 0.13, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        // Disc outline
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(cx, cy + s * 0.04, s * 0.22, s * 0.13, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Trigger pin/prong sticking up from center
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy + s * 0.04);
        ctx.lineTo(cx, cy - s * 0.15);
        ctx.stroke();
        ctx.fillStyle = '#aaaaaa';
        ctx.beginPath();
        ctx.arc(cx, cy - s * 0.15, 1.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'treasure': {
        // Supply crate with X brace pattern
        const crateW = s * 0.5;
        const crateH = s * 0.4;
        const crateX = cx - crateW / 2;
        const crateY = cy - crateH / 2;
        // Crate body (weathered brown)
        ctx.fillStyle = '#7a6040';
        ctx.fillRect(crateX, crateY, crateW, crateH);
        // Lighter top edge
        ctx.fillStyle = '#9a8060';
        ctx.fillRect(crateX, crateY, crateW, crateH * 0.15);
        // Crate outline
        ctx.strokeStyle = '#4a3020';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(crateX, crateY, crateW, crateH);
        // X brace pattern (two diagonal lines)
        ctx.strokeStyle = '#5a4020';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(crateX + 1, crateY + 1);
        ctx.lineTo(crateX + crateW - 1, crateY + crateH - 1);
        ctx.moveTo(crateX + crateW - 1, crateY + 1);
        ctx.lineTo(crateX + 1, crateY + crateH - 1);
        ctx.stroke();
        // Handle/latch on right side
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(crateX + crateW, cy - 1.5);
        ctx.lineTo(crateX + crateW + 2, cy - 1.5);
        ctx.lineTo(crateX + crateW + 2, cy + 1.5);
        ctx.lineTo(crateX + crateW, cy + 1.5);
        ctx.stroke();
        break;
      }

      case 'start': {
        // Shelter entrance — angled roof, support posts, doorway
        // Roof (inverted V / chevron)
        ctx.fillStyle = '#7a7a7a';
        ctx.beginPath();
        ctx.moveTo(cx, py + 3);
        ctx.lineTo(px + s - 4, py + s * 0.4);
        ctx.lineTo(px + 4, py + s * 0.4);
        ctx.closePath();
        ctx.fill();
        // Rust accent on roof
        ctx.strokeStyle = '#8a4a2a';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx, py + 3);
        ctx.lineTo(px + s - 4, py + s * 0.4);
        ctx.moveTo(cx, py + 3);
        ctx.lineTo(px + 4, py + s * 0.4);
        ctx.stroke();
        // Two vertical support posts (concrete grey)
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(px + s * 0.25 - 1, py + s * 0.4, 2, s * 0.5);
        ctx.fillRect(px + s * 0.75 - 1, py + s * 0.4, 2, s * 0.5);
        // Doorway opening (dark rectangle) in center
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(cx - s * 0.1, py + s * 0.5, s * 0.2, s * 0.4);
        // Doorway border
        ctx.strokeStyle = '#5a5a5a';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - s * 0.1, py + s * 0.5, s * 0.2, s * 0.4);
        break;
      }

      case 'background': {
        ctx.fillStyle = '#2a2018';
        ctx.fillRect(px, py, s, s);
        ctx.strokeStyle = '#1a1810';
        ctx.lineWidth = 0.7;
        for (let i = 0; i < 6; i++) {
          const h = tileHash(x * 11 + i, y * 7 + i);
          const lx = px + h * s;
          const ly = py + tileHash(x + i, y * 5 + i) * s;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + (tileHash(x * 3 + i, y * 9) - 0.5) * s * 0.5, ly + (tileHash(x * 5 + i, y) - 0.5) * s * 0.5);
          ctx.stroke();
        }
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = jitterColor('#3a3020', 15, x * 9 + i, y * 3 + i);
          const rx = px + tileHash(x * 7 + i, y * 11) * s * 0.9;
          const ry = py + tileHash(x + i * 5, y * 9) * s * 0.9;
          ctx.fillRect(rx, ry, 2 + tileHash(x + i, y + i) * 2, 1.5);
        }
        break;
      }
    }
  },
};
