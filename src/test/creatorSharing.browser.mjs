import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { unzipSync } from 'fflate';
import { expect } from 'playwright/test';
import { records } from './ux02Creation.browser.mjs';
import { landing, library, fixture, file, saved, projectId, card } from './ux09Library.browser.mjs';

export default async function creatorSharing(page, { output, engine, beforeSharing }) {
  const requests = [];
  page.on('request', request => { if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/) && !request.url().startsWith('blob:')) requests.push(request.url()); });
  await landing(page);
  const source = await fixture(page, 'CREATOR_PRIVATE_TITLE');
  source.customThemes = [];
  source.customStamps = [];
  for (const [index, map] of source.levels.entries()) {
    map.stamps[0].stampId = 'folio-furnishings-v1-table';
    map.notes[0] = { id: 1, x: 1, y: 1, label: 'Rescue objective', description: 'Recover the cartographer.', privateFuture: 'NEVER_PUBLISH_UNKNOWN' };
    map.notes.push({ id: 2, x: 2, y: 1, label: 'NEVER_PUBLISH_NOTE', description: 'NEVER_PUBLISH_NOTE' });
    map.meta.name = `Private source level ${index + 1}`;
    map.tokens[0].label = 'Reviewed hidden guard';
    map.tiles[1][1].noteId = 1;
    map.tiles[1][2].noteId = 2;
    map.qaExtension = { secret: 'NEVER_PUBLISH_UNKNOWN' };
  }
  await page.getByLabel('Import project', { exact: true }).setInputFiles(file(source));
  await page.getByRole('button', { name: 'Import as new project', exact: true }).click();
  await saved(page);
  const originalId = projectId(page);
  await library(page);
  const baseline = await records(page);
  if (beforeSharing) await beforeSharing(page);
  await card(page, source.name).getByRole('button', { name: 'Share a creator copy', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Share a creator copy', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('combobox', { name: 'Contribution license', exact: true })).toHaveValue('');
  await dialog.getByLabel('Publication title', { exact: true }).fill('Shared rescue vault');
  await dialog.getByLabel('Your creator credit', { exact: true }).fill('Synthetic fixture author');
  await dialog.getByLabel('Package ID', { exact: true }).fill('shared-rescue-vault');
  await dialog.getByRole('combobox', { name: 'Sharing profile', exact: true }).selectOption('encounter');
  const level = dialog.getByRole('group', { name: 'Source level 1: Private source level 1', exact: true });
  await level.getByLabel('Shared level name', { exact: true }).fill('Entrance');
  await level.getByText('DM notes: 0 of 2 included', { exact: true }).click();
  await level.getByRole('checkbox', { name: /Rescue objective:/ }).check();
  await level.getByText('Tokens: 0 of 1 included', { exact: true }).click();
  await level.getByRole('checkbox', { name: 'monster: Reviewed hidden guard (hidden)', exact: true }).check();
  await level.getByRole('checkbox', { name: /Include the background image/ }).check();
  await dialog.getByRole('combobox', { name: 'Contribution license', exact: true }).selectOption('CC-BY-SA-4.0');
  await dialog.getByRole('button', { name: 'Review rights and assets', exact: true }).click();
  await dialog.getByLabel('Source title', { exact: true }).fill('Synthetic icon fixture');
  await dialog.getByLabel('Original creator', { exact: true }).fill('Dungeon Mapper contributors');
  await dialog.getByLabel('Source license', { exact: true }).fill('AGPL-3.0-or-later');
  await expect(dialog.getByRole('button', { name: 'Build exact review copy', exact: true })).toBeDisabled();
  await dialog.getByRole('checkbox', { name: /I have declared inherited sources/ }).check();
  await dialog.getByRole('button', { name: 'Build exact review copy', exact: true }).click();
  const downloadButton = dialog.getByRole('button', { name: 'Download creator ZIP', exact: true });
  await expect(downloadButton).toBeVisible();
  await expect(downloadButton).toBeDisabled();
  await expect(dialog.locator('.creator-previews img')).toHaveCount(2);
  await expect.poll(() => dialog.locator('.creator-previews img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  await page.setViewportSize({ width: 390, height: 440 });
  await expect.poll(() => dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await dialog.getByRole('checkbox', { name: /I reviewed this exact creator copy/ }).check();
  await downloadButton.focus();
  const downloaded = page.waitForEvent('download');
  await page.keyboard.press('Enter');
  const result = await downloaded;
  const zipPath = join(output, `${engine}-creator-copy.zip`);
  await result.saveAs(zipPath);
  await expect(dialog.getByRole('status')).toContainText('Nothing was uploaded');
  await page.screenshot({ path: join(output, `${engine}-creator-review-390x440.png`) });
  const bytes = await readFile(zipPath);
  const members = unzipSync(bytes);
  const root = 'maps/shared-rescue-vault/';
  const shared = JSON.parse(Buffer.from(members[root + 'map.json']).toString('utf8'));
  const manifest = JSON.parse(Buffer.from(members[root + 'manifest.json']).toString('utf8'));
  for (const member of manifest.members) {
    const fileBytes = members[root + member.path];
    assert.equal(fileBytes.length, member.bytes);
    assert.equal(createHash('sha256').update(fileBytes).digest('hex'), member.sha256);
  }
  const publicText = Object.entries(members).filter(([path]) => !path.endsWith('.png')).map(([, value]) => Buffer.from(value).toString('utf8')).join('\n');
  for (const sentinel of ['CREATOR_PRIVATE_TITLE', 'Private source level', 'NEVER_PUBLISH_NOTE', 'NEVER_PUBLISH_UNKNOWN']) assert(!publicText.includes(sentinel), sentinel);
  assert.deepEqual(shared.project.levels[0].notes.map(note => note.id), [1]);
  assert.deepEqual(shared.project.levels[1].notes, []);
  assert.equal(shared.project.levels[0].tokens[0].hidden, true);
  assert.deepEqual(await records(page), baseline, 'Sharing must not write source or other local records');
  await dialog.getByRole('button', { name: 'Close creator sharing', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByLabel('Import creator package', { exact: true }).setInputFiles(zipPath);
  const preview = page.getByRole('region', { name: 'Import preview', exact: true });
  await expect(preview).toBeVisible();
  assert.deepEqual(await records(page), baseline, 'Preview must not write local data');
  await preview.getByRole('button', { name: 'Cancel import', exact: true }).click();
  assert.deepEqual(await records(page), baseline);
  await page.getByLabel('Import creator package', { exact: true }).setInputFiles(zipPath);
  await preview.getByRole('button', { name: 'Import as new project', exact: true }).click();
  await saved(page);
  const importedId = projectId(page);
  assert(importedId && importedId !== originalId);
  const imported = (await records(page))[`project:${importedId}`].project;
  assert.equal(imported.name, 'Shared rescue vault');
  assert.equal(imported.creatorProvenance.mapSources.at(-1).license, 'CC-BY-SA-4.0');
  assert.equal(imported.levels[0].backgroundImage.dataUrl, source.levels[0].backgroundImage.dataUrl);
  assert.deepEqual((await records(page))[`project:${originalId}`], baseline[`project:${originalId}`]);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('dialog', { name: 'Export', exact: true }).getByRole('button', { name: 'Share a creator copy', exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('combobox', { name: 'Contribution license', exact: true })).toHaveValue('');
  await expect(dialog.getByRole('combobox', { name: 'Contribution license', exact: true }).locator('option')).toHaveText(['Choose explicitly', 'CC-BY-SA-4.0']);
  await page.keyboard.press('Tab');
  assert(await dialog.evaluate(element => element.contains(document.activeElement)), 'Creator dialog must own keyboard focus');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Export', exact: true })).not.toBeVisible();
  await library(page);
  const beforeBad = await records(page);
  await page.getByLabel('Import creator package', { exact: true }).setInputFiles({
    name: 'broken.zip', mimeType: 'application/zip', buffer: Buffer.from('not a zip'),
  });
  await expect(page.getByRole('alert')).toContainText('creator ZIP');
  assert.deepEqual(await records(page), beforeBad, 'Rejected ZIP must not write anything');
  const folder = join(output, 'extracted', 'shared-rescue-vault');
  await mkdir(folder, { recursive: true });
  for (const [path, data] of Object.entries(members)) {
    const relative = path.slice(root.length);
    if (relative.startsWith('assets/')) await mkdir(join(folder, 'assets'), { recursive: true });
    await writeFile(join(folder, relative), data);
  }
  await page.getByLabel('Import creator folder', { exact: true }).setInputFiles(folder);
  await expect(preview).toBeVisible();
  await preview.getByRole('button', { name: 'Cancel import', exact: true }).click();
  assert.deepEqual(await records(page), beforeBad);
  assert.deepEqual(requests, []);
  return {
    originalId, importedId, zipBytes: bytes.length,
    zipSha256: createHash('sha256').update(bytes).digest('hex'),
    manifest, unchangedSourceRecord: true, noWritesOnPreviewCancelOrError: true,
    directorySelection: 'native selection passed',
    hostedTriggers: 0,
  };
}
