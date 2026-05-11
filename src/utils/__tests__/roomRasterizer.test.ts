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

  it('visual merge dissolves shared walls between overlapping shapes', () => {
    const tiles = emptyGrid(10, 10);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 4, height: 4 },
      { id: 2, x: 3, y: 3, width: 4, height: 4, fillTile: 'water' },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 10, 10);

    // Overlap at (3,3) — perimeter of shape 2, interior of shape 1 → dissolved to floor
    expect(result[3][3].type).toBe('floor');
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

  // ── Visual merging (Phase 10.3) ─────────────────────────────────────

  it('dissolves shared wall when two rooms share a boundary edge', () => {
    // Room A at (1,1) 3×3, Room B at (4,1) 3×3 — touching east/west edges.
    const tiles = emptyGrid(8, 5);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 3, height: 3 },
      { id: 2, x: 3, y: 1, width: 3, height: 3 },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 8, 5);

    // The shared boundary column at x=3 should be dissolved to floor
    // (where both rooms claim the cell).
    // y=1: top perimeter of both → both are 'n' edge; (3,1) is perimeter of A (east) and perimeter of B (west+north corner)
    // Since (3,1) is inside both shapes, the shared wall is dissolved.
    expect(result[2][3].type).toBe('floor'); // middle of shared edge → dissolved
  });

  it('dissolves interior walls for fully overlapping rooms', () => {
    // Room A at (1,1) 5×5, Room B at (2,2) 3×3 — B is entirely inside A.
    const tiles = emptyGrid(8, 8);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 5, height: 5 },
      { id: 2, x: 2, y: 2, width: 3, height: 3 },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 8, 8);

    // B's perimeter is entirely inside A → all B perimeter cells dissolved to floor
    expect(result[2][2].type).toBe('floor');
    expect(result[2][3].type).toBe('floor');
    expect(result[2][4].type).toBe('floor');
    expect(result[3][2].type).toBe('floor');
    expect(result[3][4].type).toBe('floor');
    expect(result[4][2].type).toBe('floor');
    expect(result[4][3].type).toBe('floor');
    expect(result[4][4].type).toBe('floor');
    // A's perimeter is still wall (not inside B)
    expect(result[1][1].type).toBe('wall');
    expect(result[5][5].type).toBe('wall');
  });

  it('keeps outer perimeter walls when rooms partially overlap', () => {
    // Room A at (1,1) 4×4, Room B at (3,1) 4×4 — overlap 2 columns wide.
    const tiles = emptyGrid(10, 8);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 4, height: 4 },
      { id: 2, x: 3, y: 1, width: 4, height: 4 },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 10, 8);

    // A's west wall should remain
    expect(result[2][1].type).toBe('wall');
    // B's east wall should remain
    expect(result[2][6].type).toBe('wall');
    // The overlap area (columns 3-4, rows 1-4) should be mostly dissolved
    // x=3 is A's interior (col 3 from A: x=1..4, so col 3 is interior) and B's west perimeter
    // → dissolved because B's perimeter is inside A
    expect(result[2][3].type).toBe('floor');
    // x=4 is A's east perimeter and B's interior
    // → dissolved because A's perimeter is inside B
    expect(result[2][4].type).toBe('floor');
  });

  it('edgeMergeOverride wall keeps the wall even at shared boundary', () => {
    const tiles = emptyGrid(8, 5);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 3, height: 3, edgeMergeOverrides: [{ edge: 'e', mode: 'wall' }] },
      { id: 2, x: 3, y: 1, width: 3, height: 3 },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 8, 5);

    // Shared boundary at x=3 — shape 1 says 'wall' on its east edge
    expect(result[2][3].type).toBe('wall');
  });

  it('edgeMergeOverride door places door tiles at shared boundary', () => {
    const tiles = emptyGrid(8, 5);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 3, height: 3, edgeMergeOverrides: [{ edge: 'e', mode: 'door' }] },
      { id: 2, x: 3, y: 1, width: 3, height: 3 },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 8, 5);

    // Middle of shared boundary should get door-v (east/west edge → vertical door)
    expect(result[2][3].type).toBe('door-v');
  });

  it('edgeMergeOverride arch places archway tiles at shared boundary', () => {
    const tiles = emptyGrid(8, 5);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 3, height: 3 },
      { id: 2, x: 3, y: 1, width: 3, height: 3, edgeMergeOverrides: [{ edge: 'w', mode: 'arch' }] },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 8, 5);

    // Shared boundary at x=3 — shape 2 says 'arch' on its west edge
    expect(result[2][3].type).toBe('archway');
  });

  it('door hints survive the merge pass', () => {
    const tiles = emptyGrid(8, 5);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 3, height: 3, doorHints: [{ edge: 'e', offset: 1, type: 'locked-door-v' }] },
      { id: 2, x: 3, y: 1, width: 3, height: 3 },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 8, 5);

    // Door hint should be applied at x=3, y=2 — even after merge
    expect(result[2][3].type).toBe('locked-door-v');
  });

  it('single shape is unaffected by merge logic', () => {
    const tiles = emptyGrid(6, 6);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 4, height: 4 },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 6, 6);

    // No merge — standard rasterization
    expect(result[1][1].type).toBe('wall');
    expect(result[2][2].type).toBe('floor');
    expect(result[4][4].type).toBe('wall');
  });

  it('rooms touching at north/south boundary dissolve shared wall', () => {
    // Room A at (1,1) 3×3, Room B at (1,3) 3×3 — touching at y=3.
    const tiles = emptyGrid(5, 8);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 3, height: 3 },
      { id: 2, x: 1, y: 3, width: 3, height: 3 },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 5, 8);

    // Shared row at y=3: middle cell (2,3) should be dissolved
    expect(result[3][2].type).toBe('floor');
  });

  it('three rooms in an L-shape merge correctly', () => {
    const tiles = emptyGrid(10, 10);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 3, height: 3 },
      { id: 2, x: 3, y: 1, width: 3, height: 3 }, // right of room 1
      { id: 3, x: 1, y: 3, width: 3, height: 3 }, // below room 1
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 10, 10);

    // Room 1 east wall at (3,2) shared with room 2 → dissolved
    expect(result[2][3].type).toBe('floor');
    // Room 1 south wall at (2,3) shared with room 3 → dissolved
    expect(result[3][2].type).toBe('floor');
    // Room 2's south wall at (4,3) — not touching room 3 → stays wall
    expect(result[3][4].type).toBe('wall');
  });

  it('non-touching rooms do not merge', () => {
    const tiles = emptyGrid(10, 10);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 3, height: 3 },
      { id: 2, x: 5, y: 5, width: 3, height: 3 }, // completely separate
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 10, 10);

    // All perimeters remain walls
    expect(result[1][1].type).toBe('wall');
    expect(result[1][3].type).toBe('wall');
    expect(result[5][5].type).toBe('wall');
    expect(result[7][7].type).toBe('wall');
    // Interiors are floor
    expect(result[2][2].type).toBe('floor');
    expect(result[6][6].type).toBe('floor');
  });

  // ── Subtractive shapes (Phase 10.5) ───────────────────────────────────

  it('subtractive shape carves interior of additive room to empty', () => {
    // 5×5 additive room, 3×3 subtractive cut in the center
    const tiles = emptyGrid(7, 7);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 5, height: 5 },
      { id: 2, x: 2, y: 2, width: 3, height: 3, mode: 'subtractive' },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 7, 7);

    // Outer additive perimeter still walls
    expect(result[1][1].type).toBe('wall');
    expect(result[1][5].type).toBe('wall');

    // Subtractive perimeter becomes wall (sealing the cut)
    expect(result[2][2].type).toBe('wall');
    expect(result[2][4].type).toBe('wall');
    expect(result[4][2].type).toBe('wall');
    expect(result[4][4].type).toBe('wall');

    // Subtractive interior becomes empty
    expect(result[3][3].type).toBe('empty');
  });

  it('subtractive shape does not carve outside additive bounds', () => {
    const tiles = emptyGrid(10, 10);
    const shapes: RoomShape[] = [
      { id: 1, x: 2, y: 2, width: 3, height: 3 }, // additive at (2,2)-(4,4)
      { id: 2, x: 6, y: 6, width: 3, height: 3, mode: 'subtractive' }, // no overlap
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 10, 10);

    // The subtractive shape shouldn't modify tiles outside additive bounds
    expect(result[6][6].type).toBe('empty');
    expect(result[7][7].type).toBe('empty');
    expect(result[8][8].type).toBe('empty');

    // Additive room is untouched
    expect(result[2][2].type).toBe('wall');
    expect(result[3][3].type).toBe('floor');
  });

  it('subtractive shape partially overlapping additive room carves only overlap', () => {
    const tiles = emptyGrid(10, 10);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 5, height: 5 }, // (1,1)-(5,5)
      { id: 2, x: 4, y: 4, width: 4, height: 4, mode: 'subtractive' }, // (4,4)-(7,7)
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 10, 10);

    // Overlap cell (4,4) — perimeter of subtractive, overlaps additive perimeter → wall
    expect(result[4][4].type).toBe('wall');
    // (5,5) — perimeter of additive, interior of subtractive but it's perimeter of sub? No:
    // sub is (4,4)-(7,7), so (5,5) is interior of sub. It's also perimeter of additive.
    // Since it overlaps additive and is interior of subtractive → empty
    expect(result[5][5].type).toBe('empty');

    // Outside overlap — additive floor preserved
    expect(result[2][2].type).toBe('floor');

    // Outside overlap — subtractive doesn't touch non-additive cells
    expect(result[6][6].type).toBe('empty');
  });

  it('multiple subtractive shapes on one additive room', () => {
    const tiles = emptyGrid(10, 10);
    const shapes: RoomShape[] = [
      { id: 1, x: 0, y: 0, width: 8, height: 8 }, // big additive
      { id: 2, x: 1, y: 1, width: 3, height: 3, mode: 'subtractive' }, // cut top-left
      { id: 3, x: 5, y: 5, width: 3, height: 3, mode: 'subtractive' }, // cut bottom-right
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 10, 10);

    // First cut interior → empty
    expect(result[2][2].type).toBe('empty');
    // First cut perimeter → wall
    expect(result[1][1].type).toBe('wall');

    // Second cut interior → empty
    expect(result[6][6].type).toBe('empty');
    // Second cut perimeter → wall
    expect(result[5][5].type).toBe('wall');

    // Remaining additive floor between cuts
    expect(result[4][4].type).toBe('floor');
  });

  it('subtractive shape with custom wallTile uses that tile for perimeter', () => {
    const tiles = emptyGrid(7, 7);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 5, height: 5 },
      { id: 2, x: 2, y: 2, width: 3, height: 3, mode: 'subtractive', wallTile: 'stone-wall' },
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 7, 7);

    expect(result[2][2].type).toBe('stone-wall');
    expect(result[3][3].type).toBe('empty');
  });

  it('subtractive shape does not affect additive merge behavior', () => {
    // Two touching additive rooms + a subtractive cut on one of them
    const tiles = emptyGrid(10, 10);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 5, height: 5 }, // (1,1)-(5,5)
      { id: 2, x: 5, y: 1, width: 4, height: 5 }, // (5,1)-(8,5) — touching room 1
      { id: 3, x: 2, y: 2, width: 3, height: 3, mode: 'subtractive' }, // cut in room 1
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 10, 10);

    // Merge boundary between rooms 1 and 2 at x=5 should dissolve
    expect(result[2][5].type).toBe('floor');

    // Subtractive cut interior → empty
    expect(result[3][3].type).toBe('empty');
    // Subtractive cut perimeter → wall
    expect(result[2][2].type).toBe('wall');
  });

  it('additive shape without explicit mode defaults to additive', () => {
    const tiles = emptyGrid(5, 5);
    const shapes: RoomShape[] = [
      { id: 1, x: 1, y: 1, width: 3, height: 3 }, // no mode field
    ];
    const result = rasterizeRoomShapes(tiles, shapes, 5, 5);

    // Should behave as additive
    expect(result[1][1].type).toBe('wall');
    expect(result[2][2].type).toBe('floor');
  });
});
