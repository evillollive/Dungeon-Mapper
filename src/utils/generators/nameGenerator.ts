/**
 * Procedural name generator for dungeon rooms and points of interest.
 *
 * Generates proper-name flavor text to supplement the room-kind system in
 * `roomKinds.ts`. A room kind like "Crypt" becomes "Crypt of the Ashen
 * Veil" or "The Iron Crypt" — the kind drives gameplay (treasure bias,
 * pillar placement) while the generated name is pure flavor.
 *
 * Implementation: syllable chaining with per-theme syllable and word tables.
 * No training data or Markov chains needed — the tables are small and
 * handcrafted for each theme aesthetic.
 */
import type { Rng } from './random';

// ---------------------------------------------------------------------------
// Theme word tables
// ---------------------------------------------------------------------------

interface ThemeWords {
  /** Adjectives / epithets: "Crimson", "Forgotten", "Iron" */
  adjectives: readonly string[];
  /** Abstract nouns: "Dawn", "Shadow", "Flame" */
  nouns: readonly string[];
  /** Optional proper-name fragments: "Khar", "Vel", "Thun" */
  names: readonly string[];
}

const GENERIC: ThemeWords = {
  adjectives: ['Ancient', 'Hidden', 'Lost', 'Silent', 'Forgotten', 'Dark', 'Hollow', 'Broken'],
  nouns: ['Shadow', 'Stone', 'Dust', 'Bone', 'Iron', 'Flame', 'Frost', 'Void'],
  names: ['Khar', 'Vel', 'Thun', 'Mira', 'Draven', 'Syl', 'Aldric', 'Orm'],
};

const THEME_WORDS: Record<string, ThemeWords> = {
  dungeon: {
    adjectives: ['Ashen', 'Crimson', 'Forgotten', 'Cursed', 'Sunken', 'Blighted', 'Dark', 'Silent'],
    nouns: ['Veil', 'Shadow', 'Bone', 'Fang', 'Abyss', 'Wrath', 'Dread', 'Doom'],
    names: ['Morath', 'Kael', 'Theron', 'Voss', 'Draven', 'Orm', 'Grim', 'Skar'],
  },
  castle: {
    adjectives: ['Royal', 'Golden', 'Iron', 'Silver', 'Crimson', 'Noble', 'Brave', 'Grand'],
    nouns: ['Crown', 'Shield', 'Dawn', 'Rose', 'Lion', 'Throne', 'Banner', 'Crest'],
    names: ['Aldric', 'Beren', 'Caelum', 'Elara', 'Gareth', 'Lyanna', 'Rowan', 'Thane'],
  },
  starship: {
    adjectives: ['Quantum', 'Stellar', 'Void', 'Plasma', 'Cryo', 'Neural', 'Zero-G', 'Dark'],
    nouns: ['Horizon', 'Nebula', 'Core', 'Pulse', 'Vertex', 'Drift', 'Array', 'Signal'],
    names: ['Helios', 'Vega', 'Orion', 'Nova', 'Cygnus', 'Atlas', 'Rhea', 'Juno'],
  },
  alien: {
    adjectives: ['Xenic', 'Chitinous', 'Spawning', 'Void-Touched', 'Bio-Luminous', 'Psionic', 'Hive', 'Parasitic'],
    nouns: ['Nexus', 'Clutch', 'Brood', 'Spore', 'Maw', 'Tendril', 'Thorax', 'Husk'],
    names: ['Zyx', 'Vho', 'Kri', 'Thal', 'Xen', 'Qor', 'Zhil', 'Nyx'],
  },
  steampunk: {
    adjectives: ['Brass', 'Clockwork', 'Steam-Driven', 'Copper', 'Pneumatic', 'Iron', 'Gilded', 'Rustic'],
    nouns: ['Gear', 'Piston', 'Cog', 'Furnace', 'Bellows', 'Turbine', 'Anvil', 'Spring'],
    names: ['Ashford', 'Cogsworth', 'Whitmore', 'Thatch', 'Gearhart', 'Bramley', 'Tinkerton', 'Wren'],
  },
  cyberpunk: {
    adjectives: ['Neon', 'Chrome', 'Glitched', 'Black-Market', 'Encrypted', 'Augmented', 'Dark-Net', 'Overclocked'],
    nouns: ['Circuit', 'Node', 'Cipher', 'Grid', 'Datastream', 'Ghost', 'Firewall', 'Virus'],
    names: ['Zero', 'Nyx', 'Vex', 'Raze', 'Spike', 'Glitch', 'Hex', 'Null'],
  },
  moderncity: {
    adjectives: ['Metropolitan', 'Downtown', 'Underground', 'Uptown', 'Abandoned', 'Condemned', 'Corporate', 'Vintage'],
    nouns: ['District', 'Block', 'Tower', 'Alley', 'Plaza', 'Junction', 'Precinct', 'Quarter'],
    names: ['Marlowe', 'Chen', 'Rivera', 'Blake', 'Santos', 'Kim', 'Weber', 'Park'],
  },
  pirate: {
    adjectives: ['Crimson', 'Saltwater', 'Cursed', 'Storm-Torn', 'Barnacled', 'Tidal', 'Plundered', 'Ghostly'],
    nouns: ['Tide', 'Anchor', 'Skull', 'Reef', 'Maelstrom', 'Cutlass', 'Doubloon', 'Kraken'],
    names: ['Blackbeard', 'Flint', 'Bones', 'Hook', 'Silver', 'Drake', 'Teach', 'Kidd'],
  },
  oldwest: {
    adjectives: ['Dusty', 'Iron', 'Rattlesnake', 'Sunbaked', 'Lawless', 'Frontier', 'Copper', 'Red'],
    nouns: ['Canyon', 'Mesa', 'Gulch', 'Ridge', 'Trail', 'Bluff', 'Hollow', 'Creek'],
    names: ['Cassidy', 'McCree', 'Earp', 'Dalton', 'Garrett', 'Ringo', 'Holliday', 'Colt'],
  },
  ancient: {
    adjectives: ['Eternal', 'Obsidian', 'Sacred', 'Sunken', 'Ruined', 'Gilded', 'Petrified', 'Sealed'],
    nouns: ['Pillar', 'Obelisk', 'Sarcophagus', 'Glyph', 'Idol', 'Seal', 'Relic', 'Sigil'],
    names: ['Ankhara', 'Solaris', 'Thoth', 'Maelis', 'Kephren', 'Ashur', 'Nefari', 'Ozymand'],
  },
  wilderness: {
    adjectives: ['Verdant', 'Moss-Covered', 'Thornbound', 'Windswept', 'Ancient', 'Twilight', 'Crystal', 'Feral'],
    nouns: ['Glen', 'Thicket', 'Root', 'Brook', 'Stone', 'Leaf', 'Hollow', 'Fang'],
    names: ['Rowan', 'Briar', 'Fern', 'Ash', 'Elm', 'Thorn', 'Heath', 'Ivy'],
  },
  desert: {
    adjectives: ['Sunscorched', 'Sand-Buried', 'Mirage', 'Oasis', 'Parched', 'Windswept', 'Golden', 'Shimmering'],
    nouns: ['Dune', 'Sands', 'Sun', 'Oasis', 'Mirage', 'Storm', 'Spire', 'Basalt'],
    names: ['Khalid', 'Zara', 'Sirocco', 'Tariq', 'Amira', 'Rashid', 'Nahla', 'Qadir'],
  },
  postapocalypse: {
    adjectives: ['Irradiated', 'Rusted', 'Decayed', 'Reclaimed', 'Scorched', 'Mutant', 'Feral', 'Overgrown'],
    nouns: ['Bunker', 'Rubble', 'Silo', 'Wreck', 'Crater', 'Ruin', 'Husk', 'Fallout'],
    names: ['Razor', 'Cinder', 'Rust', 'Ash', 'Blight', 'Scrap', 'Flint', 'Soot'],
  },
};

function getWords(themeId?: string): ThemeWords {
  if (themeId && THEME_WORDS[themeId]) return THEME_WORDS[themeId];
  return GENERIC;
}

function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[rng.int(0, arr.length - 1)];
}

// ---------------------------------------------------------------------------
// Name generation patterns
// ---------------------------------------------------------------------------

/** The possible name patterns, weighted for variety. */
type NamePattern = (words: ThemeWords, rng: Rng) => string;

const patterns: readonly { fn: NamePattern; weight: number }[] = [
  // "of the Crimson Veil"
  { fn: (w, rng) => `of the ${pick(w.adjectives, rng)} ${pick(w.nouns, rng)}`, weight: 3 },
  // "of Khar"
  { fn: (w, rng) => `of ${pick(w.names, rng)}`, weight: 2 },
  // "the Forgotten" (just adjective)
  { fn: (w, rng) => `the ${pick(w.adjectives, rng)}`, weight: 1 },
];

function pickPattern(rng: Rng): NamePattern {
  const total = patterns.reduce((a, p) => a + p.weight, 0);
  let r = rng.next() * total;
  for (const p of patterns) {
    r -= p.weight;
    if (r <= 0) return p.fn;
  }
  return patterns[0].fn;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a flavor-text suffix for a room label.
 *
 * @param themeId Active theme id (determines word palette).
 * @param rng     Seeded RNG for deterministic output.
 * @returns A suffix string like `"of the Crimson Veil"`.
 *
 * The caller is responsible for combining this with the room kind label:
 *   `"Crypt"` + `" "` + `generateRoomNameSuffix(...)` → `"Crypt of the Crimson Veil"`
 */
export function generateRoomNameSuffix(themeId: string | undefined, rng: Rng): string {
  const words = getWords(themeId);
  const pattern = pickPattern(rng);
  return pattern(words, rng);
}

/**
 * Generate a standalone proper name (for unlabeled rooms or POIs).
 *
 * @returns A name like `"The Ashen Vault"` or `"Morath's Sanctum"`.
 */
export function generateProperName(themeId: string | undefined, rng: Rng): string {
  const words = getWords(themeId);
  const r = rng.next();
  if (r < 0.5) {
    return `The ${pick(words.adjectives, rng)} ${pick(words.nouns, rng)}`;
  }
  return `${pick(words.names, rng)}'s ${pick(words.nouns, rng)}`;
}
