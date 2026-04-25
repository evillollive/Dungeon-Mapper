import type { MapNote, Tile } from '../../types/map';
import {
  bfsDistances,
  clampDensity,
  DIRS_8,
  getCell,
  makeTypeGrid,
  outlineWalls,
  setCell,
  type TypeGrid,
  typeGridToTiles,
} from './common';
import { poiLabelFor } from './poi';
import { makeRng } from './random';
import type { GenerateContext, GeneratedMap } from './types';

/** Count the number of `wall` neighbors (8-connected) around `(x, y)`. */
function wallNeighbors(grid: TypeGrid, x: number, y: number): number {
  let n = 0;
  for (const [dx, dy] of DIRS_8) {
    const t = getCell(grid, x + dx, y + dy);
    // Treat out-of-bounds as solid so the cavern stays bounded.
    if (t === 'wall' || t === 'empty') n++;
  }
  return n;
}

/**
 * Generate a cavern using the standard cellular-automata smoothing
 * algorithm: random fill → 4 smoothing passes → keep the largest connected
 * floor region. Density (0..1) controls the initial wall fill ratio
 * (0.55 default) — higher density = tighter caves, lower = more open.
 */
export function generateCavern(ctx: GenerateContext): GeneratedMap {
  const { width, height, seed, density, themeId, tileMix } = ctx;
  const rng = makeRng(seed);
  const grid = makeTypeGrid(width, height, 'wall');

  // Slider-driven overrides come in via `ctx.tileMix`; when a key is
  // absent we use the legacy formula so unchanged sliders reproduce the
  // previous output identically.
  const ov = tileMix ?? {};

  // Apply the shared density bounds, then take an extra max with 0.2:
  // below ~0.2 the random fill is too sparse for the smoothing pass to
  // form coherent cave walls and the result is mostly open floor with
  // little structure, so we floor cavern-specific density there even if
  // the global slider goes lower.
  const d = Math.max(0.2, clampDensity(density));
  // When the user moves the "Wall fill" slider, take its value as the
  // source of truth; otherwise map density 1.0 → 0.45 (classic value)
  // exactly like the legacy generator. Always clamp to the safe band so
  // smoothing keeps producing coherent caverns.
  const fillRatio = ov.wall !== undefined
    ? Math.max(0.3, Math.min(0.6, ov.wall))
    : Math.max(0.3, Math.min(0.6, 0.45 + (d - 1) * 0.05));

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      grid[y][x] = rng.next() < fillRatio ? 'wall' : 'floor';
    }
  }

  // 4 smoothing passes: a cell becomes wall if it has ≥5 wall neighbors,
  // becomes floor if it has ≤3. This is the standard Conway-style rule
  // used in roguelike cavern generation.
  for (let pass = 0; pass < 4; pass++) {
    const next: TypeGrid = grid.map(row => row.slice());
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const n = wallNeighbors(grid, x, y);
        if (n >= 5) next[y][x] = 'wall';
        else if (n <= 3) next[y][x] = 'floor';
      }
    }
    for (let y = 0; y < height; y++) grid[y] = next[y];
  }

  // Find the largest connected floor region and erase the rest so there
  // are no orphaned pockets the player can never reach.
  const visited: boolean[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false)
  );
  let bestRegion: { x: number; y: number }[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] !== 'floor' || visited[y][x]) continue;
      // Flood-fill this region.
      const region: { x: number; y: number }[] = [];
      const stack: [number, number][] = [[x, y]];
      visited[y][x] = true;
      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        region.push({ x: cx, y: cy });
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          if (visited[ny][nx] || grid[ny][nx] !== 'floor') continue;
          visited[ny][nx] = true;
          stack.push([nx, ny]);
        }
      }
      if (region.length > bestRegion.length) bestRegion = region;
    }
  }

  // Rebuild the grid: every cell becomes empty unless it's part of the
  // chosen region. Then outline walls so the cavern reads correctly.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) grid[y][x] = 'empty';
  }
  for (const c of bestRegion) grid[c.y][c.x] = 'floor';
  outlineWalls(grid);

  // Place the start at the first cell of the largest region and the
  // stairs-down at the farthest reachable floor. If the region is too
  // small to host both, just drop the start. Each placed POI gets an
  // auto-named MapNote (theme-flavored where applicable) so the cavern
  // shows up in the notes panel right away. The "Stairs Down" toggle and
  // "Treasure caches" slider gate optional POIs from the dialog.
  const placeStairs = ov.stairsDown !== undefined ? ov.stairsDown >= 0.5 : true;
  const treasureCaches = ov.treasure !== undefined
    ? Math.max(0, Math.round(ov.treasure))
    : 0;
  const pois: { x: number; y: number; type: 'start' | 'stairs-down' | 'treasure' }[] = [];
  if (bestRegion.length > 0) {
    const start = bestRegion[0];
    setCell(grid, start.x, start.y, 'start');
    pois.push({ x: start.x, y: start.y, type: 'start' });
    if (placeStairs) {
      const { farthest } = bfsDistances(grid, start.x, start.y, t => t === 'floor' || t === 'start');
      if (farthest.d > 0 && getCell(grid, farthest.x, farthest.y) === 'floor') {
        setCell(grid, farthest.x, farthest.y, 'stairs-down');
        pois.push({ x: farthest.x, y: farthest.y, type: 'stairs-down' });
      }
    }
    // Optional cache scatter — picks from remaining floor cells.
    if (treasureCaches > 0) {
      const floors: { x: number; y: number }[] = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (grid[y][x] === 'floor') floors.push({ x, y });
        }
      }
      const target = Math.min(floors.length, treasureCaches);
      for (let i = 0; i < target && floors.length > 0; i++) {
        const idx = rng.int(0, floors.length - 1);
        const c = floors.splice(idx, 1)[0];
        setCell(grid, c.x, c.y, 'treasure');
        pois.push({ x: c.x, y: c.y, type: 'treasure' });
      }
    }
  }

  const tiles: Tile[][] = typeGridToTiles(grid);
  const notes: MapNote[] = [];
  // Suffix duplicate POI types ("Treasure 1", "Treasure 2", …) so the
  // notes panel shows distinct entries when multiple caches are placed.
  const counts = new Map<string, number>();
  for (const p of pois) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
  const seen = new Map<string, number>();
  for (let i = 0; i < pois.length; i++) {
    const p = pois[i];
    const total = counts.get(p.type) ?? 1;
    const ord = (seen.get(p.type) ?? 0) + 1;
    seen.set(p.type, ord);
    const id = i + 1;
    notes.push({
      id,
      x: p.x,
      y: p.y,
      label: poiLabelFor(themeId, p.type, total > 1 ? ord : undefined),
      description: '',
    });
    if (tiles[p.y]?.[p.x]) tiles[p.y][p.x] = { ...tiles[p.y][p.x], noteId: id };
  }
  return { tiles, notes, width, height };
}
