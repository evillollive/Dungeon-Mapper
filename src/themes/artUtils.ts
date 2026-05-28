/**
 * Shared art utility functions for Phase 4.5 visual polish.
 *
 * Provides deterministic per-tile color jitter (via a fast spatial hash)
 * and wall depth/shadow helpers so themes can produce subtle per-cell
 * variation without any per-cell state.
 */

/* -------------------------------------------------------------------------- */
/*  Deterministic spatial hash                                                */
/* -------------------------------------------------------------------------- */

/**
 * Fast deterministic hash for tile coordinates → [0, 1).
 * Uses a variant of the "integer hash" technique with large prime
 * multipliers for uniform distribution; the result is stable for any
 * given (x, y) and uniformly distributed enough for visual jitter.
 */
export function tileHash(x: number, y: number): number {
  // Large primes chosen for good bit-mixing across 2D coordinates.
  let h = (x * 374761393 + y * 668265263) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  h = (h ^ (h >> 16)) | 0;
  return (h & 0x7fffffff) / 0x7fffffff;
}

/* -------------------------------------------------------------------------- */
/*  Colour jitter                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Parse a 6-digit hex colour (e.g. `"#8a7a60"`) into [r, g, b] (0–255).
 * Only 6-digit `#RRGGBB` format is supported; 3-digit shorthand is not.
 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * Convert [r, g, b] (0–255) back to a 6-digit hex string.
 */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    clamp(r).toString(16).padStart(2, '0') +
    clamp(g).toString(16).padStart(2, '0') +
    clamp(b).toString(16).padStart(2, '0')
  );
}

/**
 * Return a deterministically jittered variant of `hex` for tile (x, y).
 *
 * `amount` controls the jitter range in lightness units (0–1); a value of
 * 0.08 means ±8% variation. The direction (lighter/darker) is decided by
 * the hash of (x, y) so neighbouring tiles naturally differ.
 */
export function jitterColor(hex: string, x: number, y: number, amount: number = 0.08): string {
  const [r, g, b] = hexToRgb(hex);
  // Hash gives 0–1; remap to [-amount, +amount].
  const factor = 1 + (tileHash(x, y) * 2 - 1) * amount;
  return rgbToHex(r * factor, g * factor, b * factor);
}

/* -------------------------------------------------------------------------- */
/*  Wall depth / shadow                                                       */
/* -------------------------------------------------------------------------- */

export type WallDepthStyle = 'shadow' | 'glow' | 'hard-edge';

/**
 * Draw a subtle wall-depth effect behind / around a wall tile.
 *
 * Call this *before* drawing the wall's main artwork so the effect sits
 * underneath and just peeks out at the edges.
 *
 * - `shadow`    — dark drop-shadow offset down-right (Dungeon, Castle, etc.)
 * - `glow`      — neon glow ring (Cyberpunk, Starship)
 * - `hard-edge` — crisp 1px darker inset border (Modern City, Old West)
 *
 * @param intensity  0–1 strength multiplier (default 0.6)
 */
export function drawWallDepth(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  style: WallDepthStyle,
  color: string,
  intensity: number = 0.6,
): void {
  ctx.save();

  switch (style) {
    case 'shadow': {
      const offset = Math.max(1, size * 0.06);
      const alpha = Math.round(intensity * 180);
      const hex = alpha.toString(16).padStart(2, '0');
      ctx.fillStyle = `#000000${hex}`;
      ctx.fillRect(px + offset, py + offset, size, size);
      break;
    }
    case 'glow': {
      const glowSize = Math.max(1, size * 0.08);
      const [r, g, b] = hexToRgb(color);
      const alpha = (intensity * 0.5).toFixed(2);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = glowSize;
      ctx.strokeRect(
        px - glowSize / 2,
        py - glowSize / 2,
        size + glowSize,
        size + glowSize,
      );
      break;
    }
    case 'hard-edge': {
      const [r, g, b] = hexToRgb(color);
      const dark = rgbToHex(r * 0.6, g * 0.6, b * 0.6);
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
      break;
    }
  }

  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/*  Ambient occlusion (wall shadow on adjacent floor tiles)                   */
/* -------------------------------------------------------------------------- */

/**
 * Draw ambient occlusion shadows on a floor tile that is adjacent to walls.
 * Call after drawing the floor base. `getNeighbour` should return true if
 * the tile at (nx, ny) is a wall-like type.
 */
export function drawWallAO(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  x: number,
  y: number,
  isWallAt: (nx: number, ny: number) => boolean,
  aoColor: string = 'rgba(0,0,0,0.12)',
  aoSize: number = 0.18,
): void {
  const spread = size * aoSize;
  ctx.save();

  // Top edge
  if (isWallAt(x, y - 1)) {
    const g = ctx.createLinearGradient(px, py, px, py + spread);
    g.addColorStop(0, aoColor);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, size, spread);
  }
  // Bottom edge
  if (isWallAt(x, y + 1)) {
    const g = ctx.createLinearGradient(px, py + size, px, py + size - spread);
    g.addColorStop(0, aoColor);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px, py + size - spread, size, spread);
  }
  // Left edge
  if (isWallAt(x - 1, y)) {
    const g = ctx.createLinearGradient(px, py, px + spread, py);
    g.addColorStop(0, aoColor);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, spread, size);
  }
  // Right edge
  if (isWallAt(x + 1, y)) {
    const g = ctx.createLinearGradient(px + size, py, px + size - spread, py);
    g.addColorStop(0, aoColor);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px + size - spread, py, spread, size);
  }

  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/*  Enhanced water rendering                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Draw a stylized water tile with layered translucency, ripple patterns,
 * and subtle color variation. Themes can call this instead of a flat fill.
 */
export function drawWaterTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  x: number,
  y: number,
  baseColor: string = '#1e5f8e',
  highlightColor: string = 'rgba(120,180,240,0.25)',
): void {
  // Base water fill with jitter
  ctx.fillStyle = jitterColor(baseColor, x, y, 0.1);
  ctx.fillRect(px, py, size, size);

  const s = size;

  // Subtle depth gradient (darker at bottom)
  const depthGrad = ctx.createLinearGradient(px, py, px, py + s);
  depthGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
  depthGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
  ctx.fillStyle = depthGrad;
  ctx.fillRect(px, py, s, s);

  // Ripple lines (hash-positioned for determinism)
  ctx.strokeStyle = highlightColor;
  ctx.lineWidth = 0.6;
  const h1 = tileHash(x * 3, y * 7);
  const h2 = tileHash(x * 11, y * 5);
  const h3 = tileHash(x * 7, y * 3);

  ctx.beginPath();
  ctx.moveTo(px + s * 0.1, py + s * (0.25 + h1 * 0.2));
  ctx.quadraticCurveTo(
    px + s * 0.5, py + s * (0.2 + h1 * 0.15),
    px + s * 0.9, py + s * (0.28 + h1 * 0.18),
  );
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(px + s * 0.15, py + s * (0.55 + h2 * 0.15));
  ctx.quadraticCurveTo(
    px + s * 0.45, py + s * (0.5 + h2 * 0.12),
    px + s * 0.85, py + s * (0.58 + h2 * 0.12),
  );
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(px + s * 0.2, py + s * (0.75 + h3 * 0.1));
  ctx.quadraticCurveTo(
    px + s * 0.55, py + s * (0.72 + h3 * 0.08),
    px + s * 0.8, py + s * (0.78 + h3 * 0.08),
  );
  ctx.stroke();

  // Specular highlight dots
  const dotX = px + s * (0.3 + h1 * 0.4);
  const dotY = py + s * (0.3 + h2 * 0.3);
  ctx.fillStyle = 'rgba(200,230,255,0.15)';
  ctx.beginPath();
  ctx.arc(dotX, dotY, Math.max(0.5, s * 0.03), 0, Math.PI * 2);
  ctx.fill();
}

/* -------------------------------------------------------------------------- */
/*  Enhanced floor texture pattern                                            */
/* -------------------------------------------------------------------------- */

/**
 * Draw subtle stone/tile floor texture with randomized crack lines.
 * Use for dungeon/castle/ancient floor tiles for added visual depth.
 */
export function drawFloorCracks(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  x: number,
  y: number,
  crackColor: string = 'rgba(0,0,0,0.08)',
  count: number = 2,
): void {
  ctx.save();
  ctx.strokeStyle = crackColor;
  ctx.lineWidth = 0.5;

  for (let i = 0; i < count; i++) {
    const h1 = tileHash(x * 13 + i * 7, y * 19 + i * 3);
    const h2 = tileHash(x * 23 + i * 11, y * 7 + i * 17);
    const h3 = tileHash(x * 31 + i * 5, y * 29 + i * 13);

    const startX = px + h1 * size;
    const startY = py + h2 * size;
    const endX = px + h3 * size;
    const endY = py + tileHash(x * 37 + i, y * 41 + i) * size;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(
      px + size * 0.5 + (h1 - 0.5) * size * 0.3,
      py + size * 0.5 + (h2 - 0.5) * size * 0.3,
      endX,
      endY,
    );
    ctx.stroke();
  }

  ctx.restore();
}
