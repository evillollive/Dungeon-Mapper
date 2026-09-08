import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultProject } from '../../hooks/mapStateUtils';
import { SaveCoordinator } from '../saveCoordinator';
import { loadProject, saveProject, StorageConflictError } from '../storage';

vi.mock('../storage', () => ({
  saveProject: vi.fn(),
  loadProject: vi.fn(),
  MAX_PROJECT_CHECKPOINTS: 20,
  StorageConflictError: class extends Error {},
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('revision-aware save coordinator', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.mocked(saveProject).mockReset(); });
  afterEach(() => { vi.useRealTimers(); });

  it('detaches a permanently deleted active project without saving a phantom replacement', async () => {
    const writer = new SaveCoordinator();
    writer.initialize('a-rev', true, 'a');
    const generation = writer.getGeneration();
    writer.forgetDeletedProject('a');
    expect(writer.getSnapshot().phase).toBe('unsaved');
    expect(writer.getProjectId()).not.toBe('a');
    expect(writer.getGeneration()).toBeGreaterThan(generation);
    await vi.advanceTimersByTimeAsync(1000);
    expect(saveProject).not.toHaveBeenCalled();
    writer.startProject(createDefaultProject());
    await vi.advanceTimersByTimeAsync(500);
    expect(saveProject).toHaveBeenLastCalledWith(expect.anything(), null, false, writer.getProjectId());
  });

  it('retains unexpected pending work after deletion and stops automatic writes', async () => {
    const writer = new SaveCoordinator();
    writer.initialize('a-rev', true, 'a');
    writer.schedule(createDefaultProject());
    writer.forgetDeletedProject('a');
    expect(writer.getSnapshot().phase).toBe('conflict');
    expect(writer.getProjectId()).toBe('a');
    await vi.advanceTimersByTimeAsync(1000);
    expect(saveProject).not.toHaveBeenCalled();
  });

  it('keeps the old identity while switching and saves only to the selected project afterward', async () => {
    const target = deferred<Awaited<ReturnType<typeof loadProject>>>();
    vi.mocked(loadProject).mockReturnValueOnce(target.promise);
    const writer = new SaveCoordinator();
    writer.initialize('a-rev', true, 'a');
    const switching = writer.switchProject('b');
    expect(writer.getProjectId()).toBe('a');
    expect(writer.getSnapshot().phase).toBe('replacing');
    expect(() => writer.startProject(createDefaultProject())).toThrow();
    target.resolve({ project: createDefaultProject(), revision: 'b-rev', projectId: 'b' });
    await switching;
    vi.mocked(saveProject).mockResolvedValueOnce('b-next');
    writer.schedule(createDefaultProject());
    await vi.advanceTimersByTimeAsync(500);
    expect(saveProject).toHaveBeenLastCalledWith(expect.anything(), 'b-rev', false, 'b');
  });

  it('refuses a switch while an old save is pending and retains unexpected edits during a switch', async () => {
    const writer = new SaveCoordinator();
    writer.initialize('a-rev', true, 'a');
    const target = deferred<Awaited<ReturnType<typeof loadProject>>>();
    vi.mocked(loadProject).mockReturnValueOnce(target.promise);
    const switching = writer.switchProject('b');
    const failure = expect(switching).rejects.toThrow(/Newer edits/);
    writer.schedule({ ...createDefaultProject(), name: 'Keep in memory' });
    target.resolve({ project: createDefaultProject(), revision: 'b-rev', projectId: 'b' });
    await failure;
    expect(writer.getProjectId()).toBe('a');
    expect(writer.getSnapshot().phase).toBe('conflict');
    await expect(writer.switchProject('b')).rejects.toThrow();
    expect(saveProject).not.toHaveBeenCalled();
  });

  it('leaves a failed switch on the prior project and revision', async () => {
    vi.mocked(loadProject).mockRejectedValueOnce(new Error('Unreadable target'));
    const writer = new SaveCoordinator();
    writer.initialize('a-rev', true, 'a');
    await expect(writer.switchProject('b')).rejects.toThrow('Unreadable target');
    expect(writer.getProjectId()).toBe('a');
    expect(writer.getSnapshot().phase).toBe('saved');
  });

  it('can open a healthy project from failed startup without making the editor ready before the read completes', async () => {
    const target = deferred<Awaited<ReturnType<typeof loadProject>>>();
    vi.mocked(loadProject).mockReturnValueOnce(target.promise);
    const writer = new SaveCoordinator();
    writer.failRestore('Selected project is invalid', 'broken');
    const switching = writer.switchProject('healthy');
    expect(writer.getSnapshot()).toEqual({ phase: 'replacing', restorationBlocked: true });
    expect(writer.getProjectId()).toBe('broken');
    expect(() => writer.startProject(createDefaultProject())).toThrow();
    target.resolve({ project: createDefaultProject(), revision: 'healthy-rev', projectId: 'healthy' });
    await switching;
    expect(writer.getProjectId()).toBe('healthy');
    expect(writer.getSnapshot()).toEqual({ phase: 'saved' });
    expect(saveProject).not.toHaveBeenCalled();
  });

  it('keeps failed startup gated when another target cannot load', async () => {
    vi.mocked(loadProject).mockRejectedValueOnce(new Error('Target unavailable'));
    const writer = new SaveCoordinator();
    writer.failRestore('Original failed', 'broken');
    const before = writer.getSnapshot();
    await expect(writer.switchProject('missing')).rejects.toThrow('Target unavailable');
    expect(writer.getSnapshot()).toBe(before);
    expect(writer.getProjectId()).toBe('broken');
    expect(saveProject).not.toHaveBeenCalled();
  });

  it.each(['save', 'replace'])('does not count a phantom checkpoint on the first %s', async firstOperation => {
    vi.mocked(saveProject).mockResolvedValue('committed');
    const writer = new SaveCoordinator();
    const project = createDefaultProject();
    writer.initialize(null, false, 'fresh');
    if (firstOperation === 'replace') await writer.replace(project, true);
    else {
      writer.retainReplacement('Clear level');
      writer.schedule(project);
      await vi.advanceTimersByTimeAsync(500);
    }
    for (let count = 0; count < 20; count++) {
      expect(writer.assertCheckpointCapacity).not.toThrow();
      await writer.replace(project, true);
    }
    expect(writer.assertCheckpointCapacity).toThrow(/20 durable checkpoints/);
    expect(saveProject).toHaveBeenCalledTimes(21);
  });

  it('never labels edits saved when they arrive during a failed target load', async () => {
    const target = deferred<Awaited<ReturnType<typeof loadProject>>>();
    vi.mocked(loadProject).mockReturnValueOnce(target.promise);
    const writer = new SaveCoordinator();
    writer.initialize('a-rev', true, 'a');
    const switching = writer.switchProject('b');
    const failure = expect(switching).rejects.toThrow('Read failed');
    const pending = { ...createDefaultProject(), name: 'Late upload' };
    writer.schedule(pending);
    target.reject(new Error('Read failed'));
    await failure;
    expect(writer.getSnapshot().phase).toBe('failed');
    expect(writer.getProjectId()).toBe('a');
    vi.mocked(saveProject).mockResolvedValueOnce('a-next');
    writer.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(saveProject).toHaveBeenLastCalledWith(pending, 'a-rev', false, 'a');
    expect(writer.getSnapshot().phase).toBe('saved');
  });

  it('gives copies new local identity without treating portable IDs as repository keys', async () => {
    vi.mocked(saveProject).mockResolvedValue('copy-rev');
    const writer = new SaveCoordinator();
    writer.initialize('a-rev', true, 'a');
    const copy = { ...createDefaultProject(), id: 'portable-source', sourceProjectId: 'original-source' };
    writer.startProject(copy);
    expect(writer.getProjectId()).not.toBe('a');
    expect(writer.getProjectId()).not.toBe(copy.id);
    await vi.advanceTimersByTimeAsync(500);
    expect(saveProject).toHaveBeenLastCalledWith(copy, null, false, writer.getProjectId());
  });

  it('pauses checkpoint actions at capacity without blocking ordinary saves or new projects', async () => {
    vi.mocked(saveProject).mockResolvedValue('a-next');
    const writer = new SaveCoordinator();
    writer.initialize('a-rev', true, 'a', 20);
    expect(writer.assertCheckpointCapacity).toThrow(/20 durable checkpoints/);
    await expect(writer.replace(createDefaultProject(), true)).rejects.toThrow(/20 durable checkpoints/);
    writer.schedule(createDefaultProject());
    await vi.advanceTimersByTimeAsync(500);
    expect(saveProject).toHaveBeenLastCalledWith(expect.anything(), 'a-rev', false, 'a');
    writer.startProject(createDefaultProject());
    expect(writer.assertCheckpointCapacity).not.toThrow();
  });

  it('does not write before restoration or after restoration fails', async () => {
    const writer = new SaveCoordinator();
    writer.schedule(createDefaultProject());
    await vi.advanceTimersByTimeAsync(600);
    expect(saveProject).not.toHaveBeenCalled();
    writer.failRestore('Unsupported project version');
    writer.retry();
    await vi.advanceTimersByTimeAsync(600);
    expect(writer.getSnapshot().phase).toBe('restore-failed');
    expect(saveProject).not.toHaveBeenCalled();
  });

  it('serializes delayed transactions and never labels an older transaction as saved', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    vi.mocked(saveProject).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const writer = new SaveCoordinator();
    writer.initialize('revision-0', true);
    const a = { ...createDefaultProject(), name: 'A' };
    const b = { ...a, name: 'B' };
    const c = { ...a, name: 'C' };
    writer.schedule(a);
    await vi.advanceTimersByTimeAsync(500);
    writer.schedule(b);
    writer.schedule(c);
    await vi.advanceTimersByTimeAsync(500);
    expect(saveProject).toHaveBeenCalledTimes(1);
    expect(writer.getSnapshot().phase).toBe('saving');
    first.resolve('revision-1');
    await vi.advanceTimersByTimeAsync(0);
    expect(saveProject).toHaveBeenNthCalledWith(2, c, 'revision-1', false);
    expect(writer.getSnapshot().phase).toBe('saving');
    second.resolve('revision-2');
    await vi.advanceTimersByTimeAsync(0);
    expect(writer.getSnapshot().phase).toBe('saved');
  });

  it('retains the latest in-memory project and checkpoint intent after quota failure', async () => {
    const transaction = deferred<string>();
    vi.mocked(saveProject).mockReturnValueOnce(transaction.promise).mockResolvedValueOnce('revision-1');
    const writer = new SaveCoordinator();
    writer.initialize('revision-0', true);
    writer.retainReplacement();
    writer.schedule(createDefaultProject());
    await vi.advanceTimersByTimeAsync(500);
    const newest = { ...createDefaultProject(), name: 'Retain this' };
    writer.schedule(newest);
    transaction.reject(new Error('Quota exceeded'));
    await vi.advanceTimersByTimeAsync(0);
    expect(writer.getSnapshot()).toEqual({ phase: 'failed', message: 'Quota exceeded' });
    writer.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(saveProject).toHaveBeenLastCalledWith(newest, 'revision-0', true);
    expect(writer.getSnapshot().phase).toBe('saved');
  });

  it('stops all automatic and retry writes after another tab wins', async () => {
    vi.mocked(saveProject).mockRejectedValue(new StorageConflictError());
    const writer = new SaveCoordinator();
    writer.initialize('stale', true);
    writer.schedule(createDefaultProject());
    await vi.advanceTimersByTimeAsync(500);
    expect(writer.getSnapshot().phase).toBe('conflict');
    writer.schedule({ ...createDefaultProject(), name: 'Still editable' });
    writer.retry();
    await vi.advanceTimersByTimeAsync(1000);
    expect(saveProject).toHaveBeenCalledTimes(1);
    expect(writer.getSnapshot().phase).toBe('conflict');
  });

  it('cancels an unmounted editor debounce', async () => {
    const writer = new SaveCoordinator();
    writer.initialize(null, false);
    writer.schedule(createDefaultProject());
    writer.dispose();
    await vi.advanceTimersByTimeAsync(600);
    expect(saveProject).not.toHaveBeenCalled();
  });

  it('keeps recovery replacement pending until its transaction completes', async () => {
    const transaction = deferred<string>();
    vi.mocked(saveProject).mockReturnValueOnce(transaction.promise);
    const writer = new SaveCoordinator();
    writer.initialize('original', true);
    const replacement = createDefaultProject();
    const replacing = writer.replace(replacement, 'Fog repair');
    expect(writer.getSnapshot().phase).toBe('replacing');
    writer.retry();
    expect(saveProject).toHaveBeenCalledOnce();
    expect(saveProject).toHaveBeenCalledWith(replacement, 'original', 'Fog repair');
    transaction.resolve('repaired');
    await replacing;
    expect(writer.getSnapshot().phase).toBe('saved');
  });

  it('restores the unchanged save state after a failed recovery replacement', async () => {
    vi.mocked(saveProject).mockRejectedValueOnce(new Error('Quota exceeded'));
    const writer = new SaveCoordinator();
    writer.initialize('original', true);
    await expect(writer.replace(createDefaultProject(), 'Fog repair')).rejects.toThrow('Quota exceeded');
    expect(writer.getSnapshot().phase).toBe('saved');
    vi.mocked(saveProject).mockResolvedValueOnce('repaired');
    await writer.replace(createDefaultProject(), 'Fog repair');
    expect(saveProject).toHaveBeenLastCalledWith(expect.anything(), 'original', 'Fog repair');
  });

  it('stops recovery confirmation if another tab changed the previewed revision', async () => {
    vi.mocked(saveProject).mockRejectedValueOnce(new StorageConflictError());
    const writer = new SaveCoordinator();
    writer.initialize('previewed-revision', true);
    await expect(writer.replace(createDefaultProject(), 'Fog repair')).rejects.toThrow();
    expect(writer.getSnapshot().phase).toBe('conflict');
    await expect(writer.replace(createDefaultProject(), 'Fog repair')).rejects.toThrow(/Save your current project/);
    expect(saveProject).toHaveBeenCalledOnce();
  });

  it('never labels newer in-memory edits saved or discards them during recovery replacement', async () => {
    const transaction = deferred<string>();
    vi.mocked(saveProject).mockReturnValueOnce(transaction.promise);
    const writer = new SaveCoordinator();
    writer.initialize('original', true);
    const replacing = writer.replace(createDefaultProject(), 'Fog repair');
    const failure = expect(replacing).rejects.toThrow();
    writer.schedule({ ...createDefaultProject(), name: 'Newer in-memory edits' });
    expect(writer.getSnapshot().phase).toBe('replacing');
    transaction.resolve('repaired');
    await failure;
    expect(writer.getSnapshot().phase).toBe('conflict');
    expect(saveProject).toHaveBeenCalledOnce();
  });
});
