import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMapState } from '../useMapState';

describe('tile update performance', () => {
  it('skips no-op tile updates without creating undo history', () => {
    const { result } = renderHook(() => useMapState());
    const initialProject = result.current.project;

    act(() => {
      result.current.setTile(0, 0, 'empty');
      result.current.setTiles([
        { x: 1, y: 1, type: 'empty' },
        { x: -1, y: 0, type: 'floor' },
      ]);
    });

    expect(result.current.project).toBe(initialProject);
    expect(result.current.canUndo).toBe(false);
  });

  it('copies only rows touched by changed tile updates', () => {
    const { result } = renderHook(() => useMapState());
    const beforeTiles = result.current.map.tiles;

    act(() => {
      result.current.setTile(1, 1, 'floor');
    });

    const afterTiles = result.current.map.tiles;
    expect(afterTiles).not.toBe(beforeTiles);
    expect(afterTiles[0]).toBe(beforeTiles[0]);
    expect(afterTiles[1]).not.toBe(beforeTiles[1]);
    expect(afterTiles[2]).toBe(beforeTiles[2]);
    expect(afterTiles[1][0]).toBe(beforeTiles[1][0]);
    expect(afterTiles[1][1]).toEqual({ type: 'floor' });
    expect(result.current.canUndo).toBe(true);
  });
});
