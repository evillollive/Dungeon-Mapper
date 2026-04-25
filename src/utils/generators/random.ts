/**
 * Tiny seedable PRNG used by the map generators so the same `(seed, options)`
 * pair always produces the same map. Implemented as mulberry32 — ~10 lines,
 * well-distributed for our purposes (placing rooms, picking POIs), and zero
 * dependency.
 */
export interface Rng {
  /** Float in `[0, 1)`. */
  next(): number;
  /** Integer in `[min, max]` (inclusive on both ends). */
  int(min: number, max: number): number;
  /** Pick one element of an array. Throws if the array is empty. */
  pick<T>(items: readonly T[]): T;
  /** Coin flip — true with probability `p` (default 0.5). */
  chance(p?: number): boolean;
}

/** Hash an arbitrary string into a 32-bit unsigned seed. */
export function seedFromString(s: string): number {
  // FNV-1a 32-bit hash — small, deterministic, and good enough for seeding.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Generate a fresh random 32-bit seed using `Math.random`. */
export function randomSeed(): number {
  return (Math.random() * 0x100000000) >>> 0;
}

/** Render a seed as an unpadded lowercase hex string for display in the UI. */
export function seedToString(seed: number): string {
  return (seed >>> 0).toString(16);
}

/** Parse a user-entered seed string. Accepts hex (`a1b2`) or decimal digits. */
export function parseSeed(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return randomSeed();
  // Pure decimal: parse as a number first so "12345" gives the same seed
  // every time regardless of whether the user thinks of it as hex.
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    if (Number.isFinite(n)) return (n >>> 0) || seedFromString(trimmed);
  }
  // Hex (with optional 0x prefix)
  if (/^(0x)?[0-9a-fA-F]+$/.test(trimmed)) {
    const n = parseInt(trimmed.replace(/^0x/i, ''), 16);
    if (Number.isFinite(n)) return (n >>> 0) || seedFromString(trimmed);
  }
  return seedFromString(trimmed);
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    int(min, max) {
      if (max < min) [min, max] = [max, min];
      return min + Math.floor(next() * (max - min + 1));
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('pick: empty array');
      return items[Math.floor(next() * items.length)];
    },
    chance(p = 0.5) {
      return next() < p;
    },
  };
}
