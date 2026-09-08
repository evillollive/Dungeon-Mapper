import type { DungeonProject } from '../types/map';
import { saveProject, StorageConflictError, type CheckpointReason } from './storage';

export interface SaveState {
  phase: 'restoring' | 'unsaved' | 'saving' | 'replacing' | 'saved' | 'failed' | 'conflict' | 'restore-failed';
  message?: string;
}

/** One writer per mounted editor; the repository also compares revisions atomically across tabs. */
export class SaveCoordinator {
  private revision: string | null = null;
  private ready = false;
  private pending: DungeonProject | null = null;
  private checkpoint: boolean | CheckpointReason = false;
  private writing = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private listeners = new Set<() => void>();
  private state: SaveState = { phase: 'restoring' };

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private publish(state: SaveState) {
    this.state = state;
    // Existing map reducers schedule saves. Notify React after the reducer finishes.
    queueMicrotask(() => this.listeners.forEach(listener => listener()));
  }
  initialize(revision: string | null, hasProject: boolean) {
    this.revision = revision;
    this.ready = true;
    this.publish({ phase: hasProject ? 'saved' : 'unsaved' });
  }
  failRestore(message: string) {
    this.ready = false;
    this.publish({ phase: 'restore-failed', message });
  }
  schedule = (project: DungeonProject) => {
    this.pending = project;
    if (this.state.phase === 'replacing') return;
    if (!this.ready || this.state.phase === 'conflict') return;
    clearTimeout(this.timer);
    this.publish({ phase: 'saving' });
    this.timer = setTimeout(() => { void this.flush(); }, 500);
  };
  retainReplacement = (reason: true | CheckpointReason = true) => { this.checkpoint = reason; };
  replace = async (project: DungeonProject, reason: true | CheckpointReason) => {
    if (!this.ready || this.pending || this.writing || !['saved', 'unsaved'].includes(this.state.phase)) {
      throw new Error('Save your current project before applying a recovery copy. Export current work before reloading if there is a conflict.');
    }
    const prior = this.state;
    clearTimeout(this.timer);
    this.writing = true;
    this.publish({ phase: 'replacing' });
    try {
      this.revision = await saveProject(project, this.revision, reason);
      if (this.pending) {
        throw new StorageConflictError('The map changed while the recovery copy was saving. Your newer edits remain in memory. Export them before reloading; automatic saving is stopped.');
      }
      this.publish({ phase: 'saved' });
    } catch (error) {
      this.publish(error instanceof StorageConflictError
        ? { phase: 'conflict', message: error.message }
        : this.pending
          ? { phase: 'failed', message: error instanceof Error ? error.message : 'Recovery save failed.' }
          : prior);
      throw error;
    } finally {
      this.writing = false;
    }
  };
  retry = () => {
    if (!this.ready || this.state.phase === 'conflict' || this.state.phase === 'replacing') return;
    this.publish({ phase: 'saving' });
    void this.flush();
  };
  private async flush() {
    if (this.writing || !this.ready || !this.pending || this.state.phase === 'conflict') return;
    const project = this.pending;
    const checkpoint = this.checkpoint;
    this.pending = null;
    this.checkpoint = false;
    this.writing = true;
    try {
      this.revision = await saveProject(project, this.revision, checkpoint);
      this.publish({ phase: this.pending ? 'saving' : 'saved' });
    } catch (error) {
      clearTimeout(this.timer);
      this.pending ??= project;
      this.checkpoint ||= checkpoint;
      this.publish({
        phase: error instanceof StorageConflictError ? 'conflict' : 'failed',
        message: error instanceof Error ? error.message : 'Could not save on this device.',
      });
      return;
    } finally {
      this.writing = false;
    }
    if (this.pending) void this.flush();
  }
  dispose = () => { clearTimeout(this.timer); };
}
