import type { TileTheme } from '../index';
import { dungeonTheme } from '../dungeon';
import { isBuiltInTileType } from '../../types/map';
import { drawFolioShapes, FOLIO_COLORS, FOLIO_THEME_ID, folioShapes, folioShapesSVG } from './art';
import { floorMaterialShapes } from './materials';
import { hasFloorMaterialSurface } from '../../utils/floorMaterials';
import type { BuiltInTileType } from '../../types/map';
import type { TileDrawContext } from '../index';

function shapesWithMaterial(type: BuiltInTileType, x: number, y: number, size: number, context?: TileDrawContext) {
  const base = folioShapes(type, x, y, size, context);
  const material = hasFloorMaterialSurface(type) ? floorMaterialShapes(context?.getFloorMaterial?.(x, y), x, y, size) : undefined;
  if (!material) return base;
  if (type === 'floor') return material;
  // Preserve the symbol while replacing its ordinary flagstone substrate.
  return [...material, ...base.slice(folioShapes('floor', x, y, size).length)];
}

export const folioTheme: TileTheme = {
  ...dungeonTheme,
  id: FOLIO_THEME_ID,
  name: 'Dungeon Folio v1',
  tiles: dungeonTheme.tiles.map(tile => tile.id === 'floor' ? { ...tile, label: 'Floor' } : tile),
  tileColors: FOLIO_COLORS,
  gridColor: '#777e7028',
  paperTint: '#b7af94',
  includesTileGlyphs: true,
  drawTile(ctx, type, x, y, size, context) {
    if (!isBuiltInTileType(type)) {
      dungeonTheme.drawTile(ctx, type, x, y, size, context);
      return;
    }
    drawFolioShapes(ctx, shapesWithMaterial(type, x, y, size, context), x, y, size);
  },
  tileSVG(type, x, y, size, context) {
    return isBuiltInTileType(type)
      ? folioShapesSVG(shapesWithMaterial(type, x, y, size, context), x, y, size)
      : undefined;
  },
};
