import type { Tile, TileType } from '../../types/map';
import {
  collectCells,
  clampDensity,
  DIRS_4,
  getCell,
  makeTypeGrid,
  setCell,
  type TypeGrid,
  typeGridToTiles,
} from './common';
import { assignAreaKinds, detectAreas, getOpenAreaPalette, type DetectedArea, type NaturalAreaKind } from './naturalAreas';
import { getOpenTerrainFlavor } from './poi';
import { applyPoiNotes, type LabeledRegion, type PoiPlacement } from './poiNotesEngine';
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
  const pois: PoiPlacement[] = [];
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

  // Traps: scattered hazards on remaining floor cells. Default count
  // scales with map area × density × the theme's trap multiplier so a
  // wilderness map at default density gets a handful of pit traps /
  // briar tangles / sand pits, while flipping the slider to 0 gives a
  // hazard-free map.
  const mapArea = width * height;
  const defaultTrapCount = Math.max(
    0,
    Math.round((mapArea / 400) * d * flavor.trapMultiplier)
  );
  const trapCount = Math.min(
    floors.length,
    ov.trap !== undefined
      ? Math.max(0, Math.round(mapArea * Math.max(0, ov.trap)))
      : defaultTrapCount
  );
  const trapPois: { x: number; y: number; type: 'trap' }[] = [];
  for (let i = 0; i < trapCount && floors.length > 0; i++) {
    const idx = rng.int(0, floors.length - 1);
    const c = floors.splice(idx, 1)[0];
    setCell(grid, c.x, c.y, 'trap');
    trapPois.push({ x: c.x, y: c.y, type: 'trap' });
  }
  for (const p of trapPois) pois.push(p);

  // Detect "natural area" pockets — broad open stretches of floor
  // surrounded by obstacle / water clusters or the map edge — and
  // label them with theme-appropriate names (Clearing, Glade, Watering
  // Hole, …). Same algorithm as the cavern chambers; non-floor tiles
  // (rocks, water, pillars) and POIs all read as "interior" so a
  // labeled clearing can include a watering hole or a stash.
  const isOpenForArea = (t: TileType) =>
    t === 'floor' || t === 'water' || t === 'pillar' ||
    t === 'start' || t === 'treasure' || t === 'trap';
  const detected = detectAreas(grid, isOpenForArea, 2, 16);
  const defaultAreaCount = Math.max(0, Math.round(3 * d));
  const areaCountTarget = ov.areas !== undefined
    ? Math.max(0, Math.round(ov.areas))
    : defaultAreaCount;
  const sortedAreas: DetectedArea[] = [...detected].sort((a, b) => b.area - a.area);
  const keptAreas: DetectedArea[] = areaCountTarget > 0
    ? sortedAreas.slice(0, Math.min(areaCountTarget, sortedAreas.length))
    : [];
  const palette = getOpenAreaPalette(themeId);
  const areaKinds: (NaturalAreaKind | undefined)[] = keptAreas.length > 0
    ? assignAreaKinds(keptAreas, palette, grid, rng)
    : [];


  const tiles: Tile[][] = typeGridToTiles(grid);

  // Hand the placed POIs and the labeled natural areas to the POI /
  // Notes engine, which is the single source of truth for `MapNote`
  // creation and tile `noteId` stamping. It builds POI notes (with
  // duplicate-label suffixing and the room-vs-poi `kind` decision
  // against the labeled areas, so a POI inside a Clearing keeps
  // `kind: 'poi'` and only the Clearing note owns the room
  // designation), then appends one room-kind note per detected area
  // anchored on the centroid (or the closest unannotated cell to the
  // area's fractional geometric center when the centroid is taken).
  // Open-terrain leaves `validAnchorTypes` undefined so any unannotated
  // cell in the area's open footprint can host the note — matching the
  // legacy behavior where an area note may sit on a water/pillar tile.
  const regions: LabeledRegion[] = keptAreas.flatMap((a, i) => {
    const k = areaKinds[i];
    if (!k) return [];
    return [{
      label: k.label,
      preferredAnchor: { x: a.centroid.x, y: a.centroid.y },
      cells: a.cells,
    }];
  });
  const notes = applyPoiNotes(tiles, {
    pois,
    themeId,
    generatorId: 'open-terrain',
    regions,
  });

  return { tiles, notes, width, height };
}
