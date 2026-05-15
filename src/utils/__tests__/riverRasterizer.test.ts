import { describe, expect, it } from 'vitest';
import { createDefaultMap } from '../../hooks/mapStateUtils';
import { deriveRenderableTiles } from '../derivedRenderMap';
import { rasterizeRivers, sampleRiverCurve } from '../riverRasterizer';
import type { River, Tile } from '../../types/map';

function emptyGrid(width: number, height: number): Tile[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ type: 'empty' as const })),
  );
}

describe('riverRasterizer', () => {
  it('rasterizes river control points to water tiles with flow metadata', () => {
    const river: River = {
      id: 7,
      controlPoints: [{ x: 0.5, y: 1.5 }, { x: 4.5, y: 1.5 }],
      width: 1,
      flowDirection: 0,
      type: 'water',
    };

    const out = rasterizeRivers(emptyGrid(6, 4), [river], 6, 4);

    expect(out[1][2].type).toBe('water');
    expect(out[1][2].riverId).toBe(7);
    expect(out[1][2].riverType).toBe('water');
    expect(out[1][2].flowDirection).toBeCloseTo(0);
  });

  it('clips rivers to map bounds', () => {
    const river: River = {
      id: 1,
      controlPoints: [{ x: -2, y: 0.5 }, { x: 2.5, y: 0.5 }],
      width: 1,
      flowDirection: 0,
      type: 'underground-stream',
    };

    const out = rasterizeRivers(emptyGrid(3, 2), [river], 3, 2);

    expect(out[0].some(tile => tile.type === 'water')).toBe(true);
  });

  it('samples multi-point rivers as smooth curves', () => {
    const samples = sampleRiverCurve({
      controlPoints: [{ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 4, y: 0 }],
    });

    expect(samples.length).toBeGreaterThan(3);
    expect(samples[0]).toEqual({ x: 0, y: 0 });
    expect(samples[samples.length - 1]).toEqual({ x: 4, y: 0 });
  });

  it('derives river tiles for shared render paths', () => {
    const map = createDefaultMap('River Map');
    map.meta.width = 5;
    map.meta.height = 3;
    map.tiles = emptyGrid(5, 3);
    map.rivers = [{
      id: 2,
      controlPoints: [{ x: 0.5, y: 1.5 }, { x: 4.5, y: 1.5 }],
      width: 1,
      flowDirection: 0,
      type: 'water',
    }];

    const derived = deriveRenderableTiles(map);

    expect(derived[1][2].type).toBe('water');
    expect(derived[1][2].riverId).toBe(2);
  });
});
