import type { TileTheme } from './index';
import type { TileType } from '../types/map';
import { jitterColor, drawWallDepth, tileHash } from './artUtils';

export const cyberpunkTheme: TileTheme = {
  id: 'cyberpunk',
  name: 'Cyberpunk',
  tiles: [
    { id: 'empty', label: 'Dead Zone' }, { id: 'floor', label: 'Street' }, { id: 'wall', label: 'Barrier' },
    { id: 'door-h', label: 'Shutter (H)' }, { id: 'door-v', label: 'Shutter (V)' },
    { id: 'secret-door', label: 'Cloaked Panel' },
    { id: 'locked-door-h', label: 'Locked Shutter (H)' }, { id: 'locked-door-v', label: 'Locked Shutter (V)' },
    { id: 'trapped-door-h', label: 'Trapped Shutter (H)' }, { id: 'trapped-door-v', label: 'Trapped Shutter (V)' },
    { id: 'portcullis', label: 'Security Gate' }, { id: 'archway', label: 'Neon Arch' }, { id: 'barricade', label: 'Debris Barrier' },
    { id: 'stairs-up', label: 'Ramp Up' }, { id: 'stairs-down', label: 'Ramp Down' },
    { id: 'water', label: 'Acid Pool' }, { id: 'pillar', label: 'Terminal' },
    { id: 'trap', label: 'Turret' }, { id: 'treasure', label: 'Chip Cache' }, { id: 'start', label: 'Spawn' },
    { id: 'background', label: 'Circuit Grid' },
  ],
  emptyTileId: 'empty',
  cssVars: {},
  tileColors: {
    empty: '#000005', floor: '#0a0a1a', wall: '#0d0d1e',
    'door-h': '#ff00ff', 'door-v': '#ff00ff',
    'secret-door': '#0d0d1e',
    'locked-door-h': '#cc00cc', 'locked-door-v': '#cc00cc',
    'trapped-door-h': '#ff3300', 'trapped-door-v': '#ff3300',
    portcullis: '#8800ff', archway: '#00ffcc', barricade: '#ff6600',
    'stairs-up': '#00ffff', 'stairs-down': '#00cccc',
    water: '#002244', pillar: '#1a001a', trap: '#ff0000',
    treasure: '#ffff00', start: '#00ff00',
    background: '#0a0a14',
  },
  gridColor: '#1a0a2a',
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
        // Circuit-board traces
        const fh = tileHash(x, y);
        const traceOff = fh * s * 0.3;
        ctx.strokeStyle = '#2a1a50';
        ctx.lineWidth = 0.5;
        // Trace 1: L-shape offset by hash
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3 + traceOff);
        ctx.lineTo(px + s * 0.5, py + 3 + traceOff);
        ctx.lineTo(px + s * 0.5, py + s - 3);
        ctx.stroke();
        // Trace 2: inverted L
        ctx.beginPath();
        ctx.moveTo(px + s - 3, py + s * 0.4 + traceOff * 0.5);
        ctx.lineTo(px + s * 0.65, py + s * 0.4 + traceOff * 0.5);
        ctx.lineTo(px + s * 0.65, py + 3);
        ctx.stroke();
        // Trace 3: short horizontal stub
        ctx.beginPath();
        ctx.moveTo(px + 3, py + s - 4);
        ctx.lineTo(px + s * 0.3, py + s - 4);
        ctx.stroke();
        // Pad at end of trace 1
        ctx.fillStyle = '#2a1a50';
        ctx.beginPath();
        ctx.arc(px + s * 0.5, py + s - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'wall': {
        ctx.fillStyle = jitterColor(this.tileColors[type], x, y, 0.06);
        ctx.fillRect(px, py, size, size);
        drawWallDepth(ctx, px, py, size, 'glow', '#ff00ff', 0.6);
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
        ctx.strokeStyle = '#ff00ff44';
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
        // Holographic shimmer scan-lines
        const shimmerColors = ['#ff00ff33', '#cc00cc44', '#ff00ff33'];
        for (let i = 0; i < shimmerColors.length; i++) {
          const ly = py + 4 + i * ((s - 8) / 3);
          ctx.strokeStyle = shimmerColors[i];
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(px + 3, ly);
          ctx.lineTo(px + s - 3, ly);
          ctx.stroke();
        }
        break;
      }

      case 'secret-door': {
        // Same neon barrier outline, with a faint 'S' overlay.
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
        ctx.strokeStyle = '#ff00ff44';
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
        const fontSize = Math.max(7, Math.floor(s * 0.6));
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ff00ff';
        ctx.fillText('S', cx, cy + 1);
        break;
      }

      case 'door-h': {
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 2, cy - 3, (s - 4) / 2 - 1, 6);
        ctx.strokeRect(cx + 1, cy - 3, (s - 4) / 2 - 1, 6);
        ctx.fillStyle = '#ff00ff22';
        ctx.fillRect(px + 2, cy - 3, (s - 4) / 2 - 1, 6);
        ctx.fillRect(cx + 1, cy - 3, (s - 4) / 2 - 1, 6);
        // Glitch lines
        ctx.strokeStyle = '#ff00ff44';
        ctx.lineWidth = 0.5;
        for (let gi = 0; gi < 3; gi++) {
          const gy = cy - 2 + gi * 2;
          ctx.beginPath();
          ctx.moveTo(px + 3, gy);
          ctx.lineTo(px + s - 3, gy);
          ctx.stroke();
        }
        // Bright pixel dot shifted by tileHash
        const dh = tileHash(x, y);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 4 + dh * (s - 8), cy - 0.5, 1, 1);
        break;
      }

      case 'door-v': {
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 3, py + 2, 6, (s - 4) / 2 - 1);
        ctx.strokeRect(cx - 3, cy + 1, 6, (s - 4) / 2 - 1);
        ctx.fillStyle = '#ff00ff22';
        ctx.fillRect(cx - 3, py + 2, 6, (s - 4) / 2 - 1);
        ctx.fillRect(cx - 3, cy + 1, 6, (s - 4) / 2 - 1);
        // Vertical glitch lines
        ctx.strokeStyle = '#ff00ff44';
        ctx.lineWidth = 0.5;
        for (let gi = 0; gi < 3; gi++) {
          const gx = cx - 2 + gi * 2;
          ctx.beginPath();
          ctx.moveTo(gx, py + 3);
          ctx.lineTo(gx, py + s - 3);
          ctx.stroke();
        }
        // Bright pixel dot shifted by tileHash
        const dvh = tileHash(x, y);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 0.5, py + 4 + dvh * (s - 8), 1, 1);
        break;
      }

      case 'locked-door-h': {
        ctx.strokeStyle = '#cc00cc';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 2, cy - 3, (s - 4) / 2 - 1, 6);
        ctx.strokeRect(cx + 1, cy - 3, (s - 4) / 2 - 1, 6);
        ctx.fillStyle = '#cc00cc22';
        ctx.fillRect(px + 2, cy - 3, (s - 4) / 2 - 1, 6);
        ctx.fillRect(cx + 1, cy - 3, (s - 4) / 2 - 1, 6);
        // Lock symbol
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 2, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(cx - 2, cy - 1, 4, 3);
        break;
      }

      case 'locked-door-v': {
        ctx.strokeStyle = '#cc00cc';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 3, py + 2, 6, (s - 4) / 2 - 1);
        ctx.strokeRect(cx - 3, cy + 1, 6, (s - 4) / 2 - 1);
        ctx.fillStyle = '#cc00cc22';
        ctx.fillRect(cx - 3, py + 2, 6, (s - 4) / 2 - 1);
        ctx.fillRect(cx - 3, cy + 1, 6, (s - 4) / 2 - 1);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 2, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(cx - 2, cy - 1, 4, 3);
        break;
      }

      case 'trapped-door-h': {
        ctx.strokeStyle = '#ff3300';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 2, cy - 3, (s - 4) / 2 - 1, 6);
        ctx.strokeRect(cx + 1, cy - 3, (s - 4) / 2 - 1, 6);
        ctx.fillStyle = '#ff330022';
        ctx.fillRect(px + 2, cy - 3, (s - 4) / 2 - 1, 6);
        ctx.fillRect(cx + 1, cy - 3, (s - 4) / 2 - 1, 6);
        // Danger X
        ctx.strokeStyle = '#ff0000';
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
        ctx.strokeStyle = '#ff3300';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 3, py + 2, 6, (s - 4) / 2 - 1);
        ctx.strokeRect(cx - 3, cy + 1, 6, (s - 4) / 2 - 1);
        ctx.fillStyle = '#ff330022';
        ctx.fillRect(cx - 3, py + 2, 6, (s - 4) / 2 - 1);
        ctx.fillRect(cx - 3, cy + 1, 6, (s - 4) / 2 - 1);
        ctx.strokeStyle = '#ff0000';
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
        ctx.strokeStyle = '#8800ff';
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
        ctx.strokeStyle = '#8800ff44';
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
        break;
      }

      case 'archway': {
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(px + 2, cy, s * 0.15, s / 2 - 2);
        ctx.fillRect(px + s - 2 - s * 0.15, cy, s * 0.15, s / 2 - 2);
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.32, Math.PI, 0);
        ctx.stroke();
        ctx.strokeStyle = '#00ffcc44';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.32, Math.PI, 0);
        ctx.stroke();
        break;
      }

      case 'barricade': {
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.moveTo(px + s - 3, py + 3);
        ctx.lineTo(px + 3, py + s - 3);
        ctx.stroke();
        ctx.strokeStyle = '#ff660044';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.moveTo(px + s - 3, py + 3);
        ctx.lineTo(px + 3, py + s - 3);
        ctx.stroke();
        break;
      }

      case 'stairs-up': {
        ctx.strokeStyle = '#00ffff';
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
        ctx.strokeStyle = '#00cccc';
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
        // Toxic neon pool with shimmering reflections and toxic bubbles
        const wh = tileHash(x, y);

        // Neon-cyan horizontal reflection lines
        ctx.lineWidth = 1;
        const lineYs = [0.3, 0.5, 0.72];
        const lineColors = ['#00ccff', '#00e8ff', '#00b8e0'];
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = lineColors[i];
          const ly = py + lineYs[i] * s + (wh - 0.5) * s * 0.06;
          ctx.beginPath();
          ctx.moveTo(px + 2, ly);
          for (let wx = 0; wx < s - 4; wx += 6) {
            ctx.lineTo(px + 2 + wx + 3, ly + (i % 2 === 0 ? -1.5 : 1.5));
            ctx.lineTo(px + 2 + wx + 6, ly);
          }
          ctx.stroke();
        }

        // Toxic bubbles
        ctx.fillStyle = '#39ff14';
        const bubbleSeeds = [0.0, 0.33, 0.67];
        for (let i = 0; i < 3; i++) {
          const bx = 0.2 + ((wh * 83 + i * 41) % 60) / 100;
          const by = 0.2 + bubbleSeeds[i] * 0.55;
          ctx.beginPath();
          ctx.arc(px + bx * s, py + by * s, s * 0.025, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'pillar': {
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - s * 0.2, py + 2, s * 0.4, s - 4);
        ctx.fillStyle = '#2a002a';
        ctx.fillRect(cx - s * 0.2 + 1, py + 3, s * 0.4 - 2, s - 6);
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
        break;
      }

      case 'trap': {
        // Electric arc: jagged lightning bolt with sparks
        const th = tileHash(x, y);
        const flip = th > 0.5;
        const x0 = flip ? px + s - 3 : px + 3;
        const y0 = py + 3;
        const x1 = flip ? px + 3 : px + s - 3;
        const y1 = py + s - 3;

        // Primary bolt (jagged path)
        ctx.strokeStyle = '#ff2060';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        const segments = 4;
        for (let i = 1; i < segments; i++) {
          const t = i / segments;
          const mx = x0 + (x1 - x0) * t + (th * 40 - 20) * (i % 2 === 0 ? 1 : -1) * 0.15;
          const my = y0 + (y1 - y0) * t;
          ctx.lineTo(mx, my);
        }
        ctx.lineTo(x1, y1);
        ctx.stroke();

        // Secondary fainter bolt
        ctx.strokeStyle = '#ff206066';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0 + 2, y0 + 1);
        for (let i = 1; i < segments; i++) {
          const t = i / segments;
          const mx = x0 + 2 + (x1 - x0) * t + (th * 30 - 15) * (i % 2 === 0 ? -1 : 1) * 0.15;
          const my = y0 + 1 + (y1 - y0) * t;
          ctx.lineTo(mx, my);
        }
        ctx.lineTo(x1 + 2, y1 + 1);
        ctx.stroke();

        // Spark dots at endpoints
        ctx.fillStyle = '#ff80a0';
        for (const [sx, sy] of [[x0, y0], [x1, y1]] as [number, number][]) {
          ctx.beginPath();
          ctx.arc(sx, sy, s * 0.04, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'treasure': {
        // Data chip with pins and glow
        const chipW = s * 0.3;
        const chipH = s * 0.24;

        // Faint glow rectangle
        ctx.fillStyle = '#ffdd0018';
        ctx.fillRect(cx - chipW * 0.7, cy - chipH * 0.7, chipW * 1.4, chipH * 1.4);

        // Chip body
        ctx.fillStyle = '#e8c820';
        ctx.fillRect(cx - chipW / 2, cy - chipH / 2, chipW, chipH);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(cx - chipW / 2, cy - chipH / 2, chipW, chipH);

        // Pins on each side
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        const pinLen = s * 0.08;
        // Top and bottom pins
        for (let i = 0; i < 3; i++) {
          const pinX = cx - chipW / 2 + chipW * (i + 1) / 4;
          ctx.beginPath();
          ctx.moveTo(pinX, cy - chipH / 2);
          ctx.lineTo(pinX, cy - chipH / 2 - pinLen);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pinX, cy + chipH / 2);
          ctx.lineTo(pinX, cy + chipH / 2 + pinLen);
          ctx.stroke();
        }
        // Left and right pins
        for (let i = 0; i < 2; i++) {
          const pinY = cy - chipH / 2 + chipH * (i + 1) / 3;
          ctx.beginPath();
          ctx.moveTo(cx - chipW / 2, pinY);
          ctx.lineTo(cx - chipW / 2 - pinLen, pinY);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + chipW / 2, pinY);
          ctx.lineTo(cx + chipW / 2 + pinLen, pinY);
          ctx.stroke();
        }
        break;
      }

      case 'start': {
        // Neon spawn portal with chevrons
        // Outer glow ring
        ctx.strokeStyle = '#00ff4430';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.40, 0, Math.PI * 2);
        ctx.stroke();

        // Main circle
        ctx.strokeStyle = '#00ff44';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.32, 0, Math.PI * 2);
        ctx.stroke();

        // Inward chevron arrows at cardinal positions
        ctx.strokeStyle = '#00ff44';
        ctx.lineWidth = 1.5;
        const chevR = s * 0.32;
        const chevSize = s * 0.07;
        const cardinals: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        for (const [dx, dy] of cardinals) {
          const tipX = cx + dx * (chevR - chevSize);
          const tipY = cy + dy * (chevR - chevSize);
          const perpX = -dy;
          const perpY = dx;
          ctx.beginPath();
          ctx.moveTo(tipX + dx * chevSize + perpX * chevSize, tipY + dy * chevSize + perpY * chevSize);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(tipX + dx * chevSize - perpX * chevSize, tipY + dy * chevSize - perpY * chevSize);
          ctx.stroke();
        }

        // Center dot
        ctx.fillStyle = '#00ff44';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.05, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'background': {
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(px, py, s, s);
        ctx.lineWidth = 0.5;
        const colors = ['#00ffff', '#ff00ff', '#40ff40'];
        for (let i = 0; i < 5; i++) {
          const h = tileHash(x * 7 + i, y * 11 + i);
          ctx.strokeStyle = colors[i % 3];
          ctx.globalAlpha = 0.25;
          ctx.beginPath();
          const ly = py + h * s;
          ctx.moveTo(px, ly);
          const mid = px + tileHash(x * 3 + i, y) * s;
          ctx.lineTo(mid, ly);
          ctx.lineTo(mid, ly + (tileHash(x + i, y * 5) - 0.5) * s * 0.4);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;
      }
    }
  },
};
