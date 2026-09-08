import type { DungeonProject } from '../types/map';
import { loadProject, MAX_PROJECT_CHECKPOINTS, saveProject, StorageConflictError, type CheckpointReason } from './storage';
import { checkpointCount } from './projectRepository';

export interface SaveState {
  phase: 'restoring' | 'unsaved' | 'saving' | 'replacing' | 'saved' | 'failed' | 'conflict' | 'restore-failed';
  message?: string;
  restorationBlocked?: boolean;
}

/** One writer per mounted editor; the repository also compares revisions atomically across tabs. */
export class SaveCoordinator {
  private revision: string | null = null;
  private projectId?: string;
  private checkpoints = 0;
  private generation = 0;
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
  getProjectId = () => this.projectId;
  getGeneration = () => this.generation;
  initialize(revision: string | null, hasProject: boolean, projectId?: string, checkpoints = 0) {
    this.revision = revision;
    this.projectId = projectId;
    this.checkpoints = checkpoints;
    this.generation++;
    this.ready = true;
    this.publish({ phase: hasProject ? 'saved' : 'unsaved' });
  }
  failRestore(message: string, projectId?: string) {
    this.projectId = projectId;
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
  assertCheckpointCapacity = () => {
    if (this.projectId && this.checkpoints >= MAX_PROJECT_CHECKPOINTS) {
      throw new Error('This action is paused: the whole project has 20 durable checkpoints. Open Recovery copies, download and explicitly delete a checkpoint, then try again. Ordinary edits can still save.');
    }
  };
  refreshCheckpoints = async () => {
    const id = this.projectId;
    if (!id) return;
    const count = await checkpointCount(id);
    if (id === this.projectId) this.checkpoints = count;
  };
  private save(project: DungeonProject, checkpoint: boolean | CheckpointReason) {
    return this.projectId
      ? saveProject(project, this.revision, checkpoint, this.projectId)
      : saveProject(project, this.revision, checkpoint);
  }
  startProject = (project: DungeonProject) => {
    this.assertClean();
    this.projectId = crypto.randomUUID();
    this.generation++;
    this.revision = null;
    this.checkpoint = false;
    this.checkpoints = 0;
    this.schedule(project);
  };
  private assertClean() {
    if (!this.ready || this.pending || this.writing || !['saved', 'unsaved'].includes(this.state.phase)) {
      throw new Error('Save your current project before switching or restoring. Export current work before reloading if there is a conflict.');
    }
  }
  switchProject = async (id: string) => {
    const fromRestoreFailure = this.state.phase === 'restore-failed' && !this.ready;
    if (!fromRestoreFailure || this.pending || this.writing) this.assertClean();
    const prior = this.state;
    this.writing = true;
    this.publish({ phase: 'replacing', ...(fromRestoreFailure ? { restorationBlocked: true } : {}) });
    try {
      const loaded = await loadProject(id);
      if (!loaded.project || loaded.projectId !== id) throw new Error('The selected project did not load. No replacement has been opened.');
      if (this.pending) throw new StorageConflictError('The map changed during project switching. Newer edits remain in memory; export them before reloading.');
      this.initialize(loaded.revision, loaded.project !== null, loaded.projectId, loaded.checkpointCount);
      return loaded;
    } catch (error) {
      this.publish(fromRestoreFailure ? prior
        : error instanceof StorageConflictError ? { phase: 'conflict', message: error.message }
        : this.pending
          ? { phase: 'failed', message: 'The project switch failed while newer edits arrived. Your edits remain in memory. Retry save to keep them in the original project.' }
          : prior);
      throw error;
    } finally {
      this.writing = false;
    }
  };
  replace = async (project: DungeonProject, reason: true | CheckpointReason) => {
    if (!this.ready || this.pending || this.writing || !['saved', 'unsaved'].includes(this.state.phase)) {
      throw new Error('Save your current project before applying a recovery copy. Export current work before reloading if there is a conflict.');
    }
    const prior = this.state;
    this.assertCheckpointCapacity();
    clearTimeout(this.timer);
    this.writing = true;
    this.publish({ phase: 'replacing' });
    try {
      const retainedPredecessor = this.revision !== null;
      this.revision = await this.save(project, reason);
      if (this.projectId && retainedPredecessor) this.checkpoints++;
      if (this.pending) {
        throw new StorageConflictError('The map changed while the recovery copy was saving. Your newer edits remain in memory. Export them before reloading; automatic saving is stopped.');
      }
      this.generation++;
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
      const retainedPredecessor = this.revision !== null;
      this.revision = await this.save(project, checkpoint);
      if (checkpoint && this.projectId && retainedPredecessor) this.checkpoints++;
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
