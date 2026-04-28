/**
 * Dead-end removal pass for the rooms-and-corridors generator.
 *
 * A "dead end" is a floor cell that has exactly one floor/passable neighbor
 * (4-connected). Iteratively removing these cells prunes corridor branches
 * that lead nowhere, producing a tidier layout. The `fraction` parameter
 * controls how many dead-end iterations to run: 0 = no removal (legacy),
 * 1 = remove all dead ends until none remain.
 *
 * Must run AFTER corridors are carved but BEFORE `outlineWalls`, so the
 * wall pass naturally seals the removed passages. Must also run before the
 * door engine, stairs engine, and decoration engine.
 */
import { DIRS_4, getCell, setCell, type TypeGrid } from './common';
import type { TileType } from '../../types/map';

/** Tile types that count as "passable" for dead-end detection. */
function isPassable(t: TileType): boolean {
  return t === 'floor';
}

/**
 * Remove dead-end corridor cells from the grid.
 *
 * @param grid     The mutable type grid (post-corridor, pre-outlineWalls).
 * @param width    Map width.
 * @param height   Map height.
 * @param fraction 0..1 — fraction of full dead-end removal. 0 = no removal,
 *                 1 = iterate until no dead ends remain. Values in between
 *                 run a proportional number of iterations (capped at a
 *                 reasonable maximum to avoid degenerate maps).
 * @param roomCells Optional set of `"x,y"` keys for cells that belong to
 *                  rooms. These are never removed even if they look like
 *                  dead ends (single-cell room protrusions, etc.).
 */
export function removeDeadEnds(
  grid: TypeGrid,
  width: number,
  height: number,
  fraction: number,
  roomCells?: ReadonlySet<string>,
): void {
  if (fraction <= 0) return;

  // Maximum iterations = longest possible corridor chain. In practice
  // this is bounded by the smaller map dimension.
  const maxIters = Math.max(width, height);
  const targetIters = Math.max(1, Math.round(maxIters * Math.min(1, fraction)));

  for (let i = 0; i < targetIters; i++) {
    // Temporarily protect room cells by checking after sweep identification.
    const toRemove: [number, number][] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (getCell(grid, x, y) !== 'floor') continue;
        if (roomCells?.has(`${x},${y}`)) continue;
        let passableNeighbors = 0;
        for (const [dx, dy] of DIRS_4) {
          if (isPassable(getCell(grid, x + dx, y + dy))) passableNeighbors++;
        }
        if (passableNeighbors <= 1) toRemove.push([x, y]);
      }
    }
    if (toRemove.length === 0) break;
    for (const [x, y] of toRemove) setCell(grid, x, y, 'empty');
  }
}
