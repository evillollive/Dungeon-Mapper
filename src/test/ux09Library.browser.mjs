import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { expect } from 'playwright/test';
import { records } from './ux02Creation.browser.mjs';

export { backup, card, file, fixture, landing, library, manage, projectId, retainCheckpoint, saved };

const projectId = page => new URL(page.url()).searchParams.get('project');
const card = (page, name) => page.getByRole('article', { name, exact: true });
const saved = page => page.getByRole('button', { name: 'Save health & recovery', exact: true })
  .getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
const record = async (page, id) => (await records(page))[`project:${id}`];
const projectKeys = values => Object.keys(values).filter(key => key.startsWith('project:')).sort();
const ownedRecords = (values, id) => Object.fromEntries(
  ['project', 'previous', 'recovery'].map(prefix => [`${prefix}:${id}`, values[`${prefix}:${id}`]]),
);
const file = project => ({
  name: 'library-recovery.json', mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, project })),
});

async function landing(page, url = new URL('./?view=library', page.url()).href) {
  await page.goto(url);
  await page.getByRole('heading', { name: 'Your maps', exact: true }).waitFor();
  await expect(page.getByRole('button', { name: 'Refresh library', exact: true })).toBeEnabled();
}

async function library(page) {
  await page.getByRole('button', { name: 'Your maps', exact: true }).click();
  await page.getByRole('heading', { name: 'Your maps', exact: true }).waitFor();
  await expect(page.getByRole('button', { name: 'Refresh library', exact: true })).toBeEnabled();
}

async function manage(page, name, action) {
  const item = card(page, name);
  if (await item.locator('details').getAttribute('open') === null) await item.locator('summary').click();
  await item.getByRole('button', { name: action, exact: true }).click();
}

async function metadata(page, name, nextName, tags) {
  await manage(page, name, 'Rename and tags');
  await page.getByLabel('Project title', { exact: true }).fill(nextName);
  await page.getByLabel('Tags, separated by commas', { exact: true }).fill(tags);
  await page.getByRole('button', { name: 'Save name and tags', exact: true }).click();
}

async function renameEditor(page, name) {
  await page.getByRole('button', { name: 'Project menu', exact: true }).click();
  await page.getByRole('button', { name: 'Project settings', exact: true }).click();
  await page.getByRole('textbox', { name: 'Project name', exact: true }).fill(name);
  await page.getByRole('button', { name: 'Close Project settings', exact: true }).click();
}

async function saveDetails(page) {
  await page.locator('[data-action="file.recovery"]').filter({ visible: true }).first().click();
  return page.getByRole('region', { name: 'Device save and recovery', exact: true });
}

async function backup(page, button) {
  const download = page.waitForEvent('download');
  await button.click();
  const result = await download;
  return JSON.parse(await readFile(await result.path(), 'utf8'));
}

async function importProject(page, project) {
  await page.getByLabel('Import project', { exact: true }).setInputFiles(file(project));
  await page.getByRole('button', { name: 'Import as new project', exact: true }).click();
  await saved(page);
  const id = projectId(page);
  assert(id, 'Import must allocate a local identity');
  await expect.poll(async () => (await record(page, id))?.project.name).toBe(project.name);
  return id;
}

async function fixture(page, name) {
  const response = await page.request.get(new URL('pwa-192x192.png', page.url()).href);
  assert(response.ok(), 'Bundled fixture image must load');
  const image = `data:image/png;base64,${(await response.body()).toString('base64')}`;
  const levels = ['Upper crypt', 'Lower crypt'].map((title, index) => ({
    meta: { name: title, width: 8, height: 8, tileSize: 20, theme: 'dungeon' },
    tiles: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ({ type: 'floor' }))),
    fogEnabled: true,
    fog: Array.from({ length: 8 }, () => Array(8).fill(false)),
    notes: [{ id: 1, x: 1, y: 1, label: 'Private fixture note', description: 'Keep this content', visibility: 'private' }],
    tokens: [{ id: 1, x: 2, y: 2, kind: 'monster', label: 'Hidden fixture', hidden: true, size: 1, color: '#123456' }],
    initiative: [1],
    stamps: [{ id: 1, stampId: 'library-image', x: 4, y: 4, rotation: 45, scale: 0.5, opacity: 0.7, locked: true, flipX: true, flipY: false }],
    backgroundImage: { dataUrl: image, offsetX: 0, offsetY: 0, scale: 0.5, opacity: 0.25 },
    qaExtension: { index, nested: ['retain', 42] },
  }));
  return {
    name, id: 'portable-provenance', levels, activeLevelIndex: 0,
    stairLinks: [{ fromLevel: 0, fromCell: { x: 3, y: 3 }, toLevel: 1, toCell: { x: 3, y: 3 } }],
    customThemes: [{ id: 'custom-theme:library', name: 'Library stone', baseThemeId: 'dungeon', gridColor: '#111111',
      tileColors: { floor: '#445566' }, tileLabels: { floor: 'Stone' },
      customTiles: [{ id: 'custom:library', label: 'Moss', color: '#337744', baseType: 'floor', imageDataUrl: image }] }],
    customStamps: [{ id: 'library-image', name: 'Library image', category: 'custom', viewBox: '0 0 192 192', imageDataUrl: image }],
    sceneTemplates: [{ id: 'library-template', name: 'Library room', width: 8, height: 8, createdAt: '2026-09-15T00:00:00Z',
      tiles: levels[0].tiles, notes: levels[0].notes, stamps: levels[0].stamps }],
    qaExtension: { retained: true },
  };
}

async function retainCheckpoint(page, project) {
  const id = projectId(page);
  const before = await record(page, id);
  const details = await saveDetails(page);
  await details.getByRole('button', { name: 'Recovery copies', exact: true }).click();
  await details.getByLabel('Preview a recovery file', { exact: true }).setInputFiles(file(project));
  await details.getByRole('button', { name: 'Restore whole project', exact: true }).click();
  await expect.poll(async () => (await records(page))[`recovery:${id}`]?.length).toBe(1);
  await saved(page);
  assert.deepEqual((await records(page))[`recovery:${id}`][0].data, before);
  await page.getByRole('button', { name: 'Close save details', exact: true }).click();
}

async function duplicateIsolation(page) {
  await landing(page);
  const id = await importProject(page, await fixture(page, 'Library source'));
  const original = (await record(page, id)).project;
  assert.equal(original.levels.length, 2);
  assert.equal(original.id, 'portable-provenance');
  assert.deepEqual(original.qaExtension, { retained: true });
  assert.equal(original.customThemes.length, 1);
  assert.equal(original.customStamps.length, 1);
  assert.equal(original.sceneTemplates.length, 1);
  await retainCheckpoint(page, original);
  await library(page);
  await metadata(page, original.name, original.name, ' campaign , campaign, GM');
  await expect.poll(async () => (await record(page, id)).library.tags).toEqual(['campaign', 'GM']);
  await page.getByRole('searchbox').fill('CAMPAIGN');
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('searchbox').fill('');
  const before = ownedRecords(await records(page), id);
  await manage(page, original.name, 'Duplicate');
  await saved(page);
  const copyId = projectId(page);
  assert(copyId && copyId !== id);
  const values = await records(page);
  const copy = values[`project:${copyId}`];
  assert.equal(copy.localProjectId, copyId);
  assert.notEqual(copy.storageRevision, before[`project:${id}`].storageRevision);
  assert.deepEqual(copy.project, { ...original, name: `${original.name} (copy)` });
  assert.deepEqual(copy.library.tags, ['campaign', 'GM']);
  assert.equal(copy.library.status, 'active');
  assert.equal(values[`previous:${copyId}`], undefined);
  assert.equal(values[`recovery:${copyId}`], undefined);
  await renameEditor(page, 'Edited independent copy');
  await expect.poll(async () => (await record(page, copyId)).project.name).toBe('Edited independent copy');
  await saved(page);
  await library(page);
  await metadata(page, 'Edited independent copy', 'Edited independent copy', 'copy-only');
  await expect.poll(async () => (await record(page, copyId)).library.tags).toEqual(['copy-only']);
  const exported = await backup(page, card(page, 'Edited independent copy').getByRole('button', { name: 'Export backup', exact: true }));
  assert.deepEqual(exported.project, { ...original, name: 'Edited independent copy' });
  assert.equal(exported.localProjectId, undefined);
  assert.deepEqual(ownedRecords(await records(page), id), before, 'Copy edits must preserve source and recovery records exactly');
  return { id, copyId, richBackupEquality: true, retainedSourceCheckpoints: 1, copiedCheckpoints: 0 };
}

async function collections(page) {
  await landing(page);
  const otherId = await importProject(page, await fixture(page, 'Untouched neighbor'));
  await library(page);
  const id = await importProject(page, await fixture(page, 'Restorable map'));
  const project = (await record(page, id)).project;
  await retainCheckpoint(page, project);
  await library(page);
  await metadata(page, project.name, project.name, 'retained');
  await expect.poll(async () => (await record(page, id)).library.tags).toEqual(['retained']);
  const before = await records(page);
  assert(before[`previous:${id}`] && before[`recovery:${id}`].length === 1);
  for (const [action, collection, status] of [['Archive', 'Archive', 'archived'], ['Move to Trash', 'Trash', 'trash']]) {
    if (status === 'trash') {
      const beforeCancel = ownedRecords(await records(page), id);
      page.once('dialog', dialog => dialog.dismiss());
      await manage(page, project.name, action);
      assert.deepEqual(ownedRecords(await records(page), id), beforeCancel, 'Cancel Trash must retain all project records');
      page.once('dialog', dialog => dialog.accept());
    }
    await manage(page, project.name, action);
    await card(page, project.name).waitFor({ state: 'detached' });
    assert.equal((await record(page, id)).library.status, status);
    await page.getByRole('button', { name: collection, exact: true }).click();
    await card(page, project.name).waitFor();
    await expect(card(page, project.name).getByRole('button', { name: /^(Open|Continue) / })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Refresh library', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: collection, exact: true }).click();
    await page.getByRole('button', { name: `Restore ${project.name}`, exact: true }).click();
    await expect.poll(async () => (await record(page, id)).library.status).toBe('active');
    await expect(page.getByRole('button', { name: 'Refresh library', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: collection, exact: true }).click();
    await expect(card(page, project.name)).toHaveCount(0);
    const restored = await record(page, id);
    assert.deepEqual(restored.project, project);
    assert.deepEqual(restored.library.tags, ['retained']);
    assert.equal(restored.library.status, 'active');
    await page.getByRole('button', { name: 'Recent maps', exact: true }).click();
  }
  const retained = await records(page);
  for (const prefix of ['previous', 'recovery']) assert.deepEqual(retained[`${prefix}:${id}`], before[`${prefix}:${id}`]);
  page.once('dialog', dialog => dialog.accept());
  await manage(page, project.name, 'Move to Trash');
  await card(page, project.name).waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Trash', exact: true }).click();
  const trashed = ownedRecords(await records(page), id);
  page.once('dialog', dialog => dialog.dismiss());
  await manage(page, project.name, 'Delete permanently');
  assert.deepEqual(ownedRecords(await records(page), id), trashed, 'Cancel deletion must retain all project records');
  const confirmation = page.waitForEvent('dialog');
  const deletion = manage(page, project.name, 'Delete permanently');
  const dialog = await confirmation;
  assert.match(dialog.message(), /previous save and all recovery checkpoints/);
  await dialog.accept();
  await deletion;
  await card(page, project.name).waitFor({ state: 'detached' });
  await landing(page);
  const after = await records(page);
  for (const prefix of ['project', 'previous', 'recovery']) assert.equal(after[`${prefix}:${id}`], undefined);
  assert.deepEqual(ownedRecords(after, otherId), ownedRecords(before, otherId));
  assert.deepEqual(projectKeys(after), [`project:${otherId}`]);
  return { restoredIdentity: id, isolatedNeighbor: otherId, cancelledTrashAndDeletion: true, deletedCheckpointCount: 1 };
}

async function staleMetadata(page) {
  await landing(page);
  const id = await importProject(page, await fixture(page, 'Shared Library map'));
  await library(page);
  const second = await page.context().newPage();
  await landing(second, page.url());
  await manage(page, 'Shared Library map', 'Rename and tags');
  await page.getByLabel('Project title', { exact: true }).fill('Stale metadata');
  await metadata(second, 'Shared Library map', 'Winning metadata', 'winner');
  await card(second, 'Winning metadata').waitFor();
  const before = await records(page);
  await page.getByRole('button', { name: 'Save name and tags', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'changed in another tab' }).waitFor();
  assert.deepEqual(await records(page), before, 'Rejected stale metadata must not write');
  await manage(page, 'Shared Library map', 'Duplicate');
  await page.getByRole('alert').filter({ hasText: 'The source changed. Refresh Your maps before duplicating.' }).waitFor();
  assert.deepEqual(await records(page), before, 'Rejected stale duplicate must not create an orphan record');
  await page.getByRole('button', { name: 'Refresh library', exact: true }).click();
  await card(page, 'Winning metadata').waitFor();
  assert.equal((await record(page, id)).project.name, 'Winning metadata');
  return { id, rejected: ['stale metadata', 'stale duplication'], orphanCopies: 0 };
}

async function staleEditor(page, operation) {
  await landing(page);
  const id = await importProject(page, await fixture(page, 'Shared editor map'));
  const original = (await record(page, id)).project;
  const second = await page.context().newPage();
  await landing(second, new URL('./?view=library', page.url()).href);
  if (operation === 'rename') {
    await metadata(second, original.name, 'Winning editor map', 'winner');
    await card(second, 'Winning editor map').waitFor();
  } else {
    if (operation !== 'archive') second.once('dialog', dialog => dialog.accept());
    await manage(second, original.name, operation === 'archive' ? 'Archive' : 'Move to Trash');
    await card(second, original.name).waitFor({ state: 'detached' });
    if (operation === 'delete') {
      await second.getByRole('button', { name: 'Trash', exact: true }).click();
      second.once('dialog', dialog => dialog.accept());
      await manage(second, original.name, 'Delete permanently');
      await card(second, original.name).waitFor({ state: 'detached' });
    }
  }
  const before = await records(page);
  await renameEditor(page, 'Unsaved stale work');
  const details = await saveDetails(page);
  await details.getByRole('alert').filter({ hasText: 'Another tab changed the saved project' }).waitFor();
  assert.deepEqual(await records(page), before, `${operation} must reject a stale editor save atomically`);
  const exported = await backup(page, details.getByRole('button', { name: 'Export backup', exact: true }));
  assert.deepEqual(exported.project, { ...original, name: 'Unsaved stale work' });
  await page.getByRole('button', { name: 'Close save details', exact: true }).click();
  await renameEditor(page, 'Latest unsaved stale work');
  const latestDetails = await saveDetails(page);
  const latest = await backup(page, latestDetails.getByRole('button', { name: 'Export backup', exact: true }));
  assert.deepEqual(latest.project, { ...original, name: 'Latest unsaved stale work' });
  assert.deepEqual(await records(page), before, 'Further edits in conflict must not overwrite or resurrect the durable project');
  return { id, operation, staleSaveRejected: true, latestInMemoryBackupRetained: true };
}

async function failedDuplicateOpen(page) {
  await landing(page);
  const id = await importProject(page, await fixture(page, 'Durable source'));
  await library(page);
  const before = ownedRecords(await records(page), id);
  await page.evaluate(sourceId => {
    const get = IDBObjectStore.prototype.get;
    window.restoreLibraryRead = () => { IDBObjectStore.prototype.get = get; };
    window.libraryReadFaults = 0;
    // Fail only opening the new record, after the native duplicate transaction commits.
    IDBObjectStore.prototype.get = function (key) {
      if (this.name === 'maps' && this.transaction.mode === 'readonly' &&
          typeof key === 'string' && key.startsWith('project:') && key !== `project:${sourceId}`) {
        window.libraryReadFaults++;
        throw new Error('Injected Library duplicate open failure');
      }
      return get.call(this, key);
    };
  }, id);
  let copyId;
  try {
    await manage(page, 'Durable source', 'Duplicate');
    await page.getByRole('alert').filter({ hasText: 'Injected Library duplicate open failure' }).waitFor();
    await card(page, 'Durable source (copy)').waitFor();
    assert.equal(await page.evaluate(() => window.libraryReadFaults), 1);
    const after = await records(page);
    assert.deepEqual(ownedRecords(after, id), before);
    const copies = projectKeys(after).filter(key => key !== `project:${id}`);
    assert.equal(copies.length, 1, 'Failed opening must retain exactly one committed duplicate');
    copyId = after[copies[0]].localProjectId;
    assert.deepEqual(after[copies[0]].project, { ...before[`project:${id}`].project, name: 'Durable source (copy)' });
  } finally {
    await page.evaluate(() => window.restoreLibraryRead());
  }
  await page.reload();
  await page.getByRole('button', { name: 'Open Durable source (copy)', exact: true }).click();
  await saved(page);
  assert.equal(projectId(page), copyId);
  return { id, copyId, fault: 'native get throws after duplicate commit', retryOpenedSameCopy: true };
}

async function failedSave(page) {
  await landing(page);
  const id = await importProject(page, await fixture(page, 'Quota source'));
  const original = (await record(page, id)).project;
  const before = await records(page);
  await page.evaluate(id => {
    const put = IDBObjectStore.prototype.put;
    window.restoreLibraryWrite = () => { IDBObjectStore.prototype.put = put; };
    window.libraryQuotaFaults = 0;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'maps' && key === `project:${id}`) {
        window.libraryQuotaFaults++;
        throw new DOMException('Injected Library quota failure', 'QuotaExceededError');
      }
      return put.call(this, value, key);
    };
  }, id);
  try {
    await renameEditor(page, 'Unsaved quota work');
    const details = await saveDetails(page);
    await details.getByRole('status').filter({ hasText: 'Save failed' }).waitFor();
    await details.getByRole('alert').filter({ hasText: 'Injected Library quota failure' }).waitFor();
    assert.equal(await page.evaluate(() => window.libraryQuotaFaults), 1);
    assert.deepEqual(await records(page), before, 'Quota abort must also roll back the previous-save slot');
    const exported = await backup(page, details.getByRole('button', { name: 'Export backup', exact: true }));
    assert.deepEqual(exported.project, { ...original, name: 'Unsaved quota work' });
    await details.getByRole('button', { name: 'Retry save', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.libraryQuotaFaults)).toBe(2);
    await details.getByRole('status').filter({ hasText: 'Save failed' }).waitFor();
    assert.deepEqual(await records(page), before, 'Repeated failure must not write partial records');
    await page.getByRole('button', { name: 'Close save details', exact: true }).click();
    await renameEditor(page, 'Latest recovered work');
    const latestDetails = await saveDetails(page);
    await expect.poll(() => page.evaluate(() => window.libraryQuotaFaults)).toBe(3);
    await latestDetails.getByRole('status').filter({ hasText: 'Save failed' }).waitFor();
    const latest = await backup(page, latestDetails.getByRole('button', { name: 'Export backup', exact: true }));
    assert.deepEqual(latest.project, { ...original, name: 'Latest recovered work' });
    assert.deepEqual(await records(page), before, 'Newer in-memory work must not partially save during quota failure');
  } finally {
    await page.evaluate(() => window.restoreLibraryWrite());
  }
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect.poll(async () => (await record(page, id)).project.name).toBe('Latest recovered work');
  await saved(page);
  const committed = await records(page);
  assert.deepEqual(committed[`project:${id}`].project, { ...original, name: 'Latest recovered work' });
  assert.deepEqual(committed[`previous:${id}`].data, before[`project:${id}`]);
  assert.deepEqual(projectKeys(committed), [`project:${id}`]);
  await page.getByRole('button', { name: 'Close save details', exact: true }).click();
  await page.reload();
  await saved(page);
  assert.equal(projectId(page), id);
  await library(page);
  await card(page, 'Latest recovered work').getByRole('button', { name: 'Continue Latest recovered work', exact: true }).click();
  await saved(page);
  assert.deepEqual((await record(page, id)).project, { ...original, name: 'Latest recovered work' });
  return { id, fault: 'QuotaExceededError from native transaction put, not physical disk exhaustion', failedAttempts: 3, latestWorkReopened: true };
}

export default [
  ['Library recovery: rich duplicate isolation and private backup', duplicateIsolation],
  ['Library recovery: archive and Trash restoration and isolated deletion', collections],
  ['Library recovery: stale metadata and duplicate rejection across tabs', staleMetadata],
  ...['rename', 'archive', 'trash', 'delete'].map(operation => [
    `Library recovery: stale editor save after ${operation}`, page => staleEditor(page, operation),
  ]),
  ['Library recovery: committed duplicate survives failed opening', failedDuplicateOpen],
  ['Library recovery: failed-save backup and latest-work recovery', failedSave],
];
