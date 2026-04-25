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
