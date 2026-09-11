import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { preview } from 'vite';
import * as playwright from 'playwright';

assert(process.env.QA_OUTPUT, 'Set QA_OUTPUT to a session artifact directory.');
const output = process.env.QA_OUTPUT;
await mkdir(output, { recursive: true });
const worker = await readFile('dist/service-worker.js', 'utf8');
const port = Number(process.env.QA_PORT ?? 5308);
const base = `http://127.0.0.1:${port}/Dungeon-Mapper/`;
const results = [];
function fixture(width = 16) {
  return { schemaVersion: 1, project: { name: 'UX08 private project', activeLevelIndex: 0, stairLinks: [], customThemes: [],
    customStamps: [{ id: 'broken-image', name: 'Broken artwork', category: 'custom', viewBox: '0 0 512 512', imageDataUrl: 'data:image/png;base64,YmFk' }],
    levels: [{ meta: { name: 'PRIVATE_LEVEL_SENTINEL', publicName: 'The shared hall', width, height: width, tileSize: 20, theme: 'dungeon-folio-v1' },
      tiles: Array.from({ length: width }, (_, y) => Array.from({ length: width }, (_, x) => ({ type: x === 0 || y === 0 ? 'wall' : 'floor' }))),
      notes: [{ id: 1, x: 2, y: 2, label: 'PRIVATE_NOTE_SENTINEL', description: 'PRIVATE_TEXT_SENTINEL', published: false },
        { id: 2, x: 3, y: 3, label: 'Public door', description: '', published: true, publicLabel: 'Public door' }],
      tokens: [{ id: 1, x: 4, y: 4, label: 'Visible knight', kind: 'player', size: 1 }],
      stamps: [{ id: 1, stampId: 'missing-pack', x: 5, y: 5, scale: 1, rotation: 0, flipX: false, flipY: false, opacity: 1, locked: false },
        { id: 2, stampId: 'broken-image', x: 6, y: 6, scale: 1, rotation: 0, flipX: false, flipY: false, opacity: 1, locked: false }],
      fog: Array.from({ length: width }, (_, y) => Array.from({ length: width }, (_, x) => x > width / 2 && y > width / 2)), fogEnabled: true,
      paperTexture: { enabled: true, pattern: 'parchment', opacity: 0.2, grain: 0.1, vignette: 0.1 } },
      { meta: { name: 'Second private floor', width: 8, height: 8, tileSize: 20, theme: 'dungeon' },
        tiles: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ({ type: 'floor' }))), notes: [] }] } };
}
const saved = page => page.getByText(/^Saved on this device(?: \/ Offline)?$/).waitFor();
async function importFixture(page, data) {
  await page.getByLabel('Import project', { exact: true }).setInputFiles({
    name: 'ux08.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)),
  });
  await page.getByRole('button', { name: 'Import as new project', exact: true }).click();
  await saved(page);
}
async function download(page, button) {
  const [file] = await Promise.all([page.waitForEvent('download'), button.click()]);
  const chunks = [];
  for await (const chunk of await file.createReadStream()) chunks.push(chunk);
  return { name: file.suggestedFilename(), bytes: Buffer.concat(chunks) };
}
for (const engine of (process.env.QA_ENGINES ?? 'chromium,firefox,webkit').split(',')) {
  let epoch = 1;
  let rejectSetup = true;
  let server;
  let browser;
  let context;
  const evidence = { engine };
  try {
    server = await preview({ preview: { host: '127.0.0.1', port, strictPort: true },
      plugins: [{ name: 'ux08-controlled-worker-update', configurePreviewServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url !== '/Dungeon-Mapper/service-worker.js') return next();
          if (rejectSetup) {
            rejectSetup = false;
            response.statusCode = 503;
            response.end('Intentional first-install failure');
            return;
          }
          response.setHeader('Content-Type', 'application/javascript');
          response.setHeader('Cache-Control', 'no-store');
          response.end(`${worker}\n// UX08 controlled worker revision ${epoch}\n`);
        });
      } }] });
    assert.equal((await fetch(base)).status, 200);
    browser = await playwright[engine].launch({ headless: true });
    evidence.version = browser.version();
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.waitForLoadState('networkidle');
    await page.locator('.offline-status summary').click();
    await page.getByRole('button', { name: 'Retry offline setup' }).click();
    await page.getByText('App and built-in art cached.', { exact: true }).waitFor();
    await page.locator('.offline-status summary').click();
    await importFixture(page, fixture());
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Export', exact: true });
    await dialog.getByRole('img', { name: 'Player PNG export preview' }).waitFor();
    await page.waitForFunction(() => document.querySelector('.export-preview canvas')?.width > 0);
    await dialog.getByText(/Missing stamp "missing-pack"/).waitFor();
    await dialog.getByText(/An embedded image could not be decoded/).waitFor();
    const png = await download(page, dialog.getByRole('button', { name: 'Export PNG', exact: true }));
    assert.equal(png.name, 'The_shared_hall_64dpi.png');
    assert.equal(png.bytes.readUInt32BE(16), 1024);
    assert.equal(png.bytes.readUInt32BE(20), 1024);
    await dialog.getByLabel('Format', { exact: true }).selectOption('svg');
    const svg = await download(page, dialog.getByRole('button', { name: 'Export SVG', exact: true }));
    assert(!svg.bytes.toString().includes('PRIVATE_'));
    assert(!svg.bytes.toString().includes('>1</text>'));
    assert(svg.bytes.toString().includes('>2</text>'));
    assert(!svg.bytes.toString().includes('data:image/png;base64,YmFk'));
    await dialog.getByRole('button', { name: /Back up project/ }).click();
    const backup = await download(page, dialog.getByRole('button', { name: 'Download private backup' }));
    assert.equal(JSON.parse(backup.bytes).project.levels.length, 2);
    assert(backup.bytes.toString().includes('PRIVATE_TEXT_SENTINEL'));
    await dialog.getByRole('button', { name: /Print for the table/ }).click();
    await dialog.getByLabel('Audience', { exact: true }).selectOption('player');
    await dialog.getByLabel('Resolution (DPI)').selectOption('300');
    await page.waitForFunction(() => document.querySelector('.export-preview canvas')?.width > 0);
    await page.screenshot({ path: join(output, `${engine}-print-planning.png`) });
    const printed = await download(page, dialog.getByRole('button', { name: 'Download page 1', exact: true }));
    assert.equal(printed.bytes.readUInt32BE(16), 2550);
    assert.equal(printed.bytes.readUInt32BE(20), 3300);
    const phys = printed.bytes.indexOf('pHYs');
    assert(phys > 0);
    assert.equal(printed.bytes.readUInt32BE(phys + 4), 11811);
    await dialog.getByLabel('Preview / download page').selectOption('1');
    const second = await download(page, dialog.getByRole('button', { name: 'Download page 2', exact: true }));
    const overlapMatches = await page.evaluate(async ([first, second]) => {
      async function strip(data, x) {
        const image = new Image();
        image.src = `data:image/png;base64,${data}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const strip = ctx.getImageData(x, 150, 75, 3000).data;
        const margin = ctx.getImageData(0, 0, 1, 1).data;
        if (!margin.every(channel => channel === 255)) throw new Error('Page margin is not white.');
        canvas.width = canvas.height = 0;
        return strip;
      }
      const a = await strip(first, 2325);
      const b = await strip(second, 150);
      return a.every((value, index) => value === b[index]);
    }, [printed.bytes.toString('base64'), second.bytes.toString('base64')]);
    assert(overlapMatches, 'Adjacent page overlap differs from the same global map coordinates.');
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth + 1));
    await page.screenshot({ path: join(output, `${engine}-export-phone.png`) });
    await dialog.getByRole('button', { name: 'Close Export', exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'Your maps', exact: true }).click();
    await importFixture(page, fixture(128));
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await dialog.getByRole('button', { name: /Print for the table/ }).click();
    await dialog.getByLabel('Resolution (DPI)').selectOption('300');
    await dialog.getByLabel('Preview / download page').selectOption('251');
    await page.waitForFunction(() => document.querySelector('.export-preview canvas')?.width > 0);
    await page.evaluate(() => {
      window.qaSurfaces = [];
      for (const key of ['width', 'height']) {
        const property = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, key);
        Object.defineProperty(HTMLCanvasElement.prototype, key, { ...property, set(value) {
          property.set.call(this, value);
          window.qaSurfaces.push([this.width, this.height]);
          if (this.width * this.height > 16000000 || this.width > 8192 || this.height > 8192) throw new Error('Unbounded canvas allocation');
        } });
      }
    });
    const last = await download(page, dialog.getByRole('button', { name: 'Download page 252', exact: true }));
    assert(last.name.includes('page_14-18'));
    evidence.maxSurfacePixels = await page.evaluate(() => Math.max(...window.qaSurfaces.map(([w, h]) => w * h)));
    assert(evidence.maxSurfacePixels <= 16000000);
    const beforeCancel = await download(page, (await (async () => {
      await dialog.getByRole('button', { name: /Back up project/ }).click();
      return dialog.getByRole('button', { name: 'Download private backup' });
    })()));
    await dialog.getByRole('button', { name: /Print for the table/ }).click();
    await dialog.getByRole('button', { name: 'Download all 252 pages', exact: true }).click();
    await dialog.getByRole('button', { name: 'Cancel export', exact: true }).click();
    await dialog.getByText(/Export cancelled/).waitFor();
    await dialog.getByRole('button', { name: /Back up project/ }).click();
    const afterCancel = await download(page, dialog.getByRole('button', { name: 'Download private backup' }));
    assert.deepEqual(JSON.parse(beforeCancel.bytes), JSON.parse(afterCancel.bytes));
    await dialog.getByRole('button', { name: 'Close Export', exact: true }).click();
    await page.locator('.offline-status summary').click();
    await page.getByText('App and built-in art cached.', { exact: true }).waitFor();
    await page.evaluate(async () => {
      for (const name of await caches.keys()) {
        if (!name.includes('precache')) continue;
        const cache = await caches.open(name);
        const key = (await cache.keys()).find(request => request.url.includes('pwa-192x192.png'));
        if (!key) continue;
        window.qaCacheRecovery = { name, key, response: await cache.match(key) };
        await cache.delete(key);
        return;
      }
      throw new Error('Expected precached icon not found.');
    });
    await page.getByRole('button', { name: 'Check for updates' }).click();
    await page.getByText('Offline cache not ready.', { exact: true }).waitFor();
    await page.evaluate(async () => {
      const { name, key, response } = window.qaCacheRecovery;
      await (await caches.open(name)).put(key, response);
      delete window.qaCacheRecovery;
    });
    await page.getByRole('button', { name: 'Check for updates' }).click();
    await page.getByText('App and built-in art cached.', { exact: true }).waitFor();
    evidence.cache = 'Failed first-install retry and actual missing-cache readiness detection passed';
    evidence.exports = 'PNG/SVG privacy, full-project backup, physical PNG resolution, bounded 128x128 last page, cancellation, phone layout';
    const manifestHref = await page.locator('link[rel=manifest]').getAttribute('href');
    assert.equal(manifestHref, '/Dungeon-Mapper/manifest.webmanifest');
    assert.equal((await fetch(new URL(manifestHref, base))).status, 200);
    epoch = 2;
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); });
    await page.getByRole('button', { name: 'Update saved workspace' }).waitFor();
    const extra = await context.newPage();
    await extra.goto(base);
    await page.getByRole('button', { name: 'Update saved workspace' }).click();
    await page.getByText('Close other Dungeon Mapper tabs and player displays before updating.', { exact: true }).waitFor();
    await extra.close();
    // Hold a real IndexedDB transaction open while the new worker waits.
    await page.evaluate(() => {
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        const request = put.apply(this, args);
        if (String(args[1]).startsWith('project:')) {
          let released = false;
          window.qaReleaseSave = () => { released = true; };
          const store = this;
          const keepAlive = () => { if (!released) { const next = store.get('qa-keepalive'); next.onsuccess = keepAlive; } };
          request.addEventListener('success', keepAlive);
        }
        return request;
      };
    });
    await page.getByRole('button', { name: 'Project menu', exact: true }).click();
    await page.getByRole('button', { name: 'Project settings', exact: true }).click();
    await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('Saved through controlled update');
    await page.getByRole('button', { name: 'Close Project settings', exact: true }).click();
    await page.waitForFunction(() => typeof window.qaReleaseSave === 'function');
    let navigations = 0;
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
    await page.getByRole('button', { name: 'Update saved workspace' }).click();
    await page.getByText(/Wait until this project is saved before updating/).waitFor();
    assert.equal(navigations, 0);
    await page.evaluate(() => window.qaReleaseSave());
    await saved(page);
    const projectId = new URL(page.url()).searchParams.get('project');
    await page.getByRole('button', { name: 'Update saved workspace' }).click();
    await page.waitForEvent('load');
    await saved(page);
    assert.equal(new URL(page.url()).searchParams.get('project'), projectId);
    assert.equal(await page.locator('.project-identity strong').innerText(), 'Saved through controlled update');
    evidence.update = 'Waiting worker refuses other windows and uncommitted IndexedDB writes; explicit reload preserves project';
    await new Promise((resolve, reject) => { server.httpServer.closeAllConnections(); server.httpServer.close(error => error ? reject(error) : resolve()); });
    server = undefined;
    await assert.rejects(fetch(base));
    // WebKit's protocol offline emulation can reject SW navigations itself.
    // The sole HTTP origin is stopped for every engine, independently of emulation.
    if (engine !== 'webkit') await context.setOffline(true);
    await page.reload();
    await saved(page);
    await page.getByRole('button', { name: 'Project menu', exact: true }).click();
    await page.getByRole('button', { name: 'Project settings', exact: true }).click();
    await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('Offline saved revision');
    await page.getByRole('button', { name: 'Close Project settings', exact: true }).click();
    await saved(page);
    await page.getByRole('button', { name: 'Your maps', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: /^(Open|Continue) Offline saved revision$/ }).click();
    await saved(page);
    assert.equal(await page.locator('.project-identity strong').innerText(), 'Offline saved revision');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await dialog.getByLabel('Pixels per cell').selectOption('16');
    const offlinePNG = await download(page, dialog.getByRole('button', { name: 'Export PNG', exact: true }));
    assert(offlinePNG.bytes.length > 1000);
    evidence.offline = `Sole origin stopped${engine !== 'webkit' ? ', protocol offline enabled' : ''}; reload/edit/save/library/reopen/export passed`;
    evidence.pageErrors = errors;
    assert.deepEqual(errors, []);
    evidence.status = 'passed';
  } catch (error) {
    evidence.status = 'failed';
    evidence.error = error.stack;
    if (context?.pages()[0]) await context.pages()[0].screenshot({ path: join(output, `${engine}-failure.png`) });
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
    if (server) await new Promise(resolve => { server.httpServer.closeAllConnections(); server.httpServer.close(resolve); });
    results.push(evidence);
    await writeFile(join(output, 'ux08-results.json'), JSON.stringify(results, null, 2));
    console.log(`${engine}: ${evidence.status}${evidence.error ? `\n${evidence.error}` : ''}`);
  }
}
assert(results.every(result => result.status === 'passed'), JSON.stringify(results, null, 2));
