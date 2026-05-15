export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface ReadableOverlayChoice {
  cssColor: string;
  contrast: number;
}

const DEFAULT_MIN_GRAPHIC_CONTRAST = 3;
const OVERLAY_ALPHA_STEPS = [0.65, 0.75, 0.85, 0.95, 1] as const;

export function parseHexColor(hex: string): RgbColor | null {
  const raw = hex.trim().replace(/^#/, '');
  const normalized = raw.length === 3
    ? raw.split('').map(ch => ch + ch).join('')
    : raw;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function toLinear(value: number): number {
  const channel = value / 255;
  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: RgbColor): number {
  return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
}

export function contrastRatio(foreground: RgbColor, background: RgbColor): number {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

export function blendColors(foreground: RgbColor, background: RgbColor, alpha: number): RgbColor {
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return {
    r: Math.round(foreground.r * clampedAlpha + background.r * (1 - clampedAlpha)),
    g: Math.round(foreground.g * clampedAlpha + background.g * (1 - clampedAlpha)),
    b: Math.round(foreground.b * clampedAlpha + background.b * (1 - clampedAlpha)),
  };
}

function overlayCss(color: RgbColor, alpha: number): string {
  return `rgba(${color.r},${color.g},${color.b},${alpha})`;
}

export function chooseReadableOverlayColor(
  backgroundHex: string,
  minContrast = DEFAULT_MIN_GRAPHIC_CONTRAST,
): ReadableOverlayChoice {
  const background = parseHexColor(backgroundHex);
  const black = { r: 0, g: 0, b: 0 };
  const white = { r: 255, g: 255, b: 255 };

  if (!background) {
    return { cssColor: overlayCss(black, 0.85), contrast: minContrast };
  }

  const candidates = [black, white].flatMap(color =>
    OVERLAY_ALPHA_STEPS.map(alpha => {
      const blended = blendColors(color, background, alpha);
      return {
        color,
        alpha,
        contrast: contrastRatio(blended, background),
      };
    })
  );

  const readable = candidates
    .filter(candidate => candidate.contrast >= minContrast)
    .sort((a, b) => a.alpha - b.alpha || b.contrast - a.contrast)[0];

  const fallback = candidates.sort((a, b) => b.contrast - a.contrast)[0];
  const choice = readable ?? fallback;

  return {
    cssColor: overlayCss(choice.color, choice.alpha),
    contrast: choice.contrast,
  };
}
