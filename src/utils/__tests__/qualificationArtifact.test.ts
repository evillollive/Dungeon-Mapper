import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { link, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  assertPublication, checkPublished, createBundle, environmentIdentity, MANIFEST,
  materialize, PAGES_URL, verifyBundle,
} from '../../../scripts/qualification-artifact.mjs';

const roots: string[] = [];
const identity = {
  repository: 'evillollive/Dungeon-Mapper', repositoryId: '1219366477',
  source: 'a'.repeat(40), event: 'push', ref: 'refs/heads/main', runId: '1234', runAttempt: '1',
};
const tools = { node: 'v20.19.0', npm: '10.8.2' };
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const script = resolve('scripts/qualification-artifact.mjs');

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'dungeon-qualification-'));
  roots.push(root);
  const source = join(root, 'source'), bundle = join(root, 'bundle'), lockfile = join(root, 'package-lock.json');
  await mkdir(join(source, 'assets'), { recursive: true });
  await writeFile(join(source, 'index.html'), '<script src="/Dungeon-Mapper/assets/app.js"></script>');
  await writeFile(join(source, 'service-worker.js'), '/* synthetic worker */');
  await writeFile(join(source, 'assets/app.js'), '/* synthetic application */');
  await writeFile(lockfile, '{"lockfileVersion":3}');
  return { root, source, bundle, lockfile };
}
async function built() {
  const paths = await fixture();
  return { ...paths, ...await createBundle(paths.source, paths.bundle, identity, paths.lockfile, tools) };
}
function pagesArtifact() {
  return {
    id: 5678, name: 'pages-1234-1', expired: false,
    workflow_run: { id: 1234, head_sha: identity.source, repository_id: 1219366477 },
  };
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe('canonical qualification artifacts', () => {
  it('copies one build and verifies every byte before and after consumption', async () => {
    const f = await built();
    const destination = join(f.root, 'tested-dist');
    expect(f.manifest.files.map((file: { path: string }) => file.path)).toEqual(['assets/app.js', 'index.html', 'service-worker.js']);
    await materialize(f.bundle, destination, identity, f.manifestSha256, f.lockfile);
    await expect(verifyBundle(f.bundle, identity, f.manifestSha256, f.lockfile, destination)).resolves.toEqual(f.manifest);
    await writeFile(join(destination, 'assets/app.js'), 'changed during testing');
    await expect(verifyBundle(f.bundle, identity, f.manifestSha256, f.lockfile, destination)).rejects.toThrow('Tested distribution changed');
  });

  it.each(['source', 'repository', 'repositoryId', 'event', 'ref', 'runId', 'runAttempt'])('rejects mismatched %s instead of reusing another receipt', async field => {
    const f = await built();
    const alternatives = {
      source: 'b'.repeat(40), repository: 'fork/Dungeon-Mapper', repositoryId: '2',
      event: 'workflow_dispatch', ref: 'refs/heads/elsewhere', runId: '99', runAttempt: '2',
    };
    await expect(verifyBundle(f.bundle, { ...identity, [field]: alternatives[field as keyof typeof alternatives] },
      f.manifestSha256, f.lockfile)).rejects.toThrow('Source, repository, event or run/attempt mismatch');
  });

  it('requires an externally supplied manifest digest and matching lockfile', async () => {
    const f = await built();
    await expect(verifyBundle(f.bundle, identity, '', f.lockfile)).rejects.toThrow('Missing expected');
    await expect(verifyBundle(f.bundle, identity, '0'.repeat(64), f.lockfile)).rejects.toThrow('Manifest digest mismatch');
    await writeFile(f.lockfile, 'changed lockfile');
    await expect(verifyBundle(f.bundle, identity, f.manifestSha256, f.lockfile)).rejects.toThrow('Checkout lockfile');
  });

  it.each(['modified', 'missing', 'extra'])('fails on a %s distribution file', async change => {
    const f = await built();
    if (change === 'missing') await rm(join(f.bundle, 'dist/index.html'));
    else await writeFile(join(f.bundle, 'dist', change === 'extra' ? 'unqualified.js' : 'index.html'), 'not qualified');
    await expect(verifyBundle(f.bundle, identity, f.manifestSha256, f.lockfile)).rejects.toThrow('Canonical distribution integrity');
  });

  it('rejects unexpected bundle contents and never overwrites an existing target', async () => {
    const f = await built();
    await expect(materialize(f.bundle, f.source, identity, f.manifestSha256, f.lockfile)).rejects.toThrow('EEXIST');
    await writeFile(join(f.bundle, 'extra.json'), '{}');
    await expect(verifyBundle(f.bundle, identity, f.manifestSha256, f.lockfile)).rejects.toThrow('Unexpected bundle contents');
  });

  it.each(['symbolic', 'hard'])('rejects %s links in the producer and consumer', async kind => {
    const f = await fixture();
    if (kind === 'symbolic') await symlink(f.lockfile, join(f.source, 'link.json'));
    else await link(f.lockfile, join(f.source, 'link.json'));
    await expect(createBundle(f.source, f.bundle, identity, f.lockfile, tools)).rejects.toThrow(/link/);
    await rm(join(f.source, 'link.json'));
    const built = await createBundle(f.source, f.bundle, identity, f.lockfile, tools);
    await symlink(f.lockfile, join(f.bundle, 'dist/link.json'));
    await expect(verifyBundle(f.bundle, identity, built.manifestSha256, f.lockfile)).rejects.toThrow('Symbolic link');
  });

  it.each(['../escape', '/absolute', 'assets/../../escape', 'assets\\escape', 'C:/escape', '.github/token'])('rejects unsafe manifest path %s', async path => {
    const f = await built();
    f.manifest.files[0].path = path;
    const bytes = JSON.stringify(f.manifest);
    await writeFile(join(f.bundle, MANIFEST), bytes);
    await expect(verifyBundle(f.bundle, identity, digest(bytes), f.lockfile)).rejects.toThrow('Unsafe distribution path');
  });

  it('rejects empty, duplicate and incomplete manifests', async () => {
    const f = await built();
    for (const files of [[], [f.manifest.files[0], f.manifest.files[0]], [f.manifest.files[0]]]) {
      const bytes = JSON.stringify({ ...f.manifest, files });
      await writeFile(join(f.bundle, MANIFEST), bytes);
      await expect(verifyBundle(f.bundle, identity, digest(bytes), f.lockfile)).rejects.toThrow();
    }
  });

  it('validates GitHub environment fields and excludes arbitrary dispatch refs from publication', () => {
    expect(() => environmentIdentity({})).toThrow();
    expect(environmentIdentity({
      GITHUB_REPOSITORY: identity.repository, GITHUB_REPOSITORY_ID: identity.repositoryId,
      GITHUB_SHA: identity.source, GITHUB_EVENT_NAME: identity.event, GITHUB_REF: identity.ref,
      GITHUB_RUN_ID: identity.runId, GITHUB_RUN_ATTEMPT: identity.runAttempt,
    })).toEqual(identity);
  });
});

describe('publication admission and smoke outcomes', () => {
  it('admits only the current qualified main source and exact Pages artifact', async () => {
    const f = await built();
    expect(() => assertPublication(f.manifest, identity.source, pagesArtifact(), '5678')).not.toThrow();
    expect(() => assertPublication({ ...f.manifest, identity: { ...identity, event: 'workflow_dispatch' } },
      identity.source, pagesArtifact(), '5678')).not.toThrow();
  });

  it.each([
    { repository: 'fork/Dungeon-Mapper' },
    { event: 'pull_request', ref: 'refs/pull/185/merge' },
    { event: 'workflow_dispatch', ref: 'refs/heads/feature' },
    { event: 'workflow_dispatch', ref: 'refs/tags/v1' },
  ])('rejects non-publishing identity %j', async patch => {
    const f = await built();
    expect(() => assertPublication({ ...f.manifest, identity: { ...identity, ...patch } },
      identity.source, pagesArtifact(), '5678')).toThrow();
  });

  it('rejects stale main, expired/misbound Pages artifacts and missing IDs', async () => {
    const f = await built();
    expect(() => assertPublication(f.manifest, 'b'.repeat(40), pagesArtifact(), '5678')).toThrow('superseded');
    expect(() => assertPublication(f.manifest, '', pagesArtifact(), '5678')).toThrow('Missing current main');
    expect(() => assertPublication(f.manifest, identity.source, pagesArtifact(), '')).toThrow('Missing Pages artifact');
    for (const patch of [
      { id: 99 }, { name: 'pages-1234-2' }, { expired: true },
      { workflow_run: { ...pagesArtifact().workflow_run, id: 9 } },
      { workflow_run: { ...pagesArtifact().workflow_run, head_sha: 'b'.repeat(40) } },
      { workflow_run: { ...pagesArtifact().workflow_run, repository_id: 2 } },
    ]) {
      expect(() => assertPublication(f.manifest, identity.source, { ...pagesArtifact(), ...patch }, '5678')).toThrow();
    }
  });

  it('verifies every public byte without a real network request', async () => {
    const f = await built();
    const fetchImpl = vi.fn(async (url: URL) => ({
      ok: true, body: [await readFile(join(f.source, url.pathname.replace('/Dungeon-Mapper/', '')))],
    }));
    const result = await checkPublished(f.manifest, PAGES_URL, { fetchImpl, pause: async () => {} });
    expect(result.status).toBe('verified');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    await expect(checkPublished(f.manifest, 'https://other.invalid/', { fetchImpl })).rejects.toThrow('Unexpected Pages');
  });

  it('bounds stale-CDN retries and reports published-but-unverified, never a fabricated pass', async () => {
    const f = await built();
    const fetchImpl = vi.fn(async () => ({ ok: true, body: [Buffer.from('stale')] }));
    const pause = vi.fn(async () => {});
    const result = await checkPublished(f.manifest, PAGES_URL, { fetchImpl, pause });
    expect(result.status).toBe('published-but-unverified');
    expect(result.rounds).toHaveLength(3);
    expect(fetchImpl).toHaveBeenCalledTimes(9);
    expect(pause).toHaveBeenCalledTimes(2);
    expect(result.rounds.every((round: { failures: unknown[] }) => round.failures.length === 3)).toBe(true);
  });

  it('retains network errors as failed smoke evidence', async () => {
    const f = await built();
    const result = await checkPublished(f.manifest, PAGES_URL, {
      fetchImpl: async () => { throw new Error('synthetic network failure'); }, pause: async () => {},
    });
    expect(result.status).toBe('published-but-unverified');
    expect(result.rounds[0].failures[0].error).toBe('synthetic network failure');
  });

  it('rejects oversized responses without buffering the remaining body', async () => {
    const f = await built();
    let reads = 0;
    const result = await checkPublished(f.manifest, PAGES_URL, {
      attempts: 1,
      fetchImpl: async () => ({
        ok: true, body: (async function* () {
          reads++;
          yield Buffer.alloc(1024);
          reads++;
          yield Buffer.alloc(1024);
        })(),
      }),
    });
    expect(result.status).toBe('published-but-unverified');
    expect(reads).toBe(3);
    expect(result.rounds[0].failures[0].error).toContain('exceeds its qualified size');
  });
});

describe('qualification CLI', () => {
  it('creates, verifies and rejects mutated bytes with actual process exit codes', async () => {
    const f = await fixture();
    execFileSync('git', ['init', '--quiet', f.root]);
    execFileSync('git', ['-C', f.root, 'add', '.']);
    execFileSync('git', ['-C', f.root, '-c', 'user.name=Synthetic Test', '-c', 'user.email=synthetic@example.invalid',
      '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Synthetic fixture']);
    const sha = execFileSync('git', ['-C', f.root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const output = join(f.root, 'outputs');
    const env = {
      ...process.env, GITHUB_REPOSITORY: identity.repository, GITHUB_REPOSITORY_ID: identity.repositoryId,
      GITHUB_SHA: sha, GITHUB_EVENT_NAME: identity.event, GITHUB_REF: identity.ref,
      GITHUB_RUN_ID: identity.runId, GITHUB_RUN_ATTEMPT: identity.runAttempt, GITHUB_OUTPUT: output,
    };
    const create = spawnSync(process.execPath, [script, 'create', f.source, f.bundle], { cwd: f.root, env, encoding: 'utf8' });
    expect(create.status, create.stderr).toBe(0);
    const outputs = await readFile(output, 'utf8');
    const manifestHash = outputs.match(/manifest-sha256=([a-f0-9]+)/)![1];
    const verifyEnv = { ...env, EXPECTED_MANIFEST_SHA256: manifestHash };
    const run = (...args: string[]) => spawnSync(process.execPath, [script, ...args], { cwd: f.root, env: verifyEnv, encoding: 'utf8' });
    expect(run('verify', f.bundle).status).toBe(0);
    const receipt = join(f.root, 'publication', 'receipt.json');
    const metadata = join(f.root, 'pages.json');
    await writeFile(metadata, JSON.stringify({
      ...pagesArtifact(), workflow_run: { ...pagesArtifact().workflow_run, head_sha: sha },
    }));
    const publicationEnv = {
      ...verifyEnv, CURRENT_MAIN_SHA: sha, CANONICAL_ARTIFACT_ID: '111',
      PAGES_ARTIFACT_ID: '5678', PAGES_ARTIFACT_METADATA: metadata,
    };
    const publish = (mode: string, extra = {}) => spawnSync(process.execPath,
      [script, mode, f.bundle, receipt], { cwd: f.root, env: { ...publicationEnv, ...extra }, encoding: 'utf8' });
    const preflight = publish('preflight');
    expect(preflight.status, preflight.stderr).toBe(0);
    expect(JSON.parse(await readFile(receipt, 'utf8')).status).toBe('ready-to-submit');
    const failedSubmission = publish('smoke', { DEPLOY_OUTCOME: 'failure' });
    expect(failedSubmission.status).toBe(1);
    expect(JSON.parse(await readFile(receipt, 'utf8')).status).toBe('deployment-outcome-unknown');
    expect(publish('preflight').status).toBe(0);
    expect(publish('smoke', { DEPLOY_OUTCOME: 'skipped' }).status).toBe(1);
    expect(JSON.parse(await readFile(receipt, 'utf8')).status).toBe('not-published');
    expect(publish('preflight', { CURRENT_MAIN_SHA: 'b'.repeat(40) }).status).toBe(1);
    expect(JSON.parse(await readFile(receipt, 'utf8')).status).toBe('not-published');
    await writeFile(join(f.bundle, 'dist/index.html'), 'corrupt artifact');
    const failed = run('verify', f.bundle);
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain('Canonical distribution integrity failure');
  });
});
