import { describe, expect, it } from 'vitest';
import { createDefaultMap } from '../../hooks/mapStateUtils';
import { expandTokenDamage, sameRepaintInputs, tokenRepaintDamage, type TokenPaintFrame } from '../tokenRepaint';

function frames() {
  const map = createDefaultMap('Damage planning');
  map.meta.tileSize = 32;
  map.tokens = [
    { id: 1, x: 3, y: 3, size: 1, kind: 'player', label: 'Scout', icon: 'warrior' },
    { id: 2, x: 10, y: 10, size: 1, kind: 'monster', label: 'Guard', icon: 'skull' },
  ];
  const before: TokenPaintFrame = {
    map, inputs: { map, activeTool: 'move-token' }, state: [map.tiles, true], canvas: {},
    width: 1024, height: 1024, dpr: 1, eligible: true, draggingTokenId: 1, selectedTokenId: 1,
  };
  const after: TokenPaintFrame = {
    ...before, map: { ...map, tokens: map.tokens.map(token => token.id === 1 ? { ...token, x: 4 } : token) },
  };
  return { before, after };
}

describe('conservative token-only repaint planning', () => {
  it('covers old/new positions and the selected ring with one bounded rectangle and drawing halo', () => {
    const { before, after } = frames();
    expect(tokenRepaintDamage(before, after)).toEqual({
      x: 64, y: 64, width: 128, height: 96,
      cells: { minX: 2, minY: 2, maxX: 6, maxY: 5 },
      tiles: { minX: 1, minY: 1, maxX: 7, maxY: 6 },
    });
    expect(tokenRepaintDamage({ ...before, draggingTokenId: null }, after)).not.toBeNull();
  });

  it.each([1, 1.25, 1.5, 2, 3])('uses physical-pixel-aligned bounds at DPR %s', dpr => {
    const { before, after } = frames();
    for (const frame of [before, after]) {
      frame.dpr = dpr;
      frame.width *= dpr;
      frame.height *= dpr;
    }
    const damage = tokenRepaintDamage(before, after)!;
    expect([damage.x, damage.y, damage.width, damage.height].every(Number.isInteger)).toBe(true);
    expect(damage.x + damage.width).toBeLessThanOrEqual(after.width);
    expect(damage.width * damage.height).toBeLessThanOrEqual(after.width * after.height * 0.25);
  });

  it.each([1, 2, 3])('covers %s-cell bundled tokens without changing their stored geometry', size => {
    const { before, after } = frames();
    before.map.tokens![0] = { ...before.map.tokens![0], size, icon: 'folio-token-v1-warden' };
    after.map.tokens![0] = { ...after.map.tokens![0], size, icon: 'folio-token-v1-warden' };
    const damage = tokenRepaintDamage(before, after)!;
    expect(damage).not.toBeNull();
    const side = size * 32;
    const radius = side * 0.42 + Math.max(2, side * 0.1) + Math.max(2, side * 0.12) / 2;
    expect(damage.x).toBeLessThanOrEqual(3 * 32 + side / 2 - radius);
    expect(damage.x + damage.width).toBeGreaterThanOrEqual(4 * 32 + side / 2 + radius);
    expect(before.map.tokens![0].x).toBe(3);
  });

  it('falls back for initial, ended, cancelled and mismatched gestures', () => {
    const { before, after } = frames();
    expect(tokenRepaintDamage(null, after)).toBeNull();
    for (const patch of [
      { eligible: false }, { draggingTokenId: null }, { draggingTokenId: 2 },
      { selectedTokenId: 2 }, { canvas: {} }, { width: 2048 }, { height: 2048 },
      { dpr: 2 }, { state: [...after.state, false] }, { inputs: { ...after.inputs, extraInput: true } },
    ]) expect(tokenRepaintDamage(before, { ...after, ...patch })).toBeNull();
    expect(tokenRepaintDamage({ ...before, eligible: false }, after)).toBeNull();
  });

  it('falls back when any non-token map branch or external render input changes', () => {
    const { before, after } = frames();
    for (const map of [
      { ...after.map, tiles: after.map.tiles.slice() },
      { ...after.map, notes: after.map.notes.slice() },
      { ...after.map, fogEnabled: !after.map.fogEnabled },
      { ...after.map, meta: { ...after.map.meta } },
      { ...after.map, futureRenderField: true },
    ]) expect(tokenRepaintDamage(before, { ...after, map })).toBeNull();
    expect(tokenRepaintDamage(before, { ...after, state: [after.map.tiles, false] })).toBeNull();
    expect(tokenRepaintDamage(before, { ...after, inputs: { map: after.map, activeTool: 'move-token' } })).toBeNull();
  });

  it('rejects changed appearance, order, membership, multiple moves and unknown glyph bounds', () => {
    const { before, after } = frames();
    for (const patch of [{ color: '#ff0000' }, { hidden: true }, { label: 'Renamed' }, { size: 2 }]) {
      expect(tokenRepaintDamage(before, { ...after, map: { ...after.map,
        tokens: [{ ...after.map.tokens![0], ...patch }, after.map.tokens![1]],
      } })).toBeNull();
    }
    for (const tokens of [
      [...after.map.tokens!].reverse(), after.map.tokens!.slice(0, 1),
      after.map.tokens!.map(token => ({ ...token, x: token.x + 1 })),
    ]) expect(tokenRepaintDamage(before, { ...after, map: { ...after.map, tokens } })).toBeNull();
    for (const icon of [undefined, 'unbounded custom text', 'unknown-icon']) {
      const a = { ...before, map: { ...before.map, tokens: before.map.tokens!.map(token => ({ ...token, icon })) } };
      const b = { ...after, map: { ...after.map, tokens: after.map.tokens!.map(token => ({ ...token, icon })) } };
      expect(tokenRepaintDamage(a, b)).toBeNull();
    }
  });

  it('falls back for no-op, invalid/oversized tokens and overly broad damage', () => {
    const { before, after } = frames();
    expect(tokenRepaintDamage(before, before)).toBeNull();
    expect(tokenRepaintDamage(before, { ...after, map: { ...after.map,
      tokens: [{ ...after.map.tokens![0], x: 25, y: 25 }, after.map.tokens![1]],
    } })).toBeNull();
    for (const size of [0, 4, 1.5]) {
      const a = { ...before, map: { ...before.map, tokens: before.map.tokens!.map(token => ({ ...token, size })) } };
      const b = { ...after, map: { ...after.map, tokens: after.map.tokens!.map(token => ({ ...token, size })) } };
      expect(tokenRepaintDamage(a, b)).toBeNull();
    }
    for (const x of [-1, 32, NaN, Infinity, 2.5]) {
      expect(tokenRepaintDamage(before, { ...after, map: { ...after.map,
        tokens: [{ ...after.map.tokens![0], x }, after.map.tokens![1]],
      } })).toBeNull();
    }
  });

  it('compares all own input keys rather than a fixed renderer whitelist', () => {
    expect(sameRepaintInputs({ value: 1 }, { value: 1 })).toBe(true);
    expect(sameRepaintInputs({ value: 1 }, { value: 1, future: 2 })).toBe(false);
    expect(sameRepaintInputs({ value: {} }, { value: {} })).toBe(false);
    expect(sameRepaintInputs({ value: 1, tokens: [] }, { value: 1, tokens: [] }, 'tokens')).toBe(true);
  });

  it('closes over complete intersecting artwork regardless of object order', () => {
    const { before, after } = frames();
    const damage = tokenRepaintDamage(before, after)!;
    const boxes = [
      { left: 160, top: 96, right: 224, bottom: 128 },
      { left: 240, top: 96, right: 288, bottom: 128 },
      { left: 700, top: 700, right: 720, bottom: 720 },
    ];
    const expanded = expandTokenDamage(damage, boxes, after)!;
    expect(expanded.cells).toEqual({ minX: 2, minY: 2, maxX: 10, maxY: 5 });
    expect(expandTokenDamage(damage, [...boxes].reverse(), after)).toEqual(expanded);
  });

  it('retains the full-render fallback for canvas edges, large closure, invalid bounds and metadata limits', () => {
    const { before, after } = frames();
    const damage = tokenRepaintDamage(before, after)!;
    for (const boxes of [
      null,
      [{ left: -1, top: 80, right: 100, bottom: 120 }],
      [{ left: 80, top: 80, right: 1000, bottom: 1000 }],
      [{ left: NaN, top: 80, right: 100, bottom: 100 }],
      Array.from({ length: 2049 }, () => ({ left: 800, top: 800, right: 810, bottom: 810 })),
    ]) expect(expandTokenDamage(damage, boxes, after)).toBeNull();
  });

  it('requires integral native tile pitch, not a hardcoded DPR whitelist', () => {
    const { before, after } = frames();
    for (const frame of [before, after]) {
      frame.dpr = 1.3;
      frame.width = frame.height = Math.floor(1024 * 1.3);
    }
    expect(tokenRepaintDamage(before, after)).toBeNull();
    for (const frame of [before, after]) {
      frame.dpr = 1.25;
      frame.width = frame.height = 1280;
    }
    before.map.tokens![0] = { ...before.map.tokens![0], x: 12, y: 12 };
    after.map.tokens![0] = { ...after.map.tokens![0], x: 13, y: 12 };
    const interior = expandTokenDamage(tokenRepaintDamage(before, after)!, [], after)!;
    expect(interior.cells).toEqual({ minX: 11, minY: 11, maxX: 15, maxY: 14 });
    expect(interior).toMatchObject({ x: 440, y: 440, width: 160, height: 120 });
  });
});
