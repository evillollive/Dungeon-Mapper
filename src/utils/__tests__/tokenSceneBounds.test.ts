import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultMap } from '../../hooks/mapStateUtils';
import { tokenSceneBounds } from '../tokenSceneBounds';
import type { TokenPaintFrame } from '../tokenRepaint';

function fixture() {
  const map = createDefaultMap('Overlap bounds');
  map.meta.tileSize = 32;
  map.tokens = [{ id: 1, x: 3, y: 3, kind: 'player', label: 'Scout', icon: 'warrior' }];
  map.notes = [{ id: 1, x: 5, y: 5, label: 'Note', description: 'Private' }];
  map.stamps = [{ id: 1, stampId: 'folio-furnishings-v1-chair', x: 4, y: 5,
    scale: 2, rotation: 45, opacity: 0.6, locked: true, flipX: false, flipY: false }];
  const frame: TokenPaintFrame = { map, inputs: {}, state: [], canvas: {}, width: 1024,
    height: 1024, dpr: 1, eligible: true, draggingTokenId: 1, selectedTokenId: 1 };
  const ctx = document.createElement('canvas').getContext('2d')!;
  const originalMetrics = ctx.measureText('');
  vi.spyOn(ctx, 'measureText').mockImplementation(value => Object.assign({}, originalMetrics, {
    width: value.length * 6, actualBoundingBoxLeft: value.length * 3,
    actualBoundingBoxRight: value.length * 3, actualBoundingBoxAscent: 7, actualBoundingBoxDescent: 5,
  }));
  return { frame, ctx };
}

afterEach(() => vi.restoreAllMocks());

describe('bounded complete artwork footprints', () => {
  it('includes rotated furnishings and shadows, text badges, notes, lights and stair indicators', () => {
    const { frame, ctx } = fixture();
    const save = vi.spyOn(ctx, 'save'), restore = vi.spyOn(ctx, 'restore');
    const boxes = tokenSceneBounds(ctx, frame, {
      selectedPlacedStampId: 1, activeLevelIndex: 0,
      lightSources: [{ id: 1, x: 8, y: 8, radius: 6, color: '#f97316', label: 'Lamp' }],
      stairLinks: [{ fromLevel: 0, fromCell: { x: 1, y: 1 }, toLevel: 1, toCell: { x: 2, y: 2 } }],
      selection: { x: 4, y: 4, w: 3, h: 3 },
    })!;
    expect(boxes).not.toBeNull();
    const x = 4.5 * 32, y = 5.5 * 32, rotated = 32 * Math.SQRT2;
    expect(boxes.some(box => box.left < x - rotated && box.right > x + rotated &&
      box.top < y - rotated && box.bottom > y + rotated)).toBe(true);
    expect(boxes).toContainEqual({ left: 80, top: 80, right: 464, bottom: 464 });
    expect(ctx.measureText).toHaveBeenCalledWith('\u{1f512}');
    expect(ctx.measureText).toHaveBeenCalledWith('\u{1f56f}');
    expect(ctx.measureText).toHaveBeenCalledWith('L2');
    expect(save).toHaveBeenCalledOnce();
    expect(restore).toHaveBeenCalledOnce();
  });

  it('falls back rather than guess unknown artwork or unavailable font metrics', () => {
    const { frame, ctx } = fixture();
    frame.map.stamps![0].stampId = 'legacy-table';
    expect(tokenSceneBounds(ctx, frame, { activeLevelIndex: 0 })).toBeNull();
    frame.map.stamps = [];
    vi.mocked(ctx.measureText).mockReturnValue(Object.assign(ctx.measureText(''), { actualBoundingBoxLeft: NaN }));
    expect(tokenSceneBounds(ctx, frame, { activeLevelIndex: 0 })).toBeNull();
  });

  it('bounds metadata and rejects malformed primitive extents', () => {
    const { frame, ctx } = fixture();
    frame.map.stamps![0].rotation = NaN;
    expect(tokenSceneBounds(ctx, frame, { activeLevelIndex: 0 })).toBeNull();
    frame.map.stamps = [];
    expect(tokenSceneBounds(ctx, frame, { activeLevelIndex: 0,
      lightSources: [{ id: 1, x: 8, y: 8, radius: -1, color: '#ffffff', label: 'Invalid' }],
    })).toBeNull();
    frame.map.tokens = Array.from({ length: 2049 }, (_, index) => ({ ...frame.map.tokens![0], id: index + 1 }));
    expect(tokenSceneBounds(ctx, frame, { activeLevelIndex: 0 })).toBeNull();
  });
});
