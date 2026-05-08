/**
 * Edge blending renderer — draws stochastic dithering at boundaries
 * between adjacent tiles of different types to soften hard grid
 * stepping.  Supports three blend styles: dither (noise), smooth
 * (gradient), and stipple (dot pattern).
 *
 * The renderer generates an offscreen canvas that is composited on
 * top of the tile layer. Per-theme blend masks are achieved by
 * sampling tile colours from the active theme.
 */

import type { Tile, EdgeBlendSettings, EdgeBlendStyle } from '../types/map';
import type { TileTheme } from '../themes';
import { tileHash } from '../themes/artUtils';
import { getSemanticTileType } from './customThemes';
import type { CustomThemeDefinition } from '../types/map';

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Seeded PRNG (mulberry32) for deterministic noise patterns.
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

/** Parse #RRGGBB → [r, g, b]. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (h.length < 6) return [0, 0, 0];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Resolve a tile's effective colour from the theme, falling back to
 *  a neutral grey for empty tiles. */
function getTileColor(
  tile: Tile | undefined,
  theme: TileTheme,
  customThemes: readonly CustomThemeDefinition[],
): string {
  if (!tile || tile.type === 'empty') return '#c0c0c0';
  const baseType = getSemanticTileType(tile.type, customThemes);
  return theme.tileColors[baseType] ?? '#c0c0c0';
}

// ── Neighbour directions (4-connected) ─────────────────────────────────

type Dir = 'N' | 'S' | 'E' | 'W';
const DX: Record<Dir, number> = { N: 0, S: 0, E: 1, W: -1 };
const DY: Record<Dir, number> = { N: -1, S: 1, E: 0, W: 0 };

// ── Per-edge blend drawing ─────────────────────────────────────────────

/**
 * Draw a dither-style blend on one edge of a tile. Fills a band of
 * scattered pixels from the neighbour's colour, fading toward the
 * interior of the tile.
 */
function drawDitherEdge(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  dir: Dir,
  nbrColor: string,
  intensity: number,
  opacity: number,
  x: number,
  y: number,
): void {
  const bandPx = Math.max(2, Math.round(tileSize * intensity * 0.5));
  const [r, g, b] = hexToRgb(nbrColor);
  const seed = tileHash(x * 4 + DX[dir] * 1000, y * 4 + DY[dir] * 1000);
  const rng = mulberry32(Math.round(seed * 0x7fffffff));

  const dotSize = Math.max(1, Math.round(tileSize * 0.04));
  const count = Math.round((tileSize * bandPx) / (dotSize * dotSize * 3));

  ctx.fillStyle = `rgba(${r},${g},${b},${opacity})`;

  for (let i = 0; i < count; i++) {
    const along = rng() * tileSize;
    const depth = rng() * bandPx;
    const alpha = (1 - depth / bandPx) * opacity;
    if (alpha < 0.05) continue;

    let dx: number, dy: number;
    switch (dir) {
      case 'N': dx = along; dy = depth; break;
      case 'S': dx = along; dy = tileSize - depth; break;
      case 'E': dx = tileSize - depth; dy = along; break;
      case 'W': dx = depth; dy = along; break;
    }

    ctx.globalAlpha = alpha;
    ctx.fillRect(px + dx, py + dy, dotSize, dotSize);
  }
}

/**
 * Draw a smooth gradient blend on one edge.
 */
function drawSmoothEdge(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  dir: Dir,
  nbrColor: string,
  intensity: number,
  opacity: number,
): void {
  const bandPx = Math.max(2, Math.round(tileSize * intensity * 0.5));
  const [r, g, b] = hexToRgb(nbrColor);

  let grad: CanvasGradient;
  let rx: number, ry: number, rw: number, rh: number;

  switch (dir) {
    case 'N':
      grad = ctx.createLinearGradient(0, py, 0, py + bandPx);
      rx = px; ry = py; rw = tileSize; rh = bandPx;
      break;
    case 'S':
      grad = ctx.createLinearGradient(0, py + tileSize, 0, py + tileSize - bandPx);
      rx = px; ry = py + tileSize - bandPx; rw = tileSize; rh = bandPx;
      break;
    case 'E':
      grad = ctx.createLinearGradient(px + tileSize, 0, px + tileSize - bandPx, 0);
      rx = px + tileSize - bandPx; ry = py; rw = bandPx; rh = tileSize;
      break;
    case 'W':
      grad = ctx.createLinearGradient(px, 0, px + bandPx, 0);
      rx = px; ry = py; rw = bandPx; rh = tileSize;
      break;
  }

  grad.addColorStop(0, `rgba(${r},${g},${b},${opacity})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = grad;
  ctx.fillRect(rx, ry, rw, rh);
  ctx.restore();
}

/**
 * Draw a stipple (dot pattern) blend on one edge.
 */
function drawStippleEdge(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  dir: Dir,
  nbrColor: string,
  intensity: number,
  opacity: number,
  x: number,
  y: number,
): void {
  const bandPx = Math.max(2, Math.round(tileSize * intensity * 0.5));
  const [r, g, b] = hexToRgb(nbrColor);
  const seed = tileHash(x * 7 + DX[dir] * 2000, y * 7 + DY[dir] * 2000);
  const rng = mulberry32(Math.round(seed * 0x7fffffff));

  const dotRadius = Math.max(0.5, tileSize * 0.02);
  const step = dotRadius * 3;
  const rows = Math.ceil(bandPx / step);
  const cols = Math.ceil(tileSize / step);

  ctx.fillStyle = `rgba(${r},${g},${b},1)`;

  for (let row = 0; row < rows; row++) {
    const depthFrac = row / Math.max(1, rows - 1);
    const alpha = (1 - depthFrac) * opacity;
    if (alpha < 0.05) continue;

    for (let col = 0; col < cols; col++) {
      // Stochastic jitter to break up regularity
      if (rng() > 0.6 + 0.4 * (1 - depthFrac)) continue;

      const along = col * step + rng() * step * 0.5;
      const depth = row * step + rng() * step * 0.3;

      let cx: number, cy: number;
      switch (dir) {
        case 'N': cx = px + along; cy = py + depth; break;
        case 'S': cx = px + along; cy = py + tileSize - depth; break;
        case 'E': cx = px + tileSize - depth; cy = py + along; break;
        case 'W': cx = px + depth; cy = py + along; break;
      }

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Draw edge-blending effects for the entire map.
 *
 * Call this *after* the tile layer has been drawn so the blend sits on
 * top of the tiles but below grid lines, stamps, tokens, etc.
 *
 * @param ctx       Target canvas context
 * @param tiles     2D tile grid
 * @param width     Map width in tiles
 * @param height    Map height in tiles
 * @param tileSize  Pixel size of each tile
 * @param settings  Edge blend settings
 * @param theme     Active tile theme (for colour sampling)
 * @param customThemes  Custom theme definitions (for semantic type resolution)
 */
export function drawEdgeBlending(
  ctx: CanvasRenderingContext2D,
  tiles: Tile[][],
  width: number,
  height: number,
  tileSize: number,
  settings: EdgeBlendSettings,
  theme: TileTheme,
  customThemes: readonly CustomThemeDefinition[],
): void {
  if (!settings.enabled) return;

  const { style, intensity, opacity } = settings;

  ctx.save();

  const dirs: Dir[] = ['N', 'S', 'E', 'W'];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = tiles[y]?.[x];
      if (!tile || tile.type === 'empty') continue;

      const px = x * tileSize;
      const py = y * tileSize;

      for (const dir of dirs) {
        const nx = x + DX[dir];
        const ny = y + DY[dir];

        // Skip out-of-bounds — no blending at map edges
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

        const nbr = tiles[ny]?.[nx];
        if (!nbr || nbr.type === 'empty') continue;

        // Only blend between tiles of different base types
        const thisBase = getSemanticTileType(tile.type, customThemes);
        const nbrBase = getSemanticTileType(nbr.type, customThemes);
        if (thisBase === nbrBase) continue;

        const nbrColor = getTileColor(nbr, theme, customThemes);

        drawEdge(ctx, style, px, py, tileSize, dir, nbrColor, intensity, opacity, x, y);
      }
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Dispatch to the correct per-style edge drawer. */
function drawEdge(
  ctx: CanvasRenderingContext2D,
  style: EdgeBlendStyle,
  px: number,
  py: number,
  tileSize: number,
  dir: Dir,
  nbrColor: string,
  intensity: number,
  opacity: number,
  x: number,
  y: number,
): void {
  switch (style) {
    case 'dither':
      drawDitherEdge(ctx, px, py, tileSize, dir, nbrColor, intensity, opacity, x, y);
      break;
    case 'smooth':
      drawSmoothEdge(ctx, px, py, tileSize, dir, nbrColor, intensity, opacity);
      break;
    case 'stipple':
      drawStippleEdge(ctx, px, py, tileSize, dir, nbrColor, intensity, opacity, x, y);
      break;
  }
}
