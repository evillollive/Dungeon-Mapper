import { describe, expect, it } from 'vitest';
import { bresenhamLine, pointNearPolyline, rectCells, rectOutline, snapToGridIntersection } from '../canvasGeometry';

describe('canvas geometry helpers', () => {
  it('builds bresenham lines in both directions', () => {
    expect(bresenhamLine(0, 0, 3, 1)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ]);
    expect(bresenhamLine(3, 1, 0, 0)).toEqual([
      { x: 3, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ]);
  });

  it('returns rectangle outlines and filled cells independent of drag direction', () => {
    expect(rectOutline(2, 2, 0, 0)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 2 },
      { x: 1, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 1 },
      { x: 2, y: 1 },
    ]);
    expect(rectCells(1, 1, 2, 2)).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ]);
  });

  it('snaps fractional wall coordinates to grid intersections', () => {
    expect(snapToGridIntersection(1.49, 2.5)).toEqual({ x: 1, y: 3 });
  });

  it('hit-tests points near polyline segments and single-point paths', () => {
    expect(pointNearPolyline(1, 0.1, [{ x: 0, y: 0 }, { x: 2, y: 0 }], 0.2)).toBe(true);
    expect(pointNearPolyline(1, 0.3, [{ x: 0, y: 0 }, { x: 2, y: 0 }], 0.2)).toBe(false);
    expect(pointNearPolyline(2.05, 2, [{ x: 2, y: 2 }], 0.1)).toBe(true);
  });
});
