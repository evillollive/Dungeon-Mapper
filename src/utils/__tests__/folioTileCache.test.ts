import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TileDrawContext } from '../../themes';
import { ALL_TILE_TYPES } from '../../types/map';
import { folioTheme } from '../../themes/folio-v1/theme';
import { FolioTileCache, FOLIO_TILE_CACHE_MAX_ENTRIES, FOLIO_TILE_CACHE_MAX_PATHS } from '../../themes/folio-v1/tileCache';

describe('bounded Folio floor paths', () => {
  let ctx: CanvasRenderingContext2D;
  let cache: FolioTileCache;
  const material = (value?: string): TileDrawContext => ({
    getTileBaseType: () => 'floor', getFloorMaterial: () => value,
  });
  beforeEach(() => {
    ctx = document.createElement('canvas').getContext('2d')!;
    cache = new FolioTileCache();
    cache.prepare(ctx, 32);
  });
  afterEach(() => { cache.clear(); vi.restoreAllMocks(); });

  it('reuses all variants without per-frame path construction or raster allocations', () => {
    const creation = vi.spyOn(document, 'createElement');
    const line = vi.spyOn(Path2D.prototype, 'lineTo');
    const arc = vi.spyOn(Path2D.prototype, 'arc');
    const traverse = () => {
      for (const value of [undefined, 'folio-worn-wood-v1', 'folio-earth-v1']) {
        for (let x = 0; x < 128; x++) cache.draw(ctx, 'floor', x, 0, 32, material(value));
      }
    };
    traverse();
    expect(cache.stats).toMatchObject({ entries: FOLIO_TILE_CACHE_MAX_ENTRIES,
      paths: FOLIO_TILE_CACHE_MAX_PATHS, misses: 12, hits: 372 });
    line.mockClear();
    arc.mockClear();
    traverse();
    expect(line).not.toHaveBeenCalled();
    expect(arc).not.toHaveBeenCalled();
    expect(creation).not.toHaveBeenCalled();
    expect(cache.stats).toMatchObject({ entries: 12, paths: 56, misses: 12, hits: 756 });
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

  it('shares the unknown-material fallback without merging valid materials', () => {
    cache.draw(ctx, 'floor', 0, 0, 32, material());
    cache.draw(ctx, 'floor', 0, 0, 32, material('future-material'));
    expect(cache.stats).toMatchObject({ entries: 1, hits: 1 });
    cache.draw(ctx, 'floor', 0, 0, 32, material('folio-worn-wood-v1'));
    cache.draw(ctx, 'floor', 0, 0, 32, material('folio-earth-v1'));
    expect(cache.stats.entries).toBe(3);
  });

  it('retains full-detail paths at high resolutions and fractional device scales', () => {
    cache.prepare(ctx, 256);
    const creation = vi.spyOn(document, 'createElement');
    cache.draw(ctx, 'floor', 0, 0, 256, material('folio-earth-v1'));
    const initial = cache.stats;
    const transform = ctx.getTransform();
    vi.spyOn(ctx, 'getTransform').mockReturnValue(Object.assign(transform, { a: 1.3, d: 1.3, e: 0.5 }));
    cache.prepare(ctx, 256);
    cache.draw(ctx, 'floor', 0, 0, 256, material('folio-earth-v1'));
    expect(cache.stats).toMatchObject({ entries: initial.entries, paths: initial.paths, misses: 1, hits: 1 });
    expect(creation).not.toHaveBeenCalled();
  });

  it('releases path references on clear and changes the detail tier on size changes', () => {
    cache.draw(ctx, 'floor', 0, 0, 32, material('folio-worn-wood-v1'));
    expect(cache.stats.paths).toBe(7);
    cache.prepare(ctx, 8);
    expect(cache.stats).toMatchObject({ entries: 0, paths: 0 });
    cache.draw(ctx, 'floor', 0, 0, 8, material('folio-worn-wood-v1'));
    expect(cache.stats.paths).toBe(2);
    cache.clear();
    expect(cache.stats).toEqual({ entries: 0, paths: 0, hits: 0, misses: 0 });
  });

  it('uses the ordinary drawer until the destination has been prepared', () => {
    cache.clear();
    const direct = vi.spyOn(folioTheme, 'drawTile');
    const context = material();
    cache.draw(ctx, 'floor', 0, 0, 32, context);
    expect(direct).toHaveBeenCalledWith(ctx, 'floor', 0, 0, 32, context);
    expect(cache.stats.entries).toBe(0);
  });

  it.each([0.4, 1])('does not bake the caller alpha %s into cached paths', alpha => {
    const fill = vi.spyOn(ctx, 'fill');
    cache.draw(ctx, 'floor', 0, 0, 32, material('folio-earth-v1'));
    const path = fill.mock.calls[0][0];
    ctx.globalAlpha = alpha;
    fill.mockClear();
    cache.draw(ctx, 'floor', 0, 0, 32, material('folio-earth-v1'));
    expect(fill.mock.calls[0][0]).toBe(path);
    expect(ctx.globalAlpha).toBe(alpha);
    ctx.globalAlpha = 1;
  });
});
