// Callable Page-only production journey. Uses native browser IndexedDB and two
// windows in one context. No SDK dependency is added to the application.
(async (page) => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  page.setDefaultTimeout(15000);
  const base = `${page.url().split('/Dungeon-Mapper/')[0]}/Dungeon-Mapper/`;
  const context = await page.context().browser().newContext();
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  const sentinel = 'PRIVATE_SENTINEL_UX06';
  const installObserver = () => {
    window.__ux06Packets = [];
    window.__ux06PrivateFlash = false;
    window.__ux06StorageOpens = 0;
    const originalOpen = indexedDB.open.bind(indexedDB);
    indexedDB.open = (...args) => { window.__ux06StorageOpens++; return originalOpen(...args); };
    const NativeChannel = BroadcastChannel;
    window.BroadcastChannel = class extends NativeChannel {
      postMessage(data) { window.__ux06Packets.push({ channel: this.name, data: structuredClone(data) }); return super.postMessage(data); }
    };
    const watch = () => {
      if (new URLSearchParams(location.search).has('player') && document.body.innerHTML.includes('PRIVATE_SENTINEL_UX06')) {
        window.__ux06PrivateFlash = true;
      }
    };
    addEventListener('DOMContentLoaded', () => new MutationObserver(watch).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }));
  };
  await page.context().addInitScript(installObserver);
  await page.goto(`${base}?view=library`);
  await page.waitForLoadState('networkidle');
  const makeMap = (name, publicName) => ({
    meta: { name, publicName, width: 8, height: 8, tileSize: 20 },
    tiles: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ({ type: 'floor' }))),
    fogEnabled: true,
    fog: Array.from({ length: 8 }, (_, y) => Array.from({ length: 8 }, (_, x) => x >= 5 || y >= 5)),
    notes: [{ id: 1, x: 1, y: 1, label: sentinel, description: sentinel }],
    tokens: [{ id: 1, x: 1, y: 1, kind: 'player', label: 'Scout' },
      { id: 2, x: 7, y: 7, kind: 'monster', label: sentinel, hidden: true }],
    initiative: [1, 2],
  });
  const project = { name: `UX06 ${sentinel}`, levels: [makeMap('DM lower', 'The Gate'), makeMap(`${sentinel} upper`, 'The Tower')],
    activeLevelIndex: 0, stairLinks: [] };
  await page.locator('input[type="file"]').evaluate((input, value) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([JSON.stringify(value)], 'ux06.json', { type: 'application/json' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, project);
  await page.getByRole('button', { name: 'Import as new project', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
  const sourceId = await page.evaluate(() => new URL(location.href).searchParams.get('project'));
  const read = async key => page.evaluate(key => new Promise((resolve, reject) => {
    const request = indexedDB.open('dungeon-mapper', 1);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('maps', 'readonly');
      const get = tx.objectStore('maps').get(key);
      tx.oncomplete = () => { db.close(); resolve(get.result); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
    request.onerror = () => reject(request.error);
  }), key);
  const sourceBefore = JSON.stringify(await read(`project:${sourceId}`));
  await page.getByRole('button', { name: 'Prepare session', exact: true }).click();
  await page.getByRole('heading', { name: 'Set the table' }).waitFor();
  assert(await page.getByRole('button', { name: 'Start session', exact: true }).isDisabled(), 'Readiness acknowledgement not required');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  const saved = () => page.getByRole('status').filter({ hasText: 'Session saved on this device.' }).waitFor();
  await saved();
  const sessionUrl = page.url();
  const sessionId = await page.evaluate(() => new URL(location.href).searchParams.get('session'));
  const openPopup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open player display', exact: true }).click();
  let player = await openPopup;
  player.setDefaultTimeout(15000);
  await player.getByRole('heading', { name: 'Waiting at the table' }).waitFor();
  await page.getByRole('status').filter({ hasText: 'Connected and blank' }).waitFor();
  assert(await player.locator('canvas').count() === 0, 'New display is not blank');
  assert(await player.evaluate(() => window.__ux06StorageOpens) === 0, 'Player opened storage');
  const show = async title => {
    await page.getByRole('button', { name: 'Show this level', exact: true }).click();
    await saved();
    await player.getByRole('heading', { name: title, exact: true }).waitFor();
    await page.getByRole('status').filter({ hasText: 'Live. Display acknowledged' }).waitFor();
  };
  await show('The Gate');
  const cell = async (x, y) => {
    await page.getByLabel('Cell X', { exact: true }).fill(String(x));
    await page.getByLabel('Cell Y', { exact: true }).fill(String(y));
    await page.getByRole('button', { name: 'Apply to cell', exact: true }).click();
    await saved();
  };
  await cell(5, 2);
  assert((await read(`session:${sessionId}`)).progress.project.levels[0].fog[2][5] === false, 'Reveal did not persist');
  await page.getByRole('button', { name: 'Move token', exact: true }).click();
  await page.getByLabel('Session token').selectOption('1');
  await cell(2, 1);
  await player.getByText('Scout (2, 1)', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Next turn', exact: true }).click();
  await saved();
  assert((await read(`session:${sessionId}`)).progress.turn === 1, 'Turn did not advance');
  await page.getByRole('button', { name: 'Next turn', exact: true }).click();
  await saved();
  await page.getByRole('heading', { name: 'Round 2', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Previous turn', exact: true }).click();
  await saved();
  await page.getByRole('button', { name: 'Measure', exact: true }).click();
  await cell(0, 0);
  await cell(3, 4);
  await page.getByRole('status').filter({ hasText: 'Distance: 5.00 cells' }).waitFor();
  await page.getByRole('button', { name: 'Ping', exact: true }).click();
  await cell(2, 2);
  await page.getByRole('status').filter({ hasText: 'Ping sent' }).waitFor();
  await page.getByRole('button', { name: 'Clear ping', exact: true }).click();
  await page.getByLabel('Checkpoint name').fill('At the gate');
  await page.getByRole('button', { name: 'Save checkpoint', exact: true }).click();
  await saved();
  await page.getByLabel('Inspect DM level').selectOption('1');
  assert(await player.getByRole('heading', { name: 'The Gate', exact: true }).isVisible(), 'DM browsing published another level');
  assert((await read(`session:${sessionId}`)).progress.encounterLevel === 0, 'Inspection changed encounter');
  await show('The Tower');
  await page.getByRole('button', { name: 'Pause / blank now', exact: true }).click();
  await player.getByRole('heading', { name: 'Waiting at the table' }).waitFor();
  const packets = await page.evaluate(() => window.__ux06Packets);
  const snapshots = packets.filter(p => p.data.type === 'snapshot');
  assert(snapshots.length > 0, 'No snapshots observed');
  assert(!JSON.stringify(packets).includes(sentinel), 'Private sentinel crossed transport');
  assert(snapshots.every(p => p.data.projection.map.tiles[7][7].type === 'empty'), 'Unknown geometry crossed transport');
  const stale = snapshots[snapshots.length - 1];
  await page.evaluate(packet => {
    const channel = new BroadcastChannel(packet.channel);
    channel.postMessage({ ...packet.data, revision: packet.data.revision + 1000 });
    channel.close();
  }, stale);
  await player.waitForTimeout(200);
  assert(await player.locator('canvas').count() === 0, 'Queued old epoch flashed after pause');
  await show('The Tower');
  await player.reload();
  await player.getByRole('heading', { name: 'Waiting at the table' }).waitFor();
  await page.getByRole('status').filter({ hasText: 'Connected and blank' }).waitFor();
  await show('The Tower');
  assert(!(await player.locator('body').innerHTML()).includes(sentinel), 'Private DOM content');
  assert(!(await player.locator('body').ariaSnapshot()).includes(sentinel), 'Private accessible content');
  assert(!await player.evaluate(() => window.__ux06PrivateFlash), 'Private intermediate flash');
  assert(await player.getByRole('button').count() === 3, 'Player has authoring controls');
  assert(await player.evaluate(() => window.__ux06StorageOpens) === 0, 'Player reload opened a writer');
  for (const size of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await player.setViewportSize(size);
    await player.getByRole('button', { name: 'Fit map', exact: true }).click();
    assert(await player.getByRole('button', { name: 'Fit map', exact: true }).evaluate(button => button.getBoundingClientRect().height >= 44), 'Player touch target too small');
    await player.getByRole('heading', { name: 'Visible tokens', exact: true }).scrollIntoViewIfNeeded();
    assert(await player.getByRole('heading', { name: 'Visible tokens', exact: true }).evaluate(heading => {
      const rect = heading.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= innerHeight;
    }), `Player legend cannot be scrolled into view at ${size.width}`);
  }
  await page.evaluate(() => {
    window.__ux06Send = BroadcastChannel.prototype.postMessage;
    BroadcastChannel.prototype.postMessage = () => {};
  });
  await player.getByRole('status').filter({ hasText: 'Disconnected and blank' }).waitFor();
  assert(await player.locator('canvas').count() === 0, 'Disconnected display retained a map');
  await page.evaluate(() => { BroadcastChannel.prototype.postMessage = window.__ux06Send; });
  await player.getByRole('button', { name: 'Reconnect display', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Connected and blank' }).waitFor();
  await show('The Tower');
  await page.reload();
  await saved();
  await player.getByRole('heading', { name: 'Waiting at the table' }).waitFor();
  assert(await page.getByRole('button', { name: 'Undo session map action', exact: true }).isDisabled(), 'Undo persisted across reload');
  const playerUrlBefore = player.url();
  await page.getByRole('button', { name: 'Open player display', exact: true }).click();
  await player.waitForURL(url => url.href !== playerUrlBefore);
  await page.getByRole('status').filter({ hasText: 'Connected and blank' }).waitFor();
  await show('The Gate');
  await page.evaluate(() => { window.__ux06Open = window.open; window.open = () => null; });
  await page.getByRole('button', { name: 'Open player display', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Popup blocked' }).waitFor();
  await page.evaluate(() => { window.open = window.__ux06Open; });
  await page.getByRole('button', { name: 'Player preview', exact: true }).click();
  await page.getByRole('main', { name: 'Player content' }).waitFor();
  await page.getByRole('button', { name: 'Close player preview', exact: true }).click();
  const layouts = [];
  for (const size of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    assert(await page.evaluate(() => document.querySelector('.session-workspace').scrollWidth <= innerWidth), `Run overflow at ${size.width}`);
    await page.getByRole('button', { name: 'Pause / blank now', exact: true }).click();
    layouts.push(size);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Move token', exact: true }).click();
  await page.getByLabel('Session token').selectOption('1');
  await cell(3, 1);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Restore checkpoint', exact: true }).click();
  await saved();
  assert((await read(`session:${sessionId}`)).progress.project.levels[0].tokens[0].x === 2, 'Checkpoint restore lost map state');
  assert(await page.getByRole('button', { name: 'Undo session map action', exact: true }).isDisabled(), 'Restore retained incompatible history');
  await page.evaluate(() => {
    window.__ux06Transaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args) {
      if (args[1] === 'readwrite') throw new DOMException('Simulated storage full', 'QuotaExceededError');
      return window.__ux06Transaction.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Next turn', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Simulated storage full' }).waitFor();
  assert(await page.getByRole('button', { name: 'Next turn', exact: true }).isDisabled(), 'Editing continued after failed save');
  const recoveryDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download session recovery', exact: true }).click();
  assert((await recoveryDownload).suggestedFilename() === 'dm-session-recovery.json', 'No downloadable recovery on failure');
  await page.evaluate(() => { IDBDatabase.prototype.transaction = window.__ux06Transaction; });
  await page.getByRole('button', { name: 'Retry session save', exact: true }).click();
  await saved();
  const competitor = await context.newPage();
  await competitor.goto(sessionUrl);
  await competitor.getByRole('status').filter({ hasText: 'Session saved on this device.' }).waitFor();
  await competitor.getByRole('button', { name: 'Next turn', exact: true }).click();
  await competitor.getByRole('status').filter({ hasText: 'Session saved on this device.' }).waitFor();
  await page.getByRole('button', { name: 'Next turn', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'another tab' }).waitFor();
  await competitor.close();
  await page.reload();
  await saved();
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await page.getByRole('button', { name: 'Save session progress', exact: true }).click();
  await saved();
  assert((await read(`session:${sessionId}`)).status === 'saved', 'End save failed');
  await page.reload();
  await saved();
  await page.getByRole('button', { name: 'Resume session', exact: true }).click();
  await saved();
  assert((await read(`session:${sessionId}`)).progress.project.levels[0].tokens[0].x === 2, 'Resume lost token progress');
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Discard changes since session start', exact: true }).click();
  await saved();
  const discarded = await read(`session:${sessionId}`);
  assert(discarded.status === 'discarded' && discarded.progress.project.levels[0].tokens[0].x === 1, 'Discard did not restore original source');
  assert(discarded.endCheckpoint.project.levels[0].tokens[0].x === 2, 'Discard lost pre-end recovery');
  assert(JSON.stringify(await read(`project:${sourceId}`)) === sourceBefore, 'Session changed authored source bytes');
  await player.close();
  const result = { browser: page.context().browser().version(), sourceId, sessionId, sessionUrl, layouts, snapshotCount: snapshots.length,
    passed: ['prepare/start', 'blank handshake', 'reveal/move', 'turn/round', 'measure/ping', 'checkpoint',
      'private inspection vs publish', 'pause and stale epoch', 'player reload', 'transport loss/reconnect', 'DM reload/reopen',
      'popup blocked and preview fallback', 'DOM/accessibility/transport sentinels', 'no player storage writer',
      'checkpoint restore/history reset', 'storage failure/download/retry', 'concurrent session CAS conflict',
      'save/resume/discard', 'source byte isolation', 'responsive layouts'] };
  await context.close();
  return result;
})
