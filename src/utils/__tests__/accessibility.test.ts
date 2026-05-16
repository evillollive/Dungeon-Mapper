import { describe, expect, it } from 'vitest';
import type { TileType } from '../../types/map';
import { THEME_LIST } from '../../themes';
import {
  blendColors,
  chooseReadableOverlayColor,
  contrastRatio,
  parseHexColor,
} from '../accessibility';

const OVERLAY_SKIPPED_TILES = new Set<TileType>([
  'empty',
  'floor',
  'wall',
  'secret-door',
  'water',
  'pillar',
  'background',
]);

function parseRgba(cssColor: string): { r: number; g: number; b: number; alpha: number } {
  const match = cssColor.match(/^rgba\((\d+),(\d+),(\d+),(0(?:\.\d+)?|1)\)$/);
  if (!match) throw new Error(`Unexpected rgba color: ${cssColor}`);
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    alpha: Number(match[4]),
  };
}

describe('accessibility color helpers', () => {
  it('computes WCAG contrast ratios', () => {
    const black = parseHexColor('#000000');
    const white = parseHexColor('#ffffff');
    expect(black).not.toBeNull();
    expect(white).not.toBeNull();
    expect(contrastRatio(black!, white!)).toBeCloseTo(21, 1);
  });

  it('chooses readable overlay colors for all built-in theme tile overlays', () => {
    const failures: string[] = [];

    for (const theme of THEME_LIST) {
      for (const [tile, bgHex] of Object.entries(theme.tileColors)) {
        if (OVERLAY_SKIPPED_TILES.has(tile as TileType)) continue;

        const background = parseHexColor(bgHex);
        expect(background, `${theme.id}/${tile} has a valid color`).not.toBeNull();

        const overlay = chooseReadableOverlayColor(bgHex);
        const rgba = parseRgba(overlay.cssColor);
        const blended = blendColors(rgba, background!, rgba.alpha);
        const ratio = contrastRatio(blended, background!);

        if (ratio < 3) {
          failures.push(`${theme.id}/${tile}: ${ratio.toFixed(2)} (${overlay.cssColor} on ${bgHex})`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
