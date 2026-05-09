/**
 * Unit tests for src/utils/lightingAtmosphere.ts — Lighting & Atmosphere renderer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawLightingAtmosphere, _isWallLike_test, COLOR_GRADING_TINTS } from '../lightingAtmosphere';
import type { Tile, LightingAtmosphereSettings, PlacedStamp } from '../../types/map';
import { DEFAULT_LIGHTING_ATMOSPHERE } from '../../types/map';
import type { TileType } from '../../types/map';

// ── Test helpers ──────────────────────────────────────────────────────

function makeTiles(grid: string[][]): Tile[][] {
  return grid.map(row => row.map(type => ({ type: type as TileType })));
}

function makeSettings(overrides?: Partial<LightingAtmosphereSettings>): LightingAtmosphereSettings {
  return {
    ...DEFAULT_LIGHTING_ATMOSPHERE,
    ...overrides,
  };
}

function makeStamp(x: number, y: number, overrides?: Partial<PlacedStamp>): PlacedStamp {
  return {
    id: 1,
    stampId: 'test-stamp',
    x,
    y,
    scale: 1,
    rotation: 0,
    flipX: false,
    flipY: false,
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
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    _calls: calls,
  } as unknown as CanvasRenderingContext2D & { _calls: string[] };
  return ctx;
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('DEFAULT_LIGHTING_ATMOSPHERE', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_LIGHTING_ATMOSPHERE.enabled).toBe(true);
    expect(DEFAULT_LIGHTING_ATMOSPHERE.aoIntensity).toBeGreaterThan(0);
    expect(DEFAULT_LIGHTING_ATMOSPHERE.aoIntensity).toBeLessThanOrEqual(1);
    expect(DEFAULT_LIGHTING_ATMOSPHERE.aoRadius).toBeGreaterThan(0);
    expect(DEFAULT_LIGHTING_ATMOSPHERE.aoRadius).toBeLessThanOrEqual(1);
    expect(DEFAULT_LIGHTING_ATMOSPHERE.stampShadowOpacity).toBeGreaterThan(0);
    expect(DEFAULT_LIGHTING_ATMOSPHERE.stampShadowOpacity).toBeLessThanOrEqual(1);
    expect(DEFAULT_LIGHTING_ATMOSPHERE.stampShadowOffset).toBeGreaterThan(0);
    expect(DEFAULT_LIGHTING_ATMOSPHERE.colorGrading).toBe('none');
    expect(DEFAULT_LIGHTING_ATMOSPHERE.colorGradingIntensity).toBeGreaterThan(0);
    expect(DEFAULT_LIGHTING_ATMOSPHERE.opacity).toBeGreaterThan(0);
    expect(DEFAULT_LIGHTING_ATMOSPHERE.opacity).toBeLessThanOrEqual(1);
  });
});

describe('_isWallLike_test', () => {
  it('identifies wall as wall-like', () => {
    expect(_isWallLike_test('wall', [])).toBe(true);
  });

  it('identifies pillar as wall-like', () => {
    expect(_isWallLike_test('pillar', [])).toBe(true);
  });

  it('identifies floor as non-wall', () => {
    expect(_isWallLike_test('floor', [])).toBe(false);
  });

  it('identifies empty as non-wall', () => {
    expect(_isWallLike_test('empty', [])).toBe(false);
  });

  it('identifies water as non-wall', () => {
    expect(_isWallLike_test('water', [])).toBe(false);
  });
});

describe('COLOR_GRADING_TINTS', () => {
  it('provides tints for day, night, and dusk', () => {
    expect(COLOR_GRADING_TINTS.day).toBeDefined();
    expect(COLOR_GRADING_TINTS.night).toBeDefined();
    expect(COLOR_GRADING_TINTS.dusk).toBeDefined();
  });

  it('tints are RGB triplets in 0-255 range', () => {
    for (const mode of ['day', 'night', 'dusk'] as const) {
      const tint = COLOR_GRADING_TINTS[mode];
      expect(tint).toHaveLength(3);
      for (const v of tint) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
      }
    }
  });
});

describe('drawLightingAtmosphere', () => {
  let ctx: ReturnType<typeof mockCtx>;

  beforeEach(() => {
    ctx = mockCtx();
  });

  it('does nothing when disabled', () => {
    const tiles = makeTiles([['floor', 'wall']]);
    const settings = makeSettings({ enabled: false });

    drawLightingAtmosphere(ctx, tiles, 2, 1, 32, settings, [], []);

    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('draws AO shadows at wall-floor corners', () => {
    const tiles = makeTiles([
      ['wall', 'wall', 'wall'],
      ['wall', 'floor', 'wall'],
      ['wall', 'wall', 'wall'],
    ]);
    const settings = makeSettings({ stampShadowOpacity: 0, colorGrading: 'none' });

    drawLightingAtmosphere(ctx, tiles, 3, 3, 32, settings, [], []);

    // Should produce radial gradient fills for AO corners
    expect(ctx.createRadialGradient).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('draws stamp shadows when stamps are present', () => {
    const tiles = makeTiles([['floor', 'floor']]);
    const stamps = [makeStamp(0, 0)];
    const settings = makeSettings({ aoIntensity: 0, colorGrading: 'none', stampShadowOpacity: 0.5 });

    drawLightingAtmosphere(ctx, tiles, 2, 1, 32, settings, stamps, []);

    // Should create radial gradients for stamp shadows
    expect(ctx.createRadialGradient).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('does not draw stamp shadows when opacity is 0', () => {
    const tiles = makeTiles([['floor']]);
    const stamps = [makeStamp(0, 0)];
    const settings = makeSettings({ aoIntensity: 0, colorGrading: 'none', stampShadowOpacity: 0 });

    drawLightingAtmosphere(ctx, tiles, 1, 1, 32, settings, stamps, []);

    // Only save/restore from the outer wrapper, no radial gradients
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it('applies color grading when mode is not none', () => {
    const tiles = makeTiles([['floor']]);
    const settings = makeSettings({ aoIntensity: 0, stampShadowOpacity: 0, colorGrading: 'night', colorGradingIntensity: 0.5 });

    drawLightingAtmosphere(ctx, tiles, 1, 1, 32, settings, [], []);

    // Color grading produces a fillRect for the tint overlay
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('does not apply color grading when mode is none', () => {
    const tiles = makeTiles([['floor']]);
    const settings = makeSettings({ aoIntensity: 0, stampShadowOpacity: 0, colorGrading: 'none' });

    drawLightingAtmosphere(ctx, tiles, 1, 1, 32, settings, [], []);

    // No AO (floor only), no stamps, no grading — no fillRect
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('all three color grading modes produce output', () => {
    for (const mode of ['day', 'dusk', 'night'] as const) {
      const c = mockCtx();
      const tiles = makeTiles([['floor']]);
      const settings = makeSettings({ aoIntensity: 0, stampShadowOpacity: 0, colorGrading: mode, colorGradingIntensity: 0.5 });

      drawLightingAtmosphere(c, tiles, 1, 1, 32, settings, [], []);

      expect(c.fillRect).toHaveBeenCalled();
    }
  });

  it('does not draw AO when all tiles are the same non-wall type', () => {
    const tiles = makeTiles([
      ['floor', 'floor'],
      ['floor', 'floor'],
    ]);
    const settings = makeSettings({ stampShadowOpacity: 0, colorGrading: 'none' });

    drawLightingAtmosphere(ctx, tiles, 2, 2, 32, settings, [], []);

    // No wall neighbours → no AO gradients
    expect(ctx.createRadialGradient).not.toHaveBeenCalled();
  });

  it('does not draw AO on empty tiles', () => {
    const tiles = makeTiles([
      ['wall', 'wall'],
      ['wall', 'empty'],
    ]);
    const settings = makeSettings({ stampShadowOpacity: 0, colorGrading: 'none' });

    drawLightingAtmosphere(ctx, tiles, 2, 2, 32, settings, [], []);

    // Empty tile should be skipped, no gradients
    expect(ctx.createRadialGradient).not.toHaveBeenCalled();
  });

  it('respects overall opacity setting', () => {
    const tiles = makeTiles([['floor']]);
    const settings = makeSettings({ aoIntensity: 0, stampShadowOpacity: 0, colorGrading: 'day', opacity: 0.5 });

    drawLightingAtmosphere(ctx, tiles, 1, 1, 32, settings, [], []);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('handles multiple stamps with shadows', () => {
    const tiles = makeTiles([['floor', 'floor', 'floor']]);
    const stamps = [makeStamp(0, 0, { id: 1 }), makeStamp(1, 0, { id: 2 }), makeStamp(2, 0, { id: 3 })];
    const settings = makeSettings({ aoIntensity: 0, colorGrading: 'none', stampShadowOpacity: 0.5 });

    drawLightingAtmosphere(ctx, tiles, 3, 1, 32, settings, stamps, []);

    // 3 stamps → 3 radial gradients
    expect(ctx.createRadialGradient).toHaveBeenCalledTimes(3);
    expect(ctx.arc).toHaveBeenCalledTimes(3);
  });

  it('treats pillar tiles as wall for AO purposes', () => {
    const tiles = makeTiles([
      ['pillar', 'pillar'],
      ['pillar', 'floor'],
    ]);
    const settings = makeSettings({ stampShadowOpacity: 0, colorGrading: 'none' });

    drawLightingAtmosphere(ctx, tiles, 2, 2, 32, settings, [], []);

    // floor tile at (1,1) has pillar neighbors on 3 sides → AO should fire
    expect(ctx.createRadialGradient).toHaveBeenCalled();
  });
});
