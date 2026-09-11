// Page-based production journey. Uses a disposable browser context and native UI.
export default async function runFurnishingJourney(page) {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const base = `${page.url().split('/Dungeon-Mapper/')[0]}/Dungeon-Mapper/`;
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    const tab = await context.newPage();
    tab.setDefaultTimeout(15000);
    await tab.goto(base);
    await tab.getByRole('button', { name: 'Open a sample', exact: true }).click();
    await tab.getByRole('combobox').selectOption('folio-keepers-hall');
    await tab.getByRole('button', { name: 'Preview map', exact: true }).click();
    await tab.getByRole('button', { name: 'Use this map', exact: true }).click();
    const saved = () => tab.getByText('Saved on this device', { exact: true }).waitFor();
    await saved();
    await tab.getByRole('button', { name: 'Decorate', exact: true }).click();
    await tab.getByRole('tab', { name: /Show.*Theme stamps/ }).click();
    assert(await tab.getByRole('button', { name: /^Folio / }).count() === 8, 'Expected eight named furnishings');
    await tab.getByRole('button', { name: 'Folio bed', exact: true }).click();
    const canvas = tab.locator('canvas[role="application"]');
    const bounds = await canvas.boundingBox();
    await canvas.click({ position: { x: 4.5 * bounds.width / 16, y: 10.5 * bounds.height / 16 } });
    await saved();
    const downloadText = async label => {
      await tab.getByRole('button', { name: 'Export', exact: true }).click();
      const [download] = await Promise.all([
        tab.waitForEvent('download'), tab.getByRole('button', { name: label }).click(),
      ]);
      let text = '';
      for await (const chunk of await download.createReadStream()) text += chunk.toString();
      return text;
    };
    const backup = async () => JSON.parse(await downloadText('Export editable backup (includes DM content)')).project;
    const placed = (await backup()).levels[0].stamps.at(-1);
    assert(placed.stampId === 'folio-furnishings-v1-bed' && placed.scale === 1.75, 'Default scale or placement failed');
    await tab.getByLabel('Inspect object').selectOption(`stamp:${placed.id}`);
    await tab.getByLabel('Rotation', { exact: true }).fill('45');
    await tab.getByLabel('Stamp scale', { exact: true }).fill('1.25');
    await tab.getByLabel('Stamp opacity', { exact: true }).fill('0.65');
    await tab.getByLabel('Flip horizontally', { exact: true }).check();
    await tab.getByLabel('Flip vertically', { exact: true }).check();
    await tab.getByRole('button', { name: 'Apply changes', exact: true }).click();
    await saved();
    const transformed = (await backup()).levels[0].stamps.at(-1);
    assert(transformed.rotation === 45 && transformed.scale === 1.25 && transformed.opacity === 0.65 &&
      transformed.flipX && transformed.flipY, 'Transform values did not persist');
    await tab.getByRole('button', { name: 'Undo', exact: true }).click();
    assert((await backup()).levels[0].stamps.at(-1).rotation === 0, 'Undo failed');
    await tab.getByRole('button', { name: 'Redo', exact: true }).click();
    await saved();
    await tab.reload();
    await saved();
    assert((await backup()).levels[0].stamps.at(-1).rotation === 45, 'Reload lost transform');
    await tab.getByRole('button', { name: 'Decorate', exact: true }).click();
    await tab.getByRole('tab', { name: /Show.*Theme stamps/ }).click();
    await tab.screenshot({ path: 'docs/media/ux07-furnishings/editor.png' });
    const svg = await downloadText('Player SVG (published content)');
    assert(!svg.includes('missing ledger') && svg.includes('opacity="0.65"'), 'SVG privacy or opacity failed');
    await tab.getByRole('button', { name: 'Player preview', exact: true }).click();
    assert(!(await tab.locator('body').innerText()).includes('Supply cache'), 'Private note reached the player');
    await tab.screenshot({ path: 'docs/media/ux07-furnishings/player.png' });
    await tab.setViewportSize({ width: 390, height: 844 });
    await tab.screenshot({ path: 'docs/media/ux07-furnishings/player-phone.png' });
    return { browser: context.browser().version(), kitSize: 8, placement: true, transforms: true,
      undoRedo: true, reload: true, backup: true, playerSvg: true };
  } finally {
    await context.close();
  }
}
