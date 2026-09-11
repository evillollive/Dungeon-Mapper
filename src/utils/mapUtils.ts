import type { FloorMaterialId, Tile, TileType } from '../types/map';
import { hasFloorMaterialSurface } from './floorMaterials';

export function createEmptyGrid(width: number, height: number): Tile[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ type: 'empty' as TileType }))
  );
}

/**
 * Build a fresh fog grid sized to (width × height). The `filled` flag picks
 * between fully-fogged (true — useful for "Reset fog") and fully-revealed
 * (false — the default for new maps). Result is independent of any input
 * grid so callers can replace state outright.
 */
export function createFogGrid(width: number, height: number, filled = false): boolean[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => filled)
  );
}

/**
 * Resize an existing fog grid to (width × height), preserving overlapping
 * cells and filling new cells with `fillNew` (defaults to revealed). Used
 * when the user resizes the map so the fog mask stays aligned with tiles.
 */
export function resizeFogGrid(
  fog: boolean[][] | undefined,
  width: number,
  height: number,
  fillNew = false
): boolean[][] {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => fog?.[y]?.[x] ?? fillNew)
  );
}

export function floodFill(
  tiles: Tile[][],
  startX: number,
  startY: number,
  targetType: TileType,
  fillType: TileType,
  floorMaterial?: FloorMaterialId,
): Tile[][] {
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;
  const targetMaterial = tiles[startY]?.[startX]?.floorMaterial;
  const material = fillType === 'floor' ? floorMaterial
    : hasFloorMaterialSurface(fillType) ? targetMaterial : undefined;
  if (targetType === fillType && targetMaterial === material) return tiles;

  const newTiles = tiles.map(row => row.map(t => ({ ...t })));
  const stack: [number, number][] = [[startX, startY]];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (newTiles[y][x].type !== targetType || newTiles[y][x].floorMaterial !== targetMaterial) continue;

    visited.add(key);
    // Clear any per-tile theme override on filled cells so they adopt the
    // current map theme, matching the behavior of setTile/setTiles.
    const next = { ...newTiles[y][x], type: fillType };
    delete next.discovered;
    delete next.discoveredType;
    delete next.theme;
    if (material) next.floorMaterial = material;
    else delete next.floorMaterial;
    newTiles[y][x] = next;

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return newTiles;
}
