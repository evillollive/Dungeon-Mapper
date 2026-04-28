import type { TileTheme } from './index';
import type { TileType } from '../types/map';
import { jitterColor, drawWallDepth, tileHash } from './artUtils';

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
    { id: 'locked-door-h', label: 'Locked Carved Door (H)' }, { id: 'locked-door-v', label: 'Locked Carved Door (V)' },
    { id: 'trapped-door-h', label: 'Trapped Carved Door (H)' }, { id: 'trapped-door-v', label: 'Trapped Carved Door (V)' },
    { id: 'portcullis', label: 'Stone Portcullis' }, { id: 'archway', label: 'Temple Arch' }, { id: 'barricade', label: 'Stone Barricade' },
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
    'locked-door-h': '#8a6030', 'locked-door-v': '#8a6030',
    'trapped-door-h': '#8a2e1e', 'trapped-door-v': '#8a2e1e',
    portcullis: '#7a6a4a', archway: '#c8b080', barricade: '#6a5a3a',
    'stairs-up': '#bfa570', 'stairs-down': '#9a7e4a',
    water: '#2a7a8a', pillar: '#c8b88a',
    trap: '#a02e1e', treasure: '#b89048', start: '#3a2a1a',
  },
  gridColor: '#4a3a20',
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
        ctx.fillStyle = jitterColor(this.tileColors.floor, x, y, 0.08);
        ctx.fillRect(px, py, size, size);
        // Worn mortar grid
        ctx.strokeStyle = '#a08040';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + s * 0.15, cy);
        ctx.lineTo(px + s * 0.85, cy);
        ctx.moveTo(cx, py + s * 0.15);
        ctx.lineTo(cx, py + s * 0.85);
        ctx.stroke();
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
        ctx.fillStyle = jitterColor(color, x, y, 0.06);
        ctx.fillRect(px, py, size, size);
        drawWallDepth(ctx, px, py, size, 'shadow', color, 0.4);
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
        // Horizontal mortar lines at 1/3 and 2/3
        ctx.strokeStyle = '#5a3a18';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + 2, py + Math.round(s / 3));
        ctx.lineTo(px + s - 2, py + Math.round(s / 3));
        ctx.moveTo(px + 2, py + Math.round(s * 2 / 3));
        ctx.lineTo(px + s - 2, py + Math.round(s * 2 / 3));
        ctx.stroke();
        // Tiny carved diamond near a hash-picked corner
        const wh = tileHash(x, y);
        const dcx = wh < 0.25 ? px + 5 : wh < 0.5 ? px + s - 5 : wh < 0.75 ? px + 5 : px + s - 5;
        const dcy = wh < 0.25 ? py + 5 : wh < 0.5 ? py + 5 : wh < 0.75 ? py + s - 5 : py + s - 5;
        ctx.strokeStyle = '#a88450';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(dcx, dcy - 2);
        ctx.lineTo(dcx + 2, dcy);
        ctx.lineTo(dcx, dcy + 2);
        ctx.lineTo(dcx - 2, dcy);
        ctx.closePath();
        ctx.stroke();
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
        // Tiny chevron/zigzag marks along top and bottom edges
        ctx.strokeStyle = '#e0c060';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let zx = px + 4; zx < px + s - 4; zx += 4) {
          ctx.moveTo(zx, cy - 3);
          ctx.lineTo(zx + 2, cy - 2);
          ctx.lineTo(zx + 4, cy - 3);
          ctx.moveTo(zx, cy + 3);
          ctx.lineTo(zx + 2, cy + 2);
          ctx.lineTo(zx + 4, cy + 3);
        }
        ctx.stroke();
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
        // Tiny chevron/zigzag marks along left and right edges
        ctx.strokeStyle = '#e0c060';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let zy = py + 4; zy < py + s - 4; zy += 4) {
          ctx.moveTo(cx - 3, zy);
          ctx.lineTo(cx - 2, zy + 2);
          ctx.lineTo(cx - 3, zy + 4);
          ctx.moveTo(cx + 3, zy);
          ctx.lineTo(cx + 2, zy + 2);
          ctx.lineTo(cx + 3, zy + 4);
        }
        ctx.stroke();
        break;
      }

      case 'locked-door-h': {
        ctx.fillStyle = '#8a6838';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(px + 2, cy - 1, s - 4, 2);
        ctx.strokeStyle = '#5a3a18';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#e0c060';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 2, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(cx - 2, cy - 1, 4, 3);
        break;
      }

      case 'locked-door-v': {
        ctx.fillStyle = '#8a6838';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(cx - 1, py + 2, 2, s - 4);
        ctx.strokeStyle = '#5a3a18';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#e0c060';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 2, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(cx - 2, cy - 1, 4, 3);
        break;
      }

      case 'trapped-door-h': {
        ctx.fillStyle = '#8a6838';
        ctx.fillRect(px + 2, cy - 3, s - 4, 6);
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(px + 2, cy - 1, s - 4, 2);
        ctx.strokeStyle = '#5a3a18';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
        ctx.strokeStyle = '#cc3322';
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
        ctx.fillStyle = '#8a6838';
        ctx.fillRect(cx - 3, py + 2, 6, s - 4);
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(cx - 1, py + 2, 2, s - 4);
        ctx.strokeStyle = '#5a3a18';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
        ctx.strokeStyle = '#cc3322';
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
        ctx.strokeStyle = '#5a3a18';
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
        ctx.strokeStyle = '#e0c060';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
        break;
      }

      case 'archway': {
        ctx.fillStyle = '#8a6a3a';
        ctx.fillRect(px + 2, cy, s * 0.15, s / 2 - 2);
        ctx.fillRect(px + s - 2 - s * 0.15, cy, s * 0.15, s / 2 - 2);
        ctx.strokeStyle = '#e0c060';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.32, Math.PI, 0);
        ctx.stroke();
        break;
      }

      case 'barricade': {
        ctx.strokeStyle = '#5a3a18';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + s - 3, py + s - 3);
        ctx.moveTo(px + s - 3, py + 3);
        ctx.lineTo(px + 3, py + s - 3);
        ctx.stroke();
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
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
        // Sacred reflecting pool — rectangular basin, calm ripples, lotus flower
        const h0 = tileHash(x, y);
        // Rectangular basin with beveled edges
        const basinX = px + s * 0.12;
        const basinY = py + s * 0.15;
        const basinW = s * 0.76;
        const basinH = s * 0.7;
        // Outer bevel (lighter edge)
        ctx.fillStyle = '#3a8a7a';
        ctx.fillRect(basinX, basinY, basinW, basinH);
        // Inner pool (darker jade/teal)
        ctx.fillStyle = '#2a7a6a';
        ctx.fillRect(basinX + 2, basinY + 2, basinW - 4, basinH - 4);
        // Basin border
        ctx.strokeStyle = '#1a5a4a';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(basinX, basinY, basinW, basinH);
        // 2 calm ripple arcs inside
        ctx.strokeStyle = '#5ac0b0';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 2; i++) {
          const rippleY = basinY + basinH * 0.35 + i * basinH * 0.3;
          ctx.beginPath();
          ctx.arc(cx, rippleY, basinW * 0.25, Math.PI * 0.15, Math.PI * 0.85);
          ctx.stroke();
        }
        // Lotus flower — 3-4 petal ovals floating on surface
        const lotusX = cx + (h0 - 0.5) * basinW * 0.3;
        const lotusY = basinY + basinH * 0.5;
        ctx.fillStyle = '#e0a0c0';
        const petalCount = 3 + Math.floor(h0 * 2);
        for (let i = 0; i < petalCount; i++) {
          const angle = (i / petalCount) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(
            lotusX + Math.cos(angle) * s * 0.04,
            lotusY + Math.sin(angle) * s * 0.03,
            s * 0.035, s * 0.02,
            angle, 0, Math.PI * 2
          );
          ctx.fill();
        }
        // Lotus center
        ctx.fillStyle = '#e0c060';
        ctx.beginPath();
        ctx.arc(lotusX, lotusY, 1, 0, Math.PI * 2);
        ctx.fill();
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
        // Cursed glyph — circle with 5-pointed star (pentagram) and rune ticks
        const r = s * 0.3;
        // Outer circle
        ctx.strokeStyle = '#cc4420';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        // 5-pointed star (pentagram)
        ctx.strokeStyle = '#e06030';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
          const sx = cx + Math.cos(angle) * r * 0.85;
          const sy = cy + Math.sin(angle) * r * 0.85;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.stroke();
        // Small rune-like tick marks around the outer circle
        ctx.strokeStyle = '#cc4420';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2;
          const innerR = r + 1;
          const outerR = r + 3;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
          ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
          ctx.stroke();
        }
        // Inner glow fill
        ctx.fillStyle = '#cc442015';
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'treasure': {
        // Sarcophagus lid — elongated rectangle with rounded head end, face, crossed arms
        const tw = s * 0.4;
        const th = s * 0.8;
        const tx = cx - tw / 2;
        const ty = py + s * 0.1;
        // Body (elongated rectangle)
        ctx.fillStyle = '#9a7a48';
        ctx.fillRect(tx, ty + th * 0.2, tw, th * 0.8);
        // Rounded head end
        ctx.beginPath();
        ctx.ellipse(cx, ty + th * 0.2, tw / 2, th * 0.2, 0, Math.PI, 0);
        ctx.fill();
        // Gold/brown stone outline
        ctx.strokeStyle = '#5a3a18';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(cx, ty + th * 0.2, tw / 2, th * 0.2, 0, Math.PI, 0);
        ctx.stroke();
        ctx.strokeRect(tx, ty + th * 0.2, tw, th * 0.8);
        // Face — two eyes
        ctx.fillStyle = '#e0c060';
        ctx.beginPath();
        ctx.arc(cx - tw * 0.2, ty + th * 0.12, 1.2, 0, Math.PI * 2);
        ctx.arc(cx + tw * 0.2, ty + th * 0.12, 1.2, 0, Math.PI * 2);
        ctx.fill();
        // Simple nose line
        ctx.strokeStyle = '#e0c060';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, ty + th * 0.14);
        ctx.lineTo(cx, ty + th * 0.22);
        ctx.stroke();
        // Crossed arms (two diagonal lines across the chest area)
        ctx.strokeStyle = '#e0c060';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(tx + 2, ty + th * 0.35);
        ctx.lineTo(tx + tw - 2, ty + th * 0.55);
        ctx.moveTo(tx + tw - 2, ty + th * 0.35);
        ctx.lineTo(tx + 2, ty + th * 0.55);
        ctx.stroke();
        // Gilded lid stripe
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(tx, ty + th * 0.2, tw, 1.5);
        break;
      }

      case 'start': {
        // Obelisk — tall narrow tapered rectangle with pyramid cap and inscription bands
        const baseW = s * 0.28;
        const topW = s * 0.16;
        const obeliskBottom = py + s - 4;
        const obeliskTop = py + s * 0.22;
        // Obelisk body (tapered)
        ctx.fillStyle = '#7a5a30';
        ctx.beginPath();
        ctx.moveTo(cx - baseW / 2, obeliskBottom);
        ctx.lineTo(cx + baseW / 2, obeliskBottom);
        ctx.lineTo(cx + topW / 2, obeliskTop);
        ctx.lineTo(cx - topW / 2, obeliskTop);
        ctx.closePath();
        ctx.fill();
        // Lighter highlight on one side
        ctx.fillStyle = '#9a7a4a';
        ctx.beginPath();
        ctx.moveTo(cx, obeliskBottom);
        ctx.lineTo(cx + baseW / 2, obeliskBottom);
        ctx.lineTo(cx + topW / 2, obeliskTop);
        ctx.lineTo(cx, obeliskTop);
        ctx.closePath();
        ctx.fill();
        // Outline
        ctx.strokeStyle = '#3a2a10';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - baseW / 2, obeliskBottom);
        ctx.lineTo(cx + baseW / 2, obeliskBottom);
        ctx.lineTo(cx + topW / 2, obeliskTop);
        ctx.lineTo(cx - topW / 2, obeliskTop);
        ctx.closePath();
        ctx.stroke();
        // Pyramid cap (pyramidion)
        ctx.fillStyle = '#e0c060';
        ctx.beginPath();
        ctx.moveTo(cx - topW / 2, obeliskTop);
        ctx.lineTo(cx + topW / 2, obeliskTop);
        ctx.lineTo(cx, py + 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // 2-3 horizontal inscription band lines
        ctx.strokeStyle = '#5a3a18';
        ctx.lineWidth = 0.5;
        const bandCount = 3;
        for (let i = 1; i <= bandCount; i++) {
          const t = i / (bandCount + 1);
          const bandY = obeliskTop + t * (obeliskBottom - obeliskTop);
          const halfW = (baseW / 2 - (baseW - topW) / 2 * (1 - t));
          ctx.beginPath();
          ctx.moveTo(cx - halfW, bandY);
          ctx.lineTo(cx + halfW, bandY);
          ctx.stroke();
        }
        break;
      }
    }
  },
};
