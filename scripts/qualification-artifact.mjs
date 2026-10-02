import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFile, copyFile, lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, posix, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const MANIFEST = 'build-manifest.json';
export const PAGES_URL = 'https://evillollive.github.io/Dungeon-Mapper/';
const SHA = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;
const NUMBER = /^[1-9][0-9]*$/;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function identity(value) {
  assert(value && typeof value === 'object', 'Missing qualification identity');
  assert(/^[\w.-]+\/[\w.-]+$/.test(value.repository), 'Invalid repository');
  assert(NUMBER.test(value.repositoryId), 'Invalid repository ID');
  assert(SHA.test(value.source), 'Invalid source SHA');
  assert(['push', 'pull_request', 'workflow_dispatch'].includes(value.event), 'Unsupported qualification event');
  assert(typeof value.ref === 'string' && /^refs\/(heads|pull|tags)\//.test(value.ref), 'Invalid qualification ref');
  assert(NUMBER.test(value.runId) && NUMBER.test(value.runAttempt), 'Invalid run/attempt');
  return {
    repository: value.repository, repositoryId: value.repositoryId, source: value.source,
    event: value.event, ref: value.ref, runId: value.runId, runAttempt: value.runAttempt,
  };
}

export function environmentIdentity(env = process.env) {
  return identity({
    repository: env.GITHUB_REPOSITORY, repositoryId: env.GITHUB_REPOSITORY_ID,
    source: env.GITHUB_SHA, event: env.GITHUB_EVENT_NAME, ref: env.GITHUB_REF,
    runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT,
  });
}

function safePath(name) {
  assert(typeof name === 'string' && name.length > 0 && !isAbsolute(name) &&
    !name.includes('\\') && !/^[a-z]:/i.test(name) &&
    [...name].every(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127) &&
    posix.normalize(name) === name &&
    name.split('/').every(part => part && !['.', '..', '.git', '.github'].includes(part)),
  `Unsafe distribution path: ${JSON.stringify(name)}`);
  return name;
}

async function directory(path) {
  const stat = await lstat(path);
  assert(stat.isDirectory() && !stat.isSymbolicLink(), `Expected a real directory: ${path}`);
}

async function scan(root) {
  await directory(root);
  const files = [];
  async function walk(relative = '') {
    for (const name of (await readdir(join(root, relative))).sort()) {
      const path = safePath(relative ? `${relative}/${name}` : name);
      const full = join(root, path);
      const stat = await lstat(full);
      assert(!stat.isSymbolicLink(), `Symbolic link not permitted: ${path}`);
      if (stat.isDirectory()) await walk(path);
      else {
        assert(stat.isFile() && stat.nlink === 1, `Non-regular or hard-linked file: ${path}`);
        const bytes = await readFile(full);
        files.push({ path, size: bytes.length, sha256: hash(bytes) });
      }
    }
  }
  await walk();
  files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return files;
}

function validateManifest(value) {
  assert(value?.schemaVersion === 1, 'Unsupported build manifest');
  assert.deepEqual(value.identity, identity(value.identity), 'Unexpected identity fields');
  assert(HASH.test(value.lockfileSha256), 'Invalid lockfile hash');
  assert(typeof value.tools?.node === 'string' && typeof value.tools?.npm === 'string', 'Missing tool versions');
  assert(Array.isArray(value.files) && value.files.length > 0, 'Empty distribution manifest');
  const names = new Set();
  for (const file of value.files) {
    assert(file && typeof file === 'object', 'Invalid file descriptor');
    safePath(file.path);
    assert(!names.has(file.path), `Duplicate distribution path: ${file.path}`);
    names.add(file.path);
    assert(Number.isSafeInteger(file.size) && file.size >= 0 && HASH.test(file.sha256), 'Invalid file identity');
    assert.deepEqual(Object.keys(file).sort(), ['path', 'sha256', 'size'], 'Unexpected file fields');
  }
  assert(names.has('index.html') && names.has('service-worker.js'), 'Missing production entry or service worker');
  return value;
}

async function copyDistribution(source, destination, files) {
  // Exclusive creation avoids merging with stale or unrelated workspace files.
  await mkdir(destination);
  for (const file of files) {
    const target = join(destination, safePath(file.path));
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(source, file.path), target);
  }
  assert.deepEqual(await scan(destination), files, 'Distribution changed while copying');
}

export async function createBundle(source, destination, expected, lockfile, tools) {
  const manifest = validateManifest({
    schemaVersion: 1, identity: identity(expected), lockfileSha256: hash(await readFile(lockfile)),
    tools, files: await scan(source),
  });
  await mkdir(destination);
  await copyDistribution(source, join(destination, 'dist'), manifest.files);
  const bytes = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(join(destination, MANIFEST), bytes, { flag: 'wx' });
  return { manifest, manifestSha256: hash(bytes) };
}

export async function verifyBundle(bundle, expected, expectedHash, lockfile, usedDist) {
  assert(HASH.test(expectedHash ?? ''), 'Missing expected manifest SHA-256');
  await directory(bundle);
  assert.deepEqual((await readdir(bundle)).sort(), [MANIFEST, 'dist'].sort(), 'Unexpected bundle contents');
  const manifestPath = join(bundle, MANIFEST);
  const stat = await lstat(manifestPath);
  assert(stat.isFile() && stat.nlink === 1 && stat.size <= 1024 * 1024, 'Unsafe or oversized manifest');
  const bytes = await readFile(manifestPath);
  assert.equal(hash(bytes), expectedHash, 'Manifest digest mismatch');
  const manifest = validateManifest(JSON.parse(bytes.toString('utf8')));
  assert.deepEqual(manifest.identity, identity(expected), 'Source, repository, event or run/attempt mismatch');
  assert.equal(hash(await readFile(lockfile)), manifest.lockfileSha256, 'Checkout lockfile does not match build');
  assert.deepEqual(await scan(join(bundle, 'dist')), manifest.files, 'Canonical distribution integrity failure');
  if (usedDist) assert.deepEqual(await scan(usedDist), manifest.files, 'Tested distribution changed');
  return manifest;
}

export async function materialize(bundle, destination, expected, expectedHash, lockfile) {
  const manifest = await verifyBundle(bundle, expected, expectedHash, lockfile);
  await copyDistribution(join(bundle, 'dist'), destination, manifest.files);
  return manifest;
}

export function assertPublication(manifest, currentMain, pagesArtifact, pagesArtifactId) {
  const value = identity(manifest.identity);
  assert.equal(value.repository, 'evillollive/Dungeon-Mapper', 'Fork publication is not allowed');
  assert(value.ref === 'refs/heads/main' && ['push', 'workflow_dispatch'].includes(value.event),
    'Only a qualified main push or full main dispatch may publish');
  assert(SHA.test(currentMain ?? ''), 'Missing current main SHA');
  assert.equal(currentMain, value.source, 'Not published: candidate was superseded');
  assert(NUMBER.test(pagesArtifactId ?? ''), 'Missing Pages artifact ID');
  assert.equal(String(pagesArtifact.id), pagesArtifactId, 'Pages artifact ID mismatch');
  assert.equal(pagesArtifact.name, `pages-${value.runId}-${value.runAttempt}`, 'Pages artifact name mismatch');
  assert.equal(pagesArtifact.expired, false, 'Pages artifact expired');
  assert.equal(String(pagesArtifact.workflow_run?.id), value.runId, 'Pages artifact belongs to another run');
  assert.equal(pagesArtifact.workflow_run?.head_sha, value.source, 'Pages artifact belongs to another source');
  assert.equal(String(pagesArtifact.workflow_run?.repository_id), value.repositoryId, 'Pages artifact repository mismatch');
}

export async function checkPublished(manifest, url, {
  fetchImpl = fetch, attempts = 3, pause = () => new Promise(resolve => setTimeout(resolve, 5000)),
} = {}) {
  assert.equal(url, PAGES_URL, 'Unexpected Pages destination');
  validateManifest(manifest);
  assert(Number.isInteger(attempts) && attempts >= 1 && attempts <= 3, 'Smoke attempts must stay between one and three');
  const rounds = [];
  const deadline = AbortSignal.timeout(120_000);
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const failures = [];
    for (const file of manifest.files) {
      const target = new URL(file.path.split('/').map(encodeURIComponent).join('/'), url);
      try {
        const response = await fetchImpl(target, {
          cache: 'no-store', redirect: 'error',
          signal: AbortSignal.any([deadline, AbortSignal.timeout(10_000)]),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const chunks = [];
        let length = 0;
        if (response.body) {
          for await (const chunk of response.body) {
            length += chunk.length;
            if (length > file.size) throw new Error('Published file exceeds its qualified size');
            chunks.push(Buffer.from(chunk));
          }
        }
        const bytes = Buffer.concat(chunks);
        if (bytes.length !== file.size || hash(bytes) !== file.sha256) throw new Error('Published file digest mismatch');
      } catch (error) {
        failures.push({ path: file.path, error: error instanceof Error ? error.message : String(error) });
      }
      if (deadline.aborted) break;
    }
    rounds.push({ attempt, failures });
    if (!failures.length && !deadline.aborted) return { status: 'verified', rounds };
    if (deadline.aborted || attempt === attempts) break;
    await pause();
  }
  return { status: 'published-but-unverified', rounds };
}

async function receipt(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function assertCheckout(expected) {
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), expected.source, 'Checkout SHA mismatch');
  assert.equal(execFileSync('git', ['diff', '--name-only', 'HEAD'], { encoding: 'utf8' }).trim(), '', 'Tracked checkout changed');
}

async function main() {
  const [command, bundleOrSource, destination] = process.argv.slice(2);
  const expected = environmentIdentity();
  assertCheckout(expected);
  const lockfile = resolve('package-lock.json');
  const expectedHash = process.env.EXPECTED_MANIFEST_SHA256;
  if (command === 'create') {
    assert(bundleOrSource && destination, 'Usage: create DIST NEW_BUNDLE_DIRECTORY');
    const result = await createBundle(bundleOrSource, destination, expected, lockfile, {
      node: process.version, npm: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(),
    });
    assert(process.env.GITHUB_OUTPUT, 'Missing GitHub step output path');
    await appendFile(process.env.GITHUB_OUTPUT,
      `source-sha=${expected.source}\nmanifest-sha256=${result.manifestSha256}\n`);
  } else if (command === 'materialize') {
    assert(bundleOrSource && destination, 'Usage: materialize BUNDLE NEW_DIST_DIRECTORY');
    await materialize(bundleOrSource, destination, expected, expectedHash, lockfile);
  } else if (command === 'verify') {
    assert(bundleOrSource, 'Usage: verify BUNDLE [TESTED_DIST]');
    await verifyBundle(bundleOrSource, expected, expectedHash, lockfile, destination);
  } else if (command === 'preflight') {
    assert(bundleOrSource && destination, 'Usage: preflight BUNDLE RECEIPT_PATH');
    const value = {
      identity: expected, manifestSha256: expectedHash,
      canonicalArtifactId: process.env.CANONICAL_ARTIFACT_ID,
      pagesArtifactId: process.env.PAGES_ARTIFACT_ID,
      runUrl: `https://github.com/${expected.repository}/actions/runs/${expected.runId}`,
      observedMain: process.env.CURRENT_MAIN_SHA,
    };
    try {
      assert(NUMBER.test(value.canonicalArtifactId ?? ''), 'Missing canonical artifact ID');
      const manifest = await verifyBundle(bundleOrSource, expected, expectedHash, lockfile);
      const artifact = JSON.parse(await readFile(process.env.PAGES_ARTIFACT_METADATA, 'utf8'));
      assertPublication(manifest, value.observedMain, artifact, value.pagesArtifactId);
      await receipt(destination, { ...value, status: 'ready-to-submit' });
    } catch (error) {
      await receipt(destination, { ...value, status: 'not-published', error: error.message });
      throw error;
    }
  } else if (command === 'smoke') {
    assert(bundleOrSource && destination, 'Usage: smoke BUNDLE RECEIPT_PATH');
    const intent = JSON.parse(await readFile(destination, 'utf8'));
    assert.deepEqual(intent.identity, expected, 'Receipt identity mismatch');
    assert.equal(intent.status, 'ready-to-submit', 'Receipt is not a fresh publication intent');
    assert.equal(intent.manifestSha256, expectedHash, 'Receipt manifest mismatch');
    assert.equal(intent.canonicalArtifactId, process.env.CANONICAL_ARTIFACT_ID, 'Receipt canonical artifact mismatch');
    assert.equal(intent.pagesArtifactId, process.env.PAGES_ARTIFACT_ID, 'Receipt Pages artifact mismatch');
    if (process.env.DEPLOY_OUTCOME !== 'success') {
      const skipped = process.env.DEPLOY_OUTCOME === 'skipped';
      await receipt(destination, {
        ...intent, status: skipped ? 'not-published' : 'deployment-outcome-unknown',
        deployActionOutcome: process.env.DEPLOY_OUTCOME,
      });
      throw new Error(skipped ? 'Pages submission was skipped; nothing was published by this attempt.'
        : 'Pages action did not succeed. Resolve server-side status before another publication.');
    }
    try {
      const manifest = await verifyBundle(bundleOrSource, expected, expectedHash, lockfile);
      const result = await checkPublished(manifest, process.env.DEPLOY_PAGE_URL);
      await receipt(destination, { ...intent, ...result, pageUrl: process.env.DEPLOY_PAGE_URL, deployActionOutcome: 'success' });
      assert.equal(result.status, 'verified', 'Published files remain unverified; no automatic redeployment');
    } catch (error) {
      const latest = JSON.parse(await readFile(destination, 'utf8'));
      await receipt(destination, { ...latest, status: 'published-but-unverified', error: error.message });
      throw error;
    }
  } else throw new Error('Expected create, materialize, verify, preflight or smoke');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await main(); }
  catch (error) { console.error(`Qualification artifact: ${error.message}`); process.exitCode = 1; }
}
