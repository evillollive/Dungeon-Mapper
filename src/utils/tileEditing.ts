import type { FloorMaterialId, Tile, TileType } from '../types/map';
import { hasFloorMaterialSurface, isConnectedFloorGround } from './floorMaterials';

export function applyTileUpdates(
  tiles: Tile[][],
  updates: readonly { x: number; y: number; type: TileType; floorMaterial?: FloorMaterialId }[],
  width: number,
  height: number,
): Tile[][] | null {
  let nextTiles: Tile[][] | null = null;
  const copyRow = (y: number): Tile[] => {
    if (!nextTiles) nextTiles = tiles.slice();
    if (nextTiles[y] === tiles[y]) nextTiles[y] = tiles[y].slice();
    return nextTiles[y];
  };
  for (const { x, y, type, floorMaterial } of updates) {
    if (y < 0 || y >= height || x < 0 || x >= width) continue;
    const current = (nextTiles ?? tiles)[y]?.[x];
    if (!current) continue;
    const material = type === 'floor' ? floorMaterial
      : hasFloorMaterialSurface(type) ? current.floorMaterial : undefined;
    if (current.type === type && current.theme === undefined && current.floorMaterial === material) continue;
    const row = copyRow(y);
    const next: Tile = { ...current, type };
    if (current.type !== type) { delete next.discovered; delete next.discoveredType; }
    delete next.theme;
    if (material) next.floorMaterial = material;
    else delete next.floorMaterial;
    row[x] = next;
  }
  return nextTiles;
}

/** Finish a connected visible floor without flattening room or river geometry. */
export function fillFloorMaterial(
  base: Tile[][], rendered: Tile[][], startX: number, startY: number, material: FloorMaterialId | undefined,
): Tile[][] | null {
  const start = rendered[startY]?.[startX];
  if (!start || !isConnectedFloorGround(start.type) ||
      (start.floorMaterial === material && start.theme === undefined)) return null;
  const visited = new Set<string>();
  const pending = [[startX, startY]];
  let next: Tile[][] | null = null;
  while (pending.length) {
    const [x, y] = pending.pop()!;
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    const tile = rendered[y]?.[x];
    if (!tile || !isConnectedFloorGround(tile.type) || tile.floorMaterial !== start.floorMaterial || tile.theme !== start.theme) continue;
    if (!next) next = base.slice();
    if (next[y] === base[y]) next[y] = base[y].slice();
    const updated = { ...base[y][x] };
    delete updated.theme;
    if (material) updated.floorMaterial = material;
    else delete updated.floorMaterial;
    next[y][x] = updated;
    pending.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return next;
}
