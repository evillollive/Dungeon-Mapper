/**
 * Unit tests for src/utils/handDrawn.ts — Hand-Drawn Mode renderer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawHandDrawn, getStyleParams } from '../handDrawn';
import type { Tile, HandDrawnSettings } from '../../types/map';
import type { TileType } from '../../types/map';

// ── Test helpers ──────────────────────────────────────────────────────

function makeTiles(grid: string[][]): Tile[][] {
  return grid.map(row => row.map(type => ({ type: type as TileType })));
}

function makeSettings(overrides?: Partial<HandDrawnSettings>): HandDrawnSettings {
  return {
    enabled: true,
    style: 'sketchy',
    wobble: 0.3,
    crossHatch: 0.5,
    opacity: 0.8,
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
    beginPath: vi.fn(() => calls.push('beginPath')),
    moveTo: vi.fn(() => calls.push('moveTo')),
    lineTo: vi.fn(() => calls.push('lineTo')),
    stroke: vi.fn(() => calls.push('stroke')),
    globalAlpha: 1,
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    _calls: calls,
  } as unknown as CanvasRenderingContext2D & { _calls: string[] };
  return ctx;
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('drawHandDrawn', () => {
  let ctx: ReturnType<typeof mockCtx>;

  beforeEach(() => {
    ctx = mockCtx();
  });

  it('does nothing on an all-empty grid', () => {
    const tiles = makeTiles([
      ['empty', 'empty'],
      ['empty', 'empty'],
    ]);
    const settings = makeSettings();

    drawHandDrawn(ctx, tiles, 2, 2, 32, settings, false, []);

    // save+restore for outer scope, but no stroke calls for wobbly lines
    // because all tiles are empty
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('draws wobbly grid lines on non-empty tiles', () => {
    const tiles = makeTiles([
      ['floor', 'floor'],
      ['floor', 'floor'],
    ]);
    const settings = makeSettings();

    drawHandDrawn(ctx, tiles, 2, 2, 32, settings, false, []);

    // Should draw strokes for grid lines
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.beginPath).toHaveBeenCalled();
  });

  it('draws cross-hatch shading on wall tiles', () => {
    const tiles = makeTiles([
      ['wall', 'floor'],
      ['floor', 'floor'],
    ]);
    const settings = makeSettings({ crossHatch: 0.5 });

    drawHandDrawn(ctx, tiles, 2, 2, 32, settings, false, []);

    // Wall tile should trigger cross-hatch plus grid lines
    const strokeCount = ctx.stroke.mock.calls.length;
    expect(strokeCount).toBeGreaterThan(4); // More than just grid lines
  });

  it('skips cross-hatch when crossHatch is 0', () => {
    const tiles = makeTiles([
      ['wall', 'floor'],
    ]);
    const settingsWithHatch = makeSettings({ crossHatch: 0.5 });
    const settingsNoHatch = makeSettings({ crossHatch: 0 });

    const ctxWith = mockCtx();
    const ctxWithout = mockCtx();

    drawHandDrawn(ctxWith, tiles, 2, 1, 32, settingsWithHatch, false, []);
    drawHandDrawn(ctxWithout, tiles, 2, 1, 32, settingsNoHatch, false, []);

    // With hatch should have more strokes than without
    expect(ctxWith.stroke.mock.calls.length).toBeGreaterThan(
      ctxWithout.stroke.mock.calls.length
    );
  });

  it('draws bold outlines at wall-to-floor boundaries', () => {
    const tiles = makeTiles([
      ['wall', 'floor'],
    ]);
    const settings = makeSettings({ crossHatch: 0 });

    drawHandDrawn(ctx, tiles, 2, 1, 32, settings, false, []);

    // Should have both normal grid lines and bold boundary lines
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('is deterministic — same inputs produce same output', () => {
    const tiles = makeTiles([
      ['floor', 'wall'],
      ['water', 'floor'],
    ]);
    const settings = makeSettings();

    const ctx1 = mockCtx();
    const ctx2 = mockCtx();

    drawHandDrawn(ctx1, tiles, 2, 2, 32, settings, false, []);
    drawHandDrawn(ctx2, tiles, 2, 2, 32, settings, false, []);

    expect(ctx1.stroke.mock.calls.length).toBe(ctx2.stroke.mock.calls.length);
    expect(ctx1.moveTo.mock.calls.length).toBe(ctx2.moveTo.mock.calls.length);

    // Verify same positions for first few moveTo calls
    for (let i = 0; i < Math.min(5, ctx1.moveTo.mock.calls.length); i++) {
      expect(ctx1.moveTo.mock.calls[i]).toEqual(ctx2.moveTo.mock.calls[i]);
    }
  });

  it('all three styles produce output for the same input', () => {
    const tiles = makeTiles([
      ['floor', 'wall'],
      ['water', 'floor'],
    ]);

    for (const style of ['sketchy', 'pencil', 'ink'] as const) {
      const c = mockCtx();
      drawHandDrawn(c, tiles, 2, 2, 32, makeSettings({ style }), false, []);
      expect(c._calls.length).toBeGreaterThan(2); // more than just save/restore
    }
  });

  it('handles single-tile maps gracefully', () => {
    const tiles = makeTiles([['floor']]);
    const settings = makeSettings();

    drawHandDrawn(ctx, tiles, 1, 1, 32, settings, false, []);

    // Single filled tile should still get grid lines
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('handles large tile sizes', () => {
    const tiles = makeTiles([
      ['floor', 'wall'],
    ]);
    const settings = makeSettings();

    drawHandDrawn(ctx, tiles, 2, 1, 300, settings, false, []);

    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('works in print mode (B&W strokes)', () => {
    const tiles = makeTiles([
      ['floor', 'wall'],
    ]);
    const settings = makeSettings();

    // Should not throw
    drawHandDrawn(ctx, tiles, 2, 1, 32, settings, true, []);

    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('applies higher wobble amplitude with larger wobble value', () => {
    const tiles = makeTiles([
      ['floor', 'floor'],
    ]);

    const ctxLow = mockCtx();
    const ctxHigh = mockCtx();

    drawHandDrawn(ctxLow, tiles, 2, 1, 64, makeSettings({ wobble: 0.1, crossHatch: 0 }), false, []);
    drawHandDrawn(ctxHigh, tiles, 2, 1, 64, makeSettings({ wobble: 1.0, crossHatch: 0 }), false, []);

    // Both should draw lines, but with different amplitudes
    // We can verify by checking that the lineTo coordinates differ
    expect(ctxLow.lineTo).toHaveBeenCalled();
    expect(ctxHigh.lineTo).toHaveBeenCalled();

    // At least one lineTo call should have different y-coordinates
    // between high and low wobble (for horizontal lines)
    let foundDifference = false;
    const minCalls = Math.min(ctxLow.lineTo.mock.calls.length, ctxHigh.lineTo.mock.calls.length);
    for (let i = 0; i < minCalls; i++) {
      if (ctxLow.lineTo.mock.calls[i][1] !== ctxHigh.lineTo.mock.calls[i][1]) {
        foundDifference = true;
        break;
      }
    }
    expect(foundDifference).toBe(true);
  });

  it('treats pillar tiles as wall for cross-hatching', () => {
    const tiles = makeTiles([
      ['pillar', 'floor'],
    ]);
    const settings = makeSettings({ crossHatch: 0.5 });

    drawHandDrawn(ctx, tiles, 2, 1, 32, settings, false, []);

    // Pillar should get cross-hatch like wall
    const strokeCount = ctx.stroke.mock.calls.length;
    expect(strokeCount).toBeGreaterThan(4);
  });
});

describe('getStyleParams', () => {
  it('returns params for all three styles', () => {
    for (const style of ['sketchy', 'pencil', 'ink'] as const) {
      const params = getStyleParams(style);
      expect(params).toBeDefined();
      expect(params.lineWidthMul).toBeGreaterThan(0);
      expect(params.wobbleFreq).toBeGreaterThan(0);
      expect(params.hatchSpacingMul).toBeGreaterThan(0);
      expect(params.hatchWidthMul).toBeGreaterThan(0);
      expect(params.hatchDirections).toBeGreaterThanOrEqual(1);
      expect(params.strokeAlpha).toBeGreaterThan(0);
      expect(params.strokeAlpha).toBeLessThanOrEqual(1);
    }
  });

  it('ink style has bolder lines than pencil', () => {
    const ink = getStyleParams('ink');
    const pencil = getStyleParams('pencil');
    expect(ink.lineWidthMul).toBeGreaterThan(pencil.lineWidthMul);
    expect(ink.strokeAlpha).toBeGreaterThan(pencil.strokeAlpha);
  });

  it('pencil style uses single hatch direction', () => {
    const pencil = getStyleParams('pencil');
    expect(pencil.hatchDirections).toBe(1);
  });

  it('sketchy and ink styles use cross-hatching (2 directions)', () => {
    expect(getStyleParams('sketchy').hatchDirections).toBe(2);
    expect(getStyleParams('ink').hatchDirections).toBe(2);
  });
});
