/**
 * Per-generator "tile mix" slider definitions and default-value resolvers.
 *
 * The Generate Map dialog renders one slider per entry in the spec list
 * for the active generator, and forwards the slider values into the
 * generator as `GenerateContext.tileMix`. Defaults are derived from the
 * existing per-theme flavor tables in `poi.ts` so opening the dialog
 * reproduces the legacy generator output until the user actually moves a
 * slider.
 *
 * The `key` of each slider is opaque to the dialog — generators look up
 * the value by name. New sliders can be added here without touching the
 * dialog code.
 */
import { getOpenTerrainFlavor, getRoomsCorridorsFlavor } from './poi';

/** A single slider exposed by the "Tile mix" section of the dialog. */
export interface TileMixSliderSpec {
  /** Stable key used by the generator to read the value. */
  key: string;
  /** User-facing label, e.g. `"Treasure"`. */
  label: string;
  /** Minimum slider value. */
  min: number;
  /** Maximum slider value. */
  max: number;
  /** Slider step. */
  step: number;
  /**
   * Format the live value next to the label (e.g. `"5%"`, `"0.45"`,
   * `"3 caches"`). Used purely for display.
   */
  format: (v: number) => string;
  /**
   * Optional one-line tooltip / hint shown under the slider.
   */
  hint?: string;
}

/**
 * Format a fraction (0..1) as an integer percentage with a `%` suffix.
 * Used by the slider value read-outs.
 */
const fmtPct = (v: number) => `${Math.round(v * 100)}%`;
/** Format a non-negative count as `"N items"` style, falling back gracefully for 0/1. */
const fmtCount = (unit: string) => (v: number) => {
  const n = Math.max(0, Math.round(v));
  return n === 1 ? `1 ${unit}` : `${n} ${unit}s`;
};

/* ── Rooms & Corridors ───────────────────────────────────────── */

/**
 * Build the rooms-and-corridors slider specs for a given theme.
 *
 * Treasure and Trap sliders are clamped so the upper bound equals the
 * theme's default value: in practice these effects only read well at
 * very low densities, so the default sits at the high end and the
 * slider lets the user dial down toward 0. Doors keeps its full 0..1
 * range.
 */
export function getRoomsTileMixSliders(themeId?: string): TileMixSliderSpec[] {
  const defaults = getRoomsDefaultMix(themeId);
  return [
    {
      key: 'treasure',
      label: 'Treasure',
      min: 0,
      max: defaults.treasure,
      step: 0.001,
      format: fmtPct,
      hint: '≈ share of floor cells holding a treasure cache.',
    },
    {
      key: 'trap',
      label: 'Trap / Hazard',
      min: 0,
      max: defaults.trap,
      step: 0.001,
      format: fmtPct,
      hint: '≈ share of floor cells holding a trap or hazard.',
    },
    {
      key: 'doors',
      label: 'Doors',
      min: 0,
      max: 1,
      step: 0.05,
      format: fmtPct,
      hint: 'Fraction of geometric door candidates kept (lower = fewer doors, more open archways).',
    },
  ];
}

/**
 * Static fallback used when the theme is not known (e.g. importers /
 * tests that read the spec list directly). Uses a multiplier of 1.
 */
export const ROOMS_TILE_MIX_SLIDERS: TileMixSliderSpec[] = getRoomsTileMixSliders();

/**
 * Resolve the default mix the rooms-and-corridors slider section should
 * open with for the given theme. Treasure / trap defaults derive from
 * the theme's flavor multipliers and the typical "treasure tiles per
 * floor cell" ratio the legacy generator produces; `doors` defaults to
 * 1 (keep them all) which matches the original behavior.
 */
export function getRoomsDefaultMix(themeId?: string): Record<string, number> {
  const flavor = getRoomsCorridorsFlavor(themeId);
  // The legacy generator places ≈ rooms/3 treasure and rooms/4 trap on a
  // floor area that runs ≈ width*height/4 to ≈ width*height/2 cells on a
  // typical map. Empirically that lands around 3% and 2% of floor cells
  // respectively at multiplier = 1, so we use those as the "no override"
  // baseline and apply the theme multiplier on top.
  return {
    treasure: 0.03 * flavor.treasureMultiplier,
    trap: 0.02 * flavor.trapMultiplier,
    doors: 1,
  };
}

/* ── Open Terrain ─────────────────────────────────────────────── */

export const OPEN_TERRAIN_TILE_MIX_SLIDERS: TileMixSliderSpec[] = [
  {
    key: 'wall',
    label: 'Obstacles',
    min: 0,
    max: 0.4,
    step: 0.01,
    format: fmtPct,
    hint: '≈ share of map area covered by rocks / trees / walls.',
  },
  {
    key: 'water',
    label: 'Water',
    min: 0,
    max: 0.3,
    step: 0.01,
    format: fmtPct,
    hint: '≈ share of map area covered by water.',
  },
  {
    key: 'pillar',
    label: 'Boulders / Pillars',
    min: 0,
    max: 0.1,
    step: 0.005,
    format: fmtPct,
    hint: '≈ share of map area dotted with boulders / pillars.',
  },
  {
    key: 'treasure',
    label: 'Caches',
    min: 0,
    max: 8,
    step: 1,
    format: fmtCount('cache'),
    hint: 'Number of treasure caches placed on open ground.',
  },
];

/**
 * Default open-terrain mix. The wall/water/pillar fractions match the
 * legacy area-relative counts (e.g. wall blobs covered ≈ area * 1/80 *
 * 6 ≈ 7.5% of the map at default density), so leaving the sliders alone
 * reproduces the previous output.
 */
export function getOpenTerrainDefaultMix(themeId?: string): Record<string, number> {
  const flavor = getOpenTerrainFlavor(themeId);
  return {
    wall: 0.075,
    water: 0.032,
    pillar: 0.0083,
    treasure: flavor.treasureCount,
  };
}

/* ── Cavern ───────────────────────────────────────────────────── */

export const CAVERN_TILE_MIX_SLIDERS: TileMixSliderSpec[] = [
  {
    key: 'wall',
    label: 'Wall fill',
    min: 0.3,
    max: 0.6,
    step: 0.01,
    format: fmtPct,
    hint: 'Initial wall fill ratio. Higher = tighter caves; lower = more open caverns.',
  },
  {
    key: 'treasure',
    label: 'Treasure caches',
    min: 0,
    max: 6,
    step: 1,
    format: fmtCount('cache'),
    hint: 'Optional caches scattered across the cave floor.',
  },
  {
    key: 'stairsDown',
    label: 'Stairs Down',
    min: 0,
    max: 1,
    step: 1,
    format: v => (v >= 0.5 ? 'on' : 'off'),
    hint: 'Place a stairs-down tile at the farthest point from the start.',
  },
];

/** Default cavern mix — matches the previous behavior (0.45 fill, no extra caches, stairs on). */
export function getCavernDefaultMix(): Record<string, number> {
  return {
    wall: 0.45,
    treasure: 0,
    stairsDown: 1,
  };
}

export const GENERATOR_TILE_MIX: Record<string, TileMixSliderSpec[]> = {
  'rooms-and-corridors': ROOMS_TILE_MIX_SLIDERS,
  'open-terrain': OPEN_TERRAIN_TILE_MIX_SLIDERS,
  cavern: CAVERN_TILE_MIX_SLIDERS,
};

/**
 * Returns the slider specs the dialog should render for the given
 * generator. Some specs (e.g. rooms-and-corridors treasure/trap caps)
 * depend on the active theme, so callers should prefer this helper
 * over indexing `GENERATOR_TILE_MIX` directly.
 */
export function getTileMixSliders(generatorId: string, themeId?: string): TileMixSliderSpec[] {
  switch (generatorId) {
    case 'rooms-and-corridors':
      return getRoomsTileMixSliders(themeId);
    default:
      return GENERATOR_TILE_MIX[generatorId] ?? [];
  }
}

/** Returns the default mix object the dialog should open with. */
export function getDefaultTileMix(generatorId: string, themeId?: string): Record<string, number> {
  switch (generatorId) {
    case 'rooms-and-corridors':
      return getRoomsDefaultMix(themeId);
    case 'open-terrain':
      return getOpenTerrainDefaultMix(themeId);
    case 'cavern':
      return getCavernDefaultMix();
    default:
      return {};
  }
}
