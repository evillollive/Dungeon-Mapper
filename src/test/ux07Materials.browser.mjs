// Import in a Playwright-capable runner and pass a Page on the production base URL.
import { downloadExportText } from './exportJourney.mjs';
export default async function runMaterialJourney(page) {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const base = `${page.url().split('/Dungeon-Mapper/')[0]}/Dungeon-Mapper/`;
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    const tab = await context.newPage();
    tab.setDefaultTimeout(15000);
    await tab.goto(base);
    await tab.getByRole('button', { name: 'Open a sample', exact: true }).click();
    await tab.getByRole('combobox').selectOption('folio-materials');
    await tab.getByRole('button', { name: 'Preview map', exact: true }).click();
    await tab.getByRole('button', { name: 'Use this map', exact: true }).click();
    const saved = () => tab.getByText('Saved on this device', { exact: true }).waitFor();
    await saved();
    await tab.getByRole('button', { name: 'Build', exact: true }).click();
    const backup = async () => JSON.parse(await downloadExportText(tab, 'backup')).project;
    const clickCell = async (x, y) => {
      const canvas = tab.locator('canvas[role="application"]');
      const bounds = await canvas.boundingBox();
      await canvas.click({ position: { x: (x + 0.5) * bounds.width / 32, y: (y + 0.5) * bounds.height / 32 } });
      await saved();
    };
    const initial = await backup();
    assert(initial.levels[0].tiles[13][6].floorMaterial === 'folio-worn-wood-v1', 'Sample wood missing');
    assert(initial.levels[0].tiles[25][4].floorMaterial === 'folio-earth-v1', 'Sample earth missing');
    await tab.getByRole('button', { name: 'Earth floor', exact: true }).click();
    await tab.getByLabel('Active building tool').selectOption('paint');
    await clickCell(6, 13);
    assert((await backup()).levels[0].tiles[13][6].floorMaterial === 'folio-earth-v1', 'Canvas paint did not store finish');
    await tab.getByRole('button', { name: 'Undo', exact: true }).click();
    assert((await backup()).levels[0].tiles[13][6].floorMaterial === 'folio-worn-wood-v1', 'Undo lost material');
    await tab.getByRole('button', { name: 'Redo', exact: true }).click();
    await saved();
    await tab.reload();
    await saved();
    assert((await backup()).levels[0].tiles[13][6].floorMaterial === 'folio-earth-v1', 'Material did not survive reload');
    await tab.getByRole('button', { name: 'Build', exact: true }).click();
    await tab.getByRole('button', { name: 'Earth floor', exact: true }).click();
    await tab.getByLabel('Active building tool').selectOption('fill');
    await clickCell(6, 12);
    const filled = (await backup()).levels[0];
    assert(filled.tiles[8][4].floorMaterial === 'folio-earth-v1', 'Connected floor fill incomplete');
    assert(JSON.stringify(filled.tiles.map(row => row.map(tile => tile.type))) ===
      JSON.stringify(initial.levels[0].tiles.map(row => row.map(tile => tile.type))), 'Finish editing changed geometry');
    await tab.getByRole('button', { name: 'Undo', exact: true }).click();
    await saved();
    await tab.getByRole('button', { name: 'Worn wood floor', exact: true }).click();
    assert(await tab.locator('.floor-material-options button').evaluateAll(buttons => buttons.every(button => {
      const bounds = button.getBoundingClientRect();
      const label = button.querySelector('span').getBoundingClientRect();
      return bounds.height >= 44 && label.left >= bounds.left && label.right <= bounds.right && label.bottom <= bounds.bottom;
    })), 'Floor finish labels are clipped or targets are too short');
    await tab.screenshot({ path: 'docs/media/ux07-materials/editor.png' });
    await tab.getByLabel('Active material').selectOption('trap');
    await tab.getByLabel('Active building tool').selectOption('paint');
    await clickCell(6, 13);
    const trapped = (await backup()).levels[0].tiles[13][6];
    assert(trapped.type === 'trap' && trapped.floorMaterial === 'folio-earth-v1', 'Trap lost its existing floor substrate');
    const svg = await downloadExportText(tab, 'svg');
    assert(svg.includes('<polyline') && !svg.includes('#813f35') && !svg.includes('Cistern sentinel'), 'Player SVG exposed a secret');
    await tab.getByRole('button', { name: 'Player preview', exact: true }).click();
    assert(!(await tab.locator('body').innerText()).includes('The secret door'), 'Player text disclosed private notes');
    await tab.screenshot({ path: 'docs/media/ux07-materials/player.png' });
    await tab.setViewportSize({ width: 390, height: 844 });
    await tab.screenshot({ path: 'docs/media/ux07-materials/player-phone.png' });
    return { browser: context.browser().version(), sample: 'folio-materials', paint: true, fill: true,
      undoRedo: true, reload: true, backup: true, playerSvg: true, geometryUnchanged: true };
  } finally {
    await context.close();
  }
}
