// Production library qualification with the sole HTTP origin stopped.
// PLAYWRIGHT_MODULE points at an already installed external Playwright SDK.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preview } from 'vite';

assert(process.env.QA_OUTPUT, 'Set QA_OUTPUT to a session artifact directory.');
const output = process.env.QA_OUTPUT;
await mkdir(output, { recursive: true });
const playwright = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const port = Number(process.env.QA_OFFLINE_PORT ?? 5299);
const origin = `http://127.0.0.1:${port}/Dungeon-Mapper/`;
const results = [];
const fixture = name => ({
  schemaVersion: 1,
  project: { name, activeLevelIndex: 0, stairLinks: [], customThemes: [],
    levels: [{ meta: { name: 'Level 1', width: 8, height: 8, tileSize: 20, theme: 'dungeon' },
      tiles: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ({ type: 'floor' }))),
      notes: [], fog: Array.from({ length: 8 }, () => Array(8).fill(true)), fogEnabled: true }],
  },
});
const saved = page => page.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
async function importProject(page, name) {
  await page.getByLabel('Import project', { exact: true }).setInputFiles({
    name: `${name}.json`, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture(name))),
  });
  await page.getByRole('button', { name: 'Import as new project', exact: true }).click();
  await saved(page);
}
for (const engine of (process.env.QA_ENGINES ?? 'chromium,firefox,webkit').split(',')) {
  const profile = await mkdtemp(join(tmpdir(), 'ux02-offline-'));
  let context;
  let server;
  const evidence = { engine, source: process.env.QA_SOURCE_SHA ?? 'working tree', origin };
  try {
    server = await preview({ preview: { host: '127.0.0.1', port, strictPort: true } });
    assert.equal((await fetch(origin)).status, 200);
    context = await playwright[engine].launchPersistentContext(profile, { headless: true });
    let page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(origin);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: 'Your maps', exact: true }).waitFor();
    await importProject(page, 'Offline crypt');
    await page.getByRole('button', { name: 'Your maps', exact: true }).click();
    await importProject(page, 'Offline forest');
    await page.getByRole('button', { name: 'Your maps', exact: true }).click();
    await page.getByRole('article', { name: 'Offline crypt', exact: true }).waitFor();
    await page.evaluate(async () => {
      await Promise.race([navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Service worker was not ready.')), 15000))]);
    });
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    evidence.worker = await page.evaluate(() => navigator.serviceWorker.controller.scriptURL);
    await new Promise((resolve, reject) => {
      server.httpServer.closeAllConnections();
      server.httpServer.close(error => error ? reject(error) : resolve());
    });
    server = undefined;
    await assert.rejects(fetch(origin));
    evidence.originStopped = true;
    await page.reload();
    await page.getByRole('heading', { name: 'Your maps', exact: true }).waitFor();
    await page.getByRole('searchbox').fill('crypt');
    await page.getByRole('button', { name: 'Open Offline crypt', exact: true }).click();
    await saved(page);
    await page.getByRole('button', { name: 'Project menu', exact: true }).click();
    await page.getByRole('button', { name: 'Project settings', exact: true }).click();
    await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('Offline crypt revised');
    await page.getByRole('button', { name: 'Close Project settings', exact: true }).click();
    await saved(page);
    await page.getByRole('button', { name: 'Your maps', exact: true }).click();
    await page.getByRole('article', { name: 'Offline crypt revised', exact: true }).waitFor();
    await page.screenshot({ path: join(output, `${engine}-offline-library.png`) });
    await context.close();
    context = await playwright[engine].launchPersistentContext(profile, { headless: true });
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(origin);
    await page.getByRole('heading', { name: 'Your maps', exact: true }).waitFor();
    await page.getByRole('article', { name: 'Offline crypt revised', exact: true }).waitFor();
    await page.getByRole('article', { name: 'Offline forest', exact: true }).waitFor();
    await page.getByRole('searchbox').fill('forest');
    await page.getByRole('button', { name: /^(Open|Continue) Offline forest$/ }).click();
    await saved(page);
    assert.equal(await page.locator('.project-identity strong').innerText(), 'Offline forest');
    evidence.processReopen = true;
    evidence.status = 'passed';
  } catch (error) {
    evidence.status = 'failed';
    evidence.error = error.stack;
  } finally {
    if (context) await context.close();
    if (server) await new Promise(resolve => { server.httpServer.closeAllConnections(); server.httpServer.close(resolve); });
    await rm(profile, { recursive: true, force: true });
    results.push(evidence);
    await writeFile(join(output, 'ux02-offline-results.json'), JSON.stringify(results, null, 2));
    console.log(`${engine}: production offline library ${evidence.status}`);
  }
}
assert(results.every(result => result.status === 'passed'), JSON.stringify(results, null, 2));
