/**
 * Unit tests for src/utils/edgeBlend.ts — Edge Blending renderer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { drawEdgeBlending, EdgeBlendCache, EDGE_BLEND_CACHE_MAX_BYTES, EDGE_BLEND_CACHE_MAX_ENTRIES } from '../edgeBlend';
import type { Tile, EdgeBlendSettings } from '../../types/map';
import type { TileTheme } from '../../themes';
import type { BuiltInTileType, TileType } from '../../types/map';

// ── Minimal mock theme ────────────────────────────────────────────────

const mockTileColors: Record<string, string> = {
  empty: '#1a1a2e',
  floor: '#c9b896',
  wall: '#3d3d5c',
  water: '#3a6ea5',
  door: '#8b6914',
};

const mockTheme: TileTheme = {
  id: 'test',
  name: 'Test Theme',
  tiles: [],
  emptyTileId: 'empty',
  cssVars: {},
  tileColors: mockTileColors as Record<BuiltInTileType, string> & Record<string, string>,
  gridColor: '#2d3561',
  drawTile: () => {},
};

// ── Test helpers ──────────────────────────────────────────────────────

function makeTiles(grid: string[][]): Tile[][] {
  return grid.map(row => row.map(type => ({ type: type as TileType })));
}

function makeSettings(overrides?: Partial<EdgeBlendSettings>): EdgeBlendSettings {
  return {
    enabled: true,
    style: 'dither',
    intensity: 0.35,
    opacity: 0.6,
    ...overrides,
  };
}

/**
 * Create a minimal mock CanvasRenderingContext2D that records calls.
 */
function mockCtx() {
  const calls: string[] = [];
  const ctx = {
    save: vi.fn(() => calls.push('save')),
    restore: vi.fn(() => calls.push('restore')),
    fillRect: vi.fn(() => calls.push('fillRect')),
    beginPath: vi.fn(() => calls.push('beginPath')),
    arc: vi.fn(() => calls.push('arc')),
    fill: vi.fn(() => calls.push('fill')),
    drawImage: vi.fn(),
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    filter: 'none',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowColor: 'rgba(0, 0, 0, 0)',
    fillStyle: '',
    _calls: calls,
  } as unknown as CanvasRenderingContext2D & { _calls: string[] };
  return ctx;
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('drawEdgeBlending', () => {
  let ctx: ReturnType<typeof mockCtx>;

  beforeEach(() => {
    ctx = mockCtx();
  });

  describe('bounded edge strip cache', () => {
    let atlasContexts: ReturnType<typeof mockCtx>[];
    let cache: EdgeBlendCache;
    let ctx: ReturnType<typeof mockCtx>;
    const tiles = makeTiles([['floor', 'wall'], ['water', 'floor']]);
    const draw = (grid = tiles, settings = makeSettings(), theme = mockTheme, size = 32) =>
      drawEdgeBlending(ctx, grid, grid[0].length, grid.length, size, settings, theme, [], cache);

    beforeEach(() => {
      atlasContexts = [];
      cache = new EdgeBlendCache();
      ctx = mockCtx();
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
        const context = mockCtx();
        atlasContexts.push(context);
        return context;
      });
    });

    afterEach(() => {
      cache.clear();
      vi.restoreAllMocks();
    });

    it('reuses all unchanged edges without repeating dot fills', () => {
      draw();
      expect(cache.stats).toMatchObject({ entries: 8, misses: 8, hits: 0, bypasses: 0 });
      const fills = atlasContexts.map(context => context.fillRect.mock.calls.length);
      expect(fills.every(count => count > 0)).toBe(true);
      expect(atlasContexts.every(context => context.clearRect.mock.calls.length === 0)).toBe(true);
      const lastWrite = Math.max(...atlasContexts.flatMap(context => context.fillRect.mock.invocationCallOrder));
      expect(lastWrite).toBeLessThan(ctx.drawImage.mock.invocationCallOrder[0]);
      expect(ctx.fillRect).not.toHaveBeenCalled();
      draw();
      expect(cache.stats).toMatchObject({ entries: 8, misses: 8, hits: 8 });
      expect(atlasContexts.map(context => context.fillRect.mock.calls.length)).toEqual(fills);
      expect(ctx.drawImage).toHaveBeenCalledTimes(16);
    });

    it('invalidates only changed neighbor colors and restores them on undo', () => {
      draw();
      const edited = makeTiles([['floor', 'water'], ['water', 'floor']]);
      draw(edited);
      expect(cache.stats).toMatchObject({ entries: 8, misses: 10, hits: 6 });
      expect(atlasContexts.reduce((sum, context) => sum + context.clearRect.mock.calls.length, 0)).toBe(2);
      draw();
      expect(cache.stats).toMatchObject({ entries: 8, misses: 12, hits: 12 });
      draw(tiles, makeSettings(), { ...mockTheme, tileColors: { ...mockTheme.tileColors, floor: '#123456' } });
      expect(cache.stats.misses).toBe(16);
    });

    it('does not replay edges removed by painting or empty neighbors', () => {
      draw();
      ctx.drawImage.mockClear();
      draw(makeTiles([['floor', 'floor'], ['empty', 'floor']]));
      expect(ctx.drawImage).not.toHaveBeenCalled();
      draw();
      expect(cache.stats.hits).toBe(8);
    });

    it('resolves custom tile semantics on every traversal', () => {
      const customThemes = [{
        id: 'custom-theme:example' as const, name: 'Example', baseThemeId: 'dungeon',
        gridColor: '#111111', tileColors: {}, tileLabels: {},
        customTiles: [{ id: 'custom:stone' as const, label: 'Stone', color: '#999999', baseType: 'floor' as const }],
      }];
      const grid = makeTiles([['custom:stone', 'wall'], ['empty', 'empty']]);
      drawEdgeBlending(ctx, grid, 2, 2, 32, makeSettings(), mockTheme, customThemes, cache);
      expect(cache.stats.entries).toBe(2);
      ctx.drawImage.mockClear();
      const changed = [{ ...customThemes[0], customTiles: [{ ...customThemes[0].customTiles[0], baseType: 'wall' as const }] }];
      drawEdgeBlending(ctx, grid, 2, 2, 32, makeSettings(), mockTheme, changed, cache);
      expect(ctx.drawImage).not.toHaveBeenCalled();
      drawEdgeBlending(ctx, grid, 2, 2, 32, makeSettings(), mockTheme, customThemes, cache);
      expect(cache.stats.hits).toBe(2);
    });

    it('matches small-map surface dimensions and invalidates resized pages', () => {
      draw();
      const pages = ctx.drawImage.mock.calls.map(call => call[0] as HTMLCanvasElement);
      expect(pages.every(page => page.width === 64 && page.height === 64)).toBe(true);
      expect(cache.stats.rasterBytes).toBe(cache.stats.pages * 64 * 64 * 4);
      ctx.drawImage.mockClear();
      draw(makeTiles([['floor', 'wall', 'floor'], ['water', 'floor', 'water']]));
      expect(pages.every(page => page.width === 0 && page.height === 0)).toBe(true);
      expect(ctx.drawImage.mock.calls.every(call => {
        const page = call[0] as HTMLCanvasElement;
        return page.width === 96 && page.height === 64;
      })).toBe(true);
    });

    it.each([
      ['intensity', makeSettings({ intensity: 0.8 }), 32, 1],
      ['opacity', makeSettings({ opacity: 0.2 }), 32, 1],
      ['tile size', makeSettings(), 64, 1],
      ['DPR', makeSettings(), 32, 2],
    ] as const)('releases old raster pages on %s changes', (_label, settings, size, dpr) => {
      draw();
      const oldCanvases = ctx.drawImage.mock.calls.map(call => call[0] as HTMLCanvasElement);
      ctx.getTransform.mockReturnValue({ a: dpr, b: 0, c: 0, d: dpr, e: 0, f: 0 });
      draw(tiles, settings, mockTheme, size);
      expect(oldCanvases.every(canvas => canvas.width === 0 && canvas.height === 0)).toBe(true);
      expect(cache.stats).toMatchObject({ misses: 8, hits: 0, entries: 8 });
    });

    it.each(['smooth', 'stipple', 'disabled', 'unaligned', 'rotated', 'filtered', 'shadow', 'composite'] as const)(
      'uses direct drawing and releases the cache for %s',
      mode => {
        draw();
        ctx.drawImage.mockClear();
        const settings = makeSettings();
        if (mode === 'smooth' || mode === 'stipple') settings.style = mode;
        if (mode === 'disabled') settings.enabled = false;
        if (mode === 'unaligned') ctx.getTransform.mockReturnValue({ a: 1.1, b: 0, c: 0, d: 1.1, e: 0, f: 0 });
        if (mode === 'rotated') ctx.getTransform.mockReturnValue({ a: 0, b: 1, c: -1, d: 0, e: 0, f: 0 });
        if (mode === 'filtered') ctx.filter = 'blur(2px)';
        if (mode === 'shadow') ctx.shadowColor = '#000000';
        if (mode === 'composite') ctx.globalCompositeOperation = 'multiply';
        draw(tiles, settings);
        expect(ctx.drawImage).not.toHaveBeenCalled();
        expect(cache.stats.rasterBytes).toBe(0);
        expect(cache.stats.entries).toBe(0);
        if (mode !== 'disabled') expect(ctx.fillRect.mock.calls.length + ctx.fill.mock.calls.length).toBeGreaterThan(0);
      },
    );

    it('bounds raster allocation and retains hot strips when the traversal exceeds capacity', () => {
      const dense = Array.from({ length: 32 }, (_, y) =>
        Array.from({ length: 32 }, (_, x) => ({ type: (x + y) % 2 ? 'floor' : 'wall' })));
      draw(dense, makeSettings(), mockTheme, 256);
      const first = cache.stats;
      expect(first.rasterBytes).toBe(EDGE_BLEND_CACHE_MAX_BYTES);
      expect(first.entries).toBeLessThanOrEqual(EDGE_BLEND_CACHE_MAX_ENTRIES);
      expect(first.bypasses).toBeGreaterThan(0);
      draw(dense, makeSettings(), mockTheme, 256);
      expect(cache.stats).toMatchObject({
        rasterBytes: first.rasterBytes, entries: first.entries, misses: first.misses,
        hits: first.entries, bypasses: first.bypasses * 2,
      });
    });

    it('bounds metadata independently for very small strips', () => {
      cache.prepare(ctx, 1, makeSettings(), 512, 512);
      for (let x = 0; x < EDGE_BLEND_CACHE_MAX_ENTRIES + 1; x++) {
        cache.draw(ctx, 1, 'N', '#123456', 0.35, 0.6, x, 0);
      }
      expect(cache.stats.entries).toBe(EDGE_BLEND_CACHE_MAX_ENTRIES);
      expect(cache.stats.bypasses).toBe(1);
      expect(cache.stats.rasterBytes).toBeLessThanOrEqual(EDGE_BLEND_CACHE_MAX_BYTES);
    });

    it('does not allocate an oversized strip and frees all pages on clear', () => {
      draw(tiles, makeSettings(), mockTheme, 600);
      expect(cache.stats).toMatchObject({ entries: 0, rasterBytes: 0, bypasses: 8 });
      expect(ctx.fillRect).toHaveBeenCalled();
      draw();
      const canvases = ctx.drawImage.mock.calls.map(call => call[0] as HTMLCanvasElement);
      cache.clear();
      expect(cache.stats).toMatchObject({ entries: 0, rasterBytes: 0 });
      expect(canvases.every(canvas => canvas.width === 0 && canvas.height === 0)).toBe(true);
    });
  });

  it('does nothing when disabled', () => {
    const tiles = makeTiles([['floor', 'wall']]);
    const settings = makeSettings({ enabled: false });

    drawEdgeBlending(ctx, tiles, 2, 1, 32, settings, mockTheme, []);

    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.save).not.toHaveBeenCalled();
  });

  it('does nothing when all tiles are the same type', () => {
    const tiles = makeTiles([
      ['floor', 'floor'],
      ['floor', 'floor'],
    ]);
    const settings = makeSettings();

    drawEdgeBlending(ctx, tiles, 2, 2, 32, settings, mockTheme, []);

    // save/restore for the outer scope, but no fillRect calls
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('draws blend effects between adjacent tiles of different types (dither)', () => {
    const tiles = makeTiles([
      ['floor', 'wall'],
    ]);
    const settings = makeSettings({ style: 'dither' });

    drawEdgeBlending(ctx, tiles, 2, 1, 32, settings, mockTheme, []);

    // Dither style produces fillRect calls for individual dots
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('draws blend effects between adjacent tiles of different types (smooth)', () => {
    const tiles = makeTiles([
      ['floor', 'wall'],
    ]);
    const settings = makeSettings({ style: 'smooth' });

    drawEdgeBlending(ctx, tiles, 2, 1, 32, settings, mockTheme, []);

    // Smooth style uses createLinearGradient + fillRect
    expect(ctx.createLinearGradient).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('draws blend effects between adjacent tiles of different types (stipple)', () => {
    const tiles = makeTiles([
      ['floor', 'wall'],
    ]);
    const settings = makeSettings({ style: 'stipple' });

    drawEdgeBlending(ctx, tiles, 2, 1, 32, settings, mockTheme, []);

    // Stipple style uses arc + fill for dots
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('skips empty tiles', () => {
    const tiles = makeTiles([
      ['empty', 'floor'],
    ]);
    const settings = makeSettings();

    drawEdgeBlending(ctx, tiles, 2, 1, 32, settings, mockTheme, []);

    // Empty tiles are skipped, and floor's only neighbour is empty (also skipped)
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('handles vertical adjacency', () => {
    const tiles = makeTiles([
      ['floor'],
      ['water'],
    ]);
    const settings = makeSettings({ style: 'dither' });

    drawEdgeBlending(ctx, tiles, 1, 2, 32, settings, mockTheme, []);

    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('blends more with higher intensity', () => {
    const tiles = makeTiles([
      ['floor', 'wall'],
    ]);

    const lowCtx = mockCtx();
    const highCtx = mockCtx();

    drawEdgeBlending(lowCtx, tiles, 2, 1, 64, makeSettings({ style: 'dither', intensity: 0.1 }), mockTheme, []);
    drawEdgeBlending(highCtx, tiles, 2, 1, 64, makeSettings({ style: 'dither', intensity: 1.0 }), mockTheme, []);

    const lowFills = lowCtx.fillRect.mock.calls.length;
    const highFills = highCtx.fillRect.mock.calls.length;

    // Higher intensity should produce at least as many or more fill calls
    expect(highFills).toBeGreaterThanOrEqual(lowFills);
  });

  it('is deterministic — same inputs produce same output', () => {
    const tiles = makeTiles([
      ['floor', 'wall'],
      ['water', 'floor'],
    ]);
    const settings = makeSettings({ style: 'dither' });

    const ctx1 = mockCtx();
    const ctx2 = mockCtx();

    drawEdgeBlending(ctx1, tiles, 2, 2, 32, settings, mockTheme, []);
    drawEdgeBlending(ctx2, tiles, 2, 2, 32, settings, mockTheme, []);

    expect(ctx1.fillRect.mock.calls.length).toBe(ctx2.fillRect.mock.calls.length);
    // Verify same positions — check first few calls
    for (let i = 0; i < Math.min(5, ctx1.fillRect.mock.calls.length); i++) {
      expect(ctx1.fillRect.mock.calls[i]).toEqual(ctx2.fillRect.mock.calls[i]);
    }
  });

  it('handles single-tile maps gracefully', () => {
    const tiles = makeTiles([['floor']]);
    const settings = makeSettings();

    drawEdgeBlending(ctx, tiles, 1, 1, 32, settings, mockTheme, []);

    // Single tile has no neighbours — no blend effects
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('handles large tile sizes', () => {
    const tiles = makeTiles([
      ['floor', 'wall'],
    ]);
    const settings = makeSettings({ style: 'smooth' });

    drawEdgeBlending(ctx, tiles, 2, 1, 300, settings, mockTheme, []);

    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('all three styles produce output for the same input', () => {
    const tiles = makeTiles([
      ['floor', 'wall'],
      ['water', 'floor'],
    ]);

    for (const style of ['dither', 'smooth', 'stipple'] as const) {
      const c = mockCtx();
      drawEdgeBlending(c, tiles, 2, 2, 32, makeSettings({ style }), mockTheme, []);
      // Each style should draw something
      expect(c._calls.length).toBeGreaterThan(2); // more than just save/restore
    }
  });
});
