import type { TileTheme } from './index';
import type { TileType } from '../types/map';
import { jitterColor, drawWallDepth, tileHash } from './artUtils';

// Alien World theme: a strange, biological landscape — spongy spore beds,
// fungal walls, glowing acid pools, towering crystal spires, and pulsing
// bioluminescent membranes that ooze where doors would be on a starship.
export const alienTheme: TileTheme = {
  id: 'alien',
  name: 'Alien World',
  tiles: [
    { id: 'empty', label: 'Sky' }, { id: 'floor', label: 'Spore Bed' }, { id: 'wall', label: 'Fungal Wall' },
    { id: 'door-h', label: 'Membrane (H)' }, { id: 'door-v', label: 'Membrane (V)' },
    { id: 'secret-door', label: 'Hidden Burrow' },
    { id: 'locked-door-h', label: 'Locked Membrane (H)' }, { id: 'locked-door-v', label: 'Locked Membrane (V)' },
    { id: 'trapped-door-h', label: 'Trapped Membrane (H)' }, { id: 'trapped-door-v', label: 'Trapped Membrane (V)' },
    { id: 'portcullis', label: 'Chitin Gate' }, { id: 'archway', label: 'Nerve Arch' }, { id: 'barricade', label: 'Growth Barricade' },
    { id: 'stairs-up', label: 'Tendril Up' }, { id: 'stairs-down', label: 'Tendril Down' },
    { id: 'water', label: 'Acid Pool' }, { id: 'pillar', label: 'Crystal Spire' },
    { id: 'trap', label: 'Spore Burst' }, { id: 'treasure', label: 'Crystal Cluster' }, { id: 'start', label: 'Landing Site' },
    { id: 'background', label: 'Alien Terrain' },
  ],
  emptyTileId: 'empty',
  cssVars: {},
  tileColors: {
    empty: '#0a0418', floor: '#3a1f4a', wall: '#5a2a6a',
    'door-h': '#c040ff', 'door-v': '#c040ff',
    'secret-door': '#5a2a6a',
    'locked-door-h': '#9030cc', 'locked-door-v': '#9030cc',
    'trapped-door-h': '#cc40aa', 'trapped-door-v': '#cc40aa',
    portcullis: '#4a6a3a', archway: '#60c8b0', barricade: '#8a6a2a',
    'stairs-up': '#9affc8', 'stairs-down': '#5acc8a',
    water: '#7aff3a', pillar: '#d8a0ff',
    trap: '#ffe040', treasure: '#ff60d0', start: '#40ffe0',
    background: '#0a1a0a',
  },
  gridColor: '#2d1a3a',
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
        // Speckled spore bed: biolume dots with glow halos
        const dots: [number, number][] = [
          [0.25, 0.3], [0.7, 0.25], [0.4, 0.65], [0.75, 0.75], [0.2, 0.8],
        ];
        const dotR = Math.max(0.6, s * 0.05);
        for (const [fx, fy] of dots) {
          const dx = px + fx * s;
          const dy = py + fy * s;
          // Glow halo behind dot
          ctx.fillStyle = '#7a3aaa33';
          ctx.beginPath();
          ctx.arc(dx, dy, dotR * 2, 0, Math.PI * 2);
          ctx.fill();
          // Solid dot
          ctx.fillStyle = '#7a3aaa';
          ctx.beginPath();
          ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
        // Organic vein line connecting some dots
        ctx.strokeStyle = '#7a3aaa44';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + dots[0][0] * s, py + dots[0][1] * s);
        ctx.quadraticCurveTo(
          px + dots[2][0] * s, py + dots[2][1] * s,
          px + dots[3][0] * s, py + dots[3][1] * s,
        );
        ctx.stroke();
        break;
      }

      case 'wall': {
        ctx.fillStyle = jitterColor(this.tileColors[type], x, y, 0.06);
        ctx.fillRect(px, py, size, size);
        drawWallDepth(ctx, px, py, size, 'glow', '#c040ff', 0.5);
        // Fungal wall: bumpy organic mound
        ctx.fillStyle = '#3a1850';
        ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
        ctx.fillStyle = '#7a3aaa';
        const bumps: [number, number, number][] = [
          [s * 0.3, s * 0.35, s * 0.18],
          [s * 0.7, s * 0.4, s * 0.16],
          [s * 0.5, s * 0.7, s * 0.2],
        ];
        ctx.beginPath();
        for (const [bx, by, br] of bumps) {
          ctx.arc(px + bx, py + by, br, 0, Math.PI * 2);
        }
        ctx.fill();
        // Tendril lines radiating from bumps toward edges
        ctx.strokeStyle = '#5a2870';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + s * 0.3, py + s * 0.35);
        ctx.quadraticCurveTo(px + s * 0.15, py + s * 0.2, px + 2, py + s * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px + s * 0.7, py + s * 0.4);
        ctx.quadraticCurveTo(px + s * 0.85, py + s * 0.25, px + s - 2, py + 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px + s * 0.5, py + s * 0.7);
        ctx.quadraticCurveTo(px + s * 0.35, py + s * 0.85, px + 2, py + s - 2);
        ctx.stroke();
        // Tiny spore dots on tendrils
        ctx.fillStyle = '#7a3aaa';
        ctx.beginPath();
        ctx.arc(px + s * 0.15, py + s * 0.2, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + s * 0.85, py + s * 0.25, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + s * 0.35, py + s * 0.85, 0.8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'secret-door': {
        // Render as fungal wall with a faint 'S' overlay.
        ctx.fillStyle = '#3a1850';
        ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
        ctx.fillStyle = '#7a3aaa';
        ctx.beginPath();
        ctx.arc(px + s * 0.3, py + s * 0.35, s * 0.18, 0, Math.PI * 2);
        ctx.arc(px + s * 0.7, py + s * 0.4, s * 0.16, 0, Math.PI * 2);
        ctx.arc(px + s * 0.5, py + s * 0.7, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
        const fontSize = Math.max(7, Math.floor(s * 0.6));
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ff60d0';
        ctx.fillText('S', cx, cy + 1);
        break;
      }

      case 'door-h': {
        // Pulsing membrane stretched across a horizontal opening.
        ctx.fillStyle = '#c040ff';
        ctx.beginPath();
        ctx.ellipse(cx, cy, (s - 4) / 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff80ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, (s - 4) / 2, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Vein lines radiating from center
        ctx.strokeStyle = '#ff80ff88';
        ctx.lineWidth = 0.5;
        const hRx = (s - 4) / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - hRx * 0.7, cy - 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + hRx * 0.6, cy - 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + hRx * 0.3, cy + 3);
        ctx.stroke();
        break;
      }

      case 'door-v': {
        // Pulsing membrane stretched across a vertical opening.
        ctx.fillStyle = '#c040ff';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 4, (s - 4) / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff80ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 4, (s - 4) / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Vein lines radiating from center (rotated)
        ctx.strokeStyle = '#ff80ff88';
        ctx.lineWidth = 0.5;
        const vRy = (s - 4) / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 3, cy - vRy * 0.7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 2, cy + vRy * 0.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 3, cy + vRy * 0.3);
        ctx.stroke();
        break;
      }

      case 'locked-door-h': {
        ctx.fillStyle = '#9030cc';
        ctx.beginPath();
        ctx.ellipse(cx, cy, (s - 4) / 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff80ff';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Lock symbol
        ctx.strokeStyle = '#ffe040';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 2.5, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#ffe040';
        ctx.fillRect(cx - 2.5, cy - 1, 5, 4);
        break;
      }

      case 'locked-door-v': {
        ctx.fillStyle = '#9030cc';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 4, (s - 4) / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff80ff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = '#ffe040';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 2.5, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#ffe040';
        ctx.fillRect(cx - 2.5, cy - 1, 5, 4);
        break;
      }

      case 'trapped-door-h': {
        ctx.fillStyle = '#cc40aa';
        ctx.beginPath();
        ctx.ellipse(cx, cy, (s - 4) / 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff80ff';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Danger X
        ctx.strokeStyle = '#ff3030';
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
        ctx.fillStyle = '#cc40aa';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 4, (s - 4) / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff80ff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = '#ff3030';
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
        // Chitin gate — grid of organic bars
        ctx.strokeStyle = '#7aaa5a';
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
        // Nerve arch — two pillars with organic arc
        ctx.fillStyle = '#60c8b0';
        ctx.fillRect(px + 3, cy, s * 0.15, s / 2 - 2);
        ctx.fillRect(px + s - 3 - s * 0.15, cy, s * 0.15, s / 2 - 2);
        ctx.strokeStyle = '#80e8d0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.32, Math.PI, 0);
        ctx.stroke();
        break;
      }

      case 'barricade': {
        // Growth barricade — crossed organic beams
        ctx.strokeStyle = '#b0903a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.moveTo(px + s - 3, py + 3);
        ctx.lineTo(px + 3, py + s - 3);
        ctx.stroke();
        ctx.fillStyle = '#8a6a2a';
        ctx.fillRect(px + 2, cy - 1.5, s - 4, 3);
        break;
      }

      case 'stairs-up': {
        // Climbing tendril: a curved vine with an arrow tip pointing up.
        ctx.strokeStyle = '#9affc8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 3, py + s - 3);
        ctx.quadraticCurveTo(cx + 3, cy, cx, py + 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 3, py + 6);
        ctx.lineTo(cx, py + 3);
        ctx.lineTo(cx + 3, py + 6);
        ctx.stroke();
        break;
      }

      case 'stairs-down': {
        // Descending tendril: curved vine with arrow tip pointing down.
        ctx.strokeStyle = '#5acc8a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 3, py + 3);
        ctx.quadraticCurveTo(cx + 3, cy, cx, py + s - 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 3, py + s - 6);
        ctx.lineTo(cx, py + s - 3);
        ctx.lineTo(cx + 3, py + s - 6);
        ctx.stroke();
        break;
      }

      case 'water': {
        // Acid pool with organic swirls and rising bubbles
        const wh = tileHash(x, y);

        // Concentric irregular oval swirls
        const swirls: [string, number, number][] = [
          ['#60e030', 0.38, 0.26],
          ['#80ff50', 0.30, 0.20],
          ['#50c820', 0.22, 0.14],
        ];
        for (const [color, rx, ry] of swirls) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(cx + (wh - 0.5) * s * 0.1, cy + (wh - 0.3) * s * 0.06,
            s * rx, s * ry, wh * 0.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Rising bubbles with tileHash-varied positions
        ctx.strokeStyle = '#c8ff60';
        ctx.lineWidth = 0.8;
        const bubbleOffsets = [0.0, 0.37, 0.71, 0.53];
        for (let i = 0; i < 4; i++) {
          const bx = 0.2 + ((wh * 97 + i * 43) % 60) / 100;
          const by = 0.15 + bubbleOffsets[i] * 0.7;
          const br = 0.03 + (i % 2) * 0.02;
          ctx.beginPath();
          ctx.arc(px + bx * s, py + by * s, s * br, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }

      case 'pillar': {
        // Crystal spire: a faceted diamond shape with a highlight.
        ctx.fillStyle = '#a070d0';
        ctx.beginPath();
        ctx.moveTo(cx, py + 3);
        ctx.lineTo(cx + s / 4, cy);
        ctx.lineTo(cx, py + s - 3);
        ctx.lineTo(cx - s / 4, cy);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#e0b8ff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, py + 3);
        ctx.lineTo(cx, py + s - 3);
        ctx.stroke();
        break;
      }

      case 'trap': {
        // Spore burst: central pod with radiating spore lines and danger zone
        const th = tileHash(x, y);

        // Faint circular danger zone ring
        ctx.strokeStyle = '#ffe04030';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
        ctx.stroke();

        // Radiating spore lines ending in dots
        const sporeCount = 7 + Math.floor(th * 2); // 7 or 8
        ctx.strokeStyle = '#e8c830';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < sporeCount; i++) {
          const a = (i / sporeCount) * Math.PI * 2 + th * 0.3;
          const len = s * (0.32 + (((th * 97 + i * 31) % 10) / 100));
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * s * 0.1, cy + Math.sin(a) * s * 0.1);
          ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
          ctx.stroke();
          // Dot at end
          ctx.fillStyle = '#ffe860';
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * len, cy + Math.sin(a) * len, s * 0.03, 0, Math.PI * 2);
          ctx.fill();
        }

        // Central pod
        ctx.fillStyle = '#d4a820';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffe040';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.1, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'treasure': {
        // Crystal cluster: 3-4 elongated crystals radiating from center
        const crh = tileHash(x, y);
        const crystalCount = 3 + (crh > 0.5 ? 1 : 0);
        const baseAngle = crh * Math.PI * 0.5;
        const colors = ['#ff60d0', '#e040c0', '#ff80e0', '#d050b0'];

        for (let i = 0; i < crystalCount; i++) {
          const a = baseAngle + (i / crystalCount) * Math.PI * 2;
          const len = s * (0.3 + ((crh * 53 + i * 17) % 10) / 100);
          const hw = s * 0.05; // half-width of crystal
          ctx.fillStyle = colors[i % colors.length];
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a + Math.PI / 2) * hw, cy + Math.sin(a + Math.PI / 2) * hw);
          ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
          ctx.lineTo(cx + Math.cos(a - Math.PI / 2) * hw, cy + Math.sin(a - Math.PI / 2) * hw);
          ctx.closePath();
          ctx.fill();
        }

        // Sparkle dots
        ctx.fillStyle = '#ffd0ff';
        const sparkles = [[0.3, 0.25], [0.7, 0.35], [0.55, 0.75], [0.25, 0.65]];
        for (let i = 0; i < 3; i++) {
          const sp = sparkles[(Math.floor(crh * 97) + i) % sparkles.length];
          ctx.beginPath();
          ctx.arc(px + sp[0] * s, py + sp[1] * s, s * 0.02, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'start': {
        // Landing beacon: concentric circles with directional indicators
        // Outer thin circle
        ctx.strokeStyle = '#40ffe0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
        ctx.stroke();

        // Inner thick circle
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.25, 0, Math.PI * 2);
        ctx.stroke();

        // Directional triangles at cardinal points
        ctx.fillStyle = '#40ffe0';
        const dirs: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        for (const [dx, dy] of dirs) {
          const tipX = cx + dx * s * 0.42;
          const tipY = cy + dy * s * 0.42;
          const perpX = -dy;
          const perpY = dx;
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX - dx * s * 0.08 + perpX * s * 0.04, tipY - dy * s * 0.08 + perpY * s * 0.04);
          ctx.lineTo(tipX - dx * s * 0.08 - perpX * s * 0.04, tipY - dy * s * 0.08 - perpY * s * 0.04);
          ctx.closePath();
          ctx.fill();
        }

        // Center dot
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'background': {
        ctx.fillStyle = '#0a1a0a';
        ctx.fillRect(px, py, s, s);
        ctx.strokeStyle = '#1a3a1a';
        ctx.lineWidth = 0.7;
        for (let i = 0; i < 6; i++) {
          const h = tileHash(x * 7 + i, y * 11 + i);
          const startX = px + h * s;
          const startY = py + tileHash(x + i, y * 5 + i) * s;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(
            px + tileHash(x * 3 + i, y * 9) * s,
            py + tileHash(x * 13 + i, y * 3) * s,
            px + tileHash(x * 9 + i, y + i) * s,
            py + tileHash(x * 2 + i, y * 7 + i) * s
          );
          ctx.stroke();
        }
        break;
      }
    }
  },
};
