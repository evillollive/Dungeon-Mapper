import type { DungeonMap, RoomShape, Tile, TileType } from '../types/map';
import { deriveRenderableTiles } from './derivedRenderMap';
import { sharedBoundaryAt } from './roomRasterizer';

const ORIENTED: Record<string, [TileType, TileType]> = {
  door: ['door-h', 'door-v'],
  locked: ['locked-door-h', 'locked-door-v'],
  trapped: ['trapped-door-h', 'trapped-door-v'],
};
const UNORIENTED: ReadonlySet<TileType> = new Set<TileType>(['secret-door', 'portcullis', 'archway', 'barricade']);
const DOORWAYS: ReadonlySet<TileType> = new Set<TileType>([
  ...ORIENTED.door, ...ORIENTED.locked, ...ORIENTED.trapped, ...UNORIENTED,
]);

export function isDoorway(type: TileType | undefined): boolean {
  return type !== undefined && DOORWAYS.has(type);
}

function doorFamily(activeTile: TileType): keyof typeof ORIENTED | TileType {
  if (activeTile.startsWith('locked-door')) return 'locked';
  if (activeTile.startsWith('trapped-door')) return 'trapped';
  if (UNORIENTED.has(activeTile)) return activeTile;
  return 'door';
}

export type DoorPlacement =
  | { ok: true; tiles: Tile[][]; roomShapes?: RoomShape[]; door: TileType }
  | { ok: false; reason: string };

/**
 * Turn one wall cell into a door. A wall that two touching rooms would merge away is kept
 * as a wall on that room edge, so the door divides the rooms instead of opening them fully.
 * The door style follows the selected door tile; orientation follows the wall.
 */
export function placeDoor(map: DungeonMap, x: number, y: number, activeTile: TileType): DoorPlacement {
  const { width, height } = map.meta;
  if (x < 0 || y < 0 || x >= width || y >= height) return { ok: false, reason: 'Choose a cell inside the map.' };
  const rendered = deriveRenderableTiles(map);
  const roomShapes = map.roomShapes ?? [];
  const boundary = sharedBoundaryAt(x, y, roomShapes);
  const here = rendered[y][x].type;
  if (here !== 'wall' && !isDoorway(here) && !boundary) {
    return { ok: false, reason: 'Click a wall to place a door there.' };
  }
  const wallish = (cx: number, cy: number) => {
    const type = rendered[cy]?.[cx]?.type;
    return type === 'wall' || isDoorway(type);
  };
  const vertical = boundary
    ? boundary.edge === 'e' || boundary.edge === 'w'
    : wallish(x, y - 1) && wallish(x, y + 1) && !(wallish(x - 1, y) && wallish(x + 1, y));
  const family = doorFamily(activeTile);
  const door: TileType = family in ORIENTED ? ORIENTED[family][vertical ? 1 : 0] : family as TileType;
  const tiles = map.tiles.map((row, rowY) => rowY === y
    ? row.map((tile, cellX) => cellX === x ? { ...tile, type: door } : tile)
    : row);
  if (!boundary) return { ok: true, tiles, door };
  const nextShapes = roomShapes.map(shape => {
    if (shape.id !== boundary.shapeId) return shape;
    const overrides = (shape.edgeMergeOverrides ?? []).filter(o => o.edge !== boundary.edge);
    return { ...shape, edgeMergeOverrides: [...overrides, { edge: boundary.edge, mode: 'wall' as const }] };
  });
  return { ok: true, tiles, roomShapes: nextShapes, door };
}
