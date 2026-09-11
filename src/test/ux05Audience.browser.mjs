// The runner owns the isolated context and captures failure traces.
export default async function audience(page) {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  page.setDefaultTimeout(15000);
  const origin = `${page.url().split('/Dungeon-Mapper/')[0]}/Dungeon-Mapper/`;
  await page.goto(`${origin}?view=library`);
  await page.waitForLoadState('networkidle');
  const sentinel = 'PRIVATE_SENTINEL_UX05';
  const tiles = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ({ type: 'floor' })));
  tiles[1][1] = { type: 'secret-door' };
  tiles[1][2] = { type: 'trap' };
  const map = {
    meta: { name: sentinel, publicName: 'The Watchtower', width: 8, height: 8, tileSize: 20 },
    tiles, fogEnabled: true,
    fog: Array.from({ length: 8 }, (_, y) => Array.from({ length: 8 }, (_, x) => x >= 5 || y >= 5)),
    notes: [
      { id: 1, x: 1, y: 1, label: 'Private room', description: sentinel },
      { id: 2, x: 2, y: 2, label: sentinel, description: sentinel, published: true,
        publicLabel: 'A worn inscription', publicDescription: 'The stairs lead upward.' },
      { id: 3, x: 7, y: 7, label: sentinel, description: sentinel, published: true, publicLabel: sentinel },
    ],
    tokens: [
      { id: 1, x: 0, y: 0, kind: 'player', label: 'Scout' },
      { id: 2, x: 1, y: 1, kind: 'monster', label: sentinel, hidden: true },
      { id: 3, x: 4, y: 4, kind: 'monster', size: 2, label: sentinel },
    ],
    initiative: [2, 3, 1],
  };
  const project = { name: sentinel, levels: [map], activeLevelIndex: 0, stairLinks: [] };
  await page.locator('input[type="file"]').evaluate((input, project) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([JSON.stringify(project)], 'ux05.json', { type: 'application/json' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, project);
  await page.getByRole('button', { name: 'Import as new project', exact: true }).click();
  const saved = () => page.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
  await saved();
  const action = id => page.locator(`[data-action="${id}"]`).filter({ visible: true }).first();
  const openAudience = async () => {
    await page.getByRole('button', { name: 'Project menu', exact: true }).click();
    await action('dialog.audience').click();
    await page.getByRole('dialog', { name: 'Audience & secrets' }).waitFor();
  };
  await openAudience();
  await page.getByRole('button', { name: 'Private room / Private', exact: true }).click();
  const inspector = page.getByRole('region', { name: 'Selection inspector' });
  await inspector.getByLabel('Public note title').fill('The gate');
  await inspector.getByLabel('Public note text').fill('A bronze latch.');
  await inspector.getByLabel('Publish note to players').check();
  await inspector.getByRole('button', { name: 'Apply changes' }).click();
  await saved();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await openAudience();
  await page.getByLabel('Discovered secret-door at (1, 1)').check();
  await page.getByRole('button', { name: 'Close Audience & secrets', exact: true }).click();
  await saved();
  await action('edit.undo').click();
  await saved();
  await openAudience();
  assert(!await page.getByLabel('Discovered secret-door at (1, 1)').isChecked(), 'Discovery did not undo');
  await page.getByRole('button', { name: 'Close Audience & secrets', exact: true }).click();
  await page.reload();
  await saved();
  const editorUrl = page.url();
  await action('view.playerPreview').click();
  const content = page.getByRole('main', { name: 'Player content' });
  await content.getByRole('heading', { name: 'The Watchtower' }).waitFor();
  const initial = await content.ariaSnapshot();
  assert(!initial.includes(sentinel), 'Private content in accessibility tree');
  assert(!(await page.locator('body').innerHTML()).includes(sentinel), 'Private content in DOM');
  assert(await content.getByText('A bronze latch.').isVisible(), 'Publication did not persist');
  assert(await content.getByRole('img', { name: 'The Watchtower. 1 visible tokens. 2 published notes.' }).isVisible(), 'Counts disagree with projection');
  assert(await content.getByRole('button').count() === 3, 'Unexpected player mutation controls');
  assert(await page.locator('[data-action="edit.undo"]').count() === 0, 'Editor still mounted');
  const before = await page.locator('body').innerHTML();
  for (const key of ['p', 'n', 'Delete', 'Control+z']) await page.keyboard.press(key);
  assert(await page.locator('body').innerHTML() === before, 'Editor shortcut affected preview');
  const layouts = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await content.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await content.getByRole('button', { name: 'Fit map', exact: true }).click();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${viewport.width}`);
    assert(await content.getByText('A bronze latch.').isVisible(), `Public text inaccessible at ${viewport.width}`);
    layouts.push(viewport);
  }
  await page.getByRole('button', { name: 'Close player preview' }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await action('dialog.export').click();
  const exportDialog = page.getByRole('dialog', { name: 'Export', exact: true });
  await exportDialog.getByLabel('Format', { exact: true }).selectOption('svg');
  const svgDownload = page.waitForEvent('download');
  await exportDialog.getByRole('button', { name: 'Export SVG', exact: true }).click();
  const svg = await svgDownload;
  assert(svg.suggestedFilename() === 'The_Watchtower.svg', 'Private filename in player SVG');
  await exportDialog.getByLabel('Format', { exact: true }).selectOption('png');
  const pngDownload = page.waitForEvent('download');
  await exportDialog.getByRole('button', { name: 'Export PNG', exact: true }).click();
  const png = await pngDownload;
  assert(png.suggestedFilename() === 'The_Watchtower_64dpi.png', 'Private filename in player PNG');
  await exportDialog.getByRole('button', { name: 'Close Export', exact: true }).click();
  await action('view.playerPreview').click();
  return { browser: page.context().browser().version(), editorUrl, layouts, snapshot: initial,
    svgFilename: svg.suggestedFilename(), pngFilename: png.suggestedFilename(),
    passed: ['native import/save/reload', 'publication', 'discovery undo', 'DOM/accessibility sentinels',
      'counts', 'editor unmounted', 'shortcut isolation', 'responsive preview', 'player downloads'] };
}
