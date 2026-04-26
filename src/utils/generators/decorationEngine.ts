import type { TileType } from '../../types/map';
import { getCell, setCell, type TypeGrid } from './common';
import type { Rng } from './random';

/**
 * Decoration engine.
 *
 * `applyDecorations` is the **sole** writer of `water` / `pillar` (and
 * any future scatter / clutter) tiles in the map pipeline. Each
 * generator stops scattering decorations directly and instead declares
 * a list of `Decoration` strategies; the engine dispatches to the
 * appropriate placement routine while enforcing a single shared
 * validity contract:
 *
 *   - Decorations may only stamp `floor` cells. POIs (start, stairs,
 *     treasure, trap), water already placed by an earlier strategy,
 *     pillars, walls — none of these get overwritten.
 *   - Random-walk strategies may step out of bounds; the writer is
 *     bounds-safe (`setCell` and `getCell` no-op outside the grid).
 *   - Strategies preserve the legacy generators' RNG-consumption
 *     order so existing seeds reproduce identically. The engine itself
 *     never consumes RNG outside of strategy calls.
 *
 * Where this runs in the pipeline:
 *   1. terrain carving (rooms / cavern / open) — first
 *   2. POI placement (start, stairs, treasure, trap)
 *   3. **decoration engine** — runs here, after POIs so it can avoid
 *      overwriting them, before the door engine so doors can validate
 *      their frames against the *final* obstacle layout
 *   4. door engine — last, owns all door tiles
 *
 * Strategies (one decoration entry per scatter / pattern):
 *   - `pools`: random-walk pools used by the cavern generator. The
 *     walker visits N steps from a seed cell, stamping each `floor`
 *     cell with the chosen tile.
 *   - `blobs`: random-walk blobs used by the open-terrain generator.
 *     Like `pools` but starts at an arbitrary seed (potentially out of
 *     bounds) and stamps every cell visited regardless of current type
 *     — matching the legacy `paintBlob` behavior, since open terrain's
 *     first-pass scatter is allowed to overwrite anything.
 *   - `centered`: single-tile placement near each eligible room's
 *     center, with a 1-ring fallback. Used by rooms-and-corridors for
 *     fountains / wells.
 *   - `grid`: regular grid pattern within each eligible room. Used by
 *     rooms-and-corridors for pillar halls.
 *   - `scatter`: drop N tiles at uniformly-random cells, stamping only
 *     when the chosen cell is `floor`. Used by open terrain's
 *     standing-stones / boulders pass.
 */

interface PoolsStrategy {
  kind: 'pools';
  /** Tile to paint along the walk. */
  tile: TileType;
  /** Centers from which to start each random walk. The strategy picks
   *  `count` of them (possibly with replacement) at random. */
  seedCandidates: { x: number; y: number }[];
  /** Number of pools to start. */
  count: number;
  /** Average step count per pool. Each pool's actual length is
   *  `round(avgSize * (0.6 + rng.next() * 0.8))`, matching the legacy
   *  cavern generator exactly. */
  avgSize: number;
}

interface BlobsStrategy {
  kind: 'blobs';
  tile: TileType;
  /** Bounds the random seed coordinate is sampled from. The walk may
   *  leave this rectangle — `setCell` clips to the grid. */
  width: number;
  height: number;
  /** Number of blobs to spawn. */
  count: number;
  /** Random walk length per blob, sampled `rng.int(sizeMin, sizeMax)`. */
  sizeMin: number;
  sizeMax: number;
  /** When true, the walker overwrites whatever it visits (matching
   *  open-terrain's legacy `paintBlob`). When false, only `floor` cells
   *  are stamped. Default: true (open-terrain compatibility). */
  overwrite?: boolean;
}

interface CenteredStrategy {
  kind: 'centered';
  tile: TileType;
  /** Eligible rooms. Each entry contributes one stamp near the room's
   *  center (or in the surrounding 8-ring if the center is occupied). */
  rooms: readonly { x: number; y: number; w: number; h: number }[];
  /** Maximum number of rooms to decorate. Picked via Fisher-Yates
   *  shuffle of `rooms` followed by `slice(0, count)`. */
  count: number;
  /** 8-neighborhood probe order for the fallback ring. The legacy
   *  rooms-and-corridors generator probes N, S, W, E first then the
   *  four diagonals; pass that list to keep seeds reproducible. */
  probeOffsets: readonly [number, number][];
}

interface GridStrategy {
  kind: 'grid';
  tile: TileType;
  /** Rooms to consider. Each is offered one grid pattern when
   *  `eligible(room)` is true. The predicate runs in iteration order
   *  and may consume RNG (e.g. per-room `rng.chance` rolls in the
   *  rooms-and-corridors generator), so callers MUST pass a stable,
   *  pre-filtered list. */
  rooms: readonly { x: number; y: number; w: number; h: number }[];
  /** Predicate the room must satisfy to receive the pattern. Receives
   *  the bare geometry — callers needing extra per-room context (e.g.
   *  the room's archetype) should close over it from a parallel array
   *  / Map keyed by room reference. */
  eligible: (room: { x: number; y: number; w: number; h: number }) => boolean;
  /** Distance from the room's interior wall before the first row /
   *  column of the pattern. Default 2. */
  inset: number;
  /** Step between pattern cells. Default 3. */
  step: number;
}

interface ScatterStrategy {
  kind: 'scatter';
  tile: TileType;
  /** Bounds the random sample coordinate is drawn from. */
  width: number;
  height: number;
  /** Number of stamp attempts. Each attempt only succeeds when the
   *  chosen cell is currently `floor`, so the realized count may be
   *  less than `count` (matching the legacy open-terrain generator). */
  count: number;
}

export type Decoration =
  | PoolsStrategy
  | BlobsStrategy
  | CenteredStrategy
  | GridStrategy
  | ScatterStrategy;

/**
 * Apply each decoration strategy in order. Decorations are written
 * directly into `grid`. Strategies share a `floor`-only stamping
 * contract (with `blobs.overwrite=true` as the documented exception
 * for open-terrain compatibility) so the door engine — which runs
 * after this — can rely on the final obstacle layout when validating
 * door frames.
 */
export function applyDecorations(
  grid: TypeGrid,
  rng: Rng,
  decorations: readonly Decoration[]
): void {
  for (const dec of decorations) {
    switch (dec.kind) {
      case 'pools': applyPools(grid, rng, dec); break;
      case 'blobs': applyBlobs(grid, rng, dec); break;
      case 'centered': applyCentered(grid, rng, dec); break;
      case 'grid': applyGrid(grid, dec); break;
      case 'scatter': applyScatter(grid, rng, dec); break;
    }
  }
}

const DIRS_4_POOLS: readonly [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

function applyPools(grid: TypeGrid, rng: Rng, dec: PoolsStrategy): void {
  if (dec.count <= 0 || dec.seedCandidates.length === 0) return;
  for (let i = 0; i < dec.count; i++) {
    const c = dec.seedCandidates[rng.int(0, dec.seedCandidates.length - 1)];
    const size = Math.max(1, Math.round(dec.avgSize * (0.6 + rng.next() * 0.8)));
    let x = c.x;
    let y = c.y;
    for (let s = 0; s < size; s++) {
      if (getCell(grid, x, y) === 'floor') setCell(grid, x, y, dec.tile);
      const [dx, dy] = rng.pick(DIRS_4_POOLS);
      x += dx;
      y += dy;
    }
  }
}

function applyBlobs(grid: TypeGrid, rng: Rng, dec: BlobsStrategy): void {
  const overwrite = dec.overwrite ?? true;
  for (let i = 0; i < dec.count; i++) {
    let x = rng.int(0, dec.width - 1);
    let y = rng.int(0, dec.height - 1);
    const size = rng.int(dec.sizeMin, dec.sizeMax);
    for (let s = 0; s < size; s++) {
      if (overwrite || getCell(grid, x, y) === 'floor') {
        setCell(grid, x, y, dec.tile);
      }
      const [dx, dy] = rng.pick(DIRS_4_POOLS);
      x += dx;
      y += dy;
    }
  }
}

function applyCentered(grid: TypeGrid, rng: Rng, dec: CenteredStrategy): void {
  const eligible = dec.rooms.slice();
  if (eligible.length === 0 || dec.count <= 0) return;
  // Fisher-Yates shuffle, then take the first `count`. Matches the
  // legacy rooms-and-corridors generator's RNG-consumption order so
  // existing seeds reproduce identically.
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  const take = Math.min(eligible.length, dec.count);
  for (let i = 0; i < take; i++) {
    const r = eligible[i];
    const cx = Math.floor(r.x + r.w / 2);
    const cy = Math.floor(r.y + r.h / 2);
    if (getCell(grid, cx, cy) === 'floor') {
      setCell(grid, cx, cy, dec.tile);
    } else {
      for (const [dx, dy] of dec.probeOffsets) {
        if (getCell(grid, cx + dx, cy + dy) === 'floor') {
          setCell(grid, cx + dx, cy + dy, dec.tile);
          break;
        }
      }
    }
  }
}

function applyGrid(grid: TypeGrid, dec: GridStrategy): void {
  for (const r of dec.rooms) {
    if (!dec.eligible(r)) continue;
    for (let y = r.y + dec.inset; y < r.y + r.h - dec.inset; y += dec.step) {
      for (let x = r.x + dec.inset; x < r.x + r.w - dec.inset; x += dec.step) {
        if (getCell(grid, x, y) === 'floor') setCell(grid, x, y, dec.tile);
      }
    }
  }
}

function applyScatter(grid: TypeGrid, rng: Rng, dec: ScatterStrategy): void {
  for (let i = 0; i < dec.count; i++) {
    const x = rng.int(0, dec.width - 1);
    const y = rng.int(0, dec.height - 1);
    if (getCell(grid, x, y) === 'floor') setCell(grid, x, y, dec.tile);
  }
}
