import type { MapNote, Tile } from '../../types/map';
import {
  bfsDistances,
  clampDensity,
  collectCells,
  getCell,
  makeTypeGrid,
  outlineWalls,
  setCell,
  type TypeGrid,
  typeGridToTiles,
} from './common';
import { getRoomsCorridorsFlavor, poiLabelFor } from './poi';
import { getRoomPalette, type RoomKind } from './roomKinds';
import { makeRng, type Rng } from './random';
import type { GenerateContext, GeneratedMap } from './types';

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Resolved archetype for this room (e.g. "Bridge"). May be `undefined` when
   *  the active theme has no room palette or labeling is disabled. */
  kind?: RoomKind;
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

function carveCorridor(
  grid: TypeGrid,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  horizontalFirst: boolean
): void {
  if (horizontalFirst) {
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) setCell(grid, x, ay, 'floor');
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) setCell(grid, bx, y, 'floor');
  } else {
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) setCell(grid, ax, y, 'floor');
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) setCell(grid, x, by, 'floor');
  }
}

/**
 * Place a door on cells where a 1-tile-wide corridor punches through what
 * would otherwise be a continuous wall. We classify a wall cell as a door
 * candidate when it has floor on two opposite sides (N/S → horizontal door,
 * E/W → vertical door) and walls on the other two. This produces fairly
 * pleasant doorways without an explicit "this came from a corridor" trace.
 */
function placeDoors(grid: TypeGrid): void {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const updates: { x: number; y: number; type: 'door-h' | 'door-v' }[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x] !== 'wall') continue;
      const n = getCell(grid, x, y - 1);
      const s = getCell(grid, x, y + 1);
      const e = getCell(grid, x + 1, y);
      const wTile = getCell(grid, x - 1, y);
      const horizontal = n === 'floor' && s === 'floor' && e === 'wall' && wTile === 'wall';
      const vertical = e === 'floor' && wTile === 'floor' && n === 'wall' && s === 'wall';
      // Naming follows the rest of the app: 'door-h' is rendered as a
      // horizontal bar (a door embedded in an east-west wall, traversed
      // north-south), and 'door-v' as a vertical bar (door in a north-south
      // wall, traversed east-west).
      if (horizontal) updates.push({ x, y, type: 'door-h' });
      else if (vertical) updates.push({ x, y, type: 'door-v' });
    }
  }
  for (const u of updates) grid[u.y][u.x] = u.type;
}

/**
 * Randomly demote a fraction of the placed doors back to walls. Driven by
 * the "Doors" tile-mix slider — `keepFraction = 1` (default) preserves
 * legacy behavior, `0` removes every door, intermediate values thin them.
 */
function thinDoors(grid: TypeGrid, rng: Rng, keepFraction: number): void {
  if (keepFraction >= 1) return;
  const keep = Math.max(0, Math.min(1, keepFraction));
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = grid[y][x];
      if (t !== 'door-h' && t !== 'door-v') continue;
      if (rng.next() >= keep) grid[y][x] = 'wall';
    }
  }
}

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

/**
 * Generate a classic dungeon: rectangular rooms connected by L-shaped
 * corridors, walled in, with a `start`, a `stairs-down` at the farthest
 * room, and a sprinkling of `treasure` and `trap` tiles.
 *
 * `density` (0..1) scales the number of attempted rooms. Optional
 * per-tile-type overrides come in via `ctx.tileMix` (see `tileMix.ts`):
 *  - `treasure` / `trap`: target fraction of floor cells.
 *  - `doors`: fraction of door-candidate cells kept (1 = all, 0 = none).
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
  // bigger maps.
  const minSide = 3;
  const maxSide = Math.max(minSide + 2, Math.min(8, Math.floor(Math.min(width, height) / 4)));
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

  // Connect each room to the previous one with an L-shaped corridor. This
  // guarantees the dungeon is fully connected (the connectivity graph is a
  // path, so BFS from any room reaches every other room).
  for (let i = 1; i < rooms.length; i++) {
    const a = roomCenter(rooms[i - 1]);
    const b = roomCenter(rooms[i]);
    carveCorridor(grid, a.x, a.y, b.x, b.y, rng.chance());
  }

  outlineWalls(grid);
  placeDoors(grid);
  // Apply the "Doors" slider: thin doors after they've been geometrically
  // placed. Defaults to keeping all of them so legacy seeds reproduce.
  if (ov.doors !== undefined) thinDoors(grid, rng, ov.doors);

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
  // Track POI tiles so we can attach auto-named MapNote entries below. The
  // start gets a note even though there's only ever one, since it gives
  // the player a clearly-labeled target on first load.
  const pois: { x: number; y: number; type: 'start' | 'stairs-down' | 'treasure' | 'trap' }[] = [
    { x: start.x, y: start.y, type: 'start' },
  ];

  if (flavor.placeStairsDown) {
    const { farthest } = bfsDistances(grid, start.x, start.y, t =>
      t === 'floor' || t === 'door-h' || t === 'door-v' || t === 'start'
    );
    if (farthest.d > 0 && getCell(grid, farthest.x, farthest.y) === 'floor') {
      setCell(grid, farthest.x, farthest.y, 'stairs-down');
      pois.push({ x: farthest.x, y: farthest.y, type: 'stairs-down' });
    }
  }

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

  const tiles: Tile[][] = typeGridToTiles(grid);

  // Build auto-named MapNote entries for every POI placed above and link
  // them to the corresponding tile via `noteId`. POI types that occur
  // more than once get a numeric suffix (Treasure 1, Treasure 2, …) so
  // they're distinguishable in the notes panel.
  const notes: MapNote[] = buildPoiNotes(tiles, pois, themeId);

  // When room labeling is on, append one MapNote per carved room at its
  // center (or nearest floor cell if the center got overwritten by a
  // POI). Duplicate kinds within a single map are suffixed (Office 1,
  // Office 2, …). Notes are appended after POI notes so POI noteIds stay
  // stable for callers that key on them.
  if (hasPalette) {
    appendRoomKindNotes(tiles, rooms, notes);
  }

  return { tiles, notes, width, height };
}

/**
 * Convert a list of placed POI cells into auto-named `MapNote` entries
 * and stamp the matching `noteId` onto each underlying tile. Duplicate
 * POI types get a 1-based suffix in display order so the notes panel
 * lists them as "Treasure 1", "Treasure 2", etc.; types that occur
 * exactly once stay unsuffixed for readability.
 */
function buildPoiNotes(
  tiles: Tile[][],
  pois: { x: number; y: number; type: 'start' | 'stairs-down' | 'treasure' | 'trap' }[],
  themeId: string | undefined
): MapNote[] {
  const counts = new Map<string, number>();
  for (const p of pois) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
  const seen = new Map<string, number>();
  const notes: MapNote[] = [];
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
    });
    if (tiles[p.y]?.[p.x]) tiles[p.y][p.x] = { ...tiles[p.y][p.x], noteId: id };
  }
  return notes;
}

/**
 * Append one `MapNote` per carved room to label it with its archetype
 * (Bridge, Cargo Bay, …). Reuses the next available `id` after the POI
 * notes already in the list. Each note is anchored on the room center
 * if that cell isn't already a POI, otherwise on the next available
 * `floor` cell inside the room (or at the corner as a last resort) so
 * the room note doesn't clobber the POI's `noteId`.
 */
function appendRoomKindNotes(tiles: Tile[][], rooms: Room[], notes: MapNote[]): void {
  const counts = new Map<string, number>();
  for (const r of rooms) {
    if (!r.kind) continue;
    counts.set(r.kind.label, (counts.get(r.kind.label) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  let nextId = notes.reduce((m, n) => Math.max(m, n.id), 0) + 1;
  for (const r of rooms) {
    if (!r.kind) continue;
    const total = counts.get(r.kind.label) ?? 1;
    const idx = (seen.get(r.kind.label) ?? 0) + 1;
    seen.set(r.kind.label, idx);
    const label = total > 1 ? `${r.kind.label} ${idx}` : r.kind.label;

    // Find an anchor cell: prefer the room center, fall back to any
    // unannotated `floor` cell in the room.
    const center = roomCenter(r);
    let ax: number | undefined;
    let ay: number | undefined;
    if (
      tiles[center.y]?.[center.x] &&
      tiles[center.y][center.x].type === 'floor' &&
      tiles[center.y][center.x].noteId === undefined
    ) {
      ax = center.x;
      ay = center.y;
    } else {
      outer: for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          const t = tiles[y]?.[x];
          if (t && t.type === 'floor' && t.noteId === undefined) {
            ax = x;
            ay = y;
            break outer;
          }
        }
      }
    }

    if (ax === undefined || ay === undefined) {
      // No free floor cell — anchor at the unmodified center coordinates
      // anyway so the note still appears in the notes panel even if it
      // doesn't get a tile-side `noteId` link.
      ax = center.x;
      ay = center.y;
    }

    const id = nextId++;
    notes.push({ id, x: ax, y: ay, label, description: '' });
    const t = tiles[ay]?.[ax];
    if (t && t.noteId === undefined) tiles[ay][ax] = { ...t, noteId: id };
  }
}
