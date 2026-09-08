// Production journeys with isolated browser storage and the existing external SDK.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const playwright = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const origin = process.env.QA_ORIGIN ?? 'http://127.0.0.1:5304/Dungeon-Mapper/';
const output = process.env.QA_OUTPUT;
assert(output, 'Set QA_OUTPUT to a session artifact directory.');
await mkdir(output, { recursive: true });
const results = [];
for (const engine of (process.env.QA_ENGINES ?? 'chromium,firefox,webkit').split(',')) {
  const browser = await playwright[engine].launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.setDefaultTimeout(12000);
  const command = id => page.locator(`[data-action="${id}"]`).filter({ visible: true }).first();
  const saved = () => page.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
  const currentMap = async () => {
    await saved();
    return page.evaluate(() => new Promise((resolve, reject) => {
      const request = indexedDB.open('dungeon-mapper', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('maps', 'readonly');
        const read = tx.objectStore('maps').get(`project:${new URL(location.href).searchParams.get('project')}`);
        tx.oncomplete = () => { db.close(); resolve(read.result.project.levels[read.result.project.activeLevelIndex ?? 0]); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    }));
  };
  const close = async () => {
    const button = page.getByRole('button', { name: 'Close panel', exact: true });
    if (await button.count()) await button.click();
  };
  const place = async (kind, x = 1, y = 1, width = 3, height = 3) => {
    await close();
    const panel = page.locator('.editing-objects');
    const details = panel.locator('details');
    if (!await details.getAttribute('open').then(v => v !== null)) await details.locator('summary').click();
    await panel.getByLabel('Object type', { exact: true }).selectOption(kind);
    await panel.getByLabel('X', { exact: true }).fill(String(x));
    await panel.getByLabel('Y', { exact: true }).fill(String(y));
    if (['room', 'polygon', 'river', 'region'].includes(kind)) {
      await panel.getByLabel('Width', { exact: true }).fill(String(width));
      await panel.getByLabel('Height', { exact: true }).fill(String(height));
    }
    await panel.getByRole('button', { name: kind === 'region' ? 'Select region' : 'Place object', exact: true }).click();
  };
  const inspect = async value => {
    await close();
    await page.getByLabel('Inspect object', { exact: true }).selectOption(value);
  };
  const inspector = () => page.getByRole('region', { name: 'Selection inspector', exact: true });
  const capture = async name => {
    await page.waitForFunction(() => Math.abs(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--visual-height')) - (visualViewport?.height ?? innerHeight)) < 1);
    const geometry = await page.evaluate(() => ({
      width: innerWidth, height: innerHeight,
      overflow: document.documentElement.scrollWidth > innerWidth,
      context: document.querySelector('.context-panel')?.getBoundingClientRect().toJSON(),
      visualHeight: visualViewport?.height,
    }));
    assert.equal(geometry.overflow, false, `${name}: horizontal overflow`);
    if (geometry.context && geometry.width <= 768) {
      assert(geometry.context.top >= 0 && geometry.context.bottom <= geometry.visualHeight, `${name}: sheet outside visible viewport`);
    }
    await page.screenshot({ path: join(output, `${engine}-${name}.png`), fullPage: true });
    return { name, ...geometry };
  };
  const result = { engine, version: browser.version(), layouts: [] };
  try {
    await page.goto(origin);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Create map', exact: true }).click();
    await page.getByRole('button', { name: 'Start blank', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Project name', { exact: true }).fill('UX04 editing');
    await page.getByLabel('Width (tiles)', { exact: true }).fill('20');
    await page.getByLabel('Height (tiles)', { exact: true }).fill('20');
    await page.getByRole('button', { name: 'Preview map', exact: true }).click();
    await page.getByRole('button', { name: 'Use this map', exact: true }).click();
    await saved();
    const projectId = new URL(page.url()).searchParams.get('project');
    assert(projectId);
    await page.getByLabel('Active material', { exact: true }).selectOption('floor');
    await place('room', 1, 1);
    await inspector().getByLabel('Room shape').selectOption('circle');
    await inspector().getByLabel('Room material', { exact: true }).selectOption('water');
    await inspector().getByRole('button', { name: 'Apply changes' }).click();
    assert.equal((await currentMap()).roomShapes[0].fillTile, 'water');
    await command('edit.undo').click();
    assert.equal((await currentMap()).roomShapes[0].fillTile, 'floor');
    await command('edit.redo').click();
    result.layouts.push(await capture('desktop-room'));
    await place('river', 6, 6, 3, 3);
    await inspector().getByRole('button', { name: 'Remove point 1' }).click();
    await inspector().getByRole('button', { name: 'Cancel changes' }).click();
    assert.equal((await currentMap()).rivers[0].controlPoints.length, 2);
    await inspector().getByLabel('River width').fill('2');
    await inspector().getByRole('button', { name: 'Apply changes' }).click();
    assert.equal((await currentMap()).rivers[0].width, 2);
    await place('note', 4, 4);
    await inspector().getByLabel('Note label').fill('Private room');
    await inspector().getByLabel('Note description').fill('Keep this description intact.');
    await inspector().getByLabel('X', { exact: true }).fill('5');
    await inspector().getByRole('button', { name: 'Apply changes' }).click();
    const note = (await currentMap()).notes[0];
    assert.equal(note.x, 5);
    await close();
    await command('panel.decorate').click();
    await page.getByLabel('Search stamps').fill('chair');
    const stampButton = page.getByRole('group', { name: 'Available stamps' }).locator('.stamp-grid-item').first();
    const stampName = await stampButton.getAttribute('aria-label');
    await stampButton.click();
    await page.getByRole('button', { name: `Favorite ${stampName}`, exact: true }).click();
    await page.getByRole('button', { name: 'Favorite stamps only', exact: true }).click();
    await place('stamp', 10, 10);
    await inspector().getByLabel('Stamp scale').fill('2');
    await inspector().getByRole('button', { name: 'Apply changes' }).click();
    assert.equal((await currentMap()).stamps[0].scale, 2);
    await place('token', 12, 12);
    await page.getByRole('dialog').getByRole('textbox').focus();
    await page.keyboard.press('Escape');
    assert.equal((await currentMap()).tokens.length, 0, 'Cancelling token placement must not create a token');
    await place('token', 12, 12);
    const iconDialog = page.getByRole('dialog');
    if (await iconDialog.count()) await iconDialog.getByRole('button', { name: 'No Icon', exact: true }).click();
    await saved();
    const token = (await currentMap()).tokens[0];
    await inspect(`token:${token.id}`);
    await inspector().getByLabel('Token label').fill('Scout');
    await inspector().getByLabel('X', { exact: true }).fill('13');
    await inspector().getByRole('button', { name: 'Apply changes' }).click();
    assert.equal((await currentMap()).tokens[0].label, 'Scout');

    await close();
    await command('panel.build').click();
    await place('region', 4, 4, 3, 3);
    await inspector().getByRole('button', { name: 'Move region right' }).click();
    assert.equal((await currentMap()).notes[0].x, 6);
    await command('edit.undo').click();
    assert.equal((await currentMap()).notes[0].x, 5);
    await inspector().getByLabel('Fill region with').selectOption('floor');
    assert.equal((await currentMap()).tiles[4][5].type, 'floor');
    await inspector().getByRole('button', { name: 'Erase region tiles' }).click();
    assert.equal((await currentMap()).tiles[4][5].type, 'empty');
    await command('edit.undo').click();
    assert.equal((await currentMap()).tiles[4][5].type, 'floor');
    await close();

    // Real mouse stroke plus native pointer cancellation. Hover must not become a second pointer.
    await page.getByLabel('Active building tool').selectOption('paint');
    const canvas = page.getByRole('application');
    const point = async (x, y) => {
      const box = await canvas.boundingBox();
      return { x: box.x + (x + 0.5) * box.width / 20, y: box.y + (y + 0.5) * box.height / 20 };
    };
    await page.getByLabel('Active building tool').selectOption('room-poly');
    for (const [x, y] of [[16, 2], [18, 2], [18, 4]]) {
      const vertex = await point(x, y);
      await page.mouse.click(vertex.x, vertex.y);
    }
    await page.getByRole('button', { name: 'Finish polygon', exact: true }).click();
    assert.equal((await currentMap()).roomShapes.at(-1).shapeType, 'polygon');
    await command('edit.undo').click();
    assert.equal((await currentMap()).roomShapes.length, 1);
    await command('panel.decorate').click();
    await page.getByRole('button', { name: 'Move token tool', exact: true }).click();
    const tokenStart = await point(13, 12), tokenEnd = await point(14, 13);
    await page.mouse.move(tokenStart.x, tokenStart.y); await page.mouse.down();
    assert.equal(await inspector().count(), 0, 'Dragging must not open a layout-shifting inspector');
    await page.mouse.move(tokenEnd.x, tokenEnd.y, { steps: 6 }); await page.mouse.up();
    assert.equal((await currentMap()).tokens[0].x, 14, 'First drag with a closed inspector must complete');
    await command('edit.undo').click();
    assert.equal((await currentMap()).tokens[0].x, 13);
    await close();
    await command('panel.build').click();
    await page.getByLabel('Active building tool').selectOption('paint');
    const a = await point(2, 15), b = await point(6, 15);
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 8 });
    await canvas.dispatchEvent('pointercancel', { pointerId: 1 });
    await page.mouse.up();
    assert.equal((await currentMap()).tiles[15][2].type, 'empty');
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
    assert.equal((await currentMap()).tiles[15][2].type, 'floor');
    await command('edit.undo').click();
    assert((await currentMap()).tiles[15].slice(2, 7).every(t => t.type === 'empty'));
    await command('edit.redo').click();
    if (engine === 'chromium') {
      const cdp = await context.newCDPSession(page);
      const c = await point(2, 17), d = await point(4, 17);
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: c.x, y: c.y, button: 'left', clickCount: 1, pointerType: 'pen' });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: d.x, y: d.y, button: 'left', buttons: 1, pointerType: 'pen' });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: d.x, y: d.y, button: 'left', clickCount: 1, pointerType: 'pen' });
      assert.equal((await currentMap()).tiles[17][2].type, 'floor');
      result.pen = 'Chromium native dispatch passed';
      const t = await point(2, 18), u = await point(5, 18);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: t.x, y: t.y, id: 1 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: t.x, y: t.y, id: 1 }, { x: u.x, y: u.y, id: 2 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      assert.equal((await currentMap()).tiles[18][2].type, 'empty');
      result.touch = 'Native two-touch interruption passed';
    }
    const tap = await point(3, 18);
    await page.touchscreen.tap(tap.x, tap.y);
    assert.equal((await currentMap()).tiles[18][3].type, 'floor');
    // Returning through Library and reload retains the exact viewport, not a new fit.
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await canvas.focus(); await page.keyboard.press('ArrowRight');
    const transform = await page.locator('.canvas-transform-container').getAttribute('style');
    await saved();
    await command('file.library').click();
    await page.getByRole('button', { name: 'Continue last map', exact: true }).click();
    await canvas.waitFor();
    assert.equal(await page.locator('.canvas-transform-container').getAttribute('style'), transform);
    await page.reload(); await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('.canvas-transform-container').getAttribute('style'), transform);

    // Scope changes cannot reuse an equal numeric object ID from another level or mode.
    await inspect(`note:${note.id}`);
    await command('panel.levels').click();
    await page.getByRole('button', { name: 'Duplicate level 1', exact: true }).click();
    assert.equal(await inspector().count(), 0);
    await command('panel.build').click();
    await inspect(`note:${note.id}`);
    await command('view.viewMode').click();
    assert.equal(await inspector().count(), 0);
    await command('view.viewMode').click();
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.getByRole('button', { name: 'Expand toolbar', exact: true }).click();
    await inspect(`note:${note.id}`);
    result.layouts.push(await capture('tablet-note'));
    await close();
    await page.setViewportSize({ width: 390, height: 844 });
    await inspect(`note:${note.id}`);
    result.layouts.push(await capture('phone-note'));
    await inspector().getByLabel('Note description').focus();
    await page.setViewportSize({ width: 390, height: 460 });
    result.layouts.push(await capture('phone-keyboard-equivalent'));
    await inspector().getByLabel('Note description').fill('Cancelled on phone');
    await inspector().getByRole('button', { name: 'Cancel changes' }).click();
    assert.equal(await inspector().getByLabel('Note description').inputValue(), 'Keep this description intact.');
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog', { name: 'Context panel' }).count(), 0);
    await page.setViewportSize({ width: 720, height: 450 });
    result.layouts.push(await capture('zoom-equivalent'));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Project menu', exact: true }).click();
    await page.getByRole('button', { name: 'Project settings', exact: true }).click();
    await page.getByLabel('Interface text size').selectOption('2');
    await page.getByRole('button', { name: 'Close Project settings', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    if (await page.getByRole('button', { name: 'Expand toolbar', exact: true }).count()) await page.getByRole('button', { name: 'Expand toolbar', exact: true }).click();
    await inspect(`note:${note.id}`);
    result.layouts.push(await capture('phone-text-200'));
    await inspector().getByLabel('Note label').fill('Large text edit');
    await inspector().getByRole('button', { name: 'Apply changes' }).click();
    assert.equal((await currentMap()).notes[0].label, 'Large text edit');
    await close();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Project menu', exact: true }).click();
    await page.getByRole('button', { name: 'Project settings', exact: true }).click();
    await page.getByLabel('Interface text size').selectOption('1');
    await page.getByRole('button', { name: 'Close Project settings', exact: true }).click();
    if (await page.getByRole('button', { name: 'Expand toolbar', exact: true }).count()) await page.getByRole('button', { name: 'Expand toolbar', exact: true }).click();
    await command('panel.build').click();
    for (const [kind, field] of [['token', 'tokens'], ['note', 'notes'], ['stamp', 'stamps'], ['room', 'roomShapes'], ['river', 'rivers']]) {
      const before = await currentMap();
      await inspect(`${kind}:${before[field][0].id}`);
      await inspector().getByRole('button', { name: `Delete ${kind}`, exact: true }).click();
      assert.equal((await currentMap())[field].length, before[field].length - 1);
      await command('edit.undo').click();
      assert.equal((await currentMap())[field].length, before[field].length);
    }
    assert.equal(new URL(page.url()).searchParams.get('project'), projectId);
    assert.deepEqual(errors, []);
    result.status = 'passed';
  } catch (error) {
    result.status = 'failed'; result.error = error.stack;
    await writeFile(join(output, `${engine}-failure.txt`), await page.locator('body').ariaSnapshot());
    await page.screenshot({ path: join(output, `${engine}-failure.png`), fullPage: true });
    throw error;
  } finally {
    results.push(result);
    await writeFile(join(output, 'results.json'), JSON.stringify(results, null, 2));
    await context.close(); await browser.close();
  }
}
console.log(JSON.stringify(results, null, 2));
