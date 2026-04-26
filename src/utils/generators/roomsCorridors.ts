import type { MapNote, Tile, TileType } from '../../types/map';
import {
  bfsDistances,
  clampDensity,
  collectCells,
  DIRS_4,
  getCell,
  makeTypeGrid,
  outlineWalls,
  reorderNotesReadingOrder,
  setCell,
  type TypeGrid,
  typeGridToTiles,
} from './common';
import { getRoomsCorridorsFlavor, poiLabelFor, poiLabelIsRoom } from './poi';
import { getRoomPalette, type RoomKind } from './roomKinds';
import { makeRng, type Rng } from './random';
import { DEFAULT_SECRET_DOOR_FRACTION } from './tileMix';
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

type DoorType = 'door-h' | 'door-v';

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

/**
 * Enumerate the cells of an L-shaped corridor between (ax, ay) and (bx, by).
 * `horizontalFirst` controls which leg comes first.
 */
function corridorCells(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  horizontalFirst: boolean
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  if (horizontalFirst) {
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) out.push({ x, y: ay });
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) out.push({ x: bx, y });
  } else {
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) out.push({ x: ax, y });
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) out.push({ x, y: by });
  }
  return out;
}

/**
 * Count how many cells of a corridor path land inside the *interior* of any
 * room not in `skip`. Used to prefer L-bends that don't slice through
 * unrelated rooms (which is what produced the open, half-walled rooms in
 * the previous algorithm).
 */
function countRoomCrossings(
  cells: { x: number; y: number }[],
  rooms: Room[],
  skip: Set<number>
): number {
  let n = 0;
  for (const c of cells) {
    for (let i = 0; i < rooms.length; i++) {
      if (skip.has(i)) continue;
      const r = rooms[i];
      if (c.x >= r.x && c.x < r.x + r.w && c.y >= r.y && c.y < r.y + r.h) {
        n++;
        break;
      }
    }
  }
  return n;
}

/**
 * Pick a single doorway on `room` facing `target`. Returns:
 *  - `door`: the wall cell on `room`'s perimeter that should become a door
 *    tile (lies between the room's interior and the corridor).
 *  - `exit`: the floor cell one step further out, where the corridor
 *    actually starts. Carving from `exit` (rather than the room center) is
 *    what keeps the room's four walls intact.
 *
 * The side is chosen by the dominant axis between room centers, with the
 * other three sides as fallbacks if the preferred exit would fall outside
 * the map bounds.
 */
function pickExit(
  room: Room,
  target: Room,
  rng: Rng,
  width: number,
  height: number
): {
  exit: { x: number; y: number };
  door: { x: number; y: number; type: DoorType };
} {
  const tc = roomCenter(target);
  const rc = roomCenter(room);
  const dx = tc.x - rc.x;
  const dy = tc.y - rc.y;
  type Side = 'e' | 'w' | 's' | 'n';
  const order: Side[] = Math.abs(dx) >= Math.abs(dy)
    ? [dx >= 0 ? 'e' : 'w', dy >= 0 ? 's' : 'n', dx >= 0 ? 'w' : 'e', dy >= 0 ? 'n' : 's']
    : [dy >= 0 ? 's' : 'n', dx >= 0 ? 'e' : 'w', dy >= 0 ? 'n' : 's', dx >= 0 ? 'w' : 'e'];

  for (const side of order) {
    let doorX: number, doorY: number, exitX: number, exitY: number;
    let type: DoorType;
    if (side === 'e' || side === 'w') {
      // Door sits on the east or west wall; traversal is east-west → door-v.
      doorX = side === 'e' ? room.x + room.w : room.x - 1;
      exitX = side === 'e' ? doorX + 1 : doorX - 1;
      const ey = rng.int(room.y, room.y + room.h - 1);
      doorY = ey;
      exitY = ey;
      type = 'door-v';
    } else {
      // Door on the north or south wall; traversal is north-south → door-h.
      doorY = side === 's' ? room.y + room.h : room.y - 1;
      exitY = side === 's' ? doorY + 1 : doorY - 1;
      const ex = rng.int(room.x, room.x + room.w - 1);
      doorX = ex;
      exitX = ex;
      type = 'door-h';
    }
    if (exitX >= 1 && exitX < width - 1 && exitY >= 1 && exitY < height - 1) {
      return { exit: { x: exitX, y: exitY }, door: { x: doorX, y: doorY, type } };
    }
  }

  // Fallback (only triggers for rooms wedged against the map border): aim
  // straight at the room center so connectivity is at least preserved.
  const c = roomCenter(room);
  return { exit: c, door: { x: c.x, y: c.y, type: 'door-v' } };
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
  const updates: { x: number; y: number; type: DoorType }[] = [];
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

  // When a corridor runs parallel to a wall, every cell in the shared wall
  // matches the geometric pattern, producing an ugly "wall of doors". To
  // fix this we group candidates into contiguous runs along the wall
  // direction (same row for door-h, same column for door-v) and keep only
  // the middle candidate from each run.
  const kept = reduceConsecutiveDoors(updates);
  for (const u of kept) grid[u.y][u.x] = u.type;
}

/**
 * Group a list of door candidates into contiguous runs along the wall
 * direction and return only the middle candidate from each run.
 *
 * door-h candidates run along a row  (same y, consecutive x).
 * door-v candidates run along a column (same x, consecutive y).
 */
function reduceConsecutiveDoors(
  candidates: { x: number; y: number; type: DoorType }[],
): { x: number; y: number; type: DoorType }[] {
  // Build a fast lookup set so we can walk neighbours.
  const key = (x: number, y: number, t: string) => `${x},${y},${t}`;
  const remaining = new Set(candidates.map(c => key(c.x, c.y, c.type)));
  const index = new Map<string, { x: number; y: number; type: DoorType }>();
  for (const c of candidates) index.set(key(c.x, c.y, c.type), c);

  const result: { x: number; y: number; type: DoorType }[] = [];

  for (const c of candidates) {
    const k = key(c.x, c.y, c.type);
    if (!remaining.has(k)) continue;

    // Collect the full contiguous run starting from this candidate.
    const run: { x: number; y: number; type: DoorType }[] = [c];
    remaining.delete(k);

    // Step delta along the wall: row for door-h, column for door-v.
    const dx = c.type === 'door-h' ? 1 : 0;
    const dy = c.type === 'door-v' ? 1 : 0;

    // Walk forward.
    for (let nx = c.x + dx, ny = c.y + dy; ; nx += dx, ny += dy) {
      const nk = key(nx, ny, c.type);
      if (!remaining.has(nk)) break;
      run.push(index.get(nk)!);
      remaining.delete(nk);
    }
    // Walk backward.
    for (let nx = c.x - dx, ny = c.y - dy; ; nx -= dx, ny -= dy) {
      const nk = key(nx, ny, c.type);
      if (!remaining.has(nk)) break;
      run.unshift(index.get(nk)!);
      remaining.delete(nk);
    }

    // Keep only the middle element of the run.
    result.push(run[Math.floor(run.length / 2)]);
  }
  return result;
}

/**
 * Walk each carved room's 4 perimeter sides and seal any multi-cell
 * opening down to a single doorway. Wide openings appear when an
 * L-shaped corridor crosses (or skims) a room: after `outlineWalls`,
 * a contiguous run of perimeter cells is left as floor instead of wall,
 * which reads as a missing wall section rather than a proper entrance.
 *
 * For each contiguous run of floor/door cells along a side we keep one
 * cell — preferring an existing door so the explicit per-room exits
 * survive — and convert it to the side-appropriate door tile, then turn
 * the rest of the run into wall. Connectivity is preserved because each
 * separate opening keeps one passable cell. Doors on the perpendicular
 * sides (where the corridor enters / exits) are likewise reduced to one
 * each, so the room ends up reachable only through doors.
 *
 * Corridors that pass *through* a room remain functional: the corridor
 * enters and exits on different sides (or different runs on the same
 * side), and each retained door keeps a single passable cell open.
 */
function narrowRoomEntrances(grid: TypeGrid, rooms: Room[]): void {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  type SideCell = { x: number; y: number; type: DoorType };
  const inBounds = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h;
  for (const room of rooms) {
    const sides: SideCell[][] = [[], [], [], []];
    // North wall row (above the room): door-h (traversed N-S).
    for (let x = room.x; x < room.x + room.w; x++) {
      sides[0].push({ x, y: room.y - 1, type: 'door-h' });
    }
    // South wall row.
    for (let x = room.x; x < room.x + room.w; x++) {
      sides[1].push({ x, y: room.y + room.h, type: 'door-h' });
    }
    // West wall column: door-v (traversed E-W).
    for (let y = room.y; y < room.y + room.h; y++) {
      sides[2].push({ x: room.x - 1, y, type: 'door-v' });
    }
    // East wall column.
    for (let y = room.y; y < room.y + room.h; y++) {
      sides[3].push({ x: room.x + room.w, y, type: 'door-v' });
    }
    for (const side of sides) {
      const cells = side.filter(c => inBounds(c.x, c.y));
      let runStart = -1;
      const runs: { start: number; end: number }[] = [];
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        const t = grid[c.y][c.x];
        const isOpening = t === 'floor' || t === 'door-h' || t === 'door-v';
        if (isOpening) {
          if (runStart < 0) runStart = i;
        } else if (runStart >= 0) {
          runs.push({ start: runStart, end: i - 1 });
          runStart = -1;
        }
      }
      if (runStart >= 0) runs.push({ start: runStart, end: cells.length - 1 });
      for (const run of runs) {
        // Prefer to keep an already-placed door so the explicit per-room
        // exits picked by `pickExit` stay where they were.
        let keepIdx = -1;
        for (let i = run.start; i <= run.end; i++) {
          const c = cells[i];
          const t = grid[c.y][c.x];
          if (t === 'door-h' || t === 'door-v') {
            keepIdx = i;
            break;
          }
        }
        if (keepIdx < 0) {
          keepIdx = Math.floor((run.start + run.end) / 2);
        }
        for (let i = run.start; i <= run.end; i++) {
          const c = cells[i];
          if (i === keepIdx) grid[c.y][c.x] = c.type;
          else grid[c.y][c.x] = 'wall';
        }
      }
    }
  }
}

/**
 * Collapse "airlock" artifacts where two same-facing doors end up adjacent
 * along their travel direction. A person would experience that as one
 * doorway with an extra threshold, so keep the farther door and turn the
 * other cell back into open passage.
 */
function collapseBackToBackDoors(grid: TypeGrid): void {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = grid[y][x];
      if (t === 'door-v' && getCell(grid, x + 1, y) === 'door-v') {
        grid[y][x] = 'floor';
      } else if (t === 'door-h' && getCell(grid, x, y + 1) === 'door-h') {
        grid[y][x] = 'floor';
      }
    }
  }
}

function doorHasOrientedPassage(grid: TypeGrid, x: number, y: number, type: DoorType): boolean {
  if (type === 'door-h') {
    return isNonDoorPassageTile(getCell(grid, x, y - 1)) && isNonDoorPassageTile(getCell(grid, x, y + 1));
  }
  return isNonDoorPassageTile(getCell(grid, x - 1, y)) && isNonDoorPassageTile(getCell(grid, x + 1, y));
}

/**
 * Remove door glyphs that no longer bridge passable cells in their rendered
 * orientation. If the same cell is actually part of a perpendicular corridor,
 * keep the corridor as floor; otherwise restore the solid wall.
 */
function normalizeInvalidDoors(grid: TypeGrid): void {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = grid[y][x];
      if (t !== 'door-h' && t !== 'door-v') continue;
      if (doorHasOrientedPassage(grid, x, y, t)) continue;
      const hasPerpendicularPassage = t === 'door-h'
        ? isNonDoorPassageTile(getCell(grid, x - 1, y)) && isNonDoorPassageTile(getCell(grid, x + 1, y))
        : isNonDoorPassageTile(getCell(grid, x, y - 1)) && isNonDoorPassageTile(getCell(grid, x, y + 1));
      grid[y][x] = hasPerpendicularPassage ? 'floor' : 'wall';
    }
  }
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

/**
 * Convert a fraction of placed doors to hidden `secret-door` tiles.
 * Runs after door thinning so it only touches surviving doors.
 */
function isNonDoorPassageTile(t: TileType): boolean {
  return (
    t === 'floor' ||
    t === 'secret-door' ||
    t === 'start' ||
    t === 'stairs-up' ||
    t === 'stairs-down' ||
    t === 'treasure' ||
    t === 'trap'
  );
}

function adjacentRoomsForDoor(rooms: Room[], x: number, y: number): number[] {
  const out = new Set<number>();
  for (const [dx, dy] of DIRS_4) {
    const idx = roomContaining(rooms, x + dx, y + dy);
    if (idx >= 0) out.add(idx);
  }
  return [...out];
}

/**
 * Convert a fraction of doors to hidden `secret-door` tiles, but only where
 * the hidden door is the sole visible entrance to a room. This makes secret
 * doors read as entrances to concealed rooms instead of arbitrary hidden
 * panels between already-accessible spaces or into blank wall.
 */
function shuffleArray<T>(items: T[], rng: Rng): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function convertSecretDoors(grid: TypeGrid, rooms: Room[], rng: Rng, fraction: number): void {
  if (fraction <= 0) return;
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const chance = Math.max(0, Math.min(1, fraction));
  // `generateRoomsCorridors` always places the player start in rooms[0], so
  // keep that initial room visibly connected instead of making it "secret".
  const initialRoomIndex = 0;
  const doorCells: { x: number; y: number; rooms: number[]; preferred: boolean }[] = [];
  const doorCountByRoom = new Map<number, number>();

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = grid[y][x];
      if (t !== 'door-h' && t !== 'door-v') continue;
      if (!doorHasOrientedPassage(grid, x, y, t)) continue;
      const adjacentRooms = adjacentRoomsForDoor(rooms, x, y);
      if (adjacentRooms.length === 0) continue;
      if (adjacentRooms.includes(initialRoomIndex)) continue;
      doorCells.push({ x, y, rooms: adjacentRooms, preferred: false });
      for (const roomIdx of adjacentRooms) {
        doorCountByRoom.set(roomIdx, (doorCountByRoom.get(roomIdx) ?? 0) + 1);
      }
    }
  }

  for (const c of doorCells) {
    c.preferred = c.rooms.length === 1 && (doorCountByRoom.get(c.rooms[0]) ?? 0) === 1;
  }
  if (doorCells.length === 0) return;

  const target = Math.min(doorCells.length, Math.max(1, Math.round(doorCells.length * chance)));
  const selected: { x: number; y: number }[] = [];
  const addFrom = (cells: typeof doorCells) => {
    for (const c of shuffleArray(cells, rng)) {
      if (selected.length >= target) break;
      selected.push(c);
    }
  };
  addFrom(doorCells.filter(c => c.preferred));
  if (selected.length < target) addFrom(doorCells.filter(c => !c.preferred));

  for (const c of selected) {
    grid[c.y][c.x] = 'secret-door';
  }
}

/**
 * After thinning can remove neighboring doors, a secret door may no longer
 * bridge two passable cells. Restore those invalid hidden doors to walls so
 * the map never shows a secret door leading straight into solid wall.
 */
function removeInvalidSecretDoors(grid: TypeGrid): void {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x] !== 'secret-door') continue;
      const northPassable = isNonDoorPassageTile(getCell(grid, x, y - 1));
      const southPassable = isNonDoorPassageTile(getCell(grid, x, y + 1));
      const eastPassable = isNonDoorPassageTile(getCell(grid, x + 1, y));
      const westPassable = isNonDoorPassageTile(getCell(grid, x - 1, y));
      const hasVerticalPassage = northPassable && southPassable;
      const hasHorizontalPassage = eastPassable && westPassable;
      if (!hasVerticalPassage && !hasHorizontalPassage) grid[y][x] = 'wall';
    }
  }
}

/** Find a cardinal-adjacent floor cell, or undefined if none. */
function findAdjacentFloor(grid: TypeGrid, cx: number, cy: number): { x: number; y: number } | undefined {
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
    if (getCell(grid, cx + dx, cy + dy) === 'floor') {
      return { x: cx + dx, y: cy + dy };
    }
  }
  return undefined;
}

/**
 * Place water features (fountain / well / puddle) inside rooms. Picks
 * 1–5 rooms large enough (≥5×5) and puts a single water tile near
 * their center. Only called on maps larger than 32×32.
 */
function placeWaterFeatures(grid: TypeGrid, rooms: Room[], rng: Rng): void {
  const eligible = rooms.filter(r => r.w >= 5 && r.h >= 5);
  if (eligible.length === 0) return;
  const count = Math.min(eligible.length, rng.int(1, 5));
  // Shuffle and take the first `count`.
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  for (let i = 0; i < count; i++) {
    const r = eligible[i];
    const cx = Math.floor(r.x + r.w / 2);
    const cy = Math.floor(r.y + r.h / 2);
    // Find the nearest floor cell to the room center for the water tile.
    // Avoid overwriting start / stairs / other POIs.
    if (getCell(grid, cx, cy) === 'floor') {
      setCell(grid, cx, cy, 'water');
    } else {
      // Try one ring around center.
      for (const [dx, dy] of DIRS_8_OFFSETS) {
        if (getCell(grid, cx + dx, cy + dy) === 'floor') {
          setCell(grid, cx + dx, cy + dy, 'water');
          break;
        }
      }
    }
  }
}

/**
 * Place pillar tiles in a grid pattern inside rooms large enough (≥6×6).
 * Rooms whose archetype suggests pillars (Great Hall, Hall of Pillars,
 * Lobby, etc.) always get pillars. Other rooms only get pillars when
 * their area exceeds MIN_PILLAR_AREA cells, and only with
 * PILLAR_CHANCE_NON_SUGGESTED probability to keep variation between maps.
 * The grid pattern uses a 2-cell spacing inset by 1 cell from the room
 * walls.
 */
const MIN_PILLAR_AREA = 64;
const PILLAR_CHANCE_NON_SUGGESTED = 0.4;

function placePillarsInRooms(grid: TypeGrid, rooms: Room[], rng: Rng): void {
  for (const r of rooms) {
    if (r.w < 6 || r.h < 6) continue;
    const suggested = roomSuggestsPillars(r.kind);
    if (!suggested && (roomArea(r) < MIN_PILLAR_AREA || !rng.chance(PILLAR_CHANCE_NON_SUGGESTED))) continue;
    // Grid pattern: 2 cells from each wall, then every 3 cells.
    for (let y = r.y + 2; y < r.y + r.h - 2; y += 3) {
      for (let x = r.x + 2; x < r.x + r.w - 2; x += 3) {
        if (getCell(grid, x, y) === 'floor') {
          setCell(grid, x, y, 'pillar');
        }
      }
    }
  }
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

  // Connect each room to the previous one with an L-shaped corridor. To
  // keep rooms looking like real rooms (four intact walls + a door),
  // corridors are routed between *perimeter doorway* cells of each room
  // rather than between room centers — that way the carve never tears
  // through a room's interior. We also try both L-bends and pick the one
  // that crosses the fewest other rooms' interiors, so corridors mostly
  // run along the outside of rooms instead of straight through them.
  // The connectivity graph remains a path (room i ↔ room i+1), so the
  // dungeon is still fully connected.
  const doorsToPlace: { x: number; y: number; type: DoorType }[] = [];
  for (let i = 1; i < rooms.length; i++) {
    const a = pickExit(rooms[i - 1], rooms[i], rng, width, height);
    const b = pickExit(rooms[i], rooms[i - 1], rng, width, height);
    const skip = new Set([i - 1, i]);
    const opt1 = corridorCells(a.exit.x, a.exit.y, b.exit.x, b.exit.y, true);
    const opt2 = corridorCells(a.exit.x, a.exit.y, b.exit.x, b.exit.y, false);
    const c1 = countRoomCrossings(opt1, rooms, skip);
    const c2 = countRoomCrossings(opt2, rooms, skip);
    // Tie-break randomly so seeds with no crossings on either bend stay varied.
    let cells: { x: number; y: number }[];
    if (c1 < c2) cells = opt1;
    else if (c2 < c1) cells = opt2;
    else cells = rng.chance() ? opt1 : opt2;
    for (const c of cells) setCell(grid, c.x, c.y, 'floor');
    doorsToPlace.push(a.door, b.door);
  }

  outlineWalls(grid);
  // Stamp the explicit per-room doors first. Each door cell sits in a
  // freshly-outlined wall between the room's interior and the corridor
  // we just carved, so converting it to a door tile both visualizes the
  // entrance and makes the room reachable for the BFS / floodfills below.
  // `placeDoors` skips non-`wall` cells, so these stay put.
  for (const d of doorsToPlace) {
    if (getCell(grid, d.x, d.y) === 'wall') setCell(grid, d.x, d.y, d.type);
  }
  placeDoors(grid);
  // Indoor themes look best when each room is fully enclosed and only
  // reachable through doors. Walk every carved room's perimeter and
  // narrow any multi-cell wall opening (left behind by L-corridors that
  // crossed or skimmed the room) down to a single door tile. This runs
  // before `thinDoors` so the user's "Doors" slider still applies to the
  // narrowed result.
  narrowRoomEntrances(grid, rooms);
  collapseBackToBackDoors(grid);
  normalizeInvalidDoors(grid);
  // Apply the "Doors" slider: thin doors after they've been geometrically
  // placed. Defaults to keeping all of them so legacy seeds reproduce.
  if (ov.doors !== undefined) thinDoors(grid, rng, ov.doors);
  normalizeInvalidDoors(grid);
  // Apply the "Secret Doors" slider: convert a fraction of remaining doors
  // to hidden secret-door tiles so the map has discoverable passages.
  const secretDoorFraction = ov.secretDoors ?? DEFAULT_SECRET_DOOR_FRACTION;
  if (secretDoorFraction > 0) {
    convertSecretDoors(grid, rooms, rng, secretDoorFraction);
    removeInvalidSecretDoors(grid);
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
  // Track POI tiles so we can attach auto-named MapNote entries below. The
  // start gets a note even though there's only ever one, since it gives
  // the player a clearly-labeled target on first load.
  const pois: { x: number; y: number; type: 'start' | 'stairs-down' | 'stairs-up' | 'treasure' | 'trap' }[] = [
    { x: start.x, y: start.y, type: 'start' },
  ];

  if (flavor.placeStairsDown) {
    const { farthest } = bfsDistances(grid, start.x, start.y, t =>
      t === 'floor' || t === 'door-h' || t === 'door-v' || t === 'secret-door' || t === 'start'
    );
    if (farthest.d > 0 && getCell(grid, farthest.x, farthest.y) === 'floor') {
      setCell(grid, farthest.x, farthest.y, 'stairs-down');
      pois.push({ x: farthest.x, y: farthest.y, type: 'stairs-down' });
      // Place stairs-up adjacent to stairs-down so the pair reads as a
      // connected stairwell. Try all four cardinal neighbors and pick the
      // first available floor cell.
      const upCell = findAdjacentFloor(grid, farthest.x, farthest.y);
      if (upCell) {
        setCell(grid, upCell.x, upCell.y, 'stairs-up');
        pois.push({ x: upCell.x, y: upCell.y, type: 'stairs-up' });
      }
    }
  }

  // Place water features (fountains, wells, puddles) inside rooms on maps
  // larger than 32×32. No slider — automatically 1–5 based on room count.
  if (width > 32 || height > 32) {
    placeWaterFeatures(grid, rooms, rng);
  }

  // Place pillar patterns in large rooms. Rooms whose archetype suggests
  // pillars (Great Hall, Hall of Pillars, Lobby, etc.) are strongly
  // preferred, but any room ≥6×6 is eligible.
  placePillarsInRooms(grid, rooms, rng);

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
  // they're distinguishable in the notes panel. We pass the carved-room
  // list so POIs whose label happens to name a room (e.g. "Gatehouse")
  // are only tagged `kind: 'room'` when they don't sit inside another
  // already-room-tagged carved room — keeping the "no room contains
  // another room" invariant.
  const notes: MapNote[] = buildPoiNotes(tiles, pois, themeId, hasPalette ? rooms : []);

  // When room labeling is on, append one MapNote per carved room at its
  // center (or nearest floor cell if the center got overwritten by a
  // POI). Duplicate kinds within a single map are suffixed (Office 1,
  // Office 2, …). Notes are appended after POI notes so POI noteIds stay
  // stable for callers that key on them.
  if (hasPalette) {
    appendRoomKindNotes(tiles, rooms, notes);
  }

  // Re-order so the notes panel reads naturally: rooms first, then
  // non-room POIs (treasure, traps, …); each group sorted left-to-right,
  // top-to-bottom. Renumbers ids and re-suffixes grouped labels.
  const orderedNotes = reorderNotesReadingOrder(tiles, notes);

  return { tiles, notes: orderedNotes, width, height };
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
  pois: { x: number; y: number; type: 'start' | 'stairs-down' | 'stairs-up' | 'treasure' | 'trap' }[],
  themeId: string | undefined,
  labeledRooms: Room[]
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
    // A POI is tagged `kind: 'room'` only when its theme label names a
    // room AND it is not already inside a carved room that will receive
    // its own room-kind note (those rooms are passed in `labeledRooms`).
    // That guarantees the "no room nested inside another room"
    // invariant: if there's a containing room-kind note, the POI keeps
    // `kind: 'poi'` so only the room-kind owns the room designation.
    const labelIsRoom = poiLabelIsRoom(themeId, p.type);
    const insideLabeledRoom = labeledRooms.some(
      r => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h
    );
    const kind: 'room' | 'poi' = labelIsRoom && !insideLabeledRoom ? 'room' : 'poi';
    notes.push({
      id,
      x: p.x,
      y: p.y,
      label: poiLabelFor(themeId, p.type, total > 1 ? idx : undefined),
      description: '',
      kind,
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

    // Find an anchor cell: prefer the room center, fall back to the
    // closest unannotated `floor` cell to the center. Using the nearest
    // cell (rather than scanning top-left → bottom-right) keeps the
    // note close to the room's visual center so reading-order numbering
    // stays spatially coherent — otherwise a POI at the center would
    // push the room note to the top-left corner, causing it to sort
    // far from its room's actual position.
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
      // Measure distance from the room's true geometric center
      // (fractional) rather than from the integer center cell. For
      // even-sized rooms Math.floor rounds the integer center to one
      // side, so equidistant integer cells around it appear tied; the
      // fractional center breaks those ties naturally, keeping the
      // note as close to the visual middle as possible without any
      // scan-order bias (top-left, etc.).
      //
      // For odd-sized rooms the fractional and integer centers coincide,
      // so cells directly above/below/left/right of center still tie.
      // Break remaining ties by preferring the cell on the center row
      // (smallest |dy|) then center column (smallest |dx|) so the note
      // stays visually centered rather than jumping to the top edge.
      const gcx = r.x + (r.w - 1) / 2;
      const gcy = r.y + (r.h - 1) / 2;
      let bestDist = Infinity;
      let bestAbsDy = Infinity;
      let bestAbsDx = Infinity;
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          const t = tiles[y]?.[x];
          if (t && t.type === 'floor' && t.noteId === undefined) {
            const dx = x - gcx;
            const dy = y - gcy;
            const dist = dx * dx + dy * dy;
            const absDy = Math.abs(dy);
            const absDx = Math.abs(dx);
            if (
              dist < bestDist ||
              (dist === bestDist && absDy < bestAbsDy) ||
              (dist === bestDist && absDy === bestAbsDy && absDx < bestAbsDx)
            ) {
              bestDist = dist;
              bestAbsDy = absDy;
              bestAbsDx = absDx;
              ax = x;
              ay = y;
            }
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
    notes.push({ id, x: ax, y: ay, label, description: '', kind: 'room' });
    const t = tiles[ay]?.[ax];
    if (t && t.noteId === undefined) tiles[ay][ax] = { ...t, noteId: id };
  }
}
