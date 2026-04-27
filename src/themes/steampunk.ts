import type { TileTheme } from './index';
import type { TileType } from '../types/map';

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
      case 'empty':
        break;

      case 'floor': {
        ctx.strokeStyle = '#4a3018';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + 2, cy);
        ctx.lineTo(px + s - 2, cy);
        ctx.moveTo(cx, py + 2);
        ctx.lineTo(cx, py + s - 2);
        ctx.stroke();
        break;
      }

      case 'wall': {
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
        ctx.strokeStyle = '#40c8a0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px + 2, cy);
        ctx.lineTo(px + s - 2, cy);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px + 4, cy, 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px + s - 4, cy, 2, 0, Math.PI * 2);
        ctx.stroke();
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
        ctx.strokeStyle = '#cc4400';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 3, py + 3, s - 6, s - 6);
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'treasure': {
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * s * 0.15, cy + Math.sin(angle) * s * 0.15);
          ctx.lineTo(cx + Math.cos(angle) * s * 0.28, cy + Math.sin(angle) * s * 0.28);
          ctx.stroke();
        }
        break;
      }

      case 'start': {
        ctx.strokeStyle = '#70b050';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#70b050';
        ctx.fillRect(cx - 1, cy - s * 0.2, 2, s * 0.4);
        ctx.fillRect(cx - s * 0.2, cy - 1, s * 0.4, 2);
        break;
      }
    }
  },
};
