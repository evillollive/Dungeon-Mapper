/**
 * Line-of-Sight / Field-of-View calculation using iterative shadowcasting.
 *
 * The algorithm divides the circle around the origin into 8 octants and
 * sweeps each one independently, tracking which angular ranges are blocked
 * by walls. This produces O(n) runtime relative to the number of cells
 * in the visible area and handles wall occlusion naturally.
 *
 * Inspired by the classic roguelike shadowcasting technique (Björn
 * Bergström's description) — reimplemented from scratch for this project.
 */

import type { CustomThemeDefinition, Tile, TileType } from '../types/map';
import { getSemanticTileType } from './customThemes';

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
export function isOpaque(
  type: TileType,
  customThemes: readonly CustomThemeDefinition[] = [],
): boolean {
  return OPAQUE_TILES.has(getSemanticTileType(type, customThemes));
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
  customThemes: readonly CustomThemeDefinition[] = [],
): Set<string> {
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;
  const visible = new Set<string>();

  // The origin is always visible.
  visible.add(`${originX},${originY}`);

  const maxRadius = radius > 0 ? radius : Math.max(width, height);

  // Each octant transforms (row, col) offsets into (dx, dy) grid deltas.
  // We define the 8 octants via multiplier tuples: [xx, xy, yx, yy].
  //   dx = col * xx + row * xy
  //   dy = col * yx + row * yy
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
    // Compute a tight per-octant radius so scanning stops once all
    // cells would be out-of-bounds.  For each octant, the row axis
    // (mult[1], mult[3]) determines the primary scan direction; the
    // column axis (mult[0], mult[2]) is perpendicular.  We need the
    // farthest row r where at least one column 0..r maps to an
    // in-bounds cell.  A safe upper bound is the Chebyshev distance
    // from the origin to the farthest grid corner reachable along
    // the octant's row direction.
    const [xx, xy, yx, yy] = mult;
    // Maximum extent along the row axis (dx_row = r*xy, dy_row = r*yy)
    const rowReachX = xy >= 0 ? width - 1 - originX : originX;
    const rowReachY = yy >= 0 ? height - 1 - originY : originY;
    // Maximum extent along the column axis (dx_col = col*xx, dy_col = col*yx)
    const colReachX = xx >= 0 ? width - 1 - originX : originX;
    const colReachY = yx >= 0 ? height - 1 - originY : originY;
    // The farthest row is limited by the row-axis reach plus the
    // column-axis reach (since col goes up to r).
    const rRow = (xy !== 0 ? rowReachX : Infinity) + (xx !== 0 ? colReachX : 0);
    const rCol = (yy !== 0 ? rowReachY : Infinity) + (yx !== 0 ? colReachY : 0);
    const octantRadius = Math.min(maxRadius, Math.max(0, rRow), Math.max(0, rCol));

    castOctant(
      tiles, visible, originX, originY,
      octantRadius, width, height, mult,
      1, 1.0, 0.0, customThemes,
    );
  }

  return visible;
}

/**
 * Iterative shadowcasting for a single octant.
 *
 * Processes one row (distance ring) at a time, maintaining a list of
 * active slope ranges. Wall cells split a range; floor cells extend it.
 * Narrow sub-ranges (angular width less than one cell at the scanning
 * distance) are pruned to prevent exponential range proliferation on
 * maps with many small wall segments (e.g. village building grids).
 * Out-of-bounds cells are treated as opaque so scanning naturally
 * stops at the map edge.
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
  _row: number,
  _startSlope: number,
  _endSlope: number,
  customThemes: readonly CustomThemeDefinition[],
): void {
  const [xx, xy, yx, yy] = mult;

  // Active slope ranges to scan at the current row.  Each entry is a
  // [startSlope, endSlope] pair where start ≥ end (start is the "upper"
  // / higher-column edge, end is the "lower" / lower-column edge).
  let ranges: { start: number; end: number }[] = [
    { start: _startSlope, end: _endSlope },
  ];

  for (let r = _row; r <= radius && ranges.length > 0; r++) {
    const nextRanges: { start: number; end: number }[] = [];
    const rNear = r - 0.5 || 1;
    const rFar = r + 0.5;
    // Minimum angular width that can contain at least one cell at the
    // next row.  Sub-ranges narrower than this are pruned to prevent
    // exponential range proliferation.
    const minWidth = 1.0 / (rFar + 1);

    for (const range of ranges) {
      let curStart = range.start;
      const curEnd = range.end;
      if (curStart < curEnd) continue;

      // Compute the column bounds from the slope range.
      const minCol = Math.max(0, Math.floor(curEnd * rNear - 0.5));
      const maxCol = Math.min(r, Math.floor(curStart * rFar + 0.5));

      let blocked = false;
      let nextStart = curStart;

      for (let col = minCol; col <= maxCol; col++) {
        const leftSlope = (col - 0.5) / rFar;
        const rightSlope = (col + 0.5) / rNear;

        if (curStart < leftSlope) continue;
        if (curEnd > rightSlope) continue;

        const dx = col * xx + r * xy;
        const dy = col * yx + r * yy;
        const mapX = ox + dx;
        const mapY = oy + dy;

        const inBounds =
          mapX >= 0 && mapX < width && mapY >= 0 && mapY < height;

        // Cells outside the Chebyshev radius are treated as opaque
        // to stop scanning — we still need to update the blocked state
        // rather than skipping them.
        const beyondRadius =
          Math.abs(dx) > radius || Math.abs(dy) > radius;

        if (inBounds && !beyondRadius) {
          visible.add(`${mapX},${mapY}`);
        }

        // Out-of-bounds cells and cells beyond the Chebyshev radius are
        // treated as opaque so scanning stops at the map edge / radius
        // boundary rather than propagating ranges into empty space.
        const cellOpaque =
          !inBounds || beyondRadius ||
          isOpaque(tiles[mapY][mapX].type, customThemes);

        if (blocked) {
          if (cellOpaque) {
            nextStart = rightSlope;
          } else {
            blocked = false;
            curStart = nextStart;
          }
        } else if (cellOpaque) {
          blocked = true;
          // Only push the sub-range if it's wide enough to contain
          // cells at subsequent rows.
          if (curStart - leftSlope >= minWidth) {
            nextRanges.push({ start: curStart, end: leftSlope });
          }
          nextStart = rightSlope;
        }
      }

      // If the last cell in the row was NOT blocked, the remaining
      // unblocked range continues to the next row.
      if (!blocked && curStart - curEnd >= minWidth) {
        nextRanges.push({ start: curStart, end: curEnd });
      }
    }

    // Merge ranges that are separated by a gap narrower than one cell
    // at the current distance.  Such micro-gaps cannot hide an entire
    // tile, so merging them has no visible effect on the FOV result but
    // prevents exponential range proliferation on maps with many small
    // wall segments (e.g. village building grids).
    if (nextRanges.length > 1) {
      // Ranges arrive roughly sorted by descending start slope (they
      // were emitted in column order within each parent range, and
      // parent ranges are themselves sorted).  Sort explicitly to
      // guarantee correct merge order.
      nextRanges.sort((a, b) => b.start - a.start);
      const merged: { start: number; end: number }[] = [nextRanges[0]];
      for (let i = 1; i < nextRanges.length; i++) {
        const prev = merged[merged.length - 1];
        const cur = nextRanges[i];
        // Merge if the gap between prev.end and cur.start is less than
        // one cell width, or if they overlap.
        if (prev.end - cur.start <= minWidth) {
          prev.end = cur.end;
        } else {
          merged.push(cur);
        }
      }
      ranges = merged;
    } else {
      ranges = nextRanges;
    }
  }
}
