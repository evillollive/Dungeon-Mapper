import type { TileType } from '../../types/map';
import { DIRS_4, getCell, type TypeGrid } from './common';
import { isRectReachable, reachableMask } from './connectivity';
import type { Rng } from './random';

/**
 * Door / secret-door engine.
 *
 * `applyDoors` is the **sole** writer of `door-h`, `door-v`, and
 * `secret-door` tiles in the map pipeline. It runs as the very last
 * grid-mutation step of a generator so that any earlier passes
 * (carving, outlining, pillars, water, POIs, stairs) cannot
 * re-introduce invalid doors after the fact.
 *
 * The engine works in eight steps:
 *
 *   A. Reset – clear any stray door tiles to `floor` (defensive).
 *   B. Per-room perimeter analysis – for each room, walk the four
 *      sides one cell outside the bounding box. For each contiguous
 *      run of non-wall perimeter cells, pick the single best `floor`
 *      cell whose outward neighbor is also passable, and seal the
 *      remaining `floor` cells in the run back to `wall`. Runs that
 *      contain a POI (treasure / trap / stairs / start) are left
 *      alone – the POI keeps the room reachable on its own.
 *   C. Corridor-bottleneck candidates – wall cells with passable
 *      tiles on opposite sides and walls on the perpendicular sides,
 *      *not* adjacent to any room. Reduced to one cell per contiguous
 *      run with `reduceConsecutiveDoors` so parallel corridors don't
 *      become a "wall of doors".
 *   D. Commit with strict validation – every committed door must
 *      have passable tiles on its passage axis and walls on its
 *      perpendicular axis. Invalid candidates are dropped.
 *   E. Connectivity guarantee – BFS from the start room treating
 *      doors as passable. Any room not reached gets a remediation
 *      door, with a single perpendicular wall rewrite permitted to
 *      form a clean door frame when needed.
 *   F. Doors slider – random demotion of doors back to `wall`,
 *      verifying after each removal that no room becomes unreachable.
 *   G. Secret-door conversion – swap a fraction of doors to
 *      `secret-door`, preferring doors that are the sole entrance to
 *      a non-start room (so secret doors guard hidden rooms instead
 *      of randomly appearing between connected spaces).
 *   H. Dev-only assertion – warn in the browser console if any door
 *      tile fails the validity contract.
 */

type DoorType = 'door-h' | 'door-v';

export interface DoorEngineRoom {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ApplyDoorsOptions {
  /** Fraction of doors to keep (1 = all, 0 = none). Default 1. */
  doorKeepFraction?: number;
  /** Fraction of remaining doors to convert to secret doors. Default 0. */
  secretDoorFraction?: number;
  /** Index of the player's start room in `rooms` (default 0). */
  startRoomIndex?: number;
}

/** Tile types a door's passage-axis neighbor must be one of. */
function isDoorPassageNeighbor(t: TileType): boolean {
  return (
    t === 'floor' ||
    t === 'start' ||
    t === 'stairs-up' ||
    t === 'stairs-down' ||
    t === 'treasure' ||
    t === 'trap'
  );
}

/** Tile types passable for end-to-end connectivity (includes doors). */
function isConnectivityPassable(t: TileType): boolean {
  return (
    isDoorPassageNeighbor(t) ||
    t === 'door-h' ||
    t === 'door-v' ||
    t === 'secret-door'
  );
}

/** Strict validity contract for a placed door. */
function doorIsValid(grid: TypeGrid, x: number, y: number, type: DoorType): boolean {
  if (type === 'door-h') {
    return (
      isDoorPassageNeighbor(getCell(grid, x, y - 1)) &&
      isDoorPassageNeighbor(getCell(grid, x, y + 1)) &&
      getCell(grid, x - 1, y) === 'wall' &&
      getCell(grid, x + 1, y) === 'wall'
    );
  }
  return (
    isDoorPassageNeighbor(getCell(grid, x - 1, y)) &&
    isDoorPassageNeighbor(getCell(grid, x + 1, y)) &&
    getCell(grid, x, y - 1) === 'wall' &&
    getCell(grid, x, y + 1) === 'wall'
  );
}

/** Same contract relaxed for `secret-door`: any one passage axis is enough. */
function secretDoorIsValid(grid: TypeGrid, x: number, y: number): boolean {
  const vertical =
    isDoorPassageNeighbor(getCell(grid, x, y - 1)) &&
    isDoorPassageNeighbor(getCell(grid, x, y + 1)) &&
    getCell(grid, x - 1, y) === 'wall' &&
    getCell(grid, x + 1, y) === 'wall';
  const horizontal =
    isDoorPassageNeighbor(getCell(grid, x - 1, y)) &&
    isDoorPassageNeighbor(getCell(grid, x + 1, y)) &&
    getCell(grid, x, y - 1) === 'wall' &&
    getCell(grid, x, y + 1) === 'wall';
  return vertical || horizontal;
}

/* ------------------------------------------------------------------ */
/* Step A                                                              */
/* ------------------------------------------------------------------ */

function clearStrayDoors(grid: TypeGrid): void {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = grid[y][x];
      if (t === 'door-h' || t === 'door-v' || t === 'secret-door') {
        grid[y][x] = 'floor';
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Step B: per-room perimeter analysis                                 */
/* ------------------------------------------------------------------ */

interface SideSpec {
  doorType: DoorType;
  /** Outward direction (away from the room interior). */
  odx: number;
  ody: number;
  /** Step direction along the wall. */
  sdx: number;
  sdy: number;
}

function perimeterCells(room: DoorEngineRoom, side: 'n' | 's' | 'w' | 'e'): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  if (side === 'n') {
    const py = room.y - 1;
    for (let x = room.x; x < room.x + room.w; x++) out.push({ x, y: py });
  } else if (side === 's') {
    const py = room.y + room.h;
    for (let x = room.x; x < room.x + room.w; x++) out.push({ x, y: py });
  } else if (side === 'w') {
    const px = room.x - 1;
    for (let y = room.y; y < room.y + room.h; y++) out.push({ x: px, y });
  } else {
    const px = room.x + room.w;
    for (let y = room.y; y < room.y + room.h; y++) out.push({ x: px, y });
  }
  return out;
}

const SIDE_SPECS: Record<'n' | 's' | 'w' | 'e', SideSpec> = {
  n: { doorType: 'door-h', odx: 0, ody: -1, sdx: 1, sdy: 0 },
  s: { doorType: 'door-h', odx: 0, ody: 1, sdx: 1, sdy: 0 },
  w: { doorType: 'door-v', odx: -1, ody: 0, sdx: 0, sdy: 1 },
  e: { doorType: 'door-v', odx: 1, ody: 0, sdx: 0, sdy: 1 },
};

interface RoomCandidate {
  x: number;
  y: number;
  type: DoorType;
  roomIndex: number;
}

interface PerimeterAnalysis {
  /** Door tiles to commit, one per opening run that has a valid frame. */
  doors: RoomCandidate[];
  /** `floor` cells to seal back to `wall` (subject to connectivity guard). */
  seals: { x: number; y: number }[];
  /** Cells that are openings the room can rely on for connectivity (POIs,
   *  the chosen door cell). Used to detect "doorless" rooms in step E. */
  hasOpening: boolean;
}

function analyzeRoomPerimeter(
  grid: TypeGrid,
  room: DoorEngineRoom,
  roomIndex: number
): PerimeterAnalysis {
  const result: PerimeterAnalysis = { doors: [], seals: [], hasOpening: false };
  for (const sideName of ['n', 's', 'w', 'e'] as const) {
    const spec = SIDE_SPECS[sideName];
    const cells = perimeterCells(room, sideName);
    let runStart = -1;

    const finishRun = (end: number) => {
      // Identify whether the run contains any non-wall, non-floor tile (POI,
      // pre-existing door from an outer pass, etc.). If so, the opening is
      // already preserved by that tile and we leave the entire run alone.
      let hasNonFloorOpening = false;
      let hasFloor = false;
      for (let i = runStart; i <= end; i++) {
        const c = cells[i];
        const t = getCell(grid, c.x, c.y);
        if (t === 'floor') hasFloor = true;
        else if (t !== 'wall' && t !== 'empty') hasNonFloorOpening = true;
      }
      if (hasNonFloorOpening) {
        result.hasOpening = true;
        return;
      }
      if (!hasFloor) return;

      // Pick the best `floor` cell in the run for a door:
      //   * inside neighbor must be passable (the room interior)
      //   * outside neighbor must be passable (a corridor tile)
      //   * perpendicular-axis neighbors should be wall (clean frame)
      //   * prefer cells closer to the middle of the run
      const middle = (runStart + end) / 2;
      let bestIdx = -1;
      let bestScore = -Infinity;
      for (let i = runStart; i <= end; i++) {
        const c = cells[i];
        if (getCell(grid, c.x, c.y) !== 'floor') continue;
        const inside = getCell(grid, c.x - spec.odx, c.y - spec.ody);
        if (!isDoorPassageNeighbor(inside)) continue;
        const outside = getCell(grid, c.x + spec.odx, c.y + spec.ody);
        if (!isDoorPassageNeighbor(outside)) continue;
        const wallA = getCell(grid, c.x + spec.sdx, c.y + spec.sdy);
        const wallB = getCell(grid, c.x - spec.sdx, c.y - spec.sdy);
        let score = 100;
        if (wallA === 'wall') score += 25;
        if (wallB === 'wall') score += 25;
        score -= Math.abs(i - middle);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0) {
        const best = cells[bestIdx];
        result.doors.push({ x: best.x, y: best.y, type: spec.doorType, roomIndex });
        result.hasOpening = true;
        // Seal every other floor cell in the run.
        for (let i = runStart; i <= end; i++) {
          if (i === bestIdx) continue;
          const c = cells[i];
          if (getCell(grid, c.x, c.y) === 'floor') result.seals.push({ x: c.x, y: c.y });
        }
      } else {
        // No valid frame anywhere in the run: this is the "door into a wall"
        // case the current bug stems from. Seal the entire run; connectivity
        // step E will carve a remediation door if the room becomes
        // unreachable.
        for (let i = runStart; i <= end; i++) {
          const c = cells[i];
          if (getCell(grid, c.x, c.y) === 'floor') result.seals.push({ x: c.x, y: c.y });
        }
      }
    };

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const t = getCell(grid, c.x, c.y);
      const isOpening = t !== 'wall' && t !== 'empty';
      if (isOpening) {
        if (runStart < 0) runStart = i;
      } else if (runStart >= 0) {
        finishRun(i - 1);
        runStart = -1;
      }
    }
    if (runStart >= 0) finishRun(cells.length - 1);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Step C: corridor-bottleneck candidates                              */
/* ------------------------------------------------------------------ */

interface RawCandidate {
  x: number;
  y: number;
  type: DoorType;
}

function buildRoomMembershipGrid(
  rooms: readonly DoorEngineRoom[],
  w: number,
  h: number
): Int8Array {
  const grid = new Int8Array(w * h);
  for (const r of rooms) {
    const x0 = Math.max(0, r.x);
    const x1 = Math.min(w, r.x + r.w);
    const y0 = Math.max(0, r.y);
    const y1 = Math.min(h, r.y + r.h);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) grid[y * w + x] = 1;
    }
  }
  return grid;
}

function gatherCorridorCandidates(grid: TypeGrid, rooms: readonly DoorEngineRoom[]): RawCandidate[] {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const inRoom = buildRoomMembershipGrid(rooms, w, h);
  const candidates: RawCandidate[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x] !== 'wall') continue;
      // Skip wall cells whose 4-neighborhood intersects a room interior;
      // those belong to step B's perimeter analysis.
      let nearRoom = false;
      for (const [dx, dy] of DIRS_4) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && inRoom[ny * w + nx]) {
          nearRoom = true;
          break;
        }
      }
      if (nearRoom) continue;
      const n = getCell(grid, x, y - 1);
      const s = getCell(grid, x, y + 1);
      const e = getCell(grid, x + 1, y);
      const wTile = getCell(grid, x - 1, y);
      const horizontal =
        isDoorPassageNeighbor(n) && isDoorPassageNeighbor(s) && e === 'wall' && wTile === 'wall';
      const vertical =
        isDoorPassageNeighbor(e) && isDoorPassageNeighbor(wTile) && n === 'wall' && s === 'wall';
      if (horizontal) candidates.push({ x, y, type: 'door-h' });
      else if (vertical) candidates.push({ x, y, type: 'door-v' });
    }
  }
  return reduceConsecutiveDoors(candidates);
}

/**
 * Group door candidates into contiguous runs along the wall direction
 * and keep only the middle candidate from each run. Prevents long parallel
 * corridors from producing a continuous "wall of doors".
 */
function reduceConsecutiveDoors(candidates: RawCandidate[]): RawCandidate[] {
  const key = (x: number, y: number, t: string) => `${x},${y},${t}`;
  const remaining = new Set(candidates.map(c => key(c.x, c.y, c.type)));
  const index = new Map<string, RawCandidate>();
  for (const c of candidates) index.set(key(c.x, c.y, c.type), c);
  const result: RawCandidate[] = [];
  for (const c of candidates) {
    const k = key(c.x, c.y, c.type);
    if (!remaining.has(k)) continue;
    const run: RawCandidate[] = [c];
    remaining.delete(k);
    const dx = c.type === 'door-h' ? 1 : 0;
    const dy = c.type === 'door-v' ? 1 : 0;
    for (let nx = c.x + dx, ny = c.y + dy; ; nx += dx, ny += dy) {
      const nk = key(nx, ny, c.type);
      if (!remaining.has(nk)) break;
      run.push(index.get(nk)!);
      remaining.delete(nk);
    }
    for (let nx = c.x - dx, ny = c.y - dy; ; nx -= dx, ny -= dy) {
      const nk = key(nx, ny, c.type);
      if (!remaining.has(nk)) break;
      run.unshift(index.get(nk)!);
      remaining.delete(nk);
    }
    result.push(run[Math.floor(run.length / 2)]);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Step D + connectivity helpers                                       */
/* ------------------------------------------------------------------ */

function findStartCell(grid: TypeGrid, rooms: readonly DoorEngineRoom[], startRoomIndex: number): { x: number; y: number } | undefined {
  // Prefer the literal `start` tile if present, fall back to the start
  // room's center.
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === 'start') return { x, y };
    }
  }
  const r = rooms[startRoomIndex];
  if (!r) return undefined;
  return { x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) };
}

function bfsConnectivity(grid: TypeGrid, sx: number, sy: number): Uint8Array {
  return reachableMask(grid, sx, sy, isConnectivityPassable);
}

function roomIsReachable(visited: Uint8Array, room: DoorEngineRoom, w: number, h: number): boolean {
  return isRectReachable(visited, room, w, h);
}

/* ------------------------------------------------------------------ */
/* Step E: connectivity remediation                                    */
/* ------------------------------------------------------------------ */

/**
 * Try to connect a stranded room to the rest of the dungeon by carving
 * exactly one door (and at most one perpendicular wall rewrite to form a
 * clean frame) on its perimeter. Walks each perimeter cell looking for a
 * wall whose outward neighbor is reachable from the start.
 */
function carveRemediationDoor(
  grid: TypeGrid,
  room: DoorEngineRoom,
  reachable: Uint8Array,
  w: number,
  h: number
): boolean {
  // Score every perimeter wall cell. Best candidates are walls whose
  // outward neighbor is already reachable AND whose perpendicular axis
  // is fully wall (no rewrite needed). Fallbacks may rewrite one
  // perpendicular wall to clean up the frame.
  interface Cand {
    x: number;
    y: number;
    type: DoorType;
    needsRewrite: { x: number; y: number } | null;
    score: number;
  }
  const cands: Cand[] = [];
  for (const sideName of ['n', 's', 'w', 'e'] as const) {
    const spec = SIDE_SPECS[sideName];
    const cells = perimeterCells(room, sideName);
    for (const c of cells) {
      if (c.x < 0 || c.y < 0 || c.x >= w || c.y >= h) continue;
      if (grid[c.y][c.x] !== 'wall') continue;
      const inside = getCell(grid, c.x - spec.odx, c.y - spec.ody);
      if (!isDoorPassageNeighbor(inside)) continue;
      const outside = getCell(grid, c.x + spec.odx, c.y + spec.ody);
      if (!isDoorPassageNeighbor(outside)) continue;
      const ox = c.x + spec.odx;
      const oy = c.y + spec.ody;
      const outsideReachable = ox >= 0 && oy >= 0 && ox < w && oy < h && reachable[oy * w + ox] === 1;
      const wa1Pos = { x: c.x + spec.sdx, y: c.y + spec.sdy };
      const wa2Pos = { x: c.x - spec.sdx, y: c.y - spec.sdy };
      const wa1 = getCell(grid, wa1Pos.x, wa1Pos.y);
      const wa2 = getCell(grid, wa2Pos.x, wa2Pos.y);
      let needsRewrite: { x: number; y: number } | null = null;
      if (wa1 !== 'wall' && wa2 !== 'wall') continue; // both sides open – not a viable frame
      if (wa1 !== 'wall') needsRewrite = wa1Pos;
      else if (wa2 !== 'wall') needsRewrite = wa2Pos;
      // Only allow rewriting `floor` (don't bury POIs).
      if (needsRewrite && getCell(grid, needsRewrite.x, needsRewrite.y) !== 'floor') continue;
      let score = 0;
      if (outsideReachable) score += 1000;
      if (!needsRewrite) score += 100;
      cands.push({ x: c.x, y: c.y, type: spec.doorType, needsRewrite, score });
    }
  }
  cands.sort((a, b) => b.score - a.score);
  for (const c of cands) {
    if (c.needsRewrite) grid[c.needsRewrite.y][c.needsRewrite.x] = 'wall';
    grid[c.y][c.x] = c.type;
    return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Step B post-processing: connectivity-safe sealing                   */
/* ------------------------------------------------------------------ */

/**
 * Apply perimeter seal proposals while preserving room reachability.
 *
 * Rooms are pairwise connected (via corridors) at this point in the
 * pipeline. A seal candidate that severs that connection — for example
 * by closing a perimeter floor cell that's actually part of an L-shaped
 * corridor turning at the wall — must be reverted. We try a fast bulk
 * apply first; only if that breaks anything do we fall back to a
 * one-at-a-time loop.
 */
function applySealsSafely(
  grid: TypeGrid,
  seals: { x: number; y: number }[],
  rooms: readonly DoorEngineRoom[],
  startRoomIndex: number
): void {
  if (seals.length === 0) return;
  const w = grid[0]?.length ?? 0;
  const h = grid.length;
  const start = findStartCell(grid, rooms, startRoomIndex);
  if (!start) return;

  const allRoomsReachable = (): boolean => {
    const reachable = bfsConnectivity(grid, start.x, start.y);
    for (let i = 0; i < rooms.length; i++) {
      if (i === startRoomIndex) continue;
      if (!roomIsReachable(reachable, rooms[i], w, h)) return false;
    }
    return true;
  };

  // Snapshot original tile values so we can revert without losing data.
  const original: TileType[] = [];
  for (let i = 0; i < seals.length; i++) {
    const s = seals[i];
    original.push(getCell(grid, s.x, s.y));
    if (original[i] === 'floor') grid[s.y][s.x] = 'wall';
  }

  if (allRoomsReachable()) return; // happy path

  // Slow path: revert all seals, then try them one-by-one with a
  // connectivity check after each application.
  for (let i = 0; i < seals.length; i++) {
    if (original[i] === 'floor' && grid[seals[i].y][seals[i].x] === 'wall') {
      grid[seals[i].y][seals[i].x] = 'floor';
    }
  }

  for (const s of seals) {
    if (getCell(grid, s.x, s.y) !== 'floor') continue;
    grid[s.y][s.x] = 'wall';
    if (!allRoomsReachable()) {
      grid[s.y][s.x] = 'floor';
    }
  }
}

/* ------------------------------------------------------------------ */
/* Step F: safe slider thinning                                        */
/* ------------------------------------------------------------------ */

function shuffleArray<T>(items: T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function thinDoorsSafely(
  grid: TypeGrid,
  doorCells: { x: number; y: number; type: DoorType }[],
  rng: Rng,
  keepFraction: number,
  rooms: readonly DoorEngineRoom[],
  startRoomIndex: number
): void {
  if (keepFraction >= 1) return;
  const keep = Math.max(0, Math.min(1, keepFraction));
  const totalToRemove = Math.round(doorCells.length * (1 - keep));
  if (totalToRemove <= 0) return;
  const w = grid[0]?.length ?? 0;
  const h = grid.length;
  const start = findStartCell(grid, rooms, startRoomIndex);
  if (!start) return;
  let removed = 0;
  for (const d of shuffleArray(doorCells, rng)) {
    if (removed >= totalToRemove) break;
    const t = grid[d.y][d.x];
    if (t !== d.type) continue;
    grid[d.y][d.x] = 'wall';
    const reachable = bfsConnectivity(grid, start.x, start.y);
    let allReachable = true;
    for (let i = 0; i < rooms.length; i++) {
      if (i === startRoomIndex) continue;
      if (!roomIsReachable(reachable, rooms[i], w, h)) {
        allReachable = false;
        break;
      }
    }
    if (allReachable) {
      removed++;
    } else {
      grid[d.y][d.x] = t;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Step G: secret door conversion                                      */
/* ------------------------------------------------------------------ */

function adjacentRoomsForDoor(rooms: readonly DoorEngineRoom[], x: number, y: number): number[] {
  const out = new Set<number>();
  for (const [dx, dy] of DIRS_4) {
    const nx = x + dx;
    const ny = y + dy;
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      if (nx >= r.x && nx < r.x + r.w && ny >= r.y && ny < r.y + r.h) out.add(i);
    }
  }
  return [...out];
}

function convertSecretDoors(
  grid: TypeGrid,
  rooms: readonly DoorEngineRoom[],
  rng: Rng,
  fraction: number,
  startRoomIndex: number
): void {
  if (!Number.isFinite(fraction) || fraction <= 0) return;
  const clampedFraction = Math.min(1, fraction);
  const h = grid.length;
  const w = grid[0]?.length ?? 0;

  type Cell = { x: number; y: number; rooms: number[]; preferred: boolean };
  const doors: Cell[] = [];
  const doorCountByRoom = new Map<number, number>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = grid[y][x];
      if (t !== 'door-h' && t !== 'door-v') continue;
      const adj = adjacentRoomsForDoor(rooms, x, y);
      if (adj.length === 0) continue;
      if (adj.includes(startRoomIndex)) continue;
      doors.push({ x, y, rooms: adj, preferred: false });
      for (const r of adj) doorCountByRoom.set(r, (doorCountByRoom.get(r) ?? 0) + 1);
    }
  }
  for (const c of doors) {
    c.preferred = c.rooms.length === 1 && (doorCountByRoom.get(c.rooms[0]) ?? 0) === 1;
  }
  if (doors.length === 0) return;
  const target = Math.min(doors.length, Math.round(doors.length * clampedFraction));
  if (target <= 0) return;

  const selected: { x: number; y: number }[] = [];
  const addFrom = (pool: Cell[]) => {
    for (const c of shuffleArray(pool, rng)) {
      if (selected.length >= target) break;
      selected.push(c);
    }
  };
  addFrom(doors.filter(c => c.preferred));
  if (selected.length < target) addFrom(doors.filter(c => !c.preferred));

  for (const c of selected) {
    grid[c.y][c.x] = 'secret-door';
  }
  // After conversion, drop any secret door whose geometry no longer holds
  // (defensive; shouldn't trigger because we operate on validated doors).
  for (const c of selected) {
    if (grid[c.y][c.x] === 'secret-door' && !secretDoorIsValid(grid, c.x, c.y)) {
      grid[c.y][c.x] = 'wall';
    }
  }
}

/* ------------------------------------------------------------------ */
/* Step H: dev-only assertion                                          */
/* ------------------------------------------------------------------ */

function assertDoorsValid(grid: TypeGrid): void {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = grid[y][x];
      if (t === 'door-h' || t === 'door-v') {
        if (!doorIsValid(grid, x, y, t)) {
          console.warn(`[doorEngine] invalid ${t} at (${x},${y})`);
        }
      } else if (t === 'secret-door') {
        if (!secretDoorIsValid(grid, x, y)) {
          console.warn(`[doorEngine] invalid secret-door at (${x},${y})`);
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

export function applyDoors(
  grid: TypeGrid,
  rooms: readonly DoorEngineRoom[],
  rng: Rng,
  opts: ApplyDoorsOptions = {}
): void {
  const startRoomIndex = opts.startRoomIndex ?? 0;
  const w = grid[0]?.length ?? 0;
  const h = grid.length;

  // Step A
  clearStrayDoors(grid);

  // Step B: per-room perimeter analysis (does not mutate yet — collects
  // door candidates and seal targets).
  const roomCandidates: RoomCandidate[] = [];
  const sealTargets: { x: number; y: number }[] = [];
  for (let i = 0; i < rooms.length; i++) {
    const a = analyzeRoomPerimeter(grid, rooms[i], i);
    roomCandidates.push(...a.doors);
    sealTargets.push(...a.seals);
  }

  // Apply seals one-by-one with a connectivity guard: a seal that would
  // sever the start room from the rest of the dungeon (or otherwise
  // strand a room) is reverted. This protects against the
  // "perimeter floor that's actually part of an L-shaped corridor"
  // case — the cell looks like a doorless opening from the room's
  // perspective, but its perpendicular axis is the live corridor.
  applySealsSafely(grid, sealTargets, rooms, startRoomIndex);

  // Step C: corridor candidates (with consecutive-run reduction).
  const corridorCandidates = gatherCorridorCandidates(grid, rooms);

  // Step D: commit with strict validation.
  const committed: { x: number; y: number; type: DoorType }[] = [];
  for (const c of roomCandidates) {
    // Re-validate against the post-seal grid.
    if (grid[c.y]?.[c.x] !== 'floor' && grid[c.y]?.[c.x] !== 'wall') continue;
    // Temporarily place to test validity.
    const original = grid[c.y][c.x];
    grid[c.y][c.x] = c.type;
    if (doorIsValid(grid, c.x, c.y, c.type)) {
      committed.push({ x: c.x, y: c.y, type: c.type });
    } else {
      grid[c.y][c.x] = original;
    }
  }
  for (const c of corridorCandidates) {
    if (grid[c.y]?.[c.x] !== 'wall') continue;
    grid[c.y][c.x] = c.type;
    if (doorIsValid(grid, c.x, c.y, c.type)) {
      committed.push({ x: c.x, y: c.y, type: c.type });
    } else {
      grid[c.y][c.x] = 'wall';
    }
  }

  // Step E: connectivity guarantee.
  const start = findStartCell(grid, rooms, startRoomIndex);
  if (start) {
    let reachable = bfsConnectivity(grid, start.x, start.y);
    for (let i = 0; i < rooms.length; i++) {
      if (i === startRoomIndex) continue;
      if (roomIsReachable(reachable, rooms[i], w, h)) continue;
      const ok = carveRemediationDoor(grid, rooms[i], reachable, w, h);
      if (ok) {
        // Track the new door for the slider step below.
        for (const sideName of ['n', 's', 'w', 'e'] as const) {
          for (const c of perimeterCells(rooms[i], sideName)) {
            const t = grid[c.y]?.[c.x];
            if (t === 'door-h' || t === 'door-v') {
              if (!committed.some(d => d.x === c.x && d.y === c.y)) {
                committed.push({ x: c.x, y: c.y, type: t });
              }
            }
          }
        }
        reachable = bfsConnectivity(grid, start.x, start.y);
      }
    }
  }

  // Step F: slider-driven thinning (preserves connectivity).
  if (opts.doorKeepFraction !== undefined) {
    thinDoorsSafely(grid, committed, rng, opts.doorKeepFraction, rooms, startRoomIndex);
  }

  // Step G: secret-door conversion.
  if (opts.secretDoorFraction && opts.secretDoorFraction > 0) {
    convertSecretDoors(grid, rooms, rng, opts.secretDoorFraction, startRoomIndex);
  }

  // Step H: dev-only assertion.
  if (import.meta.env?.DEV) {
    assertDoorsValid(grid);
  }
}
