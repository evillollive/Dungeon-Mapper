// Run with Playwright MCP browser_run_code_unsafe against the dev server on port 5191.
// All writes use fresh browser contexts, never a user's existing browser storage.
async (page) => {
  const browser = page.context().browser();
  const context = await browser.newContext();
  const probe = await context.newPage();
  const origin = 'http://127.0.0.1:5191/Dungeon-Mapper/';
  const results = [];
  try {
    await probe.route('**/storage-probe.html', route => route.fulfill({ contentType: 'text/html', body: '<title>Storage probe</title>' }));
    await probe.goto(`${origin}storage-probe.html`);
    results.push(...await probe.evaluate(async () => {
      const { saveProject, loadProject, loadRecoveryRecords, StorageConflictError, RestoreError } = await import('/Dungeon-Mapper/src/utils/storage.ts');
      const { createDefaultProject } = await import('/Dungeon-Mapper/src/hooks/mapStateUtils.ts');
      const assert = (value, message) => { if (!value) throw new Error(message); };
      const results = [];
      const readRaw = () => new Promise((resolve, reject) => {
        const request = indexedDB.open('dungeon-mapper', 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('maps', 'readonly');
          const get = tx.objectStore('maps').get('autosave');
          tx.oncomplete = () => { db.close(); resolve(get.result); };
          tx.onabort = () => { db.close(); reject(tx.error); };
        }
      });
      const writeRaw = data => new Promise((resolve, reject) => {
        const request = indexedDB.open('dungeon-mapper', 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('maps', 'readwrite');
          tx.objectStore('maps').put(data, 'autosave');
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onabort = () => { db.close(); reject(tx.error); };
        };
      });
      const initial = await loadProject();
      assert(initial.project === null && initial.revision === null, 'Fresh database must be empty');
      const legacy = createDefaultProject();
      legacy.name = 'Local original';
      const rawLegacy = JSON.stringify(legacy);
      localStorage.setItem('dungeon-mapper-autosave', rawLegacy);
      const migrated = await loadProject();
      const repeated = await loadProject();
      assert(migrated.project.name === legacy.name && repeated.revision === migrated.revision, 'Migration must be idempotent');
      assert(localStorage.getItem('dungeon-mapper-autosave') === rawLegacy, 'Original legacy bytes must remain');
      results.push('localStorage migration is idempotent and retains original bytes');

      const a = { ...legacy, name: 'Tab A' };
      const b = { ...legacy, name: 'Tab B' };
      const settled = await Promise.allSettled([
        saveProject(a, migrated.revision, true),
        saveProject(b, migrated.revision, true),
      ]);
      assert(settled.filter(result => result.status === 'fulfilled').length === 1, 'Exactly one writer must win');
      const loser = settled.find(result => result.status === 'rejected');
      assert(loser.reason instanceof StorageConflictError, 'Losing writer must report a conflict');
      let loaded = await loadProject();
      assert(['Tab A', 'Tab B'].includes(loaded.project.name), 'Winning project must survive');
      const recovery = await loadRecoveryRecords();
      assert(recovery.some(record => record.data.project?.name === legacy.name), 'Replacement checkpoint must survive');
      results.push('native readwrite transactions reject stale competing writers and retain replacement');

      const beforeFailure = JSON.stringify(await readRaw());
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        const request = put.apply(this, args);
        if (args[1] === 'autosave') queueMicrotask(() => this.transaction.abort());
        return request;
      };
      try {
        await saveProject({ ...a, name: 'Aborted' }, loaded.revision);
        throw new Error('Aborted transaction reported success');
      } catch (error) {
        assert(error.name === 'AbortError' || error.message.includes('aborted'), `Wrong abort error: ${error}`);
      } finally {
        IDBObjectStore.prototype.put = put;
      }
      assert(JSON.stringify(await readRaw()) === beforeFailure, 'Aborted transaction must preserve original');
      results.push('request success followed by transaction abort never reports saved');

      const future = { schemaVersion: 999, project: { secret: 'Untouched future bytes' } };
      await writeRaw(future);
      try {
        await loadProject();
        throw new Error('Future version was accepted');
      } catch (error) {
        assert(error instanceof RestoreError && JSON.stringify(error.original) === JSON.stringify(future), 'Future data must be downloadable');
      }
      assert(JSON.stringify(await readRaw()) === JSON.stringify(future), 'Failed restore must not change original');
      results.push('unsupported schema restore retains the complete original');

      await writeRaw({ ...a, levels: [{ ...a.levels[0], tiles: [[]] }] });
      try {
        await loadProject();
        throw new Error('Malformed grid was accepted');
      } catch (error) { assert(error instanceof RestoreError, 'Malformed nested data must block restoration'); }
      results.push('malformed nested grid blocks restoration');

      await writeRaw(a);
      loaded = await loadProject();
      const revision = await saveProject(b, loaded.revision, true);
      assert((await loadProject()).revision === revision, 'Legacy IndexedDB map migration must persist');
      results.push('legacy unversioned IndexedDB project saves to versioned envelope');

      const open = indexedDB.open;
      indexedDB.open = function (...args) {
        const request = open.apply(this, args);
        queueMicrotask(() => request.dispatchEvent(new Event('blocked')));
        return request;
      };
      try {
        await loadProject();
        throw new Error('Blocked open was accepted');
      } catch (error) {
        assert(error.message.includes('blocked'), 'Blocked open needs an actionable error');
      } finally {
        indexedDB.open = open;
      }
      assert((await loadProject()).revision === revision, 'Blocked open must not change original');
      results.push('simulated blocked-open event surfaces actionable failure without writes');
      return results;
    }));

    await probe.goto(origin);
    await probe.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
    await probe.getByRole('textbox', { name: 'Map name', exact: true }).fill('Browser saved name');
    await probe.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
    await probe.reload();
    await probe.getByRole('textbox', { name: 'Map name', exact: true }).waitFor();
    if (await probe.getByRole('textbox', { name: 'Map name', exact: true }).inputValue() !== 'Browser saved name') throw new Error('Edited name did not survive reload');
    results.push('visible save status and edited project survive browser reload');

    const other = await context.newPage();
    await other.goto(origin);
    await other.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
    await probe.getByRole('textbox', { name: 'Map name', exact: true }).fill('Winning tab');
    await probe.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
    await other.getByRole('textbox', { name: 'Map name', exact: true }).fill('Stale in-memory work');
    await other.getByRole('status').filter({ hasText: 'Save conflict' }).waitFor();
    if (await other.getByRole('textbox', { name: 'Map name', exact: true }).inputValue() !== 'Stale in-memory work') throw new Error('Conflict lost in-memory work');
    await other.getByRole('button', { name: 'Export backup', exact: true }).waitFor();
    results.push('two real tabs show conflict and retain an exportable in-memory edit');

    await probe.evaluate(() => {
      window.originalPutForTest = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (args[1] === 'autosave') throw new DOMException('Simulated quota exhaustion', 'QuotaExceededError');
        return window.originalPutForTest.apply(this, args);
      };
    });
    await probe.getByRole('textbox', { name: 'Map name', exact: true }).fill('Quota recovery work');
    await probe.getByRole('status').filter({ hasText: 'Save failed' }).waitFor();
    await probe.getByRole('button', { name: 'Export backup', exact: true }).waitFor();
    await probe.evaluate(() => { IDBObjectStore.prototype.put = window.originalPutForTest; delete window.originalPutForTest; });
    await probe.getByRole('button', { name: 'Retry save', exact: true }).click();
    await probe.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
    results.push('quota failure preserves in-memory work and explicit retry saves it');

    await context.setOffline(true);
    await probe.getByRole('textbox', { name: 'Map name', exact: true }).fill('Offline device save');
    await probe.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
    await probe.getByText('Offline', { exact: true }).waitFor();
    await context.setOffline(false);
    results.push('an already-loaded editor saves to IndexedDB while offline');

    const recoveryContext = await browser.newContext();
    try {
      const broken = await recoveryContext.newPage();
      await broken.route('**/storage-probe.html', route => route.fulfill({ contentType: 'text/html', body: '<title>Recovery probe</title>' }));
      await broken.goto(`${origin}storage-probe.html`);
      const supported = await broken.evaluate(async () => {
        const { loadProject } = await import('/Dungeon-Mapper/src/utils/storage.ts');
        const { createDefaultProject } = await import('/Dungeon-Mapper/src/hooks/mapStateUtils.ts');
        const { buildPremadeProject } = await import('/Dungeon-Mapper/src/utils/premadeMaps.ts');
        await loadProject();
        await new Promise((resolve, reject) => {
          const request = indexedDB.open('dungeon-mapper', 1);
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('maps', 'readwrite');
            tx.objectStore('maps').put({ schemaVersion: 999, futureSecret: 'Do not discard me' }, 'autosave');
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onabort = () => reject(tx.error);
          };
        });
        return { valid: createDefaultProject(), sample: buildPremadeProject('sunken-crypt') };
      });
      await broken.goto(origin);
      await broken.getByRole('status').filter({ hasText: 'Could not restore your project' }).waitFor();
      if (await broken.getByRole('textbox', { name: 'Map name', exact: true }).count()) throw new Error('Restore failure exposed blank editor');
      const downloadEvent = broken.waitForEvent('download');
      await broken.getByRole('button', { name: 'Download original', exact: true }).click();
      await downloadEvent;
      await broken.getByLabel('Import recovery file').evaluate(input => {
        const transfer = new DataTransfer();
        transfer.items.add(new File(['{"levels":[]}'], 'invalid.json', { type: 'application/json' }));
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await broken.getByRole('alert').filter({ hasText: /project|levels/i }).last().waitFor();
      await broken.getByRole('button', { name: 'Download original', exact: true }).waitFor();
      broken.on('dialog', dialog => dialog.accept());
      await broken.getByLabel('Import recovery file').evaluate((input, sample) => {
        const transfer = new DataTransfer();
        transfer.items.add(new File([JSON.stringify(sample)], 'recovered.json', { type: 'application/json' }));
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, supported.sample);
      await broken.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
      if (await broken.getByRole('combobox', { name: 'Map width in tiles' }).inputValue() !== '40' ||
          await broken.getByRole('combobox', { name: 'Map height in tiles' }).inputValue() !== '40') throw new Error('Sample dimensions are not truthful');
      await broken.reload();
      await broken.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
      const retained = await broken.evaluate(async () => {
        const { loadRecoveryRecords } = await import('/Dungeon-Mapper/src/utils/storage.ts');
        return (await loadRecoveryRecords()).some(record => record.data.futureSecret === 'Do not discard me');
      });
      if (!retained) throw new Error('Recovery import discarded unsupported original');
      results.push('future-version UI blocks blank overwrite, permits raw download, rejects bad import, and recovers a 40x40 sample without losing original after reload');
    } finally {
      await recoveryContext.close();
    }
    return results;
  } finally {
    await context.close();
  }
}
