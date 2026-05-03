import { describe, it, expect } from 'vitest';
import { isOpaque, computeFOV } from '../fov';
import type { Tile } from '../../types/map';

/** Helper to build a tile grid from a simple string map. */
function buildGrid(rows: string[]): Tile[][] {
  return rows.map(row =>
    [...row].map(ch => {
      switch (ch) {
        case '#': return { type: 'wall' as const };
        case '.': return { type: 'floor' as const };
        case 'D': return { type: 'door-h' as const };
        case 'P': return { type: 'pillar' as const };
        case 'S': return { type: 'secret-door' as const };
        default:  return { type: 'empty' as const };
      }
    })
  );
}

describe('isOpaque', () => {
  it('walls are opaque', () => {
    expect(isOpaque('wall')).toBe(true);
  });

  it('secret doors are opaque', () => {
    expect(isOpaque('secret-door')).toBe(true);
  });

  it('pillars are opaque', () => {
    expect(isOpaque('pillar')).toBe(true);
  });

  it('floors are transparent', () => {
    expect(isOpaque('floor')).toBe(false);
  });

  it('regular doors are transparent', () => {
    expect(isOpaque('door-h')).toBe(false);
    expect(isOpaque('door-v')).toBe(false);
  });

  it('empty cells are transparent', () => {
    expect(isOpaque('empty')).toBe(false);
  });
});

describe('computeFOV', () => {
  it('origin is always visible', () => {
    const grid = buildGrid(['...', '...', '...']);
    const fov = computeFOV(grid, 1, 1);
    expect(fov.has('1,1')).toBe(true);
  });

  it('sees all cells in an open room', () => {
    const grid = buildGrid([
      '.....',
      '.....',
      '.....',
      '.....',
      '.....',
    ]);
    const fov = computeFOV(grid, 2, 2);
    // Should see all 25 cells
    expect(fov.size).toBe(25);
  });

  it('walls block vision behind them', () => {
    // A solid wall line blocks vision to cells behind it
    const grid = buildGrid([
      '.....',
      '.###.',
      '.....',
      '.....',
      '.....',
    ]);
    const fov = computeFOV(grid, 2, 0);
    expect(fov.has('2,0')).toBe(true);  // origin
    expect(fov.has('2,1')).toBe(true);  // wall itself visible
    expect(fov.has('2,4')).toBe(false); // fully behind wall line
  });

  it('respects radius limit', () => {
    const grid = buildGrid([
      '.......',
      '.......',
      '.......',
      '...O...',
      '.......',
      '.......',
      '.......',
    ]);
    const fov = computeFOV(grid, 3, 3, 1);
    // With radius 1, should only see cells within Chebyshev distance 1
    expect(fov.has('3,3')).toBe(true); // origin
    expect(fov.has('3,2')).toBe(true); // up
    expect(fov.has('3,4')).toBe(true); // down
    expect(fov.has('2,3')).toBe(true); // left
    expect(fov.has('4,3')).toBe(true); // right
    // Should NOT see cells at distance 2+
    expect(fov.has('3,1')).toBe(false);
    expect(fov.has('5,3')).toBe(false);
  });

  it('origin at corner sees along edges', () => {
    const grid = buildGrid([
      '...',
      '...',
      '...',
    ]);
    const fov = computeFOV(grid, 0, 0);
    expect(fov.has('0,0')).toBe(true);
    expect(fov.has('2,0')).toBe(true);
    expect(fov.has('0,2')).toBe(true);
    expect(fov.has('2,2')).toBe(true);
  });

  it('1x1 grid sees only the origin', () => {
    const grid = buildGrid(['.']);
    const fov = computeFOV(grid, 0, 0);
    expect(fov.size).toBe(1);
    expect(fov.has('0,0')).toBe(true);
  });

  it('pillar creates shadow behind it', () => {
    // Pillar in a large open area creates a shadow cone
    const grid = buildGrid([
      '.........',
      '.........',
      '.........',
      '.........',
      '....P....',
      '.........',
      '.........',
      '.........',
      '.........',
    ]);
    const fov = computeFOV(grid, 4, 0);
    expect(fov.has('4,4')).toBe(true);  // pillar itself visible
    expect(fov.has('4,8')).toBe(false); // directly behind pillar at distance
  });

  it('door does not block vision', () => {
    const grid = buildGrid([
      '..D..',
    ]);
    const fov = computeFOV(grid, 0, 0);
    expect(fov.has('2,0')).toBe(true); // door is visible
    expect(fov.has('4,0')).toBe(true); // can see through door
  });

  it('sees into a room through a doorway', () => {
    const grid = buildGrid([
      '.####',
      '.D...',
      '.####',
    ]);
    const fov = computeFOV(grid, 0, 1);
    expect(fov.has('1,1')).toBe(true); // door
    expect(fov.has('2,1')).toBe(true); // inside room
  });
});
