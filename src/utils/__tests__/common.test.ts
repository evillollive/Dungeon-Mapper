import { describe, it, expect } from 'vitest';
import {
  clampDensity,
  MIN_DENSITY,
  MAX_DENSITY,
  makeTypeGrid,
  typeGridToTiles,
  getCell,
  setCell,
  DIRS_4,
  DIRS_8,
  outlineWalls,
  bfsDistances,
  collectCells,
  reorderNotesReadingOrder,
} from '../generators/common';
import type { Tile, MapNote } from '../../types/map';

describe('clampDensity', () => {
  it('clamps below minimum', () => {
    expect(clampDensity(0)).toBe(MIN_DENSITY);
    expect(clampDensity(-1)).toBe(MIN_DENSITY);
  });

  it('clamps above maximum', () => {
    expect(clampDensity(2)).toBe(MAX_DENSITY);
    expect(clampDensity(100)).toBe(MAX_DENSITY);
  });

  it('passes through valid values', () => {
    expect(clampDensity(0.5)).toBe(0.5);
    expect(clampDensity(1.0)).toBe(1.0);
  });
});

describe('makeTypeGrid', () => {
  it('creates grid with correct dimensions', () => {
    const grid = makeTypeGrid(5, 3);
    expect(grid.length).toBe(3);
    expect(grid[0].length).toBe(5);
  });

  it('fills with empty by default', () => {
    const grid = makeTypeGrid(2, 2);
    expect(grid[0][0]).toBe('empty');
    expect(grid[1][1]).toBe('empty');
  });

  it('fills with specified type', () => {
    const grid = makeTypeGrid(2, 2, 'wall');
    expect(grid[0][0]).toBe('wall');
    expect(grid[1][1]).toBe('wall');
  });
});

describe('typeGridToTiles', () => {
  it('converts type grid to tile grid', () => {
    const grid = makeTypeGrid(2, 2, 'floor');
    const tiles = typeGridToTiles(grid);
    expect(tiles[0][0]).toEqual({ type: 'floor' });
    expect(tiles[1][1]).toEqual({ type: 'floor' });
  });
});

describe('getCell / setCell', () => {
  it('returns cell value for valid coords', () => {
    const grid = makeTypeGrid(3, 3, 'floor');
    expect(getCell(grid, 1, 1)).toBe('floor');
  });

  it('returns empty for out-of-bounds', () => {
    const grid = makeTypeGrid(3, 3, 'floor');
    expect(getCell(grid, -1, 0)).toBe('empty');
    expect(getCell(grid, 0, -1)).toBe('empty');
    expect(getCell(grid, 3, 0)).toBe('empty');
    expect(getCell(grid, 0, 3)).toBe('empty');
  });

  it('sets cell value', () => {
    const grid = makeTypeGrid(3, 3);
    setCell(grid, 1, 1, 'wall');
    expect(grid[1][1]).toBe('wall');
  });

  it('setCell ignores out-of-bounds', () => {
    const grid = makeTypeGrid(3, 3);
    setCell(grid, -1, 0, 'wall'); // should not throw
    setCell(grid, 0, -1, 'wall');
    setCell(grid, 3, 0, 'wall');
    expect(grid[0][0]).toBe('empty');
  });
});

describe('DIRS_4 and DIRS_8', () => {
  it('DIRS_4 has 4 cardinal directions', () => {
    expect(DIRS_4).toHaveLength(4);
  });

  it('DIRS_8 has 8 directions including diagonals', () => {
    expect(DIRS_8).toHaveLength(8);
  });
});

describe('outlineWalls', () => {
  it('surrounds a single floor cell with walls', () => {
    const grid = makeTypeGrid(5, 5);
    grid[2][2] = 'floor';
    outlineWalls(grid);

    // All 8 neighbors should become walls
    for (const [dx, dy] of DIRS_8) {
      expect(grid[2 + dy][2 + dx]).toBe('wall');
    }
    // The floor cell stays floor
    expect(grid[2][2]).toBe('floor');
  });

  it('does not overwrite existing non-empty cells', () => {
    const grid = makeTypeGrid(5, 5);
    grid[2][2] = 'floor';
    grid[1][1] = 'door-h'; // already non-empty
    outlineWalls(grid);
    expect(grid[1][1]).toBe('door-h');
  });

  it('handles empty grid without crashing', () => {
    const grid = makeTypeGrid(3, 3);
    outlineWalls(grid);
    // All should remain empty
    expect(grid[1][1]).toBe('empty');
  });
});

describe('bfsDistances', () => {
  it('returns distances from start in a simple corridor', () => {
    const grid = makeTypeGrid(5, 3);
    for (let x = 0; x < 5; x++) grid[1][x] = 'floor';

    const { dist, farthest } = bfsDistances(grid, 0, 1);
    expect(dist[1][0]).toBe(0);
    expect(dist[1][1]).toBe(1);
    expect(dist[1][4]).toBe(4);
    expect(farthest.d).toBe(4);
  });

  it('marks unreachable cells as -1', () => {
    const grid = makeTypeGrid(5, 5);
    grid[0][0] = 'floor';
    grid[4][4] = 'floor'; // disconnected
    const { dist } = bfsDistances(grid, 0, 0);
    expect(dist[0][0]).toBe(0);
    expect(dist[4][4]).toBe(-1);
  });

  it('handles start on non-passable cell', () => {
    const grid = makeTypeGrid(3, 3, 'wall');
    const { dist, farthest } = bfsDistances(grid, 1, 1);
    expect(farthest.d).toBe(0);
    expect(dist[1][1]).toBe(-1);
  });
});

describe('collectCells', () => {
  it('collects all cells of a given type', () => {
    const grid = makeTypeGrid(3, 3);
    grid[0][1] = 'floor';
    grid[2][0] = 'floor';
    const cells = collectCells(grid, 'floor');
    expect(cells).toHaveLength(2);
    expect(cells).toContainEqual({ x: 1, y: 0 });
    expect(cells).toContainEqual({ x: 0, y: 2 });
  });

  it('returns empty for no matches', () => {
    const grid = makeTypeGrid(3, 3);
    expect(collectCells(grid, 'floor')).toHaveLength(0);
  });
});

describe('reorderNotesReadingOrder', () => {
  it('sorts notes top-to-bottom, left-to-right', () => {
    const tiles: Tile[][] = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => ({ type: 'floor' as const }))
    );
    const notes: MapNote[] = [
      { id: 1, x: 3, y: 2, label: 'B', text: '', kind: 'room' },
      { id: 2, x: 1, y: 0, label: 'A', text: '', kind: 'room' },
      { id: 3, x: 0, y: 2, label: 'C', text: '', kind: 'room' },
    ];
    const result = reorderNotesReadingOrder(tiles, notes);
    expect(result[0].label).toBe('A'); // y=0
    expect(result[1].label).toBe('C'); // y=2, x=0
    expect(result[2].label).toBe('B'); // y=2, x=3
  });

  it('renumbers ids sequentially', () => {
    const tiles: Tile[][] = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => ({ type: 'floor' as const }))
    );
    const notes: MapNote[] = [
      { id: 5, x: 2, y: 2, label: 'Z', text: '', kind: 'room' },
      { id: 3, x: 0, y: 0, label: 'A', text: '', kind: 'room' },
    ];
    const result = reorderNotesReadingOrder(tiles, notes);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });

  it('re-suffixes grouped labels in reading order', () => {
    const tiles: Tile[][] = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => ({ type: 'floor' as const }))
    );
    const notes: MapNote[] = [
      { id: 1, x: 4, y: 4, label: 'Coffer 1', text: '', kind: 'poi' },
      { id: 2, x: 0, y: 0, label: 'Coffer 2', text: '', kind: 'poi' },
    ];
    const result = reorderNotesReadingOrder(tiles, notes);
    expect(result[0].label).toBe('Coffer 1');
    expect(result[0].x).toBe(0);
    expect(result[1].label).toBe('Coffer 2');
    expect(result[1].x).toBe(4);
  });

  it('remaps tile noteId references', () => {
    const tiles: Tile[][] = [
      [{ type: 'floor', noteId: 5 }, { type: 'floor' }],
      [{ type: 'floor' }, { type: 'floor', noteId: 3 }],
    ];
    const notes: MapNote[] = [
      { id: 5, x: 0, y: 1, label: 'B', text: '', kind: 'room' },
      { id: 3, x: 0, y: 0, label: 'A', text: '', kind: 'room' },
    ];
    reorderNotesReadingOrder(tiles, notes);
    expect(tiles[0][0].noteId).toBe(2); // was 5 → 2
    expect(tiles[1][1].noteId).toBe(1); // was 3 → 1
  });

  it('handles empty notes array', () => {
    const tiles: Tile[][] = [[{ type: 'floor' }]];
    expect(reorderNotesReadingOrder(tiles, [])).toEqual([]);
  });
});
