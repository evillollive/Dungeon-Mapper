import { StrictMode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMapState } from '../useMapState';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('token placement identity', () => {
  it('reserves distinct IDs and returns them before React flushes queued state updates', async () => {
    const { result } = renderHook(() => useMapState(), { wrapper: StrictMode });
    await act(async () => {});
    const ids: (number | null)[] = [];
    act(() => {
      result.current.setMapName('Queued before placement');
      ids.push(result.current.addToken('player', 1, 1, 'Warden', 1, 'folio-token-v1-warden'));
      ids.push(result.current.addToken('npc', 2, 1, 'Owl', 1, 'folio-token-v1-owl'));
      ids.push(result.current.addToken('monster', 3, 1, 'Ooze', 1, 'folio-token-v1-ooze'));
    });
    expect(ids).toEqual([1, 2, 3]);
    expect(result.current.map.tokens?.map(token => token.id)).toEqual(ids);
    expect(result.current.map.initiative).toEqual(ids);
    act(() => result.current.removeToken(2));
    expect(result.current.map.tokens?.map(token => token.label)).toEqual(['Warden', 'Ooze']);
    expect(result.current.map.initiative).toEqual([1, 3]);
    act(() => result.current.undo());
    expect(result.current.map.tokens?.map(token => token.id)).toEqual([1, 2, 3]);
    act(() => result.current.redo());
    expect(result.current.map.tokens?.map(token => token.id)).toEqual([1, 3]);
    act(() => { expect(result.current.addToken('player', 4, 1, 'Legacy', 1, 'warrior')).toBe(4); });
    expect(result.current.map.tokens?.at(-1)?.icon).toBe('warrior');
  });

  it('rejects out-of-level placement before reserving an ID or creating history', async () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { result } = renderHook(() => useMapState());
    await act(async () => {});
    const before = result.current.project;
    act(() => {
      expect(result.current.addToken('player', -1, 1)).toBeNull();
      expect(result.current.addToken('monster', result.current.map.meta.width - 1, 1, 'Too wide', 2)).toBeNull();
    });
    expect(result.current.project).toBe(before);
    expect(result.current.canUndo).toBe(false);
    expect(alert).toHaveBeenCalledTimes(2);
    act(() => { expect(result.current.addToken('npc', 1, 1)).toBe(1); });
  });
});
