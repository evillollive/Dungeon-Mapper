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

import { dungeonTheme } from './dungeon';
import { castleTheme } from './castle';
import { scifiTheme } from './scifi';
import { oldwestTheme } from './oldwest';
import { steampunkTheme } from './steampunk';
import { wildernessTheme } from './wilderness';
import { cyberpunkTheme } from './cyberpunk';
import { postapocalypseTheme } from './postapocalypse';
import { moderncityTheme } from './moderncity';

export const THEME_REGISTRY: Record<string, TileTheme> = {
  dungeon: dungeonTheme,
  castle: castleTheme,
  scifi: scifiTheme,
  oldwest: oldwestTheme,
  steampunk: steampunkTheme,
  wilderness: wildernessTheme,
  cyberpunk: cyberpunkTheme,
  postapocalypse: postapocalypseTheme,
  moderncity: moderncityTheme,
};

export const THEME_LIST = Object.values(THEME_REGISTRY);

// Legacy theme-id aliases. Older saved maps reference the previous combined
// "fantasy" theme; resolve those to the new "dungeon" theme so existing
// content keeps rendering after the split into Castle and Dungeon.
const THEME_ALIASES: Record<string, string> = {
  fantasy: 'dungeon',
};

export function getTheme(id: string): TileTheme {
  const resolved = THEME_ALIASES[id] ?? id;
  return THEME_REGISTRY[resolved] ?? dungeonTheme;
}
