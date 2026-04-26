import type { TileType } from '../../types/map';
import { bfsDistances, getCell, setCell, type TypeGrid } from './common';

/**
 * Stairs engine.
 *
 * `placeStairs` is the **sole** writer of the `stairs-down` / `stairs-up`
 * pair the rooms-and-corridors and cavern generators emit. It runs
 * after the start tile has been placed and before the door engine, so
 * the door engine can already see the stairs as POIs and treat them
 * as passage neighbors when validating door frames.
 *
 * Validity contract:
 *   - `stairs-down` is placed only on a `floor` cell.
 *   - `stairs-down` is reachable from `(sx, sy)` via the supplied
 *     `passable` predicate (which excludes door tiles by design — the
 *     door engine runs later and the BFS sees only the corridor /
 *     chamber floor that exists at this point in the pipeline).
 *   - When placed, `stairs-up` sits on a 4-adjacent `floor` cell of
 *     `stairs-down` so the pair reads as a connected stairwell.
 *
 * Self-healing: if the BFS reports the start cell as the farthest
 * (degenerate / disconnected map) or the farthest cell is no longer
 * `floor` by the time we try to stamp it, no stairs are placed and
 * the result is `{}`. Callers are expected to handle that gracefully
 * (the start tile is still a valid map).
 */

export interface PlaceStairsOptions {
  /** Tile types the BFS may traverse. Defaults to `floor + start`. */
  passable?: (t: TileType) => boolean;
}

export interface PlacedStairs {
  down?: { x: number; y: number };
  up?: { x: number; y: number };
}

const DEFAULT_PASSABLE = (t: TileType): boolean => t === 'floor' || t === 'start';

/** Cardinal neighbor offsets in (N, S, W, E) order. The legacy generators
 *  used this exact ordering when probing for a stairs-up cell, so we
 *  preserve it here to keep existing seeds reproducible. */
const STAIRS_UP_PROBE: readonly [number, number][] = [
  [0, -1], [0, 1], [-1, 0], [1, 0],
];

/**
 * Place a stairs-down at the floor cell farthest from `(sx, sy)` (BFS
 * distance under `passable`) and an adjacent stairs-up on any cardinal
 * floor neighbor. Mutates `grid` in place. Returns the placed cells so
 * the caller can wire them into the POI / Notes engine input.
 */
export function placeStairs(
  grid: TypeGrid,
  sx: number,
  sy: number,
  opts: PlaceStairsOptions = {}
): PlacedStairs {
  const passable = opts.passable ?? DEFAULT_PASSABLE;
  const { farthest } = bfsDistances(grid, sx, sy, passable);
  if (farthest.d <= 0 || getCell(grid, farthest.x, farthest.y) !== 'floor') {
    return {};
  }
  setCell(grid, farthest.x, farthest.y, 'stairs-down');
  const result: PlacedStairs = { down: { x: farthest.x, y: farthest.y } };
  // Place stairs-up on the first cardinal floor neighbor. Order matches
  // the legacy generators (N, S, W, E) so existing seeds reproduce
  // identically.
  for (const [dx, dy] of STAIRS_UP_PROBE) {
    const nx = farthest.x + dx;
    const ny = farthest.y + dy;
    if (getCell(grid, nx, ny) === 'floor') {
      setCell(grid, nx, ny, 'stairs-up');
      result.up = { x: nx, y: ny };
      break;
    }
  }
  return result;
}
