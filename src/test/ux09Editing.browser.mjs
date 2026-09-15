import assert from 'node:assert/strict';
import { join } from 'node:path';
import { expect } from 'playwright/test';
import { records } from './ux02Creation.browser.mjs';
import { backup, library, projectId, saved } from './ux09Library.browser.mjs';
import { configureKeyboard, tabTo, activate, typeIn, command as keyboardCommand, panelContrast } from './ux09Keyboard.browser.mjs';

const inspector = page => page.getByRole('region', { name: 'Selection inspector', exact: true });
const action = (page, id) => page.locator(`[data-action="${id}"]`).filter({ visible: true }).first();
const record = async page => (await records(page))[`project:${projectId(page)}`];
// History may materialize absent optional keys as undefined. Compare the
// portable JSON contract for content, but raw native records for write guards.
const portable = value => JSON.parse(JSON.stringify(value));
const currentMap = async page => {
  await saved(page);
  const { project } = await record(page);
  return portable(project.levels[project.activeLevelIndex ?? 0]);
};
const field = (page, name) => name === 'Note description'
  ? inspector(page).getByRole('textbox', { name, exact: true })
  : inspector(page).getByLabel(name, { exact: true });
const apply = page => inspector(page).getByRole('button', { name: 'Apply changes', exact: true });
const cancel = page => inspector(page).getByRole('button', { name: 'Cancel changes', exact: true });

async function closePanel(page) {
  const close = page.getByRole('button', { name: 'Close panel', exact: true });
  if (await close.count()) await close.click();
}

async function create(page) {
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Create map', exact: true }).click();
  await page.getByRole('button', { name: 'Start blank', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Project name', { exact: true }).fill('A-EDIT encounter');
  await page.getByLabel('Width (tiles)', { exact: true }).fill('20');
  await page.getByLabel('Height (tiles)', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Preview map', exact: true }).click();
  await page.getByRole('button', { name: 'Use this map', exact: true }).click();
  await saved(page);
  assert(projectId(page));
  await page.getByLabel('Active material', { exact: true }).selectOption('floor');
}

async function place(page, kind, x = 2, y = 2, width = 3, height = 3) {
  await closePanel(page);
  const panel = page.locator('.editing-objects');
  const details = panel.locator('details');
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
  await panel.getByLabel('Object type', { exact: true }).selectOption(kind);
  await panel.getByLabel('X', { exact: true }).fill(String(x));
  await panel.getByLabel('Y', { exact: true }).fill(String(y));
  if (['room', 'polygon', 'river', 'region'].includes(kind)) {
    await panel.getByLabel('Width', { exact: true }).fill(String(width));
    await panel.getByLabel('Height', { exact: true }).fill(String(height));
  }
  await panel.getByRole('button', { name: kind === 'region' ? 'Select region' : 'Place object', exact: true }).click();
}

async function inspect(page, kind, id) {
  await closePanel(page);
  await page.getByLabel('Inspect object', { exact: true }).selectOption(`${kind}:${id}`);
  await expect(inspector(page)).toBeVisible();
}

async function chooseStamp(page) {
  await closePanel(page);
  await action(page, 'panel.decorate').click();
  await page.getByLabel('Search stamps', { exact: true }).fill('chair');
  const stamp = page.getByRole('group', { name: 'Available stamps' }).locator('.stamp-grid-item').first();
  const name = await stamp.getAttribute('aria-label');
  assert(name);
  await stamp.click();
  return name;
}

async function unchanged(page, before) {
  // Observe beyond the production 500 ms save debounce, including invalid or
  // cancelled drafts that must never enqueue a durable write.
  await page.waitForTimeout(750);
  assert.deepEqual(await record(page), before, 'Uncommitted work must not change the project or save revision');
}

const objects = [
  { kind: 'room', layer: 'roomShapes', input: 'Width', value: '5', property: 'width', expected: 5 },
  { kind: 'polygon', select: 'room', layer: 'roomShapes', input: 'Room material', value: 'water', property: 'fillTile', expected: 'water', selectInput: true },
  { kind: 'river', layer: 'rivers', input: 'River width', value: '2.5', property: 'width', expected: 2.5 },
  { kind: 'note', layer: 'notes', input: 'Note label', value: 'Private room', property: 'label', expected: 'Private room' },
  { kind: 'token', layer: 'tokens', input: 'Token label', value: 'Scout', property: 'label', expected: 'Scout' },
  { kind: 'stamp', layer: 'stamps', input: 'Stamp scale', value: '2', property: 'scale', expected: 2 },
];

async function objectEditing(page, object, { engine }) {
  configureKeyboard(page, engine);
  await create(page);
  const { kind, layer, input, value, property, expected } = object;
  if (kind === 'stamp') await chooseStamp(page);
  if (kind === 'token') {
    const before = await record(page);
    await place(page, kind);
    await page.getByRole('dialog').getByRole('textbox').focus();
    await page.keyboard.press('Escape');
    await unchanged(page, before);
  }
  await place(page, kind);
  if (kind === 'token') {
    await page.getByRole('dialog').getByRole('button', { name: 'No Icon', exact: true }).click();
  }
  const placed = await currentMap(page);
  assert.equal(placed[layer].length, 1);
  const id = placed[layer][0].id;
  await inspect(page, object.select ?? kind, id);
  const before = await record(page);
  const change = async () => {
    if (object.selectInput) {
      await tabTo(page, field(page, input));
      await page.keyboard.press('u');
      await page.keyboard.press('Tab');
      await expect(field(page, input)).toHaveValue(value);
    } else await typeIn(page, field(page, input), value);
    if (kind === 'note') {
      await field(page, 'Note description').fill('PRIVATE_EDIT_SENTINEL\nKeep this description intact.');
      await field(page, 'X').fill('3');
    }
    if (kind === 'room') await field(page, 'Room shape').selectOption('circle');
    if (kind === 'river') await field(page, 'Point 1 X').fill('0.3333333333333333');
    if (kind === 'stamp') {
      await field(page, 'Rotation').fill('45');
      await field(page, 'Flip horizontally').check();
    }
  };
  await change();
  await unchanged(page, before);
  await activate(page, cancel(page));
  await unchanged(page, before);
  await expect(field(page, input)).toHaveValue(String(placed[layer][0][property] ?? 'floor'));
  await change();
  await activate(page, apply(page));
  const edited = await currentMap(page);
  assert.equal(edited[layer][0][property], expected);
  if (kind === 'note') {
    assert.equal(edited.notes[0].x, 3);
    assert.equal(edited.tiles[2][2].noteId, undefined);
    assert.equal(edited.tiles[2][3].noteId, id);
  }
  if (kind === 'polygon') assert.deepEqual(edited.roomShapes[0].vertices, placed.roomShapes[0].vertices);
  if (kind === 'river') assert.equal(edited.rivers[0].controlPoints[0].x, 1 / 3);
  await action(page, 'edit.undo').click();
  assert.deepEqual(await currentMap(page), placed, 'One Undo must restore every field in the applied edit');
  await action(page, 'edit.redo').click();
  assert.deepEqual(await currentMap(page), edited);
  const committed = await record(page);
  await expect(apply(page)).toBeDisabled();
  await apply(page).press('Enter');
  await unchanged(page, committed);

  if (kind === 'river') {
    await inspector(page).getByRole('button', { name: 'Remove point 1', exact: true }).click();
    await cancel(page).click();
    assert.deepEqual(await currentMap(page), edited);
    await inspector(page).getByRole('button', { name: 'Remove point 1', exact: true }).click();
    await apply(page).click();
    assert.equal((await currentMap(page)).rivers[0].controlPoints.length, 1);
    await expect(inspector(page).getByRole('button', { name: 'Remove point 1', exact: true })).toBeDisabled();
    await action(page, 'edit.undo').click();
    assert.deepEqual(await currentMap(page), edited);
  }
  if (kind === 'stamp') {
    await field(page, 'Lock stamp').check();
    await apply(page).click();
    await saved(page);
    await expect(field(page, 'Stamp scale')).toBeDisabled();
    await field(page, 'Lock stamp').uncheck();
    await expect(field(page, 'Stamp scale')).toBeDisabled();
    await apply(page).click();
    await expect(field(page, 'Stamp scale')).toBeEnabled();
    await saved(page);
  }
  const retained = await currentMap(page);
  await inspector(page).getByRole('button', { name: `Delete ${object.select ?? kind}`, exact: true }).click();
  assert.equal((await currentMap(page))[layer].length, 0);
  await expect(inspector(page)).toHaveCount(0);
  await action(page, 'edit.undo').click();
  assert.deepEqual(await currentMap(page), retained, 'Delete undo must restore IDs, geometry and dependent layers');
  await expect(inspector(page)).toHaveCount(0);
  const url = page.url();
  await page.reload();
  assert.deepEqual(await currentMap(page), retained);
  assert.equal(page.url(), url);
  return { kind, id, keyboardPrimaryPropertyApplyCancel: true, atomicApply: true, cancelledDraftNotSaved: true, deleteUndoAndReload: true };
}

async function favorites(page) {
  await create(page);
  const name = await chooseStamp(page);
  const favorite = page.getByRole('button', { name: `Favorite ${name}`, exact: true });
  await favorite.click();
  await expect(favorite).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await saved(page);
  await chooseStamp(page);
  await page.getByRole('button', { name: 'Favorite stamps only', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Available stamps' }).locator('.stamp-grid-item')).toHaveCount(1);
  const before = await record(page);
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    window.restoreEditingPreferences = () => { Storage.prototype.setItem = setItem; };
    window.editingPreferenceFaults = 0;
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage && key === 'dungeon-mapper:favorites:stamps') {
        window.editingPreferenceFaults++;
        throw new DOMException('Injected editing preference failure', 'QuotaExceededError');
      }
      return setItem.call(this, key, value);
    };
  });
  try {
    await favorite.click();
    await page.getByRole('status').filter({ hasText: 'Favorites are available for this visit only' }).waitFor();
    assert.equal(await page.evaluate(() => window.editingPreferenceFaults), 1);
    await expect(page.getByRole('group', { name: 'Available stamps' }).locator('.stamp-grid-item')).toHaveCount(0);
    await unchanged(page, before);
    await page.getByRole('button', { name: 'Favorite stamps only', exact: true }).click();
    await page.getByRole('button', { name, exact: true }).click();
    await place(page, 'stamp');
    assert.equal((await currentMap(page)).stamps.length, 1, 'A preference failure must not block project editing or saving');
  } finally {
    await page.evaluate(() => window.restoreEditingPreferences());
  }
  await page.reload();
  await saved(page);
  await chooseStamp(page);
  await expect(favorite).toHaveAttribute('aria-pressed', 'true');
  return { searchAndFavoriteReload: true, isolatedPreferenceFailure: true, projectSaveUnaffected: true };
}

async function regions(page) {
  await create(page);
  await place(page, 'note');
  await field(page, 'Note label').fill('Region note');
  await apply(page).click();
  await chooseStamp(page);
  await place(page, 'stamp');
  await closePanel(page);
  await action(page, 'panel.build').click();
  await place(page, 'room', 10, 10);
  await place(page, 'river', 14, 14);
  const before = await currentMap(page);
  await place(page, 'region', 2, 2);
  await inspector(page).getByRole('button', { name: 'Move region right', exact: true }).click();
  const moved = await currentMap(page);
  assert.deepEqual(moved.notes, before.notes.map(note => ({ ...note, x: note.x + 1 })));
  assert.deepEqual(moved.stamps, before.stamps.map(stamp => ({ ...stamp, x: stamp.x + 1 })));
  assert.equal(moved.tiles[2][3].noteId, before.notes[0].id);
  assert.equal(moved.tiles[2][2].noteId, undefined);
  assert.deepEqual(moved.roomShapes, before.roomShapes);
  assert.deepEqual(moved.rivers, before.rivers);
  await action(page, 'edit.undo').click();
  assert.deepEqual(await currentMap(page), before);
  await action(page, 'edit.redo').click();
  assert.deepEqual(await currentMap(page), moved);
  await field(page, 'Fill region with').selectOption('floor');
  const filled = await currentMap(page);
  assert(filled.tiles.slice(2, 5).every(row => row.slice(3, 6).every(tile => tile.type === 'floor')));
  await inspector(page).getByRole('button', { name: 'Erase region tiles', exact: true }).click();
  assert((await currentMap(page)).tiles.slice(2, 5).every(row => row.slice(3, 6).every(tile => tile.type === 'empty')));
  await action(page, 'edit.undo').click();
  assert.deepEqual(await currentMap(page), filled);
  await place(page, 'region', 0, 0, 20, 20);
  for (const direction of ['left', 'right', 'up', 'down']) {
    await expect(inspector(page).getByRole('button', { name: `Move region ${direction}`, exact: true })).toBeDisabled();
  }
  return { overlappingMove: true, tileReferencePreserved: true, unrelatedGeometryPreserved: true, boundsGuarded: true };
}

async function point(page, x, y) {
  const box = await page.getByRole('application').boundingBox();
  assert(box, 'Map canvas must be visible');
  return { x: box.x + (x + 0.5) * box.width / 20, y: box.y + (y + 0.5) * box.height / 20 };
}

async function gestures(page) {
  await create(page);
  const canvas = page.getByRole('application');
  await page.getByLabel('Active building tool').selectOption('paint');
  const before = await record(page);
  for (const interruption of ['pointercancel', 'Escape', 'blur']) {
    const a = await point(page, 2, 15), b = await point(page, 6, 15);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 8 });
    if (interruption === 'pointercancel') await canvas.dispatchEvent('pointercancel', { pointerId: 1 });
    else if (interruption === 'Escape') await page.keyboard.press('Escape');
    else await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.mouse.up();
    await unchanged(page, before);
  }
  const a = await point(page, 2, 15), b = await point(page, 6, 15);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
  const painted = await currentMap(page);
  assert(painted.tiles[15].slice(2, 7).every(tile => tile.type === 'floor'));
  await action(page, 'edit.undo').click();
  assert.deepEqual(await currentMap(page), portable(before.project.levels[0]));
  await action(page, 'edit.redo').click();
  assert.deepEqual(await currentMap(page), painted);
  await page.getByLabel('Active building tool').selectOption('room-poly');
  for (const [x, y] of [[12, 2], [15, 2], [15, 5]]) {
    const vertex = await point(page, x, y);
    await page.mouse.click(vertex.x, vertex.y);
  }
  await page.getByRole('button', { name: 'Finish polygon', exact: true }).click();
  assert.equal((await currentMap(page)).roomShapes.at(-1).shapeType, 'polygon');
  await action(page, 'edit.undo').click();
  assert.deepEqual(await currentMap(page), painted);
  await place(page, 'token', 8, 8);
  await page.getByRole('dialog').getByRole('button', { name: 'No Icon', exact: true }).click();
  const tokenMap = await currentMap(page);
  await closePanel(page);
  await action(page, 'panel.decorate').click();
  await page.getByRole('button', { name: 'Move token tool', exact: true }).click();
  const start = await point(page, 8, 8), end = await point(page, 9, 9);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(inspector(page)).toHaveCount(0);
  await page.mouse.move(end.x, end.y, { steps: 6 });
  await page.mouse.up();
  assert.deepEqual((await currentMap(page)).tokens[0], { ...tokenMap.tokens[0], x: 9, y: 9 });
  await action(page, 'edit.undo').click();
  assert.deepEqual(await currentMap(page), tokenMap);
  return { mouseStroke: true, syntheticCancellation: ['pointercancel', 'blur'], keyboardEscape: true, polygonCompletion: true, firstTokenDrag: true };
}

async function viewportAndScope(page) {
  await create(page);
  await place(page, 'note');
  const note = (await currentMap(page)).notes[0];
  await closePanel(page);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.getByRole('application').focus();
  await page.keyboard.press('ArrowRight');
  const transform = await page.locator('.canvas-transform-container').getAttribute('style');
  const original = await currentMap(page);
  await library(page);
  await page.getByRole('button', { name: 'Continue last map', exact: true }).click();
  await saved(page);
  await expect(page.locator('.canvas-transform-container')).toHaveAttribute('style', transform);
  await page.reload();
  assert.deepEqual(await currentMap(page), original);
  await expect(page.locator('.canvas-transform-container')).toHaveAttribute('style', transform);
  await inspect(page, 'note', note.id);
  await field(page, 'Note label').fill('Discarded level draft');
  await action(page, 'panel.levels').click();
  await page.getByRole('button', { name: 'Duplicate level 1', exact: true }).click();
  await expect(inspector(page)).toHaveCount(0);
  await saved(page);
  assert.deepEqual((await record(page)).project.levels.map(level => level.notes), [original.notes, original.notes]);
  await action(page, 'panel.build').click();
  await inspect(page, 'note', note.id);
  await field(page, 'Note label').fill('Discarded mode draft');
  await action(page, 'view.viewMode').click();
  await expect(inspector(page)).toHaveCount(0);
  await action(page, 'view.viewMode').click();
  assert.deepEqual((await currentMap(page)).notes, original.notes);
  await inspect(page, 'note', note.id);
  await field(page, 'Note label').fill('Discarded Library draft');
  await library(page);
  await page.getByRole('button', { name: 'Continue last map', exact: true }).click();
  assert.deepEqual((await currentMap(page)).notes, original.notes);
  await expect(inspector(page)).toHaveCount(0);
  return { exactViewportOnLibraryAndReload: true, draftScope: ['level with equal ID', 'view mode', 'Library'] };
}

async function failures(page) {
  await create(page);
  await place(page, 'note');
  await saved(page);
  const before = await record(page);
  await field(page, 'X').fill('20');
  await field(page, 'Note label').fill('Invalid draft');
  await apply(page).click();
  assert.equal(await field(page, 'X').evaluate(node => node.validity.rangeOverflow), true);
  await expect(field(page, 'X')).toBeFocused();
  await unchanged(page, before);
  await field(page, 'X').fill('');
  await apply(page).click();
  assert.equal(await field(page, 'X').evaluate(node => node.validity.valueMissing), true);
  await unchanged(page, before);
  await page.keyboard.press('Escape');
  await expect(field(page, 'Note label')).toHaveValue(before.project.levels[0].notes[0].label);
  const recordsBefore = await records(page);
  await page.evaluate(id => {
    const put = IDBObjectStore.prototype.put;
    window.restoreEditingWrite = () => { IDBObjectStore.prototype.put = put; };
    window.editingFaults = 0;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'maps' && key === `project:${id}`) {
        window.editingFaults++;
        throw new DOMException('Injected editing quota failure', 'QuotaExceededError');
      }
      return put.call(this, value, key);
    };
  }, projectId(page));
  let edited;
  try {
    await field(page, 'Note label').fill('Unsaved object edit');
    await field(page, 'Note description').fill('Retain this private draft after Apply.');
    await field(page, 'X').fill('3');
    await apply(page).click();
    await action(page, 'file.recovery').click();
    const details = page.getByRole('region', { name: 'Device save and recovery', exact: true });
    await details.getByRole('status').filter({ hasText: 'Save failed' }).waitFor();
    await expect(details.getByRole('alert')).toContainText('Injected editing quota failure');
    assert.equal(await page.evaluate(() => window.editingFaults), 1);
    assert.deepEqual(await records(page), recordsBefore, 'Failed object save must not partially update any record');
    edited = (await backup(page, details.getByRole('button', { name: 'Export backup', exact: true }))).project;
    assert.equal(edited.levels[0].notes[0].label, 'Unsaved object edit');
    assert.equal(edited.levels[0].notes[0].description, 'Retain this private draft after Apply.');
    assert.equal(edited.levels[0].tiles[2][3].noteId, edited.levels[0].notes[0].id);
  } finally {
    await page.evaluate(() => window.restoreEditingWrite());
  }
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await saved(page);
  assert.deepEqual(portable((await record(page)).project), edited);
  await page.getByRole('button', { name: 'Close save details', exact: true }).click();
  await action(page, 'edit.undo').click();
  await saved(page);
  assert.deepEqual(portable((await record(page)).project), portable(before.project));
  await action(page, 'edit.redo').click();
  await saved(page);
  await page.reload();
  await saved(page);
  assert.deepEqual(portable((await record(page)).project), edited);
  return { nativeValidation: ['range overflow', 'required coordinate'], injectedQuotaAbort: true, backupRetryUndoReload: true };
}

async function keyboardLayout(page, { output, engine }, textScale) {
  configureKeyboard(page, engine);
  await create(page);
  // Fixture placement is a pointer workflow; every inspector operation below
  // uses the existing keyboard traversal, never focus() or click().
  await place(page, 'note');
  const note = (await currentMap(page)).notes[0];
  await closePanel(page);
  await keyboardCommand(page, 'Project settings');
  await tabTo(page, page.getByLabel('Interface text size', { exact: true }));
  if (textScale === 2) await page.keyboard.press('2');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Interface text size', { exact: true })).toHaveValue(String(textScale));
  await page.keyboard.press('Escape');
  const layouts = [];
  for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844], [844, 390], [390, 460], [720, 450]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.locator('.app-body').evaluate(node => node.classList.contains('app-body--mobile'))).toBe(width <= 768);
    const expand = page.getByRole('button', { name: 'Expand toolbar', exact: true });
    if (await expand.count()) await activate(page, expand);
    await tabTo(page, page.getByLabel('Inspect object', { exact: true }));
    await expect(page.getByLabel('Inspect object', { exact: true }).locator('option')).toHaveCount(2);
    const label = await page.getByLabel('Inspect object', { exact: true }).locator(`option[value="note:${note.id}"]`).textContent();
    await page.keyboard.press(label[0].toLowerCase());
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Inspect object', { exact: true })).toHaveValue(`note:${note.id}`);
    await expect(inspector(page)).toBeVisible();
    await typeIn(page, field(page, 'Note label'), `Keyboard ${width} ${textScale}`);
    await typeIn(page, field(page, 'Note description'), 'PRIVATE_EDIT_KEYBOARD_SENTINEL');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Second line');
    await tabTo(page, apply(page));
    const measure = () => apply(page).evaluate(node => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      const clippedBy = [];
      for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        const bounds = parent.getBoundingClientRect(), css = getComputedStyle(parent);
        if ((/(auto|scroll|hidden|clip)/.test(css.overflowY) && (rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1)) ||
          (/(auto|scroll|hidden|clip)/.test(css.overflowX) && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1))) {
          clippedBy.push(parent.className);
        }
        if (css.position === 'fixed') break;
      }
      return {
        width: rect.width, height: rect.height, outline: style.outlineStyle,
        outlineWidth: parseFloat(style.outlineWidth), hitTarget: node.contains(hit), clippedBy,
        inViewport: rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    await expect.poll(measure).toMatchObject({ inViewport: true, overflow: false, hitTarget: true, clippedBy: [], outline: 'solid' });
    const metrics = await measure();
    assert(metrics.width >= 44 && metrics.height >= 44 && metrics.outlineWidth >= 2);
    const contrast = await panelContrast(page, '.selection-inspector label, .selection-inspector small, .selection-inspector button');
    await page.screenshot({ path: join(output, `${engine}-editing-${width}x${height}-${textScale * 100}.png`) });
    await page.keyboard.press('Enter');
    const committed = await currentMap(page);
    assert.equal(committed.notes[0].label, `Keyboard ${width} ${textScale}`);
    assert.equal(committed.notes[0].description, 'PRIVATE_EDIT_KEYBOARD_SENTINEL\nSecond line');
    await typeIn(page, field(page, 'Note label'), 'Cancelled keyboard draft');
    await activate(page, cancel(page));
    await expect(field(page, 'Note label')).toHaveValue(committed.notes[0].label);
    await typeIn(page, field(page, 'Note label'), 'Escape draft');
    await page.keyboard.press('Escape');
    await expect(field(page, 'Note label')).toHaveValue(committed.notes[0].label);
    await expect(inspector(page)).toBeVisible();
    if (width <= 768) {
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog', { name: 'Context panel' })).toHaveCount(0);
    } else {
      await activate(page, inspector(page).getByRole('button', { name: 'Deselect note', exact: true }));
    }
    layouts.push({ width, height, textScale, contrast, ...metrics });
  }
  await page.reload();
  assert.equal((await currentMap(page)).notes[0].id, note.id);
  return { layouts, keyboardInspector: true, nativeBrowserZoom: false, physicalKeyboard: false };
}

export default [
  ...objects.map(object => [`Editing: ${object.kind} apply cancel atomic undo delete and reload`, (page, options) => objectEditing(page, object, options)]),
  ['Editing: favorite persistence and isolated preference failure', favorites],
  ['Editing: overlapping region movement fill erase and bounds', regions],
  ['Editing: mouse cancellation polygon completion and first token drag', gestures],
  ['Editing: viewport continuity and selection draft scope', viewportAndScope],
  ['Editing: invalid fields and failed-save backup retry undo', failures],
  ...[1, 2].map(scale => [`Editing: keyboard inspector focus contrast and reflow at ${scale * 100}% text`,
    (page, options) => keyboardLayout(page, options, scale)]),
];
