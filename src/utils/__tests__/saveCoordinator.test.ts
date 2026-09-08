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
});
