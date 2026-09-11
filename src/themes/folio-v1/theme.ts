import type { TileTheme } from '../index';
import { dungeonTheme } from '../dungeon';
import { isBuiltInTileType } from '../../types/map';
import { drawFolioShapes, FOLIO_COLORS, FOLIO_THEME_ID, folioShapes, folioShapesSVG } from './art';

export const folioTheme: TileTheme = {
  ...dungeonTheme,
  id: FOLIO_THEME_ID,
  name: 'Dungeon Folio v1',
  tileColors: FOLIO_COLORS,
  gridColor: '#777e7028',
  paperTint: '#b7af94',
  includesTileGlyphs: true,
  drawTile(ctx, type, x, y, size, context) {
    if (!isBuiltInTileType(type)) {
      dungeonTheme.drawTile(ctx, type, x, y, size, context);
      return;
    }
    drawFolioShapes(ctx, folioShapes(type, x, y, size, context), x, y, size);
  },
  tileSVG(type, x, y, size, context) {
    return isBuiltInTileType(type)
      ? folioShapesSVG(folioShapes(type, x, y, size, context), x, y, size)
      : undefined;
  },
};
