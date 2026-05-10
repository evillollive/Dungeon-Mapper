import { describe, expect, it } from 'vitest';
import { computePlayerFOV, mergeExplored } from '../dynamicFog';
import type { Tile, Token } from '../../types/map';

function grid(rows: string[]): Tile[][] {
  return rows.map(row => [...row].map(ch => ({ type: ch === '#' ? 'wall' : 'floor' } as Tile)));
}

describe('dynamic fog utilities', () => {
  it('computes the union FOV from every player token and ignores non-player tokens', () => {
    const tiles = grid([
      '.....',
      '.....',
      '.....',
    ]);
    const tokens: Token[] = [
      { id: 1, kind: 'player', x: 0, y: 0, size: 1 },
      { id: 2, kind: 'monster', x: 2, y: 1, size: 1 },
      { id: 3, kind: 'player', x: 4, y: 2, size: 1 },
    ];

    const visible = computePlayerFOV(tiles, tokens);

    expect(visible).not.toBeNull();
    expect(visible?.has('0,0')).toBe(true);
    expect(visible?.has('4,2')).toBe(true);
    expect(computePlayerFOV(tiles, [{ id: 4, kind: 'npc', x: 1, y: 1, size: 1 }])).toBeNull();
  });

  it('computes FOV from every cell of a multi-cell player token footprint', () => {
    const visible = computePlayerFOV(grid(['....']), [
      { id: 1, kind: 'player', x: 1, y: 0, size: 2 },
    ]);

    expect(visible?.has('1,0')).toBe(true);
    expect(visible?.has('2,0')).toBe(true);
  });

  it('mergeExplored preserves identity when nothing changes', () => {
    const explored = [[true, false], [false, false]];

    expect(mergeExplored(explored, new Set(['0,0']), 2, 2)).toBe(explored);

    const merged = mergeExplored(explored, new Set(['1,1', '99,99']), 2, 2);
    expect(merged).not.toBe(explored);
    expect(merged[1][1]).toBe(true);
    expect(explored[1][1]).toBe(false);
  });
});
