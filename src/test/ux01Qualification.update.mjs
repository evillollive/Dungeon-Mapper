// Bounded production SW byte-update continuity, not a mixed-application-version release test.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { preview } from 'vite';

assert(process.env.QA_OUTPUT, 'Set QA_OUTPUT to a session artifact directory');
const output = process.env.QA_OUTPUT;
await mkdir(output, { recursive: true });
const playwright = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const workerSource = await readFile('dist/sw.js', 'utf8');
const port = Number(process.env.QA_UPDATE_PORT ?? 5298);
const origin = `http://127.0.0.1:${port}/Dungeon-Mapper/`;
const results = [];
for (const engine of (process.env.QA_ENGINES ?? 'chromium,firefox,webkit').split(',')) {
  let epoch = 1;
  const server = await preview({
    preview: { host: '127.0.0.1', port, strictPort: true },
    plugins: [{
      name: 'qa-worker-byte-update',
      configurePreviewServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url !== '/Dungeon-Mapper/sw.js') return next();
          response.setHeader('Content-Type', 'application/javascript');
          response.setHeader('Cache-Control', 'no-store');
          response.end(`${workerSource}\n// Isolated QA worker update ${epoch}\n`);
        });
      },
    }],
  });
  const browser = await playwright[engine].launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const evidence = { engine, version: browser.version(), applicationSourceSha: process.env.QA_SOURCE_SHA };
  try {
    assert.equal((await fetch(origin)).status, 200);
    await page.goto(origin);
    await page.waitForLoadState('networkidle');
    await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('Before update');
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await page.evaluate(async () => {
      window.qaOldWorker = (await navigator.serviceWorker.getRegistration()).active;
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        const request = put.apply(this, args);
        if (String(args[1]).startsWith('project:')) {
          let released = false;
          window.qaReleaseSave = () => { released = true; };
          const store = this;
          const keepAlive = () => {
            if (released) return;
            const next = store.get('qa-update-keepalive');
            next.onsuccess = keepAlive;
          };
          request.addEventListener('success', keepAlive);
        }
        return request;
      };
    });
    let navigations = 0;
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
    const name = page.getByRole('textbox', { name: 'Project name', exact: true });
    await name.fill('Pending edit through SW update');
    await page.waitForFunction(() => typeof window.qaReleaseSave === 'function');
    epoch = 2;
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); });
    await page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration.active && registration.active !== window.qaOldWorker && registration.active.state === 'activated';
    });
    assert.equal(navigations, 0, 'SW update navigated the document while an edit was uncommitted');
    assert.equal(await name.inputValue(), 'Pending edit through SW update');
    await page.getByText('Saving', { exact: true }).waitFor();
    await page.evaluate(() => window.qaReleaseSave());
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    const id = new URL(page.url()).searchParams.get('project');
    await page.reload();
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    assert.equal(await name.inputValue(), 'Pending edit through SW update');
    assert.equal(new URL(page.url()).searchParams.get('project'), id);
    evidence.status = 'pass';
    evidence.oldWorkerReplaced = true;
    evidence.uncommittedEditSurvived = true;
    evidence.classification = 'real worker update triggered by comment-only SW byte change; application bundle unchanged; no cross-version migration or OS interruption claim';
  } catch (error) {
    evidence.status = 'fail';
    evidence.error = error.stack;
  } finally {
    await context.close();
    await browser.close();
    await new Promise(resolve => { server.httpServer.closeAllConnections(); server.httpServer.close(resolve); });
    results.push(evidence);
    await writeFile(join(output, 'worker-update-results.json'), JSON.stringify(results, null, 2));
    console.log(`${engine}: bounded SW update continuity: ${evidence.status}`);
  }
}
process.exitCode = results.some(result => result.status !== 'pass') ? 1 : 0;
