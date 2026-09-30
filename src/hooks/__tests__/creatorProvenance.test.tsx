import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMapState } from '../useMapState';
import { createDefaultProject } from '../mapStateUtils';
import { loadProject, saveProject } from '../../utils/storage';
import { readCreatorProvenance } from '../../utils/creatorProvenance';

vi.mock('../../utils/projectRepository', async importOriginal => ({
  ...await importOriginal<typeof import('../../utils/projectRepository')>(),
  checkpointCount: vi.fn().mockResolvedValue(0),
}));
vi.mock('../../utils/storage', async importOriginal => ({
  ...await importOriginal<typeof import('../../utils/storage')>(),
  loadProject: vi.fn(), saveProject: vi.fn(),
}));
const provenance = { version: 1,
  mapSources: [{ title: 'Original', author: 'Creator', license: 'AGPL-3.0-or-later' }], assetCredits: [] };

describe('creator provenance across actual editing paths', () => {
  beforeEach(() => {
    vi.mocked(loadProject).mockReset();
    vi.mocked(saveProject).mockReset().mockResolvedValue('saved');
    window.history.replaceState(null, '', '/');
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('carries copied map content into another project with undo/redo and independent source records', async () => {
    const source = createDefaultProject(), target = createDefaultProject();
    source.levels[0].creatorProvenance = provenance;
    source.levels[0].tiles[0][0] = { type: 'treasure' };
    const original = structuredClone(source);
    vi.mocked(loadProject).mockResolvedValueOnce({ project: source, projectId: 'source', revision: 'one' })
      .mockResolvedValueOnce({ project: target, projectId: 'target', revision: 'two' });
    const { result } = renderHook(() => useMapState());
    await waitFor(() => expect(result.current.saveState.phase).toBe('saved'));
    act(() => result.current.copySelection({ x: 0, y: 0, w: 1, h: 1 }));
    await act(async () => { await result.current.switchProject('target'); });
    act(() => result.current.pasteClipboard(1, 1));
    expect(result.current.map.tiles[1][1].type).toBe('treasure');
    expect(readCreatorProvenance(result.current.map.creatorProvenance)).toEqual(provenance);
    act(() => result.current.undo());
    expect(result.current.map.creatorProvenance).toBeUndefined();
    act(() => result.current.redo());
    expect(readCreatorProvenance(result.current.map.creatorProvenance)).toEqual(provenance);
    expect(source).toEqual(original);
    expect(target.levels[0].creatorProvenance).toBeUndefined();
  });

  it('retains notices when saving and applying templates without adding them on a fully outside paste', async () => {
    const source = createDefaultProject();
    source.levels[0].creatorProvenance = provenance;
    source.levels.push(createDefaultProject().levels[0]);
    vi.mocked(loadProject).mockResolvedValue({ project: source, projectId: 'source', revision: 'one' });
    const { result } = renderHook(() => useMapState());
    await waitFor(() => expect(result.current.saveState.phase).toBe('saved'));
    act(() => result.current.saveSceneTemplate('Shared room', { x: 0, y: 0, w: 2, h: 2 }));
    const template = result.current.project.sceneTemplates![0];
    expect(template.creatorProvenance).toEqual(provenance);
    act(() => result.current.copySelection({ x: 0, y: 0, w: 2, h: 2 }));
    act(() => result.current.switchLevel(1));
    act(() => result.current.pasteClipboard(-10, -10));
    expect(result.current.map.creatorProvenance).toBeUndefined();
    await waitFor(() => expect(result.current.saveState.phase).toBe('saved'));
    act(() => { expect(result.current.applySceneTemplate(template.id, 2, 2)).toBe(true); });
    expect(result.current.map.creatorProvenance).toEqual(provenance);
    act(() => result.current.undo());
    expect(result.current.map.creatorProvenance).toBeUndefined();
    act(() => result.current.redo());
    expect(result.current.map.creatorProvenance).toEqual(provenance);
  });
});
