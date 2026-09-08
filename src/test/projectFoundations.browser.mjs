// Import runProjectFoundations(browser) from an existing Playwright installation.
// Every scenario owns a fresh context and never touches personal browser storage.
import { Buffer } from 'node:buffer';

export async function runProjectFoundations(browser, origin = 'http://127.0.0.1:5191/Dungeon-Mapper/') {
  const results = [];
  const scenario = async (name, run) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.route('**/repository-probe.html', route => route.fulfill({
        contentType: 'text/html', body: '<title>Isolated repository probe</title>',
      }));
      await page.goto(`${origin}repository-probe.html`);
      await run(page, context);
      results.push(name);
    } finally { await context.close(); }
  };
  await scenario('atomic migration, source retention, independent identities and CAS', async page => {
    await page.evaluate(async () => {
      const { loadProject, saveProject, readRecord, openDB } = await import('./src/utils/storage.ts');
      const { listProjects } = await import('./src/utils/projectRepository.ts');
      const { createDefaultProject } = await import('./src/hooks/mapStateUtils.ts');
      const assert = (value, message) => { if (!value) throw new Error(message); };
      const project = { ...createDefaultProject(), name: 'IndexedDB original', id: 'portable-source', extension: { nested: ['retain'] } };
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction('maps', 'readwrite');
        tx.objectStore('maps').put(project, 'autosave');
        tx.oncomplete = resolve; tx.onabort = reject;
      });
      db.close();
      const bytes = ' \n' + JSON.stringify({ ...project, name: 'Lower priority legacy' });
      localStorage.setItem('dungeon-mapper-autosave', bytes);
      const [a, b] = await Promise.all([loadProject(), loadProject()]);
      assert(a.projectId === b.projectId && a.revision === b.revision, 'Concurrent migration duplicated identity');
      assert(a.project.name === project.name && (await listProjects()).length === 1, 'IndexedDB precedence failed');
      assert(JSON.stringify(await readRecord('autosave')) === JSON.stringify(project), 'Migration rewrote source');
      assert(localStorage.getItem('dungeon-mapper-autosave') === bytes, 'Migration altered legacy bytes');
      const writes = await Promise.allSettled([
        saveProject({ ...project, name: 'A' }, a.revision, false, a.projectId),
        saveProject({ ...project, name: 'B' }, a.revision, false, a.projectId),
      ]);
      assert(writes.filter(result => result.status === 'fulfilled').length === 1, 'CAS did not choose one writer');
      await saveProject(project, null, false, 'independent-copy');
      assert((await listProjects()).length === 2, 'Copy aliased source project');
      assert((await loadProject('independent-copy')).project.id === 'portable-source', 'Portable provenance was not retained');
      assert((await loadProject(a.projectId)).project.extension.nested[0] === 'retain', 'Unknown nested content lost');
    });
  });
  await scenario('migration abort retains all source bytes and retry is idempotent', async page => {
    await page.evaluate(async () => {
      const { loadProject, readRecord } = await import('./src/utils/storage.ts');
      const { listProjects } = await import('./src/utils/projectRepository.ts');
      const { createDefaultProject } = await import('./src/hooks/mapStateUtils.ts');
      const bytes = '\n' + JSON.stringify(createDefaultProject());
      localStorage.setItem('dungeon-mapper-autosave', bytes);
      const add = IDBObjectStore.prototype.add;
      IDBObjectStore.prototype.add = function (...args) {
        const request = add.apply(this, args);
        if (args[1] === 'project-migration-v1') queueMicrotask(() => this.transaction.abort());
        return request;
      };
      let failed = false;
      try { await loadProject(); } catch { failed = true; }
      finally { IDBObjectStore.prototype.add = add; }
      if (!failed || (await listProjects()).length || await readRecord('project-migration-v1') !== undefined) {
        throw new Error('Partial migration exposed a project or marker');
      }
      if (localStorage.getItem('dungeon-mapper-autosave') !== bytes) throw new Error('Original bytes changed');
      const restored = await loadProject();
      if ((await loadProject()).projectId !== restored.projectId) throw new Error('Retry duplicated project');
    });
  });
  await scenario('unsupported legacy recovery commits a project without overwriting its source', async page => {
    await page.evaluate(async () => {
      const { loadProject, readRecord, openDB } = await import('./src/utils/storage.ts');
      const { recoverLegacyProject, projectRecoveryRecords } = await import('./src/utils/projectRepository.ts');
      const { createDefaultProject } = await import('./src/hooks/mapStateUtils.ts');
      const original = { schemaVersion: 999, private: 'retain exactly' };
      const db = await openDB();
      await new Promise(resolve => {
        const tx = db.transaction('maps', 'readwrite');
        tx.objectStore('maps').put(original, 'autosave');
        tx.oncomplete = resolve;
      });
      db.close();
      let failure;
      try { await loadProject(); } catch (error) { failure = error; }
      if (!failure?.original) throw new Error('Unsupported source was not exposed');
      const recovered = await recoverLegacyProject(createDefaultProject(), failure.revision);
      if ((await loadProject()).projectId !== recovered.projectId) throw new Error('Recovery did not persist');
      if (JSON.stringify(await readRecord('autosave')) !== JSON.stringify(original)) throw new Error('Recovery overwrote original');
      if (!(await projectRecoveryRecords(recovered.projectId)).some(record => record.data?.private === original.private)) {
        throw new Error('Original not available in general recovery');
      }
    });
  });
  await scenario('explicit retention limit, deletion CAS, restore predecessor and malformed archive export', async page => {
    await page.evaluate(async () => {
      const { saveProject, loadProject, readRecord, openDB } = await import('./src/utils/storage.ts');
      const { projectRecoveryRecords, deleteCheckpoint } = await import('./src/utils/projectRepository.ts');
      const { decodeProject } = await import('./src/utils/projectSchema.ts');
      const { createDefaultProject } = await import('./src/hooks/mapStateUtils.ts');
      let project = createDefaultProject();
      let revision = await saveProject(project, null, false, 'retention');
      for (let i = 0; i < 20; i++) {
        project = { ...project, name: `Checkpoint ${i}` };
        revision = await saveProject(project, revision, 'Clear level', 'retention');
      }
      revision = await saveProject({ ...project, name: 'Ordinary edit' }, revision, false, 'retention');
      const before = JSON.stringify(await readRecord('project:retention'));
      let failed = false;
      try { await saveProject(project, revision, 'Clear level', 'retention'); } catch { failed = true; }
      if (!failed || JSON.stringify(await readRecord('project:retention')) !== before) throw new Error('Retention overflow mutated project');
      const records = await projectRecoveryRecords('retention');
      const checkpoint = records.find(record => record.id);
      if (records.filter(record => record.id).length !== 20) throw new Error('Checkpoint count or IDs lost');
      failed = false;
      try { await deleteCheckpoint('retention', checkpoint.id, {}); } catch { failed = true; }
      if (!failed) throw new Error('Delete accepted stale source');
      await deleteCheckpoint('retention', checkpoint.id, checkpoint.data);
      await saveProject(decodeProject(checkpoint.data), revision, true, 'retention');
      const after = await projectRecoveryRecords('retention');
      if (!after.some(record => record.reason === 'Recovery restore' && record.data.project.name === 'Ordinary edit')) {
        throw new Error('Restore predecessor was not retained');
      }
      if ((await loadProject('retention')).project.name !== decodeProject(checkpoint.data).name) throw new Error('Restore not durable');
      const db = await openDB();
      await new Promise(resolve => {
        const tx = db.transaction('maps', 'readwrite');
        tx.objectStore('maps').put({ malformed: 'archive' }, 'replacement-recovery');
        tx.oncomplete = resolve;
      });
      db.close();
      if (!(await projectRecoveryRecords('retention')).some(record => record.diagnostic && record.data.malformed === 'archive')) {
        throw new Error('Malformed legacy archive not downloadable');
      }
    });
  });
  await scenario('project save abort and quota restore leave committed project and checkpoint set unchanged', async page => {
    await page.evaluate(async () => {
      const { saveProject, readRecord } = await import('./src/utils/storage.ts');
      const { createDefaultProject } = await import('./src/hooks/mapStateUtils.ts');
      const project = createDefaultProject();
      const revision = await saveProject(project, null, false, 'abort');
      const before = JSON.stringify(await readRecord('project:abort'));
      const put = IDBObjectStore.prototype.put;
      for (const mode of ['abort', 'quota']) {
        IDBObjectStore.prototype.put = function (...args) {
          if (mode === 'quota') throw new DOMException('Injected quota', 'QuotaExceededError');
          const request = put.apply(this, args);
          if (args[1] === 'project:abort') queueMicrotask(() => this.transaction.abort());
          return request;
        };
        let failed = false;
        try { await saveProject({ ...project, name: 'Must not open' }, revision, true, 'abort'); } catch { failed = true; }
        finally { IDBObjectStore.prototype.put = put; }
        if (!failed || JSON.stringify(await readRecord('project:abort')) !== before ||
            await readRecord('recovery:abort') !== undefined) throw new Error(`${mode} partially committed`);
      }
    });
  });
  await scenario('chooser switching, independent tab selection, durable preview and stale same-project protection', async (page, context) => {
    await page.evaluate(async () => {
      const { saveProject } = await import('./src/utils/storage.ts');
      const { createDefaultProject } = await import('./src/hooks/mapStateUtils.ts');
      const project = createDefaultProject();
      await saveProject({ ...project, name: 'Project A' }, null, false, 'a');
      let revision = await saveProject({ ...project, name: 'Project B' }, null, false, 'b');
      await saveProject({ ...project, name: 'Project B latest' }, revision, 'Clear level', 'b');
    });
    await page.goto(`${origin}?project=a`);
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Switch project', exact: true }).click();
    await page.getByRole('button', { name: 'Open Project B latest', exact: true }).click();
    await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('Project B edited');
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    if (new URL(page.url()).searchParams.get('project') !== 'b') throw new Error('Selection URL not updated');
    await page.reload();
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    if (await page.getByRole('textbox', { name: 'Project name', exact: true }).inputValue() !== 'Project B edited') throw new Error('Project B did not reload');
    const other = await context.newPage();
    await other.goto(`${origin}?project=a`);
    await other.getByText('Saved on this device', { exact: true }).waitFor();
    await other.getByRole('textbox', { name: 'Project name', exact: true }).fill('Project A edited');
    await other.getByText('Saved on this device', { exact: true }).waitFor();
    if (new URL(page.url()).searchParams.get('project') !== 'b') throw new Error('Other tab stole selection');
    await page.getByRole('button', { name: 'Recovery copies', exact: true }).click();
    await page.getByRole('button', { name: 'Preview copy 2', exact: true }).click();
    await page.getByRole('region', { name: 'Recovery preview' }).waitFor();
    await page.getByRole('button', { name: 'Cancel preview', exact: true }).click();
    if (await page.getByRole('textbox', { name: 'Project name', exact: true }).inputValue() !== 'Project B edited') throw new Error('Cancel changed current project');
    await page.getByRole('button', { name: 'Preview copy 2', exact: true }).click();
    await page.getByRole('button', { name: 'Restore whole project', exact: true }).click();
    await page.getByRole('region', { name: 'Recovery preview' }).waitFor({ state: 'hidden' });
    await page.reload();
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    if (await page.getByRole('textbox', { name: 'Project name', exact: true }).inputValue() !== 'Project B') throw new Error('Recovery did not restore older project');
    const same = await context.newPage();
    await same.goto(page.url());
    await same.getByText('Saved on this device', { exact: true }).waitFor();
    await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('Winning B');
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    await same.getByRole('textbox', { name: 'Project name', exact: true }).fill('Retain losing edits');
    await same.getByText('Save conflict', { exact: true }).waitFor();
    const download = same.waitForEvent('download');
    await same.getByRole('button', { name: 'Export backup', exact: true }).click();
    if (!(await download).suggestedFilename().endsWith('.json')) throw new Error('Conflict backup unavailable');
  });
  await scenario('capacity preflight does not mutate level and explicit cleanup enables the action', async page => {
    await page.evaluate(async () => {
      const { saveProject } = await import('./src/utils/storage.ts');
      const { createDefaultProject } = await import('./src/hooks/mapStateUtils.ts');
      const project = createDefaultProject();
      project.levels[0].tiles[0][0] = { type: 'treasure' };
      let revision = await saveProject(project, null, false, 'full');
      for (let i = 0; i < 20; i++) revision = await saveProject(project, revision, 'Clear level', 'full');
    });
    await page.goto(`${origin}?project=full`);
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    const dialogs = [];
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.accept(); });
    await page.getByRole('button', { name: 'More actions', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Clear current level', exact: true }).click();
    if (!dialogs.some(text => text.includes('20 durable checkpoints'))) throw new Error('Missing capacity preflight');
    await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('Ordinary edit at capacity');
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    const retained = await page.evaluate(async () => (await (await import('./src/utils/storage.ts')).loadProject('full')).project.levels[0].tiles[0][0].type);
    if (retained !== 'treasure') throw new Error('Blocked clear mutated level');
    await page.getByRole('button', { name: 'Recovery copies', exact: true }).click();
    await page.getByRole('button', { name: 'Delete checkpoint 2', exact: true }).click();
    await page.getByRole('button', { name: 'Delete checkpoint 21', exact: true }).waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Close recovery copies', exact: true }).click();
    await page.getByRole('button', { name: 'More actions', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Clear current level', exact: true }).click();
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    const cleared = await page.evaluate(async () => (await (await import('./src/utils/storage.ts')).loadProject('full')).project.levels[0].tiles[0][0].type);
    if (cleared === 'treasure') throw new Error('Cleanup did not unblock clear');
  });
  await scenario('New and repeated file imports retain prior projects without ID aliasing', async page => {
    await page.goto(origin);
    await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('Original project');
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    const originalId = new URL(page.url()).searchParams.get('project');
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'New map', exact: true }).click();
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    if (new URL(page.url()).searchParams.get('project') === originalId) throw new Error('New aliased original');
    const payload = await page.evaluate(async () => {
      const { createDefaultProject } = await import('./src/hooks/mapStateUtils.ts');
      return JSON.stringify({ schemaVersion: 1, project: { ...createDefaultProject(), name: 'Imported copy', sourceProjectId: 'portable-origin' } });
    });
    for (let i = 0; i < 6; i++) {
      await page.locator('.map-header input[type=file]').setInputFiles({
        name: 'import.json', mimeType: 'application/json', buffer: Buffer.from(payload),
      });
      await page.getByText('Saved on this device', { exact: true }).waitFor();
    }
    const saved = await page.evaluate(async () => (await (await import('./src/utils/projectRepository.ts')).listProjects()));
    if (saved.length !== 8 || saved.filter(item => item.name === 'Imported copy').length !== 6) throw new Error('Import copies were rotated away');
    if (!saved.some(item => item.id === originalId && item.name === 'Original project')) throw new Error('Original was replaced');
  });
  await scenario('project fog repair preview, quota failure, cancel and original retention after reload', async page => {
    await page.evaluate(async () => {
      const { saveProject, readRecord, openDB } = await import('./src/utils/storage.ts');
      const { createDefaultProject } = await import('./src/hooks/mapStateUtils.ts');
      await saveProject(createDefaultProject(), null, false, 'fog');
      const raw = await readRecord('project:fog');
      raw.project.levels[0].fog = [[false]];
      const db = await openDB();
      await new Promise(resolve => {
        const tx = db.transaction('maps', 'readwrite');
        tx.objectStore('maps').put(raw, 'project:fog');
        tx.oncomplete = resolve;
      });
      db.close();
    });
    await page.goto(`${origin}?project=fog`);
    await page.getByText('Could not restore your project', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Review fog repair', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel repair', exact: true }).click();
    await page.getByRole('button', { name: 'Review fog repair', exact: true }).click();
    await page.evaluate(() => {
      window.originalPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function () { throw new DOMException('Injected quota', 'QuotaExceededError'); };
    });
    await page.getByRole('button', { name: 'Use repaired project', exact: true }).click();
    await page.getByText('Injected quota', { exact: true }).waitFor();
    await page.getByRole('region', { name: 'Fog repair preview' }).waitFor();
    await page.evaluate(() => { IDBObjectStore.prototype.put = window.originalPut; delete window.originalPut; });
    await page.getByRole('button', { name: 'Use repaired project', exact: true }).click();
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    await page.reload();
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    const originalKept = await page.evaluate(async () => (await (await import('./src/utils/projectRepository.ts')).projectRecoveryRecords('fog'))
      .some(record => record.data?.project?.levels[0].fog.length === 1));
    if (!originalKept) throw new Error('Fog original not retained after reload');
  });
  await scenario('ordinary quota failure offers backup and retry, then saves while offline', async (page, context) => {
    await page.goto(origin);
    await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('Before quota');
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    await page.evaluate(() => {
      window.originalPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function () { throw new DOMException('Injected quota', 'QuotaExceededError'); };
    });
    await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('Keep pending edits');
    await page.getByText('Save failed', { exact: true }).waitFor();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export backup', exact: true }).click();
    await download;
    await page.evaluate(() => { IDBObjectStore.prototype.put = window.originalPut; delete window.originalPut; });
    await page.getByRole('button', { name: 'Retry save', exact: true }).click();
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    await context.setOffline(true);
    await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('Offline edits');
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    await page.getByText('Offline', { exact: true }).waitFor();
  });
  return results;
}
