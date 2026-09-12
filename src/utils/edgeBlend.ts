/**
 * Edge blending renderer — draws stochastic dithering at boundaries
 * between adjacent tiles of different types to soften hard grid
 * stepping.  Supports three blend styles: dither (noise), smooth
 * (gradient), and stipple (dot pattern).
 *
 * Per-theme blend masks sample tile colours from the active theme.
 * The editor can retain dither strips in a bounded atlas; exports
 * keep the direct, resolution-independent drawing path.
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

export const EDGE_BLEND_CACHE_MAX_BYTES = 16 * 1024 * 1024;
export const EDGE_BLEND_CACHE_MAX_ENTRIES = 16_384;
const ATLAS_SIDE = 512;
const MAX_ATLAS_PAGES = EDGE_BLEND_CACHE_MAX_BYTES / (ATLAS_SIDE * ATLAS_SIDE * 4);

interface StripPage {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  used: number;
  capacity: number;
  columns: number;
}

interface StripEntry {
  page: StripPage;
  sx: number;
  sy: number;
  clip: Path2D;
  color: string;
  rasterizedAt: number;
}

/**
 * At most sixteen 512px RGBA pages and 16,384 entries per editor.
 * Admission stops when full, rather than evicting strips that the next
 * full-map traversal would immediately need again. Overflow draws directly.
 * No map, image, fog or tile-grid references are retained.
 */
export class EdgeBlendCache {
  private pages: StripPage[] = [];
  private entries = new Map<string, StripEntry>();
  private configuration = '';
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private pageWidth = ATLAS_SIDE;
  private pageHeight = ATLAS_SIDE;
  private hits = 0;
  private misses = 0;
  private bypasses = 0;
  private generation = 0;

  get stats() {
    return {
      rasterBytes: this.pages.length * this.pageWidth * this.pageHeight * 4,
      pages: this.pages.length,
      entries: this.entries.size,
      hits: this.hits,
      misses: this.misses,
      bypasses: this.bypasses,
    };
  }

  clear(): void {
    for (const { canvas } of this.pages) {
      canvas.width = 0;
      canvas.height = 0;
    }
    this.pages = [];
    this.entries.clear();
    this.configuration = '';
    this.hits = this.misses = this.bypasses = 0;
    this.generation = 0;
  }

  prepare(
    ctx: CanvasRenderingContext2D,
    tileSize: number,
    settings: EdgeBlendSettings,
    mapWidth: number,
    mapHeight: number,
  ): boolean {
    const transform = ctx.getTransform();
    // Raster reuse requires the same device-pixel phase at every tile origin.
    // Unaligned/transformed callers retain the original vector drawing path.
    if (!settings.enabled || settings.style !== 'dither' || tileSize <= 0 ||
      !Number.isFinite(transform.a) || transform.a <= 0 ||
      transform.a !== transform.d || transform.b !== 0 || transform.c !== 0 ||
      !Number.isInteger(transform.e) || !Number.isInteger(transform.f) ||
      !Number.isInteger(tileSize * transform.a) ||
      ctx.globalCompositeOperation !== 'source-over' ||
      (ctx.filter !== undefined && ctx.filter !== 'none') ||
      ctx.shadowBlur !== 0 || ctx.shadowOffsetX !== 0 || ctx.shadowOffsetY !== 0 ||
      ctx.shadowColor !== 'rgba(0, 0, 0, 0)') {
      this.clear();
      return false;
    }
    // Keep small-map atlas surfaces the same size as their destination.
    // Canvas backends can rasterize small and large surfaces differently.
    const pageWidth = Math.min(ATLAS_SIDE, mapWidth * tileSize * transform.a);
    const pageHeight = Math.min(ATLAS_SIDE, mapHeight * tileSize * transform.a);
    const configuration = `${tileSize}|${transform.a}|${settings.intensity}|${settings.opacity}|${pageWidth}|${pageHeight}`;
    if (this.configuration !== configuration) {
      this.clear();
      this.configuration = configuration;
      this.scale = transform.a;
      this.pageWidth = pageWidth;
      this.pageHeight = pageHeight;
    }
    this.offsetX = transform.e;
    this.offsetY = transform.f;
    this.generation++;
    return true;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    tileSize: number,
    dir: Dir,
    color: string,
    intensity: number,
    opacity: number,
    x: number,
    y: number,
    populateOnly = false,
  ): boolean {
    const scale = this.scale;
    const band = Math.max(2, Math.round(tileSize * intensity * 0.5));
    const dot = Math.max(1, Math.round(tileSize * 0.04));
    const vertical = dir === 'E' || dir === 'W';
    // Include dot overhang and a transparent physical-pixel gutter. Adjacent
    // cached edges must preserve the direct renderer's overlaps and order.
    const left = Math.floor((dir === 'E' ? tileSize - band : 0) * scale) - 1;
    const top = Math.floor((dir === 'S' ? tileSize - band : 0) * scale) - 1;
    const longSide = Math.ceil((tileSize + dot) * scale) + 2;
    const shortSide = Math.ceil(band * scale) + Math.ceil(dot * scale) + 2;
    const width = vertical ? shortSide : longSide;
    const height = vertical ? longSide : shortSide;
    const key = `${x},${y},${dir}`;
    let entry = this.entries.get(key);
    if (entry?.color === color) {
      if (!populateOnly && entry.rasterizedAt !== this.generation) this.hits++;
    } else {
      const replacing = entry !== undefined;
      if (!entry) {
        if (width > this.pageWidth || height > this.pageHeight ||
          this.entries.size >= EDGE_BLEND_CACHE_MAX_ENTRIES) {
          if (!populateOnly) this.bypasses++;
          return false;
        }
        let page = this.pages.find(p => p.width === width && p.height === height && p.used < p.capacity);
        if (!page) {
          if (this.pages.length >= MAX_ATLAS_PAGES) {
            if (!populateOnly) this.bypasses++;
            return false;
          }
          const canvas = document.createElement('canvas');
          canvas.width = this.pageWidth;
          canvas.height = this.pageHeight;
          const atlasContext = canvas.getContext('2d');
          if (!atlasContext) throw new Error('Edge-blend canvas rendering is unavailable.');
          const columns = Math.floor(this.pageWidth / width);
          page = { canvas, ctx: atlasContext, width, height, used: 0,
            columns, capacity: columns * Math.floor(this.pageHeight / height) };
          this.pages.push(page);
        }
        const slot = page.used++;
        const clip = new Path2D();
        clip.rect(x * tileSize * scale + left, y * tileSize * scale + top, width, height);
        entry = { page, sx: slot % page.columns * width,
          sy: Math.floor(slot / page.columns) * height, clip, color, rasterizedAt: this.generation };
        this.entries.set(key, entry);
      }
      const { page, sx, sy } = entry;
      if (replacing) {
        page.ctx.setTransform(1, 0, 0, 1, 0, 0);
        page.ctx.clearRect(sx, sy, width, height);
      }
      page.ctx.setTransform(scale, 0, 0, scale,
        sx - left - x * tileSize * scale, sy - top - y * tileSize * scale);
      drawDitherEdge(page.ctx, x * tileSize, y * tileSize, tileSize, dir, color, intensity, opacity, x, y);
      entry.color = color;
      entry.rasterizedAt = this.generation;
      this.misses++;
    }
    if (populateOnly) return true;
    // Copy device pixels one-for-one rather than dividing into logical
    // coordinates and asking the canvas transform to scale them back.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, this.offsetX, this.offsetY);
    ctx.globalAlpha = 1;
    // Cropped source rectangles take a different compositing path in WebKit.
    // A bounded, reusable Path2D clips the whole-page copy without changing
    // the caller's current path (which save/restore does not preserve).
    ctx.clip(entry.clip);
    ctx.drawImage(entry.page.canvas,
      x * tileSize * scale + left - entry.sx, y * tileSize * scale + top - entry.sy);
    ctx.restore();
    return true;
  }
}

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
  cache?: EdgeBlendCache,
): void {
  if (!settings.enabled) {
    cache?.clear();
    return;
  }

  const { style, intensity, opacity } = settings;
  const useCache = cache?.prepare(ctx, tileSize, settings, width, height);

  ctx.save();

  const dirs: Dir[] = ['N', 'S', 'E', 'W'];

  const drawEdges = (populateOnly: boolean) => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = tiles[y]?.[x];
        if (!tile || tile.type === 'empty') continue;

        const px = x * tileSize;
        const py = y * tileSize;
        const thisBase = getSemanticTileType(tile.type, customThemes);

        for (const dir of dirs) {
          const nx = x + DX[dir];
          const ny = y + DY[dir];

          // Skip out-of-bounds; no blending at map edges.
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

          const nbr = tiles[ny]?.[nx];
          if (!nbr || nbr.type === 'empty') continue;

          // Only blend between tiles of different base types.
          const nbrBase = getSemanticTileType(nbr.type, customThemes);
          if (thisBase === nbrBase) continue;

          const nbrColor = getTileColor(nbr, theme, customThemes);

          if (useCache && cache?.draw(ctx, tileSize, dir, nbrColor, intensity, opacity, x, y, populateOnly)) continue;
          if (!populateOnly) drawEdge(ctx, style, px, py, tileSize, dir, nbrColor, intensity, opacity, x, y);
        }
      }
    }
  };

  // Do not alternate atlas writes and reads: Canvas implementations may copy
  // or synchronize an entire page each time its sampled source is mutated.
  if (useCache) drawEdges(true);
  drawEdges(false);

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
