import type { DungeonProject } from '../types/map';
import { saveProject, StorageConflictError } from './storage';

export interface SaveState {
  phase: 'restoring' | 'unsaved' | 'saving' | 'saved' | 'failed' | 'conflict' | 'restore-failed';
  message?: string;
}

/** One writer per mounted editor; the repository also compares revisions atomically across tabs. */
export class SaveCoordinator {
  private revision: string | null = null;
  private ready = false;
  private pending: DungeonProject | null = null;
  private checkpoint = false;
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
    if (!this.ready || this.state.phase === 'conflict') return;
    clearTimeout(this.timer);
    this.publish({ phase: 'saving' });
    this.timer = setTimeout(() => { void this.flush(); }, 500);
  };
  retainReplacement = () => { this.checkpoint = true; };
  retry = () => {
    if (!this.ready || this.state.phase === 'conflict') return;
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
