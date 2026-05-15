import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMapState } from '../useMapState';

describe('river state management', () => {
  it('adds, updates, removes, and clears rivers', () => {
    const { result } = renderHook(() => useMapState());

    let riverId = 0;
    act(() => {
      riverId = result.current.addRiver({
        controlPoints: [{ x: 1, y: 1 }, { x: 3, y: 3 }],
        width: 1,
        flowDirection: 45,
        type: 'water',
        color: '#2563eb',
      });
    });

    expect(result.current.map.rivers).toHaveLength(1);
    expect(result.current.map.rivers?.[0].id).toBe(riverId);

    act(() => {
      result.current.updateRiver(riverId, {
        controlPoints: [{ x: 1, y: 1 }, { x: 4, y: 2 }],
        flowDirection: 20,
      });
    });

    expect(result.current.map.rivers?.[0].controlPoints[1]).toEqual({ x: 4, y: 2 });
    expect(result.current.map.rivers?.[0].flowDirection).toBe(20);

    act(() => {
      result.current.removeRiver(riverId);
    });

    expect(result.current.map.rivers).toEqual([]);

    act(() => {
      result.current.addRiver({
        controlPoints: [{ x: 0, y: 0 }],
        width: 0.5,
        flowDirection: 0,
        type: 'underground-stream',
      });
    });
    expect(result.current.map.rivers).toHaveLength(1);

    act(() => {
      result.current.clearRivers();
    });

    expect(result.current.map.rivers).toEqual([]);
  });
});
