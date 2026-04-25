import type { Tile, TileType } from '../../types/map';

/**
 * Bounds applied by every generator to the `density` knob exposed in the
 * dialog. The value is roughly centered at 1.0; the 0.1 floor exists so a
 * user dragging the slider all the way to the left still gets a populated
 * map rather than an empty grid. Generators that need a tighter floor
 * (e.g. cavern, where too-low fill produces incoherent caves) clamp again
 * internally.
 */
export const MIN_DENSITY = 0.1;
export const MAX_DENSITY = 1.5;

/** Clamp a density value to the supported range. */
export function clampDensity(d: number): number {
  return Math.max(MIN_DENSITY, Math.min(MAX_DENSITY, d));
}

/** Mutable working grid of `TileType`s used by the generators. */
export type TypeGrid = TileType[][];

/** Allocate a `TypeGrid` filled with the given tile type. */
export function makeTypeGrid(width: number, height: number, fill: TileType = 'empty'): TypeGrid {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => fill)
  );
}

/** Convert a `TypeGrid` into the `Tile[][]` shape stored on `DungeonMap`. */
export function typeGridToTiles(grid: TypeGrid): Tile[][] {
  return grid.map(row => row.map(type => ({ type })));
}

/** Bounds-safe getter that treats out-of-range cells as `empty`. */
export function getCell(grid: TypeGrid, x: number, y: number): TileType {
  return grid[y]?.[x] ?? 'empty';
}

export function setCell(grid: TypeGrid, x: number, y: number, type: TileType): void {
  if (grid[y] && x >= 0 && x < grid[y].length) grid[y][x] = type;
}

/** 4-neighborhood offsets used by BFS / wall outlining. */
export const DIRS_4: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** 8-neighborhood offsets used by cellular-automata smoothing. */
export const DIRS_8: readonly [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * Replace every `empty` cell that touches a `floor` cell (4-connected) with
 * a `wall`. This is the standard "outline the rooms" pass shared by the
 * rooms-and-corridors and cavern generators so floors always end up bounded.
 */
export function outlineWalls(grid: TypeGrid): void {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const toWall: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x] !== 'empty') continue;
      for (const [dx, dy] of DIRS_4) {
        if (getCell(grid, x + dx, y + dy) === 'floor') {
          toWall.push([x, y]);
          break;
        }
      }
    }
  }
  for (const [x, y] of toWall) grid[y][x] = 'wall';
}

/**
 * BFS over `floor` cells starting from `(sx, sy)`. Returns a distance grid
 * where unreachable cells are `-1`, plus the farthest reachable cell.
 */
export function bfsDistances(
  grid: TypeGrid,
  sx: number,
  sy: number,
  passable: (t: TileType) => boolean = t => t === 'floor'
): { dist: number[][]; farthest: { x: number; y: number; d: number } } {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const dist: number[][] = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => -1)
  );
  if (sy < 0 || sy >= h || sx < 0 || sx >= w || !passable(grid[sy][sx])) {
    return { dist, farthest: { x: sx, y: sy, d: 0 } };
  }
  const queue: [number, number][] = [[sx, sy]];
  dist[sy][sx] = 0;
  let farthest = { x: sx, y: sy, d: 0 };
  let head = 0;
  while (head < queue.length) {
    const [x, y] = queue[head++];
    const d = dist[y][x];
    if (d > farthest.d) farthest = { x, y, d };
    for (const [dx, dy] of DIRS_4) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (dist[ny][nx] !== -1) continue;
      if (!passable(grid[ny][nx])) continue;
      dist[ny][nx] = d + 1;
      queue.push([nx, ny]);
    }
  }
  return { dist, farthest };
}

/** Collect every cell of a given tile type. */
export function collectCells(grid: TypeGrid, type: TileType): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      if (row[x] === type) out.push({ x, y });
    }
  }
  return out;
}
