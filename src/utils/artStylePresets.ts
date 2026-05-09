/**
 * Art Style Presets — curated configurations for all four art system
 * layers (paper texture, edge blending, hand-drawn mode, lighting &
 * atmosphere). Each preset applies a cohesive visual style to the map.
 */

import type {
  ArtStylePresetId,
  PaperTextureSettings,
  EdgeBlendSettings,
  HandDrawnSettings,
  LightingAtmosphereSettings,
} from '../types/map';

/** The full set of art layer settings a preset applies. */
export interface ArtPresetSettings {
  paperTexture: PaperTextureSettings | undefined;
  edgeBlend: EdgeBlendSettings | undefined;
  handDrawn: HandDrawnSettings | undefined;
  lightingAtmosphere: LightingAtmosphereSettings | undefined;
}

// ── Built-in Preset Definitions ────────────────────────────────────────

/**
 * **Classic** — subtle parchment texture, light dithered edge blending,
 * no hand-drawn effects, gentle ambient occlusion. The default look.
 */
const CLASSIC_PRESET: ArtPresetSettings = {
  paperTexture: {
    enabled: true,
    pattern: 'parchment',
    opacity: 0.6,
    grain: 0.3,
    vignette: 0.25,
  },
  edgeBlend: {
    enabled: true,
    style: 'dither',
    intensity: 0.35,
    opacity: 0.6,
  },
  handDrawn: undefined,
  lightingAtmosphere: {
    enabled: true,
    aoIntensity: 0.4,
    aoRadius: 0.35,
    stampShadowOpacity: 0.3,
    stampShadowOffset: 0.1,
    colorGrading: 'none',
    colorGradingIntensity: 0.25,
    opacity: 0.8,
  },
};

/**
 * **Hand-Drawn** — canvas texture, no edge blending (the wobble handles
 * transitions), full sketchy hand-drawn mode, subtle AO only.
 */
const HAND_DRAWN_PRESET: ArtPresetSettings = {
  paperTexture: {
    enabled: true,
    pattern: 'canvas',
    opacity: 0.5,
    grain: 0.4,
    vignette: 0.15,
  },
  edgeBlend: undefined,
  handDrawn: {
    enabled: true,
    style: 'sketchy',
    wobble: 0.5,
    crossHatch: 0.6,
    opacity: 0.9,
  },
  lightingAtmosphere: {
    enabled: true,
    aoIntensity: 0.25,
    aoRadius: 0.25,
    stampShadowOpacity: 0.15,
    stampShadowOffset: 0.08,
    colorGrading: 'none',
    colorGradingIntensity: 0,
    opacity: 0.5,
  },
};

/**
 * **Painted** — watercolor texture, smooth edge blending, ink hand-drawn
 * outlines, warm dusk lighting with stronger AO for depth.
 */
const PAINTED_PRESET: ArtPresetSettings = {
  paperTexture: {
    enabled: true,
    pattern: 'watercolor',
    opacity: 0.7,
    grain: 0.2,
    vignette: 0.35,
  },
  edgeBlend: {
    enabled: true,
    style: 'smooth',
    intensity: 0.5,
    opacity: 0.7,
  },
  handDrawn: {
    enabled: true,
    style: 'ink',
    wobble: 0.2,
    crossHatch: 0.3,
    opacity: 0.7,
  },
  lightingAtmosphere: {
    enabled: true,
    aoIntensity: 0.5,
    aoRadius: 0.4,
    stampShadowOpacity: 0.4,
    stampShadowOffset: 0.12,
    colorGrading: 'dusk',
    colorGradingIntensity: 0.2,
    opacity: 0.85,
  },
};

/**
 * **Minimal** — no texture, no edge blending, no hand-drawn, no
 * lighting. Clean digital look with crisp tiles and grid only.
 */
const MINIMAL_PRESET: ArtPresetSettings = {
  paperTexture: undefined,
  edgeBlend: undefined,
  handDrawn: undefined,
  lightingAtmosphere: undefined,
};

/**
 * **Print** — linen texture at low opacity for subtle warmth, stipple
 * edge blending, pencil hand-drawn for fine B&W lines, no lighting
 * (print mode disables it anyway). Optimised for black & white printing.
 */
const PRINT_PRESET: ArtPresetSettings = {
  paperTexture: {
    enabled: true,
    pattern: 'linen',
    opacity: 0.3,
    grain: 0.15,
    vignette: 0.1,
  },
  edgeBlend: {
    enabled: true,
    style: 'stipple',
    intensity: 0.3,
    opacity: 0.4,
  },
  handDrawn: {
    enabled: true,
    style: 'pencil',
    wobble: 0.15,
    crossHatch: 0.7,
    opacity: 0.85,
  },
  lightingAtmosphere: undefined,
};

// ── Lookup ─────────────────────────────────────────────────────────────

/** Map of preset id → curated settings. */
const PRESET_MAP: Record<Exclude<ArtStylePresetId, 'custom'>, ArtPresetSettings> = {
  'classic': CLASSIC_PRESET,
  'hand-drawn': HAND_DRAWN_PRESET,
  'painted': PAINTED_PRESET,
  'minimal': MINIMAL_PRESET,
  'print': PRINT_PRESET,
};

/**
 * Returns the curated art layer settings for a built-in preset.
 * Returns `undefined` for `'custom'` (user should keep their current
 * settings).
 */
export function getPresetSettings(presetId: ArtStylePresetId): ArtPresetSettings | undefined {
  if (presetId === 'custom') return undefined;
  return PRESET_MAP[presetId];
}

/**
 * Returns the preset descriptions for tooltips / accessibility.
 */
export const ART_STYLE_PRESET_DESCRIPTIONS: Record<ArtStylePresetId, string> = {
  'classic': 'Parchment texture, dithered edges, ambient occlusion',
  'hand-drawn': 'Canvas texture, sketchy wobbly lines, cross-hatch shading',
  'painted': 'Watercolor texture, smooth blending, ink outlines, dusk lighting',
  'minimal': 'Clean digital look — no art layers',
  'print': 'Linen texture, stipple edges, pencil lines — optimised for B&W print',
  'custom': 'Manually configured art layer settings',
};
