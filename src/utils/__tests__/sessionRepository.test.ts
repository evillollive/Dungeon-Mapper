import { describe, expect, it, vi, afterEach } from 'vitest';
import { createDefaultProject } from '../../hooks/mapStateUtils';
import { decodeSession, endSession, newSession, saveSession, SessionHistory, stepTurn, MAX_SESSION_CHECKPOINTS } from '../sessionRepository';
import { encodeProject } from '../projectSchema';
import * as storage from '../storage';

function fixture() {
  const project = createDefaultProject();
  project.levels[0].tokens = [
    { id: 1, x: 1, y: 1, kind: 'player', label: 'Scout' },
    { id: 2, x: 2, y: 2, kind: 'monster', label: 'Guard', hidden: true },
  ];
  project.levels[0].initiative = [1, 2];
  return newSession(project, 'source-id', 'source-revision');
}

describe('session lifecycle and history isolation', () => {
  it('copies the source independently and preserves pre-end recovery on discard', () => {
    const record = fixture();
    record.progress.project.levels[0].tokens![0].x = 7;
    record.progress.round = 3;
    expect(record.sourceCheckpoint.levels[0].tokens![0].x).toBe(1);
    const discarded = endSession(record, true);
    expect(discarded.status).toBe('discarded');
    expect(discarded.progress.round).toBe(1);
    expect(discarded.progress.project.levels[0].tokens![0].x).toBe(1);
    expect(discarded.endCheckpoint?.project.levels[0].tokens![0].x).toBe(7);
    const saved = endSession(record, false);
    expect(saved.status).toBe('saved');
    expect(saved.progress.project.levels[0].tokens![0].x).toBe(7);
    expect(decodeSession(saved)).toEqual(saved);
  });
  it('advances and reverses rounds without going before the first turn', () => {
    let progress = fixture().progress;
    expect(stepTurn(progress, -1)).toEqual(progress);
    progress = stepTurn(stepTurn(progress, 1), 1);
    expect([progress.round, progress.turn]).toEqual([2, 0]);
    progress = stepTurn(progress, -1);
    expect([progress.round, progress.turn]).toEqual([1, 1]);
    progress.project.levels[0].initiative = [];
    expect(() => stepTurn(progress, 1)).toThrow(/initiative/);
  });
  it('keeps undo per-level, bounded and separate from source/editor history and reloads', () => {
    const history = new SessionHistory();
    const record = fixture();
    history.push(0, record.progress.project.levels[0]);
    record.progress.project.levels[0].tokens![0].x = 5;
    expect(history.has(1)).toBe(false);
    expect(history.pop(0)?.tokens?.[0].x).toBe(1);
    expect(history.has(0)).toBe(false);
    history.push(1, record.progress.project.levels[0]);
    history.clear();
    expect(history.has(1)).toBe(false);
    expect(new SessionHistory().has(0)).toBe(false);
    expect(JSON.stringify(record)).not.toContain('history');
  });
  it.each([
    { version: 9 }, { sourceRevision: '' }, { checkpoints: 'bad' },
    { checkpoints: Array(MAX_SESSION_CHECKPOINTS + 1).fill({}) },
  ])('rejects malformed or future session records: %j', patch => {
    expect(() => decodeSession({ ...fixture(), ...patch })).toThrow();
  });
  it.each([
    { round: 0 }, { turn: -1 }, { turn: 2 }, { publishedLevel: 100 }, { encounterLevel: -1 },
  ])('validates encounter and publication bounds: %j', patch => {
    const record = fixture();
    expect(() => decodeSession({ ...record, progress: { ...record.progress, ...patch } })).toThrow();
  });
});

// A minimal transactional fake exercises this repository's request ordering.
// Production browser journeys additionally use the native IndexedDB implementation.
function transactionDB(records: Map<string, unknown>, abortCommit = false) {
  const writes = new Map<string, unknown>();
  let aborted = false;
  let pending = 0;
  const tx = {
    error: null, oncomplete: () => {}, onabort: () => {},
    abort() { if (!aborted) { aborted = true; queueMicrotask(() => tx.onabort()); } },
    objectStore() { return store; },
  };
  const finish = () => {
    if (pending || aborted) return;
    if (abortCommit) { tx.abort(); return; }
    for (const [key, value] of writes) records.set(key, value);
    tx.oncomplete();
  };
  const store = {
    get(key: string) {
      const request = { result: records.get(key), onsuccess: () => {} };
      pending++;
      queueMicrotask(() => { if (!aborted) request.onsuccess(); pending--; queueMicrotask(finish); });
      return request;
    },
    put(value: unknown, key: string) { writes.set(key, value); },
    add(value: unknown, key: string) { writes.set(key, value); },
  };
  return { transaction: () => tx, close: vi.fn() } as unknown as IDBDatabase;
}

describe('session storage CAS boundary', () => {
  afterEach(() => vi.restoreAllMocks());
  it('atomically verifies the source before creating a separate session record', async () => {
    const record = fixture();
    const source = { ...encodeProject(record.sourceCheckpoint), storageRevision: record.sourceRevision };
    const records = new Map<string, unknown>([['project:source-id', source]]);
    vi.spyOn(storage, 'openDB').mockResolvedValue(transactionDB(records));
    const saved = await saveSession(record, null);
    expect(records.get('project:source-id')).toBe(source);
    expect(records.get(`session:${record.id}`)).toEqual(saved);
    expect(saved.storageRevision).not.toBe(record.storageRevision);
  });
  it('refuses a stale source without creating a session or overwriting source bytes', async () => {
    const record = fixture();
    const source = { ...encodeProject(record.sourceCheckpoint), storageRevision: 'changed' };
    const records = new Map<string, unknown>([['project:source-id', source]]);
    vi.spyOn(storage, 'openDB').mockResolvedValue(transactionDB(records));
    await expect(saveSession(record, null)).rejects.toThrow(/source map changed/);
    expect(records.size).toBe(1);
    expect(records.get('project:source-id')).toBe(source);
  });
  it('rejects concurrent stale session writers and immutable checkpoint changes', async () => {
    const record = fixture();
    const records = new Map<string, unknown>([[`session:${record.id}`, record]]);
    vi.spyOn(storage, 'openDB').mockImplementation(async () => transactionDB(records));
    await expect(saveSession(record, 'stale')).rejects.toThrow(/another tab/);
    const altered = structuredClone(record);
    altered.sourceCheckpoint.name = 'Changed source';
    await expect(saveSession(altered, record.storageRevision)).rejects.toThrow(/immutable/);
    expect(records.get(`session:${record.id}`)).toBe(record);
  });
  it('does not report success or persist optimistic progress when a transaction aborts', async () => {
    const record = fixture();
    const records = new Map<string, unknown>([[`session:${record.id}`, structuredClone(record)]]);
    record.progress.round = 9;
    vi.spyOn(storage, 'openDB').mockResolvedValue(transactionDB(records, true));
    await expect(saveSession(record, record.storageRevision)).rejects.toThrow(/did not commit/);
    expect(decodeSession(records.get(`session:${record.id}`)).progress.round).toBe(1);
    expect(record.progress.round).toBe(9);
  });
  it('closes the database and surfaces failures opening a write transaction', async () => {
    const record = fixture();
    const db = transactionDB(new Map());
    vi.spyOn(db, 'transaction').mockImplementation(() => { throw new Error('Storage unavailable'); });
    vi.spyOn(storage, 'openDB').mockResolvedValue(db);
    await expect(saveSession(record, record.storageRevision)).rejects.toThrow('Storage unavailable');
    expect(db.close).toHaveBeenCalledOnce();
  });
});
