// Existing external Playwright SDK; isolated storage only.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const playwright = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const origin = process.env.QA_ORIGIN ?? 'http://127.0.0.1:5303/Dungeon-Mapper/';
const output = process.env.QA_OUTPUT;
assert(output, 'Set QA_OUTPUT to a session artifact directory.');
await mkdir(output, { recursive: true });
const results = [];
for (const engine of (process.env.QA_ENGINES ?? 'chromium,firefox,webkit').split(',')) {
  const browser = await playwright[engine].launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const result = { engine, version: browser.version(), layouts: [] };
  const command = id => page.locator(`[data-action="${id}"]`).filter({ visible: true }).first();
  const saved = () => page.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
  const settings = async () => {
    await page.getByRole('button', { name: 'Project menu', exact: true }).click();
    await page.getByRole('button', { name: 'Project settings', exact: true }).click();
    await page.getByRole('dialog', { name: 'Project settings', exact: true }).waitFor();
  };
  const capture = async name => {
    const layout = await page.evaluate(() => ({
      viewport: [innerWidth, innerHeight],
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      headerHeight: document.querySelector('.shell-header').getBoundingClientRect().height,
      inspector: !!document.querySelector('.context-panel'),
      font: getComputedStyle(document.querySelector('.shell-header')).fontFamily,
    }));
    assert.equal(layout.horizontalOverflow, false, `${name}: document overflow`);
    await page.screenshot({ path: join(output, `${engine}-${name}.png`), fullPage: true });
    result.layouts.push({ name, ...layout });
  };
  try {
    await page.addInitScript(() => {
      localStorage.setItem('dungeon-mapper:layout-density', 'tabs');
      localStorage.setItem('dungeon-mapper:toolbar-tab', 'advanced');
      localStorage.setItem('dungeon-mapper:rail-mode', 'tactical');
    });
    await page.goto(origin);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Open a sample', exact: true }).click();
    await page.getByRole('button', { name: 'Preview map', exact: true }).click();
    await page.getByRole('button', { name: 'Use this map', exact: true }).click();
    await saved();
    const id = new URL(page.url()).searchParams.get('project');
    assert(id);
    assert.equal(await page.locator('.context-panel').count(), 0);
    assert((await page.locator('.shell-header').boundingBox()).height <= 64, 'Desktop header exceeded 64px');
    assert(await page.getByLabel('Active material').isVisible());
    await capture('desktop-build');
    await command('panel.decorate').click();
    await page.getByRole('button', { name: 'Add note', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Open scene templates', exact: true }).waitFor();
    await capture('desktop-decorate');
    await command('panel.look').click();
    assert(await page.getByTitle('Art style preset', { exact: true }).isVisible());
    assert(await page.getByRole('button', { name: 'Import background image', exact: true }).count());
    await capture('desktop-look');
    await command('panel.levels').click();
    await page.getByRole('button', { name: 'Duplicate level 1', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Move up', exact: true }).waitFor();
    await command('panel.notes').click();
    await page.getByRole('complementary', { name: 'Context panel' }).waitFor();
    await capture('desktop-notes');
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    assert(await page.locator('#dm-canvas-area').evaluate(element => element === document.activeElement));
    assert.equal(await page.locator('.context-panel').count(), 0);
    await settings();
    assert.equal(await page.getByLabel('Map width in tiles', { exact: true }).inputValue(), '40');
    assert.equal(await page.getByLabel('Map height in tiles', { exact: true }).inputValue(), '40');
    await page.getByLabel('Project name', { exact: true }).fill('UX03 retained project');
    await page.getByLabel('Project name', { exact: true }).press('Control+k');
    assert.equal(await page.getByRole('dialog', { name: 'Command palette' }).count(), 0, 'Shortcut stole text input');
    await page.getByRole('button', { name: 'Close Project settings', exact: true }).click();
    await saved();
    assert.equal(new URL(page.url()).searchParams.get('project'), id, 'Rename changed identity');
    await page.locator('#dm-canvas-area').focus();
    await page.keyboard.press('Shift+V');
    assert(await page.getByText(/Not a player-safe display/).isVisible());
    await page.keyboard.press('p');
    assert(await page.locator('.editor-statusbar').innerText().then(text => text.includes('DM view / pdraw')));
    await page.keyboard.press('b');
    await command('help.commandPalette').click();
    await page.getByRole('combobox', { name: 'Search commands' }).fill('Paint tool');
    assert.equal(await page.getByRole('option', { name: /Paint tool/ }).getAttribute('aria-disabled'), 'true');
    await page.keyboard.press('Escape');
    assert(await command('help.commandPalette').evaluate(element => element === document.activeElement));
    await capture('desktop-dm-view');
    await command('view.viewMode').click();
    await command('file.recovery').click();
    await page.getByRole('button', { name: 'Recovery copies', exact: true }).click();
    await page.getByRole('button', { name: 'Close recovery copies', exact: true }).click();
    await page.getByRole('button', { name: 'Close save details', exact: true }).click();
    await command('panel.build').click();
    await command('dialog.export').click();
    await page.getByRole('button', { name: /Back up project/ }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download private backup', exact: true }).click();
    assert((await download).suggestedFilename().endsWith('.json'));
    await page.getByRole('button', { name: 'Close Export', exact: true }).click();
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.getByRole('button', { name: 'Fit map to screen', exact: true }).click();
    await capture('tablet');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Fit map to screen', exact: true }).click();
    await capture('phone');
    await command('view.viewMode').click();
    await page.getByRole('button', { name: 'Expand toolbar', exact: true }).click();
    assert.equal(await page.locator('.dm-view-toolbar').evaluate(element => getComputedStyle(element).overflowY), 'auto');
    await page.getByRole('button', { name: 'Pen color #3b82f6', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Pen color #3b82f6', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Thick brush width', exact: true }).click();
    for (const label of ['NPC', 'Monster S', 'Monster M', 'Monster L']) {
      const button = page.getByRole('button', { name: `Place ${label} token`, exact: true });
      await button.click();
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
    }
    await page.getByRole('button', { name: 'Circle measurement shape', exact: true }).click();
    await capture('phone-dm-parameters');
    await page.getByRole('button', { name: 'Collapse toolbar', exact: true }).click();
    await command('view.viewMode').click();
    await page.getByRole('button', { name: 'All actions', exact: true }).click();
    const allIds = await page.locator('.shell-menu-actions [data-action]').evaluateAll(nodes => nodes.map(node => node.dataset.action));
    assert.equal(new Set(allIds).size, allIds.length);
    for (const action of ['tool.roomCircle', 'tool.roomPoly', 'tool.roomCut', 'tool.stamp', 'tool.move-stamp', 'tool.remove-stamp', 'edit.redo', 'dialog.settings', 'file.recovery']) {
      assert(allIds.includes(action), `Mobile missing ${action}`);
    }
    result.mobileActionCount = allIds.length;
    await page.locator('.shell-menu-actions [data-action="panel.look"]').click();
    await page.getByTitle('Art style preset', { exact: true }).waitFor();
    await capture('phone-look');
    await page.getByRole('button', { name: 'Collapse toolbar', exact: true }).click();
    await settings();
    await page.getByLabel('Interface text size').selectOption('2');
    await page.getByRole('button', { name: 'Close Project settings', exact: true }).click();
    await capture('phone-text-200');
    await page.getByRole('button', { name: 'All actions', exact: true }).click();
    await page.locator('.shell-menu-actions [data-action="dialog.settings"]').click();
    await page.getByLabel('Interface text size').selectOption('1');
    await page.getByRole('button', { name: 'Close Project settings', exact: true }).click();
    await page.setViewportSize({ width: 720, height: 450 });
    await capture('zoom-equivalent-200');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await saved();
    assert.equal(new URL(page.url()).searchParams.get('project'), id);
    assert.equal(await page.locator('.project-identity strong').innerText(), 'UX03 retained project');
    assert.equal(await page.locator('.context-panel').count(), 0);
    assert.deepEqual(errors, []);
    result.status = 'passed';
  } catch (error) {
    result.status = 'failed'; result.error = error.stack; result.browserErrors = errors;
    await page.screenshot({ path: join(output, `${engine}-failure.png`), fullPage: true });
  } finally {
    results.push(result);
    await writeFile(join(output, 'shell-results.json'), JSON.stringify(results, null, 2));
    await context.close();
    await browser.close();
  }
}
console.log(JSON.stringify(results, null, 2));
if (results.some(result => result.status !== 'passed')) process.exitCode = 1;
