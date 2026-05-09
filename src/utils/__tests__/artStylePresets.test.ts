/**
 * Unit tests for the Art Style Presets utility (Phase 9.5).
 *
 * Covers:
 * - getPresetSettings returns correct structure for each built-in preset
 * - getPresetSettings returns undefined for 'custom'
 * - All preset layer configurations are valid (correct shape + ranges)
 * - Preset descriptions exist for every preset id
 * - ART_STYLE_PRESET_IDS matches expected set
 * - Layer settings honour expected value ranges (0–1 for numeric fields)
 */

import { describe, it, expect } from 'vitest';
import { getPresetSettings, ART_STYLE_PRESET_DESCRIPTIONS } from '../artStylePresets';
import type { ArtPresetSettings } from '../artStylePresets';
import {
  ART_STYLE_PRESET_IDS,
  ART_STYLE_PRESET_LABELS,
} from '../../types/map';
import type {
  ArtStylePresetId,
  PaperTextureSettings,
  EdgeBlendSettings,
  HandDrawnSettings,
  LightingAtmosphereSettings,
} from '../../types/map';

// ── Helpers ───────────────────────────────────────────────────────────

/** All built-in (non-custom) preset ids. */
const BUILT_IN_IDS: ArtStylePresetId[] = ['classic', 'hand-drawn', 'painted', 'minimal', 'print'];

function assertValidRange(value: number, label: string) {
  expect(value, `${label} should be >= 0`).toBeGreaterThanOrEqual(0);
  expect(value, `${label} should be <= 1`).toBeLessThanOrEqual(1);
}

function validatePaperTexture(s: PaperTextureSettings, ctx: string) {
  expect(typeof s.enabled).toBe('boolean');
  expect(['parchment', 'linen', 'canvas', 'watercolor', 'marble']).toContain(s.pattern);
  assertValidRange(s.opacity, `${ctx}.opacity`);
  assertValidRange(s.grain, `${ctx}.grain`);
  assertValidRange(s.vignette, `${ctx}.vignette`);
}

function validateEdgeBlend(s: EdgeBlendSettings, ctx: string) {
  expect(typeof s.enabled).toBe('boolean');
  expect(['dither', 'smooth', 'stipple']).toContain(s.style);
  assertValidRange(s.intensity, `${ctx}.intensity`);
  assertValidRange(s.opacity, `${ctx}.opacity`);
}

function validateHandDrawn(s: HandDrawnSettings, ctx: string) {
  expect(typeof s.enabled).toBe('boolean');
  expect(['sketchy', 'pencil', 'ink']).toContain(s.style);
  assertValidRange(s.wobble, `${ctx}.wobble`);
  assertValidRange(s.crossHatch, `${ctx}.crossHatch`);
  assertValidRange(s.opacity, `${ctx}.opacity`);
}

function validateLighting(s: LightingAtmosphereSettings, ctx: string) {
  expect(typeof s.enabled).toBe('boolean');
  assertValidRange(s.aoIntensity, `${ctx}.aoIntensity`);
  assertValidRange(s.aoRadius, `${ctx}.aoRadius`);
  assertValidRange(s.stampShadowOpacity, `${ctx}.stampShadowOpacity`);
  assertValidRange(s.stampShadowOffset, `${ctx}.stampShadowOffset`);
  expect(['day', 'night', 'dusk', 'none']).toContain(s.colorGrading);
  assertValidRange(s.colorGradingIntensity, `${ctx}.colorGradingIntensity`);
  assertValidRange(s.opacity, `${ctx}.opacity`);
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('ART_STYLE_PRESET_IDS', () => {
  it('contains exactly the five built-in preset ids', () => {
    expect([...ART_STYLE_PRESET_IDS]).toEqual(BUILT_IN_IDS);
  });

  it('does not include custom', () => {
    expect(ART_STYLE_PRESET_IDS).not.toContain('custom');
  });
});

describe('ART_STYLE_PRESET_LABELS', () => {
  it('has labels for all presets including custom', () => {
    for (const id of [...BUILT_IN_IDS, 'custom' as const]) {
      expect(ART_STYLE_PRESET_LABELS[id]).toBeTruthy();
      expect(typeof ART_STYLE_PRESET_LABELS[id]).toBe('string');
    }
  });
});

describe('ART_STYLE_PRESET_DESCRIPTIONS', () => {
  it('has descriptions for all presets including custom', () => {
    for (const id of [...BUILT_IN_IDS, 'custom' as const]) {
      expect(ART_STYLE_PRESET_DESCRIPTIONS[id]).toBeTruthy();
      expect(typeof ART_STYLE_PRESET_DESCRIPTIONS[id]).toBe('string');
    }
  });
});

describe('getPresetSettings', () => {
  it('returns undefined for custom', () => {
    expect(getPresetSettings('custom')).toBeUndefined();
  });

  it.each(BUILT_IN_IDS)('returns an ArtPresetSettings object for "%s"', (id) => {
    const settings = getPresetSettings(id);
    expect(settings).toBeDefined();
    expect(settings).toHaveProperty('paperTexture');
    expect(settings).toHaveProperty('edgeBlend');
    expect(settings).toHaveProperty('handDrawn');
    expect(settings).toHaveProperty('lightingAtmosphere');
  });

  it('classic has paper texture and lighting but no hand-drawn', () => {
    const s = getPresetSettings('classic')!;
    expect(s.paperTexture).toBeDefined();
    expect(s.paperTexture!.enabled).toBe(true);
    expect(s.edgeBlend).toBeDefined();
    expect(s.edgeBlend!.enabled).toBe(true);
    expect(s.handDrawn).toBeUndefined();
    expect(s.lightingAtmosphere).toBeDefined();
    expect(s.lightingAtmosphere!.enabled).toBe(true);
  });

  it('hand-drawn has hand-drawn enabled and no edge blending', () => {
    const s = getPresetSettings('hand-drawn')!;
    expect(s.handDrawn).toBeDefined();
    expect(s.handDrawn!.enabled).toBe(true);
    expect(s.handDrawn!.style).toBe('sketchy');
    expect(s.edgeBlend).toBeUndefined();
  });

  it('painted has all four layers enabled', () => {
    const s = getPresetSettings('painted')!;
    expect(s.paperTexture).toBeDefined();
    expect(s.paperTexture!.enabled).toBe(true);
    expect(s.edgeBlend).toBeDefined();
    expect(s.edgeBlend!.enabled).toBe(true);
    expect(s.handDrawn).toBeDefined();
    expect(s.handDrawn!.enabled).toBe(true);
    expect(s.handDrawn!.style).toBe('ink');
    expect(s.lightingAtmosphere).toBeDefined();
    expect(s.lightingAtmosphere!.colorGrading).toBe('dusk');
  });

  it('minimal has all four layers undefined', () => {
    const s = getPresetSettings('minimal')!;
    expect(s.paperTexture).toBeUndefined();
    expect(s.edgeBlend).toBeUndefined();
    expect(s.handDrawn).toBeUndefined();
    expect(s.lightingAtmosphere).toBeUndefined();
  });

  it('print has pencil hand-drawn and no lighting', () => {
    const s = getPresetSettings('print')!;
    expect(s.handDrawn).toBeDefined();
    expect(s.handDrawn!.style).toBe('pencil');
    expect(s.lightingAtmosphere).toBeUndefined();
    expect(s.edgeBlend).toBeDefined();
    expect(s.edgeBlend!.style).toBe('stipple');
  });
});

describe('preset layer value validation', () => {
  it.each(BUILT_IN_IDS)('"%s" — all numeric fields are in [0, 1] range', (id) => {
    const s = getPresetSettings(id)!;
    if (s.paperTexture) validatePaperTexture(s.paperTexture, `${id}.paperTexture`);
    if (s.edgeBlend) validateEdgeBlend(s.edgeBlend, `${id}.edgeBlend`);
    if (s.handDrawn) validateHandDrawn(s.handDrawn, `${id}.handDrawn`);
    if (s.lightingAtmosphere) validateLighting(s.lightingAtmosphere, `${id}.lightingAtmosphere`);
  });
});

describe('preset determinism', () => {
  it.each(BUILT_IN_IDS)('"%s" — returns the same object on repeated calls', (id) => {
    const a = getPresetSettings(id);
    const b = getPresetSettings(id);
    expect(a).toEqual(b);
  });
});

describe('preset distinctness', () => {
  it('each built-in preset produces a distinct configuration', () => {
    const results: ArtPresetSettings[] = BUILT_IN_IDS.map(id => getPresetSettings(id)!);
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        expect(results[i]).not.toEqual(results[j]);
      }
    }
  });
});
