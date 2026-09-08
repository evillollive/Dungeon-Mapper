import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultProject } from '../../hooks/mapStateUtils';
import { SaveCoordinator } from '../saveCoordinator';
import { saveProject, StorageConflictError } from '../storage';

vi.mock('../storage', () => ({
  saveProject: vi.fn(),
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
