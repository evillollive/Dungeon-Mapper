import { randomBytes } from 'node:crypto';
import { assertCreatorMemberPath, CREATOR_PACKAGE_LIMITS } from '../../src/utils/creatorPackageContract.ts';
import { checkedEntries, gitCommit, gitObject, gitTree, sha256, type GitCommit, type GitEntry, type LocalGitProvider } from './gitObjects.ts';
import { OperationStore, type OperationPhase, type StoredOperation } from './operationStore.ts';
import { publicationMetadata, reviewedRepository, sameRepository, type PublicationMetadata, type PublicationPlan } from './plans.ts';
import type { PublisherRepositorySnapshot } from './provider.ts';
import { RequestError } from './errors.ts';
import { validatePublicationPackage } from './validation.ts';

export const PUBLICATION_DEADLINE_MS = 30_000;
interface Member { path: string; bytes: number; sha256: string; gitSha: string }
interface Intent {
  version: 1; id: string; ownerId: number; repository: PublisherRepositorySnapshot;
  package: PublicationMetadata; branch: string; expiresAt: number;
  entries: GitEntry[]; commit: GitCommit; commitSha: string; members: Member[];
  stage: 'prepared' | 'blobs' | 'tree' | 'commit' | 'branch' | 'readback';
  objectsMayExist: boolean;
  problem?: 'cancelled' | 'deadline' | 'destination-or-plan-changed' | 'provider-or-readback-failed';
}
export interface PublicationReceipt {
  id: string; mode: 'local-simulation'; phase: OperationPhase; repositoryId: number;
  branch: string; packageSha256: string; expectedCommit: string;
  objectsMayExist: boolean; stage: Intent['stage']; problem?: Intent['problem'];
  writesToGitHub: false; packageStoredInReceipt: false;
}
function denied(): never { throw new RequestError(404, 'operation_unavailable', 'This operation is not available to the current simulated owner.'); }
function owner(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) denied();
}
function waitFor<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => { signal.removeEventListener('abort', abort); reject(signal.reason); };
    signal.addEventListener('abort', abort, { once: true });
    work.then(value => { signal.removeEventListener('abort', abort); resolve(value); },
      error => { signal.removeEventListener('abort', abort); reject(error); });
    if (signal.aborted) abort();
  });
}
function readIntent(stored: StoredOperation): Intent {
  const value: Intent = JSON.parse(stored.record);
  if (!value || value.version !== 1 || value.id !== stored.id || value.ownerId !== stored.ownerId ||
      value.repository?.id !== stored.repositoryId || !/^[A-Za-z0-9_-]{43}$/.test(value.id) ||
      !Number.isFinite(value.expiresAt) || typeof value.objectsMayExist !== 'boolean' ||
      !['prepared', 'blobs', 'tree', 'commit', 'branch', 'readback'].includes(value.stage) ||
      !Array.isArray(value.members) || value.members.length > CREATOR_PACKAGE_LIMITS.members) throw new Error('The local publication receipt is damaged.');
  const metadata = publicationMetadata({ repositoryId: value.repository.id, package: value.package }).package;
  reviewedRepository(value.repository, stored.repositoryId);
  if (!new RegExp(`^dm-maps/${metadata.packageId}-[A-Za-z0-9_-]{12}$`).test(value.branch) ||
      gitCommit(value.commit) !== value.commitSha || gitTree(value.entries) !== value.commit.tree ||
      value.commit.parent !== value.repository.headSha || metadata.memberCount !== value.members.length) throw new Error('The local publication intent is inconsistent.');
  const seen = new Set<string>();
  let expanded = 0;
  for (const member of value.members) {
    assertCreatorMemberPath(member.path);
    if (seen.has(member.path) || !Number.isSafeInteger(member.bytes) || member.bytes <= 0 ||
        member.bytes > CREATOR_PACKAGE_LIMITS.expandedBytes - expanded || !/^[a-f0-9]{64}$/.test(member.sha256) ||
        !/^[a-f0-9]{40}$/.test(member.gitSha)) throw new Error('The local publication members are damaged.');
    expanded += member.bytes; seen.add(member.path);
    if (!value.entries.some(entry => entry.path === `maps/${metadata.packageId}/${member.path}` &&
        entry.mode === '100644' && entry.sha === member.gitSha)) throw new Error('The local publication tree is inconsistent.');
  }
  if (expanded !== metadata.expandedBytes || (value.problem !== undefined &&
      !['cancelled', 'deadline', 'destination-or-plan-changed', 'provider-or-readback-failed'].includes(value.problem))) {
    throw new Error('The local publication sizes or failure state are inconsistent.');
  }
  return value;
}
function receipt(stored: StoredOperation, intent = readIntent(stored)): PublicationReceipt {
  return { id: intent.id, mode: 'local-simulation', phase: stored.phase, repositoryId: intent.repository.id,
    branch: intent.branch, packageSha256: intent.package.packageSha256, expectedCommit: intent.commitSha,
    objectsMayExist: intent.objectsMayExist, stage: intent.stage, ...(intent.problem ? { problem: intent.problem } : {}),
    writesToGitHub: false, packageStoredInReceipt: false };
}
function problem(error: unknown, signal: AbortSignal): NonNullable<Intent['problem']> {
  if (signal.aborted) return signal.reason instanceof RequestError && signal.reason.status === 504 ? 'deadline' : 'cancelled';
  return error instanceof RequestError && [401, 403, 409, 410].includes(error.status)
    ? 'destination-or-plan-changed' : 'provider-or-readback-failed';
}

/** Test-provider engine only. No HTTP route or real GitHub adapter is wired to this class. */
export class LocalPublicationEngine {
  private store: OperationStore;
  private provider: LocalGitProvider;
  private now: () => number;
  constructor(store: OperationStore, provider: LocalGitProvider, now: () => number = Date.now) {
    if (provider.kind !== 'local-test') throw new Error('Publication is available only with a local simulated provider.');
    this.store = store; this.provider = provider; this.now = now;
  }
  private load(id: string, ownerId: number): StoredOperation {
    owner(ownerId);
    const value = this.store.get(id);
    if (!value || value.ownerId !== ownerId) denied();
    return value;
  }
  status(id: string, ownerId: number): PublicationReceipt { return receipt(this.load(id, ownerId)); }
  private async destination(intent: Intent, token: string, signal: AbortSignal, historical = false): Promise<void> {
    signal.throwIfAborted();
    if (!historical && intent.expiresAt <= this.now()) throw new RequestError(410, 'plan_expired', 'The reviewed plan expired before the next simulated request.');
    const current = reviewedRepository(await waitFor(this.provider.repository(token, intent.repository.id, signal), signal), intent.repository.id);
    signal.throwIfAborted();
    if (!sameRepository(intent.repository, historical ? { ...current, headSha: intent.repository.headSha } : current)) {
      throw new RequestError(409, 'destination_changed', 'The simulated destination changed. No automatic rebase or permission fallback is allowed.');
    }
  }
  private async verify(intent: Intent, token: string, signal: AbortSignal): Promise<'verified' | 'missing' | 'conflict'> {
    await this.destination(intent, token, signal, true);
    const branch = await waitFor(this.provider.branch(token, intent.repository.id, intent.branch, signal), signal);
    if (branch === null) return 'missing';
    if (branch !== intent.commitSha) return 'conflict';
    const commit = await waitFor(this.provider.commit(token, intent.repository.id, branch, signal), signal);
    if (gitCommit(commit) !== intent.commitSha) throw new Error('Simulated commit readback did not match.');
    const entries = await waitFor(this.provider.tree(token, intent.repository.id, commit.tree, signal), signal);
    if (gitTree(entries) !== intent.commit.tree) throw new Error('Simulated tree readback did not match.');
    for (const member of intent.members) {
      signal.throwIfAborted();
      const bytes = await waitFor(this.provider.blob(token, intent.repository.id, member.gitSha, signal), signal);
      if (!(bytes instanceof Uint8Array) || bytes.length !== member.bytes || sha256(bytes) !== member.sha256 ||
          gitObject('blob', bytes) !== member.gitSha) throw new Error('Simulated package bytes did not match readback.');
    }
    await this.destination(intent, token, signal, true);
    const final = await waitFor(this.provider.branch(token, intent.repository.id, intent.branch, signal), signal);
    if (final !== intent.commitSha) return final === null ? 'missing' : 'conflict';
    return 'verified';
  }
  async reconcile(id: string, ownerId: number, token: string, signal: AbortSignal): Promise<PublicationReceipt> {
    const stored = this.load(id, ownerId), intent = readIntent(stored);
    if (stored.active || !this.store.claim(id)) throw new RequestError(409, 'operation_busy', 'The simulation is still running. Wait for it to settle before reconciliation.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new RequestError(504, 'reconcile_timeout', 'Read-only reconciliation timed out. Do not repeat writes.')), PUBLICATION_DEADLINE_MS);
    const combined = AbortSignal.any([signal, controller.signal]);
    try {
      const state = await this.verify(intent, token, combined);
      const phase = state === 'verified' ? 'branch-verified' : state === 'conflict' ? 'conflict' : 'outcome-unknown';
      if (phase === 'branch-verified') delete intent.problem;
      this.store.save(id, phase, JSON.stringify(intent));
      return receipt({ ...stored, phase }, intent);
    } catch (error) {
      intent.problem = problem(error, combined);
      this.store.save(id, 'outcome-unknown', JSON.stringify(intent));
      if (error instanceof RequestError) throw error;
      throw new RequestError(502, 'reconciliation_unavailable', 'The simulated outcome could not be verified. Its receipt is retained; no writes were repeated.');
    } finally {
      clearTimeout(timer); controller.abort(); this.store.release(id);
    }
  }
  async submit(plan: PublicationPlan, ownerId: number, token: string, zip: Uint8Array, signal: AbortSignal): Promise<PublicationReceipt> {
    owner(ownerId); signal.throwIfAborted();
    const metadata = publicationMetadata({ repositoryId: plan.repository.id, package: plan.package }).package;
    const repository = reviewedRepository(plan.repository, plan.repository.id);
    if (!/^[A-Za-z0-9_-]{43}$/.test(plan.id) || plan.branch !== `dm-maps/${metadata.packageId}-${plan.id.slice(0, 12)}` ||
        !Number.isFinite(plan.expiresAt) || plan.expiresAt <= this.now() || zip.length !== metadata.zipBytes ||
        sha256(zip) !== metadata.packageSha256) throw new RequestError(409, 'invalid_submission', 'Review the exact package and destination before simulating publication.');
    const fingerprint = sha256(JSON.stringify([ownerId, repository.id, repository.installationId, metadata.packageId, metadata.packageSha256]));
    const prior = this.store.existing(fingerprint);
    if (prior) return receipt(this.load(prior.id, ownerId));
    if (this.store.reserved(repository.id)) throw new RequestError(409, 'destination_busy', 'An unresolved operation owns this destination. Reconcile it before starting another.');
    if (!this.store.beginAdmission()) throw new RequestError(503, 'publication_busy', 'Another package is being processed by this local journal. Wait for cleanup before retrying.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new RequestError(504, 'publication_timeout', 'The simulation timed out. Reconcile its receipt before attempting further work.')), PUBLICATION_DEADLINE_MS);
    const combined = AbortSignal.any([signal, controller.signal]);
    let intent: Intent | undefined;
    let claimed = false;
    try {
      const validated = await validatePublicationPackage(Uint8Array.from(zip), combined);
      if ((Object.keys(metadata) as (keyof PublicationMetadata)[]).some(key => metadata[key] !== validated.package[key])) {
        throw new RequestError(409, 'package_changed', 'Independent validation did not match the reviewed package metadata.');
      }
      const members = validated.files.map(file => ({ path: file.path, bytes: file.bytes.length,
        sha256: sha256(file.bytes), gitSha: gitObject('blob', file.bytes) }));
      const id = randomBytes(32).toString('base64url');
      intent = { version: 1, id, ownerId, repository, package: metadata, branch: plan.branch, expiresAt: plan.expiresAt,
        members, entries: [], commit: { tree: '', parent: repository.headSha, timestamp: Math.floor(this.now() / 1000),
          message: `Publish creator package ${metadata.packageId} ${metadata.contentVersion}\n\nLocal operation: ${id}\n` },
        commitSha: '', stage: 'prepared', objectsMayExist: false };
      await this.destination(intent, token, combined);
      const base = await waitFor(this.provider.commit(token, repository.id, repository.headSha!, combined), combined);
      if (gitCommit(base) !== repository.headSha) throw new Error('The reviewed base commit identity did not match.');
      const before = checkedEntries(await waitFor(this.provider.tree(token, repository.id, base.tree, combined), combined));
      if (gitTree(before) !== base.tree) throw new Error('The reviewed base tree identity did not match.');
      const root = `maps/${metadata.packageId}`;
      if (before.some(entry => entry.path === 'maps' || entry.path === root)) throw new RequestError(409, 'path_collision', 'A file or link occupies the intended map directory.');
      intent.entries = checkedEntries([...before.filter(entry => !entry.path.startsWith(root + '/')),
        ...members.map(member => ({ path: `${root}/${member.path}`, mode: '100644' as const, sha: member.gitSha }))]);
      intent.commit.tree = gitTree(intent.entries);
      intent.commitSha = gitCommit(intent.commit);
      if (await waitFor(this.provider.branch(token, repository.id, intent.branch, combined), combined) !== null) {
        throw new RequestError(409, 'branch_exists', 'The proposed branch already exists. It will not be overwritten.');
      }
      await this.destination(intent, token, combined);
      const stored = this.store.insert({ id, fingerprint, ownerId, repositoryId: repository.id,
        phase: 'prepared', record: JSON.stringify(intent), active: false });
      if (stored.id !== id) return receipt(stored);
      if (!this.store.claim(id)) throw new RequestError(409, 'operation_busy', 'This operation is already running.');
      claimed = true;
      const save = (stage: Intent['stage']) => {
        intent!.stage = stage; intent!.objectsMayExist = true;
        this.store.save(id, 'writing', JSON.stringify(intent));
      };
      for (const [index, file] of validated.files.entries()) {
        await this.destination(intent, token, combined); save('blobs');
        const created = await waitFor(this.provider.createBlob(token, repository.id, file.bytes, combined), combined);
        if (created !== members[index].gitSha) throw new Error('A simulated blob write returned the wrong identity.');
      }
      await this.destination(intent, token, combined); save('tree');
      if (await waitFor(this.provider.createTree(token, repository.id, intent.entries, combined), combined) !== intent.commit.tree) {
        throw new Error('A simulated tree write returned the wrong identity.');
      }
      await this.destination(intent, token, combined); save('commit');
      if (await waitFor(this.provider.createCommit(token, repository.id, intent.commit, combined), combined) !== intent.commitSha) {
        throw new Error('A simulated commit write returned the wrong identity.');
      }
      await this.destination(intent, token, combined);
      if (await waitFor(this.provider.branch(token, repository.id, intent.branch, combined), combined) !== null) {
        this.store.save(id, 'conflict', JSON.stringify(intent));
        return receipt({ ...stored, phase: 'conflict' }, intent);
      }
      save('branch');
      await waitFor(this.provider.createBranch(token, repository.id, intent.branch, intent.commitSha, combined), combined);
      save('readback');
      const state = await this.verify(intent, token, combined);
      const phase = state === 'verified' ? 'branch-verified' : state === 'conflict' ? 'conflict' : 'outcome-unknown';
      if (phase !== 'branch-verified') intent.problem = 'provider-or-readback-failed';
      this.store.save(id, phase, JSON.stringify(intent));
      return receipt({ ...stored, phase }, intent);
    } catch (error) {
      if (claimed && intent) {
        intent.problem = problem(error, combined);
        const phase = intent.objectsMayExist ? 'outcome-unknown' : 'blocked';
        this.store.save(intent.id, phase, JSON.stringify(intent));
        return receipt(this.load(intent.id, ownerId), intent);
      }
      if (error instanceof RequestError) throw error;
      throw new RequestError(502, 'publication_not_started', 'The local publication preparation failed before any simulated writes.');
    } finally {
      clearTimeout(timer); controller.abort();
      if (claimed && intent) this.store.release(intent.id);
      this.store.endAdmission();
    }
  }
}
