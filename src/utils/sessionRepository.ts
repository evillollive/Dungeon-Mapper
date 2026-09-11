import type { DungeonMap, DungeonProject } from '../types/map';
import { decodeProject, encodeProject } from './projectSchema';
import { MAX_PROJECT_CHECKPOINTS, openDB, readRecord, revisionOf, StorageConflictError } from './storage';

export interface SessionProgress {
  project: DungeonProject;
  publishedLevel: number | null;
  round: number;
  turn: number;
  encounterLevel: number;
}

export interface SessionCheckpoint {
  id: string;
  label: string;
  createdAt: string;
  progress: SessionProgress;
}

export interface SessionRecord {
  version: 1;
  id: string;
  sourceProjectId: string;
  sourceRevision: string;
  sourceCheckpoint: DungeonProject;
  storageRevision: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'saved' | 'discarded';
  progress: SessionProgress;
  checkpoints: SessionCheckpoint[];
  endCheckpoint?: SessionProgress;
}

export const MAX_SESSION_CHECKPOINTS = MAX_PROJECT_CHECKPOINTS;
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

function decodeProgress(raw: unknown): SessionProgress {
  if (!object(raw) || !integer(raw.round) || raw.round < 1 || !integer(raw.turn)) {
    throw new Error('Invalid session encounter progress. Download the retained session before recovery.');
  }
  const project = decodeProject(raw.project);
  if (!integer(raw.encounterLevel) || raw.encounterLevel >= project.levels.length) throw new Error('Invalid session encounter level.');
  if (raw.publishedLevel !== null && (!integer(raw.publishedLevel) || raw.publishedLevel >= project.levels.length)) {
    throw new Error('Invalid published session level.');
  }
  const count = project.levels[raw.encounterLevel].initiative?.length ?? 0;
  if (raw.turn >= Math.max(1, count)) throw new Error('Invalid current turn for the session encounter.');
  return { project, publishedLevel: raw.publishedLevel, round: raw.round, turn: raw.turn, encounterLevel: raw.encounterLevel };
}

export function decodeSession(raw: unknown): SessionRecord {
  if (!object(raw) || raw.version !== 1 || !text(raw.id) || !text(raw.sourceProjectId) ||
      !text(raw.sourceRevision) || !text(raw.storageRevision) || !text(raw.createdAt) ||
      !text(raw.updatedAt) || !['active', 'saved', 'discarded'].includes(String(raw.status)) ||
      !Array.isArray(raw.checkpoints) || raw.checkpoints.length > MAX_SESSION_CHECKPOINTS) {
    throw new Error('Unreadable or newer session record. Original bytes have not been overwritten.');
  }
  const checkpoints = raw.checkpoints.map((item: unknown): SessionCheckpoint => {
    if (!object(item) || !text(item.id) || !text(item.label) || !text(item.createdAt)) throw new Error('Invalid session checkpoint.');
    return { id: item.id, label: item.label, createdAt: item.createdAt, progress: decodeProgress(item.progress) };
  });
  if (new Set(checkpoints.map(c => c.id)).size !== checkpoints.length) throw new Error('Duplicate session checkpoints.');
  return {
    version: 1, id: raw.id, sourceProjectId: raw.sourceProjectId, sourceRevision: raw.sourceRevision,
    sourceCheckpoint: decodeProject(raw.sourceCheckpoint), storageRevision: raw.storageRevision,
    createdAt: raw.createdAt, updatedAt: raw.updatedAt, status: raw.status as SessionRecord['status'],
    progress: decodeProgress(raw.progress), checkpoints,
    ...(raw.endCheckpoint !== undefined ? { endCheckpoint: decodeProgress(raw.endCheckpoint) } : {}),
  };
}

export function newSession(project: DungeonProject, sourceProjectId: string, sourceRevision: string): SessionRecord {
  const source = decodeProject(encodeProject(project));
  const now = new Date().toISOString();
  return {
    version: 1, id: crypto.randomUUID(), sourceProjectId, sourceRevision,
    sourceCheckpoint: source, storageRevision: crypto.randomUUID(), createdAt: now, updatedAt: now,
    status: 'active', progress: { project: structuredClone(source), publishedLevel: null, round: 1, turn: 0, encounterLevel: source.activeLevelIndex },
    checkpoints: [],
  };
}

/** The session CAS never writes project: keys. Creation checks the source in the same transaction. */
export async function saveSession(record: SessionRecord, expectedRevision: string | null): Promise<SessionRecord> {
  const next = decodeSession({ ...record, storageRevision: crypto.randomUUID(), updatedAt: new Date().toISOString() });
  const db = await openDB();
  return new Promise((resolve, reject) => {
    let tx: IDBTransaction;
    try { tx = db.transaction('maps', 'readwrite'); }
    catch (error) { db.close(); reject(error); return; }
    const store = tx.objectStore('maps');
    let failure: unknown;
    const current = store.get(`session:${next.id}`);
    current.onsuccess = () => {
      try {
        if (revisionOf(current.result) !== expectedRevision) throw new StorageConflictError('This session changed in another tab. Download your session recovery, then reload. No authored map was changed.');
        if (expectedRevision === null) {
          const source = store.get(`project:${next.sourceProjectId}`);
          source.onsuccess = () => {
            try {
              if (revisionOf(source.result) !== next.sourceRevision ||
                  JSON.stringify(encodeProject(decodeProject(source.result))) !== JSON.stringify(encodeProject(next.sourceCheckpoint))) {
                throw new StorageConflictError('The source map changed. Return to Prepare and reload before starting.');
              }
              store.add(next, `session:${next.id}`);
            } catch (error) { failure = error; tx.abort(); }
          };
        } else {
          const previous = decodeSession(current.result);
          if (previous.sourceProjectId !== next.sourceProjectId || previous.sourceRevision !== next.sourceRevision ||
              JSON.stringify(previous.sourceCheckpoint) !== JSON.stringify(next.sourceCheckpoint)) {
            throw new Error('The session source checkpoint is immutable.');
          }
          store.put(next, `session:${next.id}`);
        }
      } catch (error) { failure = error; tx.abort(); }
    };
    tx.oncomplete = () => { db.close(); resolve(next); };
    tx.onabort = () => { db.close(); reject(failure ?? tx.error ?? new Error('Session save did not commit. Download your session recovery before leaving.')); };
  });
}

export async function loadSession(id: string): Promise<SessionRecord> {
  const record = decodeSession(await readRecord(`session:${id}`));
  if (record.id !== id) throw new Error('Session identity does not match its storage key.');
  return record;
}

export async function listSessions(sourceProjectId: string): Promise<{ id: string; record?: SessionRecord; error?: string; original: unknown }[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('maps', 'readonly');
    const range = IDBKeyRange.bound('session:', 'session;', false, true);
    const keys = tx.objectStore('maps').getAllKeys(range);
    const values = tx.objectStore('maps').getAll(range);
    tx.oncomplete = () => {
      db.close();
      resolve(values.result.flatMap<{ id: string; record?: SessionRecord; error?: string; original: unknown }>((raw: unknown, index) => {
        if (object(raw) && typeof raw.sourceProjectId === 'string' && raw.sourceProjectId !== sourceProjectId) return [];
        const id = String(keys.result[index]).slice(8);
        try {
          const record = decodeSession(raw);
          if (record.id !== id) throw new Error('Session identity mismatch.');
          return [{ id, record, original: raw }];
        } catch (error) {
          return [{ id, error: error instanceof Error ? error.message : 'Unreadable session.', original: raw }];
        }
      }));
    };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Could not list saved sessions. Retry Prepare.')); };
  });
}

export function endSession(record: SessionRecord, discard: boolean): SessionRecord {
  return { ...record, status: discard ? 'discarded' : 'saved', endCheckpoint: structuredClone(record.progress),
    progress: discard ? { project: structuredClone(record.sourceCheckpoint), publishedLevel: null, round: 1, turn: 0,
      encounterLevel: record.sourceCheckpoint.activeLevelIndex } : record.progress };
}

export function stepTurn(progress: SessionProgress, direction: -1 | 1): SessionProgress {
  const count = progress.project.levels[progress.encounterLevel].initiative?.length ?? 0;
  if (!count) throw new Error('Add initiative entries in Edit before starting a session.');
  const position = Math.max(0, (progress.round - 1) * count + Math.min(progress.turn, count - 1) + direction);
  return { ...progress, round: Math.floor(position / count) + 1, turn: position % count };
}

/** Session-only per-level undo. Never shares an authored editor stack or persists undo entries. */
export class SessionHistory {
  private levels = new Map<number, DungeonMap[]>();
  push(level: number, map: DungeonMap) {
    this.levels.set(level, [...(this.levels.get(level) ?? []).slice(-49), structuredClone(map)]);
  }
  has(level: number) { return !!this.levels.get(level)?.length; }
  pop(level: number) { return this.levels.get(level)?.pop(); }
  clear() { this.levels.clear(); }
}
