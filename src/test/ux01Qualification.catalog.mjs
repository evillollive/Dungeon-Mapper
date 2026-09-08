// Production catalog qualification using only UI and isolated native IndexedDB.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { build } from 'esbuild';

assert(process.env.QA_OUTPUT, 'Set QA_OUTPUT to a session artifact directory');
const output = process.env.QA_OUTPUT;
await mkdir(output, { recursive: true });
const origin = process.env.QA_ORIGIN ?? 'http://127.0.0.1:5297/Dungeon-Mapper/';
assert.equal(new URL(origin).hostname, '127.0.0.1');
const playwright = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const fixturePath = join(output, 'catalog-fixtures.mjs');
await build({ entryPoints: ['src/test/ux01Qualification.fixtures.ts'], bundle: true, platform: 'node', format: 'esm', outfile: fixturePath });
const { fixtures } = await import(pathToFileURL(fixturePath));
const project = name => ({ ...structuredClone(fixtures.rich), name, sourceProjectId: 'portable-provenance' });
const envelope = (id, name) => ({
  schemaVersion: 1, localProjectId: id, storageRevision: `revision-${id}`, project: project(name),
  createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z',
});
const checkpoints = (id, count, source) => Array.from({ length: count }, (_, i) => ({
  id: `${id}-checkpoint-${i}`, projectId: id, savedAt: '2026-09-07T00:00:00Z', reason: 'Clear level', data: source,
}));
const equal = (a, b, message) => assert(isDeepStrictEqual(a, b), message ?? 'Complete native data differs');
const selected = page => new URL(page.url()).searchParams.get('project');
const saved = page => page.getByText('Saved on this device', { exact: true }).waitFor();
const title = page => page.getByRole('textbox', { name: 'Project name', exact: true });
const field = page => page.getByRole('textbox', { name: 'Map name', exact: true });
async function records(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('dungeon-mapper', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('maps');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('maps', 'readonly');
      const store = tx.objectStore('maps');
      const keys = store.getAllKeys();
      const values = store.getAll();
      tx.oncomplete = () => { db.close(); resolve(Object.fromEntries(keys.result.map((key, i) => [key, values.result[i]]))); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }));
}
async function writeRecords(page, values) {
  await page.evaluate(values => new Promise((resolve, reject) => {
    const request = indexedDB.open('dungeon-mapper', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('maps');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('maps', 'readwrite');
      for (const [key, value] of Object.entries(values)) tx.objectStore('maps').put(value, key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }), values);
}
async function setup(page, extra = {}) {
  await page.goto(origin);
  await page.waitForLoadState('networkidle');
  await writeRecords(page, { 'project:a': envelope('a', 'Project A'), 'project:b': envelope('b', 'Project B'), ...extra });
  await page.goto(`${origin}?project=a`);
  await saved(page);
}
async function switchTo(page, name) {
  await page.getByRole('button', { name: 'Switch project', exact: true }).click();
  await page.getByRole('button', { name: `Open ${name}`, exact: true }).click();
  await saved(page);
}
async function backup(page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const item = await pending;
  return JSON.parse(await readFile(await item.path(), 'utf8')).project;
}
async function clear(page) {
  await page.getByRole('button', { name: 'More actions', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Clear current level', exact: true }).click();
}
async function previewFile(page, candidate) {
  await page.getByRole('button', { name: 'Recovery copies', exact: true }).click();
  await page.getByLabel('Preview a recovery file').setInputFiles({ name: 'qa-recovery.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, project: candidate })) });
  await page.getByRole('region', { name: 'Recovery preview' }).waitFor();
}
async function pendingImage(page) {
  await page.getByRole('tab', { name: 'Advanced mode', exact: true }).click();
  await page.evaluate(() => {
    const original = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function (file) {
      const reader = this;
      window.qaReleaseImage = () => original.call(reader, file);
      reader.addEventListener('load', () => { window.qaImageLoaded = true; });
    };
  });
  await page.locator('input[type="file"][accept="image/png,image/jpeg,image/webp"]').setInputFiles('public/pwa-512x512.png');
  await page.waitForFunction(() => typeof window.qaReleaseImage === 'function');
}
const results = { applicationSourceSha: process.env.QA_SOURCE_SHA, origin, engines: [] };
for (const engine of (process.env.QA_ENGINES ?? 'chromium,firefox,webkit').split(',')) {
  const browser = await playwright[engine].launch({ headless: true, ...(engine === 'firefox' ? { firefoxUserPrefs: { 'accessibility.tabfocus': 7 } } : {}) });
  const entry = { engine, version: browser.version(), scenarios: [] };
  results.engines.push(entry);
  async function scenario(name, action, options = {}) {
    if (process.env.QA_SCENARIOS && !new RegExp(process.env.QA_SCENARIOS).test(name)) return;
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', ...options });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    const dialogs = [];
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.accept(); });
    try {
      const evidence = await action(page, context, dialogs);
      entry.scenarios.push({ name, status: 'pass', evidence });
    } catch (error) {
      await page.screenshot({ path: join(output, `${engine}-${name.replace(/\W+/g, '-')}.png`), fullPage: true });
      entry.scenarios.push({ name, status: 'fail', error: error.stack, dialogs });
    } finally {
      await context.close();
      await writeFile(join(output, 'catalog-results.json'), JSON.stringify(results, null, 2));
      console.log(`${engine}: ${name}: ${entry.scenarios.at(-1).status}`);
    }
  }

  await scenario('concurrent migration retains all source records', async (page, context) => {
    await page.goto(origin);
    await page.waitForLoadState('networkidle');
    const original = project('IndexedDB source');
    const sources = { autosave: original, 'previous-save': { savedAt: '2026-09-07T00:00:00Z', data: original }, 'replacement-recovery': [{ savedAt: '2026-09-07T00:00:00Z', data: original, reason: 'Legacy checkpoint' }] };
    await writeRecords(page, sources);
    const legacy = ` \n${JSON.stringify(project('Lower-priority localStorage'))}\n`;
    await page.evaluate(legacy => localStorage.setItem('dungeon-mapper-autosave', legacy), legacy);
    const other = await context.newPage();
    await Promise.all([page.goto(origin), other.goto(origin)]);
    await saved(page);
    await saved(other);
    const raw = await records(page);
    assert.equal(selected(page), selected(other));
    assert.equal(raw['project-migration-v1'], selected(page));
    assert.equal(Object.keys(raw).filter(key => key.startsWith('project:')).length, 1);
    equal(raw[`project:${selected(page)}`].project, original);
    for (const [key, value] of Object.entries(sources)) equal(raw[key], value);
    assert.equal(await page.evaluate(() => localStorage.getItem('dungeon-mapper-autosave')), legacy);
    return { nativeConcurrentMigration: true, distinctProjectRecords: 1, allOriginalSourcesRetained: true };
  });

  await scenario('migration transaction abort and idempotent retry', async page => {
    await page.goto(origin);
    await page.waitForLoadState('networkidle');
    const original = project('Abort-safe source');
    await writeRecords(page, { autosave: original });
    await page.addInitScript(() => {
      const add = IDBObjectStore.prototype.add;
      IDBObjectStore.prototype.add = function (...args) {
        const request = add.apply(this, args);
        if (args[1] === 'project-migration-v1' && sessionStorage.getItem('qa-migration-aborted') !== 'yes') {
          request.addEventListener('success', () => {
            sessionStorage.setItem('qa-migration-aborted', 'yes');
            this.transaction.abort();
          });
        }
        return request;
      };
    });
    await page.goto(origin);
    await page.getByText('Could not restore your project', { exact: true }).waitFor();
    const failed = await records(page);
    equal(failed.autosave, original);
    assert.equal(Object.keys(failed).filter(key => key.startsWith('project:')).length, 0);
    assert.equal(failed['project-migration-v1'], undefined);
    await page.reload();
    await saved(page);
    const id = selected(page);
    await page.reload();
    await saved(page);
    assert.equal(selected(page), id);
    equal((await records(page))[`project:${id}`].project, original);
    return { abortAfterMarkerRequestSuccess: true, noPartialProjectOrMarker: true, retryStableIdentity: true };
  });

  await scenario('independent selection new imports and project title', async (page, context) => {
    await setup(page);
    const before = await records(page);
    await switchTo(page, 'Project B');
    assert.equal(selected(page), 'b');
    await title(page).fill('B renamed');
    await saved(page);
    assert.equal(await field(page).inputValue(), fixtures.rich.levels[0].meta.name);
    const other = await context.newPage();
    await other.goto(`${origin}?project=a`);
    await saved(other);
    await title(other).fill('A independently renamed');
    await saved(other);
    assert.equal(selected(page), 'b');
    await page.reload();
    await saved(page);
    assert.equal(await title(page).inputValue(), 'B renamed');
    const latest = await records(page);
    equal(latest['project:a'].project.levels, before['project:a'].project.levels);
    equal(latest['project:b'].project.levels, before['project:b'].project.levels);
    await page.getByRole('button', { name: 'New map', exact: true }).click();
    await page.waitForURL(url => !['a', 'b'].includes(url.searchParams.get('project')));
    await saved(page);
    const ids = new Set(['a', 'b', selected(page)]);
    for (let i = 0; i < 3; i++) {
      const previousId = selected(page);
      await page.locator('.map-header input[type=file]').setInputFiles({ name: 'import.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, project: project('Imported rich') })) });
      await page.waitForURL(url => url.searchParams.get('project') !== previousId);
      await saved(page);
      ids.add(selected(page));
      equal((await records(page))[`project:${selected(page)}`].project, project('Imported rich'));
    }
    assert.equal(ids.size, 6);
    const final = await records(page);
    equal(final['project:a'], latest['project:a']);
    equal(final['project:b'], latest['project:b']);
    return { distinctIdentities: ids.size, portableProvenancePreserved: true, independentLevelName: true };
  });

  await scenario('general preview cancel restore and predecessor', async page => {
    await setup(page);
    const before = await records(page);
    const candidate = project('Whole rich restore');
    candidate.levels[1].notes[0].description = 'New private recovery description';
    await previewFile(page, candidate);
    await page.getByRole('button', { name: 'Cancel preview', exact: true }).click();
    equal(await records(page), before);
    await page.getByLabel('Preview a recovery file').setInputFiles({ name: 'recovery.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(candidate)) });
    await page.getByRole('button', { name: 'Restore whole project', exact: true }).click();
    await page.getByRole('region', { name: 'Recovery preview' }).waitFor({ state: 'hidden' });
    await page.reload();
    await saved(page);
    assert.equal(selected(page), 'a');
    const after = await records(page);
    equal(after['project:a'].project, candidate);
    equal(after['recovery:a'][0].data, before['project:a']);
    equal(after['project:b'], before['project:b']);
    return { completeCandidateAndPredecessor: true, stableLocalId: 'a' };
  });

  await scenario('general restore quota failure and stale confirmation', async (page, context) => {
    await setup(page);
    const before = await records(page);
    await previewFile(page, project('Restore must not apply'));
    await page.evaluate(() => {
      window.qaPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (String(args[1]).startsWith('project:')) throw new DOMException('Injected recovery quota', 'QuotaExceededError');
        return window.qaPut.apply(this, args);
      };
    });
    await page.getByRole('button', { name: 'Restore whole project', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Injected recovery quota' }).waitFor();
    equal(await records(page), before);
    assert.equal(await title(page).inputValue(), 'Project A');
    await page.getByRole('region', { name: 'Recovery preview' }).waitFor();
    await page.evaluate(() => { IDBObjectStore.prototype.put = window.qaPut; });
    const other = await context.newPage();
    await other.goto(`${origin}?project=a`);
    await saved(other);
    await title(other).fill('Concurrent winner');
    await saved(other);
    await page.getByRole('button', { name: 'Restore whole project', exact: true }).click();
    await page.getByText('Save conflict', { exact: true }).waitFor();
    await page.getByRole('region', { name: 'Recovery preview' }).waitFor();
    assert.equal((await records(page))['project:a'].project.name, 'Concurrent winner');
    return { injectedQuotaAtomic: true, staleRestoreRejected: true };
  });

  await scenario('capacity refusal ordinary save scoped cleanup', async (page, context, dialogs) => {
    const a = envelope('a', 'Project A');
    const b = envelope('b', 'Project B');
    const legacy = { schemaVersion: 999, original: 'Keep legacy archive' };
    await setup(page, { 'recovery:a': checkpoints('a', 20, a), 'recovery:b': checkpoints('b', 2, b), autosave: legacy });
    const before = await records(page);
    await clear(page);
    assert(dialogs.some(text => text.includes('20 durable checkpoints')));
    equal(await backup(page), a.project, 'Full-capacity refusal mutated in-memory content');
    equal(await records(page), before);
    await title(page).fill('Ordinary save at capacity');
    await saved(page);
    const ordinary = await records(page);
    assert.equal(ordinary['project:a'].project.name, 'Ordinary save at capacity');
    equal(ordinary['recovery:a'], before['recovery:a']);
    await page.getByRole('button', { name: 'Recovery copies', exact: true }).click();
    await page.getByRole('button', { name: 'Delete checkpoint 2', exact: true }).click();
    await page.getByRole('button', { name: 'Delete checkpoint 21', exact: true }).waitFor({ state: 'hidden' });
    const cleaned = await records(page);
    assert.equal(cleaned['recovery:a'].length, 19);
    equal(cleaned['recovery:a'], before['recovery:a'].slice(0, 19));
    equal(cleaned['project:b'], before['project:b']);
    equal(cleaned['recovery:b'], before['recovery:b']);
    equal(cleaned.autosave, legacy);
    await page.getByRole('button', { name: 'Close recovery copies', exact: true }).click();
    await clear(page);
    await saved(page);
    const final = await records(page);
    assert.equal(final['recovery:a'].length, 20);
    equal(final['recovery:a'].at(-1).data, ordinary['project:a']);
    return { limit: 20, automaticEvictions: 0, ordinarySaved: true, scopedDeletion: true };
  });

  await scenario('concurrent capacity commit recheck and stale deletion', async (page, context) => {
    const a = envelope('a', 'Project A');
    await setup(page, { 'recovery:a': checkpoints('a', 19, a) });
    const other = await context.newPage();
    await other.goto(`${origin}?project=a`);
    await saved(other);
    // Native archive-only contention deliberately isolates the transaction's count recheck from project revision CAS.
    await writeRecords(other, { 'recovery:a': checkpoints('a', 20, a) });
    const before = await records(page);
    await clear(page);
    await page.getByText('Save failed', { exact: true }).waitFor();
    equal(await records(page), before, 'Transaction capacity recheck must preserve committed project and all 20 copies');
    await page.reload();
    await saved(page);
    await page.getByRole('button', { name: 'Recovery copies', exact: true }).click();
    await other.getByRole('button', { name: 'Recovery copies', exact: true }).click();
    other.on('dialog', dialog => dialog.accept());
    await other.getByRole('button', { name: 'Delete checkpoint 1', exact: true }).click();
    await other.getByRole('button', { name: 'Delete checkpoint 20', exact: true }).waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Delete checkpoint 1', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'changed or was deleted' }).waitFor();
    assert.equal((await records(page))['recovery:a'].length, 19);
    return { archiveOnlyNativeRace: true, commitRechecked: true, staleDeletionRejected: true };
  });

  for (const transition of ['switch', 'restore', 'failed switch']) {
    await scenario(`pending image across ${transition}`, async (page, context, dialogs) => {
      await setup(page);
      const before = await records(page);
      await pendingImage(page);
      if (transition === 'switch') await switchTo(page, 'Project B');
      else if (transition === 'restore') {
        await previewFile(page, project('Restored A'));
        await page.getByRole('button', { name: 'Restore whole project', exact: true }).click();
        await page.getByRole('region', { name: 'Recovery preview' }).waitFor({ state: 'hidden' });
      } else {
        await page.getByRole('button', { name: 'Switch project', exact: true }).click();
        await page.evaluate(() => {
          const get = IDBObjectStore.prototype.get;
          IDBObjectStore.prototype.get = function (key) {
            const request = get.call(this, key);
            if (key === 'project:b') {
              const tx = this.transaction;
              const store = this;
              window.qaReleaseSwitch = () => tx.abort();
              const keepAlive = () => {
                const pending = get.call(store, 'qa-transaction-keepalive');
                pending.onsuccess = keepAlive;
              };
              request.addEventListener('success', keepAlive);
            }
            return request;
          };
        });
        await page.getByRole('button', { name: 'Open Project B', exact: true }).click();
        await page.waitForFunction(() => typeof window.qaReleaseSwitch === 'function');
      }
      await page.evaluate(() => window.qaReleaseImage());
      await page.waitForFunction(() => window.qaImageLoaded === true);
      if (transition === 'failed switch') {
        await page.evaluate(() => window.qaReleaseSwitch());
        await page.getByText('Save failed', { exact: true }).waitFor();
        assert.equal(selected(page), 'a');
        const pending = await backup(page);
        assert.notEqual(pending.levels[0].backgroundImage.dataUrl, before['project:a'].project.levels[0].backgroundImage.dataUrl);
        equal((await records(page))['project:a'], before['project:a']);
        await page.getByRole('button', { name: 'Retry save', exact: true }).click();
        await saved(page);
        equal((await records(page))['project:a'].project, pending);
      } else {
        assert(dialogs.some(text => text.includes('project changed') || text.includes('no longer open')), 'Late callback must report rejection');
        const expected = transition === 'switch' ? before['project:b'].project : project('Restored A');
        equal(await backup(page), expected);
      }
      equal((await records(page))['project:b'], before['project:b'], 'Pending image must never alter B');
      return { transition, fullContentChecked: true, lateCallbackWasRealFileReader: true };
    });
  }

  for (const transition of ['switch', 'restore']) {
    await scenario(`pending project import across ${transition}`, async (page, context, dialogs) => {
      await setup(page);
      await page.evaluate(() => {
        const original = FileReader.prototype.readAsText;
        FileReader.prototype.readAsText = function (...args) {
          const reader = this;
          window.qaReleaseText = () => original.apply(reader, args);
          reader.addEventListener('load', () => { window.qaTextLoaded = true; });
        };
      });
      await page.locator('.map-header input[type=file]').setInputFiles({ name: 'late-import.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project('Must not create a late project'))) });
      await page.waitForFunction(() => typeof window.qaReleaseText === 'function');
      if (transition === 'switch') await switchTo(page, 'Project B');
      else {
        await previewFile(page, project('Restored before late import'));
        await page.getByRole('button', { name: 'Restore whole project', exact: true }).click();
        await page.getByRole('region', { name: 'Recovery preview' }).waitFor({ state: 'hidden' });
      }
      const before = await records(page);
      const id = selected(page);
      await page.evaluate(() => window.qaReleaseText());
      await page.waitForFunction(() => window.qaTextLoaded === true);
      assert(dialogs.some(text => text.includes('project changed')));
      equal(await records(page), before);
      assert.equal(selected(page), id);
      return { realFileReaderDelayed: true, priorCallbackRejected: true, noExtraProjectCreated: true };
    });
  }

  for (const invalid of ['missing', 'corrupt']) {
    await scenario(`${invalid} selected project can open healthy project`, async page => {
      await setup(page);
      if (invalid === 'corrupt') await writeRecords(page, { 'project:a': { ...envelope('a', 'Broken A'), project: { levels: [] } } });
      const target = invalid === 'missing' ? 'missing-id' : 'a';
      await page.goto(`${origin}?project=${target}`);
      await page.getByText('Could not restore your project', { exact: true }).waitFor();
      const before = await records(page);
      await switchTo(page, 'Project B');
      assert.equal(selected(page), 'b');
      equal(await records(page), before);
      return { reachableWithoutURLWorkaround: true, originalUnchanged: true };
    });
  }

  await scenario('external backup after isolated storage deletion', async page => {
    await setup(page);
    const original = await backup(page);
    await page.goto(`${origin}favicon.svg`);
    await page.evaluate(() => new Promise((resolve, reject) => {
      localStorage.clear();
      const request = indexedDB.deleteDatabase('dungeon-mapper');
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Isolated profile database deletion blocked'));
    }));
    await page.goto(origin);
    await field(page).waitFor();
    await page.locator('.map-header input[type=file]').setInputFiles({ name: 'external-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, project: original })) });
    await saved(page);
    equal((await records(page))[`project:${selected(page)}`].project, original);
    return { classification: 'explicit isolated-profile storage deletion, not unpredictable device eviction', fullBackupRestored: true };
  });

  for (const scale of ['390x844', '200-percent']) {
    await scenario(`chooser recovery keyboard ${scale}`, async page => {
      await setup(page, { 'recovery:a': checkpoints('a', 20, envelope('a', 'Project A')) });
      const observations = [];
      async function keyboard(name) {
        const button = page.getByRole('button', { name, exact: true });
        await button.waitFor();
        const focusTrace = [];
        for (let i = 0; i < 220; i++) {
          if (await button.evaluate(element => element === document.activeElement)) {
            const bounds = await button.boundingBox();
            const viewport = page.viewportSize();
            observations.push({ name, tabs: i, bounds, viewport });
            assert(bounds && bounds.x >= -1 && bounds.y >= -1 && bounds.x + bounds.width <= viewport.width + 1 && bounds.y + bounds.height <= viewport.height + 1,
              `Keyboard focus is clipped for ${name}: ${JSON.stringify(bounds)} in ${JSON.stringify(viewport)}`);
            await page.keyboard.press('Enter');
            return;
          }
          focusTrace.push(await page.evaluate(() => ({ tag: document.activeElement?.tagName, name: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.slice(0, 50) })));
          await page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab');
        }
        await writeFile(join(output, `${engine}-${scale}-focus-trace.json`), JSON.stringify(focusTrace, null, 2));
        await writeFile(join(output, `${engine}-${scale}-focus-target.json`), JSON.stringify(await button.evaluate(element => ({
          html: element.outerHTML,
          parents: Array.from((function* () { let p = element.parentElement; while (p) { yield p; p = p.parentElement; } })()).map(parent => ({
            tag: parent.tagName, class: parent.className, inert: parent.inert, role: parent.getAttribute('role'), tabindex: parent.getAttribute('tabindex'),
          })),
        })), null, 2));
        for (let i = 0; i < 220; i++) {
          await page.keyboard.press(engine === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab');
          if (await button.evaluate(element => element === document.activeElement)) {
            const bounds = await button.boundingBox();
            const viewport = page.viewportSize();
            observations.push({ name, reverseTabs: i + 1, forwardTraversalDidNotWrap: true, bounds, viewport });
            assert(bounds && bounds.x >= -1 && bounds.y >= -1 && bounds.x + bounds.width <= viewport.width + 1 && bounds.y + bounds.height <= viewport.height + 1, `Reverse focus clipped for ${name}`);
            await page.keyboard.press('Enter');
            return;
          }
        }
        throw new Error(`Keyboard cannot reach ${name}`);
      }
      await keyboard('Switch project');
      await keyboard('Open Project B');
      await saved(page);
      assert.equal(selected(page), 'b');
      await keyboard('Switch project');
      await keyboard('Open Project A');
      await saved(page);
      await keyboard('Recovery copies');
      await page.getByRole('region', { name: 'Recovery manager' }).waitFor();
      await page.screenshot({ path: join(output, `${engine}-${scale}-recovery-open.png`), fullPage: true });
      await keyboard('Preview copy 1');
      await keyboard('Cancel preview');
      await keyboard('Delete checkpoint 1');
      await page.getByRole('button', { name: 'Delete checkpoint 20', exact: true }).waitFor({ state: 'hidden' });
      await keyboard('Preview copy 1');
      await page.screenshot({ path: join(output, `${engine}-${scale}-preview.png`), fullPage: true });
      await keyboard('Restore whole project');
      await page.getByRole('region', { name: 'Recovery preview' }).waitFor({ state: 'hidden' });
      const pending = page.waitForEvent('download');
      await keyboard('Export backup');
      const downloaded = await pending;
      equal(JSON.parse(await readFile(await downloaded.path(), 'utf8')).project, project('Project A'));
      const layout = await page.evaluate(() => ({ innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, bodyScrollHeight: document.body.scrollHeight }));
      assert(layout.scrollWidth <= layout.clientWidth + 1, `Document horizontal overflow: ${JSON.stringify(layout)}`);
      return { scale, zoomTechnique: scale === '200-percent' ? '720x450 CSS viewport with deviceScaleFactor 2 as 200-percent reflow proxy for 1440x900; not native browser-menu zoom certification' : 'desktop engine viewport', keyboardTechnique: engine === 'webkit' ? 'Option+Tab to include controls per WebKit platform convention' : engine === 'firefox' ? 'Tab with accessibility.tabfocus=7' : 'Tab', observations, layout };
    }, { viewport: scale === '390x844' ? { width: 390, height: 844 } : { width: 720, height: 450 }, deviceScaleFactor: scale === '200-percent' ? 2 : 1 });
  }

  await browser.close();
}
console.log(JSON.stringify(results.engines.map(engine => ({ engine: engine.engine, passed: engine.scenarios.filter(s => s.status === 'pass').length, failures: engine.scenarios.filter(s => s.status === 'fail').map(s => s.name) })), null, 2));
process.exitCode = results.engines.some(engine => engine.scenarios.some(s => s.status === 'fail')) ? 1 : 0;
