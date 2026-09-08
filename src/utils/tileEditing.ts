import type { Tile, TileType } from '../types/map';

export function applyTileUpdates(
  tiles: Tile[][],
  updates: readonly { x: number; y: number; type: TileType }[],
  width: number,
  height: number,
): Tile[][] | null {
  let nextTiles: Tile[][] | null = null;
  const copyRow = (y: number): Tile[] => {
    if (!nextTiles) nextTiles = tiles.slice();
    if (nextTiles[y] === tiles[y]) nextTiles[y] = tiles[y].slice();
    return nextTiles[y];
  };
  for (const { x, y, type } of updates) {
    if (y < 0 || y >= height || x < 0 || x >= width) continue;
    const current = (nextTiles ?? tiles)[y]?.[x];
    if (!current) continue;
    if (current.type === type && current.theme === undefined) continue;
    const row = copyRow(y);
    const next: Tile = { ...current, type };
    delete next.theme;
    row[x] = next;
  }
  return nextTiles;
}
