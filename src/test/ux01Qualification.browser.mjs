// Production-only native Playwright qualification. No application test hooks.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs
// QA_OUTPUT=/absolute/session/artifact/directory node src/test/ux01Qualification.browser.mjs
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { build } from 'esbuild';

const origin = process.env.QA_ORIGIN ?? 'http://127.0.0.1:5297/Dungeon-Mapper/';
assert(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'Only isolated loopback servers are allowed');
assert(process.env.QA_OUTPUT, 'QA_OUTPUT must designate a session artifact directory');
const output = resolve(process.env.QA_OUTPUT);
await mkdir(output, { recursive: true });
const playwright = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const fixtureModule = join(output, 'qualification-fixtures.mjs');
await build({ entryPoints: ['src/test/ux01Qualification.fixtures.ts'], bundle: true, platform: 'node', format: 'esm', outfile: fixtureModule });
const { fixtures } = await import(pathToFileURL(fixtureModule).href);
const results = {
  sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  origin, startedAt: new Date().toISOString(), node: process.version,
  fixtures: Object.fromEntries(Object.entries(fixtures).map(([key, value]) => [key, Buffer.byteLength(JSON.stringify(value))])),
  limitations: [
    'Headless desktop browser engines, not physical devices or Safari certification.',
    'No host-disk exhaustion. Chromium CDP quota override and injected failures are separately labeled.',
    'Offline cold reopen uses an isolated persistent profile, not a clean uncached installation.',
    'Real blocked upgrade requires requesting version 2 through an instrumented open; production schema currently requests version 1.',
  ],
  browsers: [],
};
const selected = (process.env.QA_ENGINES ?? 'chromium,firefox,webkit').split(',');
const filter = process.env.QA_SCENARIOS;
function assertProject(actual, expected) {
  const differences = [];
  function compare(a, b, path) {
    if (isDeepStrictEqual(a, b) || differences.length >= 30) return;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
      differences.push(path);
      return;
    }
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) compare(a[key], b[key], `${path}.${key}`);
  }
  compare(actual, expected, 'project');
  assert.equal(differences.length, 0, `Full semantic mismatch at: ${differences.join(', ')}`);
}
const saved = page => page.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
const failed = page => page.getByRole('status').filter({ hasText: 'Save failed' }).waitFor();
const mapName = page => page.getByRole('textbox', { name: 'Map name', exact: true });
const rawRead = (page, key = 'autosave') => page.evaluate(key => new Promise((resolve, reject) => {
  const request = indexedDB.open('dungeon-mapper');
  request.onerror = () => reject(request.error);
  request.onsuccess = () => {
    const db = request.result;
    const tx = db.transaction('maps', 'readonly');
    const get = tx.objectStore('maps').get(key);
    tx.oncomplete = () => { db.close(); resolve(get.result); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  };
}), key);
const seed = (page, raw) => page.evaluate(raw => new Promise((resolve, reject) => {
  const request = indexedDB.open('dungeon-mapper', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('maps');
  request.onerror = () => reject(request.error);
  request.onsuccess = () => {
    const db = request.result;
    const tx = db.transaction('maps', 'readwrite');
    tx.objectStore('maps').put(raw, 'autosave');
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  };
}), raw);
async function initialize(page, project = fixtures.rich) {
  await page.goto(origin);
  await page.waitForLoadState('networkidle');
  await seed(page, { schemaVersion: 1, storageRevision: 'qualification-seed', project });
  await page.reload();
  await saved(page);
}
async function edit(page, name) {
  await mapName(page).fill(name);
  await page.waitForFunction(name => document.querySelector('[role="status"]')?.textContent?.includes('Saving') ||
    document.querySelector('[role="status"]')?.textContent?.includes('Save failed') ||
    document.querySelector('[role="status"]')?.textContent?.includes('Save conflict') ||
    document.querySelector('input[aria-label="Map name"]')?.value === name, name);
  await saved(page);
  assert.equal((await rawRead(page)).project.levels[0].meta.name, name);
}
async function menu(page, title) {
  await page.getByRole('button', { name: 'More actions', exact: true }).click();
  await page.locator(`[role="menuitem"][title="${title}"]`).click();
}
async function download(page, action) {
  const pending = page.waitForEvent('download');
  await action();
  const item = await pending;
  const stream = await item.createReadStream();
  assert(stream, `Download failed: ${await item.failure()}`);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return { filename: item.suggestedFilename(), data: Buffer.concat(chunks) };
}
const pngSize = data => {
  assert.equal(data.subarray(1, 4).toString(), 'PNG');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), bytes: data.length };
};

for (const engine of selected) {
  const browser = await playwright[engine].launch({ headless: true });
  const record = { engine, version: browser.version(), scenarios: [] };
  results.browsers.push(record);
  async function scenario(name, action, options = {}) {
    if (filter && !new RegExp(filter).test(name)) return;
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', ...options });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const start = Date.now();
    try {
      const evidence = await action(page, context);
      record.scenarios.push({ name, status: evidence?.qualificationStatus ?? 'pass', elapsedMs: Date.now() - start, evidence, pageErrors: errors });
    } catch (error) {
      await page.screenshot({ path: join(output, `${engine}-${name.replace(/\W+/g, '-')}.png`) }).catch(() => {});
      record.scenarios.push({ name, status: 'fail', elapsedMs: Date.now() - start, error: error.stack, pageErrors: errors });
    } finally {
      console.log(`${engine}: ${name}: ${record.scenarios.at(-1).status}`);
      await context.close();
      await writeFile(join(output, 'results.json'), JSON.stringify(results, null, 2));
    }
  }

  await scenario('rich retention and checkpoint reload', async page => {
    await initialize(page);
    const before = await rawRead(page);
    page.once('dialog', dialog => dialog.dismiss());
    await menu(page, 'Clear current level');
    assert.deepEqual(await rawRead(page), before);
    page.once('dialog', dialog => dialog.accept());
    await menu(page, 'Clear current level');
    await saved(page);
    await edit(page, 'Edited after clear');
    await page.reload();
    await saved(page);
    const records = await rawRead(page, 'replacement-recovery');
    const checkpoint = records.find(record => record.reason === 'Clear level');
    assert(checkpoint, 'Named clear checkpoint must exist');
    assertProject(checkpoint.data.project, fixtures.rich);
    const active = (await rawRead(page)).project;
    assertProject(active.levels[1], fixtures.rich.levels[1]);
    assert(active.levels[0].tiles.every(row => row.every(tile => tile.type === 'empty')));
    return { checkpointBytes: Buffer.byteLength(JSON.stringify(checkpoint)), allLayersRetained: true };
  });

  await scenario('all-layer save round trip', async page => {
    await initialize(page);
    const expected = structuredClone(fixtures.rich);
    expected.levels[0].meta.name = 'Rich persisted edit';
    await edit(page, expected.levels[0].meta.name);
    await page.reload();
    await saved(page);
    assertProject((await rawRead(page)).project, expected);
    return { bytes: Buffer.byteLength(JSON.stringify(expected)), allLayers: true };
  });

  await scenario('legacy migration and bundled samples', async page => {
    await page.goto(origin);
    const legacy = `  ${JSON.stringify(fixtures.rich)}\n`;
    await page.evaluate(legacy => localStorage.setItem('dungeon-mapper-autosave', legacy), legacy);
    await page.reload();
    await saved(page);
    const migrated = await rawRead(page);
    assertProject(migrated.project, fixtures.rich);
    await page.reload();
    await saved(page);
    assert.deepEqual(await rawRead(page), migrated, 'Migration must not repeat');
    assert.equal(await page.evaluate(() => localStorage.getItem('dungeon-mapper-autosave')), legacy);
    const samples = [];
    for (const sample of fixtures.samples) {
      await seed(page, sample.project);
      await page.reload();
      await saved(page);
      const width = sample.project.levels[sample.project.activeLevelIndex].meta.width;
      const height = sample.project.levels[sample.project.activeLevelIndex].meta.height;
      assert.equal(await page.getByRole('combobox', { name: 'Map width in tiles' }).inputValue(), String(width));
      assert.equal(await page.getByRole('combobox', { name: 'Map height in tiles' }).inputValue(), String(height));
      samples.push({ id: sample.id, width, height, bytes: Buffer.byteLength(JSON.stringify(sample.project)) });
    }
    return { legacyBytesRetained: Buffer.byteLength(legacy), samples };
  });

  await scenario('rich fog recovery preview cancellation and commit', async page => {
    await page.goto(origin);
    const original = structuredClone(fixtures.rich);
    original.levels[0].fog = original.levels[0].fog.slice(0, 8);
    await seed(page, original);
    await page.reload();
    await page.getByRole('status').filter({ hasText: 'Could not restore your project' }).waitFor();
    await page.getByRole('button', { name: 'Review fog repair', exact: true }).click();
    await page.getByRole('region', { name: 'Fog repair preview' }).waitFor();
    await page.getByRole('button', { name: 'Cancel repair', exact: true }).click();
    assertProject(await rawRead(page), original);
    await page.getByRole('button', { name: 'Review fog repair', exact: true }).click();
    await page.getByRole('button', { name: 'Use repaired project', exact: true }).click();
    await saved(page);
    await page.reload();
    await saved(page);
    const expected = structuredClone(original);
    expected.levels[0].fog.push(...Array.from({ length: 8 }, () => Array(16).fill(true)));
    assertProject((await rawRead(page)).project, expected);
    const checkpoints = await rawRead(page, 'replacement-recovery');
    assertProject(checkpoints.find(record => record.reason === 'Fog repair').data, original);
    return { originalBytes: Buffer.byteLength(JSON.stringify(original)), repairedBytes: Buffer.byteLength(JSON.stringify(expected)) };
  });

  await scenario('two-tab stale save', async (page, context) => {
    await initialize(page);
    const other = await context.newPage();
    await other.goto(origin);
    await saved(other);
    await edit(page, 'Winning tab');
    await mapName(other).fill('Stale exportable work');
    await other.getByRole('status').filter({ hasText: 'Save conflict' }).waitFor();
    assert.equal(await mapName(other).inputValue(), 'Stale exportable work');
    const backup = await download(other, () => other.getByRole('button', { name: 'Export backup', exact: true }).click());
    assert.equal(JSON.parse(backup.data).project.levels[0].meta.name, 'Stale exportable work');
    assert.equal((await rawRead(page)).project.levels[0].meta.name, 'Winning tab');
    return { inMemoryBackupBytes: backup.data.length };
  });

  for (const failure of ['quota', 'abort']) {
    await scenario(`injected ${failure} transaction failure`, async page => {
      await initialize(page);
      const before = await rawRead(page);
      await page.evaluate(failure => {
        window.qaOriginalPut = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (...args) {
          if (args[1] === 'autosave' && failure === 'quota') throw new DOMException('Injected qualification quota', 'QuotaExceededError');
          const request = window.qaOriginalPut.apply(this, args);
          if (args[1] === 'autosave' && failure === 'abort') request.addEventListener('success', () => this.transaction.abort());
          return request;
        };
      }, failure);
      await mapName(page).fill(`Unsaved ${failure}`);
      await failed(page);
      assert.deepEqual(await rawRead(page), before);
      const backup = await download(page, () => page.getByRole('button', { name: 'Export backup', exact: true }).click());
      assert.equal(JSON.parse(backup.data).project.levels[0].meta.name, `Unsaved ${failure}`);
      await page.evaluate(() => { IDBObjectStore.prototype.put = window.qaOriginalPut; });
      await page.getByRole('button', { name: 'Retry save', exact: true }).click();
      await saved(page);
      assert.equal((await rawRead(page)).project.levels[0].meta.name, `Unsaved ${failure}`);
      return { classification: 'injected failure, not real device exhaustion', abortAfterPutSuccess: failure === 'abort' };
    });
  }

  for (const kind of ['unsupported', 'corrupt']) {
    await scenario(`${kind} original retention`, async page => {
      await page.goto(origin);
      const original = kind === 'unsupported'
        ? { schemaVersion: 999, futurePrivateData: ['Preserve exact original', 17] }
        : { schemaVersion: 1, project: { ...fixtures.rich, levels: [] } };
      await seed(page, original);
      await page.reload();
      await page.getByRole('status').filter({ hasText: 'Could not restore your project' }).waitFor();
      assert.equal(await mapName(page).count(), 0);
      const backup = await download(page, () => page.getByRole('button', { name: 'Download original', exact: true }).click());
      assert.deepEqual(JSON.parse(backup.data), original);
      assert.deepEqual(await rawRead(page), original);
      return { originalBytes: Buffer.byteLength(JSON.stringify(original)), downloadBytes: backup.data.length };
    });
  }

  await scenario('real blocked upgrade and late connection closure', async (page, context) => {
    await initialize(page);
    const holder = await context.newPage();
    await holder.goto(origin);
    await saved(holder);
    await holder.evaluate(() => new Promise(resolve => {
      const open = indexedDB.open('dungeon-mapper', 1);
      open.onsuccess = () => {
        window.qaHeldDB = open.result;
        window.qaVersionChanges = 0;
        open.result.onversionchange = () => { window.qaVersionChanges++; };
        resolve();
      };
    }));
    await page.addInitScript(() => {
      const nativeOpen = IDBFactory.prototype.open;
      IDBFactory.prototype.open = function (name, version) {
        return nativeOpen.call(this, name, name === 'dungeon-mapper' ? 2 : version);
      };
    });
    await page.reload();
    await page.getByText('Device storage is blocked by another tab.', { exact: false }).waitFor();
    assert.equal(await holder.evaluate(() => window.qaVersionChanges), 1);
    await holder.evaluate(() => window.qaHeldDB.close());
    const deleted = await holder.evaluate(() => new Promise(resolve => {
      const request = indexedDB.deleteDatabase('dungeon-mapper');
      request.onsuccess = () => resolve('deleted');
      request.onblocked = () => resolve('blocked');
      request.onerror = () => resolve(request.error.name);
    }));
    assert.equal(deleted, 'deleted', 'Late successful app connection must close after blocked-open rejection');
    return { nativeVersionchangeEvents: 1, nativeBlockedEvent: true, instrumentation: 'requested app open version 2 instead of 1', lateConnectionClosed: true };
  });

  await scenario('exports and bounded print pages', async page => {
    await initialize(page);
    const before = await rawRead(page);
    const json = await download(page, () => menu(page, 'Export JSON [Ctrl+S]'));
    // Compare the portable content independently from stored revision metadata.
    const portable = JSON.parse(json.data);
    const png = await download(page, () => menu(page, 'Export PNG [Ctrl+Shift+S]'));
    const svg = await download(page, () => menu(page, 'Export SVG [Ctrl+Alt+S]'));
    assert.match(svg.data.toString(), /<svg/);
    assert.match(svg.data.toString(), /<image/);
    await menu(page, 'Print-Optimized Export [Ctrl+Shift+P]');
    const dialog = page.getByRole('dialog', { name: 'Print-Optimized Export' });
    await dialog.getByLabel('Resolution (DPI)').selectOption('72');
    await dialog.getByLabel('Page Size').selectOption('letter');
    await dialog.getByLabel('Black & White / Print mode').check();
    const downloads = [];
    page.on('download', item => downloads.push(item));
    await dialog.getByRole('button', { name: 'Export PNG', exact: true }).click();
    await dialog.getByRole('button', { name: 'Export PNG', exact: true }).waitFor();
    assert.equal(downloads.length, 6);
    const pages = [];
    for (const item of downloads) {
      const bytes = await readFile(await item.path());
      pages.push({ filename: item.suggestedFilename(), ...pngSize(bytes) });
    }
    assert(pages.every(item => item.width <= 540 && item.height <= 720));
    assert.deepEqual(await rawRead(page), before, 'Export must not mutate persisted project');
    const evidence = { jsonBytes: json.data.length, png: pngSize(png.data), svgBytes: svg.data.length, pages };
    await writeFile(join(output, `${engine}-export-evidence.json`), JSON.stringify(evidence, null, 2));
    assertProject(portable.project, fixtures.rich);
    return evidence;
  });

  for (const size of ['medium', 'large']) {
    await scenario(`bounded ${size} project`, async page => {
      await initialize(page, fixtures[size]);
      const start = Date.now();
      await edit(page, `Saved ${size}`);
      const saveMs = Date.now() - start;
      await page.reload();
      await saved(page);
      const project = (await rawRead(page)).project;
      const evidence = { payloadBytes: Buffer.byteLength(JSON.stringify(project)), levels: project.levels.length, width: project.levels[0].meta.width, saveMs, storageEstimate: await page.evaluate(() => navigator.storage.estimate()) };
      await writeFile(join(output, `${engine}-${size}-evidence.json`), JSON.stringify(evidence, null, 2));
      const expected = structuredClone(fixtures[size]);
      expected.levels[0].meta.name = `Saved ${size}`;
      assertProject(project, expected);
      page.once('dialog', dialog => dialog.accept());
      await menu(page, 'Clear current level');
      await saved(page);
      await edit(page, `After ${size} checkpoint`);
      await page.reload();
      await saved(page);
      const checkpoint = (await rawRead(page, 'replacement-recovery')).find(record => record.reason === 'Clear level');
      assertProject(checkpoint.data.project, expected);
      evidence.fullCheckpointRetained = true;
      return evidence;
    });
  }

  if (engine === 'chromium') await scenario('Chromium quota override enforcement', async (page, context) => {
    await initialize(page);
    const before = await rawRead(page);
    const cdp = await context.newCDPSession(page);
    const usage = await cdp.send('Storage.getUsageAndQuota', { origin: new URL(origin).origin });
    await cdp.send('Storage.overrideQuotaForOrigin', { origin: new URL(origin).origin, quotaSize: 1 });
    const overridden = await cdp.send('Storage.getUsageAndQuota', { origin: new URL(origin).origin });
    await writeFile(join(output, 'quota-override-details.json'), JSON.stringify({ usage, overridden }, null, 2));
    // Exceed Chromium's cached small-write quota allowance without consuming host disk.
    // This is synthetic padding to exercise native browser enforcement, not a rich fixture.
    await page.evaluate(() => {
      const payload = new Uint8Array(16 * 1024 * 1024);
      for (let offset = 0; offset < payload.length; offset += 65536) crypto.getRandomValues(payload.subarray(offset, offset + 65536));
      window.qaOriginalPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (args[1] === 'autosave') args[0] = { ...args[0], qualificationQuotaPadding: payload };
        return window.qaOriginalPut.apply(this, args);
      };
    });
    await mapName(page).fill('Browser enforced quota');
    await page.waitForFunction(() => {
      const text = document.querySelector('[role="status"]')?.textContent ?? '';
      return text.includes('Save failed') || text.includes('Saved on this device');
    });
    await saved(page).catch(() => {});
    const actual = await rawRead(page);
    if (actual.storageRevision !== before.storageRevision) {
      assert.equal(actual.project.levels[0].meta.name, 'Browser enforced quota');
      assert.equal(actual.qualificationQuotaPadding?.byteLength, 16 * 1024 * 1024);
      const observed = await cdp.send('Storage.getUsageAndQuota', { origin: new URL(origin).origin });
      await page.evaluate(() => { IDBObjectStore.prototype.put = window.qaOriginalPut; });
      await cdp.send('Storage.overrideQuotaForOrigin', { origin: new URL(origin).origin });
      return { qualificationStatus: 'unsupported', classification: 'CDP override reports active but this browser permits the native write; no native quota-failure claim', usage, overridden, observed, syntheticPaddingBytes: 16 * 1024 * 1024 };
    }
    await failed(page);
    assert.deepEqual(await rawRead(page), before);
    const failureText = await page.getByRole('status').innerText();
    await page.evaluate(() => { IDBObjectStore.prototype.put = window.qaOriginalPut; });
    await cdp.send('Storage.overrideQuotaForOrigin', { origin: new URL(origin).origin });
    await page.getByRole('button', { name: 'Retry save', exact: true }).click();
    await saved(page);
    return { classification: 'browser quota override with 16 MiB synthetic incompressible padding, not host-disk exhaustion or realistic fixture', before: usage, overridden, failureText };
  });

  await browser.close();
  if (!filter || /offline/.test(filter)) {
    const profile = await mkdtemp(join(tmpdir(), 'dungeon-qa-'));
    let context;
    try {
      context = await playwright[engine].launchPersistentContext(profile, { headless: true });
      let page = await context.newPage();
      page.setDefaultTimeout(15000);
      await initialize(page);
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
      });
      const serviceWorker = await page.evaluate(() => navigator.serviceWorker.controller.scriptURL);
      const manifest = await page.evaluate(async () => {
        const url = document.querySelector('link[rel="manifest"]').href;
        const response = await fetch(url);
        const text = await response.text();
        return { url, status: response.status, contentType: response.headers.get('content-type'), isJSON: text.trim().startsWith('{') };
      });
      await context.setOffline(true);
      await page.reload();
      await saved(page);
      await edit(page, 'Offline durable edit');
      await context.close();
      context = await playwright[engine].launchPersistentContext(profile, { headless: true, offline: true });
      page = await context.newPage();
      page.setDefaultTimeout(15000);
      await page.goto(origin);
      await saved(page);
      assert.equal(await mapName(page).inputValue(), 'Offline durable edit');
      record.scenarios.push({ name: 'production offline reload and process cold reopen', status: 'pass', evidence: { serviceWorker, manifest, browserRestarted: true } });
    } catch (error) {
      const emulationUnsupported = engine === 'webkit' && error.message.includes('WebKit encountered an internal error');
      record.scenarios.push({ name: 'production offline reload and process cold reopen', status: emulationUnsupported ? 'unsupported' : 'fail', error: error.stack });
    } finally {
      if (context) await context.close();
      await rm(profile, { recursive: true, force: true });
      await writeFile(join(output, 'results.json'), JSON.stringify(results, null, 2));
    }
  }
}
console.log(JSON.stringify(results.browsers.map(browser => ({
  engine: browser.engine, version: browser.version,
  passed: browser.scenarios.filter(scenario => scenario.status === 'pass').length,
  failed: browser.scenarios.filter(scenario => scenario.status === 'fail').map(scenario => scenario.name),
})), null, 2));
process.exitCode = results.browsers.some(browser => browser.scenarios.some(scenario => scenario.status === 'fail')) ? 1 : 0;
