import type { DungeonMap, River, RoomShape, Tile } from '../types/map';
import { rasterizeRoomShapes } from './roomRasterizer';
import { rasterizeRivers } from './riverRasterizer';
import { hasFloorMaterialSurface } from './floorMaterials';

/**
 * Build the tile grid used for visual rendering/export.
 *
 * The saved map keeps vector layers (currently roomShapes, later rivers)
 * separate from base tiles. Rendering code should consume this derived grid
 * so every output path sees the same rasterized geometry.
 */
export function deriveRenderableTiles(map: DungeonMap): Tile[][] {
  return deriveRenderableTilesFromBase(map.tiles, map.roomShapes ?? [], map.rivers ?? [], map.meta.width, map.meta.height);
}

export function deriveRenderableTilesFromBase(
  baseTiles: Tile[][],
  roomShapes: readonly RoomShape[],
  rivers: readonly River[],
  width: number,
  height: number,
): Tile[][] {
  const withRooms = roomShapes.length === 0 ? baseTiles : rasterizeRoomShapes(baseTiles, [...roomShapes], width, height);
  const rendered = rivers.length === 0 ? withRooms : rasterizeRivers(withRooms, rivers, width, height);
  if (rendered === baseTiles) return rendered;
  // A finish decorates the final floor at this cell, never a wall or water overlay.
  return rendered.map((row, y) => row.map((tile, x) => {
    const material = baseTiles[y]?.[x]?.floorMaterial;
    return hasFloorMaterialSurface(tile.type) && material !== undefined ? { ...tile, floorMaterial: material } : tile;
  }));
}
