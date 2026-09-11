import assert from 'node:assert/strict';
import { join } from 'node:path';
import { expect } from 'playwright/test';

// Do not focus() or click() to stand in for keyboard reachability. File input
// setup below is the only non-keyboard action, replacing the native OS picker.
const fullKeyboardPages = new WeakSet();
const pressTab = (page, reverse = false) => page.keyboard.press(
  [fullKeyboardPages.has(page) ? 'Alt' : '', reverse ? 'Shift' : '', 'Tab'].filter(Boolean).join('+'),
);

async function tabTo(page, target, reverse = false) {
  await expect(target).toBeVisible();
  let direction = reverse;
  let turned = false;
  for (let index = 0; index < 180; index++) {
    if (await target.evaluate(node => node === document.activeElement)) return;
    const before = await page.evaluateHandle(() => document.activeElement);
    await pressTab(page, direction);
    // Firefox's headless shell does not cycle through browser chrome back to
    // the first control. Reverse at the document edge, as a keyboard user can.
    const unchanged = await before.evaluate(node => node === document.activeElement);
    await before.dispose();
    if (unchanged) {
      if (turned) break;
      direction = !direction;
      turned = true;
    }
  }
  throw new Error(`Keyboard could not reach ${await target.getAttribute('aria-label') ?? await target.textContent()}`);
}

async function activate(page, target, reverse = false) {
  await tabTo(page, target, reverse);
  await page.keyboard.press('Enter');
}

async function typeIn(page, target, text) {
  await tabTo(page, target);
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type(text);
}

async function command(page, label) {
  await page.keyboard.press('Control+k');
  const search = page.getByRole('combobox', { name: 'Search commands' });
  await expect(search).toBeFocused();
  await page.keyboard.type(label);
  await expect(page.getByRole('dialog', { name: 'Command palette' }).getByRole('option', { selected: true })).toContainText(label);
  await page.keyboard.press('Enter');
  await expect(search).toBeHidden();
}

async function panelContrast(page, selector) {
  const ratios = await page.locator(selector).evaluateAll(nodes => nodes.map(node => {
    const luminance = color => {
      const channels = color.match(/[\d.]+/g)?.map(Number);
      if (!channels || channels.length < 3) throw new Error(`Unsupported computed color: ${color}`);
      const linear = channels.slice(0, 3).map(value => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    let background = node;
    while (background && ['transparent', 'rgba(0, 0, 0, 0)'].includes(getComputedStyle(background).backgroundColor)) {
      background = background.parentElement;
    }
    if (!background) throw new Error('No opaque panel background');
    const foreground = luminance(getComputedStyle(node).color);
    const surface = luminance(getComputedStyle(background).backgroundColor);
    return (Math.max(foreground, surface) + 0.05) / (Math.min(foreground, surface) + 0.05);
  }));
  assert(ratios.length > 0 && ratios.every(ratio => ratio >= 4.5), `Panel text contrast below 4.5:1: ${ratios}`);
  return ratios;
}

export default async function keyboard(page, { output, engine }) {
  if (engine === 'webkit' && process.platform === 'darwin') fullKeyboardPages.add(page);
  await page.waitForLoadState('networkidle');
  const button = name => page.getByRole('button', { name, exact: true });
  const saved = () => expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  const results = { keyboard: [], layouts: [], tabNavigation: fullKeyboardPages.has(page) ? 'Option+Tab (macOS WebKit)' : 'Tab' };

  await activate(page, button('Create map'));
  const creation = page.getByRole('dialog', { name: 'Make room for adventure.' });
  await expect(creation).toBeVisible();
  await expect(button('Cancel')).toBeFocused();
  await pressTab(page, true);
  await expect(button('Preview map')).toBeFocused();
  await pressTab(page);
  await expect(button('Cancel')).toBeFocused();
  await activate(page, button('Generate a map'));
  await tabTo(page, page.locator('summary').filter({ hasText: 'Advanced: seed and algorithm' }));
  await pressTab(page);
  await expect(button('Preview map')).toBeFocused();
  await pressTab(page, true);
  await page.keyboard.press('Enter');
  await pressTab(page);
  await expect(page.getByLabel('Seed', { exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(creation).toBeHidden();
  await expect(button('Create map')).toBeFocused();
  results.keyboard.push('Library creation, hidden advanced controls, two-way modal cycle, Escape and opener restoration');

  const fixture = {
    name: 'Keyboard qualification',
    levels: [{
      meta: { name: 'DM hall', publicName: 'The Hall', width: 8, height: 8, tileSize: 20 },
      tiles: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ({ type: 'floor' }))),
      fogEnabled: false,
      notes: [{ id: 1, x: 1, y: 1, label: 'Private room', description: 'PRIVATE_KEYBOARD_SENTINEL',
        published: true, publicLabel: 'The entrance', publicDescription: 'Steps lead to the hall.' }],
      tokens: [{ id: 1, x: 1, y: 1, kind: 'player', label: 'Scout' },
        { id: 2, x: 2, y: 1, kind: 'player', label: 'Mage' }],
      initiative: [1, 2],
    }],
    activeLevelIndex: 0, stairLinks: [],
  };
  await page.getByLabel('Import project', { exact: true }).setInputFiles({
    name: 'keyboard.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)),
  });
  await activate(page, button('Import as new project'));
  await saved();
  const projectURL = page.url();
  await command(page, 'Open notes');
  await activate(page, button('Edit note 1: Private room'));
  await expect(page.getByLabel('Room name', { exact: true })).toBeFocused();
  await typeIn(page, page.getByLabel('Room name', { exact: true }), 'The long hall');
  await typeIn(page, page.getByLabel('Room description', { exact: true }), 'PRIVATE_KEYBOARD_SENTINEL first line');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Second line with spaces');
  await pressTab(page);
  await expect(button('Save')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(button('Edit note 1: The long hall')).toBeFocused();
  await saved();
  await page.keyboard.press('Enter');
  await typeIn(page, page.getByLabel('Room name', { exact: true }), 'Cancelled title');
  await page.keyboard.press('Escape');
  await expect(button('Edit note 1: The long hall')).toBeFocused();
  await expect(page.locator('.note-desc')).toHaveText('PRIVATE_KEYBOARD_SENTINEL first line\nSecond line with spaces');
  results.keyboard.push('Note editing with spaces and newlines, save, cancellation and focus return');

  await command(page, 'Open encounter');
  await activate(page, button('Rename Scout'));
  await typeIn(page, page.getByRole('textbox', { name: 'Name for Scout' }), 'First Scout');
  await page.keyboard.press('Enter');
  await expect(button('Rename First Scout')).toBeFocused();
  await saved();
  await page.keyboard.press('Enter');
  await page.keyboard.type(' cancelled');
  await page.keyboard.press('Escape');
  await expect(button('Rename First Scout')).toBeFocused();
  const scout = () => page.getByRole('button', { name: /^First Scout, position/ });
  await tabTo(page, scout(), true);
  await page.keyboard.press('Alt+ArrowDown');
  await expect(scout()).toHaveAccessibleName('First Scout, position 2. Use Alt+Up/Down to reorder');
  await expect(scout()).toBeFocused();
  await activate(page, button('Move First Scout up'));
  await expect(scout()).toHaveAccessibleName('First Scout, position 1. Use Alt+Up/Down to reorder');
  await saved();
  results.initiativeContrast = await panelContrast(page, '.initiative-name, .initiative-order');
  results.keyboard.push('Initiative rename, cancel, Alt+Arrow reorder and visible reorder actions');

  await command(page, 'Scene templates');
  const templates = page.getByRole('dialog', { name: 'Scene Templates' });
  await expect(templates).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const resizedSheet = page.getByRole('dialog', { name: 'Context panel' });
  await expect(resizedSheet).toBeVisible();
  await pressTab(page);
  assert(await templates.evaluate(node => node.contains(document.activeElement)), 'Scene-template focus escaped');
  await page.keyboard.press('Escape');
  await expect(templates).toBeHidden();
  await expect(resizedSheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(resizedSheet).toBeHidden();
  await page.setViewportSize({ width: 1440, height: 900 });
  await command(page, 'Export');
  await expect(page.getByRole('dialog', { name: 'Export', exact: true })).toBeVisible();
  await activate(page, page.getByRole('button', { name: /Back up project/ }));
  const downloading = page.waitForEvent('download');
  await activate(page, button('Download private backup'));
  assert((await downloading).suggestedFilename().endsWith('.json'));
  await page.keyboard.press('Escape');
  await command(page, 'Save health & recovery');
  await activate(page, button('Recovery copies'));
  await activate(page, button('Close recovery copies'));
  await expect(button('Recovery copies')).toBeFocused();
  await activate(page, button('Close save details'));
  results.keyboard.push('Nested modal resize and Escape, scene templates, private backup and recovery controls');

  // Exercise the changed panels at every roadmap viewport, with real keyboard
  // focus and a visible ring. This is not a full-app layout certification.
  for (const textScale of [1, 2]) {
    if (textScale === 2) {
      await command(page, 'Project settings');
      await tabTo(page, page.getByLabel('Interface text size'));
      await page.keyboard.press('2');
      await pressTab(page);
      await expect(page.getByLabel('Interface text size')).toHaveValue('2');
      await page.keyboard.press('Escape');
    }
    for (const [width, height] of [[390, 844], [844, 390], [768, 1024], [1024, 768], [1440, 900]]) {
      await page.setViewportSize({ width, height });
      await command(page, 'Open notes');
      await activate(page, button('Edit note 1: The long hall'));
      await page.keyboard.type(' unsaved');
      await page.keyboard.press('Escape');
      await expect(button('Edit note 1: The long hall')).toBeFocused();
      const panel = page.getByRole(width <= 768 ? 'dialog' : 'complementary', { name: 'Context panel' });
      await expect(panel).toBeVisible();
      const measure = () => button('Edit note 1: The long hall').evaluate(node => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        let clipped = false;
        const clippedBy = [];
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
          const bounds = parent.getBoundingClientRect();
          const css = getComputedStyle(parent);
          if ((/(auto|scroll|hidden|clip)/.test(css.overflowY) &&
            (rect.top < bounds.top || rect.bottom > bounds.bottom)) ||
            (/(auto|scroll|hidden|clip)/.test(css.overflowX) &&
            (rect.left < bounds.left || rect.right > bounds.right))) {
            clipped = true;
            clippedBy.push({ element: parent.className, bounds: bounds.toJSON(), target: rect.toJSON() });
          }
          // The viewport-positioned mobile sheet escapes its editor body's
          // clipping; none of its ancestors establish a transformed container.
          if (css.position === 'fixed') break;
        }
        return {
          width: rect.width, height: rect.height, outline: style.outlineStyle,
          inViewport: rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth,
          overflow: document.documentElement.scrollWidth > innerWidth, clipped, clippedBy, hitTarget: node.contains(hit),
        };
      });
      await expect.poll(async () => (await measure()).clippedBy).toEqual([]);
      await expect.poll(measure, { message: `Unobscured note focus at ${width}x${height}, ${textScale * 100}%` })
        .toMatchObject({ inViewport: true, overflow: false, clipped: false, hitTarget: true, outline: 'solid' });
      const metrics = await measure();
      assert(metrics.width >= 44 && metrics.height >= 44, 'Note action is smaller than 44 CSS pixels');
      assert(metrics.inViewport && !metrics.overflow && !metrics.clipped && metrics.hitTarget && metrics.outline !== 'none',
        `Primary note action or focus is obscured at ${width}x${height}, ${textScale * 100}%: ${JSON.stringify(metrics)}`);
      const contrast = await panelContrast(page, '.note-label, .note-desc, .note-badge');
      await page.screenshot({ path: join(output, `${engine}-keyboard-${width}x${height}-${textScale * 100}.png`) });
      results.layouts.push({ width, height, textScale, contrast, ...metrics });
      if (width <= 768) {
        await page.keyboard.press('Escape');
        await expect(panel).toBeHidden();
      } else await activate(page, button('Close panel'), true);
    }
  }

  await page.reload();
  await saved();
  assert.equal(page.url(), projectURL);
  await command(page, 'Open notes');
  await expect(button('Edit note 1: The long hall')).toBeVisible();
  await expect(page.locator('.note-desc')).toHaveText('PRIVATE_KEYBOARD_SENTINEL first line\nSecond line with spaces');
  await command(page, 'Prepare session');
  await expect(page.getByRole('heading', { name: 'Set the table' })).toBeVisible();
  await tabTo(page, page.getByRole('checkbox'));
  await page.keyboard.press('Space');
  await activate(page, button('Start session'));
  const sessionSaved = () => expect(page.getByRole('status').filter({ hasText: 'Session saved on this device.' })).toBeVisible();
  await sessionSaved();
  await activate(page, button('Move token'));
  await tabTo(page, page.getByLabel('Session token'));
  await page.keyboard.press('f');
  await pressTab(page);
  await expect(page.getByLabel('Session token')).toHaveValue('1');
  await typeIn(page, page.getByLabel('Cell X', { exact: true }), '3');
  await typeIn(page, page.getByLabel('Cell Y', { exact: true }), '2');
  await activate(page, button('Apply to cell'));
  await sessionSaved();
  await expect(page.getByRole('status').filter({ hasText: 'Moved First Scout to 3, 2.' })).toBeVisible();
  await activate(page, button('Next turn'));
  await sessionSaved();
  const turn = page.getByRole('status', { name: 'Current encounter turn' });
  await expect(turn).toHaveAttribute('aria-atomic', 'true');
  await expect(turn).toContainText('Current turn: Mage');
  await activate(page, button('End session'));
  await activate(page, button('Save session progress'));
  await sessionSaved();
  await expect(page.getByRole('heading', { name: 'Session progress saved' })).toBeVisible();
  await activate(page, button('Resume session'));
  await sessionSaved();
  await expect(turn).toContainText('Current turn: Mage');
  results.keyboard.push('Reload continuity, preparation, coordinate token movement, turn announcement and end/resume');
  return results;
}
