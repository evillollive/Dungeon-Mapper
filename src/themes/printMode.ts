/**
 * Print / black-and-white tile renderer.
 *
 * Renders tiles as bold, high-contrast monochrome glyphs that remain legible
 * when printed in grayscale and don't rely on color to differentiate them.
 *
 * Inspired by old-school dungeon mapping conventions where icons that are
 * hard to draw are represented by a letter — sometimes with a strikethrough
 * (e.g. a "D" with a slash through it for a door).
 */

import type { TileType } from '../types/map';

export const PRINT_BG = '#ffffff';
export const PRINT_FG = '#000000';
export const PRINT_GRID = '#b8b8b8';

/**
 * Draw a single tile in monochrome print style.
 * The caller is responsible for filling the background with PRINT_BG first.
 */
export function drawPrintTile(
  ctx: CanvasRenderingContext2D,
  type: TileType,
  x: number,
  y: number,
  size: number,
): void {
  const px = x * size;
  const py = y * size;
  const cx = px + size / 2;
  const cy = py + size / 2;
  const s = size;

  ctx.save();
  ctx.fillStyle = PRINT_FG;
  ctx.strokeStyle = PRINT_FG;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Helper: draw a centered uppercase letter that fills most of the tile.
  const drawLetter = (letter: string) => {
    const fontSize = Math.max(8, Math.floor(s * 0.7));
    ctx.font = `bold ${fontSize}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PRINT_FG;
    ctx.fillText(letter, cx, cy + 1);
  };

  // Helper: draw a strikethrough across the whole tile (diagonal-ish slash).
  const drawStrikethrough = (orientation: 'horizontal' | 'vertical' | 'diagonal' = 'diagonal') => {
    const w = Math.max(1.5, s * 0.1);
    ctx.save();
    ctx.strokeStyle = PRINT_FG;
    ctx.lineWidth = w;
    ctx.beginPath();
    if (orientation === 'horizontal') {
      ctx.moveTo(px + s * 0.1, cy);
      ctx.lineTo(px + s * 0.9, cy);
    } else if (orientation === 'vertical') {
      ctx.moveTo(cx, py + s * 0.1);
      ctx.lineTo(cx, py + s * 0.9);
    } else {
      ctx.moveTo(px + s * 0.1, py + s * 0.9);
      ctx.lineTo(px + s * 0.9, py + s * 0.1);
    }
    ctx.stroke();
    ctx.restore();
  };

  switch (type) {
    case 'empty':
      // Leave blank — the white background already shows through.
      break;

    case 'floor': {
      // A small centered dot, plus very faint corner ticks, so floors are
      // distinguishable from "empty" but don't dominate visually.
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
      break;
    }

    case 'wall': {
      // Solid black square — the strongest visual element on the map.
      ctx.fillStyle = PRINT_FG;
      ctx.fillRect(px, py, s, s);
      break;
    }

    case 'door-h': {
      // Horizontal door: short solid wall segments on each side, opening in
      // the middle, with a "D" strikethrough glyph.
      ctx.fillStyle = PRINT_FG;
      const wallH = Math.max(2, s * 0.15);
      ctx.fillRect(px, cy - wallH / 2, s * 0.2, wallH);
      ctx.fillRect(px + s * 0.8, cy - wallH / 2, s * 0.2, wallH);
      drawLetter('D');
      drawStrikethrough('diagonal');
      break;
    }

    case 'door-v': {
      // Vertical door: short solid wall segments at top and bottom.
      ctx.fillStyle = PRINT_FG;
      const wallW = Math.max(2, s * 0.15);
      ctx.fillRect(cx - wallW / 2, py, wallW, s * 0.2);
      ctx.fillRect(cx - wallW / 2, py + s * 0.8, wallW, s * 0.2);
      drawLetter('D');
      drawStrikethrough('diagonal');
      break;
    }

    case 'stairs-up': {
      // Letter "U" with an up-arrow above it.
      const fontSize = Math.max(7, Math.floor(s * 0.55));
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = PRINT_FG;
      ctx.fillText('▲', cx, py + s * 0.32);
      ctx.fillText('U', cx, py + s * 0.72);
      break;
    }

    case 'stairs-down': {
      // Letter "D" (for "down") with a down-arrow above it. Distinguished
      // from a door by the absence of a strikethrough and the arrow.
      const fontSize = Math.max(7, Math.floor(s * 0.55));
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = PRINT_FG;
      ctx.fillText('▼', cx, py + s * 0.32);
      ctx.fillText('D', cx, py + s * 0.72);
      break;
    }

    case 'water': {
      // Three stacked wave (~) glyphs.
      ctx.strokeStyle = PRINT_FG;
      ctx.lineWidth = Math.max(1, s * 0.06);
      const rows = 3;
      for (let i = 0; i < rows; i++) {
        const wy = py + s * (0.25 + i * 0.25);
        ctx.beginPath();
        ctx.moveTo(px + s * 0.15, wy);
        const segs = 3;
        for (let j = 0; j < segs; j++) {
          const x0 = px + s * 0.15 + (j * (s * 0.7)) / segs;
          const x1 = px + s * 0.15 + ((j + 0.5) * (s * 0.7)) / segs;
          const x2 = px + s * 0.15 + ((j + 1) * (s * 0.7)) / segs;
          ctx.quadraticCurveTo(x1, wy - s * 0.07, x2, wy);
          ctx.moveTo(x2, wy);
          // Mirror is implicit in the next segment's quadraticCurveTo dipping below.
          // For visible up/down waves, alternate direction:
          ctx.quadraticCurveTo(x1, wy + s * 0.07, x0, wy);
          ctx.moveTo(x2, wy);
        }
        ctx.stroke();
      }
      break;
    }

    case 'pillar': {
      // Solid black filled circle — clearly a pillar regardless of color.
      ctx.fillStyle = PRINT_FG;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'trap': {
      // Letter "T" with a strikethrough — old-school trap notation.
      drawLetter('T');
      drawStrikethrough('diagonal');
      break;
    }

    case 'treasure': {
      // Dollar-sign in a box — universally legible as treasure/loot.
      const boxW = s * 0.7;
      const boxH = s * 0.7;
      const bx = cx - boxW / 2;
      const by = cy - boxH / 2;
      ctx.strokeStyle = PRINT_FG;
      ctx.lineWidth = Math.max(1, s * 0.06);
      ctx.strokeRect(bx, by, boxW, boxH);
      drawLetter('$');
      break;
    }

    case 'start': {
      // A bold five-pointed star.
      const r = s * 0.38;
      const r2 = r * 0.45;
      ctx.fillStyle = PRINT_FG;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const radius = i % 2 === 0 ? r : r2;
        const x0 = cx + Math.cos(angle) * radius;
        const y0 = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x0, y0);
        else ctx.lineTo(x0, y0);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}
