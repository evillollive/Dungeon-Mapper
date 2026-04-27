import { setCell, type TypeGrid } from './common';
import type { Rng } from './random';

/**
 * Pluggable corridor strategy engine.
 *
 * The rooms-and-corridors generator carves rectangular rooms and then
 * delegates the *connection* phase — deciding which rooms are joined
 * and how the corridor between them is shaped — to a `CorridorStrategy`
 * picked by id from `CORRIDOR_STRATEGY_REGISTRY`.
 *
 * Every strategy must:
 *   1. Mutate the passed grid by setting corridor cells to `'floor'`.
 *   2. Return a list of `bridges` — single perimeter wall cells that
 *      `outlineWalls` will later seal but the generator immediately
 *      re-floors so the door engine can decide whether each bridge
 *      becomes a door, stays open, or is sealed back.
 *   3. Leave the rooms themselves connected (the door engine relies on
 *      the carved corridor floor to find perimeter openings).
 *
 * The default strategy `straight-l` reproduces the legacy behavior
 * byte-for-byte, including RNG consumption order, so existing seeds
 * keep generating identical maps.
 */

/** The minimal room shape strategies need. */
export interface CorridorRoom {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Internal door-axis discriminator used only by `pickExit`'s return value
 * so callers can be type-checked when they need to distinguish horizontal
 * vs vertical perimeter openings. The door engine, which is the sole
 * consumer of door tiles, re-derives orientation from grid geometry, so
 * this is not part of the public corridor-strategy contract.
 */
type DoorType = 'door-h' | 'door-v';

/** A perimeter cell that should be carved through the wall after `outlineWalls`. */
export interface CorridorBridge {
  x: number;
  y: number;
}

export interface CorridorContext {
  rooms: CorridorRoom[];
  grid: TypeGrid;
  width: number;
  height: number;
  rng: Rng;
}

export interface CorridorPlan {
  /** Wall-perimeter cells to re-floor after `outlineWalls` runs. */
  bridges: CorridorBridge[];
}

export interface CorridorStrategy {
  id: string;
  /** Short user-facing name for the dialog dropdown. */
  name: string;
  /** One-line description shown next to the dropdown. */
  description: string;
  /**
   * Carve corridor floor cells into `ctx.grid` and return the bridge
   * cells that need to survive `outlineWalls`.
   */
  plan(ctx: CorridorContext): CorridorPlan;
}

/* ─────────────────────────  Shared helpers  ───────────────────────── */

function roomCenter(r: CorridorRoom): { x: number; y: number } {
  return { x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) };
}

/**
 * Pick a single doorway on `room` facing `target`. Returns the wall
 * cell that should become a doorway plus the floor cell one step
 * outside the room where the corridor actually starts. Routing from
 * `exit` (rather than the room center) keeps the room's four walls
 * intact.
 *
 * Ported verbatim from the legacy in-line helper in `roomsCorridors.ts`
 * so existing seeds reproduce identically when the default strategy
 * is selected.
 */
export function pickExit(
  room: CorridorRoom,
  target: CorridorRoom,
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
      doorX = side === 'e' ? room.x + room.w : room.x - 1;
      exitX = side === 'e' ? doorX + 1 : doorX - 1;
      const ey = rng.int(room.y, room.y + room.h - 1);
      doorY = ey;
      exitY = ey;
      type = 'door-v';
    } else {
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

  const c = roomCenter(room);
  return { exit: c, door: { x: c.x, y: c.y, type: 'door-v' } };
}

/** Enumerate the cells of an L-shaped corridor between two points. */
export function lCorridorCells(
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
 * Enumerate the cells of a Z-shaped (3-segment) corridor between two
 * points. The corridor turns twice via a midpoint placed between the
 * endpoints along the dominant axis. Falls back to an L-shape when the
 * endpoints are too close to fit a Z without doubling back.
 */
export function zCorridorCells(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  rng: Rng
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const dx = bx - ax;
  const dy = by - ay;
  // If we don't have enough room on either axis to insert a midpoint
  // that creates a true Z, fall back to a plain L.
  if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
    return lCorridorCells(ax, ay, bx, by, Math.abs(dx) >= Math.abs(dy));
  }
  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal-dominant: split on x. Midpoint x sits strictly between
    // the endpoints so both H-segments have non-zero length.
    const lo = Math.min(ax, bx) + 2;
    const hi = Math.max(ax, bx) - 2;
    const midX = lo <= hi ? rng.int(lo, hi) : Math.floor((ax + bx) / 2);
    for (let x = Math.min(ax, midX); x <= Math.max(ax, midX); x++) out.push({ x, y: ay });
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) out.push({ x: midX, y });
    for (let x = Math.min(midX, bx); x <= Math.max(midX, bx); x++) out.push({ x, y: by });
  } else {
    // Vertical-dominant: split on y.
    const lo = Math.min(ay, by) + 2;
    const hi = Math.max(ay, by) - 2;
    const midY = lo <= hi ? rng.int(lo, hi) : Math.floor((ay + by) / 2);
    for (let y = Math.min(ay, midY); y <= Math.max(ay, midY); y++) out.push({ x: ax, y });
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) out.push({ x, y: midY });
    for (let y = Math.min(midY, by); y <= Math.max(midY, by); y++) out.push({ x: bx, y });
  }
  return out;
}

/**
 * Count how many cells of a corridor path land inside the *interior*
 * of any room not in `skip`. Used to prefer paths that don't slice
 * through unrelated rooms.
 */
export function countRoomCrossings(
  cells: { x: number; y: number }[],
  rooms: CorridorRoom[],
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

/* ─────────────────────────  Topology helpers  ─────────────────────── */

/** Squared center-to-center distance — comparison-only, no sqrt needed. */
function centerDistSq(a: CorridorRoom, b: CorridorRoom): number {
  const ac = roomCenter(a);
  const bc = roomCenter(b);
  const dx = ac.x - bc.x;
  const dy = ac.y - bc.y;
  return dx * dx + dy * dy;
}

interface Edge {
  i: number;
  j: number;
  d: number;
}

/**
 * Build a minimum spanning tree over room centers (Kruskal + union-find).
 * Returns the list of edges (room-index pairs) in the MST. Stable for a
 * given input ordering: ties on distance break by `(i, j)` so the same
 * room layout always produces the same tree.
 */
function minimumSpanningTree(rooms: CorridorRoom[]): Edge[] {
  const n = rooms.length;
  if (n <= 1) return [];
  const edges: Edge[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      edges.push({ i, j, d: centerDistSq(rooms[i], rooms[j]) });
    }
  }
  edges.sort((a, b) => a.d - b.d || a.i - b.i || a.j - b.j);
  const parent = Array.from({ length: n }, (_, k) => k);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (x: number, y: number): boolean => {
    const rx = find(x);
    const ry = find(y);
    if (rx === ry) return false;
    parent[rx] = ry;
    return true;
  };
  const out: Edge[] = [];
  for (const e of edges) {
    if (union(e.i, e.j)) {
      out.push(e);
      if (out.length === n - 1) break;
    }
  }
  return out;
}

/**
 * Carve an L-corridor between two rooms using the same exit-picking and
 * crossing-avoidance heuristics as the legacy generator.
 *
 * Returns the two perimeter bridge cells (one per room).
 */
function carveLBetween(
  ctx: CorridorContext,
  a: CorridorRoom,
  b: CorridorRoom,
  skip: Set<number>
): CorridorBridge[] {
  const ra = pickExit(a, b, ctx.rng, ctx.width, ctx.height);
  const rb = pickExit(b, a, ctx.rng, ctx.width, ctx.height);
  const opt1 = lCorridorCells(ra.exit.x, ra.exit.y, rb.exit.x, rb.exit.y, true);
  const opt2 = lCorridorCells(ra.exit.x, ra.exit.y, rb.exit.x, rb.exit.y, false);
  const c1 = countRoomCrossings(opt1, ctx.rooms, skip);
  const c2 = countRoomCrossings(opt2, ctx.rooms, skip);
  let cells: { x: number; y: number }[];
  if (c1 < c2) cells = opt1;
  else if (c2 < c1) cells = opt2;
  else cells = ctx.rng.chance() ? opt1 : opt2;
  for (const c of cells) setCell(ctx.grid, c.x, c.y, 'floor');
  return [
    { x: ra.door.x, y: ra.door.y },
    { x: rb.door.x, y: rb.door.y },
  ];
}

/**
 * Carve a Z-corridor between two rooms. Falls back to the L behavior
 * when the endpoints are too close to fit a meaningful Z.
 */
function carveZBetween(
  ctx: CorridorContext,
  a: CorridorRoom,
  b: CorridorRoom
): CorridorBridge[] {
  const ra = pickExit(a, b, ctx.rng, ctx.width, ctx.height);
  const rb = pickExit(b, a, ctx.rng, ctx.width, ctx.height);
  const cells = zCorridorCells(ra.exit.x, ra.exit.y, rb.exit.x, rb.exit.y, ctx.rng);
  for (const c of cells) setCell(ctx.grid, c.x, c.y, 'floor');
  return [
    { x: ra.door.x, y: ra.door.y },
    { x: rb.door.x, y: rb.door.y },
  ];
}

/* ─────────────────────────  Strategies  ───────────────────────────── */

/**
 * Default strategy. Connects each room to the previous one in array
 * order (rooms[i-1] ↔ rooms[i]) with the L-bend that crosses the
 * fewest unrelated rooms. RNG consumption order matches the legacy
 * in-line code in `generateRoomsCorridors` exactly so existing seeds
 * keep producing identical maps.
 */
const straightLStrategy: CorridorStrategy = {
  id: 'straight-l',
  name: 'Classic L-bends',
  description:
    'Connect rooms in sequence with right-angled corridors. Predictable, walkable layouts; no loops.',
  plan(ctx) {
    const bridges: CorridorBridge[] = [];
    const { rooms } = ctx;
    for (let i = 1; i < rooms.length; i++) {
      const skip = new Set([i - 1, i]);
      bridges.push(...carveLBetween(ctx, rooms[i - 1], rooms[i], skip));
    }
    return { bridges };
  },
};

/**
 * Connect rooms via a minimum spanning tree over room centers. Each
 * MST edge is carved with the same L-bend / crossing-avoidance logic
 * as the default strategy. Produces a tree (no loops) but, unlike
 * `straight-l`, neighbors are spatially close — so corridors tend to
 * be shorter and the dungeon feels less like a corridor on rails.
 */
const mstStrategy: CorridorStrategy = {
  id: 'mst',
  name: 'Spanning tree',
  description:
    'Connect each room to its nearest neighbors (MST). Tree topology — no loops — but corridors stay short.',
  plan(ctx) {
    const bridges: CorridorBridge[] = [];
    const tree = minimumSpanningTree(ctx.rooms);
    for (const e of tree) {
      const skip = new Set([e.i, e.j]);
      bridges.push(...carveLBetween(ctx, ctx.rooms[e.i], ctx.rooms[e.j], skip));
    }
    return { bridges };
  },
};

/**
 * Like `mst` but adds a small number of extra short edges between
 * nearby rooms, producing genuine cycles. Lets players loop back
 * instead of always retracing their steps.
 */
const loopsStrategy: CorridorStrategy = {
  id: 'loops',
  name: 'Looping passages',
  description:
    'MST plus extra short edges so the dungeon has cycles — players can loop instead of backtracking.',
  plan(ctx) {
    const bridges: CorridorBridge[] = [];
    const tree = minimumSpanningTree(ctx.rooms);
    const used = new Set<string>();
    const edgeKey = (i: number, j: number) => (i < j ? `${i},${j}` : `${j},${i}`);
    for (const e of tree) {
      used.add(edgeKey(e.i, e.j));
      const skip = new Set([e.i, e.j]);
      bridges.push(...carveLBetween(ctx, ctx.rooms[e.i], ctx.rooms[e.j], skip));
    }
    // Add ~one extra edge per ~4 rooms, capped at half the MST edge
    // count so we never collapse into a complete graph. We pick the
    // shortest unused edges so the loops stay local instead of
    // criss-crossing the map.
    const n = ctx.rooms.length;
    const extraTarget = Math.min(Math.floor(tree.length / 2), Math.max(0, Math.floor(n / 4)));
    if (extraTarget > 0 && n >= 3) {
      const allEdges: Edge[] = [];
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (used.has(edgeKey(i, j))) continue;
          allEdges.push({ i, j, d: centerDistSq(ctx.rooms[i], ctx.rooms[j]) });
        }
      }
      allEdges.sort((a, b) => a.d - b.d || a.i - b.i || a.j - b.j);
      for (let k = 0; k < extraTarget && k < allEdges.length; k++) {
        const e = allEdges[k];
        used.add(edgeKey(e.i, e.j));
        const skip = new Set([e.i, e.j]);
        bridges.push(...carveLBetween(ctx, ctx.rooms[e.i], ctx.rooms[e.j], skip));
      }
    }
    return { bridges };
  },
};

/**
 * MST topology with Z-shaped (three-segment) corridors instead of L
 * bends. The midpoint of each Z is randomized along the dominant
 * axis so corridors meander rather than running straight to the
 * destination. Reads as more organic, hand-drawn dungeons.
 */
const windingStrategy: CorridorStrategy = {
  id: 'winding',
  name: 'Winding passages',
  description:
    'Spanning tree plus Z-shaped corridors with a randomized midpoint. Reads as organic, hand-drawn passages.',
  plan(ctx) {
    const bridges: CorridorBridge[] = [];
    const tree = minimumSpanningTree(ctx.rooms);
    for (const e of tree) {
      bridges.push(...carveZBetween(ctx, ctx.rooms[e.i], ctx.rooms[e.j]));
    }
    return { bridges };
  },
};

/* ─────────────────────────  Registry  ─────────────────────────────── */

export const CORRIDOR_STRATEGY_LIST: readonly CorridorStrategy[] = [
  straightLStrategy,
  mstStrategy,
  loopsStrategy,
  windingStrategy,
];

export const CORRIDOR_STRATEGY_REGISTRY: Record<string, CorridorStrategy> =
  Object.fromEntries(CORRIDOR_STRATEGY_LIST.map(s => [s.id, s]));

export const DEFAULT_CORRIDOR_STRATEGY_ID = straightLStrategy.id;

/**
 * Resolve a strategy id to a `CorridorStrategy`. Falls back to the
 * default strategy when the id is unknown / undefined so callers
 * (importers, older saved generator settings) always get a working
 * map rather than a thrown error.
 */
export function getCorridorStrategy(id?: string): CorridorStrategy {
  if (id && CORRIDOR_STRATEGY_REGISTRY[id]) return CORRIDOR_STRATEGY_REGISTRY[id];
  return CORRIDOR_STRATEGY_REGISTRY[DEFAULT_CORRIDOR_STRATEGY_ID];
}
