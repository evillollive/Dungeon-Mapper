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
import { applyDecorations } from './decorationEngine';
import { assignAreaKinds, detectAreas, getOpenAreaPalette, type DetectedArea, type NaturalAreaKind } from './naturalAreas';
import { getOpenTerrainFlavor } from './poi';
import { applyPoiNotes, type LabeledRegion, type PoiPlacement } from './poiNotesEngine';
import { makeRng, type Rng } from './random';
import type { GenerateContext, GeneratedMap } from './types';

/**
 * Drop a circular blob of `tile` onto the grid using a simple random walk.
 * Used to scatter rocks, water, and clearings across an otherwise open map.
 *
 * Only stamps over `floor` cells so blobs stay inside the carved playable
 * region — wall blobs (rocks / trees / dunes) won't bleed into the
 * `empty` border that `carveOpenRegion` leaves around the map edge.
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
    if (y >= 0 && y < h && x >= 0 && x < w && grid[y][x] === 'floor') {
      setCell(grid, x, y, tile);
    }
    const [dx, dy] = rng.pick(DIRS_4);
    x += dx;
    y += dy;
  }
}

/**
 * Carve an organic `floor` region into an `empty` grid, leaving an
 * irregular border of `empty` cells around the map edge so the
 * generator's output works with the dialog's "Fill empty space with
 * background tile" post-processing pass.
 *
 * The region is the intersection of two slightly-jagged bands: a
 * vertical band whose per-column top / bottom margins vary by a small
 * amount, and a horizontal band whose per-row left / right margins
 * vary similarly. Margins are smoothed with a 1-pass neighbour average
 * so the boundary reads as a wavering coastline rather than per-cell
 * noise. On very small maps the inset is reduced so the playable area
 * never collapses below ~half the map dimensions.
 */
function carveOpenRegion(grid: TypeGrid, rng: Rng, width: number, height: number): void {
  // Scale the inset to the map size — keep small maps mostly playable
  // while still leaving a visible empty border.
  const baseInset = Math.max(0, Math.min(2, Math.floor(Math.min(width, height) / 10)));
  const maxExtra = Math.max(1, Math.min(3, Math.floor(Math.min(width, height) / 8)));

  // Hard cap on total inset so the floor region keeps at least half the
  // map's footprint along each axis even on tiny maps.
  const maxTotalH = Math.max(0, Math.floor(height / 2) - 1);
  const maxTotalW = Math.max(0, Math.floor(width / 2) - 1);

  const randMargin = () => baseInset + rng.int(0, maxExtra);
  const topMargin = Array.from({ length: width }, randMargin);
  const botMargin = Array.from({ length: width }, randMargin);
  const leftMargin = Array.from({ length: height }, randMargin);
  const rightMargin = Array.from({ length: height }, randMargin);

  // Single-pass neighbour smoothing avoids 1-cell spikes in the boundary.
  const smooth = (arr: number[]) => {
    if (arr.length < 3) return;
    const out = arr.slice();
    for (let i = 1; i < arr.length - 1; i++) {
      out[i] = Math.round((arr[i - 1] + arr[i] + arr[i + 1]) / 3);
    }
    for (let i = 0; i < arr.length; i++) arr[i] = out[i];
  };
  smooth(topMargin);
  smooth(botMargin);
  smooth(leftMargin);
  smooth(rightMargin);

  // Clamp per-axis sums so the carved region never disappears.
  for (let x = 0; x < width; x++) {
    if (topMargin[x] + botMargin[x] > maxTotalH) {
      const excess = topMargin[x] + botMargin[x] - maxTotalH;
      topMargin[x] = Math.max(0, topMargin[x] - Math.ceil(excess / 2));
      botMargin[x] = Math.max(0, botMargin[x] - Math.floor(excess / 2));
    }
  }
  for (let y = 0; y < height; y++) {
    if (leftMargin[y] + rightMargin[y] > maxTotalW) {
      const excess = leftMargin[y] + rightMargin[y] - maxTotalW;
      leftMargin[y] = Math.max(0, leftMargin[y] - Math.ceil(excess / 2));
      rightMargin[y] = Math.max(0, rightMargin[y] - Math.floor(excess / 2));
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inVertical = y >= topMargin[x] && y < height - botMargin[x];
      const inHorizontal = x >= leftMargin[y] && x < width - rightMargin[y];
      if (inVertical && inHorizontal) {
        grid[y][x] = 'floor';
      }
    }
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
  const grid = makeTypeGrid(width, height, 'empty');
  carveOpenRegion(grid, rng, width, height);

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
  // so the map still feels traversable. Sprinkle standing-stones / boulders
  // across remaining floor afterwards. Both go through the decoration
  // engine so all `water` / `pillar` writes share a single owner / contract.
  // Wall-blob terrain above stays inline because it defines the map's
  // basic structure (runs first, may overwrite anything) rather than
  // decorating an existing layout.
  const waterBlobs = ov.water !== undefined
    ? Math.max(0, Math.round((area * Math.max(0, ov.water) / 8) * d))
    : Math.max(1, Math.round((area / 250) * d));
  const pillarCount = ov.pillar !== undefined
    ? Math.max(0, Math.round(area * Math.max(0, ov.pillar) * d))
    : Math.max(2, Math.round((area / 120) * d));
  applyDecorations(grid, rng, [
    {
      kind: 'blobs',
      tile: 'water',
      width,
      height,
      count: waterBlobs,
      sizeMin: 4,
      sizeMax: 12,
      // Open-terrain now carves an organic floor region inset from the
      // map edge, so blobs must respect that boundary instead of
      // overwriting empty border cells. `applyBlobs` with overwrite:false
      // only stamps over `floor`, mirroring the inline `paintBlob` change
      // above.
      overwrite: false,
    },
    {
      kind: 'scatter',
      tile: 'pillar',
      width,
      height,
      count: pillarCount,
    },
  ]);

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
