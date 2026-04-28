/**
 * Light Source visibility computation.
 *
 * Each light source projects a field-of-view from its origin cell using the
 * same recursive shadowcasting algorithm used for player tokens and the GM
 * FOV tool. Walls block light propagation exactly as they block sight, so
 * torches placed in corridors don't "bleed" through walls into adjacent rooms.
 *
 * The resulting union set is consumed by the fog-of-war renderer: when
 * `dynamicFogEnabled` is true, cells inside any light source's FOV are
 * treated as visible (rendered clear) regardless of whether a player token
 * can see them directly.
 */

import type { Tile, LightSource } from '../types/map';
import { computeFOV } from './fov';

/**
 * Compute the union of all light-source FOV sets.
 *
 * Returns `null` when the array is empty or absent (cheap fast-path for
 * maps without any lights placed), or a `Set<string>` of `"x,y"` keys
 * for every cell illuminated by at least one light source.
 */
export function computeLightVisible(
  tiles: Tile[][],
  lightSources: LightSource[] | undefined,
): Set<string> | null {
  if (!lightSources || lightSources.length === 0) return null;

  const union = new Set<string>();
  for (const ls of lightSources) {
    const fov = computeFOV(tiles, ls.x, ls.y, ls.radius);
    for (const key of fov) {
      union.add(key);
    }
  }
  return union.size > 0 ? union : null;
}
