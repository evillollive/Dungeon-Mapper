// Uses an existing external Playwright SDK, without adding repository dependencies.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
// QA_OUTPUT=/tmp/ux02-library node src/test/ux02Library.browser.mjs
// Or import runUx02Library(browser, origin) from your own browser runner.
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function runUx02Library(browser, origin = 'http://127.0.0.1:5192/Dungeon-Mapper/') {
  const results = [];
  const output = process.env.QA_OUTPUT;
  if (output) await mkdir(output, { recursive: true });
  const scenario = async (name, run) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.route('**/repository-probe.html', route => route.fulfill({
        contentType: 'text/html', body: '<title>Isolated library QA</title>',
      }));
      await page.goto(`${origin}repository-probe.html`);
      const evidence = await run(page, context);
      assert.deepEqual(errors, [], 'Uncaught browser errors');
      results.push({ name, status: 'passed', evidence });
    } catch (error) {
      results.push({ name, status: 'failed', error: error.stack, browserErrors: errors });
      if (output) await page.screenshot({ path: join(output, `${browser.browserType().name()}-${results.length}-failure.png`), fullPage: true }).catch(() => {});
    } finally {
      await context.close();
      console.log(`${browser.browserType().name()}: ${name}: ${results.at(-1).status}`);
      if (output) await writeFile(join(output, `${browser.browserType().name()}-library-results.json`), JSON.stringify(results, null, 2));
    }
  };
  const saved = async page => {
    await page.getByRole('heading', { name: 'Your maps', exact: true }).waitFor({ state: 'detached' });
    await page.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
  };
  const library = async page => {
    await page.getByRole('button', { name: 'Your maps', exact: true }).click();
    await page.getByRole('heading', { name: 'Your maps', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Refresh library', exact: true }).waitFor({ state: 'visible' });
  };
  const catalog = page => page.evaluate(async () => (await import('./src/utils/projectRepository.ts')).listProjects());
  const card = (page, name) => page.getByRole('article', { name, exact: true });
  const manage = async (page, name, action) => {
    const item = card(page, name);
    if (!await item.locator('details').getAttribute('open').then(value => value !== null)) {
      await item.locator('summary').click();
    }
    await item.getByRole('button', { name: action, exact: true }).click();
  };
  const upload = (page, data) => page.getByLabel('Import project', { exact: true }).setInputFiles({
    name: 'qa-backup.json', mimeType: 'application/json',
    buffer: Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)),
  });
  const richFixture = page => page.evaluate(async () => {
    const { createDefaultMap } = await import('./src/hooks/mapStateUtils.ts');
    const blob = await (await fetch('./pwa-192x192.png')).blob();
    const image = await new Promise(resolve => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob);
    });
    const levels = ['Upper crypt', 'Lower crypt'].map((name, index) => {
      const map = createDefaultMap(name);
      map.meta = { name, width: 8, height: 8, tileSize: 20, theme: 'dungeon' };
      map.tiles = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ({ type: 'floor' })));
      map.fog = Array.from({ length: 8 }, (_, y) => Array.from({ length: 8 }, (_, x) => x > 4 && y > 4));
      map.explored = Array.from({ length: 8 }, () => Array(8).fill(true));
      map.dynamicFogEnabled = false;
      map.notes = [{ id: 1, x: 1, y: 1, label: 'Secret room', description: 'Synthetic DM-only fixture', kind: 'room' }];
      map.tokens = [{ id: 1, kind: 'monster', x: 2, y: 2, size: 1, label: 'Fixture', icon: 'M', color: '#123456' }];
      map.initiative = [1];
      map.markers = [{ id: 1, x: 3, y: 3, shape: 'diamond', color: '#123456', size: 1 }];
      map.lightSources = [{ id: 1, x: 2, y: 2, radius: 4, label: 'Lamp', color: '#ffffff' }];
      map.stamps = [{ id: 1, stampId: 'qa-image', x: 4, y: 4, rotation: 45, scale: 0.5, opacity: 0.7, locked: true, flipX: true, flipY: false }];
      map.annotations = [{ id: 1, kind: 'gm', points: [{ x: 1, y: 1 }, { x: 3, y: 2 }], width: 0.2, color: '#333333' }];
      map.wallSegments = [{ id: 1, points: [{ x: 2, y: 3 }, { x: 5, y: 3 }], thickness: 0.1, color: '#333333' }];
      map.pathSegments = [{ id: 1, points: [{ x: 2, y: 4 }, { x: 5, y: 4 }], width: 0.5, color: '#333333' }];
      map.rivers = [{ id: 1, controlPoints: [{ x: 1, y: 6 }, { x: 7, y: 6 }], width: 2, flowDirection: 45, type: 'underground-stream', sourceMarker: 'cave', mouthMarker: 'outflow' }];
      map.roomShapes = [{ id: 1, x: 2, y: 2, width: 4, height: 4, shapeType: 'rect', mode: 'additive', fillTile: 'floor', wallTile: 'wall' }];
      map.backgroundImage = { dataUrl: image, offsetX: 0, offsetY: 0, scale: 0.5, opacity: 0.25 };
      map.qaExtension = { index, nested: ['retain', 42] };
      return map;
    });
    return {
      name: 'QA rich crypt', levels, activeLevelIndex: 0,
      stairLinks: [{ fromLevel: 0, fromCell: { x: 3, y: 3 }, toLevel: 1, toCell: { x: 3, y: 3 } }],
      customThemes: [{ id: 'custom-theme:qa', name: 'QA stone', baseThemeId: 'dungeon', gridColor: '#111111',
        tileColors: { floor: '#445566' }, tileLabels: { floor: 'Stone' },
        customTiles: [{ id: 'custom:qa', label: 'Moss', color: '#337744', baseType: 'floor', imageDataUrl: image }] }],
      customStamps: [{ id: 'qa-image', name: 'QA image', category: 'custom', viewBox: '0 0 192 192', imageDataUrl: image }],
      sceneTemplates: [{ id: 'qa-template', name: 'QA room', width: 8, height: 8, createdAt: '2026-09-07T00:00:00Z',
        tiles: levels[0].tiles, notes: levels[0].notes, stamps: levels[0].stamps }],
      qaExtension: { retained: true },
    };
  });
  const seed = (page, names) => page.evaluate(async names => {
    const { saveProject } = await import('./src/utils/storage.ts');
    const { createDefaultProject } = await import('./src/hooks/mapStateUtils.ts');
    const ids = [];
    for (const name of names) {
      const id = crypto.randomUUID();
      await saveProject({ ...createDefaultProject(), name }, null, false, id);
      ids.push(id);
    }
    return ids;
  }, names);
  const landing = async page => {
    await page.goto(origin);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: 'Your maps', exact: true }).waitFor();
  };

  await scenario('native identities, duplicate isolation, metadata preservation and recent ordering', async page => {
    return page.evaluate(async () => {
      const { saveProject, readRecord } = await import('./src/utils/storage.ts');
      const { loadProject, listProjects, changeLibraryProject, duplicateLibraryProject, recordProjectOpened } = await import('./src/utils/projectRepository.ts');
      const { createDefaultProject } = await import('./src/hooks/mapStateUtils.ts');
      const check = (value, message) => { if (!value) throw new Error(message); };
      const ids = [crypto.randomUUID(), crypto.randomUUID()];
      const fixture = { ...createDefaultProject(), name: 'Native A', id: 'portable-provenance' };
      await saveProject(fixture, null, false, ids[0]);
      await saveProject({ ...fixture, name: 'Native B' }, null, false, ids[1]);
      let item = (await listProjects()).find(item => item.id === ids[0]);
      await changeLibraryProject(item, { name: ' Renamed A ', tags: [' campaign ', 'campaign', '', 'GM'] });
      await recordProjectOpened(ids[0]);
      item = (await listProjects()).find(item => item.id === ids[0]);
      check(item.name === 'Renamed A' && JSON.stringify(item.tags) === '["campaign","GM"]', 'Name/tag normalization failed');
      const loaded = await loadProject(ids[0]);
      await saveProject({ ...loaded.project, name: 'Ordinary save A' }, loaded.revision, false, ids[0]);
      const after = (await listProjects()).find(item => item.id === ids[0]);
      check(JSON.stringify(after.tags) === JSON.stringify(item.tags) && after.lastOpenedAt === item.lastOpenedAt && after.status === 'active', 'Ordinary save lost metadata');
      const duplicateId = await duplicateLibraryProject(after);
      check(!ids.includes(duplicateId), 'Duplicate reused a local identity');
      const duplicate = await loadProject(duplicateId);
      check(duplicate.project.id === 'portable-provenance', 'Portable provenance lost');
      await saveProject({ ...duplicate.project, name: 'Edited copy' }, duplicate.revision, false, duplicateId);
      check((await loadProject(ids[0])).project.name === 'Ordinary save A', 'Duplicate edit changed source');
      check((await loadProject(ids[1])).project.name === 'Native B', 'Independent identity changed');
      await new Promise(resolve => setTimeout(resolve, 20));
      await recordProjectOpened(ids[1]);
      const records = await listProjects();
      records.sort((a, b) => (b.lastOpenedAt || b.updatedAt).localeCompare(a.lastOpenedAt || a.updatedAt));
      check(records[0].id === ids[1], 'Recently opened project did not sort first');
      check((await readRecord(`project:${duplicateId}`)).localProjectId === duplicateId, 'Native identity missing');
      return { ids: [...ids, duplicateId], projectCount: records.length, recentFirst: records[0].name };
    });
  });

  await scenario('native CAS rejects stale saves and metadata edits across rename archive trash and deletion', async page => {
    return page.evaluate(async () => {
      const { saveProject, readRecord, openDB } = await import('./src/utils/storage.ts');
      const { loadProject, listProjects, changeLibraryProject, recordProjectOpened } = await import('./src/utils/projectRepository.ts');
      const { createDefaultProject } = await import('./src/hooks/mapStateUtils.ts');
      const check = (value, message) => { if (!value) throw new Error(message); };
      const rejects = async (fn, message) => { let rejected = false; try { await fn(); } catch { rejected = true; } check(rejected, message); };
      const checks = [];
      for (const operation of ['rename', 'archived', 'trash', 'delete']) {
        const id = crypto.randomUUID();
        const project = { ...createDefaultProject(), name: operation };
        const initial = await saveProject(project, null, false, id);
        await saveProject(project, initial, 'Clear level', id);
        const old = await loadProject(id);
        const item = (await listProjects()).find(item => item.id === id);
        await changeLibraryProject(item, operation === 'rename' ? { name: 'New title', tags: ['new'] } : { status: operation === 'delete' ? 'trash' : operation });
        if (operation === 'delete') {
          const db = await openDB();
          await new Promise((resolve, reject) => {
            const tx = db.transaction('maps', 'readwrite');
            tx.objectStore('maps').put(project, 'autosave');
            tx.objectStore('maps').put(id, 'project-migration-v1');
            tx.oncomplete = resolve; tx.onabort = reject;
          });
          db.close();
          localStorage.setItem('dungeon-mapper-autosave', ' legacy retained bytes ');
          check(await readRecord(`previous:${id}`) && await readRecord(`recovery:${id}`), 'Previous/recovery fixture missing');
          await changeLibraryProject((await listProjects()).find(item => item.id === id), { delete: true });
          for (const prefix of ['project', 'previous', 'recovery']) check(await readRecord(`${prefix}:${id}`) === undefined, `${prefix} survived explicit deletion`);
          check(JSON.stringify(await readRecord('autosave')) === JSON.stringify(project), 'Legacy IndexedDB source was deleted');
          check(localStorage.getItem('dungeon-mapper-autosave') === ' legacy retained bytes ', 'Legacy localStorage was deleted');
          check(await readRecord('project-migration-v1') === 'deleted', 'Deleted migration can resurrect');
        }
        const before = JSON.stringify(await readRecord(`project:${id}`));
        await rejects(() => saveProject(old.project, old.revision, false, id), `${operation} allowed stale save`);
        await rejects(() => changeLibraryProject(item, { name: 'Stale edit', tags: [] }), `${operation} allowed stale metadata edit`);
        check(JSON.stringify(await readRecord(`project:${id}`)) === before, `${operation} rejection changed stored bytes`);
        if (operation !== 'rename') {
          await rejects(() => loadProject(id), `${operation} allowed opening`);
          await rejects(() => recordProjectOpened(id), `${operation} allowed recent-open record`);
        }
        if (operation === 'archived' || operation === 'trash') {
          const current = (await listProjects()).find(item => item.id === id);
          await changeLibraryProject(current, { status: 'active' });
          check((await loadProject(id)).project.name === operation, 'Restore lost content');
        }
        checks.push(operation);
      }
      return { rejectedStaleOperations: checks, explicitDeletion: ['project', 'previous', 'recovery'], retained: ['autosave', 'localStorage', 'migration tombstone'] };
    });
  });

  await scenario('native failed-startup recovery blocks creation and preserves identity across quota and pending edits', async page => {
    return page.evaluate(async () => {
      const { SaveCoordinator } = await import('./src/utils/saveCoordinator.ts');
      const { createDefaultProject } = await import('./src/hooks/mapStateUtils.ts');
      const { openDB, saveProject, readRecord, StorageConflictError } = await import('./src/utils/storage.ts');
      const { listProjects } = await import('./src/utils/projectRepository.ts');
      const check = (value, message) => { if (!value) throw new Error(message); };
      const evidence = [];
      for (const mode of ['success', 'quota', 'pending']) {
        const id = crypto.randomUUID();
        const original = { schemaVersion: 999, storageRevision: crypto.randomUUID(), localProjectId: id, retainedSource: mode };
        const db = await openDB();
        await new Promise((resolve, reject) => {
          const tx = db.transaction('maps', 'readwrite');
          tx.objectStore('maps').put(original, `project:${id}`);
          tx.oncomplete = resolve; tx.onabort = reject;
        });
        db.close();
        const coordinator = new SaveCoordinator();
        coordinator.failRestore('Unsupported startup source', id);
        const prior = coordinator.getSnapshot();
        const recovered = { ...createDefaultProject(), name: `QA recovery A ${mode}` };
        const competing = { ...createDefaultProject(), name: `QA competing B ${mode}` };
        let release;
        const gate = new Promise(resolve => { release = resolve; });
        const put = IDBObjectStore.prototype.put;
        let failure;
        try {
          const operation = coordinator.recoverFailedProject(async () => {
            await gate;
            if (mode === 'quota') {
              IDBObjectStore.prototype.put = function (value, key) {
                if (key === `project:${id}`) throw new DOMException('QA injected quota failure', 'QuotaExceededError');
                return put.call(this, value, key);
              };
            }
            const revision = await saveProject(recovered, original.storageRevision, true, id);
            return { project: recovered, revision, projectId: id, checkpointCount: 1 };
          }).catch(error => { failure = error; });
          check(coordinator.getSnapshot().phase === 'replacing' && coordinator.getSnapshot().restorationBlocked === true,
            'Recovery did not immediately block creation/import before awaiting');
          let blocked = false;
          try { coordinator.startProject(competing); } catch { blocked = true; }
          check(blocked, 'Competing creation bypassed failed-startup recovery guard');
          check(coordinator.getProjectId() === id, 'Rejected creation changed recovery identity');
          if (mode === 'pending') coordinator.schedule(competing);
          release();
          await operation;
          IDBObjectStore.prototype.put = put;
          await coordinator.flush();
          check(coordinator.getProjectId() === id, 'Recovery initialized a different project ID');
          const raw = await readRecord(`project:${id}`);
          check(!(await listProjects()).some(item => item.name === competing.name), 'Competing B became a durable project');
          if (mode === 'quota') {
            check(failure?.name === 'QuotaExceededError', 'Quota failure was not propagated');
            check(JSON.stringify(coordinator.getSnapshot()) === JSON.stringify(prior), 'Quota failure did not restore failed-startup state');
            check(JSON.stringify(raw) === JSON.stringify(original), 'Quota failure changed retained source');
            check(await readRecord(`previous:${id}`) === undefined && await readRecord(`recovery:${id}`) === undefined,
              'Quota transaction left partial recovery records');
          } else {
            check(JSON.stringify(raw.project) === JSON.stringify(recovered), 'Recovery A was overwritten with competing B');
            const checkpoints = await readRecord(`recovery:${id}`);
            check(checkpoints.length === 1 && JSON.stringify(checkpoints[0].data) === JSON.stringify(original), 'Recovery lost original checkpoint');
            if (mode === 'pending') {
              check(failure instanceof StorageConflictError && coordinator.getSnapshot().phase === 'conflict',
                'Unexpected pending edits were silently initialized or saved');
            } else check(!failure && coordinator.getSnapshot().phase === 'saved', 'Successful recovery did not settle saved');
          }
          evidence.push({ mode, id, creationBlocked: true, phase: coordinator.getSnapshot().phase, crossIdSaves: 0 });
        } finally {
          IDBObjectStore.prototype.put = put;
          coordinator.dispose();
        }
      }
      return { nativeTransactions: true, quotaFault: 'DOMException during native transaction put, not physical disk exhaustion', cases: evidence };
    });
  });

  await scenario('library import preview cancellation invalid future and full rich backup roundtrip', async page => {
    const rich = await richFixture(page);
    await landing(page);
    assert.equal(await page.getByRole('article').count(), 0, 'Empty root should land on empty library');
    const before = await catalog(page);
    await upload(page, { schemaVersion: 1, project: rich });
    await page.getByRole('region', { name: 'Import preview' }).waitFor();
    assert.deepEqual(await catalog(page), before, 'Preview wrote a project');
    await page.getByRole('button', { name: 'Cancel import', exact: true }).click();
    assert.deepEqual(await catalog(page), before, 'Cancel wrote a project');
    for (const invalid of ['{bad json', { schemaVersion: 999, project: rich }, { schemaVersion: 1, project: { ...rich, levels: [] } }]) {
      await upload(page, invalid);
      await page.getByRole('alert').waitFor();
      assert.equal(await page.getByRole('region', { name: 'Import preview' }).count(), 0);
      assert.deepEqual(await catalog(page), before, 'Rejected import mutated library');
    }
    await upload(page, { schemaVersion: 1, project: rich });
    await page.getByRole('button', { name: 'Import as new project', exact: true }).click();
    await saved(page);
    const firstId = new URL(page.url()).searchParams.get('project');
    assert.ok(firstId, 'Import did not establish a local project identity');
    await library(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      card(page, rich.name).getByRole('button', { name: 'Export backup', exact: true }).click(),
    ]);
    const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.deepEqual(exported.project, rich, 'Rich exported content differs from imported project');
    assert.equal(exported.localProjectId, undefined, 'Backup leaked local identity');
    if (output) await download.saveAs(join(output, `${browser.browserType().name()}-rich-backup.json`));
    await upload(page, exported);
    await page.getByRole('button', { name: 'Import as new project', exact: true }).click();
    await saved(page);
    const secondId = new URL(page.url()).searchParams.get('project');
    assert.notEqual(secondId, firstId, 'Reimport reused source identity');
    const records = await catalog(page);
    assert.equal(records.length, 2);
    assert.deepEqual(records.find(item => item.id === firstId).original.project, rich);
    assert.deepEqual(records.find(item => item.id === secondId).original.project, rich);
    return { firstId, secondId, levels: rich.levels.length, fullDeepEquality: true, download: download.suggestedFilename() };
  });

  await scenario('production library rename tags search duplicate archive trash restore delete and recency', async page => {
    const ids = await seed(page, ['QA crypt', 'QA forest']);
    await landing(page);
    await manage(page, 'QA crypt', 'Rename and tags');
    await page.getByLabel('Project title', { exact: true }).fill('QA renamed crypt');
    await page.getByLabel('Tags, separated by commas', { exact: true }).fill('campaign, one-shot');
    await page.getByRole('button', { name: 'Save name and tags', exact: true }).click();
    await card(page, 'QA renamed crypt').waitFor();
    await page.getByRole('searchbox').fill('CAMPAIGN');
    assert.equal(await page.getByRole('article').count(), 1);
    await page.getByRole('searchbox').fill('nonexistent');
    await page.getByRole('heading', { name: 'No matching maps' }).waitFor();
    await page.getByRole('searchbox').fill('');
    await page.getByRole('button', { name: /^(Open|Continue) QA renamed crypt$/ }).click();
    await saved(page);
    await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('QA saved crypt');
    await saved(page);
    await library(page);
    await card(page, 'QA saved crypt').waitFor();
    assert.deepEqual((await catalog(page)).find(item => item.id === ids[0]).tags, ['campaign', 'one-shot']);
    await manage(page, 'QA saved crypt', 'Duplicate');
    await saved(page);
    const copyId = new URL(page.url()).searchParams.get('project');
    assert.ok(copyId && !ids.includes(copyId));
    await library(page);
    await card(page, 'QA saved crypt (copy)').waitFor();
    await manage(page, 'QA saved crypt (copy)', 'Archive');
    await card(page, 'QA saved crypt (copy)').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    await card(page, 'QA saved crypt (copy)').waitFor();
    assert.equal(await card(page, 'QA saved crypt (copy)').getByRole('button', { name: /^(Open|Continue) / }).count(), 0);
    await page.getByRole('button', { name: 'Restore QA saved crypt (copy)', exact: true }).click();
    await card(page, 'QA saved crypt (copy)').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Recent maps', exact: true }).click();
    page.once('dialog', dialog => dialog.dismiss());
    await manage(page, 'QA saved crypt (copy)', 'Move to Trash');
    assert.equal((await catalog(page)).find(item => item.id === copyId).status, 'active');
    page.once('dialog', dialog => dialog.accept());
    await manage(page, 'QA saved crypt (copy)', 'Move to Trash');
    await card(page, 'QA saved crypt (copy)').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Trash', exact: true }).click();
    await page.getByRole('button', { name: 'Restore QA saved crypt (copy)', exact: true }).click();
    await card(page, 'QA saved crypt (copy)').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Recent maps', exact: true }).click();
    page.once('dialog', dialog => dialog.accept());
    await manage(page, 'QA saved crypt (copy)', 'Move to Trash');
    await card(page, 'QA saved crypt (copy)').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Trash', exact: true }).click();
    page.once('dialog', dialog => dialog.dismiss());
    await manage(page, 'QA saved crypt (copy)', 'Delete permanently');
    assert.ok((await catalog(page)).some(item => item.id === copyId));
    let confirmation;
    page.once('dialog', async dialog => { confirmation = dialog.message(); await dialog.accept(); });
    await manage(page, 'QA saved crypt (copy)', 'Delete permanently');
    await card(page, 'QA saved crypt (copy)').waitFor({ state: 'detached' });
    assert.match(confirmation, /previous save and all recovery checkpoints/);
    assert.equal((await catalog(page)).length, 2);
    await page.getByRole('button', { name: 'Recent maps', exact: true }).click();
    await page.getByRole('button', { name: /^(Open|Continue) QA forest$/ }).click();
    await saved(page);
    await library(page);
    await card(page, 'QA forest').waitFor();
    assert.equal(await page.getByRole('article').first().getAttribute('aria-label'), 'QA forest');
    return { independentIds: ids, duplicateId: copyId, deletionConfirmation: confirmation, recentFirst: 'QA forest' };
  });

  await scenario('duplicate CAS refuses stale source and atomically copies rich contents and tags without checkpoints', async page => {
    const rich = await richFixture(page);
    const result = await page.evaluate(async rich => {
      const { saveProject, readRecord, StorageConflictError } = await import('./src/utils/storage.ts');
      const { listProjects, changeLibraryProject, duplicateLibraryProject, loadProject } = await import('./src/utils/projectRepository.ts');
      const check = (value, message) => { if (!value) throw new Error(message); };
      const id = crypto.randomUUID();
      const revision = await saveProject(rich, null, false, id);
      await saveProject(rich, revision, 'Clear level', id);
      const stale = (await listProjects())[0];
      await changeLibraryProject(stale, { name: rich.name, tags: ['campaign', 'GM'] });
      let rejected = false;
      try { await duplicateLibraryProject(stale); }
      catch (error) { rejected = error instanceof StorageConflictError; }
      check(rejected, 'Stale selected source was not refused with StorageConflictError');
      check((await listProjects()).length === 1, 'Refused duplicate left a partial record');
      const source = (await listProjects())[0];
      const sourceBytes = JSON.stringify(await readRecord(`project:${id}`));
      const sourceRecovery = JSON.stringify(await readRecord(`recovery:${id}`));
      check(sourceRecovery !== undefined, 'Source checkpoint fixture missing');
      const duplicateId = await duplicateLibraryProject(source);
      const duplicateRaw = await readRecord(`project:${duplicateId}`);
      check(duplicateId !== id && duplicateRaw.localProjectId === duplicateId, 'Duplicate did not allocate a new native ID');
      check(duplicateRaw.storageRevision !== source.original.storageRevision, 'Duplicate reused source revision');
      check(duplicateRaw.library.status === 'active', 'Duplicate is not active');
      check(JSON.stringify(duplicateRaw.library.tags) === JSON.stringify(source.tags), 'Duplicate did not copy tags');
      check(await readRecord(`previous:${duplicateId}`) === undefined, 'Duplicate copied previous save');
      check(await readRecord(`recovery:${duplicateId}`) === undefined, 'Duplicate copied checkpoints');
      check(JSON.stringify(duplicateRaw.project) === JSON.stringify({ ...rich, name: `${rich.name} (copy)` }), 'Duplicate lost portable rich contents');
      const copy = await loadProject(duplicateId);
      copy.project.levels[0].notes[0].description = 'Changed copy only';
      await saveProject(copy.project, copy.revision, false, duplicateId);
      const copySummary = (await listProjects()).find(item => item.id === duplicateId);
      await changeLibraryProject(copySummary, { name: 'Edited rich copy', tags: ['copy-only'] });
      check(JSON.stringify(await readRecord(`project:${id}`)) === sourceBytes, 'Copy editing mutated source record');
      check(JSON.stringify(await readRecord(`recovery:${id}`)) === sourceRecovery, 'Copy editing mutated source checkpoints');
      return { id, duplicateId, staleRefused: true, copiedTags: duplicateRaw.library.tags,
        fullRichEquality: true, copiedCheckpoints: 0, sourceByteEqualityAfterCopyEdits: true };
    }, rich);
    return result;
  });

  await scenario('failed duplicate opening retains durable copy in refreshed library', async page => {
    const [id] = await seed(page, ['QA durable source']);
    await landing(page);
    await page.getByRole('button', { name: /^(Open|Continue) QA durable source$/ }).click();
    await saved(page);
    await library(page);
    const before = (await catalog(page))[0].original;
    await page.evaluate(sourceId => {
      const get = IDBObjectStore.prototype.get;
      window.qaRestoreDuplicateRead = () => { IDBObjectStore.prototype.get = get; };
      IDBObjectStore.prototype.get = function (key) {
        if (this.transaction.mode === 'readonly' && typeof key === 'string' &&
          key.startsWith('project:') && key !== `project:${sourceId}`) {
          throw new Error('QA injected duplicate open failure');
        }
        return get.call(this, key);
      };
    }, id);
    await manage(page, 'QA durable source', 'Duplicate');
    await page.getByRole('alert').filter({ hasText: 'QA injected duplicate open failure' }).waitFor();
    await card(page, 'QA durable source (copy)').waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Your maps', exact: true }).isVisible(), true);
    const records = await catalog(page);
    assert.equal(records.length, 2, 'Failed opening removed committed duplicate');
    assert.deepEqual(records.find(item => item.id === id).original, before, 'Failed duplicate opening changed source');
    const duplicateId = records.find(item => item.id !== id).id;
    await page.evaluate(() => window.qaRestoreDuplicateRead());
    await page.reload();
    await page.getByRole('heading', { name: 'Your maps', exact: true }).waitFor();
    await card(page, 'QA durable source (copy)').waitFor();
    await page.getByRole('button', { name: 'Open QA durable source (copy)', exact: true }).click();
    await saved(page);
    assert.equal(new URL(page.url()).searchParams.get('project'), duplicateId);
    return { sourceId: id, duplicateId, failureVisible: true, copySurvivedReload: true, retryOpenedSameCopy: true };
  });

  await scenario('current migrated project deletion clears save health and root reload never resurrects sources', async page => {
    const fixture = await page.evaluate(async () => {
      const { createDefaultProject } = await import('./src/hooks/mapStateUtils.ts');
      const { openDB, saveProject } = await import('./src/utils/storage.ts');
      const { loadProject } = await import('./src/utils/projectRepository.ts');
      const original = { ...createDefaultProject(), name: 'QA migrated current' };
      const bytes = ` \n${JSON.stringify({ ...original, name: 'QA lower-priority legacy' })}\n`;
      localStorage.setItem('dungeon-mapper-autosave', bytes);
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction('maps', 'readwrite');
        tx.objectStore('maps').put(original, 'autosave');
        tx.oncomplete = resolve; tx.onabort = reject;
      });
      db.close();
      const migrated = await loadProject();
      await saveProject(migrated.project, migrated.revision, 'Clear level', migrated.projectId);
      return { original, bytes, id: migrated.projectId };
    });
    await landing(page);
    await page.getByRole('button', { name: /^(Open|Continue) QA migrated current$/ }).click();
    await saved(page);
    assert.equal(new URL(page.url()).searchParams.get('project'), fixture.id);
    await library(page);
    page.once('dialog', dialog => dialog.accept());
    await manage(page, 'QA migrated current', 'Move to Trash');
    await card(page, 'QA migrated current').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Trash', exact: true }).click();
    page.once('dialog', dialog => dialog.accept());
    await manage(page, 'QA migrated current', 'Delete permanently');
    await card(page, 'QA migrated current').waitFor({ state: 'detached' });
    await page.getByRole('status').filter({ hasText: 'Not saved yet' }).waitFor();
    assert.equal(new URL(page.url()).searchParams.has('project'), false, 'Deleted identity remains in URL');
    assert.equal(await page.getByRole('status').filter({ hasText: 'Saved on this device' }).count(), 0, 'Deleted content claims to be saved');
    const [backup] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export backup', exact: true }).click(),
    ]);
    assert.deepEqual(JSON.parse(await readFile(await backup.path(), 'utf8')).project, fixture.original, 'Deleted in-memory content is not retained for backup');
    const verifyStorage = async () => {
      const state = await page.evaluate(async id => {
        const { readRecord } = await import('./src/utils/storage.ts');
        const { listProjects } = await import('./src/utils/projectRepository.ts');
        return {
          projects: await listProjects(), marker: await readRecord('project-migration-v1'),
          original: await readRecord('autosave'), legacy: localStorage.getItem('dungeon-mapper-autosave'),
          deletedRecords: await Promise.all(['project', 'previous', 'recovery'].map(prefix => readRecord(`${prefix}:${id}`))),
        };
      }, fixture.id);
      assert.equal(state.projects.length, 0, 'Phantom or remigrated project appeared');
      assert.equal(state.marker, 'deleted');
      assert.deepEqual(state.original, fixture.original);
      assert.equal(state.legacy, fixture.bytes);
      assert.ok(state.deletedRecords.every(value => value === undefined), 'Deleted records reappeared');
    };
    await verifyStorage();
    // Exceed the autosave debounce to detect an unintended save of the detached copy.
    await page.waitForTimeout(1200);
    await verifyStorage();
    assert.equal(new URL(page.url()).searchParams.get('view'), 'library');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: 'Your maps', exact: true }).waitFor();
    await verifyStorage();
    await landing(page); // Explicit bare root, without either query parameter.
    await page.getByRole('heading', { name: 'A new adventure starts here', exact: true }).waitFor();
    await verifyStorage();
    assert.equal(await page.getByRole('status').filter({ hasText: 'Saved on this device' }).count(), 0);
    return { deletedCurrentId: fixture.id, inMemoryBackupRetained: true, queryCleared: true,
      migrationMarker: 'deleted', retainedLegacySources: 2, phantomProjectsAfterLibraryAndRootReload: 0 };
  });

  await scenario('thumbnail failure is visible retry recovers and open export remain usable', async page => {
    await seed(page, ['QA thumbnail']);
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.toDataURL;
      window.qaThumbnailFailure = true;
      window.qaThumbnailCalls = 0;
      HTMLCanvasElement.prototype.toDataURL = function (...args) {
        window.qaThumbnailCalls++;
        if (window.qaThumbnailFailure) throw new Error('QA injected thumbnail renderer failure');
        return original.apply(this, args);
      };
    });
    await landing(page);
    await page.getByText('Thumbnail unavailable', { exact: true }).waitFor();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      card(page, 'QA thumbnail').getByRole('button', { name: 'Export backup', exact: true }).click(),
    ]);
    assert.ok(await download.path());
    assert.equal(await page.getByRole('button', { name: /^(Open|Continue) QA thumbnail$/ }).isEnabled(), true);
    await page.getByRole('button', { name: /^(Open|Continue) QA thumbnail$/ }).click();
    await saved(page);
    await library(page);
    await page.getByText('Thumbnail unavailable', { exact: true }).waitFor();
    const attempts = await page.evaluate(() => window.qaThumbnailCalls);
    await page.getByRole('button', { name: 'Retry thumbnail', exact: true }).click();
    await page.waitForFunction(attempts => window.qaThumbnailCalls > attempts, attempts);
    await page.getByText('Thumbnail unavailable', { exact: true }).waitFor();
    await page.evaluate(() => { window.qaThumbnailFailure = false; });
    await page.getByRole('button', { name: 'Retry thumbnail', exact: true }).click();
    await page.getByRole('img', { name: 'Map preview of QA thumbnail', exact: true }).waitFor();
    await page.getByRole('button', { name: /^(Open|Continue) QA thumbnail$/ }).click();
    await saved(page);
    return { fault: 'HTMLCanvasElement.toDataURL throws', exportWhileFailed: true, retryRecovered: true, opened: true };
  });

  await scenario('two-tab stale metadata rejects and library waits for coordinator load completion', async (page, context) => {
    const ids = await seed(page, ['QA first', 'QA second']);
    await landing(page);
    const second = await context.newPage();
    second.setDefaultTimeout(15000);
    await landing(second);
    await manage(page, 'QA first', 'Rename and tags');
    await page.getByLabel('Project title', { exact: true }).fill('QA stale title');
    await manage(second, 'QA first', 'Rename and tags');
    await second.getByLabel('Project title', { exact: true }).fill('QA winning title');
    await second.getByRole('button', { name: 'Save name and tags', exact: true }).click();
    await card(second, 'QA winning title').waitFor();
    await page.getByRole('button', { name: 'Save name and tags', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'changed in another tab' }).waitFor();
    assert.equal((await catalog(page)).find(item => item.id === ids[0]).name, 'QA winning title');
    await page.getByRole('button', { name: 'Refresh library', exact: true }).click();
    await card(page, 'QA winning title').waitFor();
    await page.evaluate(id => {
      // Hold only notification of the target native read transaction's completion.
      // The real IndexedDB request still executes. No application modules are mocked.
      const get = IDBObjectStore.prototype.get;
      const complete = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete');
      IDBObjectStore.prototype.get = function (key) {
        if (this.transaction.mode === 'readonly' && key === `project:${id}`) this.transaction.qaHold = true;
        return get.call(this, key);
      };
      Object.defineProperty(IDBTransaction.prototype, 'oncomplete', {
        ...complete,
        set(fn) {
          complete.set.call(this, typeof fn !== 'function' ? fn : event => {
            if (this.qaHold) {
              window.qaReleaseLoad = () => {
                IDBObjectStore.prototype.get = get;
                Object.defineProperty(IDBTransaction.prototype, 'oncomplete', complete);
                fn.call(this, event);
              };
            } else fn.call(this, event);
          });
        },
      });
    }, ids[1]);
    await page.getByRole('button', { name: /^(Open|Continue) QA second$/ }).click();
    await page.waitForFunction(() => typeof window.qaReleaseLoad === 'function');
    assert.equal(await page.getByRole('heading', { name: 'Your maps', exact: true }).isVisible(), true, 'Library closed before target load completed');
    assert.equal(await page.getByRole('textbox', { name: 'Project name', exact: true }).count(), 0, 'Stale editor became visible while switching');
    await page.evaluate(() => window.qaReleaseLoad());
    await saved(page);
    assert.equal(await page.getByRole('textbox', { name: 'Project name', exact: true }).inputValue(), 'QA second');
    return { twoTabWinner: 'QA winning title', staleEditRejected: true, delayedNativeReadId: ids[1], libraryStayedVisibleUntilCompletion: true };
  });

  await scenario('library 390px reflow and native keyboard management', async page => {
    // macOS WebKit follows Safari's default preference: Option+Tab includes
    // buttons and links, while plain Tab targets text/form fields only.
    const tabKey = browser.browserType().name() === 'webkit' ? 'Alt+Tab' : 'Tab';
    await seed(page, ['QA mobile crypt', 'QA mobile forest']);
    await page.setViewportSize({ width: 390, height: 844 });
    await landing(page);
    assert.equal(await page.getByRole('heading', { name: 'Your maps', exact: true }).evaluate(element => element === document.activeElement), true);
    const layout = await page.evaluate(() => ({
      viewport: innerWidth, document: document.documentElement.scrollWidth,
      overflowing: [...document.querySelectorAll('.project-library button,.project-library input,.library-card')]
        .filter(element => { const rect = element.getBoundingClientRect(); return rect.width && (rect.right > innerWidth + 1 || rect.left < -1); })
        .map(element => element.textContent || element.getAttribute('aria-label')),
    }));
    assert.ok(layout.document <= layout.viewport + 1, `Horizontal overflow: ${JSON.stringify(layout)}`);
    assert.deepEqual(layout.overflowing, []);
    await page.keyboard.press(tabKey);
    const firstTab = await page.evaluate(() => document.activeElement?.textContent);
    assert.equal(firstTab, 'Create map');
    await page.getByRole('searchbox').focus();
    await page.keyboard.type('mobile crypt');
    assert.equal(await page.getByRole('article').count(), 1);
    const summary = card(page, 'QA mobile crypt').locator('summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press(tabKey);
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Rename and tags');
    await page.keyboard.press('Enter');
    await page.getByLabel('Project title', { exact: true }).focus();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('QA mobile crypt revised');
    await page.keyboard.press('Enter');
    await card(page, 'QA mobile crypt revised').waitFor();
    if (output) await page.screenshot({ path: join(output, `${browser.browserType().name()}-library-390px.png`), fullPage: true });
    return { layout, tabKey, keyboard: ['heading focus', 'search', 'Enter expands summary', 'Tab enters management', 'Enter submits rename'] };
  });
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const playwright = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
  let failed = false;
  for (const engine of (process.env.QA_ENGINES ?? 'chromium,firefox,webkit').split(',')) {
    const browser = await playwright[engine].launch({ headless: true });
    try {
      const results = await runUx02Library(browser, process.env.QA_ORIGIN);
      console.log(JSON.stringify({ engine, results }, null, 2));
      failed ||= results.some(result => result.status !== 'passed');
    } finally { await browser.close(); }
  }
  if (failed) process.exitCode = 1;
}
