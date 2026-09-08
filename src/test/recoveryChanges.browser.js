// Playwright MCP function. Run against the existing dev server on port 5191.
async (page) => {
  const context = await page.context().browser().newContext();
  const editor = await context.newPage();
  const origin = 'http://127.0.0.1:5191/Dungeon-Mapper/';
  const results = [];
  const saved = () => editor.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
  try {
    await editor.route('**/recovery-probe.html', route => route.fulfill({ contentType: 'text/html', body: '<title>Recovery probe</title>' }));
    await editor.goto(`${origin}recovery-probe.html`);
    const seedRevision = await editor.evaluate(async () => {
      const { loadProject, saveProject } = await import('/Dungeon-Mapper/src/utils/storage.ts');
      const { createDefaultProject, createDefaultMap } = await import('/Dungeon-Mapper/src/hooks/mapStateUtils.ts');
      await loadProject();
      const project = createDefaultProject();
      project.levels[0].tiles[0][0] = { type: 'treasure' };
      project.levels[0].notes.push({ id: 1, x: 0, y: 0, label: 'Treasure', description: 'Private description' });
      project.levels.push(createDefaultMap('Keep this floor'));
      project.levels[1].tiles[1][1] = { type: 'pillar' };
      return saveProject(project, null);
    });
    await editor.goto(origin);
    await saved();
    await editor.getByRole('button', { name: 'More actions' }).click();
    editor.once('dialog', dialog => dialog.dismiss());
    await editor.getByRole('menuitem', { name: 'Clear current level' }).click();
    const cancelledRevision = await editor.evaluate(async () => {
      const { loadProject } = await import('/Dungeon-Mapper/src/utils/storage.ts');
      return (await loadProject()).revision;
    });
    if (cancelledRevision !== seedRevision) throw new Error('Cancel clear changed storage');
    await editor.getByRole('button', { name: 'More actions' }).click();
    editor.once('dialog', dialog => dialog.accept());
    await editor.getByRole('menuitem', { name: 'Clear current level' }).click();
    await saved();
    await editor.getByRole('textbox', { name: 'Map name', exact: true }).fill('Edited after clear');
    await saved();
    await editor.reload();
    await saved();
    const clearRetained = await editor.evaluate(async () => {
      const { loadProject, loadRecoveryRecords } = await import('/Dungeon-Mapper/src/utils/storage.ts');
      const { project } = await loadProject();
      const records = await loadRecoveryRecords();
      return project.levels[0].tiles[0][0].type === 'empty' &&
        project.levels[1].tiles[1][1].type === 'pillar' &&
        records.some(record => record.reason === 'Clear level' &&
          record.data.project.levels[0].tiles[0][0].type === 'treasure' &&
          record.data.project.levels[0].notes[0].description === 'Private description');
    });
    if (!clearRetained) throw new Error('Clear checkpoint did not retain the complete original across edits/reload');
    results.push('clear cancellation is inert; named full-project checkpoint survives ordinary edits and reload');

    const original = await editor.evaluate(async () => {
      const { loadProject, saveProject, loadRecoveryRecords } = await import('/Dungeon-Mapper/src/utils/storage.ts');
      let current = await loadProject();
      for (let i = 0; i < 7; i++) {
        const next = { ...current.project, name: `Version ${i}` };
        current = { project: next, revision: await saveProject(next, current.revision, 'Generate region') };
      }
      const retained = (await loadRecoveryRecords()).filter(record => record.reason);
      if (retained.length !== 5 || retained.some(record => record.reason !== 'Generate region')) throw new Error('Checkpoint retention did not keep the latest five');
      const stale = current.project;
      stale.levels[0].fog = Array.from({ length: 16 }, () => Array(40).fill(false));
      stale.levels[0].explored = Array.from({ length: 40 }, () => Array(24).fill(true));
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('dungeon-mapper', 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('maps', 'readwrite');
          tx.objectStore('maps').put(stale, 'autosave');
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onabort = () => { db.close(); reject(tx.error); };
        };
      });
      return JSON.stringify(stale);
    });
    results.push('native transactions retain exactly five named pre-change checkpoints');
    await editor.reload();
    await editor.getByRole('status').filter({ hasText: 'Could not restore your project' }).waitFor();
    await editor.getByRole('button', { name: 'Review fog repair' }).click();
    await editor.getByRole('region', { name: 'Fog repair preview' }).waitFor();
    await editor.getByRole('button', { name: 'Cancel repair' }).click();
    const stillOriginal = await editor.evaluate(async () => {
      const { loadProject } = await import('/Dungeon-Mapper/src/utils/storage.ts');
      try { await loadProject(); return null; } catch (error) { return JSON.stringify(error.original); }
    });
    if (stillOriginal !== original) throw new Error('Repair preview/cancellation mutated original');
    await editor.getByRole('button', { name: 'Review fog repair' }).click();
    await editor.evaluate(() => {
      window.repairOriginalPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (args[1] === 'autosave') throw new DOMException('Repair quota failure', 'QuotaExceededError');
        return window.repairOriginalPut.apply(this, args);
      };
    });
    await editor.getByRole('button', { name: 'Use repaired project' }).click();
    await editor.getByText('Repair quota failure', { exact: true }).waitFor();
    await editor.getByRole('region', { name: 'Fog repair preview' }).waitFor();
    await editor.evaluate(() => {
      IDBObjectStore.prototype.put = window.repairOriginalPut;
      delete window.repairOriginalPut;
    });
    await editor.getByRole('button', { name: 'Use repaired project' }).click();
    await saved();
    await editor.reload();
    await saved();
    const repaired = await editor.evaluate(async expected => {
      const { loadProject, loadRecoveryRecords } = await import('/Dungeon-Mapper/src/utils/storage.ts');
      const { project } = await loadProject();
      const level = project.levels[0];
      const records = await loadRecoveryRecords();
      return level.fog.length === 32 && level.fog.every(row => row.length === 32) &&
        level.fog[0][0] === false && level.fog[31][31] === true &&
        level.explored[0][0] === true && level.explored[0][31] === false &&
        project.levels[1].tiles[1][1].type === 'pillar' &&
        records.some(record => record.reason === 'Fog repair' && JSON.stringify(record.data) === expected);
    }, original);
    if (!repaired) throw new Error('Repair or retained original is incorrect');
    results.push('repair preview/cancel is non-mutating; quota failure retains preview; retry repairs dimensions with original retained after reload');

    await editor.getByRole('button', { name: 'Recovery copies', exact: true }).click();
    await editor.getByLabel('Review a fog repair file').evaluate((input, raw) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([raw], 'legacy-fog.json', { type: 'application/json' }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, original);
    await editor.getByRole('region', { name: 'Fog repair preview' }).waitFor();
    const other = await context.newPage();
    await other.route('**/recovery-probe.html', route => route.fulfill({ contentType: 'text/html', body: '<title>Competing writer</title>' }));
    await other.goto(`${origin}recovery-probe.html`);
    await other.evaluate(async () => {
      const { loadProject, saveProject } = await import('/Dungeon-Mapper/src/utils/storage.ts');
      const current = await loadProject();
      await saveProject({ ...current.project, name: 'Concurrent winner' }, current.revision);
    });
    await other.close();
    await editor.getByRole('button', { name: 'Use repaired project' }).click();
    await editor.getByRole('status').filter({ hasText: 'Save conflict' }).waitFor();
    await editor.getByRole('region', { name: 'Fog repair preview' }).waitFor();
    const winner = await editor.evaluate(async () => {
      const { loadProject } = await import('/Dungeon-Mapper/src/utils/storage.ts');
      return (await loadProject()).project.name;
    });
    if (winner !== 'Concurrent winner') throw new Error('Repair confirmation overwrote a concurrent revision');
    results.push('a competing tab between repair preview and confirmation cannot be overwritten');
    await editor.reload();
    await saved();
    await editor.getByRole('button', { name: 'Recovery copies', exact: true }).click();
    await editor.getByLabel('Review a fog repair file').evaluate((input, raw) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([raw], 'legacy-fog.json', { type: 'application/json' }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, original);
    await editor.getByRole('region', { name: 'Fog repair preview' }).waitFor();
    await editor.getByRole('button', { name: 'Use repaired project' }).click();
    await saved();
    await editor.reload();
    await saved();
    results.push('legacy file repair is previewed and imported through the guarded project replacement path');
    return results;
  } finally {
    await context.close();
  }
}
