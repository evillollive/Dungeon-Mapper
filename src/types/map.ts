export type TileType =
  | 'empty' | 'floor' | 'wall' | 'door-h' | 'door-v'
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
}

export interface MapMeta {
  name: string;
  width: number;
  height: number;
  tileSize: number;
  theme?: string;
}

export interface DungeonMap {
  meta: MapMeta;
  tiles: Tile[][];
  notes: MapNote[];
}

export type ToolType = 'paint' | 'erase' | 'fill' | 'eyedropper' | 'note' | 'line' | 'rect' | 'select';

export const TILE_LABELS: Record<TileType, string> = {
  empty: 'Empty',
  floor: 'Floor',
  wall: 'Wall',
  'door-h': 'Door (H)',
  'door-v': 'Door (V)',
  'stairs-up': 'Stairs Up',
  'stairs-down': 'Stairs Down',
  water: 'Water',
  pillar: 'Pillar',
  trap: 'Trap',
  treasure: 'Treasure',
  start: 'Start',
};

export const ALL_TILE_TYPES: TileType[] = [
  'empty', 'floor', 'wall', 'door-h', 'door-v',
  'stairs-up', 'stairs-down', 'water', 'pillar',
  'trap', 'treasure', 'start',
];
