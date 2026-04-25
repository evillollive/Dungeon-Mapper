import type { MapNote, Tile } from '../../types/map';
import {
  collectCells,
  clampDensity,
  DIRS_4,
  getCell,
  makeTypeGrid,
  reorderNotesReadingOrder,
  setCell,
  type TypeGrid,
  typeGridToTiles,
} from './common';
import { getOpenTerrainFlavor, poiLabelFor, poiLabelIsRoom } from './poi';
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
  const { width, height, seed, density, themeId, tileMix } = ctx;
  const flavor = getOpenTerrainFlavor(themeId);
  const rng = makeRng(seed);
  const grid = makeTypeGrid(width, height, 'floor');

  const area = width * height;
  const d = clampDensity(density);

  // Slider-driven overrides come in via `ctx.tileMix`; when a key is
  // absent we fall back to the legacy area-relative formulas so existing
  // seeds reproduce identically. Each fraction key is "approximate share
  // of map area" (the dialog stores them in those units).
  const ov = tileMix ?? {};

  // Scatter rocky / wooded clusters. Density still scales the count
  // multiplicatively so the existing "How busy?" slider remains useful.
  const wallBlobs = ov.wall !== undefined
    ? Math.max(0, Math.round((area * Math.max(0, ov.wall) / 6) * d))
    : Math.round((area / 80) * d);
  for (let i = 0; i < wallBlobs; i++) {
    paintBlob(grid, rng, rng.int(0, width - 1), rng.int(0, height - 1), rng.int(3, 9), 'wall');
  }

  // A couple of small water pools — fewer and smaller than the wall blobs
  // so the map still feels traversable.
  const waterBlobs = ov.water !== undefined
    ? Math.max(0, Math.round((area * Math.max(0, ov.water) / 8) * d))
    : Math.max(1, Math.round((area / 250) * d));
  for (let i = 0; i < waterBlobs; i++) {
    paintBlob(grid, rng, rng.int(0, width - 1), rng.int(0, height - 1), rng.int(4, 12), 'water');
  }

  // Sprinkle individual boulders / standing stones across remaining floor.
  const pillarCount = ov.pillar !== undefined
    ? Math.max(0, Math.round(area * Math.max(0, ov.pillar) * d))
    : Math.max(2, Math.round((area / 120) * d));
  for (let i = 0; i < pillarCount; i++) {
    const x = rng.int(0, width - 1);
    const y = rng.int(0, height - 1);
    if (getCell(grid, x, y) === 'floor') setCell(grid, x, y, 'pillar');
  }

  // Place a `start` and treasure caches on floor cells. Pick the start
  // near a corner so there's room to explore outward. Track POI cells so
  // we can attach auto-named MapNote entries (theme-flavored) below.
  const corner = { x: rng.int(1, Math.max(1, Math.floor(width / 4))), y: rng.int(1, Math.max(1, Math.floor(height / 4))) };
  const pois: { x: number; y: number; type: 'start' | 'treasure' }[] = [];
  let placedStart = false;
  for (let r = 0; r < 6 && !placedStart; r++) {
    for (let dy = -r; dy <= r && !placedStart; dy++) {
      for (let dx = -r; dx <= r && !placedStart; dx++) {
        const x = corner.x + dx;
        const y = corner.y + dy;
        if (getCell(grid, x, y) === 'floor') {
          setCell(grid, x, y, 'start');
          pois.push({ x, y, type: 'start' });
          placedStart = true;
        }
      }
    }
  }

  const floors = collectCells(grid, 'floor');
  const treasureCount = Math.min(
    floors.length,
    ov.treasure !== undefined
      ? Math.max(0, Math.round(ov.treasure))
      : Math.max(0, flavor.treasureCount)
  );
  for (let i = 0; i < treasureCount && floors.length > 0; i++) {
    const idx = rng.int(0, floors.length - 1);
    const c = floors.splice(idx, 1)[0];
    setCell(grid, c.x, c.y, 'treasure');
    pois.push({ x: c.x, y: c.y, type: 'treasure' });
  }

  const tiles: Tile[][] = typeGridToTiles(grid);
  const notes: MapNote[] = [];
  const counts = new Map<string, number>();
  for (const p of pois) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
  const seen = new Map<string, number>();
  for (let i = 0; i < pois.length; i++) {
    const p = pois[i];
    const total = counts.get(p.type) ?? 1;
    const idx = (seen.get(p.type) ?? 0) + 1;
    seen.set(p.type, idx);
    const id = i + 1;
    notes.push({
      id,
      x: p.x,
      y: p.y,
      label: poiLabelFor(themeId, p.type, total > 1 ? idx : undefined),
      description: '',
      // Open-terrain maps don't carve rooms, so a room-named POI label
      // (e.g. "Bunker") is the room itself, with no containing room to
      // nest inside.
      kind: poiLabelIsRoom(themeId, p.type) ? 'room' : 'poi',
    });
    if (tiles[p.y]?.[p.x]) tiles[p.y][p.x] = { ...tiles[p.y][p.x], noteId: id };
  }
  return { tiles, notes: reorderNotesReadingOrder(tiles, notes), width, height };
}
