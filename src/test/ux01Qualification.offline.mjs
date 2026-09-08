// Production offline qualification with the HTTP origin actually stopped.
// This complements Playwright's simulated browser offline switch.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preview } from 'vite';

assert(process.env.QA_OUTPUT, 'Set QA_OUTPUT to a session artifact directory');
const output = process.env.QA_OUTPUT;
await mkdir(output, { recursive: true });
const playwright = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const results = [];
const port = Number(process.env.QA_OFFLINE_PORT ?? 5298);
const origin = `http://127.0.0.1:${port}/Dungeon-Mapper/`;
for (const engine of (process.env.QA_ENGINES ?? 'chromium,firefox,webkit').split(',')) {
  const profile = await mkdtemp(join(tmpdir(), 'dungeon-offline-qa-'));
  let context;
  let server;
  const evidence = { engine, origin };
  const stage = value => { evidence.stage = value; console.log(`${engine}: ${value}`); };
  try {
    stage('starting production preview');
    server = await preview({ preview: { host: '127.0.0.1', port, strictPort: true } });
    assert.equal((await fetch(origin)).status, 200);
    context = await playwright[engine].launchPersistentContext(profile, { headless: true });
    stage('browser launched');
    evidence.version = context.browser().version();
    let page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(origin);
    await page.waitForLoadState('networkidle');
    stage('editor loaded');
    const name = page.getByRole('textbox', { name: 'Map name', exact: true });
    await name.fill('Real network-loss save');
    await page.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
    stage('saved, awaiting service worker');
    await page.evaluate(async () => {
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('No ready service worker after 15s')), 15000)),
      ]);
    });
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    evidence.serviceWorker = await page.evaluate(async () => {
      return { scriptURL: navigator.serviceWorker.controller.scriptURL, cacheNames: await caches.keys() };
    });
    stage('service worker installed, stopping origin');
    await new Promise((resolve, reject) => {
      server.httpServer.closeAllConnections();
      server.httpServer.close(error => error ? reject(error) : resolve());
    });
    server = null;
    await assert.rejects(fetch(origin));
    evidence.originUnreachable = true;
    stage('origin stopped, reloading');
    await page.reload();
    await page.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
    assert.equal(await name.inputValue(), 'Real network-loss save');
    evidence.reloadPassed = true;
    stage('offline reload passed');
    await name.fill('Saved with origin stopped');
    await page.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
    await context.close();
    stage('browser closed, reopening');
    context = await playwright[engine].launchPersistentContext(profile, { headless: true });
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(origin);
    await page.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
    assert.equal(await page.getByRole('textbox', { name: 'Map name', exact: true }).inputValue(), 'Saved with origin stopped');
    evidence.processColdReopenPassed = true;
    evidence.status = 'pass';
  } catch (error) {
    evidence.status = 'fail';
    evidence.error = error.stack;
  } finally {
    if (context) await context.close();
    if (server) await new Promise(resolve => { server.httpServer.closeAllConnections(); server.httpServer.close(resolve); });
    await rm(profile, { recursive: true, force: true });
    results.push(evidence);
    await writeFile(join(output, 'network-loss-results.json'), JSON.stringify(results, null, 2));
    console.log(`${engine}: real origin network loss: ${evidence.status}`);
  }
}
process.exitCode = results.some(result => result.status !== 'pass') ? 1 : 0;
