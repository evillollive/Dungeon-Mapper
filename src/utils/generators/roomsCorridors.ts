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
import { makeRng } from './random';
import type { GenerateContext, GeneratedMap } from './types';

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
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
 * Generate a classic dungeon: rectangular rooms connected by L-shaped
 * corridors, walled in, with a `start`, a `stairs-down` at the farthest
 * room, and a sprinkling of `treasure` and `trap` tiles.
 *
 * `density` (0..1) scales the number of attempted rooms.
 */
export function generateRoomsCorridors(ctx: GenerateContext): GeneratedMap {
  const { width, height, seed, density } = ctx;
  const rng = makeRng(seed);
  const grid = makeTypeGrid(width, height, 'empty');

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

  // Pick the start in the first room and `stairs-down` at the farthest
  // reachable floor cell so the player has a visible objective.
  const start = roomCenter(rooms[0]);
  setCell(grid, start.x, start.y, 'start');

  const { farthest } = bfsDistances(grid, start.x, start.y, t =>
    t === 'floor' || t === 'door-h' || t === 'door-v' || t === 'start'
  );
  if (farthest.d > 0 && getCell(grid, farthest.x, farthest.y) === 'floor') {
    setCell(grid, farthest.x, farthest.y, 'stairs-down');
  }

  // Drop a few POIs on remaining floor cells. Number scales gently with
  // room count so big dungeons feel a bit busier.
  const floors = collectCells(grid, 'floor');
  const treasureCount = Math.min(floors.length, Math.max(1, Math.round(rooms.length / 3)));
  const trapCount = Math.min(
    Math.max(0, floors.length - treasureCount),
    Math.max(0, Math.round(rooms.length / 4))
  );
  for (let i = 0; i < treasureCount && floors.length > 0; i++) {
    const idx = rng.int(0, floors.length - 1);
    const c = floors.splice(idx, 1)[0];
    setCell(grid, c.x, c.y, 'treasure');
  }
  for (let i = 0; i < trapCount && floors.length > 0; i++) {
    const idx = rng.int(0, floors.length - 1);
    const c = floors.splice(idx, 1)[0];
    setCell(grid, c.x, c.y, 'trap');
  }

  const tiles: Tile[][] = typeGridToTiles(grid);
  const notes: MapNote[] = [];
  return { tiles, notes, width, height };
}
