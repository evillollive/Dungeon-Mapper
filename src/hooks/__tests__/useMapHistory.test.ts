import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultMap, createDefaultProject } from '../mapStateUtils';
import { useMapHistory } from '../useMapHistory';

describe('map history callback lifecycle', () => {
  it('keeps history helpers stable and reads the current history map after reindexing', () => {
    const setProject = vi.fn();
    const save = vi.fn();
    const { result, rerender } = renderHook(() => useMapHistory(setProject, save, 0));
    const { getHistory, pushHistory } = result.current;
    const snapshot = createDefaultMap('Before edit');
    act(() => pushHistory(snapshot, 0));
    expect(result.current.getHistory).toBe(getHistory);
    expect(result.current.pushHistory).toBe(pushHistory);
    const history = getHistory(0);
    result.current.historyRef.current = new Map([[2, history]]);
    rerender();
    expect(getHistory(2)).toBe(history);
    expect(getHistory(0)).toEqual({ past: [], future: [] });
    act(() => pushHistory(snapshot, 2));
    expect(history.past).toHaveLength(2);
    expect(history.future).toEqual([]);
  });

  it('uses the current injected dispatcher for undo and redo even when save is unchanged', () => {
    const previousDispatch = vi.fn();
    const currentDispatch = vi.fn();
    const save = vi.fn();
    const { result, rerender } = renderHook(
      ({ dispatch }) => useMapHistory(dispatch, save, 0),
      { initialProps: { dispatch: previousDispatch } },
    );
    act(() => result.current.pushHistory(createDefaultMap(), 0));
    result.current.getHistory(0).future.push(result.current.getHistory(0).past[0]);
    rerender({ dispatch: currentDispatch });
    act(() => result.current.undo());
    act(() => result.current.redo());
    expect(previousDispatch).not.toHaveBeenCalled();
    expect(currentDispatch).toHaveBeenCalledTimes(2);
  });

  it('retains independent undo and redo histories when the active level changes', () => {
    const save = vi.fn();
    const { result, rerender } = renderHook(({ level }) => {
      const [project, setProject] = useState(() => ({
        ...createDefaultProject(),
        levels: [createDefaultMap('First'), createDefaultMap('Second')],
      }));
      const history = useMapHistory(setProject, save, level);
      return { project, ...history };
    }, { initialProps: { level: 0 } });
    act(() => result.current.pushHistory(createDefaultMap('First before edit'), 0));
    act(() => result.current.pushHistory(createDefaultMap('Second before edit'), 1));
    act(() => result.current.undo());
    expect(result.current.project.levels.map(level => level.meta.name)).toEqual(['First before edit', 'Second']);
    rerender({ level: 1 });
    act(() => result.current.undo());
    expect(result.current.project.levels.map(level => level.meta.name)).toEqual(['First before edit', 'Second before edit']);
    act(() => result.current.redo());
    expect(result.current.project.levels.map(level => level.meta.name)).toEqual(['First before edit', 'Second']);
    rerender({ level: 0 });
    act(() => result.current.redo());
    expect(result.current.project.levels.map(level => level.meta.name)).toEqual(['First', 'Second']);
    expect(save).toHaveBeenLastCalledWith(result.current.project);
  });
});

