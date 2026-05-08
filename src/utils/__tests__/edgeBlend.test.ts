/**
 * Unit tests for src/utils/edgeBlend.ts — Edge Blending renderer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawEdgeBlending } from '../edgeBlend';
import type { Tile, EdgeBlendSettings } from '../../types/map';
import type { TileTheme, TileDrawContext } from '../../themes';
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
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    globalAlpha: 1,
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
