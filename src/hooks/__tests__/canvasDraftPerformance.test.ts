import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultMap } from '../mapStateUtils';
import { useCanvasDraft, useCanvasEditingDraft } from '../useCanvasDraft';

describe('canvas draft performance and commit boundaries', () => {
  afterEach(() => vi.restoreAllMocks());

  it('finishes without serializing or visiting unchanged map branches', () => {
    const source = createDefaultMap('Draft');
    const readTile = vi.fn(() => ({ type: 'empty' }));
    Object.defineProperty(source.tiles[0], 0, { get: readTile, enumerable: true });
    const commit = vi.fn();
    const { result } = renderHook(() => useCanvasDraft(source));
    act(() => result.current.stage('rename',
      map => ({ ...map, meta: { ...map.meta, name: 'Changed' } }), commit));
    const stringify = vi.spyOn(JSON, 'stringify');
    act(() => result.current.finish());
    expect(commit).toHaveBeenCalledOnce();
    expect(stringify).not.toHaveBeenCalled();
    expect(readTile).not.toHaveBeenCalled();
    expect(result.current.map).toBe(source);
  });

  it('compares changed rows without reading untouched tiles', () => {
    const source = createDefaultMap('Paint');
    const readTile = vi.fn(() => ({ type: 'empty' }));
    Object.defineProperty(source.tiles[0], 0, { get: readTile, enumerable: true });
    const commit = vi.fn();
    const { result } = renderHook(() => useCanvasDraft(source));
    act(() => result.current.stage('paint', map => {
      const tiles = map.tiles.slice();
      tiles[1] = tiles[1].slice();
      tiles[1][1] = { type: 'floor' };
      return { ...map, tiles };
    }, commit));
    act(() => result.current.finish());
    expect(commit).toHaveBeenCalledOnce();
    expect(readTile).not.toHaveBeenCalled();
  });

  it('skips unchanged stages and repeated completion', () => {
    const source = createDefaultMap('No change');
    const commit = vi.fn();
    const { result } = renderHook(() => useCanvasDraft(source));
    act(() => result.current.stage('noop', map => map, commit));
    expect(result.current.map).toBe(source);
    act(() => result.current.finish());
    act(() => result.current.finish());
    expect(commit).not.toHaveBeenCalled();
  });

  it('retains the last changed stage when the next stage is unchanged', () => {
    const source = createDefaultMap('Draft');
    const commit = vi.fn(), noop = vi.fn();
    const { result } = renderHook(() => useCanvasDraft(source));
    act(() => {
      result.current.stage('rename', map => ({ ...map, meta: { ...map.meta, name: 'Changed' } }), commit);
      result.current.stage('rename', map => map, noop);
    });
    act(() => result.current.finish());
    act(() => result.current.finish());
    expect(commit).toHaveBeenCalledOnce();
    expect(noop).not.toHaveBeenCalled();
  });

  it.each(['token', 'stamp', 'river'] as const)('does not commit a %s drag that returns to its origin', kind => {
    const source = createDefaultMap('Return');
    source.tokens = [{ id: 1, kind: 'player', x: 1, y: 1, label: 'Scout' }];
    source.stamps = [{ id: 1, stampId: 'chair', x: 1, y: 1, rotation: 0, scale: 1, opacity: 1, flipX: false, flipY: false }];
    source.rivers = [{ id: 1, controlPoints: [{ x: 1, y: 1 }, { x: 4, y: 4 }], width: 1, type: 'water', flowDirection: 45 }];
    const commit = vi.fn();
    const { result } = renderHook(() => useCanvasEditingDraft(source, {
      commitTile: vi.fn(), onSetTiles: vi.fn(), commitMoveToken: commit,
      commitMoveStamp: commit, commitUpdateRiver: commit,
    }));
    for (const coordinate of [2, 1]) {
      act(() => {
        if (kind === 'token') result.current.onMoveToken(1, coordinate, coordinate);
        else if (kind === 'stamp') result.current.onMoveStamp(1, coordinate, coordinate);
        else result.current.onUpdateRiver(1, { controlPoints: [{ x: coordinate, y: coordinate }, { x: 4, y: 4 }] });
      });
    }
    act(() => result.current.finish());
    expect(commit).not.toHaveBeenCalled();
    expect(result.current.map).toBe(source);
  });

  it('still commits changed fields when the object keys change without changing their count', () => {
    const source = createDefaultMap('Keys');
    source.tiles[1][1] = { type: 'floor', theme: 'dungeon' };
    const commit = vi.fn();
    const { result } = renderHook(() => useCanvasDraft(source));
    act(() => result.current.stage('paint', map => {
      const tiles = map.tiles.slice();
      tiles[1] = tiles[1].slice();
      tiles[1][1] = { type: 'floor', floorMaterial: 'folio-worn-wood-v1' };
      return { ...map, tiles };
    }, commit));
    act(() => result.current.finish());
    expect(commit).toHaveBeenCalledOnce();
  });
});
