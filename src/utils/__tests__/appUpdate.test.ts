import { afterEach, describe, expect, it, vi } from 'vitest';
import { applySavedUpdate, registerUpdateGuard, updateBlocker } from '../appUpdate';

afterEach(() => { document.body.innerHTML = ''; });
describe('save-aware app updates', () => {
  it('defaults to blocked without an editor guard', () => {
    expect(updateBlocker()).toMatch(/saved project/);
  });
  it('evaluates current save state at activation time', async () => {
    let reason: string | null = null;
    const unregister = registerUpdateGuard(() => reason);
    expect(updateBlocker()).toBeNull();
    reason = 'Save conflict';
    const worker = { postMessage: vi.fn() } as unknown as ServiceWorker;
    await expect(applySavedUpdate(worker)).rejects.toThrow('Save conflict');
    expect(worker.postMessage).not.toHaveBeenCalled();
    unregister();
    expect(updateBlocker()).not.toBeNull();
  });
  it('refuses to discard open forms and does not unregister a newer guard', () => {
    const old = registerUpdateGuard(() => 'old');
    const current = registerUpdateGuard(() => null);
    old();
    expect(updateBlocker()).toBeNull();
    document.body.innerHTML = '<div role="dialog">Unsaved form</div>';
    expect(updateBlocker()).toMatch(/open dialog/);
    current();
  });
});
