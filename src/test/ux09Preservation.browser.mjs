import assert from 'node:assert/strict';
import { expect } from 'playwright/test';
import { records } from './ux02Creation.browser.mjs';
import { backup, card, file, fixture, landing, library, manage, projectId, retainCheckpoint, saved } from './ux09Library.browser.mjs';

const migrationKey = 'project-migration-v1';
const legacyKey = 'dungeon-mapper-autosave';
const projectKeys = values => Object.keys(values).filter(key => key.startsWith('project:')).sort();
const details = page => page.getByRole('region', { name: 'Device save and recovery', exact: true });
const failed = page => details(page).getByRole('status').filter({ hasText: 'Could not restore your project' }).waitFor();
const root = page => new URL('./', page.url()).href;

// Only synthetic records in the runner's disposable context are seeded directly.
// All migration, deletion, switching and recovery operations use production UI.
async function writeRecords(page, values, deleted = []) {
  await page.evaluate(({ values, deleted }) => new Promise((resolve, reject) => {
    const request = indexedDB.open('dungeon-mapper', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('maps');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('maps', 'readwrite');
      const store = tx.objectStore('maps');
      for (const [key, value] of Object.entries(values)) store.put(value, key);
      for (const key of deleted) store.delete(key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }), { values, deleted });
}

async function park(page) {
  const url = new URL('preservation-seed.html', root(page)).href;
  await page.route(url, route => route.fulfill({
    contentType: 'text/html', body: '<title>Disposable preservation fixture</title>',
  }));
  await page.goto(url);
}

async function legacyFixture(page) {
  const url = root(page);
  const original = await fixture(page, 'Migrated crypt');
  const bytes = ` \n${JSON.stringify({ ...original, name: 'Lower priority legacy' })}\n`;
  await park(page);
  await writeRecords(page, { autosave: original });
  await page.evaluate(({ key, bytes }) => localStorage.setItem(key, bytes), { key: legacyKey, bytes });
  return { url, original, bytes };
}

async function assertSources(page, original, bytes) {
  assert.deepEqual((await records(page)).autosave, original, 'IndexedDB migration source must remain exact');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), legacyKey), bytes, 'Legacy whitespace and bytes must remain exact');
}

async function openMigrated(page, url, name) {
  await landing(page, url);
  await card(page, name).getByRole('button', { name: /^(Open|Continue) / }).click();
  await saved(page);
  const id = projectId(page);
  assert(id);
  return id;
}

async function concurrentMigration(page) {
  const { url, original, bytes } = await legacyFixture(page);
  const other = await page.context().newPage();
  // Two real startup readers share the same IndexedDB transaction boundary.
  await Promise.all([landing(page, url), landing(other, url)]);
  const values = await records(page);
  const id = values[migrationKey];
  assert.equal(typeof id, 'string');
  assert.deepEqual(projectKeys(values), [`project:${id}`], 'Concurrent startup must allocate exactly one local identity');
  assert.deepEqual(values[`project:${id}`].project, original, 'IndexedDB must win over localStorage');
  assert.equal(projectId(page), id);
  assert.equal(projectId(other), id);
  assert.deepEqual(await records(other), values);
  await page.reload();
  await saved(page);
  await landing(page, url);
  assert.deepEqual(await records(page), values, 'Repeated startup must not rewrite the migrated record or revision');
  await assertSources(page, original, bytes);
  return { id, startupTabs: 2, projectCount: 1, precedence: 'IndexedDB', exactSourcesRetained: 2 };
}

async function bareMapMigration(page) {
  const url = root(page);
  const rich = await fixture(page, 'Legacy map assets');
  const original = { ...rich.levels[0], customThemes: rich.customThemes, customStamps: rich.customStamps, sceneTemplates: rich.sceneTemplates };
  const bytes = `\n ${JSON.stringify(original)} \n`;
  await park(page);
  await page.evaluate(({ key, bytes }) => localStorage.setItem(key, bytes), { key: legacyKey, bytes });
  const id = await openMigrated(page, url, original.meta.name);
  const values = await records(page);
  assert.deepEqual(projectKeys(values), [`project:${id}`]);
  assert.equal(values[migrationKey], id);
  assert.deepEqual(values[`project:${id}`].project, {
    name: original.meta.name, levels: [original], activeLevelIndex: 0, stairLinks: [],
    customThemes: rich.customThemes, customStamps: rich.customStamps, sceneTemplates: rich.sceneTemplates,
  });
  await library(page);
  const exported = await backup(page, card(page, original.meta.name).getByRole('button', { name: 'Export backup', exact: true }));
  assert.deepEqual(exported.project, values[`project:${id}`].project);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Refresh library', exact: true })).toBeEnabled();
  assert.deepEqual(await records(page), values);
  assert.deepEqual(projectKeys(await records(page)), [`project:${id}`]);
  await assertSources(page, undefined, bytes);
  return { id, source: 'localStorage bare map', embeddedAssetsRetained: true, privateDownloadMatches: true };
}

async function migrationAbort(page) {
  const { url, original, bytes } = await legacyFixture(page);
  await page.addInitScript(key => {
    const add = IDBObjectStore.prototype.add;
    window.migrationAborts = 0;
    window.restoreMigrationFault = () => { IDBObjectStore.prototype.add = add; };
    IDBObjectStore.prototype.add = function (value, recordKey) {
      const request = add.call(this, value, recordKey);
      if (recordKey === key && !sessionStorage.getItem('migration-fault-used')) {
        sessionStorage.setItem('migration-fault-used', 'true');
        window.migrationAborts++;
        this.transaction.abort();
      }
      return request;
    };
  }, migrationKey);
  try {
    await page.goto(url);
    await failed(page);
    assert.equal(await page.evaluate(() => window.migrationAborts), 1, 'Fault must occur after both migration adds were queued');
    assert.deepEqual(await records(page), { autosave: original }, 'Abort must roll back both the project and marker');
    await assertSources(page, original, bytes);
    await expect(page.locator('#dm-canvas-area')).toHaveCount(0);
    assert.deepEqual(await backup(page, details(page).getByRole('button', { name: 'Download original', exact: true })), original);
  } finally {
    await page.evaluate(() => window.restoreMigrationFault());
  }
  await details(page).getByRole('button', { name: 'Retry restore', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Refresh library', exact: true })).toBeEnabled();
  const values = await records(page);
  const id = values[migrationKey];
  assert.deepEqual(projectKeys(values), [`project:${id}`]);
  assert.deepEqual(values[`project:${id}`].project, original);
  await page.reload();
  await saved(page);
  await landing(page, url);
  assert.deepEqual(await records(page), values);
  await assertSources(page, original, bytes);
  return { id, fault: 'Native migration transaction abort after queued adds', retryIsIdempotent: true };
}

async function recoveryPreview(page, project) {
  await details(page).getByRole('button', { name: 'Recovery copies', exact: true }).click();
  await details(page).getByLabel('Preview a recovery file', { exact: true }).setInputFiles(file(project));
  await details(page).getByRole('region', { name: 'Recovery preview', exact: true }).waitFor();
}

async function recover(page) {
  await details(page).getByRole('button', { name: 'Restore whole project', exact: true }).click();
}

async function legacyRecovery(page, source) {
  const url = root(page);
  const candidate = await fixture(page, 'Recovered legacy crypt');
  const original = { schemaVersion: 999, retainedSource: { private: ['keep', 42] } };
  const bytes = ` \n${JSON.stringify(source === 'localStorage' ? original : { retained: 'lower-priority bytes' })}\n`;
  await park(page);
  if (source === 'IndexedDB') await writeRecords(page, { autosave: original });
  await page.evaluate(({ key, bytes }) => localStorage.setItem(key, bytes), { key: legacyKey, bytes });
  await page.goto(url);
  await failed(page);
  const before = await records(page);
  const download = await backup(page, details(page).getByRole('button', { name: 'Download original', exact: true }));
  assert.deepEqual(download, original);
  await recoveryPreview(page, candidate);
  await details(page).getByRole('button', { name: 'Cancel preview', exact: true }).click();
  assert.deepEqual(await records(page), before, 'Cancelled failed-startup recovery must not write');
  await details(page).getByLabel('Preview a recovery file', { exact: true }).setInputFiles(file(candidate));
  await recover(page);
  await expect(details(page).getByRole('status')).toContainText('Saved on this device');
  const values = await records(page);
  const id = values[migrationKey];
  assert.equal(projectId(page), id);
  assert.deepEqual(projectKeys(values), [`project:${id}`]);
  expect(values[`project:${id}`].project).toMatchObject(candidate);
  await details(page).getByRole('button', { name: 'Recovery copies', exact: true }).click();
  const reason = source === 'IndexedDB' ? 'Original single autosave' : 'Original localStorage bytes';
  const retained = details(page).locator('.recovery-entry').filter({ hasText: reason });
  await expect(retained).toHaveCount(1);
  assert.deepEqual(await backup(page, retained.getByRole('button', { name: /Download copy/ })), original);
  await page.reload();
  await saved(page);
  assert.deepEqual((await records(page))[`project:${id}`], values[`project:${id}`]);
  await assertSources(page, source === 'IndexedDB' ? original : undefined, bytes);
  return { id, source, cancellationWrites: 0, originalDownloadableAfterRecovery: true };
}

async function deletionTombstone(page) {
  const { url, original, bytes } = await legacyFixture(page);
  const id = await openMigrated(page, url, original.name);
  await retainCheckpoint(page, original);
  await library(page);
  page.once('dialog', dialog => dialog.accept());
  await manage(page, original.name, 'Move to Trash');
  await card(page, original.name).waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Trash', exact: true }).click();
  const before = await records(page);
  assert(before[`previous:${id}`] && before[`recovery:${id}`]?.length === 1);
  await page.evaluate(key => {
    const put = IDBObjectStore.prototype.put;
    window.tombstoneFaults = 0;
    window.restoreTombstoneFault = () => { IDBObjectStore.prototype.put = put; };
    IDBObjectStore.prototype.put = function (value, recordKey) {
      const request = put.call(this, value, recordKey);
      if (recordKey === key && value === 'deleted') {
        window.tombstoneFaults++;
        this.transaction.abort();
      }
      return request;
    };
  }, migrationKey);
  try {
    page.once('dialog', dialog => dialog.accept());
    await manage(page, original.name, 'Delete permanently');
    await page.getByRole('alert').filter({ hasText: /abort|commit/i }).waitFor();
    assert.equal(await page.evaluate(() => window.tombstoneFaults), 1);
    assert.deepEqual(await records(page), before, 'Tombstone failure must roll back all three deletions');
    await expect(card(page, original.name)).toHaveCount(1);
  } finally {
    await page.evaluate(() => window.restoreTombstoneFault());
  }
  page.once('dialog', dialog => dialog.accept());
  await manage(page, original.name, 'Delete permanently');
  await card(page, original.name).waitFor({ state: 'detached' });
  await expect(details(page).getByRole('status')).toContainText('Not saved yet');
  assert.equal(projectId(page), null);
  const exported = await backup(page, details(page).getByRole('button', { name: 'Export backup', exact: true }));
  expect(exported.project).toMatchObject(original);
  const verify = async () => {
    const values = await records(page);
    assert.deepEqual(projectKeys(values), [], 'Retained legacy sources must not resurrect deleted work');
    assert.equal(values[migrationKey], 'deleted');
    for (const prefix of ['project', 'previous', 'recovery']) assert.equal(values[`${prefix}:${id}`], undefined);
    await assertSources(page, original, bytes);
  };
  // Deliberately exceed the 500 ms autosave window before testing fresh startup.
  await page.waitForTimeout(1200);
  await verify();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Refresh library', exact: true })).toBeEnabled();
  await verify();
  await landing(page, url);
  await page.getByRole('heading', { name: 'A new adventure starts here', exact: true }).waitFor();
  await verify();
  return { id, abortedDeletionsRolledBack: 3, tombstone: 'deleted', rootAndLibraryReloadPreserved: true };
}

async function failedFixture(page) {
  const url = root(page);
  const candidate = await fixture(page, 'Recovered selected crypt');
  const id = 'failed-source';
  const original = { schemaVersion: 999, localProjectId: id, storageRevision: 'unsupported-revision', retainedSource: { private: ['exact', 42] } };
  await park(page);
  await writeRecords(page, { [`project:${id}`]: original });
  await page.goto(`${url}?project=${id}`);
  await failed(page);
  await expect(page.locator('#dm-canvas-area')).toHaveCount(0);
  return { url, id, original, candidate };
}

async function failedRecoveryQuota(page) {
  const { id, original, candidate } = await failedFixture(page);
  const before = await records(page);
  await recoveryPreview(page, candidate);
  await page.evaluate(id => {
    const put = IDBObjectStore.prototype.put;
    window.recoveryFaults = 0;
    window.restoreRecoveryFault = () => { IDBObjectStore.prototype.put = put; };
    IDBObjectStore.prototype.put = function (value, key) {
      if (key === `recovery:${id}`) {
        window.recoveryFaults++;
        throw new DOMException('Injected recovery quota failure', 'QuotaExceededError');
      }
      return put.call(this, value, key);
    };
  }, id);
  try {
    for (let attempt = 1; attempt <= 2; attempt++) {
      await recover(page);
      await failed(page);
      await details(page).getByRole('alert').filter({ hasText: 'Injected recovery quota failure' }).waitFor();
      assert.equal(await page.evaluate(() => window.recoveryFaults), attempt);
      assert.deepEqual(await records(page), before, 'Quota failure must roll back the project, predecessor and checkpoint together');
      assert.equal(projectId(page), id);
      await expect(page.locator('#dm-canvas-area')).toHaveCount(0);
    }
    assert.deepEqual(await backup(page, details(page).getByRole('button', { name: 'Download original', exact: true })), original);
  } finally {
    await page.evaluate(() => window.restoreRecoveryFault());
  }
  await recover(page);
  await saved(page);
  const values = await records(page);
  assert.equal(projectId(page), id);
  expect(values[`project:${id}`].project).toMatchObject(candidate);
  assert.deepEqual(values[`previous:${id}`].data, original);
  assert.equal(values[`recovery:${id}`].length, 1);
  assert.deepEqual(values[`recovery:${id}`][0].data, original);
  await page.reload();
  await saved(page);
  assert.deepEqual(await records(page), values);
  return { id, failedAttempts: 2, fault: 'QuotaExceededError during native checkpoint put', identityPreserved: true, originalCheckpoints: 1 };
}

async function competingRecovery(page) {
  const { url, id, original, candidate } = await failedFixture(page);
  const other = await page.context().newPage();
  await other.goto(`${url}?project=${id}`);
  await failed(other);
  await recoveryPreview(page, candidate);
  await recoveryPreview(other, { ...candidate, name: 'Newer winning recovery' });
  await page.evaluate(id => {
    const get = IDBObjectStore.prototype.get;
    window.recoveryReadHeld = false;
    window.releaseRecoveryRead = undefined;
    window.restoreRecoveryRead = () => {
      IDBObjectStore.prototype.get = get;
      window.releaseRecoveryRead?.();
    };
    IDBObjectStore.prototype.get = function (key) {
      const request = get.call(this, key);
      if (key === `recovery:${id}` && !window.recoveryReadHeld && this.transaction.mode === 'readonly') {
        const tx = this.transaction;
        // Delay delivery, not the native transaction, so a second tab can commit.
        tx.addEventListener('complete', event => {
          event.stopImmediatePropagation();
          window.recoveryReadHeld = true;
          window.releaseRecoveryRead = () => {
            window.releaseRecoveryRead = undefined;
            tx.oncomplete.call(tx, event);
          };
        }, { once: true });
      }
      return request;
    };
  }, id);
  try {
    await recover(page);
    await page.waitForFunction(() => window.recoveryReadHeld);
    await expect(details(page).getByRole('status')).toContainText('Opening project safely');
    await expect(page.locator('#dm-canvas-area')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Your maps', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Switch project', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Open / })).toBeDisabled();
    await page.keyboard.press('g');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    assert.equal(projectId(page), id);
    await recover(other);
    await saved(other);
    const winning = await records(other);
    await page.evaluate(() => window.releaseRecoveryRead());
    await failed(page);
    await details(page).getByRole('alert').filter({ hasText: 'The saved source changed during recovery.' }).waitFor();
    assert.deepEqual(await records(page), winning, 'A stale recovery must not overwrite newer content or add a checkpoint');
    await expect(page.locator('#dm-canvas-area')).toHaveCount(0);
    assert.deepEqual(await backup(page, details(page).getByRole('button', { name: 'Download original', exact: true })), original);
    await details(page).getByRole('button', { name: 'Retry restore', exact: true }).click();
    await saved(page);
    assert.equal(projectId(page), id);
    assert.deepEqual(await records(page), winning);
    assert.equal(winning[`project:${id}`].project.name, 'Newer winning recovery');
    assert.equal(winning[`recovery:${id}`].length, 1);
    assert.deepEqual(winning[`recovery:${id}`][0].data, original);
  } finally {
    // Navigation removes the page-scoped interception; release it on failure.
    await page.evaluate(() => window.restoreRecoveryRead?.());
  }
  return { id, heldNativeRead: true, competingStartupActionsBlocked: true, winningRecoveryPreserved: true };
}

async function unavailableAlternative(page, kind) {
  const url = root(page);
  const healthy = await fixture(page, 'Healthy alternative');
  const original = { schemaVersion: 999, retainedSource: 'Unavailable source' };
  await park(page);
  const envelope = (id, name) => ({ schemaVersion: 1, localProjectId: id, storageRevision: `${id}-revision`, project: { ...healthy, name } });
  await writeRecords(page, {
    'project:b': envelope('b', 'Disappearing alternative'), 'project:c': envelope('c', healthy.name),
    ...(kind === 'corrupt' ? { 'project:a': original } : {}),
  });
  await page.goto(`${url}?project=a`);
  await failed(page);
  await expect(page.locator('#dm-canvas-area')).toHaveCount(0);
  await page.getByRole('button', { name: 'Switch project', exact: true }).click();
  await page.getByRole('button', { name: 'Open Disappearing alternative', exact: true }).waitFor();
  await writeRecords(page, {}, ['project:b']);
  const before = await records(page);
  await page.getByRole('button', { name: 'Open Disappearing alternative', exact: true }).click();
  await page.getByRole('region', { name: 'Local projects', exact: true }).getByRole('alert')
    .filter({ hasText: 'The selected project record is missing. No blank replacement has been opened.' }).waitFor();
  await failed(page);
  await expect(page.locator('#dm-canvas-area')).toHaveCount(0);
  assert.equal(projectId(page), 'a');
  assert.deepEqual(await records(page), before);
  await page.getByRole('button', { name: `Open ${healthy.name}`, exact: true }).click();
  await saved(page);
  assert.equal(projectId(page), 'c');
  assert.deepEqual(await records(page), before, 'Opening a healthy alternative must not replace the unavailable source');
  await page.reload();
  await saved(page);
  assert.deepEqual(await records(page), before);
  return { kind, failedSwitchWrites: 0, healthyProjectReopened: 'c', originalPreserved: true };
}

export default [
  ['A-DATA: concurrent legacy migration preserves sources and identity', concurrentMigration],
  ['A-DATA: localStorage bare-map migration retains embedded assets', bareMapMigration],
  ['A-DATA: aborted migration rolls back and retries idempotently', migrationAbort],
  ...['IndexedDB', 'localStorage'].map(source => [`A-DATA: unsupported ${source} legacy recovery retains its original`, page => legacyRecovery(page, source)]),
  ['A-DATA: deletion tombstone is atomic and prevents resurrection', deletionTombstone],
  ['A-DATA: failed-startup quota recovery preserves identity and checkpoints', failedRecoveryQuota],
  ['A-DATA: competing failed-startup recovery preserves newer work', competingRecovery],
  ...['missing', 'corrupt'].map(kind => [`A-DATA: ${kind} startup source survives failed alternative loading`, page => unavailableAlternative(page, kind)]),
];
