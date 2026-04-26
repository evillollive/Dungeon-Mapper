import type { TileType } from '../../types/map';
import { DIRS_4, type TypeGrid } from './common';

/**
 * Connectivity utility module.
 *
 * Shared 4-connected flood-fill primitives used by the cavern generator
 * (largest-region trim) and the door engine (per-room reachability).
 * Unlike the door / POI / decoration engines this module does **not**
 * write any tiles; it just computes "what's reachable from where" given
 * a passable-tile predicate. Centralizing it here keeps the three
 * existing copies of "BFS over passable cells" from drifting apart and
 * lets callers share a consistent notion of "passable" rather than
 * re-rolling a predicate each time.
 *
 * Functions:
 *   - `largestRegion`: return the biggest connected component of cells
 *     for which `isOpen` holds. Used by the cavern generator to discard
 *     orphaned pockets that the cellular-automata smoothing leaves
 *     behind.
 *   - `reachableMask`: BFS from `(sx, sy)` returning a packed visited
 *     mask. Used by the door engine to test whether each room still
 *     touches a reachable cell after door / seal placement.
 *   - `isRectReachable`: cheap rectangle-vs-mask test that pairs with
 *     `reachableMask` for the door engine's per-room connectivity check.
 */

/**
 * Flood-fill from `(sx, sy)` and return a `Uint8Array` of width*height
 * marking every visited cell with 1, others with 0. Returns an empty
 * (all-zero) mask when the start is out of bounds or `isOpen` rejects
 * the start cell. The mask is indexed as `y * width + x`.
 */
export function reachableMask(
  grid: TypeGrid,
  sx: number,
  sy: number,
  isOpen: (t: TileType) => boolean
): Uint8Array {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const visited = new Uint8Array(w * h);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return visited;
  if (!isOpen(grid[sy][sx])) return visited;
  const queue: number[] = [sy * w + sx];
  visited[sy * w + sx] = 1;
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % w;
    const y = (idx - x) / w;
    for (const [dx, dy] of DIRS_4) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (visited[ni]) continue;
      if (!isOpen(grid[ny][nx])) continue;
      visited[ni] = 1;
      queue.push(ni);
    }
  }
  return visited;
}

/**
 * Whether any cell in the half-open rectangle `[x..x+w, y..y+h)` is
 * marked in `mask`. Coordinates are clipped to the grid bounds (`gw` /
 * `gh`) so a room overhanging the edge is still tested correctly.
 */
export function isRectReachable(
  mask: Uint8Array,
  rect: { x: number; y: number; w: number; h: number },
  gw: number,
  gh: number
): boolean {
  const x0 = Math.max(0, rect.x);
  const x1 = Math.min(gw, rect.x + rect.w);
  const y0 = Math.max(0, rect.y);
  const y1 = Math.min(gh, rect.y + rect.h);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (mask[y * gw + x]) return true;
    }
  }
  return false;
}

/**
 * Find the largest 4-connected component of cells satisfying `isOpen`.
 * Returns the cells of that region (empty array when none qualify) so
 * callers can rebuild the grid around it. Visits each cell at most once
 * — O(width * height) time and memory.
 */
export function largestRegion(
  grid: TypeGrid,
  isOpen: (t: TileType) => boolean
): { x: number; y: number }[] {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  if (h === 0 || w === 0) return [];
  const visited: boolean[][] = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => false)
  );
  let best: { x: number; y: number }[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (visited[y][x] || !isOpen(grid[y][x])) continue;
      const region: { x: number; y: number }[] = [];
      const stack: [number, number][] = [[x, y]];
      visited[y][x] = true;
      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        region.push({ x: cx, y: cy });
        for (const [dx, dy] of DIRS_4) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          if (visited[ny][nx] || !isOpen(grid[ny][nx])) continue;
          visited[ny][nx] = true;
          stack.push([nx, ny]);
        }
      }
      if (region.length > best.length) best = region;
    }
  }
  return best;
}
