/**
 * Line-of-Sight / Field-of-View calculation using recursive shadowcasting.
 *
 * The algorithm divides the circle around the origin into 8 octants and
 * sweeps each one independently, tracking which angular ranges are blocked
 * by walls. This produces O(n) runtime relative to the number of cells
 * in the visible area and handles wall occlusion naturally.
 *
 * Inspired by the classic roguelike shadowcasting technique (Björn
 * Bergström's description) — reimplemented from scratch for this project.
 */

import type { Tile, TileType } from '../types/map';

/**
 * Tile types that block line of sight. Walls and secret doors are opaque.
 * Regular doors, locked doors, trapped doors, portcullis, archway,
 * barricade are considered passable / transparent for LOS purposes (they
 * can be opened / seen through). Pillars block LOS.
 */
const OPAQUE_TILES: ReadonlySet<TileType> = new Set<TileType>([
  'wall',
  'secret-door',
  'pillar',
]);

/** Check whether a tile type blocks line of sight. */
export function isOpaque(type: TileType): boolean {
  return OPAQUE_TILES.has(type);
}

/**
 * Compute the set of visible cells from `(originX, originY)` on the given
 * tile grid, up to `radius` cells away (Chebyshev distance). If `radius`
 * is 0 or omitted, the entire grid is checked (effectively infinite range).
 *
 * Returns a `Set<string>` of `"x,y"` keys for every cell visible from the
 * origin. The origin cell itself is always visible.
 */
export function computeFOV(
  tiles: Tile[][],
  originX: number,
  originY: number,
  radius = 0,
): Set<string> {
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;
  const visible = new Set<string>();

  // The origin is always visible.
  visible.add(`${originX},${originY}`);

  const effectiveRadius = radius > 0 ? radius : Math.max(width, height);

  // Each octant transforms (row, col) offsets into (dx, dy) grid deltas.
  // We define the 8 octants via multiplier tuples: [xx, xy, yx, yy].
  const OCTANT_TRANSFORMS: [number, number, number, number][] = [
    [ 1,  0,  0,  1],
    [ 0,  1,  1,  0],
    [ 0, -1,  1,  0],
    [-1,  0,  0,  1],
    [-1,  0,  0, -1],
    [ 0, -1, -1,  0],
    [ 0,  1, -1,  0],
    [ 1,  0,  0, -1],
  ];

  for (const mult of OCTANT_TRANSFORMS) {
    castOctant(
      tiles, visible, originX, originY,
      effectiveRadius, width, height, mult,
      1, 1.0, 0.0,
    );
  }

  return visible;
}

/**
 * Recursive shadowcasting for a single octant.
 *
 * @param row        Current row (distance from origin) being scanned.
 * @param startSlope Upper slope of the unblocked range (1.0 initially).
 * @param endSlope   Lower slope of the unblocked range (0.0 initially).
 */
function castOctant(
  tiles: Tile[][],
  visible: Set<string>,
  ox: number,
  oy: number,
  radius: number,
  width: number,
  height: number,
  mult: [number, number, number, number],
  row: number,
  startSlope: number,
  endSlope: number,
): void {
  if (startSlope < endSlope) return;

  let nextStartSlope = startSlope;

  for (let r = row; r <= radius; r++) {
    let blocked = false;

    for (let col = 0; col <= r; col++) {
      // Compute the slopes for this cell.
      const leftSlope = (col - 0.5) / (r + 0.5);
      const rightSlope = (col + 0.5) / (r - 0.5 || 1);

      if (startSlope < leftSlope) continue;
      if (endSlope > rightSlope) continue;

      // Map (row, col) to actual grid coordinates via the octant transform.
      const [xx, xy, yx, yy] = mult;
      const dx = col * xx + r * xy;
      const dy = col * yx + r * yy;
      const mapX = ox + dx;
      const mapY = oy + dy;

      // Skip out-of-bounds cells but still track blocking state.
      const inBounds = mapX >= 0 && mapX < width && mapY >= 0 && mapY < height;

      // Chebyshev distance check.
      if (Math.abs(dx) > radius || Math.abs(dy) > radius) continue;

      if (inBounds) {
        visible.add(`${mapX},${mapY}`);
      }

      const cellOpaque = inBounds && isOpaque(tiles[mapY][mapX].type);

      if (blocked) {
        // Previous cell was opaque.
        if (cellOpaque) {
          // Still blocked — update the start slope for when we emerge.
          nextStartSlope = rightSlope;
        } else {
          // Emerged from a blocked run — begin a new scan.
          blocked = false;
          startSlope = nextStartSlope;
        }
      } else if (cellOpaque) {
        // Hit a wall — recurse with the narrowed view, then record
        // the shadow for the remaining cells in this row.
        blocked = true;
        castOctant(
          tiles, visible, ox, oy, radius, width, height, mult,
          r + 1, startSlope, leftSlope,
        );
        nextStartSlope = rightSlope;
      }
    }

    // If the last cell in the row was opaque, the whole remaining sweep
    // is shadowed — stop scanning further rows.
    if (blocked) break;
  }
}
