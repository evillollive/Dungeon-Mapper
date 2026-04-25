import type { TileType } from '../../types/map';

/**
 * Per-theme labels for the points of interest the procedural generators
 * place on the map. Each entry is keyed by the standard generator tile
 * type and provides a short, theme-appropriate name. The generator emits
 * one auto-named `MapNote` for every POI tile it places (start, stairs,
 * treasure, trap, …) so the generated map shows up in the notes panel
 * with sensible labels right out of the box.
 *
 * Themes that don't override a particular tile fall back to the
 * `DEFAULT_POI_LABELS` table, which uses neutral generic names.
 */
export const DEFAULT_POI_LABELS: Partial<Record<TileType, string>> = {
  start: 'Entrance',
  'stairs-down': 'Stairs Down',
  'stairs-up': 'Stairs Up',
  treasure: 'Treasure',
  trap: 'Trap',
};

const THEME_POI_LABELS: Record<string, Partial<Record<TileType, string>>> = {
  dungeon: {
    start: 'Entrance',
    'stairs-down': 'Descent',
    treasure: 'Treasure',
    trap: 'Trap',
  },
  castle: {
    start: 'Gatehouse',
    'stairs-down': 'Cellar Stair',
    // POI labels stay distinct from CASTLE room-kind names in
    // `roomKinds.ts` (which include "Strongroom") so a treasure tile
    // dropped inside a labeled room doesn't read as a second overlapping
    // room in the notes panel.
    treasure: 'Coffer',
    trap: 'Snare',
  },
  starship: {
    start: 'Airlock',
    'stairs-down': 'Lower Deck',
    treasure: 'Cargo Cache',
    trap: 'Hazard',
  },
  alien: {
    start: 'Hatch',
    'stairs-down': 'Tunnel Down',
    treasure: 'Relic',
    trap: 'Spore Trap',
  },
  oldwest: {
    start: 'Saloon Door',
    'stairs-down': 'Cellar',
    treasure: 'Strongbox',
    trap: 'Tripwire',
  },
  steampunk: {
    start: 'Foyer',
    'stairs-down': 'Engine Room',
    treasure: 'Gear Cache',
    trap: 'Steam Vent',
  },
  wilderness: {
    start: 'Trailhead',
    treasure: 'Cache',
    trap: 'Pit Trap',
  },
  cyberpunk: {
    start: 'Entryway',
    'stairs-down': 'Sub-basement',
    treasure: 'Data Cache',
    trap: 'ICE',
  },
  postapocalypse: {
    start: 'Doorway',
    'stairs-down': 'Bunker',
    treasure: 'Scrap Cache',
    trap: 'Snare',
  },
  moderncity: {
    start: 'Lobby',
    'stairs-down': 'Basement',
    // Distinct from the MODERNCITY room-kind "Vault" so a treasure tile
    // in a labeled room doesn't look like a second overlapping room.
    treasure: 'Safe',
    trap: 'Alarm',
  },
  pirate: {
    start: 'Gangplank',
    'stairs-down': 'Hold',
    treasure: 'Treasure Chest',
    trap: 'Snare',
  },
  desert: {
    start: 'Oasis',
    treasure: 'Cache',
    trap: 'Sand Pit',
  },
};

/**
 * Per-theme generation tweaks for the rooms-and-corridors generator. These
 * are deliberately small nudges so the generator's overall character is
 * unchanged; they just bias the POI mix toward what each theme's setting
 * tends to feature. Themes not listed get the default flavoring.
 */
export interface RoomsCorridorsFlavor {
  /** Multiplier applied to the trap count (0 = never place traps). */
  trapMultiplier: number;
  /** Multiplier applied to the treasure count. */
  treasureMultiplier: number;
  /** Whether the generator should place a `stairs-down` POI. */
  placeStairsDown: boolean;
}

const DEFAULT_ROOMS_FLAVOR: RoomsCorridorsFlavor = {
  trapMultiplier: 1,
  treasureMultiplier: 1,
  placeStairsDown: true,
};

const ROOMS_FLAVORS: Record<string, Partial<RoomsCorridorsFlavor>> = {
  // Built / inhabited spaces tend to have fewer "trap" tiles and treat
  // the basement door as the equivalent of stairs-down.
  moderncity: { trapMultiplier: 0.25 },
  oldwest: { trapMultiplier: 0.5 },
  pirate: { trapMultiplier: 0.5, treasureMultiplier: 1.5 },
  // Sci-fi locales use hazards instead of medieval traps; keep the count
  // but lean into treasure (cargo) a touch.
  starship: { treasureMultiplier: 1.25 },
  cyberpunk: { trapMultiplier: 0.75, treasureMultiplier: 1.25 },
  alien: { treasureMultiplier: 1.25 },
  // Castles favor treasure rooms over traps.
  castle: { trapMultiplier: 0.75, treasureMultiplier: 1.25 },
  // Steampunk dungeons keep the trap mix.
  steampunk: {},
  // The dungeon theme is the baseline.
  dungeon: {},
};

export function getRoomsCorridorsFlavor(themeId?: string): RoomsCorridorsFlavor {
  if (!themeId) return DEFAULT_ROOMS_FLAVOR;
  const overrides = ROOMS_FLAVORS[themeId];
  if (!overrides) return DEFAULT_ROOMS_FLAVOR;
  return { ...DEFAULT_ROOMS_FLAVOR, ...overrides };
}

/**
 * Per-theme tweaks for the open-terrain generator. Outdoor / open themes
 * skip the indoor POIs (no `stairs-down`).
 */
export interface OpenTerrainFlavor {
  treasureCount: number;
}

const OPEN_TERRAIN_FLAVORS: Record<string, OpenTerrainFlavor> = {
  wilderness: { treasureCount: 2 },
  desert: { treasureCount: 1 },
  postapocalypse: { treasureCount: 3 },
};

const DEFAULT_OPEN_FLAVOR: OpenTerrainFlavor = { treasureCount: 1 };

export function getOpenTerrainFlavor(themeId?: string): OpenTerrainFlavor {
  if (!themeId) return DEFAULT_OPEN_FLAVOR;
  return OPEN_TERRAIN_FLAVORS[themeId] ?? DEFAULT_OPEN_FLAVOR;
}

/**
 * Resolve the theme-flavored label for a POI tile. The optional `index`
 * is used to disambiguate multiple POIs of the same type (e.g.
 * `Treasure 1`, `Treasure 2`). When only one of a kind is placed, the
 * caller can pass `index = undefined` to skip the suffix.
 */
export function poiLabelFor(
  themeId: string | undefined,
  tile: TileType,
  index?: number
): string {
  const themed = themeId ? THEME_POI_LABELS[themeId]?.[tile] : undefined;
  const base = themed ?? DEFAULT_POI_LABELS[tile] ?? tile;
  if (typeof index === 'number' && index > 0) return `${base} ${index}`;
  return base;
}
