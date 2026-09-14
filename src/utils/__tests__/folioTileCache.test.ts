import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TileDrawContext } from '../../themes';
import { ALL_TILE_TYPES } from '../../types/map';
import { folioVariant } from '../../themes/folio-v1/art';
import { folioTheme } from '../../themes/folio-v1/theme';
import { FolioTileCache, FOLIO_TILE_CACHE_MAX_BYTES, FOLIO_TILE_CACHE_MAX_ENTRIES } from '../../themes/folio-v1/tileCache';

describe('bounded Folio floor sprites', () => {
  let ctx: CanvasRenderingContext2D;
  let cache: FolioTileCache;
  const material = (value?: string): TileDrawContext => ({
    getTileBaseType: () => 'floor', getFloorMaterial: () => value,
  });
  const xs = Array.from({ length: 4 }, (_, variant) =>
    Array.from({ length: 64 }, (_, x) => x).find(x => folioVariant(x, 0) === variant)!);

  beforeEach(() => {
    ctx = document.createElement('canvas').getContext('2d')!;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowColor = 'rgba(0, 0, 0, 0)';
    ctx.filter = 'none';
    cache = new FolioTileCache();
    cache.prepare(ctx, 32);
  });
  afterEach(() => {
    cache.clear();
    vi.restoreAllMocks();
  });

  it('reuses all four variants of each material without map coordinates in the key', () => {
    for (const value of [undefined, 'folio-worn-wood-v1', 'folio-earth-v1']) {
      for (let x = 0; x < 128; x++) cache.draw(ctx, 'floor', x, 0, 32, material(value));
    }
    expect(cache.stats).toMatchObject({ entries: FOLIO_TILE_CACHE_MAX_ENTRIES, misses: 12, hits: 372, overflow: 0 });
    const before = cache.stats;
    cache.prepare(ctx, 32);
    for (let x = 0; x < 128; x++) cache.draw(ctx, 'floor', x, 0, 32, material('folio-earth-v1'));
    expect(cache.stats.misses).toBe(before.misses);
    expect(cache.stats.rasterBytes).toBe(before.rasterBytes);
    expect(cache.stats.hits).toBe(before.hits + 128);
  });

  it('keeps symbols and neighbor-sensitive terrain on the direct renderer', () => {
    const direct = vi.spyOn(folioTheme, 'drawTile');
    const context = material();
    for (const type of ALL_TILE_TYPES.filter(type => type !== 'floor')) {
      cache.draw(ctx, type, 0, 0, 32, context);
      expect(direct).toHaveBeenLastCalledWith(ctx, type, 0, 0, 32, context);
    }
    expect(cache.stats.entries).toBe(0);
  });

  it('reuses ordinary floor art for unknown material IDs and does not merge valid materials', () => {
    cache.draw(ctx, 'floor', 0, 0, 32, material());
    cache.draw(ctx, 'floor', 0, 0, 32, material('missing-future-material'));
    expect(cache.stats).toMatchObject({ entries: 1, hits: 1 });
    cache.draw(ctx, 'floor', 0, 0, 32, material('folio-worn-wood-v1'));
    cache.draw(ctx, 'floor', 0, 0, 32, material('folio-earth-v1'));
    expect(cache.stats.entries).toBe(3);
    cache.draw(ctx, 'floor', 0, 0, 32, material());
    expect(cache.stats.hits).toBe(2);
  });

  it('falls back at the raster budget without reallocating on unchanged traversals', () => {
    cache.prepare(ctx, 128);
    const traverse = () => {
      for (const value of [undefined, 'folio-worn-wood-v1', 'folio-earth-v1']) {
        for (const x of xs) cache.draw(ctx, 'floor', x, 0, 128, material(value));
      }
    };
    traverse();
    expect(cache.stats.entries).toBe(7);
    expect(cache.stats.overflow).toBe(5);
    expect(cache.stats.rasterBytes).toBeLessThanOrEqual(FOLIO_TILE_CACHE_MAX_BYTES);
    const allocated = cache.stats.rasterBytes;
    const creation = vi.spyOn(document, 'createElement');
    traverse();
    expect(creation).not.toHaveBeenCalled();
    expect(cache.stats).toMatchObject({ misses: 7, hits: 7, overflow: 10, rasterBytes: allocated });
  });

  it('uses full-detail direct drawing above the physical sprite size limit', () => {
    cache.prepare(ctx, 129);
    const direct = vi.spyOn(folioTheme, 'drawTile');
    const context = material('folio-earth-v1');
    cache.draw(ctx, 'floor', 0, 0, 129, context);
    expect(direct).toHaveBeenCalledWith(ctx, 'floor', 0, 0, 129, context);
    expect(cache.stats.rasterBytes).toBe(0);
  });

  it.each(['size', 'DPR', 'clear'] as const)('releases all backing surfaces on %s changes', change => {
    const images = vi.spyOn(ctx, 'drawImage');
    cache.draw(ctx, 'floor', 0, 0, 32, material());
    const sprite = images.mock.calls[0][0];
    expect(sprite).toBeInstanceOf(HTMLCanvasElement);
    if (change === 'size') cache.prepare(ctx, 8);
    if (change === 'DPR') {
      const transform = ctx.getTransform();
      vi.spyOn(ctx, 'getTransform').mockReturnValue(Object.assign(transform, { a: 2, d: 2 }));
      cache.prepare(ctx, 32);
    }
    if (change === 'clear') cache.clear();
    expect(cache.stats).toMatchObject({ entries: 0, rasterBytes: 0 });
    expect(sprite).toMatchObject({ width: 0, height: 0 });
  });

  it.each(['alpha', 'composite', 'shadow', 'filter', 'dash', 'translation', 'rotation', 'fractional extent'] as const)(
    'uses the direct renderer for unsupported %s state',
    state => {
      if (state === 'alpha') ctx.globalAlpha = 0.5;
      if (state === 'composite') ctx.globalCompositeOperation = 'multiply';
      if (state === 'shadow') ctx.shadowColor = 'black';
      if (state === 'filter') ctx.filter = 'blur(1px)';
      if (state === 'dash') vi.spyOn(ctx, 'getLineDash').mockReturnValue([2, 2]);
      if (['translation', 'rotation', 'fractional extent'].includes(state)) {
        const transform = ctx.getTransform();
        vi.spyOn(ctx, 'getTransform').mockReturnValue(Object.assign(transform,
          state === 'translation' ? { e: 0.5 } : state === 'rotation' ? { b: 1 } : { a: 1.3, d: 1.3 }));
      }
      cache.prepare(ctx, 32);
      const direct = vi.spyOn(folioTheme, 'drawTile');
      const context = material();
      cache.draw(ctx, 'floor', 0, 0, 32, context);
      expect(direct).toHaveBeenCalledWith(ctx, 'floor', 0, 0, 32, context);
      expect(cache.stats.rasterBytes).toBe(0);
    },
  );

  it('stops optional sprite allocations for the frame if a sprite context is unavailable', () => {
    const allocation = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const direct = vi.spyOn(folioTheme, 'drawTile');
    cache.draw(ctx, 'floor', 0, 0, 32, material());
    cache.draw(ctx, 'floor', 1, 0, 32, material());
    expect(allocation).toHaveBeenCalledTimes(1);
    expect(direct).toHaveBeenCalledTimes(2);
    expect(cache.stats.rasterBytes).toBe(0);
  });
});
