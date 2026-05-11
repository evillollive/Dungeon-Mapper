import { describe, it, expect } from 'vitest';
import { rasterizeRoomShapes } from '../roomRasterizer';
import type { RoomShape, Tile } from '../../types/map';

/** Create a width×height grid filled with 'empty' tiles. */
function emptyGrid(w: number, h: number): Tile[][] {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ type: 'empty' as const })),
  );
}

/** Extract the type grid for easy assertions. */
function typeGrid(tiles: Tile[][]): string[][] {
  return tiles.map(row => row.map(t => t.type));
}

describe('rasterizeRoomShapes', () => {
  // ── Basic rectangle rasterization ──────────────────────────────────────

  it('rasterizes a simple rectangle with floor interior and wall perimeter', () => {
    const tiles = emptyGrid(10, 10);
    const shapes: RoomShape[] = [
      { id: 1, x: 2, y: 2, width: 4, height: 3 },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 10, 10);

    // Perimeter cells should be 'wall'
    expect(result[2][2].type).toBe('wall');
    expect(result[2][3].type).toBe('wall');
    expect(result[2][4].type).toBe('wall');
    expect(result[2][5].type).toBe('wall');
    expect(result[4][2].type).toBe('wall');
    expect(result[4][5].type).toBe('wall');
    expect(result[3][2].type).toBe('wall');
    expect(result[3][5].type).toBe('wall');

    // Interior cells should be 'floor'
    expect(result[3][3].type).toBe('floor');
    expect(result[3][4].type).toBe('floor');

    // Cells outside the shape should remain 'empty'
    expect(result[0][0].type).toBe('empty');
    expect(result[1][2].type).toBe('empty');
    expect(result[5][3].type).toBe('empty');
  });

  it('does not mutate the original tile grid', () => {
    const tiles = emptyGrid(8, 8);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 3, height: 3 },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 8, 8);

    // Original should remain empty
    expect(tiles[1][1].type).toBe('empty');
    // Result should have the room
    expect(result[1][1].type).toBe('wall');
  });

  // ── Custom fill/wall tiles ────────────────────────────────────────────

  it('respects custom fillTile and wallTile overrides', () => {
    const tiles = emptyGrid(8, 8);
    const shapes: RoomShape[] = [
      { id: 1, x: 0, y: 0, width: 4, height: 4, fillTile: 'water', wallTile: 'pillar' },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 8, 8);

    expect(result[0][0].type).toBe('pillar'); // corner = perimeter
    expect(result[1][1].type).toBe('water');  // interior
    expect(result[2][2].type).toBe('water');  // interior
    expect(result[3][3].type).toBe('pillar'); // corner = perimeter
  });

  // ── Door hints ────────────────────────────────────────────────────────

  it('places default horizontal door on north edge', () => {
    const tiles = emptyGrid(10, 10);
    const shapes: RoomShape[] = [
      { id: 1, x: 2, y: 2, width: 5, height: 5, doorHints: [{ edge: 'n', offset: 2 }] },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 10, 10);

    // The door should be at (x + offset, y) = (4, 2)
    expect(result[2][4].type).toBe('door-h');
    // Adjacent perimeter cells remain wall
    expect(result[2][3].type).toBe('wall');
    expect(result[2][5].type).toBe('wall');
  });

  it('places default vertical door on east edge', () => {
    const tiles = emptyGrid(10, 10);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 5, height: 5, doorHints: [{ edge: 'e', offset: 2 }] },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 10, 10);

    // East edge x = 1 + 5 - 1 = 5, y = 1 + 2 = 3
    expect(result[3][5].type).toBe('door-v');
  });

  it('places default vertical door on west edge', () => {
    const tiles = emptyGrid(10, 10);
    const shapes: RoomShape[] = [
      { id: 1, x: 2, y: 2, width: 4, height: 6, doorHints: [{ edge: 'w', offset: 3 }] },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 10, 10);

    // West edge x = 2, y = 2 + 3 = 5
    expect(result[5][2].type).toBe('door-v');
  });

  it('places default horizontal door on south edge', () => {
    const tiles = emptyGrid(10, 10);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 6, height: 4, doorHints: [{ edge: 's', offset: 3 }] },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 10, 10);

    // South edge y = 1 + 4 - 1 = 4, x = 1 + 3 = 4
    expect(result[4][4].type).toBe('door-h');
  });

  it('supports custom door type in hint', () => {
    const tiles = emptyGrid(10, 10);
    const shapes: RoomShape[] = [
      { id: 1, x: 2, y: 2, width: 5, height: 5, doorHints: [
        { edge: 'n', offset: 2, type: 'archway' },
      ]},
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 10, 10);
    expect(result[2][4].type).toBe('archway');
  });

  it('ignores door hints with out-of-range offset', () => {
    const tiles = emptyGrid(10, 10);
    const shapes: RoomShape[] = [
      { id: 1, x: 2, y: 2, width: 3, height: 3, doorHints: [
        { edge: 'n', offset: 10 }, // out of range
        { edge: 'w', offset: -1 }, // negative
      ]},
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 10, 10);

    // All perimeter cells remain wall — no doors placed
    const types = typeGrid(result);
    expect(types[2][2]).toBe('wall');
    expect(types[2][3]).toBe('wall');
    expect(types[2][4]).toBe('wall');
    expect(types[3][2]).toBe('wall');
    expect(types[3][4]).toBe('wall');
    expect(types[4][2]).toBe('wall');
    expect(types[4][3]).toBe('wall');
    expect(types[4][4]).toBe('wall');
  });

  // ── Multiple shapes ───────────────────────────────────────────────────

  it('later shapes overwrite earlier shapes', () => {
    const tiles = emptyGrid(10, 10);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 4, height: 4 },
      { id: 2, x: 3, y: 3, width: 4, height: 4, fillTile: 'water' },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 10, 10);

    // Overlap at (3,3) — shape 2's perimeter overwrites shape 1's interior
    expect(result[3][3].type).toBe('wall');
    // Shape 2 interior
    expect(result[4][4].type).toBe('water');
    // Shape 1 unaffected area
    expect(result[2][2].type).toBe('floor');
  });

  // ── Edge cases ────────────────────────────────────────────────────────

  it('handles 1×1 shape (all-perimeter)', () => {
    const tiles = emptyGrid(5, 5);
    const shapes: RoomShape[] = [
      { id: 1, x: 2, y: 2, width: 1, height: 1 },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 5, 5);
    expect(result[2][2].type).toBe('wall'); // single cell is perimeter
  });

  it('handles 2×2 shape (all-perimeter, no interior)', () => {
    const tiles = emptyGrid(5, 5);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 2, height: 2 },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 5, 5);
    expect(result[1][1].type).toBe('wall');
    expect(result[1][2].type).toBe('wall');
    expect(result[2][1].type).toBe('wall');
    expect(result[2][2].type).toBe('wall');
  });

  it('clips shapes that extend beyond grid bounds', () => {
    const tiles = emptyGrid(5, 5);
    const shapes: RoomShape[] = [
      { id: 1, x: 3, y: 3, width: 5, height: 5 }, // extends to (8,8) on a 5×5 grid
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 5, 5);

    // In-bounds portion should be rasterized
    expect(result[3][3].type).toBe('wall');
    expect(result[3][4].type).toBe('wall');
    expect(result[4][3].type).toBe('wall');
    expect(result[4][4].type).toBe('floor'); // interior of the clipped region
  });

  it('clips shapes with negative origin', () => {
    const tiles = emptyGrid(5, 5);
    const shapes: RoomShape[] = [
      { id: 1, x: -2, y: -2, width: 5, height: 5 },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 5, 5);

    // (0,0) is interior of this shape (perimeter is at -2, 2)
    expect(result[0][0].type).toBe('floor');
    // (2,0) is the east perimeter
    expect(result[0][2].type).toBe('wall');
    // (0,2) is the south perimeter
    expect(result[2][0].type).toBe('wall');
  });

  it('returns empty tiles unchanged when no shapes', () => {
    const tiles = emptyGrid(4, 4);
    const result = rasterizeRoomShapes(tiles, [], 4, 4);

    for (const row of result) {
      for (const t of row) {
        expect(t.type).toBe('empty');
      }
    }
  });

  it('preserves existing tile content outside shape bounds', () => {
    const tiles = emptyGrid(6, 6);
    tiles[0][0] = { type: 'treasure' };
    tiles[5][5] = { type: 'stairs-up' };

    const shapes: RoomShape[] = [
      { id: 1, x: 2, y: 2, width: 3, height: 3 },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 6, 6);

    expect(result[0][0].type).toBe('treasure');
    expect(result[5][5].type).toBe('stairs-up');
  });

  it('supports multiple door hints on the same shape', () => {
    const tiles = emptyGrid(10, 10);
    const shapes: RoomShape[] = [
      { id: 1, x: 2, y: 2, width: 6, height: 6, doorHints: [
        { edge: 'n', offset: 2 },
        { edge: 's', offset: 3 },
        { edge: 'e', offset: 2, type: 'locked-door-v' },
      ]},
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 10, 10);

    expect(result[2][4].type).toBe('door-h');   // north, offset 2
    expect(result[7][5].type).toBe('door-h');   // south, offset 3
    expect(result[4][7].type).toBe('locked-door-v'); // east, offset 2
  });

  // ── 3×3 sanity (smallest room with an interior cell) ──────────────────

  it('correctly rasterizes a 3×3 room', () => {
    const tiles = emptyGrid(5, 5);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 3, height: 3 },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 5, 5);

    const expected = [
      ['empty', 'empty', 'empty', 'empty', 'empty'],
      ['empty', 'wall',  'wall',  'wall',  'empty'],
      ['empty', 'wall',  'floor', 'wall',  'empty'],
      ['empty', 'wall',  'wall',  'wall',  'empty'],
      ['empty', 'empty', 'empty', 'empty', 'empty'],
    ];
    expect(typeGrid(result)).toEqual(expected);
  });
});
