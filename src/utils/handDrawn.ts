/**
 * Hand-drawn mode renderer — draws wobbly grid lines, cross-hatch
 * shading on wall tiles, and ink-texture effects inspired by Dyson
 * Logos and Watabou cartography styles.
 *
 * The renderer generates strokes on a provided canvas context at any
 * tile size. It honours print-mode by using solid black strokes on
 * white when `printMode` is true.
 *
 * Three style presets control the look:
 *  - `sketchy`: loose, high-amplitude wobble with rough hatching
 *  - `pencil`: softer, thinner lines with fine hatching
 *  - `ink`: bold strokes with dense cross-hatching
 */

import type { Tile, HandDrawnSettings, HandDrawnStyle } from '../types/map';
import { getSemanticTileType } from './customThemes';
import type { CustomThemeDefinition } from '../types/map';

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Seeded PRNG (mulberry32) for deterministic wobble patterns. Same
 * algorithm used in edgeBlend.ts for consistency.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simple 1D value noise interpolation for smooth wobble. Returns a
 * value in [-1, 1] given a floating-point position `t`. Uses the
 * seeded PRNG to generate deterministic lattice values.
 */
function valueNoise1D(t: number): number {
  const i = Math.floor(t);
  const f = t - i;
  // Smoothstep interpolation
  const u = f * f * (3 - 2 * f);
  // Use deterministic lattice values seeded by position
  const seedA = mulberry32(i * 127 + 31);
  const seedB = mulberry32((i + 1) * 127 + 31);
  const a = seedA() * 2 - 1;
  const b = seedB() * 2 - 1;
  return a + u * (b - a);
}

// ── Style presets ──────────────────────────────────────────────────────

interface StyleParams {
  /** Line width multiplier relative to tile size. */
  lineWidthMul: number;
  /** Wobble frequency — higher = more wiggles per tile. */
  wobbleFreq: number;
  /** Cross-hatch line spacing multiplier (fraction of tile size). */
  hatchSpacingMul: number;
  /** Cross-hatch line width multiplier relative to tile size. */
  hatchWidthMul: number;
  /** Number of hatch directions (1 = single diagonal, 2 = cross). */
  hatchDirections: number;
  /** Base stroke alpha (before opacity setting). */
  strokeAlpha: number;
}

const STYLE_PARAMS: Record<HandDrawnStyle, StyleParams> = {
  sketchy: {
    lineWidthMul: 0.04,
    wobbleFreq: 3.0,
    hatchSpacingMul: 0.18,
    hatchWidthMul: 0.02,
    hatchDirections: 2,
    strokeAlpha: 0.7,
  },
  pencil: {
    lineWidthMul: 0.025,
    wobbleFreq: 4.0,
    hatchSpacingMul: 0.12,
    hatchWidthMul: 0.012,
    hatchDirections: 1,
    strokeAlpha: 0.5,
  },
  ink: {
    lineWidthMul: 0.055,
    wobbleFreq: 2.5,
    hatchSpacingMul: 0.14,
    hatchWidthMul: 0.03,
    hatchDirections: 2,
    strokeAlpha: 0.9,
  },
};

// ── Wall tile detection ────────────────────────────────────────────────

/** Tile types treated as "wall" for cross-hatch shading. */
const WALL_TYPES = new Set(['wall', 'pillar']);

function isWallTile(
  tiles: Tile[][],
  x: number,
  y: number,
  customThemes: readonly CustomThemeDefinition[],
): boolean {
  const tile = tiles[y]?.[x];
  if (!tile) return false;
  const semantic = getSemanticTileType(tile.type, customThemes);
  return WALL_TYPES.has(semantic);
}

/** Check if a tile is non-empty (floor, door, water, etc.). */
function isFilledTile(
  tiles: Tile[][],
  x: number,
  y: number,
): boolean {
  const tile = tiles[y]?.[x];
  return !!tile && tile.type !== 'empty';
}

// ── Wobbly line drawing ────────────────────────────────────────────────

/**
 * Draw a wobbly line between two points using value noise for smooth
 * jitter. The `seed` ensures each grid line gets a unique but
 * deterministic wobble pattern.
 */
function drawWobblyLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  amplitude: number,
  freq: number,
  seed: number,
  segments: number = 12,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  // Normal direction for perpendicular displacement
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return;
  const nx = -dy / len;
  const ny = dx / len;

  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const noise = valueNoise1D(t * freq + seed * 0.1) * amplitude;
    const px = x0 + dx * t + nx * noise;
    const py = y0 + dy * t + ny * noise;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();
}

// ── Cross-hatch rendering ──────────────────────────────────────────────

/**
 * Draw cross-hatch lines inside a tile cell. Renders diagonal lines
 * at 45° (and optionally -45°) to fill wall tiles with a sketchy
 * shading pattern.
 */
function drawCrossHatch(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  tileSize: number,
  params: StyleParams,
  density: number,
  seed: number,
  wobbleAmp: number,
): void {
  const spacing = Math.max(2, tileSize * params.hatchSpacingMul / Math.max(0.1, density));
  const rng = mulberry32(seed);

  // Hatch direction 1: top-left → bottom-right (45°)
  const count = Math.ceil(tileSize * 2 / spacing);
  for (let i = 0; i < count; i++) {
    const offset = -tileSize + i * spacing;
    // Clip to cell bounds
    const x0 = cx + Math.max(0, offset);
    const y0 = cy + Math.max(0, -offset);
    const x1 = cx + Math.min(tileSize, tileSize + offset);
    const y1 = cy + Math.min(tileSize, tileSize - offset);

    if (x0 >= cx + tileSize || y0 >= cy + tileSize) continue;
    if (x1 <= cx || y1 <= cy) continue;

    // Slight random offset for organic feel
    const jx = (rng() - 0.5) * wobbleAmp * 0.3;
    const jy = (rng() - 0.5) * wobbleAmp * 0.3;

    ctx.beginPath();
    ctx.moveTo(x0 + jx, y0 + jy);
    ctx.lineTo(x1 + jx, y1 + jy);
    ctx.stroke();
  }

  // Hatch direction 2: top-right → bottom-left (-45°)
  if (params.hatchDirections >= 2) {
    for (let i = 0; i < count; i++) {
      const offset = -tileSize + i * spacing;
      const x0 = cx + tileSize - Math.max(0, offset);
      const y0 = cy + Math.max(0, -offset);
      const x1 = cx + tileSize - Math.min(tileSize, tileSize + offset);
      const y1 = cy + Math.min(tileSize, tileSize - offset);

      if (x1 >= cx + tileSize || y0 >= cy + tileSize) continue;
      if (x0 <= cx || y1 <= cy) continue;

      const jx = (rng() - 0.5) * wobbleAmp * 0.3;
      const jy = (rng() - 0.5) * wobbleAmp * 0.3;

      ctx.beginPath();
      ctx.moveTo(x0 + jx, y0 + jy);
      ctx.lineTo(x1 + jx, y1 + jy);
      ctx.stroke();
    }
  }
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Draw the hand-drawn overlay onto the provided canvas context. This
 * renders wobbly grid lines and cross-hatch shading on wall tiles.
 *
 * @param ctx - Canvas 2D rendering context to draw on.
 * @param tiles - 2D tile array from DungeonMap.
 * @param width - Map width in tiles.
 * @param height - Map height in tiles.
 * @param tileSize - Pixel size of each tile.
 * @param settings - Hand-drawn settings from the map.
 * @param printMode - When true, use solid black strokes for B&W.
 * @param customThemes - Project-scoped custom theme definitions.
 */
export function drawHandDrawn(
  ctx: CanvasRenderingContext2D,
  tiles: Tile[][],
  width: number,
  height: number,
  tileSize: number,
  settings: HandDrawnSettings,
  printMode: boolean,
  customThemes: readonly CustomThemeDefinition[],
): void {
  const params = STYLE_PARAMS[settings.style];
  const wobbleAmp = settings.wobble * tileSize * 0.15;
  const lineWidth = Math.max(0.5, tileSize * params.lineWidthMul);
  const hatchWidth = Math.max(0.3, tileSize * params.hatchWidthMul);
  const strokeColor = printMode ? '#000000' : '#1a1a2e';

  ctx.save();
  ctx.globalAlpha = settings.opacity * params.strokeAlpha;
  ctx.strokeStyle = strokeColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // ── Pass 1: Cross-hatch shading on wall tiles ──────────────────────
  if (settings.crossHatch > 0) {
    ctx.lineWidth = hatchWidth;
    ctx.globalAlpha = settings.opacity * params.strokeAlpha * 0.6;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (isWallTile(tiles, x, y, customThemes)) {
          const seed = x * 1000 + y * 37 + 7919;
          drawCrossHatch(
            ctx,
            x * tileSize,
            y * tileSize,
            tileSize,
            params,
            settings.crossHatch,
            seed,
            wobbleAmp,
          );
        }
      }
    }
  }

  // ── Pass 2: Wobbly grid lines ──────────────────────────────────────
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = settings.opacity * params.strokeAlpha;

  // Horizontal grid lines
  for (let y = 0; y <= height; y++) {
    for (let x = 0; x < width; x++) {
      // Only draw wobbly lines along edges where at least one adjacent
      // tile is non-empty, to avoid cluttering empty areas.
      const above = y > 0 && isFilledTile(tiles, x, y - 1);
      const below = y < height && isFilledTile(tiles, x, y);
      if (!above && !below) continue;

      const seed = y * 1013 + x * 71 + 4231;
      drawWobblyLine(
        ctx,
        x * tileSize,
        y * tileSize,
        (x + 1) * tileSize,
        y * tileSize,
        wobbleAmp,
        params.wobbleFreq,
        seed,
      );
    }
  }

  // Vertical grid lines
  for (let x = 0; x <= width; x++) {
    for (let y = 0; y < height; y++) {
      const left = x > 0 && isFilledTile(tiles, x - 1, y);
      const right = x < width && isFilledTile(tiles, x, y);
      if (!left && !right) continue;

      const seed = x * 997 + y * 59 + 8377;
      drawWobblyLine(
        ctx,
        x * tileSize,
        y * tileSize,
        x * tileSize,
        (y + 1) * tileSize,
        wobbleAmp,
        params.wobbleFreq,
        seed,
      );
    }
  }

  // ── Pass 3: Extra bold outline on wall-to-floor boundaries ─────────
  // This gives the characteristic "thick outer wall" look of hand-drawn
  // dungeon maps. Draw a thicker wobbly line on edges between wall and
  // non-wall tiles.
  ctx.lineWidth = lineWidth * 2.5;
  ctx.globalAlpha = settings.opacity * params.strokeAlpha * 0.9;

  for (let y = 0; y <= height; y++) {
    for (let x = 0; x < width; x++) {
      const aboveIsWall = y > 0 && isWallTile(tiles, x, y - 1, customThemes);
      const belowIsWall = y < height && isWallTile(tiles, x, y, customThemes);
      // Draw thick line only at wall-to-non-wall transitions
      if (aboveIsWall === belowIsWall) continue;
      // At least one side must be filled
      const aboveFilled = y > 0 && isFilledTile(tiles, x, y - 1);
      const belowFilled = y < height && isFilledTile(tiles, x, y);
      if (!aboveFilled && !belowFilled) continue;

      const seed = y * 2017 + x * 83 + 6143;
      drawWobblyLine(
        ctx,
        x * tileSize,
        y * tileSize,
        (x + 1) * tileSize,
        y * tileSize,
        wobbleAmp * 0.7,
        params.wobbleFreq,
        seed,
      );
    }
  }

  for (let x = 0; x <= width; x++) {
    for (let y = 0; y < height; y++) {
      const leftIsWall = x > 0 && isWallTile(tiles, x - 1, y, customThemes);
      const rightIsWall = x < width && isWallTile(tiles, x, y, customThemes);
      if (leftIsWall === rightIsWall) continue;
      const leftFilled = x > 0 && isFilledTile(tiles, x - 1, y);
      const rightFilled = x < width && isFilledTile(tiles, x, y);
      if (!leftFilled && !rightFilled) continue;

      const seed = x * 2027 + y * 97 + 5381;
      drawWobblyLine(
        ctx,
        x * tileSize,
        y * tileSize,
        x * tileSize,
        (y + 1) * tileSize,
        wobbleAmp * 0.7,
        params.wobbleFreq,
        seed,
      );
    }
  }

  ctx.restore();
}

/**
 * Get the style parameter table — exported for unit testing.
 */
export function getStyleParams(style: HandDrawnStyle): StyleParams {
  return STYLE_PARAMS[style];
}
