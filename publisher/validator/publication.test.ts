import { createHash, webcrypto } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { zipSync } from 'fflate';
import sharp from 'sharp';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { creatorPackageFixture, creatorPackageOptions } from '../../src/test/creatorPackageFixture';
import { prepareCreatorPackage } from '../../src/utils/creatorPackage';
import { renderCreatorPreviews } from '../../src/utils/creatorPackagePreview';
import { checkedEntries, GIT_TREE_LIMITS, gitCommit, gitObject, gitTree, sha256 } from '../src/gitObjects.ts';
import { OperationStore, OPERATION_LIMITS } from '../src/operationStore.ts';
import { LocalPublicationEngine, PUBLICATION_DEADLINE_MS } from '../src/publication.ts';
import { createPublicationPlan, type PublicationMetadata } from '../src/plans.ts';
import { TestGitProvider, type FakeWrite } from '../test/gitProvider.ts';

vi.mock('../../src/utils/creatorPackagePreview', () => ({ renderCreatorPreviews: vi.fn() }));
const marker = 'SIMULATED_PRIVATE_MAP_TEXT_SENTINEL';
const output = process.env.QA_OUTPUT;
if (!output) throw new Error('Set QA_OUTPUT to a fresh local publication evidence directory.');
mkdirSync(output);
let zip: Uint8Array, alternative: Uint8Array;
let metadata: PublicationMetadata, nextMetadata: PublicationMetadata;
const stores = new Set<OperationStore>();
const signal = () => new AbortController().signal;
const paths: string[] = [];
const gate = () => {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
};
beforeAll(async () => {
  vi.stubGlobal('crypto', webcrypto);
  const png = Uint8Array.from(await sharp({ create: { width: 2, height: 2, channels: 4, background: '#123456' } }).png().toBuffer());
  vi.mocked(renderCreatorPreviews).mockImplementation(async project => project.levels.map((_, index) => ({
    path: index ? 'preview-02.png' : 'preview.png', bytes: png,
  })));
  async function build(version: string) {
    const source = creatorPackageFixture();
    source.levels[0].notes[1].description = marker;
    const options = { ...creatorPackageOptions(), profile: 'encounter' as const,
      packageId: 'simulated-vault', contentVersion: version, assetCredits: [], rightsConfirmed: true };
    options.levels[0].notes = [2];
    const prepared = await prepareCreatorPackage(source, options, signal());
    const bytes = zipSync(Object.fromEntries(prepared.files.map(file => [`maps/${options.packageId}/${file.path}`, file.bytes])),
      { level: 6, mtime: new Date(1980, 0, 1) });
    return { bytes, metadata: { packageId: options.packageId, contentVersion: version, packageSha256: sha256(bytes),
      zipBytes: bytes.length, memberCount: prepared.files.length,
      expandedBytes: prepared.files.reduce((sum, file) => sum + file.bytes.length, 0) } };
  }
  const first = await build('1.0.0'), second = await build('1.0.1');
  zip = first.bytes; metadata = first.metadata; alternative = second.bytes; nextMetadata = second.metadata;
  writeFileSync(join(output!, 'fixture-identities.json'), JSON.stringify({ metadata, nextMetadata,
    preview: 'Synthetic two-pixel color swatch, not rendered map artwork', hostedTriggers: 0 }, null, 2));
});
afterEach(() => {
  vi.useRealTimers();
  for (const store of stores) store.close();
  stores.clear();
});
function open(path: string) {
  const store = new OperationStore(path);
  stores.add(store); return store;
}
function close(store: OperationStore) { store.close(); stores.delete(store); }
async function setup() {
  const directory = mkdtempSync(join(output!, 'case-')), path = join(directory, 'operations.sqlite');
  paths.push(path);
  const provider = new TestGitProvider();
  const verifier = 'v'.repeat(43), redirectURI = 'http://127.0.0.1:5390/publisher/auth/callback';
  const code = provider.issueCode(createHash('sha256').update(verifier).digest('base64url'), redirectURI);
  const grant = await provider.exchange({ code, verifier, redirectURI, signal: signal() });
  const store = open(path), engine = new LocalPublicationEngine(store, provider);
  const plan = createPublicationPlan({ repositoryId: 2001, package: metadata },
    await provider.repository(grant.accessToken, 2001, signal()), Date.now(), Date.now() + 600_000);
  return { path, provider, grant, store, engine, plan };
}

describe('local simulated publication and durable metadata recovery', () => {
  it('publishes all members atomically through one new ref, verifies exact bytes, and preserves unrelated files/default branch', async () => {
    const { provider, engine, plan, grant, store, path } = await setup();
    const base = provider.repositoryState.headSha!, baseCommit = provider.commits.get(base)!;
    const original = structuredClone(provider.trees.get(baseCommit.tree)!);
    const receipt = await engine.submit(plan, grant.user.id, grant.accessToken, zip, signal());
    expect(receipt).toMatchObject({ phase: 'branch-verified', packageStoredInReceipt: false, writesToGitHub: false });
    expect(provider.branches.get('main')).toBe(base);
    expect(provider.branches.get(plan.branch)).toBe(receipt.expectedCommit);
    const commit = provider.commits.get(receipt.expectedCommit)!;
    expect(commit.parent).toBe(base);
    expect(gitCommit(commit)).toBe(receipt.expectedCommit);
    const entries = provider.trees.get(commit.tree)!;
    expect(gitTree(entries)).toBe(commit.tree);
    for (const entry of original) expect(entries).toContainEqual(entry);
    expect(entries.filter(entry => entry.path.startsWith('maps/simulated-vault/'))).toHaveLength(metadata.memberCount);
    expect(provider.writes).toEqual([...Array(metadata.memberCount).fill('blob'), 'tree', 'commit', 'branch']);
    expect([...provider.blobs.values()].some(bytes => Buffer.from(bytes).includes(marker))).toBe(true);
    const before = [...provider.writes];
    const replayPlan = { ...plan, id: 'z'.repeat(43), branch: 'dm-maps/simulated-vault-' + 'z'.repeat(12) };
    expect(await engine.submit(replayPlan, grant.user.id, grant.accessToken, zip, signal())).toEqual(receipt);
    expect(provider.writes).toEqual(before);
    expect(() => engine.status(receipt.id, grant.user.id + 1)).toThrow('not available');
    expect(statSync(path).mode & 0o077).toBe(0);
    close(store);
    expect(readFileSync(path).includes(marker)).toBe(false);
    expect(readFileSync(path).includes(grant.accessToken)).toBe(false);
  });

  it('replaces only the selected package subtree, dropping obsolete own members without deleting other maps', async () => {
    const state = await setup();
    const current = state.provider.commits.get(state.provider.repositoryState.headSha!)!;
    state.provider.replaceBase([...state.provider.trees.get(current.tree)!,
      { path: 'vendor/submodule', mode: '160000', sha: 'd'.repeat(40) },
      state.provider.seedBlob('maps/simulated-vault/assets/old.png', 'obsolete own member')]);
    const plan = { ...state.plan, repository: await state.provider.repository(state.grant.accessToken, 2001, signal()) };
    const receipt = await state.engine.submit(plan, state.grant.user.id, state.grant.accessToken, zip, signal());
    expect(receipt.phase).toBe('branch-verified');
    const tree = state.provider.trees.get(state.provider.commits.get(receipt.expectedCommit)!.tree)!;
    expect(tree.some(entry => entry.path.endsWith('old.png'))).toBe(false);
    expect(tree.some(entry => entry.path === 'maps/another-vault/map.json')).toBe(true);
    expect(tree).toContainEqual({ path: 'vendor/submodule', mode: '160000', sha: 'd'.repeat(40) });
  });

  it.each(['blob', 'tree', 'commit', 'branch'] as FakeWrite[])('never blindly retries a lost %s response', async kind => {
    const { engine, provider, plan, grant } = await setup();
    provider.dropResponseAfter = kind;
    const receipt = await engine.submit(plan, grant.user.id, grant.accessToken, zip, signal());
    expect(receipt).toMatchObject({ phase: 'outcome-unknown', objectsMayExist: true });
    const writes = [...provider.writes];
    expect((await engine.submit(plan, grant.user.id, grant.accessToken, zip, signal())).id).toBe(receipt.id);
    const recovered = await engine.reconcile(receipt.id, grant.user.id, grant.accessToken, signal());
    expect(recovered.phase).toBe(kind === 'branch' ? 'branch-verified' : 'outcome-unknown');
    expect(provider.writes).toEqual(writes);
  });

  it('reopens persisted receipts and reconciles against the separately retained fake provider, even after plan expiry', async () => {
    const { provider, plan, grant, store, path, engine } = await setup();
    provider.dropResponseAfter = 'branch';
    const receipt = await engine.submit(plan, grant.user.id, grant.accessToken, zip, signal());
    close(store);
    const reopened = new LocalPublicationEngine(open(path), provider, () => plan.expiresAt + 1);
    const before = [...provider.writes];
    expect((await reopened.reconcile(receipt.id, grant.user.id, grant.accessToken, signal())).phase).toBe('branch-verified');
    expect(provider.writes).toEqual(before);
  });

  it('recovers a hard-killed journal writer without treating its interrupted phase as completed or replaying writes', async () => {
    const state = await setup();
    state.provider.dropResponseAfter = 'branch';
    const receipt = await state.engine.submit(state.plan, state.grant.user.id, state.grant.accessToken, zip, signal());
    close(state.store);
    const moduleURL = pathToFileURL(resolve('publisher/src/operationStore.ts')).href;
    const child = spawn(process.execPath, ['--input-type=module', '-e',
      `import {OperationStore} from ${JSON.stringify(moduleURL)};
       const store=new OperationStore(${JSON.stringify(state.path)});
       const item=store.get(${JSON.stringify(receipt.id)});
       if(!store.claim(item.id)) throw new Error('claim failed');
       store.save(item.id,'writing',item.record);
       process.kill(process.pid,'SIGKILL');`], { stdio: ['ignore', 'ignore', 'pipe'], env: {} });
    const code = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
      child.on('error', reject); child.on('close', (code, signal) => resolve({ code, signal }));
    });
    expect(code.signal).toBe('SIGKILL');
    const reopened = new LocalPublicationEngine(open(state.path), state.provider);
    expect(reopened.status(receipt.id, state.grant.user.id).phase).toBe('outcome-unknown');
    const before = [...state.provider.writes];
    expect((await reopened.reconcile(receipt.id, state.grant.user.id, state.grant.accessToken, signal())).phase).toBe('branch-verified');
    expect(state.provider.writes).toEqual(before);
  });

  it('refuses a second journal owner instead of resetting live operation claims', async () => {
    const state = await setup();
    expect(() => new OperationStore(state.path)).toThrow('already open');
  });

  it('enforces exact receipt and repository-tree bounds without evicting old operations', async () => {
    const state = await setup();
    const entry = { id: 'a'.repeat(43), fingerprint: sha256('capacity-0'), ownerId: 1001, repositoryId: 2001,
      phase: 'conflict' as const, active: false, record: ' '.repeat(OPERATION_LIMITS.recordBytes) };
    expect(() => state.store.insert({ ...entry, record: entry.record + ' ' })).toThrow('metadata exceeds');
    state.store.insert(entry);
    for (let index = 1; index < OPERATION_LIMITS.records; index++) {
      state.store.insert({ ...entry, id: index.toString().padStart(43, 'a'),
        fingerprint: sha256('capacity-' + index), record: '{}' });
    }
    expect(() => state.store.insert({ ...entry, id: 'z'.repeat(43), fingerprint: sha256('capacity-overflow'), record: '{}' }))
      .toThrow('journal is full');
    expect(state.store.get(entry.id)?.record.length).toBe(OPERATION_LIMITS.recordBytes);
    const entries = Array.from({ length: GIT_TREE_LIMITS.entries }, (_, index) =>
      ({ path: `file-${index}`, mode: '100644' as const, sha: 'a'.repeat(40) }));
    expect(checkedEntries(entries)).toHaveLength(GIT_TREE_LIMITS.entries);
    expect(() => checkedEntries([...entries, { path: 'extra', mode: '100644', sha: 'b'.repeat(40) }])).toThrow('review limit');
  });

  it('rejects stale bases, expired plans, invalid ZIPs and path collisions before any writes', async () => {
    const state = await setup();
    await expect(state.engine.submit({ ...state.plan, expiresAt: 1 }, state.grant.user.id, state.grant.accessToken, zip, signal())).rejects.toMatchObject({ status: 409 });
    const bad = Uint8Array.from(zip); bad[0] ^= 1;
    await expect(state.engine.submit(state.plan, state.grant.user.id, state.grant.accessToken, bad, signal())).rejects.toMatchObject({ status: 409 });
    const base = state.provider.commits.get(state.provider.repositoryState.headSha!)!;
    state.provider.replaceBase([...state.provider.trees.get(base.tree)!, state.provider.seedBlob('maps/simulated-vault', 'file collision')]);
    await expect(state.engine.submit(state.plan, state.grant.user.id, state.grant.accessToken, zip, signal())).rejects.toMatchObject({ status: 409 });
    const fresh = { ...state.plan, repository: await state.provider.repository(state.grant.accessToken, 2001, signal()) };
    await expect(state.engine.submit(fresh, state.grant.user.id, state.grant.accessToken, zip, signal())).rejects.toMatchObject({ code: 'path_collision' });
    expect(state.provider.writes).toEqual([]);
  });

  it('serializes concurrent submissions and keeps unresolved destinations reserved for reconciliation', async () => {
    const state = await setup(), started = gate(), finish = gate();
    state.provider.beforeWrite = async kind => { if (kind === 'blob') { started.release(); await finish.promise; } };
    const pending = state.engine.submit(state.plan, state.grant.user.id, state.grant.accessToken, zip, signal());
    await started.promise;
    try {
      const duplicate = await state.engine.submit(state.plan, state.grant.user.id, state.grant.accessToken, zip, signal());
      expect(duplicate.phase).toBe('writing');
      await expect(state.engine.reconcile(duplicate.id, state.grant.user.id, state.grant.accessToken, signal())).rejects.toMatchObject({ status: 409 });
      await expect(state.engine.submit({ ...state.plan, package: nextMetadata }, state.grant.user.id,
        state.grant.accessToken, alternative, signal())).rejects.toMatchObject({ code: 'destination_busy' });
    } finally { state.provider.beforeWrite = undefined; finish.release(); }
    expect((await pending).phase).toBe('branch-verified');
    expect(state.provider.writes.filter(kind => kind === 'branch')).toHaveLength(1);
  });

  it('admits only one native package validation per journal before any receipt exists', async () => {
    const state = await setup();
    const first = state.engine.submit(state.plan, state.grant.user.id, state.grant.accessToken, zip, signal());
    await expect(state.engine.submit({ ...state.plan, package: nextMetadata }, state.grant.user.id,
      state.grant.accessToken, alternative, signal())).rejects.toMatchObject({ status: 503, code: 'publication_busy' });
    expect(() => state.store.close()).toThrow('Wait for active');
    expect((await first).phase).toBe('branch-verified');
  });

  it('does not bypass protected branches or overwrite a concurrently created branch', async () => {
    const state = await setup();
    state.provider.protectBranches = true;
    const receipt = await state.engine.submit(state.plan, state.grant.user.id, state.grant.accessToken, zip, signal());
    expect(receipt.phase).toBe('outcome-unknown');
    expect(state.provider.branches.has(state.plan.branch)).toBe(false);
    state.provider.branches.set(state.plan.branch, state.provider.repositoryState.headSha!);
    const before = [...state.provider.writes];
    expect((await state.engine.reconcile(receipt.id, state.grant.user.id, state.grant.accessToken, signal())).phase).toBe('conflict');
    expect(state.provider.writes).toEqual(before);
    expect(state.provider.branches.get(state.plan.branch)).toBe(state.provider.repositoryState.headSha);
  });

  it('detects altered readback bytes and only upgrades the receipt after exact content is restored', async () => {
    const state = await setup();
    const read = state.provider.blob.bind(state.provider);
    state.provider.blob = async (...args) => {
      const bytes = await read(...args); bytes[0] ^= 1; return bytes;
    };
    const receipt = await state.engine.submit(state.plan, state.grant.user.id, state.grant.accessToken, zip, signal());
    expect(receipt.phase).toBe('outcome-unknown');
    const before = [...state.provider.writes];
    state.provider.blob = read;
    expect((await state.engine.reconcile(receipt.id, state.grant.user.id, state.grant.accessToken, signal())).phase).toBe('branch-verified');
    expect(state.provider.writes).toEqual(before);
  });

  it('stops after permission or visibility changes and never falls back to another credential', async () => {
    const state = await setup();
    state.provider.afterWrite = async kind => { if (kind === 'blob') state.provider.repositoryState.private = false; };
    const receipt = await state.engine.submit(state.plan, state.grant.user.id, state.grant.accessToken, zip, signal());
    expect(receipt.phase).toBe('outcome-unknown');
    expect(state.provider.writes).toEqual(['blob']);
    await state.provider.revoke(state.grant.accessToken, signal());
    await expect(state.engine.reconcile(receipt.id, state.grant.user.id, state.grant.accessToken, signal())).rejects.toMatchObject({ status: 502 });
    expect(state.provider.writes).toEqual(['blob']);
  });

  it('stops future requests on cancellation after acceptance without claiming to undo the accepted ref', async () => {
    const state = await setup(), controller = new AbortController();
    state.provider.afterWrite = async kind => { if (kind === 'branch') controller.abort(); };
    const receipt = await state.engine.submit(state.plan, state.grant.user.id, state.grant.accessToken, zip, controller.signal);
    expect(receipt.phase).toBe('outcome-unknown');
    expect(state.provider.branches.get(state.plan.branch)).toBe(receipt.expectedCommit);
    const before = [...state.provider.writes];
    expect((await state.engine.reconcile(receipt.id, state.grant.user.id, state.grant.accessToken, signal())).phase).toBe('branch-verified');
    expect(state.provider.writes).toEqual(before);
  });

  it('keeps a cancelled request uncertain while late branch acceptance is still possible', async () => {
    const state = await setup(), started = gate(), finish = gate(), accepted = gate(), controller = new AbortController();
    state.provider.createBranch = async (_token, _id, branch, sha) => {
      started.release();
      await finish.promise;
      state.provider.branches.set(branch, sha);
      accepted.release();
    };
    const pending = state.engine.submit(state.plan, state.grant.user.id, state.grant.accessToken, zip, controller.signal);
    await started.promise;
    controller.abort();
    const receipt = await pending;
    expect(receipt).toMatchObject({ phase: 'outcome-unknown', problem: 'cancelled' });
    expect((await state.engine.reconcile(receipt.id, state.grant.user.id, state.grant.accessToken, signal())).phase).toBe('outcome-unknown');
    const before = [...state.provider.writes];
    finish.release(); await accepted.promise;
    expect((await state.engine.reconcile(receipt.id, state.grant.user.id, state.grant.accessToken, signal())).phase).toBe('branch-verified');
    expect(state.provider.writes).toEqual(before);
  });

  it('enforces its overall deadline even when the fake provider ignores cancellation', async () => {
    const state = await setup(), started = gate();
    state.provider.createBlob = async () => { started.release(); return new Promise(() => {}); };
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const work = state.engine.submit(state.plan, state.grant.user.id, state.grant.accessToken, zip, signal());
    await started.promise;
    vi.advanceTimersByTime(PUBLICATION_DEADLINE_MS);
    vi.useRealTimers();
    expect((await work).phase).toBe('outcome-unknown');
  });

  it('matches known Git object encodings and rejects ambiguous flattened trees', () => {
    expect(gitObject('blob', Buffer.from('hello\n'))).toBe('ce013625030ba8dba906f756967f9e9ca394464a');
    expect(gitTree([])).toBe('4b825dc642cb6eb9a060e54bf8d69288fbee4904');
    expect(() => gitTree([{ path: 'maps', mode: '120000', sha: 'a'.repeat(40) },
      { path: 'maps/file', mode: '100644', sha: 'b'.repeat(40) }])).toThrow('conflicts');
    const gitHash = (type: string, input: Buffer) => execFileSync('git', ['hash-object', '-t', type, '--stdin'], { input, encoding: 'utf8' }).trim();
    const blob = gitHash('blob', Buffer.from('hello\n'));
    const nested = gitHash('tree', Buffer.concat([Buffer.from('100644 child\0'), Buffer.from(blob, 'hex')]));
    const root = gitHash('tree', Buffer.concat([
      Buffer.from('100755 a.b\0'), Buffer.from(blob, 'hex'),
      Buffer.from('40000 a\0'), Buffer.from(nested, 'hex'),
      Buffer.from('120000 z\0'), Buffer.from(blob, 'hex'),
    ]));
    expect(gitTree([{ path: 'a/child', mode: '100644', sha: blob }, { path: 'z', mode: '120000', sha: blob },
      { path: 'a.b', mode: '100755', sha: blob }])).toBe(root);
    const timestamp = 123, message = 'Synthetic Git encoding oracle\n';
    const identity = `Dungeon Mapper simulation <publisher@local.invalid> ${timestamp} +0000`;
    const commit = Buffer.from(`tree ${root}\nparent ${'a'.repeat(40)}\nauthor ${identity}\ncommitter ${identity}\n\n${message}`);
    expect(gitCommit({ tree: root, parent: 'a'.repeat(40), timestamp, message })).toBe(gitHash('commit', commit));
  });
});
