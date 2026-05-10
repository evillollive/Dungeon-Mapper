import { describe, expect, it } from 'vitest';
import { isTokenFogged } from '../tokenVisibility';
import type { Token } from '../../types/map';

const token: Token = { id: 1, kind: 'monster', x: 1, y: 1, size: 2 };

describe('isTokenFogged', () => {
  it('hides a multi-cell token when any footprint cell is fogged in classic fog', () => {
    const fog = [
      [false, false, false],
      [false, false, false],
      [false, true, false],
    ];

    expect(isTokenFogged(token, fog)).toBe(true);
  });

  it('shows a token when all footprint cells are manually revealed', () => {
    const fog = [
      [true, true, true],
      [true, false, false],
      [true, false, false],
    ];

    expect(isTokenFogged(token, fog)).toBe(false);
  });

  it('uses visible and explored cells in dynamic fog mode', () => {
    const fog = [
      [false, false, false],
      [false, true, true],
      [false, true, true],
    ];
    const explored = [
      [false, false, false],
      [false, false, true],
      [false, true, true],
    ];

    expect(isTokenFogged(token, fog, new Set(['1,1']), explored)).toBe(false);
    expect(isTokenFogged(token, fog, new Set(), explored)).toBe(true);
  });
});
