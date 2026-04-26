import type { Tile, TileType } from '../../types/map';
import {
  clampDensity,
  collectCells,
  DIRS_8,
  getCell,
  makeTypeGrid,
  outlineWalls,
  setCell,
  type TypeGrid,
  typeGridToTiles,
} from './common';
import { applyDecorations } from './decorationEngine';
import { assignAreaKinds, detectAreas, getCavernAreaPalette, type DetectedArea, type NaturalAreaKind } from './naturalAreas';
import { getCavernFlavor } from './poi';
import { applyPoiNotes, type LabeledRegion, type PoiPlacement } from './poiNotesEngine';
import { largestRegion } from './connectivity';
import { makeRng, type Rng } from './random';
import { placeStairs } from './stairsEngine';
import type { GenerateContext, GeneratedMap } from './types';

/** Count the number of `wall` neighbors (8-connected) around `(x, y)`. */
function wallNeighbors(grid: TypeGrid, x: number, y: number): number {
  let n = 0;
  for (const [dx, dy] of DIRS_8) {
    const t = getCell(grid, x + dx, y + dy);
    // Treat out-of-bounds as solid so the cavern stays bounded.
    if (t === 'wall' || t === 'empty') n++;
  }
  return n;
}

/**
 * Choose a floor cell from `floors` weighted by per-area trap/treasure
 * bias. Cells inside a chamber assigned an archetype with a matching
 * bias are more likely to be picked. Falls back to a uniform pick when
 * no chambers are labeled.
 */
function pickBiasedFloor(
  cells: { x: number; y: number }[],
  areaIdByCell: Map<number, number>,
  areaKinds: (NaturalAreaKind | undefined)[],
  bias: 'treasure' | 'trap',
  width: number,
  rng: Rng
): { idx: number; cell: { x: number; y: number } } {
  if (cells.length === 0) throw new Error('pickBiasedFloor: empty list');
  const weights = cells.map(c => {
    const key = c.y * width + c.x;
    const ai = areaIdByCell.get(key);
    if (ai === undefined) return 1;
    const k = areaKinds[ai];
    return k?.bias?.[bias] ?? 1;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    const idx = rng.int(0, cells.length - 1);
    return { idx, cell: cells[idx] };
  }
  let r = rng.next() * total;
  for (let i = 0; i < cells.length; i++) {
    r -= weights[i];
    if (r <= 0) return { idx: i, cell: cells[i] };
  }
  const idx = cells.length - 1;
  return { idx, cell: cells[idx] };
}

/**
 * Generate a cavern using the standard cellular-automata smoothing
 * algorithm: random fill → 4 smoothing passes → keep the largest connected
 * floor region. Density (0..1.5) controls the initial wall fill ratio
 * (0.45 default) and scales the count of placed traps, treasure caches,
 * water pools, and labeled chambers — at low density the map stays
 * sparse (matching the original empty-cavern look), at default/high
 * density it fills with hazards, caches, water, and named designated
 * areas so the cave system reads as a real, lived-in place.
 *
 * Optional per-tile-type overrides come in via `ctx.tileMix` (see
 * `tileMix.ts`):
 *  - `wall`: initial wall fill ratio (overrides the density-derived one).
 *  - `treasure`: number of treasure caches scattered on the floor.
 *  - `trap`: fraction of floor cells holding a trap / hazard.
 *  - `water`: fraction of floor cells converted to water pools.
 *  - `areas`: target count of labeled chambers (0 = unlabeled).
 *  - `stairsDown`: 0 / 1 toggle for the stairs-down POI.
 */
export function generateCavern(ctx: GenerateContext): GeneratedMap {
  const { width, height, seed, density, themeId, tileMix } = ctx;
  const rng = makeRng(seed);
  const grid = makeTypeGrid(width, height, 'wall');
  const flavor = getCavernFlavor(themeId);

  // Slider-driven overrides come in via `ctx.tileMix`; when a key is
  // absent we fall back to density-scaled defaults so the map fills
  // with hazards/treasure/water/areas at default density and thins out
  // when the user dials density (or the individual sliders) down.
  const ov = tileMix ?? {};

  // Apply the shared density bounds, then take an extra max with 0.2:
  // below ~0.2 the random fill is too sparse for the smoothing pass to
  // form coherent cave walls and the result is mostly open floor with
  // little structure, so we floor cavern-specific density there even if
  // the global slider goes lower.
  const d = Math.max(0.2, clampDensity(density));
  // When the user moves the "Wall fill" slider, take its value as the
  // source of truth; otherwise map density 1.0 → 0.45 (classic value)
  // exactly like the legacy generator. Always clamp to the safe band so
  // smoothing keeps producing coherent caverns.
  const fillRatio = ov.wall !== undefined
    ? Math.max(0.3, Math.min(0.6, ov.wall))
    : Math.max(0.3, Math.min(0.6, 0.45 + (d - 1) * 0.05));

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      grid[y][x] = rng.next() < fillRatio ? 'wall' : 'floor';
    }
  }

  // 4 smoothing passes: a cell becomes wall if it has ≥5 wall neighbors,
  // becomes floor if it has ≤3. This is the standard Conway-style rule
  // used in roguelike cavern generation.
  for (let pass = 0; pass < 4; pass++) {
    const next: TypeGrid = grid.map(row => row.slice());
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const n = wallNeighbors(grid, x, y);
        if (n >= 5) next[y][x] = 'wall';
        else if (n <= 3) next[y][x] = 'floor';
      }
    }
    for (let y = 0; y < height; y++) grid[y] = next[y];
  }

  // Find the largest connected floor region and erase the rest so there
  // are no orphaned pockets the player can never reach.
  const bestRegion = largestRegion(grid, t => t === 'floor');

  // Rebuild the grid: every cell becomes empty unless it's part of the
  // chosen region. Then outline walls so the cavern reads correctly.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) grid[y][x] = 'empty';
  }
  for (const c of bestRegion) grid[c.y][c.x] = 'floor';
  outlineWalls(grid);

  // Place the start at the first cell of the largest region and the
  // stairs-down at the farthest reachable floor. If the region is too
  // small to host both, just drop the start.
  const placeStairsFlag = ov.stairsDown !== undefined ? ov.stairsDown >= 0.5 : flavor.placeStairsDown;
  const pois: PoiPlacement[] = [];
  if (bestRegion.length === 0) {
    // Degenerate cave (the smoothing wiped everything) — return an
    // empty map so the caller still has a valid grid + notes shape.
    const tilesEmpty: Tile[][] = typeGridToTiles(grid);
    return { tiles: tilesEmpty, notes: [], width, height };
  }
  const start = bestRegion[0];
  setCell(grid, start.x, start.y, 'start');
  pois.push({ x: start.x, y: start.y, type: 'start' });
  if (placeStairsFlag) {
    const stairs = placeStairs(grid, start.x, start.y, {
      // Cavern allows BFS to traverse pools so stairs can land deep
      // inside a water-filled chamber when that's the farthest point.
      passable: t => t === 'floor' || t === 'start' || t === 'water',
    });
    if (stairs.down) pois.push({ x: stairs.down.x, y: stairs.down.y, type: 'stairs-down' });
    if (stairs.up) pois.push({ x: stairs.up.x, y: stairs.up.y, type: 'stairs-up' });
  }

  // Carve water pools before chamber detection so the "Underground
  // Pool" archetype can match chambers that contain water. Pool count
  // / size scale with density × the theme's water multiplier; the user
  // can take it to 0 with the slider for a dry cave. Routed through the
  // decoration engine so all `water` writes (here + in rooms-and-
  // corridors + in open-terrain) share a single owner / contract.
  const totalFloorArea = Math.max(1, bestRegion.length);
  const defaultWaterFraction = 0.025 * d * flavor.waterMultiplier;
  const waterFraction = ov.water !== undefined ? Math.max(0, ov.water) : defaultWaterFraction;
  const waterTargetCells = Math.round(totalFloorArea * waterFraction);
  // Each pool averages ~8 cells; clamp pool count so we don't try to
  // spawn dozens of micro-puddles on a small map.
  const avgPoolSize = 8;
  const waterPoolCount = Math.max(0, Math.min(12, Math.round(waterTargetCells / avgPoolSize)));
  if (waterPoolCount > 0) {
    const seedFloors = collectCells(grid, 'floor');
    if (seedFloors.length > 0) {
      applyDecorations(grid, rng, [{
        kind: 'pools',
        tile: 'water',
        seedCandidates: seedFloors,
        count: waterPoolCount,
        avgSize: avgPoolSize,
      }]);
    }
  }

  // Detect labeled chambers. The "areas" slider is a target count: we
  // first detect every interior pocket that satisfies the radius +
  // area thresholds, then keep the N largest. The default at density 1
  // is "as many as we can find" (capped), so default density gives a
  // properly-named cave system.
  const isOpenForArea = (t: TileType) =>
    t === 'floor' || t === 'water' || t === 'start' || t === 'stairs-down' ||
    t === 'treasure' || t === 'trap' || t === 'pillar';
  const detected = detectAreas(grid, isOpenForArea, 2, 8);
  const defaultAreaCount = Math.max(0, Math.round(3 * d));
  const areaCountTarget = ov.areas !== undefined
    ? Math.max(0, Math.round(ov.areas))
    : defaultAreaCount;
  const sortedAreas: DetectedArea[] = [...detected].sort((a, b) => b.area - a.area);
  const keptAreas: DetectedArea[] = areaCountTarget > 0
    ? sortedAreas.slice(0, Math.min(areaCountTarget, sortedAreas.length))
    : [];
  const palette = getCavernAreaPalette(themeId);
  const areaKinds = keptAreas.length > 0 ? assignAreaKinds(keptAreas, palette, grid, rng) : [];

  // Build a (cell key → area index) map so trap/treasure placement can
  // bias toward chambers with the matching archetype hint.
  const areaIdByCell = new Map<number, number>();
  for (let i = 0; i < keptAreas.length; i++) {
    for (const c of keptAreas[i].cells) {
      areaIdByCell.set(c.y * width + c.x, i);
    }
  }

  // Treasure caches: when the slider isn't touched, scale a default
  // count by density × theme treasure multiplier × floor area. Old
  // behavior at slider==0 reproduces the empty cavern.
  const defaultTreasureFloat = (totalFloorArea / 220) * d * flavor.treasureMultiplier;
  const treasureCount = ov.treasure !== undefined
    ? Math.max(0, Math.round(ov.treasure))
    : Math.max(1, Math.round(defaultTreasureFloat));

  // Traps: fraction of floor cells. Default ≈ 1.5% × density × theme
  // multiplier, capped so even small caves see at least one trap when
  // the slider isn't 0.
  const defaultTrapFraction = 0.015 * d * flavor.trapMultiplier;
  const trapFraction = ov.trap !== undefined ? Math.max(0, ov.trap) : defaultTrapFraction;
  const trapCount = Math.round(totalFloorArea * trapFraction);

  // Place treasure first, then traps, drawing from the live pool of
  // floor cells so a single tile never gets stamped twice. Bias both
  // toward chambers with matching archetype bias (Reliquary / Bone Pit
  // / etc.) when chamber labels are on; uniform random otherwise.
  const floors = collectCells(grid, 'floor');
  const placePois = (
    count: number,
    type: 'treasure' | 'trap'
  ) => {
    for (let i = 0; i < count && floors.length > 0; i++) {
      const picked = areaIdByCell.size > 0
        ? pickBiasedFloor(floors, areaIdByCell, areaKinds, type, width, rng)
        : (() => {
            const idx = rng.int(0, floors.length - 1);
            return { idx, cell: floors[idx] };
          })();
      floors.splice(picked.idx, 1);
      setCell(grid, picked.cell.x, picked.cell.y, type);
      pois.push({ x: picked.cell.x, y: picked.cell.y, type });
    }
  };
  placePois(Math.min(treasureCount, floors.length), 'treasure');
  placePois(Math.min(trapCount, floors.length), 'trap');

  const tiles: Tile[][] = typeGridToTiles(grid);

  // Hand the placed POIs and the labeled chambers to the POI / Notes
  // engine, which is the single source of truth for `MapNote` creation
  // and tile `noteId` stamping. It builds POI notes (with duplicate-
  // label suffixing and the room-vs-poi `kind` decision against the
  // labeled chambers), then appends one room-kind note per detected
  // chamber anchored on the centroid (or the closest unannotated cell
  // to the area's fractional geometric center when the centroid is
  // taken). Cavern leaves `validAnchorTypes` undefined so any
  // unannotated cell in the chamber's open footprint can host the note
  // — matching the legacy behavior where a chamber note may sit on a
  // water/treasure tile.
  const regions: LabeledRegion[] = keptAreas.flatMap((area, i) => {
    const kind = areaKinds[i];
    if (!kind) return [];
    return [{
      label: kind.label,
      preferredAnchor: { x: area.centroid.x, y: area.centroid.y },
      cells: area.cells,
    }];
  });
  const notes = applyPoiNotes(tiles, {
    pois,
    themeId,
    generatorId: 'cavern',
    regions,
  });

  return { tiles, notes, width, height };
}
