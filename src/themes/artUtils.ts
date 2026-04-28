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
