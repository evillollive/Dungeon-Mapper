import type { MapNote, Tile } from '../../types/map';

/** Inputs every generator receives. Width/height are clamped by the caller. */
export interface GenerateContext {
  width: number;
  height: number;
  /** 32-bit unsigned seed for the PRNG. */
  seed: number;
  /**
   * Knob roughly centered at 1.0 controlling how busy the map feels.
   * For rooms-and-corridors this scales the room count; for open terrain
   * it scales blob counts; for caverns it nudges the wall-fill ratio.
   * Generators clamp to a sensible range internally.
   */
  density: number;
  /**
   * Optional theme id (e.g. `'dungeon'`, `'wilderness'`). Generators use it
   * to bias their POI mix and to label auto-generated notes with
   * theme-appropriate names. Generators must still produce valid output for
   * unknown / missing themes by falling back to neutral defaults.
   */
  themeId?: string;
  /**
   * Optional per-tile-type proportion overrides driven by the dialog's
   * "Tile mix" sliders. Each generator interprets the keys it understands
   * (e.g. rooms-and-corridors reads `treasure`, `trap`, `doors`,
   * `secretDoors`; open terrain reads `wall`, `water`, `pillar`,
   * `treasure`, `trap`, `areas`; cavern reads `wall`, `treasure`, `trap`,
   * `water`, `areas`, `stairsDown`). Values are 0..1 fractions whose
   * exact meaning is generator-specific (typically a fraction of the
   * floor / placeable cells, or — for cavern walls — the initial fill
   * ratio). Missing keys fall back to the per-theme defaults so passing
   * an empty / undefined `tileMix` reproduces legacy behavior.
   */
  tileMix?: Partial<Record<string, number>>;
  /**
   * Optional per-room labeling. When `true` (and the active theme has a
   * room-archetype palette in `roomKinds.ts`), the rooms-and-corridors
   * generator emits one auto-named `MapNote` per carved room — Bridge,
   * Great Hall, Cargo Bay, etc. — with `noteId`s stamped onto the room
   * centers. When `false` (or the theme has no palette) rooms remain
   * unlabeled, matching the legacy behavior.
   */
  labelRooms?: boolean;
  /**
   * Optional id of the corridor strategy to use (e.g. `'straight-l'`,
   * `'mst'`, `'loops'`, `'winding'`). Only the rooms-and-corridors
   * generator interprets this — other generators ignore it. Unknown /
   * missing values fall back to the default strategy, which reproduces
   * the legacy output exactly so existing seeds are unaffected.
   */
  corridorStrategy?: string;
  /**
   * Optional 0..1 knob controlling how straight corridors are within the
   * selected strategy. 0 = maximum bends (Z-shapes), 0.5 = default legacy
   * behavior, 1 = bias toward straight L-bends. Only rooms-and-corridors
   * interprets this; other generators ignore it.
   */
  corridorContinuity?: number;
  /**
   * Optional id of the dungeon shape to use (e.g. `'rectangle'`, `'circle'`,
   * `'diamond'`). Only the rooms-and-corridors generator interprets this —
   * other generators ignore it. The shape constrains where rooms can be
   * placed by applying a boolean mask to the map grid. Unknown / missing
   * values fall back to `'rectangle'` (full grid), preserving legacy output.
   */
  dungeonShape?: string;
  /**
   * Optional 0..1 fraction controlling dead-end corridor removal.
   * 0 = no removal (legacy), 1 = remove all dead ends. Only
   * rooms-and-corridors interprets this; other generators ignore it.
   */
  deadEndRemoval?: number;
}

/** A generator's output — pre-built tile grid plus optional notes. */
export interface GeneratedMap {
  tiles: Tile[][];
  notes: MapNote[];
  width: number;
  height: number;
}

export interface MapGenerator {
  id: string;
  name: string;
  /** Short helper text shown next to the algorithm dropdown. */
  description: string;
  /**
   * Optional whitelist of theme ids this generator was designed for. Used
   * by `pickGeneratorForTheme` to choose a sensible default; the user can
   * still pick any generator for any theme from the dropdown.
   */
  preferredThemes?: string[];
  generate(ctx: GenerateContext): GeneratedMap;
}
