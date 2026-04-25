export type TileType =
  | 'empty' | 'floor' | 'wall' | 'door-h' | 'door-v' | 'secret-door'
  | 'stairs-up' | 'stairs-down' | 'water' | 'pillar'
  | 'trap' | 'treasure' | 'start';

export interface Tile {
  type: TileType;
  noteId?: number;
  /**
   * Optional per-tile theme override. When set, this tile is rendered using
   * the named theme instead of the map's current `meta.theme`. This is used
   * to preserve the visual style of tiles that were painted under a previous
   * theme when the user opts in to the "preserve tiles when switching
   * themes" mode, so terrain styles from multiple themes can coexist on a
   * single map. When unset, the tile follows the current map theme.
   */
  theme?: string;
}

export interface MapNote {
  id: number;
  x: number;
  y: number;
  label: string;
  description: string;
  /**
   * Internal classification used by the procedural generators so the UI /
   * future logic can tell whether a note represents an actual room (a
   * carved room archetype like "Strongroom", or a POI whose label happens
   * to name a room such as "Gatehouse" / "Lobby") versus a non-room point
   * of interest (entrance markers, treasure, traps, …). The generators
   * guarantee that no `kind: 'room'` note is ever placed inside another
   * `kind: 'room'` note's footprint, so consumers can rely on this tag
   * for hierarchy. Optional for backward compatibility with notes saved
   * before the field existed and with manually-authored notes (treat
   * absent as untagged).
   */
  kind?: 'room' | 'poi';
}

export interface MapMeta {
  name: string;
  width: number;
  height: number;
  tileSize: number;
  theme?: string;
}

export type TokenKind = 'player' | 'npc' | 'monster';

export interface Token {
  id: number;
  /** Tile-aligned X coordinate of the token's top-left cell. */
  x: number;
  /** Tile-aligned Y coordinate of the token's top-left cell. */
  y: number;
  kind: TokenKind;
  label: string;
  /** Optional override fill color; defaults are derived from `kind`. */
  color?: string;
  /** Optional emoji/icon; falls back to first letter of `label`. */
  icon?: string;
  /**
   * Footprint size in tiles (size × size). Defaults to 1 (single cell).
   * Currently only used by monster tokens (1 = small, 2 = medium,
   * 3 = large). The token's `(x, y)` is the top-left cell of the
   * footprint and the token occupies `[x, x + size) × [y, y + size)`.
   */
  size?: number;
}

export interface AnnotationStroke {
  id: number;
  /**
   * `'player'` strokes are drawn from the Player toolbar and visible to
   * everyone. `'gm'` strokes are reserved for GM-only annotations (rendered
   * only in GM mode); the GM toolbar does not yet expose a draw tool, but
   * the kind exists so the data model is forward-compatible.
   */
  kind: 'player' | 'gm';
  /** Polyline points expressed in *tile* coordinates (may be fractional). */
  points: { x: number; y: number }[];
  color: string;
  /** Stroke width expressed in *tile* units (typically 0.1 – 0.5). */
  width: number;
}

export interface DungeonMap {
  meta: MapMeta;
  tiles: Tile[][];
  notes: MapNote[];
  /**
   * Per-tile fog-of-war flags parallel to `tiles`. `true` means the cell is
   * hidden from players. Optional for backward-compat with maps saved
   * before the player-view feature; treat absent as "all revealed".
   */
  fog?: boolean[][];
  /** Whether fog is active for this map. Off by default. */
  fogEnabled?: boolean;
  /** Player / NPC / monster tokens placed on the map. */
  tokens?: Token[];
  /** Free-form pen strokes drawn over the map. */
  annotations?: AnnotationStroke[];
  /**
   * Ordered list of token ids representing the initiative order shown in
   * the right-hand Initiative panel. The order is GM-controlled (drag to
   * reorder) and persisted with the map. Tokens are appended in placement
   * order and removed automatically when a token is removed from the map.
   */
  initiative?: number[];
}

export type ToolType =
  | 'paint' | 'erase' | 'fill' | 'eyedropper' | 'note' | 'line' | 'rect' | 'select'
  // GM fog tools — reveal/hide drag-rectangles of cells.
  | 'reveal' | 'hide'
  // Freehand "wipe away the fog" brush — clears fog cell-by-cell as the
  // cursor is dragged across the map. Available in the player view as a
  // more discoverable alternative to the rectangle Reveal / whole-map
  // Clear Fog buttons.
  | 'defog'
  // Player tools — visible only when viewMode === 'player'.
  | 'pdraw' | 'perase'
  | 'token-player' | 'token-npc'
  | 'token-monster' | 'token-monster-md' | 'token-monster-lg'
  | 'move-token' | 'remove-token';

export type ViewMode = 'gm' | 'player';

export const TOKEN_KIND_COLORS: Record<TokenKind, string> = {
  player: '#3b82f6',
  npc: '#22c55e',
  monster: '#dc2626',
};

export const TOKEN_KIND_LABELS: Record<TokenKind, string> = {
  player: 'Player',
  npc: 'NPC',
  monster: 'Monster',
};

export const TILE_LABELS: Record<TileType, string> = {
  empty: 'Empty',
  floor: 'Floor',
  wall: 'Wall',
  'door-h': 'Door (H)',
  'door-v': 'Door (V)',
  'secret-door': 'Secret Door',
  'stairs-up': 'Stairs Up',
  'stairs-down': 'Stairs Down',
  water: 'Water',
  pillar: 'Pillar',
  trap: 'Trap',
  treasure: 'Treasure',
  start: 'Start',
};

// Tile types shown in the toolbar palette. The 'empty' tile is intentionally
// omitted: it represents an unpainted / cleared cell (the graph-paper
// background shows through it in screen mode, and SVG/print export treat it
// as background), so a "paint empty" button would appear to do nothing on
// the map. Use the Erase tool to clear a tile back to empty.
export const ALL_TILE_TYPES: TileType[] = [
  'floor', 'wall', 'door-h', 'door-v', 'secret-door',
  'stairs-up', 'stairs-down', 'water', 'pillar',
  'trap', 'treasure', 'start',
];
