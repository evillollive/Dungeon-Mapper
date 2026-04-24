import type { Tile, TileType } from '../types/map';

export function createEmptyGrid(width: number, height: number): Tile[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ type: 'empty' as TileType }))
  );
}

export function floodFill(
  tiles: Tile[][],
  startX: number,
  startY: number,
  targetType: TileType,
  fillType: TileType
): Tile[][] {
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;
  if (targetType === fillType) return tiles;

  const newTiles = tiles.map(row => row.map(t => ({ ...t })));
  const stack: [number, number][] = [[startX, startY]];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (newTiles[y][x].type !== targetType) continue;

    visited.add(key);
    // Clear any per-tile theme override on filled cells so they adopt the
    // current map theme, matching the behavior of setTile/setTiles.
    const next = { ...newTiles[y][x], type: fillType };
    delete next.theme;
    newTiles[y][x] = next;

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return newTiles;
}

export const TILE_COLORS: Record<TileType, string> = {
  empty: '#1a1a2e',
  floor: '#c8b89a',
  wall: '#4a4a4a',
  'door-h': '#8b6914',
  'door-v': '#8b6914',
  'stairs-up': '#7a9e7e',
  'stairs-down': '#5a7a5e',
  water: '#1e5f8e',
  pillar: '#6a6a6a',
  trap: '#8e1e1e',
  treasure: '#d4af37',
  start: '#2e8b57',
};
