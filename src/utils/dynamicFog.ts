/**
 * Dynamic Fog of War — compute the union FOV from all player tokens and
 * derive 3-state fog: hidden / explored / visible.
 *
 * "Visible" cells are those currently in line-of-sight of at least one
 * player token. "Explored" cells have been visible in the past but are no
 * longer in direct line-of-sight. "Hidden" cells have never been seen.
 *
 * The explored grid is persisted on the map so exploration survives
 * round-trips. The visible set is ephemeral (recomputed each render).
 */

import type { Tile, Token } from '../types/map';
import { computeFOV } from './fov';

/**
 * Compute the union of FOV sets from every player-kind token on the map.
 * Returns `null` if there are no player tokens.
 */
export function computePlayerFOV(
  tiles: Tile[][],
  tokens: Token[],
): Set<string> | null {
  const players = tokens.filter(t => t.kind === 'player');
  if (players.length === 0) return null;

  const union = new Set<string>();
  for (const token of players) {
    const sz = Math.max(1, Math.floor(token.size ?? 1));
    // Compute FOV from each cell of the token's footprint and merge.
    // For single-cell tokens this is just one call; for multi-cell tokens
    // it ensures the full footprint contributes to the visible area.
    for (let dy = 0; dy < sz; dy++) {
      for (let dx = 0; dx < sz; dx++) {
        const fov = computeFOV(tiles, token.x + dx, token.y + dy);
        for (const key of fov) {
          union.add(key);
        }
      }
    }
  }
  return union;
}

/**
 * Merge newly-visible cells into the explored grid, returning a new grid
 * only if at least one cell was newly explored (otherwise returns the
 * original reference so React can skip re-renders via identity check).
 */
export function mergeExplored(
  explored: boolean[][],
  visible: Set<string>,
  width: number,
  height: number,
): boolean[][] {
  let mutated = false;
  let result: boolean[][] | null = null;

  for (const key of visible) {
    const comma = key.indexOf(',');
    const x = parseInt(key.substring(0, comma), 10);
    const y = parseInt(key.substring(comma + 1), 10);
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (!explored[y][x]) {
      if (!mutated) {
        // Lazy-copy on first mutation.
        result = explored.map(row => row.slice());
        mutated = true;
      }
      result![y][x] = true;
    }
  }
  return mutated ? result! : explored;
}
