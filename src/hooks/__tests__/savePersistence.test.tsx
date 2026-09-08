import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMapState } from '../useMapState';
import { createDefaultProject } from '../mapStateUtils';
import { loadProject, saveProject, RestoreError } from '../../utils/storage';

vi.mock('../../utils/storage', async importOriginal => {
  const actual = await importOriginal<typeof import('../../utils/storage')>();
  return { ...actual, loadProject: vi.fn(), saveProject: vi.fn() };
});

describe('save restoration and replacement integration', () => {
  beforeEach(() => {
    vi.mocked(loadProject).mockReset();
    vi.mocked(saveProject).mockReset().mockResolvedValue('saved-revision');
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('restores once through StrictMode without saving the default blank project', async () => {
    const project = { ...createDefaultProject(), name: 'Original campaign' };
    vi.mocked(loadProject).mockResolvedValue({ project, revision: 'original' });
    const { result } = renderHook(() => useMapState(), { wrapper: StrictMode });
    await waitFor(() => expect(result.current.saveState.phase).toBe('saved'));
    expect(result.current.project.name).toBe('Original campaign');
    expect(loadProject).toHaveBeenCalledOnce();
    expect(saveProject).not.toHaveBeenCalled();
  });

  it('retains unsupported raw data and writes nothing after a restore failure', async () => {
    const raw = { schemaVersion: 999, future: 'retain' };
    vi.mocked(loadProject).mockRejectedValue(new RestoreError('Unsupported schema', raw, 'future-revision'));
    const { result } = renderHook(() => useMapState());
    await waitFor(() => expect(result.current.saveState.phase).toBe('restore-failed'));
    expect(result.current.originalStoredData).toEqual(raw);
    act(() => result.current.newMap());
    expect(window.alert).toHaveBeenCalledOnce();
    expect(saveProject).not.toHaveBeenCalled();
  });

  it('only replaces an unreadable record after the recovery transaction succeeds', async () => {
    const raw = { schemaVersion: 999 };
    vi.mocked(loadProject).mockRejectedValue(new RestoreError('Unsupported schema', raw, 'original'));
    const { result } = renderHook(() => useMapState());
    await waitFor(() => expect(result.current.saveState.phase).toBe('restore-failed'));
    const recovered = { ...createDefaultProject(), name: 'Recovered campaign' };
    vi.mocked(saveProject).mockRejectedValueOnce(new Error('Quota exceeded'));
    await act(async () => {
      await expect(result.current.recoverProjectData(recovered)).rejects.toThrow('Quota exceeded');
    });
    expect(result.current.saveState.phase).toBe('restore-failed');
    expect(result.current.originalStoredData).toEqual(raw);
    expect(result.current.project.name).not.toBe('Recovered campaign');
    await act(async () => { await result.current.recoverProjectData(recovered); });
    expect(saveProject).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Recovered campaign' }), 'original', true);
    expect(result.current.saveState.phase).toBe('saved');
    expect(result.current.project.name).toBe('Recovered campaign');
  });

  it('refuses New and sample replacement while current work is awaiting a save', async () => {
    vi.mocked(loadProject).mockResolvedValue({ project: createDefaultProject(), revision: 'original' });
    const { result } = renderHook(() => useMapState());
    await waitFor(() => expect(result.current.saveState.phase).toBe('saved'));
    act(() => result.current.setMapName('Keep unsaved work'));
    act(() => {
      result.current.newMap();
      result.current.loadProjectData({ ...createDefaultProject(), name: 'Replacement' });
    });
    expect(result.current.map.meta.name).toBe('Keep unsaved work');
    expect(window.alert).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid imported objects without resetting current project or history', async () => {
    vi.mocked(loadProject).mockResolvedValue({ project: createDefaultProject(), revision: 'original' });
    const { result } = renderHook(() => useMapState());
    await waitFor(() => expect(result.current.saveState.phase).toBe('saved'));
    const before = result.current.project;
    expect(() => result.current.loadProjectData({ ...before, levels: [] })).toThrow();
    expect(result.current.project).toBe(before);
    expect(saveProject).not.toHaveBeenCalled();
  });

  it('retains unknown project-level schemaVersion content from a decoded envelope', async () => {
    vi.mocked(loadProject).mockResolvedValue({ project: createDefaultProject(), revision: 'original' });
    const { result } = renderHook(() => useMapState());
    await waitFor(() => expect(result.current.saveState.phase).toBe('saved'));
    const imported = { ...createDefaultProject(), schemaVersion: 'extension metadata' };
    act(() => { expect(result.current.loadProjectData(imported)).toBe(true); });
    expect(result.current.project).toHaveProperty('schemaVersion', 'extension metadata');
  });

  it('promotes legacy bare-map assets and retains normal editor defaults', async () => {
    vi.mocked(loadProject).mockResolvedValue({ project: createDefaultProject(), revision: 'original' });
    const { result } = renderHook(() => useMapState());
    await waitFor(() => expect(result.current.saveState.phase).toBe('saved'));
    const base = createDefaultProject().levels[0];
    const legacy = {
      meta: base.meta, tiles: base.tiles, notes: [],
      customStamps: [{ id: 'legacy-art', name: 'Legacy art', category: 'custom' as const, viewBox: '0 0 10 10', imageDataUrl: 'data:image/png;base64,AAAA' }],
    };
    act(() => result.current.loadMapData(legacy));
    expect(result.current.project.customStamps).toEqual(legacy.customStamps);
    expect(result.current.map.fogEnabled).toBe(true);
    expect(result.current.map.fog).toHaveLength(32);
  });

  it('keeps explored memory dimensionally valid when resizing', async () => {
    const project = createDefaultProject();
    project.levels[0].explored = Array.from({ length: 32 }, () => Array<boolean>(32).fill(true));
    vi.mocked(loadProject).mockResolvedValue({ project, revision: 'original' });
    const { result } = renderHook(() => useMapState());
    await waitFor(() => expect(result.current.saveState.phase).toBe('saved'));
    act(() => result.current.resizeMap(40, 37));
    expect(result.current.map.explored).toHaveLength(37);
    expect(result.current.map.explored?.every(row => row.length === 40)).toBe(true);
    expect(result.current.map.explored?.[0][0]).toBe(true);
    expect(result.current.map.explored?.[36][39]).toBe(false);
  });
});
