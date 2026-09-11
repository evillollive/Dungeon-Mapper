import { describe, expect, it } from 'vitest';
import { denseMapFixture, summarizeSamples } from '../../test/denseMapFixture.mjs';
import { deriveRenderableTiles } from '../derivedRenderMap';
import { getStampDef } from '../stampCatalog';
import { projectForAudience } from '../audienceProjection';

describe('F05 diagnostic fixture', () => {
  it('is deterministic, dense, derived and audience-safe', () => {
    const project = denseMapFixture();
    expect(project).toEqual(denseMapFixture());
    const map = project.levels[0];
    expect(map.tiles).toHaveLength(128);
    expect(map.tiles.every(row => row.length === 128)).toBe(true);
    expect(map.tokens).toHaveLength(100);
    expect(map.notes).toHaveLength(100);
    expect(map.stamps).toHaveLength(200);
    expect(map.stamps.every(stamp => getStampDef(stamp.stampId))).toBe(true);
    expect(map.dynamicFogEnabled && map.fogEnabled).toBe(true);
    expect(deriveRenderableTiles(map)).not.toEqual(map.tiles);
    expect(JSON.stringify(projectForAudience(map))).not.toContain('F05_PRIVATE_SENTINEL');
  });

  it('retains outliers and uses nearest-rank p95 without mutating sample order', () => {
    const samples = [500, ...Array.from({ length: 19 }, (_, i) => i + 1)];
    expect(summarizeSamples(samples)).toEqual({
      count: 20, medianMs: 10, p95Ms: 19, maxMs: 500, samplesMs: samples,
    });
    expect(samples[0]).toBe(500);
    for (const values of [[], [NaN], [-1], [Infinity]]) {
      expect(() => summarizeSamples(values)).toThrow();
    }
  });
});
