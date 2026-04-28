import type { TileTheme } from './index';
import type { TileType } from '../types/map';
import { jitterColor, drawWallDepth, tileHash } from './artUtils';

export const steampunkTheme: TileTheme = {
  id: 'steampunk',
  name: 'Steampunk',
  tiles: [
    { id: 'empty', label: 'Soot' }, { id: 'floor', label: 'Iron Plate' }, { id: 'wall', label: 'Gear Wall' },
    { id: 'door-h', label: 'Valve Door (H)' }, { id: 'door-v', label: 'Valve Door (V)' },
    { id: 'secret-door', label: 'Concealed Hatch' },
    { id: 'locked-door-h', label: 'Locked Valve Door (H)' }, { id: 'locked-door-v', label: 'Locked Valve Door (V)' },
    { id: 'trapped-door-h', label: 'Trapped Valve Door (H)' }, { id: 'trapped-door-v', label: 'Trapped Valve Door (V)' },
    { id: 'portcullis', label: 'Steam Gate' }, { id: 'archway', label: 'Pipe Archway' }, { id: 'barricade', label: 'Gear Barricade' },
    { id: 'stairs-up', label: 'Gantry Up' }, { id: 'stairs-down', label: 'Gantry Down' },
    { id: 'water', label: 'Steam Pipe' }, { id: 'pillar', label: 'Piston' },
    { id: 'trap', label: 'Pressure Plate' }, { id: 'treasure', label: 'Contraption' }, { id: 'start', label: 'Engine' },
  ],
  emptyTileId: 'empty',
  cssVars: {},
  tileColors: {
    empty: '#1a0e00', floor: '#6b4d2a', wall: '#4a3010',
    'door-h': '#b87333', 'door-v': '#b87333',
    'secret-door': '#4a3010',
    'locked-door-h': '#a06030', 'locked-door-v': '#a06030',
    'trapped-door-h': '#b85020', 'trapped-door-v': '#b85020',
    portcullis: '#706050', archway: '#c09050', barricade: '#8a6a30',
    'stairs-up': '#8a7040', 'stairs-down': '#6a5030',
    water: '#1a4a3a', pillar: '#8b6914', trap: '#cc4400',
    treasure: '#d4af37', start: '#5a9040',
  },
  gridColor: '#3a2810',
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
        ctx.strokeStyle = '#4a3018';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + 2, cy);
        ctx.lineTo(px + s - 2, cy);
        ctx.moveTo(cx, py + 2);
        ctx.lineTo(cx, py + s - 2);
        ctx.stroke();
        // Corner rivet dots
        ctx.fillStyle = '#8a6030';
        const rr = Math.max(1, s * 0.04);
        ctx.beginPath();
        ctx.arc(px + 4, py + 4, rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + s - 4, py + 4, rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + 4, py + s - 4, rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + s - 4, py + s - 4, rr, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'wall': {
        ctx.fillStyle = jitterColor(this.tileColors[type], x, y, 0.06);
        ctx.fillRect(px, py, size, size);
        drawWallDepth(ctx, px, py, size, 'hard-edge', this.tileColors[type], 0.6);
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const r1 = s * 0.3;
          const r2 = s * 0.4;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
          ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
          ctx.stroke();
        }
        // Inner gear hub
        ctx.fillStyle = '#4a3010';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        // Small inner spokes
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
          const angle = (i * Math.PI * 2) / 3 + Math.PI / 6;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * s * 0.1, cy + Math.sin(angle) * s * 0.1);
          ctx.lineTo(cx + Math.cos(angle) * s * 0.2, cy + Math.sin(angle) * s * 0.2);
          ctx.stroke();
        }
        break;
      }

      case 'secret-door': {
        // Looks like a gear-wall but with a faint 'S' marker.
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const r1 = s * 0.3;
          const r2 = s * 0.4;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
          ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
          ctx.stroke();
        }
        const fontSize = Math.max(7, Math.floor(s * 0.5));
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#b87333';
        ctx.fillText('S', cx, cy + 1);
        break;
      }

      case 'door-h': {
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
        ctx.fillStyle = '#3a2010';
        ctx.fillRect(cx - 2, cy - 3, 4, 6);
        ctx.strokeStyle = '#e0a060';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.stroke();
        // Pressure gauge
        ctx.strokeStyle = '#e0a060';
        ctx.lineWidth = 0.5;
        const gx = cx + 4;
        const gy = cy - 2;
        ctx.beginPath();
        ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
        ctx.stroke();
        // Gauge tick
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + 1, gy - 1);
        ctx.stroke();
        break;
      }

      case 'door-v': {
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
        ctx.fillStyle = '#3a2010';
        ctx.fillRect(cx - 3, cy - 2, 6, 4);
        ctx.strokeStyle = '#e0a060';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.stroke();
        // Pressure gauge (rotated)
        ctx.strokeStyle = '#e0a060';
        ctx.lineWidth = 0.5;
        const gxv = cx - 2;
        const gyv = cy + 4;
        ctx.beginPath();
        ctx.arc(gxv, gyv, 1.5, 0, Math.PI * 2);
        ctx.stroke();
        // Gauge tick
        ctx.beginPath();
        ctx.moveTo(gxv, gyv);
        ctx.lineTo(gxv - 1, gyv + 1);
        ctx.stroke();
        break;
      }

      case 'locked-door-h': {
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
        ctx.fillStyle = '#3a2010';
        ctx.fillRect(cx - 2, cy - 3, 4, 6);
        ctx.strokeStyle = '#e0a060';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.stroke();
        // Lock
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
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
        ctx.fillStyle = '#3a2010';
        ctx.fillRect(cx - 3, cy - 2, 6, 4);
        ctx.strokeStyle = '#e0a060';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.stroke();
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
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
        ctx.fillStyle = '#3a2010';
        ctx.fillRect(cx - 2, cy - 3, 4, 6);
        // Danger X
        ctx.strokeStyle = '#ff4400';
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
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
        ctx.fillStyle = '#3a2010';
        ctx.fillRect(cx - 3, cy - 2, 6, 4);
        ctx.strokeStyle = '#ff4400';
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
        // Steam gate — heavy brass grill
        ctx.strokeStyle = '#b87333';
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
        // Pipe archway — two pistons with a curved pipe
        ctx.fillStyle = '#8a6a30';
        ctx.fillRect(px + 3, cy, s * 0.15, s / 2 - 2);
        ctx.fillRect(px + s - 3 - s * 0.15, cy, s * 0.15, s / 2 - 2);
        ctx.strokeStyle = '#e0a060';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.32, Math.PI, 0);
        ctx.stroke();
        break;
      }

      case 'barricade': {
        // Gear barricade — crossed brass beams
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.moveTo(px + s - 3, py + 3);
        ctx.lineTo(px + 3, py + s - 3);
        ctx.stroke();
        ctx.fillStyle = '#8a6a30';
        ctx.fillRect(px + 2, cy - 1.5, s - 4, 3);
        break;
      }

      case 'stairs-up': {
        ctx.strokeStyle = '#c8a840';
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
        ctx.strokeStyle = '#c8a840';
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
        // Steam pipe with vapor
        const vh = tileHash(x, y);
        const valveX = px + s * 0.3 + vh * s * 0.3;
        // Pipe body — two parallel horizontal lines
        ctx.strokeStyle = '#706050';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 2, cy - s * 0.06);
        ctx.lineTo(px + s - 2, cy - s * 0.06);
        ctx.moveTo(px + 2, cy + s * 0.06);
        ctx.lineTo(px + s - 2, cy + s * 0.06);
        ctx.stroke();
        // Pipe fill
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(px + 2, cy - s * 0.06, s - 4, s * 0.12);
        // Valve wheel
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(valveX, cy, s * 0.08, 0, Math.PI * 2);
        ctx.stroke();
        // Valve cross
        ctx.beginPath();
        ctx.moveTo(valveX - s * 0.06, cy);
        ctx.lineTo(valveX + s * 0.06, cy);
        ctx.moveTo(valveX, cy - s * 0.06);
        ctx.lineTo(valveX, cy + s * 0.06);
        ctx.stroke();
        // Steam puffs above pipe
        ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
        const ph1 = tileHash(x + 3, y + 5);
        const ph2 = tileHash(x + 7, y + 11);
        ctx.beginPath();
        ctx.arc(px + s * 0.25 + ph1 * s * 0.15, cy - s * 0.2, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + s * 0.55 + ph2 * s * 0.1, cy - s * 0.25, s * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + s * 0.7, cy - s * 0.18, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'pillar': {
        ctx.fillStyle = '#6a4a10';
        ctx.fillRect(cx - s * 0.15, py + 2, s * 0.3, s - 4);
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, py + 4, s * 0.15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, py + s - 4, s * 0.15, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'trap': {
        // Gear pressure plate — square plate with gear in center
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 3, py + 3, s - 6, s - 6);
        // Gear circle
        const gearR = s * 0.18;
        ctx.fillStyle = '#8a5a20';
        ctx.beginPath();
        ctx.arc(cx, cy, gearR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cc8833';
        ctx.lineWidth = 0.75;
        ctx.stroke();
        // Gear teeth — 6 small rectangles around the edge
        ctx.fillStyle = '#cc8833';
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const tx = cx + Math.cos(angle) * gearR;
          const ty = cy + Math.sin(angle) * gearR;
          ctx.save();
          ctx.translate(tx, ty);
          ctx.rotate(angle);
          ctx.fillRect(-s * 0.03, -s * 0.04, s * 0.06, s * 0.08);
          ctx.restore();
        }
        // Inner hub dot
        ctx.fillStyle = '#4a3010';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.05, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'treasure': {
        // Clockwork contraption — interlocking gears
        const drawGear = (gx: number, gy: number, gr: number, teeth: number) => {
          ctx.fillStyle = '#c8a020';
          ctx.beginPath();
          ctx.arc(gx, gy, gr, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#8a6a10';
          ctx.lineWidth = 0.75;
          ctx.stroke();
          ctx.fillStyle = '#d4af37';
          for (let i = 0; i < teeth; i++) {
            const angle = (i * Math.PI * 2) / teeth;
            const tx = gx + Math.cos(angle) * gr;
            const ty = gy + Math.sin(angle) * gr;
            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(angle);
            ctx.fillRect(-s * 0.02, -s * 0.03, s * 0.04, s * 0.06);
            ctx.restore();
          }
          ctx.fillStyle = '#6a4a10';
          ctx.beginPath();
          ctx.arc(gx, gy, gr * 0.3, 0, Math.PI * 2);
          ctx.fill();
        };
        // Three interlocking gears of different sizes
        drawGear(cx - s * 0.14, cy - s * 0.08, s * 0.14, 6);
        drawGear(cx + s * 0.16, cy - s * 0.04, s * 0.1, 5);
        drawGear(cx + s * 0.02, cy + s * 0.16, s * 0.08, 4);
        // Connecting rods
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.14, cy - s * 0.08);
        ctx.lineTo(cx + s * 0.16, cy - s * 0.04);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.16, cy - s * 0.04);
        ctx.lineTo(cx + s * 0.02, cy + s * 0.16);
        ctx.stroke();
        break;
      }

      case 'start': {
        // Steam engine boiler
        const boilerW = s * 0.6;
        const boilerH = s * 0.4;
        const boilerX = cx - boilerW / 2;
        const boilerY = cy - boilerH / 2 + s * 0.06;
        const boilerR = s * 0.06;
        // Boiler body (rounded rectangle)
        ctx.fillStyle = '#3a3030';
        ctx.beginPath();
        ctx.moveTo(boilerX + boilerR, boilerY);
        ctx.lineTo(boilerX + boilerW - boilerR, boilerY);
        ctx.arc(boilerX + boilerW - boilerR, boilerY + boilerR, boilerR, -Math.PI / 2, 0);
        ctx.lineTo(boilerX + boilerW, boilerY + boilerH - boilerR);
        ctx.arc(boilerX + boilerW - boilerR, boilerY + boilerH - boilerR, boilerR, 0, Math.PI / 2);
        ctx.lineTo(boilerX + boilerR, boilerY + boilerH);
        ctx.arc(boilerX + boilerR, boilerY + boilerH - boilerR, boilerR, Math.PI / 2, Math.PI);
        ctx.lineTo(boilerX, boilerY + boilerR);
        ctx.arc(boilerX + boilerR, boilerY + boilerR, boilerR, Math.PI, Math.PI * 1.5);
        ctx.fill();
        ctx.strokeStyle = '#706050';
        ctx.lineWidth = 0.75;
        ctx.stroke();
        // Chimney/smokestack
        const chimX = cx + s * 0.08;
        const chimW = s * 0.1;
        const chimH = s * 0.2;
        ctx.fillStyle = '#2a2020';
        ctx.fillRect(chimX - chimW / 2, boilerY - chimH, chimW, chimH);
        ctx.strokeStyle = '#706050';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(chimX - chimW / 2, boilerY - chimH, chimW, chimH);
        // Smoke puffs
        ctx.fillStyle = 'rgba(180, 180, 180, 0.5)';
        ctx.beginPath();
        ctx.arc(chimX, boilerY - chimH - s * 0.05, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(chimX + s * 0.04, boilerY - chimH - s * 0.1, s * 0.03, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(chimX - s * 0.03, boilerY - chimH - s * 0.14, s * 0.025, 0, Math.PI * 2);
        ctx.fill();
        // Pressure gauge on front
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx - s * 0.1, cy + s * 0.06, s * 0.06, 0, Math.PI * 2);
        ctx.stroke();
        // Gauge needle
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.1, cy + s * 0.06);
        ctx.lineTo(cx - s * 0.1 + s * 0.04, cy + s * 0.03);
        ctx.stroke();
        break;
      }
    }
  },
};
