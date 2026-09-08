// Real production guided-creation journeys. Uses an external installed SDK.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const playwright = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const origin = process.env.QA_ORIGIN ?? 'http://127.0.0.1:5300/Dungeon-Mapper/';
assert(process.env.QA_OUTPUT, 'Set QA_OUTPUT to a session artifact directory.');
const output = process.env.QA_OUTPUT;
await mkdir(output, { recursive: true });
const results = [];
const records = page => page.evaluate(() => new Promise((resolve, reject) => {
  const request = indexedDB.open('dungeon-mapper', 1);
  request.onerror = () => reject(request.error);
  request.onsuccess = () => {
    const db = request.result;
    const tx = db.transaction('maps', 'readonly');
    const keys = tx.objectStore('maps').getAllKeys();
    const values = tx.objectStore('maps').getAll();
    tx.oncomplete = () => { db.close(); resolve(Object.fromEntries(keys.result.map((key, index) => [key, values.result[index]]))); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  };
}));
const projectId = page => new URL(page.url()).searchParams.get('project');
const saved = page => page.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
const library = async page => {
  await page.getByRole('button', { name: 'Your maps', exact: true }).click();
  await page.getByRole('heading', { name: 'Your maps', exact: true }).waitFor();
};
const preview = async page => {
  await page.getByRole('button', { name: 'Preview map', exact: true }).click();
  await page.getByRole('button', { name: 'Use this map', exact: true }).waitFor();
  await page.waitForFunction(() => !Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Use this map')?.disabled);
};
const commit = async page => { await page.getByRole('button', { name: 'Use this map', exact: true }).click(); await saved(page); };
for (const engine of (process.env.QA_ENGINES ?? 'chromium,firefox,webkit').split(',')) {
  const browser = await playwright[engine].launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const result = { engine, version: browser.version(), source: process.env.QA_SOURCE_SHA ?? 'working tree' };
  try {
    await page.goto(origin);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: 'Your maps', exact: true }).waitFor();
    const empty = await records(page);
    await page.getByRole('button', { name: 'Open a sample', exact: true }).click();
    await page.getByLabel('Ready-to-play sample').selectOption('sunken-crypt');
    await preview(page);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.deepEqual(await records(page), empty, 'Sample cancellation must not create or change records');
    await page.getByRole('button', { name: 'Open a sample', exact: true }).click();
    await page.getByLabel('Ready-to-play sample').selectOption('sunken-crypt');
    await preview(page); await commit(page);
    const sampleId = projectId(page);
    assert(sampleId);
    const originalSample = (await records(page))[`project:${sampleId}`];
    assert.equal(originalSample.project.levels[0].meta.width, 40);

    await library(page);
    await page.getByRole('button', { name: 'Create map', exact: true }).click();
    await page.getByRole('button', { name: 'Start blank', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Project name', { exact: true }).fill('Blank QA');
    await page.getByLabel('Width (tiles)', { exact: true }).fill('10');
    await page.getByLabel('Height (tiles)', { exact: true }).fill('12');
    await preview(page); await commit(page);
    const blankId = projectId(page);
    assert.notEqual(blankId, sampleId);
    let blank = (await records(page))[`project:${blankId}`].project;
    assert.equal(blank.levels[0].meta.width, 10);
    assert.equal(blank.levels[0].meta.height, 12);
    assert(blank.levels[0].tiles.flat().every(tile => tile.type === 'empty'));
    assert.deepEqual((await records(page))[`project:${sampleId}`], originalSample);

    const generated = [];
    for (const name of ['Seed QA', 'Seed QA again']) {
      await library(page);
      await page.getByRole('button', { name: 'Create map', exact: true }).click();
      await page.getByRole('button', { name: 'Generate a map', exact: true }).click();
      await page.getByRole('dialog').getByLabel('Project name', { exact: true }).fill(name);
      await page.getByLabel('Map size').selectOption('24x18');
      await page.getByText('Advanced: seed and algorithm', { exact: true }).click();
      await page.getByLabel('Seed', { exact: true }).fill('ux02-browser-seed');
      const before = await records(page);
      await preview(page);
      const image = await page.getByRole('region', { name: 'Map preview' }).getByRole('img').getAttribute('src');
      await page.getByRole('button', { name: 'Back to options', exact: true }).click();
      assert.deepEqual(await records(page), before, 'Preview/back must not mutate active work');
      await preview(page);
      assert.equal(await page.getByRole('region', { name: 'Map preview' }).getByRole('img').getAttribute('src'), image);
      await commit(page);
      generated.push((await records(page))[`project:${projectId(page)}`].project.levels[0]);
    }
    assert.deepEqual(generated[0].tiles, generated[1].tiles);
    assert.deepEqual(generated[0].notes, generated[1].notes);

    await library(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Create map', exact: true }).click();
    await page.getByRole('button', { name: 'Trace an image', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Project name', { exact: true }).fill('Trace QA');
    const response = await page.request.get(`${origin}pwa-192x192.png`);
    assert(response.ok());
    await page.getByLabel('Background image', { exact: true }).setInputFiles({
      name: 'reference.png', mimeType: 'image/png', buffer: await response.body(),
    });
    await page.getByRole('status').filter({ hasText: 'Image ready:' }).waitFor();
    await preview(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
    await page.screenshot({ path: join(output, `${engine}-mobile-trace.png`) });
    await commit(page);
    const traceId = projectId(page);
    const trace = (await records(page))[`project:${traceId}`].project.levels[0].backgroundImage;
    assert(trace.dataUrl.startsWith('data:image/png;base64,'));
    assert(trace.scale > 0);
    await page.reload(); await saved(page);
    assert.deepEqual((await records(page))[`project:${traceId}`].project.levels[0].backgroundImage, trace);

    await page.setViewportSize({ width: 1440, height: 900 });
    await library(page);
    blank = structuredClone(blank);
    blank.name = 'Template source';
    blank.sceneTemplates = [{ id: 'solo', name: 'Solo room', width: 1, height: 1,
      tiles: [[{ type: 'floor' }]], notes: [], stamps: [], createdAt: '2026-09-08T00:00:00Z' }];
    await page.getByLabel('Import project', { exact: true }).setInputFiles({
      name: 'template.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, project: blank })),
    });
    await page.getByRole('button', { name: 'Import as new project', exact: true }).click(); await saved(page);
    const sourceId = projectId(page);
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: 'Search commands', exact: true }).fill('Scene Templates');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Create project from Solo room', exact: true }).click(); await saved(page);
    assert.notEqual(projectId(page), sourceId);
    assert.equal((await records(page))[`project:${projectId(page)}`].project.levels[0].meta.width, 1);
    assert.equal((await records(page))[`project:${sourceId}`].project.name, 'Template source');
    const copyId = projectId(page);
    await library(page);
    await page.getByRole('article', { name: 'Solo room', exact: true }).waitFor();
    await page.getByRole('article', { name: 'The Sunken Crypt', exact: true }).getByRole('img').waitFor();
    await page.screenshot({ path: join(output, `${engine}-library.png`) });
    await page.getByRole('button', { name: 'Continue last map', exact: true }).click();
    await saved(page);
    assert.equal(projectId(page), copyId, 'Continue last map opens the most recent project in one action');
    assert.deepEqual(errors, []);
    result.status = 'passed';
  } catch (error) {
    result.status = 'failed'; result.error = error.stack;
    await page.screenshot({ path: join(output, `${engine}-failure.png`) });
  } finally {
    await context.close(); await browser.close();
    results.push(result);
    await writeFile(join(output, 'ux02-creation-results.json'), JSON.stringify(results, null, 2));
    console.log(`${engine}: production guided creation ${result.status}`);
  }
}
assert(results.every(result => result.status === 'passed'), JSON.stringify(results, null, 2));
