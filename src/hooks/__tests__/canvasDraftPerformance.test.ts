import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultMap } from '../mapStateUtils';
import { useCanvasDraft } from '../useCanvasDraft';

describe('canvas draft performance', () => {
  it('finishes drafts without serializing the full map', () => {
    const source = createDefaultMap('Draft perf');
    const commit = vi.fn();
    const stringify = vi.spyOn(JSON, 'stringify');
    const { result } = renderHook(() => useCanvasDraft(source));

    act(() => {
      result.current.stage(
        'rename',
        map => ({ ...map, meta: { ...map.meta, name: 'Changed' } }),
        commit,
      );
    });
    act(() => {
      result.current.finish();
    });

    expect(commit).toHaveBeenCalledOnce();
    expect(stringify).not.toHaveBeenCalled();
  });

  it('skips unchanged draft stages without committing', () => {
    const source = createDefaultMap('Draft noop');
    const commit = vi.fn();
    const { result } = renderHook(() => useCanvasDraft(source));

    act(() => {
      result.current.stage('noop', map => map, commit);
    });
    act(() => {
      result.current.finish();
    });

    expect(commit).not.toHaveBeenCalled();
    expect(result.current.map).toBe(source);
  });
});
