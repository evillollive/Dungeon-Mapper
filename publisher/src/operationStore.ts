import { DatabaseSync } from 'node:sqlite';
import { closeSync, lstatSync, openSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { RequestError } from './errors.ts';

export const OPERATION_LIMITS = { records: 64, recordBytes: 1024 * 1024 } as const;
export type OperationPhase = 'prepared' | 'writing' | 'outcome-unknown' | 'branch-verified' | 'conflict' | 'blocked';
export interface StoredOperation {
  id: string; fingerprint: string; ownerId: number; repositoryId: number;
  phase: OperationPhase; record: string; active: boolean;
}

/** A local metadata-only journal. No credentials or package bodies belong in records. */
export class OperationStore {
  private db: DatabaseSync;
  private lock: DatabaseSync;
  private admission = false;
  constructor(path: string) {
    if (!isAbsolute(path)) throw new Error('Choose an absolute local operation database path.');
    const parent = lstatSync(dirname(path));
    if (!parent.isDirectory() || parent.isSymbolicLink()) throw new Error('The operation database needs an ordinary local directory.');
    for (const file of [path, path + '.lock']) {
      try { closeSync(openSync(file, 'wx', 0o600)); }
      catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error; }
      const stat = lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077)) throw new Error('The operation database must be a private ordinary file.');
    }
    this.lock = new DatabaseSync(path + '.lock');
    try { this.lock.exec('BEGIN EXCLUSIVE'); }
    catch (error) {
      this.lock.close();
      throw new Error('The local receipt journal is already open or could not be locked.', { cause: error });
    }
    try { this.db = new DatabaseSync(path); }
    catch (error) { this.lock.close(); throw error; }
    try {
      this.db.exec(`PRAGMA busy_timeout=1000; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;
        CREATE TABLE IF NOT EXISTS operations(
          id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL UNIQUE,
          owner_id INTEGER NOT NULL, repository_id INTEGER NOT NULL,
          phase TEXT NOT NULL, record TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 0
        );
        DROP INDEX IF EXISTS one_unresolved_destination;
        CREATE INDEX IF NOT EXISTS unresolved_destinations ON operations(repository_id)
          WHERE phase IN ('prepared','writing','outcome-unknown');
        UPDATE operations SET phase='outcome-unknown',active=0 WHERE active=1 OR phase='writing';`);
    } catch (error) { this.db.close(); this.lock.close(); throw error; }
  }
  private decode(value: unknown): StoredOperation | undefined {
    if (value === undefined) return undefined;
    if (!value || typeof value !== 'object' || !('id' in value) || !('fingerprint' in value) ||
        !('owner_id' in value) || !('repository_id' in value) || !('phase' in value) ||
        !('record' in value) || !('active' in value) ||
        typeof value.id !== 'string' || typeof value.fingerprint !== 'string' ||
        typeof value.owner_id !== 'number' || typeof value.repository_id !== 'number' ||
        typeof value.record !== 'string' || Buffer.byteLength(value.record) > OPERATION_LIMITS.recordBytes ||
        !['prepared', 'writing', 'outcome-unknown', 'branch-verified', 'conflict', 'blocked'].includes(String(value.phase)) ||
        (value.active !== 0 && value.active !== 1)) throw new Error('The local operation journal is damaged.');
    return { id: value.id, fingerprint: value.fingerprint, ownerId: value.owner_id, repositoryId: value.repository_id,
      phase: value.phase as OperationPhase, record: value.record, active: value.active === 1 };
  }
  get(id: string): StoredOperation | undefined {
    return this.decode(this.db.prepare('SELECT * FROM operations WHERE id=?').get(id));
  }
  existing(fingerprint: string): StoredOperation | undefined {
    return this.decode(this.db.prepare('SELECT * FROM operations WHERE fingerprint=?').get(fingerprint));
  }
  forOwner(ownerId: number): StoredOperation[] {
    return this.db.prepare('SELECT * FROM operations WHERE owner_id=? ORDER BY rowid DESC LIMIT ?')
      .all(ownerId, OPERATION_LIMITS.records).map(value => {
        const stored = this.decode(value);
        if (!stored) throw new Error('A local operation could not be read.');
        return stored;
      });
  }
  reserved(repositoryId: number): boolean {
    return !!this.db.prepare("SELECT id FROM operations WHERE repository_id=? AND phase IN ('prepared','writing','outcome-unknown')").get(repositoryId);
  }
  beginAdmission(): boolean {
    if (this.admission) return false;
    this.admission = true;
    return true;
  }
  endAdmission(): void { this.admission = false; }
  insert(value: StoredOperation): StoredOperation {
    if (Buffer.byteLength(value.record) > OPERATION_LIMITS.recordBytes) throw new Error('Operation metadata exceeds its local limit.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing = this.existing(value.fingerprint);
      if (existing) { this.db.exec('COMMIT'); return existing; }
      const count = this.db.prepare('SELECT count(*) AS count FROM operations').get();
      if (!count || typeof count.count !== 'number' || count.count >= OPERATION_LIMITS.records) {
        throw new RequestError(503, 'journal_capacity', 'The local receipt journal is full. Preserve and review its records before starting more simulations.');
      }
      if (this.reserved(value.repositoryId)) {
        throw new RequestError(409, 'destination_busy', 'An unresolved operation already owns this simulated destination. Reconcile it before starting another.');
      }
      this.db.prepare('INSERT INTO operations(id,fingerprint,owner_id,repository_id,phase,record,active) VALUES(?,?,?,?,?,?,0)')
        .run(value.id, value.fingerprint, value.ownerId, value.repositoryId, value.phase, value.record);
      this.db.exec('COMMIT');
      return { ...value, active: false };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  claim(id: string): boolean {
    return this.db.prepare('UPDATE operations SET active=1 WHERE id=? AND active=0').run(id).changes === 1;
  }
  save(id: string, phase: OperationPhase, record: string): void {
    if (Buffer.byteLength(record) > OPERATION_LIMITS.recordBytes) throw new Error('Operation metadata exceeds its local limit.');
    if (this.db.prepare('UPDATE operations SET phase=?,record=? WHERE id=? AND active=1').run(phase, record, id).changes !== 1) {
      throw new Error('The local operation claim was lost.');
    }
  }
  release(id: string): void { this.db.prepare('UPDATE operations SET active=0 WHERE id=?').run(id); }
  close(): void {
    if (this.admission || this.db.prepare('SELECT id FROM operations WHERE active=1').get()) throw new Error('Wait for active simulations to settle before closing the journal.');
    this.db.close(); this.lock.close();
  }
}
