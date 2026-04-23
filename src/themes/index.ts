import type { TileType } from '../types/map';

export interface TileTheme {
  id: string;
  name: string;
  tiles: { id: TileType; label: string }[];
  emptyTileId: TileType;
  cssVars: Record<string, string>;
  tileColors: Record<TileType, string>;
  drawTile(ctx: CanvasRenderingContext2D, id: TileType, x: number, y: number, size: number): void;
}

import { fantasyTheme } from './fantasy';
import { scifiTheme } from './scifi';
import { oldwestTheme } from './oldwest';
import { steampunkTheme } from './steampunk';
import { wildernessTheme } from './wilderness';
import { cyberpunkTheme } from './cyberpunk';
import { postapocalypseTheme } from './postapocalypse';

export const THEME_REGISTRY: Record<string, TileTheme> = {
  fantasy: fantasyTheme,
  scifi: scifiTheme,
  oldwest: oldwestTheme,
  steampunk: steampunkTheme,
  wilderness: wildernessTheme,
  cyberpunk: cyberpunkTheme,
  postapocalypse: postapocalypseTheme,
};

export const THEME_LIST = Object.values(THEME_REGISTRY);

export function getTheme(id: string): TileTheme {
  return THEME_REGISTRY[id] ?? fantasyTheme;
}
