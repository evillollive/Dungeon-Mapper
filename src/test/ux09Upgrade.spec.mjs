import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { preview } from 'vite';
import * as playwright from 'playwright';
import { test as base, expect } from 'playwright/test';
import { records } from './ux02Creation.browser.mjs';
import { file, fixture, library, projectId, retainCheckpoint, saved } from './ux09Library.browser.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const portable = value => JSON.parse(JSON.stringify(value));

async function buildIdentity(directory, source) {
  assert(directory && /^[a-f0-9]{40}$/.test(source ?? ''), 'Supply the build directory and its full source SHA');
  const root = resolve(directory);
  const files = {};
  async function collect(relative = '') {
    for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
      const name = join(relative, entry.name);
      if (entry.isDirectory()) await collect(name);
      else if (entry.isFile()) files[name] = digest(await readFile(join(root, name)));
      else throw new Error(`Unexpected build entry: ${name}`);
    }
  }
  await collect();
  const html = await readFile(join(root, 'index.html'), 'utf8');
  const entry = html.match(/<script[^>]+src="([^"]+)"/)?.[1];
  assert(entry?.startsWith('/Dungeon-Mapper/assets/'), 'Build must use the production Pages base');
  const app = Object.keys(files).find(name => /^assets\/App-[^.]+\.js$/.test(name));
  assert(app && files['service-worker.js'], 'Build must contain the real application and worker');
  return { root, source, entry, app, files };
}

const test = base.extend({
  context: async ({ browserName }, use, info) => {
    const profile = info.outputPath('synthetic-profile');
    await mkdir(profile, { recursive: true });
    const context = await playwright[browserName].launchPersistentContext(profile, {
      headless: true, viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce',
    });
    context.setDefaultTimeout(15_000);
    for (const page of context.pages()) await page.close();
    try { await use(context); }
    finally { await context.close(); }
  },
  versions: async ({ baseURL }, use, info) => {
    const prior = await buildIdentity(process.env.QA_PRIOR_DIST, process.env.QA_PRIOR_SHA);
    const candidate = await buildIdentity(process.env.QA_CANDIDATE_DIST ?? 'dist', process.env.QA_CANDIDATE_SHA);
    assert.notEqual(prior.source, candidate.source);
    assert.notEqual(prior.files[prior.app], candidate.files[candidate.app], 'Application bytes, not just worker comments, must differ');
    assert.notEqual(prior.files['service-worker.js'], candidate.files['service-worker.js']);
    await info.attach('build-identities', {
      body: JSON.stringify({ prior, candidate }, null, 2), contentType: 'application/json',
    });
    let server;
    const stop = async () => {
      if (!server) return;
      const current = server;
      server = undefined;
      current.httpServer.closeAllConnections();
      await new Promise((resolve, reject) => current.httpServer.close(error => error ? reject(error) : resolve()));
    };
    const serve = async build => {
      await stop();
      server = await preview({
        configFile: false, base: '/Dungeon-Mapper/', build: { outDir: build.root },
        preview: { host: '127.0.0.1', port: Number(new URL(baseURL).port), strictPort: true },
      });
      const response = await fetch(baseURL);
      assert.equal(response.status, 200);
      assert.equal(digest(Buffer.from(await response.arrayBuffer())), build.files['index.html']);
    };
    try {
      await serve(prior);
      await use({ prior, candidate, serve, stop });
    } finally { await stop(); }
  },
});

async function assertLoadedBuild(page, build) {
  await expect(page.locator('script[type="module"][src]')).toHaveAttribute('src', build.entry);
  await expect.poll(() => page.evaluate(app => performance.getEntriesByType('resource')
    .some(resource => new URL(resource.name).pathname === `/Dungeon-Mapper/${app}`), build.app)).toBe(true);
  const hashes = await page.evaluate(async paths => {
    const result = {};
    for (const path of paths) {
      const response = await fetch(`/Dungeon-Mapper/${path}`);
      if (!response.ok) throw new Error(`Loaded resource unavailable: ${path}`);
      const hash = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());
      result[path] = [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join('');
    }
    return result;
  }, [build.app, 'service-worker.js']);
  assert.equal(hashes[build.app], build.files[build.app]);
  assert.equal(hashes['service-worker.js'], build.files['service-worker.js']);
}

async function offlinePanel(page) {
  const panel = page.locator('.offline-status');
  if (await panel.getAttribute('open') === null) await panel.locator('summary').click();
  return panel;
}

async function waitForUpdate(page) {
  const panel = await offlinePanel(page);
  await panel.getByRole('button', { name: 'Check for updates', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Update saved workspace', exact: true })).toBeVisible();
}

async function applyUpdate(page, build) {
  const navigation = page.waitForEvent('load');
  await page.getByRole('button', { name: 'Update saved workspace', exact: true }).click();
  await navigation;
  await saved(page);
  await assertLoadedBuild(page, build);
}

async function rename(page, name) {
  await page.getByRole('button', { name: 'Project menu', exact: true }).click();
  await page.getByRole('button', { name: 'Project settings', exact: true }).click();
  await page.getByRole('textbox', { name: 'Project name', exact: true }).fill(name);
  await page.getByRole('button', { name: 'Close Project settings', exact: true }).click();
}

async function download(page, button, path) {
  const pending = page.waitForEvent('download');
  await button.click();
  const result = await pending;
  await result.saveAs(path);
  return JSON.parse(await readFile(path, 'utf8'));
}

async function projectBackup(page, path) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export', exact: true });
  await dialog.getByRole('button', { name: /Back up project/ }).click();
  const result = await download(page, dialog.getByRole('button', { name: 'Download private backup' }), path);
  await dialog.getByRole('button', { name: 'Close Export' }).click();
  return result;
}

const sessionSaved = page => expect(page.getByRole('status').filter({ hasText: 'Session saved on this device.' })).toBeVisible();
async function returnToEdit(page) {
  await page.getByRole('button', { name: 'Leave and resume later', exact: true }).click();
  await page.getByRole('button', { name: 'Return to Edit', exact: true }).click();
  await saved(page);
}

test('real application upgrade and rollback preserve projects, sessions and recovery', async ({ page, context, versions, baseURL }, info) => {
  const { prior, candidate, serve, stop } = versions;
  const errors = [];
  context.on('page', observed => observed.on('pageerror', error => errors.push(error.message)));
  page.on('pageerror', error => errors.push(error.message));
  const output = info.outputPath('evidence');
  await mkdir(output, { recursive: true });
  const snapshot = async name => {
    const values = await records(page);
    await writeFile(join(output, `${name}.json`), JSON.stringify(values, null, 2));
    return values;
  };

  await page.goto(baseURL);
  await assertLoadedBuild(page, prior);
  await (await offlinePanel(page)).getByText('App and built-in art cached.', { exact: true }).waitFor();
  const source = await fixture(page, 'Real-version synthetic encounter');
  source.levels[0].tokens.push({ id: 2, x: 1, y: 1, kind: 'player', label: 'Upgrade scout' });
  source.levels[0].initiative = [2, 1];
  await writeFile(join(output, 'synthetic-input.json'), file(source).buffer);
  await page.getByLabel('Import project', { exact: true }).setInputFiles(file(source));
  await page.getByRole('button', { name: 'Import as new project', exact: true }).click();
  await saved(page);
  const id = projectId(page), projectKey = `project:${id}`;
  await retainCheckpoint(page, (await records(page))[projectKey].project);
  await page.getByRole('button', { name: 'Prepare session', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await sessionSaved(page);
  const sessionURL = page.url();
  const sessionId = new URL(sessionURL).searchParams.get('session'), sessionKey = `session:${sessionId}`;
  assert(sessionId);
  await page.getByRole('button', { name: 'Move token', exact: true }).click();
  await page.getByLabel('Session token').selectOption('2');
  await page.getByLabel('Cell X', { exact: true }).fill('3');
  await page.getByLabel('Cell Y', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Apply to cell', exact: true }).click();
  await sessionSaved(page);
  await page.getByLabel('Checkpoint name').fill('Before version change');
  await page.getByRole('button', { name: 'Save checkpoint', exact: true }).click();
  await sessionSaved(page);
  const originalSession = (await records(page))[sessionKey];
  assert.equal(originalSession.checkpoints.length, 1);
  assert.equal(originalSession.progress.project.levels[0].tokens.find(token => token.id === 2).x, 3);
  assert.deepEqual(await download(page, page.getByRole('button', { name: 'Download session recovery' }),
    join(output, 'prior-session-recovery.json')), portable(originalSession));
  await returnToEdit(page);
  await serve(candidate);
  await waitForUpdate(page);
  await expect(page.locator('script[type="module"][src]')).toHaveAttribute('src', prior.entry);

  // Reuse UX-08's native transaction hold, now across genuinely different bundles.
  await page.evaluate(id => {
    const put = IDBObjectStore.prototype.put;
    window.restoreUpgradeWrite = () => { IDBObjectStore.prototype.put = put; };
    IDBObjectStore.prototype.put = function (value, key) {
      const request = put.call(this, value, key);
      if (key === `project:${id}`) {
        let released = false;
        window.releaseUpgradeWrite = () => { released = true; };
        const keepAlive = () => {
          if (!released) this.get('upgrade-keepalive').onsuccess = keepAlive;
        };
        request.addEventListener('success', keepAlive);
      }
      return request;
    };
  }, id);
  let navigations = 0;
  const navigated = frame => { if (frame === page.mainFrame()) navigations++; };
  page.on('framenavigated', navigated);
  try {
    await rename(page, 'Latest edit before real upgrade');
    await page.waitForFunction(() => typeof window.releaseUpgradeWrite === 'function');
    await page.getByRole('button', { name: 'Update saved workspace', exact: true }).click();
    await page.getByText(/Wait until this project is saved before updating/).waitFor();
    assert.equal(navigations, 0);
    await expect(page.locator('script[type="module"][src]')).toHaveAttribute('src', prior.entry);
  } finally {
    await page.evaluate(() => { window.releaseUpgradeWrite?.(); window.restoreUpgradeWrite(); });
    page.off('framenavigated', navigated);
  }
  await saved(page);
  const beforeUpgrade = await snapshot('before-upgrade');
  assert.equal(beforeUpgrade[projectKey].project.name, 'Latest edit before real upgrade');
  assert.deepEqual(beforeUpgrade[sessionKey], originalSession);
  const priorBackup = await projectBackup(page, join(output, 'prior-project-backup.json'));
  assert.deepEqual(priorBackup.project, portable(beforeUpgrade[projectKey].project));
  await applyUpdate(page, candidate);
  assert.equal(projectId(page), id);
  assert.deepEqual(await snapshot('after-upgrade'), beforeUpgrade, 'Activation/reload must not mutate durable records');
  const candidateBackup = await projectBackup(page, join(output, 'candidate-project-backup.json'));
  assert.deepEqual(candidateBackup, priorBackup);
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toContainText('not a remote share link');
  await page.getByRole('button', { name: 'Close keyboard shortcuts' }).click();

  await page.goto(sessionURL);
  await sessionSaved(page);
  assert.deepEqual((await records(page))[sessionKey], originalSession);
  await page.getByRole('button', { name: 'Next turn', exact: true }).click();
  await sessionSaved(page);
  const progressed = (await records(page))[sessionKey];
  assert.equal(progressed.progress.turn, 1);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Restore checkpoint', exact: true }).click();
  await sessionSaved(page);
  const restored = (await records(page))[sessionKey];
  assert.deepEqual(restored.progress, originalSession.checkpoints[0].progress);
  assert.deepEqual(restored.endCheckpoint, progressed.progress);
  assert.deepEqual(restored.sourceCheckpoint, originalSession.sourceCheckpoint);
  assert.deepEqual((await records(page))[projectKey], beforeUpgrade[projectKey]);
  assert.deepEqual(await download(page, page.getByRole('button', { name: 'Download session recovery' }),
    join(output, 'candidate-session-recovery.json')), portable(restored));
  await returnToEdit(page);
  await rename(page, 'Candidate work retained through rollback');
  await saved(page);
  const beforeRollback = await snapshot('before-rollback');
  assert.deepEqual(beforeRollback[projectKey].project, { ...beforeUpgrade[projectKey].project, name: 'Candidate work retained through rollback' });
  await serve(prior);
  await waitForUpdate(page);
  await applyUpdate(page, prior);
  assert.deepEqual(await snapshot('after-rollback'), beforeRollback, 'Rollback must preserve newer work and both recovery histories');
  await rename(page, 'Edited after rollback');
  await saved(page);
  const rollbackRecords = await snapshot('rollback-write');
  assert.deepEqual(rollbackRecords[projectKey].project, { ...beforeRollback[projectKey].project, name: 'Edited after rollback' });
  assert.deepEqual(rollbackRecords[`recovery:${id}`], beforeRollback[`recovery:${id}`]);
  assert.deepEqual(rollbackRecords[sessionKey], beforeRollback[sessionKey]);
  const rollbackBackup = await projectBackup(page, join(output, 'rollback-project-backup.json'));
  assert.deepEqual(rollbackBackup.project, portable(rollbackRecords[projectKey].project));

  await page.goto(sessionURL);
  await sessionSaved(page);
  await page.getByRole('button', { name: 'Next turn', exact: true }).click();
  await sessionSaved(page);
  const afterSessionWrite = (await records(page))[sessionKey];
  assert.deepEqual(afterSessionWrite.progress, { ...restored.progress, turn: 1 });
  assert.deepEqual(afterSessionWrite.sourceCheckpoint, originalSession.sourceCheckpoint);
  assert.deepEqual(afterSessionWrite.checkpoints, restored.checkpoints);
  assert.deepEqual(afterSessionWrite.endCheckpoint, restored.endCheckpoint);
  await returnToEdit(page);
  await library(page);
  await page.getByLabel('Import project', { exact: true }).setInputFiles(join(output, 'rollback-project-backup.json'));
  await page.getByRole('button', { name: 'Import as new project', exact: true }).click();
  await saved(page);
  const copyId = projectId(page);
  assert(copyId && copyId !== id);
  const afterImport = await snapshot('reimported-backup');
  assert.deepEqual(afterImport[`project:${copyId}`].project, rollbackRecords[projectKey].project);
  assert.deepEqual(afterImport[projectKey].project, rollbackRecords[projectKey].project);
  assert.deepEqual(afterImport[sessionKey], afterSessionWrite);

  await (await offlinePanel(page)).getByText('App and built-in art cached.', { exact: true }).waitFor();
  await stop();
  await assert.rejects(fetch(baseURL));
  await page.reload();
  await saved(page);
  assert.equal(projectId(page), copyId);
  assert.deepEqual(await snapshot('offline-after-rollback'), afterImport);
  assert.deepEqual(errors, []);
  await info.attach('upgrade-results', {
    body: JSON.stringify({
      prior: prior.source, candidate: candidate.source, engine: info.project.name,
      harnessSource: process.env.QA_SOURCE_SHA ?? 'working tree',
      browserVersion: context.browser().version(), projectId: id, copyId, sessionId,
      pendingWriteBlockedUpdate: true, upgradeRecordEquality: true, rollbackRecordEquality: true,
      candidateCheckpointRecovery: true, rollbackWritesPreservedContent: true, stoppedOriginReload: true,
      schemaChanged: false, releaseAcceptance: false,
    }, null, 2), contentType: 'application/json',
  });
});
