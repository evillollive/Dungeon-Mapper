/**
 * Procedural paper/parchment texture renderer.
 *
 * Generates a canvas-based texture layer with configurable pattern,
 * grain noise, vignette, and theme-specific tinting. The texture is
 * cached by size + settings fingerprint so repeated redraws of the
 * same map don't regenerate it every frame.
 */

import type { PaperTextureSettings, PaperTexturePattern } from '../types/map';

// ── Seeded PRNG ────────────────────────────────────────────────────────────
// Deterministic noise so the texture is stable across redraws.

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Base colour palettes per pattern ──────────────────────────────────────

const PATTERN_BASE_COLORS: Record<PaperTexturePattern, string> = {
  parchment:  '#f5ead0',
  linen:      '#f0ebe0',
  canvas:     '#ece4d4',
  watercolor: '#f7f0e8',
  marble:     '#eae6e0',
};

// ── Texture generation ───────────────────────────────────────────────────

/**
 * Generate a paper texture as an offscreen canvas.
 *
 * @param w        Pixel width
 * @param h        Pixel height
 * @param settings Paper texture settings
 * @param tint     Theme tint colour (hex)
 */
export function generatePaperTexture(
  w: number,
  h: number,
  settings: PaperTextureSettings,
  tint: string,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // 1. Base fill — blend pattern base colour with theme tint
  const baseColor = PATTERN_BASE_COLORS[settings.pattern] ?? PATTERN_BASE_COLORS.parchment;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);

  // Apply tint as a translucent overlay
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = tint;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  // 2. Pattern-specific detail
  drawPatternDetail(ctx, w, h, settings.pattern);

  // 3. Grain noise
  if (settings.grain > 0) {
    drawGrainNoise(ctx, w, h, settings.grain);
  }

  // 4. Vignette
  if (settings.vignette > 0) {
    drawVignette(ctx, w, h, settings.vignette);
  }

  return canvas;
}

// ── Pattern detail renderers ──────────────────────────────────────────────

function drawPatternDetail(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pattern: PaperTexturePattern,
): void {
  switch (pattern) {
    case 'parchment':
      drawParchmentDetail(ctx, w, h);
      break;
    case 'linen':
      drawLinenDetail(ctx, w, h);
      break;
    case 'canvas':
      drawCanvasDetail(ctx, w, h);
      break;
    case 'watercolor':
      drawWatercolorDetail(ctx, w, h);
      break;
    case 'marble':
      drawMarbleDetail(ctx, w, h);
      break;
  }
}

function drawParchmentDetail(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Subtle warm splotches to simulate aged parchment
  const rng = mulberry32(42);
  const count = Math.max(8, Math.floor((w * h) / 40000));
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < count; i++) {
    const cx = rng() * w;
    const cy = rng() * h;
    const r = 30 + rng() * Math.min(w, h) * 0.2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const a = 0.03 + rng() * 0.06;
    grad.addColorStop(0, `rgba(180, 140, 80, ${a})`);
    grad.addColorStop(1, 'rgba(180, 140, 80, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawLinenDetail(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Cross-hatch linen weave
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
  ctx.lineWidth = 0.5;
  const step = 4;
  for (let y = 0; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let x = 0; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
}

function drawCanvasDetail(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Coarser weave than linen
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
  ctx.lineWidth = 1;
  const step = 6;
  const rng = mulberry32(99);
  for (let y = 0; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y + (rng() - 0.5) * 0.5);
    ctx.lineTo(w, y + (rng() - 0.5) * 0.5);
    ctx.stroke();
  }
  for (let x = 0; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x + (rng() - 0.5) * 0.5, 0);
    ctx.lineTo(x + (rng() - 0.5) * 0.5, h);
    ctx.stroke();
  }
}

function drawWatercolorDetail(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Soft colour bleeds
  const rng = mulberry32(137);
  const count = Math.max(6, Math.floor((w * h) / 60000));
  for (let i = 0; i < count; i++) {
    const cx = rng() * w;
    const cy = rng() * h;
    const r = 50 + rng() * Math.min(w, h) * 0.25;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const hue = 20 + rng() * 30; // warm hues
    const a = 0.02 + rng() * 0.04;
    grad.addColorStop(0, `hsla(${hue}, 30%, 70%, ${a})`);
    grad.addColorStop(0.7, `hsla(${hue}, 20%, 80%, ${a * 0.3})`);
    grad.addColorStop(1, 'hsla(0, 0%, 100%, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
}

function drawMarbleDetail(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Veined marble swirls
  const rng = mulberry32(313);
  const veins = Math.max(4, Math.floor(Math.min(w, h) / 80));
  ctx.strokeStyle = 'rgba(120, 110, 100, 0.06)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < veins; i++) {
    ctx.beginPath();
    let x = rng() * w;
    let y = rng() * h;
    ctx.moveTo(x, y);
    const segs = 8 + Math.floor(rng() * 12);
    for (let s = 0; s < segs; s++) {
      x += (rng() - 0.5) * w * 0.15;
      y += (rng() - 0.5) * h * 0.15;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

// ── Grain noise ──────────────────────────────────────────────────────────

function drawGrainNoise(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
): void {
  // For performance, draw noise at 1/4 resolution and scale up
  const scale = 4;
  const sw = Math.ceil(w / scale);
  const sh = Math.ceil(h / scale);
  const imgData = ctx.createImageData(sw, sh);
  const data = imgData.data;
  const rng = mulberry32(7);
  const maxAlpha = Math.round(intensity * 40);

  for (let i = 0; i < data.length; i += 4) {
    const v = rng() < 0.5 ? 0 : 255;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = Math.round(rng() * maxAlpha);
  }

  // Draw to a temp canvas at small size, then stretch onto main canvas
  const tmp = document.createElement('canvas');
  tmp.width = sw;
  tmp.height = sh;
  const tctx = tmp.getContext('2d')!;
  tctx.putImageData(imgData, 0, 0);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.drawImage(tmp, 0, 0, sw, sh, 0, 0, w, h);
  ctx.restore();
}

// ── Vignette ─────────────────────────────────────────────────────────────

function drawVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
): void {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.sqrt(cx * cx + cy * cy);
  const grad = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, `rgba(0, 0, 0, ${intensity * 0.5})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

// ── Caching ──────────────────────────────────────────────────────────────

let cachedTexture: HTMLCanvasElement | null = null;
let cachedKey = '';

function settingsKey(
  w: number,
  h: number,
  settings: PaperTextureSettings,
  tint: string,
): string {
  return `${w}x${h}|${settings.pattern}|${settings.opacity}|${settings.grain}|${settings.vignette}|${tint}`;
}

/**
 * Get (or regenerate) a cached paper texture canvas. Returns `null`
 * when the paper texture is disabled or settings are absent.
 */
export function getCachedPaperTexture(
  w: number,
  h: number,
  settings: PaperTextureSettings | undefined,
  tint: string,
): HTMLCanvasElement | null {
  if (!settings?.enabled) return null;
  const key = settingsKey(w, h, settings, tint);
  if (cachedTexture && cachedKey === key) return cachedTexture;
  cachedTexture = generatePaperTexture(w, h, settings, tint);
  cachedKey = key;
  return cachedTexture;
}

/** Force-invalidate the texture cache (e.g. when settings change). */
export function invalidatePaperTextureCache(): void {
  cachedTexture = null;
  cachedKey = '';
}
