import type { MapNote, Tile } from '../../types/map';
import {
  collectCells,
  DIRS_4,
  getCell,
  makeTypeGrid,
  setCell,
  type TypeGrid,
  typeGridToTiles,
} from './common';
import { makeRng, type Rng } from './random';
import type { GenerateContext, GeneratedMap } from './types';

/**
 * Drop a circular blob of `tile` onto the grid using a simple random walk.
 * Used to scatter rocks, water, and clearings across an otherwise open map.
 */
function paintBlob(
  grid: TypeGrid,
  rng: Rng,
  cx: number,
  cy: number,
  size: number,
  tile: 'wall' | 'water' | 'pillar' | 'floor'
): void {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  let x = cx;
  let y = cy;
  for (let i = 0; i < size; i++) {
    if (y >= 0 && y < h && x >= 0 && x < w) setCell(grid, x, y, tile);
    const [dx, dy] = rng.pick(DIRS_4);
    x += dx;
    y += dy;
  }
}

/**
 * Generate an open-air "wilderness" map: floor everywhere with scattered
 * obstacles. Tile types are still the same set the rest of the app
 * understands, so themes re-skin them appropriately (trees in wilderness,
 * dunes in desert, rubble in post-apocalypse, etc.).
 */
export function generateOpenTerrain(ctx: GenerateContext): GeneratedMap {
  const { width, height, seed, density } = ctx;
  const rng = makeRng(seed);
  const grid = makeTypeGrid(width, height, 'floor');

  const area = width * height;
  const d = Math.max(0.1, Math.min(1.5, density));

  // Scatter rocky / wooded clusters.
  const wallBlobs = Math.round((area / 80) * d);
  for (let i = 0; i < wallBlobs; i++) {
    paintBlob(grid, rng, rng.int(0, width - 1), rng.int(0, height - 1), rng.int(3, 9), 'wall');
  }

  // A couple of small water pools — fewer and smaller than the wall blobs
  // so the map still feels traversable.
  const waterBlobs = Math.max(1, Math.round((area / 250) * d));
  for (let i = 0; i < waterBlobs; i++) {
    paintBlob(grid, rng, rng.int(0, width - 1), rng.int(0, height - 1), rng.int(4, 12), 'water');
  }

  // Sprinkle individual boulders / standing stones across remaining floor.
  const pillarCount = Math.max(2, Math.round((area / 120) * d));
  for (let i = 0; i < pillarCount; i++) {
    const x = rng.int(0, width - 1);
    const y = rng.int(0, height - 1);
    if (getCell(grid, x, y) === 'floor') setCell(grid, x, y, 'pillar');
  }

  // Place a `start` and a single treasure on floor cells. Pick the start
  // near a corner so there's room to explore outward.
  const corner = { x: rng.int(1, Math.max(1, Math.floor(width / 4))), y: rng.int(1, Math.max(1, Math.floor(height / 4))) };
  let placedStart = false;
  for (let r = 0; r < 6 && !placedStart; r++) {
    for (let dy = -r; dy <= r && !placedStart; dy++) {
      for (let dx = -r; dx <= r && !placedStart; dx++) {
        const x = corner.x + dx;
        const y = corner.y + dy;
        if (getCell(grid, x, y) === 'floor') {
          setCell(grid, x, y, 'start');
          placedStart = true;
        }
      }
    }
  }

  const floors = collectCells(grid, 'floor');
  if (floors.length > 0) {
    const c = floors[rng.int(0, floors.length - 1)];
    setCell(grid, c.x, c.y, 'treasure');
  }

  const tiles: Tile[][] = typeGridToTiles(grid);
  const notes: MapNote[] = [];
  return { tiles, notes, width, height };
}
