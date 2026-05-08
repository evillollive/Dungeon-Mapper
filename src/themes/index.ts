import type { BuiltInTileType, TileType } from '../types/map';

export interface TileDrawContext {
  getTileBaseType(x: number, y: number): BuiltInTileType | undefined;
}

export interface TileTheme {
  id: string;
  name: string;
  tiles: { id: TileType; label: string }[];
  emptyTileId: TileType;
  cssVars: Record<string, string>;
  tileColors: Record<BuiltInTileType, string> & Record<string, string>;
  /** Per-theme grid line colour. Replaces the old hardcoded #2d3561. */
  gridColor: string;
  /** Optional per-theme tint for the paper texture layer. */
  paperTint?: string;
  drawTile(ctx: CanvasRenderingContext2D, id: TileType, x: number, y: number, size: number, context?: TileDrawContext): void;
}

import { dungeonTheme } from './dungeon';
import { castleTheme } from './castle';
import { starshipTheme } from './starship';
import { alienTheme } from './alien';
import { oldwestTheme } from './oldwest';
import { steampunkTheme } from './steampunk';
import { wildernessTheme } from './wilderness';
import { cyberpunkTheme } from './cyberpunk';
import { postapocalypseTheme } from './postapocalypse';
import { moderncityTheme } from './moderncity';
import { pirateTheme } from './pirate';
import { desertTheme } from './desert';
import { ancientTheme } from './ancient';

export const THEME_REGISTRY: Record<string, TileTheme> = {
  dungeon: dungeonTheme,
  castle: castleTheme,
  starship: starshipTheme,
  alien: alienTheme,
  oldwest: oldwestTheme,
  steampunk: steampunkTheme,
  wilderness: wildernessTheme,
  cyberpunk: cyberpunkTheme,
  postapocalypse: postapocalypseTheme,
  moderncity: moderncityTheme,
  pirate: pirateTheme,
  desert: desertTheme,
  ancient: ancientTheme,
};

// Themes are exposed to the UI sorted alphabetically by display name so the
// theme dropdown is easy to scan. The registry above keeps insertion order
// for any code that relies on it.
export const THEME_LIST = Object.values(THEME_REGISTRY).sort((a, b) =>
  a.name.localeCompare(b.name)
);

// Legacy theme-id aliases. Older saved maps reference previous combined
// themes; resolve those to one of the new split themes so existing content
// keeps rendering. "fantasy" → "dungeon" (split into Dungeon + Castle), and
// "scifi" → "starship" (split into Starship + Alien World).
const THEME_ALIASES: Record<string, string> = {
  fantasy: 'dungeon',
  scifi: 'starship',
};

export function getTheme(id: string): TileTheme {
  const resolved = THEME_ALIASES[id] ?? id;
  return THEME_REGISTRY[resolved] ?? dungeonTheme;
}

// ── Per-theme paper tint colours ──────────────────────────────────────────
// Each theme gets a default warm/cool tint for the parchment texture layer.
// Themes may also set `paperTint` on their definition to override these.
const DEFAULT_PAPER_TINTS: Record<string, string> = {
  dungeon:          '#d4b896', // warm parchment
  castle:           '#c8b898', // aged stone cream
  starship:         '#a0b0c0', // cool steel blue
  alien:            '#8bbc8b', // eerie green
  oldwest:          '#d2b48c', // dusty tan
  steampunk:        '#c9a87c', // brass-stained sepia
  wilderness:       '#a8c090', // mossy green
  cyberpunk:        '#7080a0', // neon-dimmed slate
  postapocalypse:   '#b0a090', // ash grey-brown
  moderncity:       '#b0b8c0', // concrete grey
  pirate:           '#c8a870', // salt-stained gold
  desert:           '#dcc09c', // sand dune
  ancient:          '#c8b490', // weathered papyrus
};

/**
 * Resolve the paper tint colour for a given theme id. Checks the theme
 * definition's `paperTint` first, falls back to the built-in tint table,
 * and finally to a neutral warm parchment if nothing matches.
 */
export function getPaperTint(themeId: string): string {
  const theme = getTheme(themeId);
  return theme.paperTint ?? DEFAULT_PAPER_TINTS[themeId] ?? '#d4b896';
}
