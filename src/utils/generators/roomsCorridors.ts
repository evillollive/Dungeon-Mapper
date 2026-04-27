import type { Tile } from '../../types/map';
import {
  clampDensity,
  collectCells,
  getCell,
  makeTypeGrid,
  outlineWalls,
  setCell,
  type TypeGrid,
  typeGridToTiles,
} from './common';
import {
  getCorridorStrategy,
  type CorridorBridge,
} from './corridorEngine';
import { applyDoors } from './doorEngine';
import { applyDecorations, type Decoration } from './decorationEngine';
import { getRoomsCorridorsFlavor } from './poi';
import { applyPoiNotes, type LabeledRegion, type PoiPlacement } from './poiNotesEngine';
import { getRoomPalette, type RoomKind } from './roomKinds';
import { makeRng, type Rng } from './random';
import { placeStairs } from './stairsEngine';
import { DEFAULT_SECRET_DOOR_FRACTION } from './tileMix';
import type { GenerateContext, GeneratedMap } from './types';

/** Tile types eligible to host a room-kind note in rooms-and-corridors.
 *  Matches the legacy `appendRoomKindNotes` predicate (`type === 'floor'`)
 *  so room notes never land on a water/pillar/POI cell. */
const ROOMS_CORRIDORS_ANCHOR_TYPES: ReadonlySet<Tile['type']> = new Set(['floor']);

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Resolved archetype for this room (e.g. "Bridge"). May be `undefined` when
   *  the active theme has no room palette or labeling is disabled. */
  kind?: RoomKind;
}

/**
 * Clamp the optional `roomSize` tile-mix multiplier to a sane range
 * and default missing / non-finite values to `1` (legacy behavior).
 * The slider in the dialog is bounded to 0.5..1.5; we clamp to the
 * same range here so direct API callers can't push past it.
 */
function clampRoomSize(v: number | undefined): number {
  if (v == null || !Number.isFinite(v)) return 1;
  return Math.max(0.5, Math.min(1.5, v));
}

function rectsOverlap(a: Room, b: Room, pad = 1): boolean {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

function roomCenter(r: Room): { x: number; y: number } {
  return { x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) };
}

function roomArea(r: Room): number {
  return r.w * r.h;
}

function carveRoom(grid: TypeGrid, r: Room): void {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) setCell(grid, x, y, 'floor');
  }
}

// Corridor planning (room-pair topology + L/Z carving) lives in
// `corridorEngine.ts`. Generators select a strategy via
// `GenerateContext.corridorStrategy`; the default `'straight-l'`
// reproduces the legacy in-line code byte-for-byte, including RNG
// consumption order, so existing seeds keep producing identical maps.

// Door, secret-door, and narrow-entrance handling lives in `doorEngine.ts`
// and is invoked once at the very end of `generateRoomsCorridors`. Keeping
// it out of this file ensures later passes (water, pillars, treasure /
// trap, stairs) cannot re-introduce invalid doors after normalization has
// already run, which was the root cause of the persistent "door into a
// wall" / "secret door into nothing" bugs.

/** Sample a room kind by weight from the palette. */
function pickKind(palette: readonly RoomKind[], rng: Rng, predicate?: (k: RoomKind) => boolean): RoomKind {
  const candidates = predicate ? palette.filter(predicate) : palette.slice();
  const pool = candidates.length > 0 ? candidates : palette.slice();
  const total = pool.reduce((acc, k) => acc + (k.weight ?? 1), 0);
  let r = rng.next() * total;
  for (const k of pool) {
    r -= k.weight ?? 1;
    if (r <= 0) return k;
  }
  return pool[pool.length - 1];
}

/**
 * Assign a `RoomKind` to each carved room from the active theme's palette.
 * The largest carved room gets a `size: 'large'` archetype (Great Hall,
 * Bridge, Lobby…) when one is available — that single slot reads as the
 * central / hero space. The remaining rooms are sampled by weight from
 * the rest of the palette.
 */
function assignRoomKinds(rooms: Room[], palette: readonly RoomKind[], rng: Rng): void {
  if (rooms.length === 0 || palette.length === 0) return;
  const sortedByArea = rooms
    .map((r, i) => ({ i, area: roomArea(r) }))
    .sort((a, b) => b.area - a.area);
  const largeKinds = palette.filter(k => k.size === 'large');
  const used = new Set<number>();
  if (largeKinds.length > 0 && sortedByArea.length > 0) {
    const biggest = sortedByArea[0];
    rooms[biggest.i].kind = pickKind(largeKinds, rng);
    used.add(biggest.i);
  }
  for (let n = 0; n < rooms.length; n++) {
    if (used.has(n)) continue;
    rooms[n].kind = pickKind(palette, rng, k => k.size !== 'large');
  }
}

/** Find the index of the room containing `(x, y)`, or -1 if none. */
function roomContaining(rooms: Room[], x: number, y: number): number {
  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
  }
  return -1;
}

/**
 * Pick a floor cell from the candidate list, biased by the per-room
 * treasure / trap multiplier on each containing room's archetype. Falls
 * back to a uniform pick when the active theme has no palette.
 */
function pickBiasedFloor(
  cells: { x: number; y: number }[],
  rooms: Room[],
  bias: 'treasure' | 'trap',
  rng: Rng
): { idx: number; cell: { x: number; y: number } } {
  if (cells.length === 0) throw new Error('pickBiasedFloor: empty list');
  const weights = cells.map(c => {
    const ri = roomContaining(rooms, c.x, c.y);
    if (ri < 0) return 1;
    const k = rooms[ri].kind;
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

/** 8-neighborhood offsets: cardinals first, then diagonals. */
const DIRS_8_OFFSETS: readonly [number, number][] = [
  [0, -1], [0, 1], [-1, 0], [1, 0],
  [-1, -1], [1, -1], [-1, 1], [1, 1],
];

/**
 * Room-kind labels that suggest pillars / columns. When a room has one
 * of these archetypes and is large enough (≥6×6), pillars are placed in
 * a grid pattern even if the room wouldn't otherwise qualify by size.
 */
const PILLAR_ROOM_LABELS = new Set([
  'Great Hall', 'Hall of Pillars', 'Lobby', 'Chapel', 'Library',
  'Throne Room', 'Grand Chamber', 'Hive Chamber', 'Hall of Statues',
  'Bridge', 'Cargo Bay', 'Workshop', 'Server Farm', 'Saloon',
  'Captain\u2019s Cabin', 'Conference Room',
]);

/** True when a room's archetype suggests it should contain pillars. */
function roomSuggestsPillars(kind: RoomKind | undefined): boolean {
  return !!kind && PILLAR_ROOM_LABELS.has(kind.label);
}

/** Pillar-pattern threshold: rooms below this area only receive pillars
 *  when their archetype explicitly suggests them. Keeps small chambers
 *  uncluttered. */
const MIN_PILLAR_AREA = 64;
/** Probability a room large enough for pillars but without a pillar-
 *  suggesting archetype actually receives them. Keeps map-to-map
 *  variation high so not every dungeon turns into a forest of columns. */
const PILLAR_CHANCE_NON_SUGGESTED = 0.4;

/**
 * Generate a classic dungeon: rectangular rooms connected by L-shaped
 * corridors, walled in, with a `start`, a `stairs-down` at the farthest
 * room, and a sprinkling of `treasure` and `trap` tiles.
 *
 * `density` (0..1) scales the number of attempted rooms. Optional
 * per-tile-type overrides come in via `ctx.tileMix` (see `tileMix.ts`):
 *  - `treasure` / `trap`: target fraction of floor cells.
 *  - `doors`: fraction of door-candidate cells kept (1 = all, 0 = none).
 *  - `secretDoors`: fraction of remaining doors converted to secret doors.
 *
 * When `ctx.labelRooms` is true and the theme has a room palette, every
 * carved room emits a theme-flavored `MapNote` (Bridge, Great Hall, …)
 * and POIs are biased toward storage / defensive rooms.
 */
export function generateRoomsCorridors(ctx: GenerateContext): GeneratedMap {
  const { width, height, seed, density, themeId, tileMix, labelRooms } = ctx;
  const flavor = getRoomsCorridorsFlavor(themeId);
  const rng = makeRng(seed);
  const grid = makeTypeGrid(width, height, 'empty');

  // Slider-driven overrides come in via `ctx.tileMix`; when a key is
  // absent we use the legacy formulas so unchanged sliders + no room
  // labels reproduce the previous output exactly. The dialog only
  // populates keys the user actually moved.
  const ov = tileMix ?? {};

  // Room sizing — keep rooms small enough to leave space for corridors and
  // walls on a typical 32x32 map, but allow the upper bound to grow on
  // bigger maps. The optional `roomSize` tile-mix slider scales both
  // bounds (default 1×) so users can dial rooms from cell-tight to
  // sprawling halls without touching density (which controls *count*).
  const roomSizeMul = clampRoomSize(ov.roomSize);
  const minSide = Math.max(3, Math.round(3 * roomSizeMul));
  const baseMaxSide = Math.max(5, Math.min(8, Math.floor(Math.min(width, height) / 4)));
  const maxSide = Math.max(minSide + 2, Math.round(baseMaxSide * roomSizeMul));
  // Number of attempts scales with map area and density (clamped).
  const d = clampDensity(density);
  const targetRooms = Math.max(3, Math.round((width * height) / 60 * d));
  const maxAttempts = targetRooms * 6;

  const rooms: Room[] = [];
  for (let i = 0; i < maxAttempts && rooms.length < targetRooms; i++) {
    const w = rng.int(minSide, maxSide);
    const h = rng.int(minSide, maxSide);
    // Leave a 1-cell margin so wall outlining stays inside the map.
    const x = rng.int(1, Math.max(1, width - w - 2));
    const y = rng.int(1, Math.max(1, height - h - 2));
    const candidate: Room = { x, y, w, h };
    if (rooms.some(r => rectsOverlap(r, candidate))) continue;
    rooms.push(candidate);
  }

  if (rooms.length === 0) {
    // Fallback: carve one room in the middle so we always return something
    // playable rather than a blank canvas.
    const w = Math.min(maxSide, Math.max(minSide, width - 2));
    const h = Math.min(maxSide, Math.max(minSide, height - 2));
    rooms.push({
      x: Math.max(1, Math.floor((width - w) / 2)),
      y: Math.max(1, Math.floor((height - h) / 2)),
      w,
      h,
    });
  }

  for (const r of rooms) carveRoom(grid, r);

  // Connect rooms by delegating to the configured corridor strategy.
  // The default `'straight-l'` strategy reproduces the legacy in-line
  // behavior byte-for-byte (consecutive room pairs + L-bends, picking
  // the bend that crosses the fewest unrelated rooms, randomly tie-
  // breaking) so existing seeds keep producing identical maps. Other
  // strategies (MST, loops, winding) change the topology and/or
  // corridor shape but still emit valid single-cell perimeter bridges
  // the door engine can reason about.
  //
  // The wall cell between each room and its corridor (a strategy
  // bridge) is carved as `floor` here so `outlineWalls` doesn't seal
  // the room off from the corridor. The door engine (invoked at the
  // end) walks every room's perimeter, identifies these openings, and
  // decides where (if anywhere) actual door tiles should go.
  const strategy = getCorridorStrategy(ctx.corridorStrategy);
  const corridorPlan = strategy.plan({ rooms, grid, width, height, rng });
  const corridorBridges: CorridorBridge[] = corridorPlan.bridges;

  outlineWalls(grid);
  // Bridge each room to its adjacent corridor with a single floor cell
  // through what is now wall. The door engine (called last) will decide
  // whether each bridge becomes a door tile, stays open, or gets sealed
  // back to wall based on the actual surrounding geometry.
  for (const d of corridorBridges) {
    if (getCell(grid, d.x, d.y) === 'wall') setCell(grid, d.x, d.y, 'floor');
  }

  // Resolve the per-room archetype before placing POIs so the bias loop
  // can consult it. Skipped when the theme has no palette or labeling is
  // disabled by the caller.
  const palette = labelRooms ? getRoomPalette(themeId) : undefined;
  const hasPalette = !!(palette && palette.length > 0);
  if (hasPalette) {
    assignRoomKinds(rooms, palette!, rng);
  }

  // Pick the start in the first room and `stairs-down` at the farthest
  // reachable floor cell so the player has a visible objective.
  const start = roomCenter(rooms[0]);
  setCell(grid, start.x, start.y, 'start');
  // Track POI tiles so the POI / Notes engine (called after the door
  // engine) can attach auto-named MapNote entries below. The start gets
  // a note even though there's only ever one, since it gives the player
  // a clearly-labeled target on first load.
  const pois: PoiPlacement[] = [
    { x: start.x, y: start.y, type: 'start' },
  ];

  if (flavor.placeStairsDown) {
    // Doors haven't been placed yet (the door engine runs at the very end
    // of this function). Corridors are still pure `floor`, so a plain
    // floor-only BFS reaches every connected room — there's nothing for
    // door tiles to gate at this point in the pipeline.
    const stairs = placeStairs(grid, start.x, start.y);
    if (stairs.down) pois.push({ x: stairs.down.x, y: stairs.down.y, type: 'stairs-down' });
    if (stairs.up) pois.push({ x: stairs.up.x, y: stairs.up.y, type: 'stairs-up' });
  }

  // Hand decoration writes (water features in big maps + pillar
  // patterns in eligible rooms) to the decoration engine, which is the
  // single source of truth for `water` / `pillar` tile placement. The
  // RNG-consumption order matches the legacy in-line code so existing
  // seeds reproduce identically: water-count is sampled first (and
  // only when there's at least one eligible room, matching the early
  // return in `placeWaterFeatures`), the engine's `centered` strategy
  // then shuffles the eligible list and stamps; pillars follow with
  // the `grid` strategy whose `eligible` closure consumes the same
  // per-room `rng.chance(PILLAR_CHANCE_NON_SUGGESTED)` rolls.
  const decorations: Decoration[] = [];
  if (width > 32 || height > 32) {
    const eligibleWater = rooms.filter(r => r.w >= 5 && r.h >= 5);
    if (eligibleWater.length > 0) {
      const waterCount = rng.int(1, 5);
      decorations.push({
        kind: 'centered',
        tile: 'water',
        rooms: eligibleWater,
        count: waterCount,
        probeOffsets: DIRS_8_OFFSETS,
      });
    }
  }
  // Precompute the pillar-suggesting flag per room so the decoration
  // engine's `eligible` callback can read it via reference lookup
  // without depending on the generator's `Room.kind` shape leaking into
  // the engine's API.
  const pillarSuggested = new Map<typeof rooms[number], boolean>();
  for (const r of rooms) pillarSuggested.set(r, roomSuggestsPillars(r.kind));
  decorations.push({
    kind: 'grid',
    tile: 'pillar',
    rooms,
    eligible: r => {
      if (r.w < 6 || r.h < 6) return false;
      const suggested = pillarSuggested.get(r as Room) ?? false;
      if (suggested) return true;
      if (roomArea(r as Room) < MIN_PILLAR_AREA) return false;
      return rng.chance(PILLAR_CHANCE_NON_SUGGESTED);
    },
    inset: 2,
    step: 3,
  });
  applyDecorations(grid, rng, decorations);

  // Drop POIs on remaining floor cells. The slider values are fractions of
  // floor cells; clamp to whatever's actually reachable so we never exceed
  // the available space. Per-room archetype bias (`pickBiasedFloor`)
  // steers caches toward storage rooms and traps toward defensive ones
  // when the theme has a palette; without one, placement stays uniform.
  const floors = collectCells(grid, 'floor');
  const totalFloor = floors.length;
  // Treasure / trap counts: when the user has touched the slider we treat
  // its value as a fraction of floor cells; otherwise fall back to the
  // legacy "rooms-relative" formula × the theme's flavor multiplier so
  // existing seeds reproduce identically.
  const treasureCount = ov.treasure !== undefined
    ? Math.min(totalFloor, Math.round(totalFloor * Math.max(0, ov.treasure)))
    : Math.min(
        totalFloor,
        Math.max(0, Math.round(Math.max(1, Math.round(rooms.length / 3)) * flavor.treasureMultiplier))
      );
  const trapCount = ov.trap !== undefined
    ? Math.min(
        Math.max(0, totalFloor - treasureCount),
        Math.round(totalFloor * Math.max(0, ov.trap))
      )
    : Math.min(
        Math.max(0, totalFloor - treasureCount),
        Math.max(0, Math.round(Math.max(0, Math.round(rooms.length / 4)) * flavor.trapMultiplier))
      );

  for (let i = 0; i < treasureCount && floors.length > 0; i++) {
    let cell: { x: number; y: number };
    if (hasPalette) {
      const picked = pickBiasedFloor(floors, rooms, 'treasure', rng);
      cell = picked.cell;
      floors.splice(picked.idx, 1);
    } else {
      const idx = rng.int(0, floors.length - 1);
      cell = floors.splice(idx, 1)[0];
    }
    setCell(grid, cell.x, cell.y, 'treasure');
    pois.push({ x: cell.x, y: cell.y, type: 'treasure' });
  }
  for (let i = 0; i < trapCount && floors.length > 0; i++) {
    let cell: { x: number; y: number };
    if (hasPalette) {
      const picked = pickBiasedFloor(floors, rooms, 'trap', rng);
      cell = picked.cell;
      floors.splice(picked.idx, 1);
    } else {
      const idx = rng.int(0, floors.length - 1);
      cell = floors.splice(idx, 1)[0];
    }
    setCell(grid, cell.x, cell.y, 'trap');
    pois.push({ x: cell.x, y: cell.y, type: 'trap' });
  }

  // Final pass: hand the fully-populated grid to the door engine, which
  // is the single source of truth for door / secret-door placement. By
  // running here — after every other tile-stamping pass (water, pillars,
  // stairs, treasure, traps) — the engine can validate doors against the
  // tiles that will actually exist on the rendered map and never produce
  // a door pointing into wall or into an obstacle. The "Doors" and
  // "Secret Doors" tile-mix sliders are forwarded so user preferences
  // still apply, but the engine guarantees connectivity is preserved
  // regardless of slider values.
  applyDoors(grid, rooms, rng, {
    doorKeepFraction: ov.doors,
    secretDoorFraction: ov.secretDoors ?? DEFAULT_SECRET_DOOR_FRACTION,
    startRoomIndex: 0,
  });

  const tiles: Tile[][] = typeGridToTiles(grid);

  // Hand the placed POIs and (optionally) the labeled rooms to the POI
  // / Notes engine, which is the single source of truth for `MapNote`
  // creation and tile `noteId` stamping. It builds POI notes (with
  // duplicate-label suffixing and the room-vs-poi `kind` decision),
  // appends one room-kind note per labeled carved room (anchored on
  // the room's center or — when occupied — the closest unannotated
  // floor cell to the fractional geometric center), and renumbers
  // everything in reading order. Rooms-and-corridors restricts room-
  // note anchors to `floor` tiles via `validAnchorTypes` so notes
  // never land on water/pillar features carved earlier.
  const regions: LabeledRegion[] = hasPalette
    ? rooms.flatMap(r => {
        if (!r.kind) return [];
        const cells: { x: number; y: number }[] = [];
        for (let y = r.y; y < r.y + r.h; y++) {
          for (let x = r.x; x < r.x + r.w; x++) cells.push({ x, y });
        }
        return [{
          label: r.kind.label,
          preferredAnchor: roomCenter(r),
          cells,
          validAnchorTypes: ROOMS_CORRIDORS_ANCHOR_TYPES,
        }];
      })
    : [];
  const notes = applyPoiNotes(tiles, { pois, themeId, regions });

  return { tiles, notes, width, height };
}
