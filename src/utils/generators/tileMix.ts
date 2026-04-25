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
      key: 'roomSize',
      label: 'Room size',
      min: 0.5,
      max: 1.5,
      step: 0.05,
      format: v => `${v.toFixed(2)}×`,
      hint: 'Scales room dimensions. Lower = tight cells; higher = sprawling halls. Density still controls how many rooms fit.',
    },
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
    roomSize: 1,
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
  {
    key: 'trap',
    label: 'Traps / Hazards',
    min: 0,
    max: 0.05,
    step: 0.001,
    format: fmtPct,
    hint: '≈ share of map area holding a trap or hazard.',
  },
  {
    key: 'areas',
    label: 'Named areas',
    min: 0,
    max: 8,
    step: 1,
    format: fmtCount('area'),
    hint: 'Number of designated outdoor areas (clearings, watering holes, …) labeled in the notes panel.',
  },
];

/**
 * Default open-terrain mix. The wall/water/pillar fractions match the
 * legacy area-relative counts (e.g. wall blobs covered ≈ area * 1/80 *
 * 6 ≈ 7.5% of the map at default density), so leaving the sliders alone
 * reproduces the previous output for those keys; trap and named-area
 * defaults are set so a default-density wilderness map gets a few
 * pit traps and a handful of labeled clearings out of the box.
 */
export function getOpenTerrainDefaultMix(themeId?: string): Record<string, number> {
  const flavor = getOpenTerrainFlavor(themeId);
  return {
    wall: 0.075,
    water: 0.032,
    pillar: 0.0083,
    treasure: flavor.treasureCount,
    // Default ≈ area / 400 × theme multiplier in the generator → as a
    // map-area fraction that's ~0.0025 × multiplier. Expose the
    // baseline so the slider opens at "a few hazards" instead of 0.
    trap: 0.0025 * flavor.trapMultiplier,
    // Roughly matches the generator's density-scaled default of 3 at
    // density 1.0; the generator clamps to detected pocket count.
    areas: 3,
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
    max: 12,
    step: 1,
    format: fmtCount('cache'),
    hint: 'Caches scattered across the cave floor.',
  },
  {
    key: 'trap',
    label: 'Traps / Hazards',
    min: 0,
    max: 0.05,
    step: 0.001,
    format: fmtPct,
    hint: '≈ share of cave floor holding a trap or hazard.',
  },
  {
    key: 'water',
    label: 'Water pools',
    min: 0,
    max: 0.15,
    step: 0.005,
    format: fmtPct,
    hint: '≈ share of cave floor flooded with water pools / streams.',
  },
  {
    key: 'areas',
    label: 'Named chambers',
    min: 0,
    max: 8,
    step: 1,
    format: fmtCount('chamber'),
    hint: 'Designated cave chambers labeled in the notes panel (Grand Chamber, Underground Pool, …).',
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

/**
 * Default cavern mix. Treasure / trap / water / area defaults sit at
 * the generator's density-scaled values for a default-density map
 * (~density 1.0, 32×32 area), so opening the dialog and clicking
 * Generate gives the populated cave system the user expects. Sliders
 * still let the user dial them all the way down for the legacy "empty
 * cavern" look.
 */
export function getCavernDefaultMix(): Record<string, number> {
  return {
    wall: 0.45,
    // Match the in-generator default at density ~1: floor area / 220
    // works out to roughly 4–6 caches on a typical map.
    treasure: 4,
    // ~1.5% of floor cells at density 1 — a handful of hazards on a
    // default map, scaling with the slider.
    trap: 0.015,
    // ~2.5% of floor cells covered by water pools (a couple of small
    // puddles on a typical cave).
    water: 0.025,
    // Up to 3 labeled chambers by default; the generator clamps to
    // detected pocket count, so small caves get fewer.
    areas: 3,
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
