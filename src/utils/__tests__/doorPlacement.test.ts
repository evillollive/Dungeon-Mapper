import { describe, expect, it } from 'vitest';
import type { DungeonMap, RoomShape } from '../../types/map';
import { createDefaultMap } from '../../hooks/mapStateUtils';
import { deriveRenderableTiles } from '../derivedRenderMap';
import { placeDoor } from '../doorPlacement';

function mapWith(roomShapes: RoomShape[], width = 10, height = 7): DungeonMap {
  const map = createDefaultMap('Doors');
  map.meta = { ...map.meta, width, height };
  map.tiles = Array.from({ length: height }, () => Array.from({ length: width }, () => ({ type: 'empty' as const })));
  map.fog = Array.from({ length: height }, () => Array(width).fill(true));
  map.roomShapes = roomShapes;
  return map;
}

const apply = (map: DungeonMap, x: number, y: number, tile: Parameters<typeof placeDoor>[3] = 'floor') => {
  const result = placeDoor(map, x, y, tile);
  if (!result.ok) throw new Error(result.reason);
  const next = { ...map, tiles: result.tiles, roomShapes: result.roomShapes ?? map.roomShapes };
  return { result, next, rendered: deriveRenderableTiles(next).map(row => row.map(t => t.type)) };
};

describe('placeDoor', () => {
  const touching = (): RoomShape[] => [
    { id: 1, x: 1, y: 1, width: 4, height: 5 },
    { id: 2, x: 4, y: 1, width: 4, height: 5 },
  ];

  it('restores the shared wall of touching rooms with a single vertical door', () => {
    const before = deriveRenderableTiles(mapWith(touching()));
    expect(before[3][4].type).toBe('floor');
    const { rendered, result } = apply(mapWith(touching()), 4, 3);
    expect(result.ok && result.door).toBe('door-v');
    expect([1, 2, 3, 4, 5].map(y => rendered[y][4])).toEqual(['wall', 'wall', 'door-v', 'wall', 'wall']);
    expect(rendered[3][2]).toBe('floor');
    expect(rendered[3][6]).toBe('floor');
  });

  it('places a horizontal door on a horizontal shared wall', () => {
    const shapes: RoomShape[] = [{ id: 1, x: 1, y: 1, width: 5, height: 3 }, { id: 2, x: 1, y: 3, width: 5, height: 3 }];
    const { rendered } = apply(mapWith(shapes), 3, 3);
    expect([1, 2, 3, 4, 5].map(x => rendered[3][x])).toEqual(['wall', 'wall', 'door-h', 'wall', 'wall']);
  });

  it('places a door on an ordinary room wall without changing room shapes', () => {
    const map = mapWith([{ id: 1, x: 1, y: 1, width: 4, height: 4 }]);
    const { rendered, result } = apply(map, 4, 2);
    expect(rendered[2][4]).toBe('door-v');
    expect(result.ok && result.roomShapes).toBeUndefined();
  });

  it('rejects cells that are not walls', () => {
    const result = placeDoor(mapWith([{ id: 1, x: 1, y: 1, width: 4, height: 4 }]), 2, 2, 'floor');
    expect(result).toEqual({ ok: false, reason: 'Click a wall to place a door there.' });
  });

  it('follows the selected door style', () => {
    const map = mapWith([{ id: 1, x: 1, y: 1, width: 4, height: 4 }]);
    expect(apply(map, 2, 1, 'locked-door-v').rendered[1][2]).toBe('locked-door-h');
    expect(apply(map, 2, 1, 'secret-door').rendered[1][2]).toBe('secret-door');
  });
});
