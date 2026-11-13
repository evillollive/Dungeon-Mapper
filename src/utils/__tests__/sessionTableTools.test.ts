import { describe, expect, it } from 'vitest';
import { cellsPath, extendStroke, markerAtCell, measureBetween, measurePath } from '../sessionTableTools';
import type { ShapeMarker } from '../../types/map';

describe('session table tools', () => {
  it('fills cells skipped by a fast brush stroke without repeating any', () => {
    const stroke = extendStroke(extendStroke([], { x: 1, y: 1 }), { x: 4, y: 1 });
    expect(stroke).toEqual([1, 2, 3, 4].map(x => ({ x, y: 1 })));
    expect(extendStroke(stroke, { x: 4, y: 1 })).toBe(stroke);
    expect(extendStroke(stroke, { x: 2, y: 1 })).toEqual(stroke);
    expect(extendStroke(stroke, { x: 4, y: 3 })).toEqual([...stroke, { x: 4, y: 2 }, { x: 4, y: 3 }]);
  });

  it('reports straight distance and grid squares separately', () => {
    expect(measureBetween({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)).toEqual({ straight: 5, squares: 4, feet: 20 });
    expect(measureBetween({ x: 6, y: 2 }, { x: 2, y: 2 }, 10)).toEqual({ straight: 4, squares: 4, feet: 40 });
  });

  it('draws each measure shape between cell centres', () => {
    const from = { x: 2, y: 2 }, to = { x: 5, y: 2 };
    expect(measurePath('ruler', from, to)).toBe('M2.5 2.5L5.5 2.5');
    expect(measurePath('circle', from, to)).toBe('M-0.5 2.5a3 3 0 1 0 6 0a3 3 0 1 0 -6 0Z');
    expect(measurePath('line', from, to)).toBe('M2.5 3L5.5 3L5.5 2L2.5 2Z');
    // A 90 degree cone pointing east from the origin, radius three squares.
    expect(measurePath('cone', from, to)).toBe('M2.5 2.5L4.621 0.379A3 3 0 0 1 4.621 4.621Z');
    expect(measurePath('circle', from, from)).toBe('');
    expect(measurePath('cone', from, from)).toBe('');
  });

  it('covers a set of cells with merged horizontal runs', () => {
    expect(cellsPath(new Set(['1,0', '2,0', '0,1', '2,1']), 3, 2)).toBe('M1 0h2v1h-2ZM0 1h1v1h-1ZM2 1h1v1h-1Z');
    expect(cellsPath(['9,9'], 3, 2)).toBe('');
  });

  it('finds the top-most marker covering a cell', () => {
    const markers: ShapeMarker[] = [
      { id: 1, x: 5, y: 5, shape: 'square', color: '#dc2626', size: 2 },
      { id: 2, x: 5, y: 5, shape: 'circle', color: '#dc2626', size: 1 },
      { id: 3, x: 12, y: 5, shape: 'diamond', color: '#dc2626', size: 2 },
    ];
    expect(markerAtCell(markers, { x: 5, y: 6 })?.id).toBe(2);
    expect(markerAtCell(markers, { x: 7, y: 7 })?.id).toBe(1);
    expect(markerAtCell(markers, { x: 13, y: 6 })?.id).toBe(3);
    expect(markerAtCell(markers, { x: 14, y: 7 })).toBeNull();
    expect(markerAtCell(undefined, { x: 0, y: 0 })).toBeNull();
  });
});
