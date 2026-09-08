import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMapState } from '../useMapState';
import { createDefaultMap, createDefaultProject } from '../mapStateUtils';
import { loadProject, saveProject, RestoreError, type CheckpointReason } from '../../utils/storage';
import { createEmptyGrid } from '../../utils/mapUtils';
import { recoverLegacyProject, checkpointCount } from '../../utils/projectRepository';

vi.mock('../../utils/projectRepository', async importOriginal => ({
  ...await importOriginal<typeof import('../../utils/projectRepository')>(),
  recoverLegacyProject: vi.fn(),
  checkpointCount: vi.fn().mockResolvedValue(0),
}));

vi.mock('../../utils/storage', async importOriginal => {
  const actual = await importOriginal<typeof import('../../utils/storage')>();
  return { ...actual, loadProject: vi.fn(), saveProject: vi.fn() };
});

describe('save restoration and replacement integration', () => {
  beforeEach(() => {
    vi.mocked(loadProject).mockReset();
    vi.mocked(saveProject).mockReset().mockResolvedValue('saved-revision');
    vi.mocked(recoverLegacyProject).mockReset();
    window.history.replaceState(null, '', '/');
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('blocks destructive mutation at the checkpoint limit but permits ordinary editing', async () => {
    const project = createDefaultProject();
    project.levels[0].tiles[0][0] = { type: 'treasure' };
    vi.mocked(loadProject).mockResolvedValue({ project, revision: 'current', projectId: 'local-a', checkpointCount: 20 });
    const { result } = renderHook(() => useMapState());
    await waitFor(() => expect(result.current.saveState.phase).toBe('saved'));
    const before = result.current.project;
    act(() => result.current.clearMap());
    expect(result.current.project).toBe(before);
    expect(result.current.canUndo).toBe(false);
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('20 durable checkpoints'));
    vi.useFakeTimers();
    act(() => result.current.setMapName('Ordinary edit'));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(saveProject).toHaveBeenLastCalledWith(result.current.project, 'current', false, 'local-a');
    expect(result.current.saveState.phase).toBe('saved');
  });

  it('switches projects without saving the prior state into the target and clears memory undo', async () => {
    const a = createDefaultProject();
    const b = { ...createDefaultProject(), name: 'Project B' };
    vi.mocked(loadProject).mockResolvedValueOnce({ project: a, revision: 'a-rev', projectId: 'a' })
      .mockResolvedValueOnce({ project: b, revision: 'b-rev', projectId: 'b' });
    const { result } = renderHook(() => useMapState());
    await waitFor(() => expect(result.current.saveState.phase).toBe('saved'));
    await act(async () => { await result.current.switchProject('b'); });
    expect(result.current.project.name).toBe('Project B');
    expect(result.current.projectId).toBe('b');
    expect(result.current.canUndo).toBe(false);
    expect(saveProject).not.toHaveBeenCalled();
    expect(new URL(window.location.href).searchParams.get('project')).toBe('b');
  });

  it.each(['missing', 'corrupt'])('opens another project after %s startup without touching the unavailable source', async kind => {
    const original = kind === 'missing' ? undefined : { schemaVersion: 999 };
    vi.mocked(loadProject).mockRejectedValueOnce(new RestoreError('Unavailable A', original, kind === 'missing' ? null : 'a-rev', 'a'))
      .mockRejectedValueOnce(new Error('Target B failed'))
      .mockResolvedValueOnce({ project: { ...createDefaultProject(), name: 'Healthy B' }, revision: 'b-rev', projectId: 'b' });
    const { result } = renderHook(() => useMapState());
    await waitFor(() => expect(result.current.saveState.phase).toBe('restore-failed'));
    await act(async () => { await expect(result.current.switchProject('b')).rejects.toThrow('Target B failed'); });
    expect(result.current.saveState.phase).toBe('restore-failed');
    expect(result.current.originalStoredData).toEqual(original);
    await act(async () => { await result.current.switchProject('b'); });
    expect(result.current.project.name).toBe('Healthy B');
    expect(result.current.projectId).toBe('b');
    expect(result.current.originalStoredData).toBeUndefined();
    expect(result.current.saveState.phase).toBe('saved');
    expect(saveProject).not.toHaveBeenCalled();
  });

  it('rejects a late callback from the previous project while new editor callbacks remain usable', async () => {
    vi.mocked(loadProject).mockResolvedValueOnce({ project: createDefaultProject(), revision: 'a-rev', projectId: 'a' })
      .mockResolvedValueOnce({ project: createDefaultProject(), revision: 'b-rev', projectId: 'b' });
    const { result } = renderHook(() => useMapState());
    await waitFor(() => expect(result.current.saveState.phase).toBe('saved'));
    const oldUpload = result.current.setBackgroundImage;
    const oldClear = result.current.clearMap;
    await act(async () => { await result.current.switchProject('b'); });
    act(() => oldUpload({ dataUrl: 'data:image/png;base64,AAAA', offsetX: 0, offsetY: 0, scale: 1, opacity: 1 }));
    act(() => oldClear());
    expect(result.current.map.backgroundImage).toBeUndefined();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('project changed'));
    vi.useFakeTimers();
    act(() => result.current.setMapName('New project edit'));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(result.current.map.meta.name).toBe('New project edit');
    expect(saveProject).toHaveBeenLastCalledWith(result.current.project, 'b-rev', false, 'b');
  });

  it('refreshes checkpoint capacity after explicit cleanup before another destructive action', async () => {
    vi.mocked(loadProject).mockResolvedValue({ project: createDefaultProject(), revision: 'a-rev', projectId: 'a', checkpointCount: 20 });
    const { result } = renderHook(() => useMapState());
    await waitFor(() => expect(result.current.saveState.phase).toBe('saved'));
    vi.mocked(checkpointCount).mockResolvedValueOnce(19);
    await act(async () => { await result.current.refreshCheckpoints(); });
    vi.useFakeTimers();
    act(() => result.current.clearMap());
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(saveProject).toHaveBeenLastCalledWith(result.current.project, 'a-rev', 'Clear level', 'a');
  });

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
    vi.mocked(recoverLegacyProject).mockRejectedValueOnce(new Error('Quota exceeded'))
      .mockResolvedValueOnce({ project: recovered, revision: 'recovered', projectId: 'local-recovery' });
    await act(async () => {
      await expect(result.current.recoverProjectData(recovered)).rejects.toThrow('Quota exceeded');
    });
    expect(result.current.saveState.phase).toBe('restore-failed');
    expect(result.current.originalStoredData).toEqual(raw);
    expect(result.current.project.name).not.toBe('Recovered campaign');
    await act(async () => { await result.current.recoverProjectData(recovered); });
    expect(recoverLegacyProject).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Recovered campaign' }), 'original');
    expect(result.current.saveState.phase).toBe('saved');
    expect(result.current.project.name).toBe('Recovered campaign');
  });

  it('does not open a repaired-file replacement before its transaction commits', async () => {
    vi.mocked(loadProject).mockResolvedValue({ project: createDefaultProject(), revision: 'original' });
    let finish!: (revision: string) => void;
    vi.mocked(saveProject).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useMapState());
    await waitFor(() => expect(result.current.saveState.phase).toBe('saved'));
    const before = result.current.project;
    const repaired = { ...createDefaultProject(), name: 'Repaired file' };
    let replacing!: Promise<void>;
    await act(async () => { replacing = result.current.recoverProjectData(repaired, 'Fog repair'); });
    expect(result.current.project).toBe(before);
    expect(result.current.saveState.phase).toBe('replacing');
    await act(async () => { finish('repaired'); await replacing; });
    expect(result.current.project.name).toBe('Repaired file');
    expect(result.current.saveState.phase).toBe('saved');
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

  const destructiveActions: [CheckpointReason, (state: ReturnType<typeof useMapState>) => unknown][] = [
    ['Clear level', state => state.clearMap()],
    ['Generate level', state => state.generateMap(createEmptyGrid(8, 8), 8, 8)],
    ['Generate region', state => state.applyGeneratedRegion([[{ type: 'wall' }]], 0, 0)],
    ['Resize level', state => state.resizeMap(40, 37)],
    ['Delete level', state => state.deleteLevel(1)],
    ['Apply scene template', state => state.applySceneTemplate('test-template', 0, 0)],
  ];

  function projectWithLevelsAndTemplate() {
    const project = createDefaultProject();
    project.levels.push(createDefaultMap('Upper floor'));
    project.levels[0].tiles[1][1] = { type: 'treasure' };
    project.sceneTemplates = [{
      id: 'test-template', name: 'Template', width: 1, height: 1, createdAt: '2026-09-07T00:00:00Z',
      tiles: [[{ type: 'floor' }]], notes: [], stamps: [],
    }];
    return project;
  }

  it.each(destructiveActions)('retains a named checkpoint for %s', async (reason, perform) => {
    const project = projectWithLevelsAndTemplate();
    vi.mocked(loadProject).mockResolvedValue({ project, revision: 'original' });
    const { result } = renderHook(() => useMapState(), { wrapper: StrictMode });
    await waitFor(() => expect(result.current.saveState.phase).toBe('saved'));
    vi.useFakeTimers();
    act(() => { perform(result.current); });
    expect(result.current.saveState.phase).toBe('saving');
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(saveProject).toHaveBeenCalledOnce();
    expect(saveProject).toHaveBeenCalledWith(result.current.project, 'original', reason);
    expect(result.current.saveState.phase).toBe('saved');
    expect(project.levels[0].tiles[1][1].type).toBe('treasure');
    expect(project.levels).toHaveLength(2);
  });

  it.each(destructiveActions)('does not discard pending in-memory edits for %s', async (_reason, perform) => {
    vi.mocked(loadProject).mockResolvedValue({ project: projectWithLevelsAndTemplate(), revision: 'original' });
    const { result } = renderHook(() => useMapState());
    await waitFor(() => expect(result.current.saveState.phase).toBe('saved'));
    vi.useFakeTimers();
    act(() => result.current.setMapName('Unsaved original'));
    const pending = result.current.project;
    act(() => { perform(result.current); });
    expect(result.current.project).toBe(pending);
    expect(window.alert).toHaveBeenCalledOnce();
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(saveProject).toHaveBeenCalledWith(pending, 'original', false);
  });
});
