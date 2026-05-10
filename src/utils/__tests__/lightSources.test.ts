import { describe, expect, it } from 'vitest';
import { computeLightVisible } from '../lightSources';
import type { LightSource, Tile } from '../../types/map';

function grid(rows: string[]): Tile[][] {
  return rows.map(row => [...row].map(ch => ({ type: ch === '#' ? 'wall' : 'floor' } as Tile)));
}

describe('computeLightVisible', () => {
  it('returns null when no light sources exist', () => {
    expect(computeLightVisible(grid(['...']), [])).toBeNull();
    expect(computeLightVisible(grid(['...']), undefined)).toBeNull();
  });

  it('unions light-source FOV and respects radius', () => {
    const lights: LightSource[] = [
      { id: 1, x: 0, y: 0, radius: 1, color: '#fff', label: 'Torch' },
      { id: 2, x: 4, y: 0, radius: 1, color: '#fff', label: 'Lantern' },
    ];

    const visible = computeLightVisible(grid(['.....']), lights);

    expect(visible?.has('0,0')).toBe(true);
    expect(visible?.has('1,0')).toBe(true);
    expect(visible?.has('4,0')).toBe(true);
    expect(visible?.has('2,0')).toBe(false);
  });

  it('does not illuminate through walls', () => {
    const visible = computeLightVisible(grid(['..#..']), [
      { id: 1, x: 0, y: 0, radius: 0, color: '#fff', label: 'Torch' },
    ]);

    expect(visible?.has('2,0')).toBe(true);
    expect(visible?.has('4,0')).toBe(false);
  });
});
