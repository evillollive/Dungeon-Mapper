import type { TileTheme } from './index';
import type { TileType } from '../types/map';

// Lost Civilization theme: a forgotten civilization's stone complex — sun-bleached
// sandstone halls, carved hieroglyph-style walls, fluted pillars, toppled
// statues, and reflecting pools. The palette is deliberately Earthly
// (limestone, ochre, weathered bronze) with a few spots of color (lapis blue,
// jade green, gilded accents) so it reads equally well as a tomb in the
// Nile valley, a Mesoamerican ziggurat, or a temple of some long-lost
// civilization on a distant world. The iconography is generic-ancient: no
// specific real-world script, deity, or culture is depicted.
export const ancientTheme: TileTheme = {
  id: 'ancient',
  name: 'Lost Civilization',
  tiles: [
    { id: 'empty', label: 'Sand' }, { id: 'floor', label: 'Flagstone' }, { id: 'wall', label: 'Carved Wall' },
    { id: 'door-h', label: 'Stone Slab (H)' }, { id: 'door-v', label: 'Stone Slab (V)' },
    { id: 'secret-door', label: 'Hidden Glyph' },
    { id: 'stairs-up', label: 'Steps Up' }, { id: 'stairs-down', label: 'Steps Down' },
    { id: 'water', label: 'Reflecting Pool' }, { id: 'pillar', label: 'Pillar' },
    { id: 'trap', label: 'Cursed Glyph' }, { id: 'treasure', label: 'Sarcophagus' }, { id: 'start', label: 'Obelisk' },
  ],
  emptyTileId: 'empty',
  cssVars: {},
  tileColors: {
    // Warm sun-bleached desert palette, with lapis and jade accents reserved
    // for the feature tiles (water, treasure, start).
    empty: '#2a2114', floor: '#cdb27a', wall: '#8a6a3a',
    'door-h': '#a48050', 'door-v': '#a48050',
    'secret-door': '#8a6a3a',
    'stairs-up': '#bfa570', 'stairs-down': '#9a7e4a',
    water: '#2a7a8a', pillar: '#c8b88a',
    trap: '#a02e1e', treasure: '#b89048', start: '#3a2a1a',
  },
  drawTile(ctx: CanvasRenderingContext2D, type: TileType, x: number, y: number, size: number) {
    const px = x * size;
    const py = y * size;
    const color = this.tileColors[type];

    ctx.fillStyle = color;
    ctx.fillRect(px, py, size, size);

    ctx.strokeStyle = '#2d3561';
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
        // Flagstone with a faint carved chevron — suggests worn engravings
        // underfoot without being a specific real-world glyph.
        ctx.strokeStyle = '#a88a52';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.18, cy + s * 0.06);
        ctx.lineTo(cx, cy - s * 0.06);
        ctx.lineTo(cx + s * 0.18, cy + s * 0.06);
        ctx.stroke();
        break;
      }

      case 'wall': {
        // Carved sandstone block with a darker mortar shadow and a small
        // chiseled square evoking a relief carving.
        ctx.fillStyle = '#7a5a2a';
        ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
        ctx.fillStyle = '#a88450';
        ctx.fillRect(px + 2, py + 2, s - 4, 2);
        ctx.fillRect(px + 2, py + 2, 2, s - 4);
        // Tiny relief notch in the center.
        ctx.fillStyle = '#5a3a18';
        const nw = Math.max(2, Math.floor(s / 5));
        ctx.fillRect(cx - nw / 2, cy - nw / 2, nw, nw);
        break;
      }

      case 'secret-door': {
        // Carved wall with a faint 'S' overlay for the mapper.
        ctx.fillStyle = '#7a5a2a';
        ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
        ctx.fillStyle = '#a88450';
        ctx.fillRect(px + 2, py + 2, s - 4, 2);
        ctx.fillRect(px + 2, py + 2, 2, s - 4);
        const fontSize = Math.max(7, Math.floor(s * 0.6));
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e0c060';
        ctx.fillText('S', cx, cy + 1);
        break;
      }

      case 'door-h': {
        // Heavy stone slab with a carved gilded band running across.
        ctx.fillStyle = '#8a6838';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(px + 2, cy - 1, s - 4, 2);
        ctx.strokeStyle = '#5a3a18';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
        break;
      }

      case 'door-v': {
        ctx.fillStyle = '#8a6838';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(cx - 1, py + 2, 2, s - 4);
        ctx.strokeStyle = '#5a3a18';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
        break;
      }

      case 'stairs-up': {
        // Stepped temple-pyramid risers in sandstone.
        ctx.strokeStyle = '#3a2a10';
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
        ctx.strokeStyle = '#2a1f0a';
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
        // Still reflecting pool — fewer, calmer ripples than other themes,
        // tinted with a hint of jade.
        ctx.strokeStyle = '#7ad0c8';
        ctx.lineWidth = 1;
        for (let wy = 0; wy < 2; wy++) {
          const waveY = py + 5 + wy * (s / 2.5);
          ctx.beginPath();
          ctx.moveTo(px + 3, waveY);
          for (let wx = 0; wx < s - 6; wx += 4) {
            ctx.quadraticCurveTo(px + 3 + wx + 1, waveY - 1, px + 3 + wx + 2, waveY);
            ctx.quadraticCurveTo(px + 3 + wx + 3, waveY + 1, px + 3 + wx + 4, waveY);
          }
          ctx.stroke();
        }
        break;
      }

      case 'pillar': {
        // Fluted column with a capital and base — the signature feature of
        // an ancient hall of pillars.
        const r = s / 4;
        ctx.fillStyle = '#d8c898';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#7a5a2a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        // Capital (top) and base (bottom) bands.
        ctx.beginPath();
        ctx.moveTo(cx - r, cy - r * 0.45);
        ctx.lineTo(cx + r, cy - r * 0.45);
        ctx.moveTo(cx - r, cy + r * 0.45);
        ctx.lineTo(cx + r, cy + r * 0.45);
        ctx.stroke();
        // A single vertical flute groove down the shaft.
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 0.4);
        ctx.lineTo(cx, cy + r * 0.4);
        ctx.stroke();
        break;
      }

      case 'trap': {
        // Cursed glyph circle — a red ringed sigil with a forbidding cross.
        ctx.strokeStyle = '#cc3322';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.18, cy);
        ctx.lineTo(cx + s * 0.18, cy);
        ctx.moveTo(cx, cy - s * 0.18);
        ctx.lineTo(cx, cy + s * 0.18);
        ctx.stroke();
        break;
      }

      case 'treasure': {
        // Sarcophagus — a stone coffer with a gilded lid stripe and a
        // small lapis cartouche.
        const tw = s * 0.55;
        const th = s * 0.4;
        const tx = cx - tw / 2;
        const ty = cy - th / 2;
        ctx.fillStyle = '#9a7a48';
        ctx.fillRect(tx, ty + th * 0.3, tw, th * 0.7);
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(tx, ty, tw, th * 0.3);
        ctx.strokeStyle = '#5a3a18';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(tx, ty, tw, th);
        // Lapis cartouche on the lid.
        ctx.fillStyle = '#1e4a8e';
        ctx.fillRect(cx - tw * 0.12, ty + th * 0.08, tw * 0.24, th * 0.14);
        break;
      }

      case 'start': {
        // Obelisk — a tapered stone pillar with a gilded pyramidion at the
        // top, marking the entrance of the complex.
        ctx.fillStyle = '#8a6a3a';
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.12, py + s - 3);
        ctx.lineTo(cx + s * 0.12, py + s - 3);
        ctx.lineTo(cx + s * 0.08, py + s * 0.18);
        ctx.lineTo(cx - s * 0.08, py + s * 0.18);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#3a2a10';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        // Gilded pyramidion cap.
        ctx.fillStyle = '#e0c060';
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.08, py + s * 0.18);
        ctx.lineTo(cx + s * 0.08, py + s * 0.18);
        ctx.lineTo(cx, py + 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
    }
  },
};
