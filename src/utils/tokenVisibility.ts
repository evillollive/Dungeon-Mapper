import type { Token } from '../types/map';

/**
 * Returns `true` if any cell of the token's footprint is currently fogged.
 * Used to decide whether a token should be hidden from the player view —
 * a multi-cell monster must stay hidden if *any* of its cells is fogged so
 * a partially-revealed room doesn't leak its existence.
 *
 * When dynamic fog is active (`playerVisible` is provided), a token is
 * visible if *all* of its footprint cells are currently in view OR
 * previously explored. This ensures monsters in explored-but-not-visible
 * areas still show (dimmed) while those in never-seen areas stay hidden.
 */
export function isTokenFogged(
  token: Token,
  fog: boolean[][] | undefined,
  playerVisible?: Set<string> | null,
  explored?: boolean[][] | null,
): boolean {
  if (!fog) return false;
  const sz = Math.max(1, Math.floor(token.size ?? 1));

  if (playerVisible) {
    // Dynamic fog mode: token is visible if ALL of its cells are either
    // currently visible, previously explored, or manually revealed.
    for (let dy = 0; dy < sz; dy++) {
      for (let dx = 0; dx < sz; dx++) {
        const cx = token.x + dx;
        const cy = token.y + dy;
        // Skip cells already manually revealed (fog === false).
        if (!fog[cy]?.[cx]) continue;
        const key = `${cx},${cy}`;
        if (playerVisible.has(key)) continue;
        if (explored?.[cy]?.[cx]) continue;
        return true; // at least one cell is truly hidden
      }
    }
    return false;
  }

  // Classic fog: any fogged cell hides the whole token.
  for (let dy = 0; dy < sz; dy++) {
    for (let dx = 0; dx < sz; dx++) {
      if (fog[token.y + dy]?.[token.x + dx]) return true;
    }
  }
  return false;
}
