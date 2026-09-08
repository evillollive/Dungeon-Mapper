import type { DungeonMap, DungeonProject } from '../types/map';
import { decodeProject, encodeProject } from './projectSchema';

const DB_NAME = 'dungeon-mapper';
const STORE_NAME = 'maps';
const AUTOSAVE_KEY = 'autosave';
const LEGACY_KEY = 'dungeon-mapper-autosave';
const RECOVERY_KEY = 'replacement-recovery';

export class StorageConflictError extends Error {
  constructor(message = 'Another tab changed the saved project. Export your in-memory backup before reloading. Automatic saving is stopped.') {
    super(message);
  }
}

export class RestoreError extends Error {
  readonly original: unknown;
  readonly revision: string | null;

  constructor(message: string, original: unknown, revision: string | null) {
    super(message);
    this.original = original;
    this.revision = revision;
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    let blocked = false;
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) req.result.createObjectStore(STORE_NAME);
    };
    req.onblocked = () => {
      blocked = true;
      reject(new Error('Device storage is blocked by another tab. Close other Dungeon Mapper tabs and retry.'));
    };
    req.onsuccess = () => {
      if (blocked) { req.result.close(); return; }
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error ?? new Error('Could not open device storage.'));
  });
}

export function wrapMapAsProject(map: DungeonMap): DungeonProject {
  return {
    name: map.meta.name || 'New Dungeon',
    levels: [map], activeLevelIndex: 0, stairLinks: [], customThemes: [],
  };
}

function revisionOf(raw: unknown): string | null {
  if (raw === undefined) return null;
  if (typeof raw === 'object' && raw !== null && 'storageRevision' in raw &&
      typeof raw.storageRevision === 'string') return raw.storageRevision;
  return `legacy:${JSON.stringify(raw)}`;
}

async function readRecord(key: string): Promise<unknown> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    tx.oncomplete = () => { db.close(); resolve(req.result); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Storage read was aborted.')); };
  });
}

export interface LoadedProject {
  project: DungeonProject | null;
  revision: string | null;
}

export interface RecoveryRecord {
  savedAt: string;
  data: unknown;
  reason?: string;
}

export type CheckpointReason = 'Clear level' | 'Generate level' | 'Generate region' |
  'Delete level' | 'Resize level' | 'Apply scene template' | 'Fog repair';

function recoveryRecord(value: unknown): RecoveryRecord {
  if (typeof value !== 'object' || value === null || !('savedAt' in value) ||
      typeof value.savedAt !== 'string' || !('data' in value)) {
    throw new Error('A local recovery record is unreadable. It has not been overwritten.');
  }
  if ('reason' in value && typeof value.reason !== 'string') {
    throw new Error('A local recovery reason is unreadable. It has not been overwritten.');
  }
  return { savedAt: value.savedAt, data: value.data, ...('reason' in value ? { reason: value.reason as string } : {}) };
}

function recoveryList(value: unknown): RecoveryRecord[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('The local recovery list is unreadable. It has not been overwritten.');
  return value.map(recoveryRecord);
}

export async function saveProject(
  project: DungeonProject,
  expectedRevision: string | null,
  checkpoint: boolean | CheckpointReason = false,
): Promise<string> {
  const encoded = encodeProject(project);
  const storageRevision = crypto.randomUUID();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    let failure: Error | null = null;
    const current = store.get(AUTOSAVE_KEY);
    current.onsuccess = () => {
      try {
        if (revisionOf(current.result) !== expectedRevision) {
          failure = new StorageConflictError();
          tx.abort();
          return;
        }
        if (current.result !== undefined) {
          const previous: RecoveryRecord = { savedAt: new Date().toISOString(), data: current.result };
          store.put(previous, 'previous-save');
          if (checkpoint) {
            const recovery = store.get(RECOVERY_KEY);
            recovery.onsuccess = () => {
              try {
                const records = recoveryList(recovery.result);
                store.put([...records.slice(-4), {
                  ...previous, reason: typeof checkpoint === 'string' ? checkpoint : 'Project replacement',
                }], RECOVERY_KEY);
              } catch (error) {
                failure = error instanceof Error ? error : new Error('Could not retain the replacement recovery copy.');
                tx.abort();
              }
            };
          }
        }
        store.put({ ...encoded, storageRevision }, AUTOSAVE_KEY);
      } catch (error) {
        failure = error instanceof Error ? error : new Error('Could not write the project to device storage.');
        tx.abort();
      }
    };
    tx.oncomplete = () => { db.close(); resolve(storageRevision); };
    tx.onabort = () => { db.close(); reject(failure ?? tx.error ?? new Error('Save transaction was aborted.')); };
  });
}

export async function loadProject(): Promise<LoadedProject> {
  const raw = await readRecord(AUTOSAVE_KEY);
  if (raw !== undefined) {
    try {
      return { project: decodeProject(raw), revision: revisionOf(raw) };
    } catch (error) {
      throw new RestoreError(error instanceof Error ? error.message : 'Invalid saved project.', raw, revisionOf(raw));
    }
  }
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy === null) return { project: null, revision: null };
  let project: DungeonProject;
  try {
    project = decodeProject(JSON.parse(legacy));
  } catch (error) {
    throw new RestoreError(error instanceof Error ? error.message : 'Invalid legacy project.', legacy, null);
  }
  // Retain the original localStorage bytes, including after successful migration.
  try {
    const revision = await saveProject(project, null);
    return { project, revision };
  } catch (error) {
    throw new RestoreError(error instanceof Error ? error.message : 'Legacy migration could not save.', legacy, null);
  }
}

export async function loadRecoveryRecords(): Promise<RecoveryRecord[]> {
  const replacements = await readRecord(RECOVERY_KEY);
  const previous = await readRecord('previous-save');
  const legacy = localStorage.getItem(LEGACY_KEY);
  return [
    ...(previous !== undefined ? [recoveryRecord(previous)] : []),
    ...recoveryList(replacements).reverse(),
    ...(legacy !== null ? [{ savedAt: '', data: legacy }] : []),
  ];
}

export function downloadRecoveryData(data: unknown, filename = 'dungeon-original-recovery.json'): void {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
