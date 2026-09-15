import type { BuiltInTileType, ViewMode } from '../types/map';
import type { TileDrawContext } from './index';
import { drawFolioShapes, folioShapesSVG } from './folio-v1/art';
import { printTileShapes } from './print-companion-v1/art';

export const PRINT_BG = '#ffffff';
export const PRINT_FG = '#000000';
export const PRINT_GRID = '#b8b8b8';

export function printFogFill(viewMode: ViewMode, explored = false): string {
  const alpha = explored ? (viewMode === 'player' ? 0.55 : 0.35) : (viewMode === 'player' ? 1 : 0.55);
  return `rgba(107, 107, 107, ${alpha})`;
}

/** Audience projection and custom-tile semantics are resolved by the caller. */
export function drawPrintTile(
  ctx: CanvasRenderingContext2D,
  type: BuiltInTileType,
  x: number,
  y: number,
  size: number,
  context?: TileDrawContext,
): void {
  drawFolioShapes(ctx, printTileShapes(type, x, y, context), x, y, size);
}

export function printTileSVG(type: BuiltInTileType, x: number, y: number, size: number, context?: TileDrawContext): string {
  return folioShapesSVG(printTileShapes(type, x, y, context), x, y, size);
}
