import { describe, it, expect, beforeEach } from 'vitest';
import type { PaperTextureSettings } from '../../types/map';
import { DEFAULT_PAPER_TEXTURE } from '../../types/map';
import {
  generatePaperTexture,
  getCachedPaperTexture,
  invalidatePaperTextureCache,
} from '../paperTexture';

describe('paperTexture', () => {
  beforeEach(() => {
    invalidatePaperTextureCache();
  });

  // ── DEFAULT_PAPER_TEXTURE ────────────────────────────────────────────

  describe('DEFAULT_PAPER_TEXTURE', () => {
    it('has sensible defaults', () => {
      expect(DEFAULT_PAPER_TEXTURE.enabled).toBe(true);
      expect(DEFAULT_PAPER_TEXTURE.pattern).toBe('parchment');
      expect(DEFAULT_PAPER_TEXTURE.opacity).toBeGreaterThan(0);
      expect(DEFAULT_PAPER_TEXTURE.opacity).toBeLessThanOrEqual(1);
      expect(DEFAULT_PAPER_TEXTURE.grain).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_PAPER_TEXTURE.grain).toBeLessThanOrEqual(1);
      expect(DEFAULT_PAPER_TEXTURE.vignette).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_PAPER_TEXTURE.vignette).toBeLessThanOrEqual(1);
    });
  });

  // ── generatePaperTexture ─────────────────────────────────────────────

  describe('generatePaperTexture', () => {
    it('returns a canvas with the requested dimensions', () => {
      const canvas = generatePaperTexture(200, 150, DEFAULT_PAPER_TEXTURE, '#d4b896');
      expect(canvas.width).toBe(200);
      expect(canvas.height).toBe(150);
    });

    it('works with all built-in patterns', () => {
      const patterns: PaperTextureSettings['pattern'][] = [
        'parchment', 'linen', 'canvas', 'watercolor', 'marble',
      ];
      for (const pattern of patterns) {
        const settings: PaperTextureSettings = { ...DEFAULT_PAPER_TEXTURE, pattern };
        const canvas = generatePaperTexture(100, 100, settings, '#d4b896');
        expect(canvas.width).toBe(100);
      }
    });

    it('handles zero grain and vignette', () => {
      const settings: PaperTextureSettings = {
        ...DEFAULT_PAPER_TEXTURE,
        grain: 0,
        vignette: 0,
      };
      const canvas = generatePaperTexture(80, 80, settings, '#aaa');
      expect(canvas.width).toBe(80);
    });

    it('handles max grain and vignette', () => {
      const settings: PaperTextureSettings = {
        ...DEFAULT_PAPER_TEXTURE,
        grain: 1,
        vignette: 1,
      };
      const canvas = generatePaperTexture(80, 80, settings, '#aaa');
      expect(canvas.width).toBe(80);
    });

    it('is deterministic (same inputs produce identical output)', () => {
      const s: PaperTextureSettings = { ...DEFAULT_PAPER_TEXTURE };
      const a = generatePaperTexture(60, 60, s, '#d4b896');
      const b = generatePaperTexture(60, 60, s, '#d4b896');
      const dataA = a.getContext('2d')!.getImageData(0, 0, 60, 60).data;
      const dataB = b.getContext('2d')!.getImageData(0, 0, 60, 60).data;
      expect(dataA).toEqual(dataB);
    });
  });

  // ── getCachedPaperTexture ────────────────────────────────────────────

  describe('getCachedPaperTexture', () => {
    it('returns null when settings are undefined', () => {
      expect(getCachedPaperTexture(100, 100, undefined, '#aaa')).toBeNull();
    });

    it('returns null when texture is disabled', () => {
      const settings: PaperTextureSettings = { ...DEFAULT_PAPER_TEXTURE, enabled: false };
      expect(getCachedPaperTexture(100, 100, settings, '#aaa')).toBeNull();
    });

    it('returns a canvas when texture is enabled', () => {
      const result = getCachedPaperTexture(100, 100, DEFAULT_PAPER_TEXTURE, '#d4b896');
      expect(result).not.toBeNull();
      expect(result!.width).toBe(100);
      expect(result!.height).toBe(100);
    });

    it('returns the same canvas on repeated calls (cache hit)', () => {
      const a = getCachedPaperTexture(100, 100, DEFAULT_PAPER_TEXTURE, '#d4b896');
      const b = getCachedPaperTexture(100, 100, DEFAULT_PAPER_TEXTURE, '#d4b896');
      expect(a).toBe(b); // same reference
    });

    it('regenerates on dimension change', () => {
      const a = getCachedPaperTexture(100, 100, DEFAULT_PAPER_TEXTURE, '#d4b896');
      const b = getCachedPaperTexture(200, 200, DEFAULT_PAPER_TEXTURE, '#d4b896');
      expect(a).not.toBe(b);
    });

    it('regenerates on tint change', () => {
      const a = getCachedPaperTexture(100, 100, DEFAULT_PAPER_TEXTURE, '#d4b896');
      const b = getCachedPaperTexture(100, 100, DEFAULT_PAPER_TEXTURE, '#a0b0c0');
      expect(a).not.toBe(b);
    });

    it('regenerates after invalidation', () => {
      const a = getCachedPaperTexture(100, 100, DEFAULT_PAPER_TEXTURE, '#d4b896');
      invalidatePaperTextureCache();
      const b = getCachedPaperTexture(100, 100, DEFAULT_PAPER_TEXTURE, '#d4b896');
      expect(a).not.toBe(b);
    });
  });

  // ── getPaperTint ─────────────────────────────────────────────────────

  describe('getPaperTint (from themes)', () => {
    // Import getPaperTint to test theme integration
    it('returns a hex colour string for known themes', async () => {
      const { getPaperTint } = await import('../../themes/index');
      const tint = getPaperTint('dungeon');
      expect(tint).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('returns a fallback for unknown themes', async () => {
      const { getPaperTint } = await import('../../themes/index');
      const tint = getPaperTint('nonexistent-theme');
      expect(tint).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('returns different tints for different themes', async () => {
      const { getPaperTint } = await import('../../themes/index');
      const dungeon = getPaperTint('dungeon');
      const starship = getPaperTint('starship');
      expect(dungeon).not.toBe(starship);
    });
  });
});
