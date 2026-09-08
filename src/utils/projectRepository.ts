import { decodeProject, encodeProject } from './projectSchema';
import type { DungeonProject } from '../types/map';
import { openDB, readRecord, RestoreError, revisionOf, StorageConflictError,
  type LoadedProject, type RecoveryRecord } from './storage';

const MIGRATION_KEY = 'project-migration-v1';
const LEGACY_KEY = 'dungeon-mapper-autosave';

/** Source records are deliberately never removed or rewritten by migration. */
async function migrate(recovery?: { project: DungeonProject; expectedRevision: string | null }): Promise<{ id?: string; created?: LoadedProject }> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('maps', 'readwrite');
    const store = tx.objectStore('maps');
    let id: string | undefined;
    let created: LoadedProject | undefined;
    let failure: unknown;
    let original: unknown;
    let originalRevision: string | null = null;
    const marker = store.get(MIGRATION_KEY);
    marker.onsuccess = () => {
      if (marker.result !== undefined) {
        if (recovery) {
          failure = new StorageConflictError('Another tab completed project migration. Reload before restoring; the original source is retained.');
          tx.abort();
        } else if (typeof marker.result !== 'string') {
          failure = new RestoreError('Project migration metadata is invalid. The source is retained.', marker.result, null);
          tx.abort();
        } else id = marker.result;
        return;
      }
      const source = store.get('autosave');
      source.onsuccess = () => {
        try {
          const raw: unknown = source.result !== undefined ? source.result : localStorage.getItem(LEGACY_KEY) ?? undefined;
          original = raw;
          originalRevision = revisionOf(source.result);
          if (raw === undefined && !recovery) return;
          if (recovery && revisionOf(source.result) !== recovery.expectedRevision) throw new StorageConflictError();
          const project = decodeProject(recovery ? encodeProject(recovery.project) : typeof raw === 'string' ? JSON.parse(raw) : raw);
          id = crypto.randomUUID();
          const now = new Date().toISOString();
          const revision = crypto.randomUUID();
          created = { project, projectId: id, revision, checkpointCount: 0 };
          store.add({ ...encodeProject(project), localProjectId: id, storageRevision: revision,
            createdAt: now, updatedAt: now }, `project:${id}`);
          store.add(id, MIGRATION_KEY);
        } catch (error) {
          failure = error instanceof StorageConflictError ? error
            : new RestoreError(error instanceof Error ? error.message : 'Migration failed.', original, revisionOf(source.result));
          tx.abort();
        }
      };
    };
    tx.oncomplete = () => { db.close(); resolve({ id, created }); };
    tx.onabort = () => {
      db.close();
      reject(failure ?? new RestoreError('Project migration did not commit. Original autosave and legacy bytes remain intact. Retry restore.', original, originalRevision));
    };
  });
}

export async function loadProject(projectId?: string): Promise<LoadedProject> {
  let id = projectId ?? (await migrate()).id;
  if (!projectId && id === 'deleted') id = undefined;
  if (!id) {
    const records = await listProjects();
    id = records.find(record => record.status === 'active' && !record.diagnostic)?.id;
  }
  if (!id) return { project: null, revision: null, projectId: crypto.randomUUID() };
  const raw = await readRecord(`project:${id}`);
  try {
    if (raw === undefined) throw new Error('The selected project record is missing. No blank replacement has been opened.');
    const project = decodeProject(raw);
    if (!isRecord(raw) || raw.localProjectId !== id || typeof raw.storageRevision !== 'string') {
      throw new Error('Project identity or revision metadata is invalid.');
    }
    if (libraryMetadata(raw).status !== 'active') throw new Error('This project is archived or in Trash. Restore it from Your maps before opening.');
    return { project, revision: revisionOf(raw), projectId: id, checkpointCount: await checkpointCount(id) };
  } catch (error) {
    throw new RestoreError(error instanceof Error ? error.message : 'Invalid project record.', raw, revisionOf(raw), id);
  }

}

export async function recoverLegacyProject(project: DungeonProject, expectedRevision: string | null): Promise<LoadedProject> {
  const result = await migrate({ project, expectedRevision });
  if (!result.created) throw new Error('Recovery migration did not create a project.');
  return result.created;
}

export async function checkpointCount(id: string): Promise<number> {
  const raw = await readRecord(`recovery:${id}`);
  if (raw === undefined) return 0;
  if (!Array.isArray(raw)) throw new Error('The project recovery list is unreadable. Download its retained source from Recovery copies.');
  return raw.length;
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  diagnostic?: string;
  original: unknown;
  status: ProjectStatus;
  tags: string[];
  lastOpenedAt: string;
}

export type ProjectStatus = 'active' | 'archived' | 'trash';

export function libraryMetadata(raw: Record<string, unknown>): { status: ProjectStatus; tags: string[]; lastOpenedAt: string } {
  if (raw.library === undefined) return { status: 'active', tags: [], lastOpenedAt: '' };
  const value = raw.library;
  if (!isRecord(value) || !['active', 'archived', 'trash'].includes(String(value.status)) ||
      !Array.isArray(value.tags) || !value.tags.every(tag => typeof tag === 'string') ||
      typeof value.lastOpenedAt !== 'string') throw new Error('Invalid library metadata. Download the retained source before recovery.');
  return { status: value.status as ProjectStatus, tags: value.tags, lastOpenedAt: value.lastOpenedAt };
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('maps', 'readonly');
    const store = tx.objectStore('maps');
    const projectKeys = IDBKeyRange.bound('project:', 'project;', false, true);
    const keys = store.getAllKeys(projectKeys);
    const values = store.getAll(projectKeys);
    tx.oncomplete = () => {
      db.close();
      resolve(keys.result.flatMap<ProjectSummary>((key, index) => {
        if (typeof key !== 'string' || !key.startsWith('project:')) return [];
        const raw: unknown = values.result[index];
        const id = key.slice(8);
        try {
          const project = decodeProject(raw);
          if (!isRecord(raw) || raw.localProjectId !== id || typeof raw.storageRevision !== 'string') {
            throw new Error('Invalid local identity or revision metadata.');
          }
          return [{ id, name: project.name, updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '', original: raw, ...libraryMetadata(raw) }];
        } catch (error) {
          return [{ id, name: 'Unreadable project', updatedAt: '', original: raw, status: 'active', tags: [], lastOpenedAt: '',
            diagnostic: error instanceof Error ? error.message : 'Invalid project.' }];
        }

      }));
    };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Could not list projects.')); };
  });
}

export type LibraryChange = { name: string; tags: string[] } | { status: ProjectStatus } | { delete: true };

/** Catalog edits share the content CAS, so an open stale tab cannot undo a rename or resurrect Trash. */
export async function changeLibraryProject(item: ProjectSummary, change: LibraryChange): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('maps', 'readwrite');
    const store = tx.objectStore('maps');
    const request = store.get(`project:${item.id}`);
    let failure: unknown;
    request.onsuccess = () => {
      try {
        const raw: unknown = request.result;
        if (!isRecord(raw) || revisionOf(raw) !== revisionOf(item.original)) throw new StorageConflictError('This project changed in another tab. Refresh Your maps before trying again.');
        const metadata = libraryMetadata(raw);
        if ('delete' in change) {
          if (metadata.status !== 'trash') throw new Error('Move the project to Trash before permanently deleting it.');
          store.delete(`project:${item.id}`);
          store.delete(`previous:${item.id}`);
          store.delete(`recovery:${item.id}`);
          const marker = store.get(MIGRATION_KEY);
          marker.onsuccess = () => {
            // Keep the marker so retained legacy originals are not migrated again.
            if (marker.result === item.id) store.put('deleted', MIGRATION_KEY);
          };
        } else {
          const project = decodeProject(raw);
          if ('name' in change && !change.name.trim()) throw new Error('Give the project a name.');
          store.put({ ...raw,
            ...('name' in change ? encodeProject({ ...project, name: change.name.trim() }) : {}),
            library: { ...metadata, ...('status' in change ? change : { tags: [...new Set(change.tags.map(tag => tag.trim()).filter(Boolean))] }) },
            storageRevision: crypto.randomUUID(), updatedAt: new Date().toISOString(),
          }, `project:${item.id}`);
        }
      } catch (error) { failure = error; tx.abort(); }
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = () => { db.close(); reject(failure ?? tx.error ?? new Error('Library change did not commit.')); };
  });
}

export async function recordProjectOpened(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('maps', 'readwrite');
    const store = tx.objectStore('maps');
    const request = store.get(`project:${id}`);
    let failure: unknown;
    request.onsuccess = () => {
      try {
        if (!isRecord(request.result)) throw new Error('The project is no longer available.');
        const metadata = libraryMetadata(request.result);
        if (metadata.status !== 'active') throw new Error('Restore this project from Your maps before opening.');
        store.put({ ...request.result, library: { ...metadata, lastOpenedAt: new Date().toISOString() } }, `project:${id}`);
      } catch (error) { failure = error; tx.abort(); }
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = () => { db.close(); reject(failure ?? tx.error ?? new Error('Could not record recent project.')); };
  });
}

export async function duplicateLibraryProject(item: ProjectSummary): Promise<string> {
  const id = crypto.randomUUID();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('maps', 'readwrite');
    const store = tx.objectStore('maps');
    const request = store.get(`project:${item.id}`);
    let failure: unknown;
    request.onsuccess = () => {
      try {
        const raw: unknown = request.result;
        if (!isRecord(raw) || revisionOf(raw) !== revisionOf(item.original)) throw new StorageConflictError('The source changed. Refresh Your maps before duplicating.');
        const project = decodeProject(raw);
        const metadata = libraryMetadata(raw);
        const now = new Date().toISOString();
        store.add({ ...encodeProject({ ...project, name: `${project.name} (copy)` }),
          localProjectId: id, storageRevision: crypto.randomUUID(), createdAt: now, updatedAt: now,
          library: { status: 'active', tags: metadata.tags, lastOpenedAt: now },
        }, `project:${id}`);
      } catch (error) { failure = error; tx.abort(); }
    };
    tx.oncomplete = () => { db.close(); resolve(id); };
    tx.onabort = () => { db.close(); reject(failure ?? tx.error ?? new Error('The duplicate did not commit.')); };
  });
}

export async function projectRecoveryRecords(projectId?: string): Promise<RecoveryRecord[]> {
  const keys = ['previous-save', 'replacement-recovery', 'autosave'];
  if (projectId) keys.unshift(`previous:${projectId}`, `recovery:${projectId}`);
  const db = await openDB();
  const records: RecoveryRecord[] = await new Promise((resolve, reject) => {
    const tx = db.transaction('maps', 'readonly');
    const requests = keys.map(key => tx.objectStore('maps').get(key));
    tx.oncomplete = () => {
      db.close();
      resolve(requests.flatMap((request, index) => {
        const raw: unknown = request.result;
        if (raw === undefined) return [];
        if (keys[index] === 'autosave') return [{ savedAt: '', data: raw, reason: 'Original single autosave' }];
        const items = Array.isArray(raw) ? [...raw].reverse() : [raw];
        const scoped = keys[index] === `previous:${projectId}` || keys[index] === `recovery:${projectId}`;
        return items.map((item: unknown): RecoveryRecord => {
          if (!isRecord(item) || typeof item.savedAt !== 'string' || !('data' in item) ||
              ('reason' in item && typeof item.reason !== 'string')) {
            return { savedAt: '', data: item, diagnostic: 'Unreadable recovery metadata. Download the retained source; no repair was attempted.' };
          }
          return { savedAt: item.savedAt, data: item.data,
            reason: `${scoped ? '' : 'Legacy archive: '}${typeof item.reason === 'string' ? item.reason : 'Previous save'}`,
            ...(scoped ? { projectId } : {}),
            ...(keys[index] === `recovery:${projectId}` && typeof item.id === 'string' ? { id: item.id, projectId } : {}) };
        });
      }));
    };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Could not read recovery records.')); };
  });
  const legacy = localStorage.getItem(LEGACY_KEY);
  return [...records, ...(legacy !== null ? [{ savedAt: '', data: legacy, reason: 'Original localStorage bytes' }] : [])];
}

/** Delete only an explicitly identified checkpoint, never the project or source archive. */
export async function deleteCheckpoint(projectId: string, id: string, expectedData: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('maps', 'readwrite');
    const store = tx.objectStore('maps');
    const request = store.get(`recovery:${projectId}`);
    let failure: Error | undefined;
    request.onsuccess = () => {
      try {
        const records: unknown = request.result;
        if (!Array.isArray(records)) throw new Error('Recovery list is invalid; it has not been changed.');
        const matches = records.filter((record: unknown) => isRecord(record) && record.id === id);
        if (matches.length !== 1 || JSON.stringify(matches[0].data) !== JSON.stringify(expectedData)) {
          throw new StorageConflictError('This checkpoint changed or was deleted. Refresh recovery copies before deleting.');
        }
        store.put(records.filter((record: unknown) => !isRecord(record) || record.id !== id), `recovery:${projectId}`);
      } catch (error) {
        failure = error instanceof Error ? error : new Error('Could not delete checkpoint.');
        tx.abort();
      }
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = () => { db.close(); reject(failure ?? tx.error ?? new Error('Checkpoint deletion aborted.')); };
  });
}
