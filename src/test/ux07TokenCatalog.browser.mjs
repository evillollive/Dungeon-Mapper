import assert from 'node:assert/strict';
import { join } from 'node:path';
import { downloadExportText } from './exportJourney.mjs';

const additions = ['Ranger', 'Duelist', 'Arcanist', 'Sunkeeper', 'Brute', 'Wolf', 'Owl', 'Spider', 'Ooze'];
const catalog = ['Warden', 'Wayfinder', 'Drake', ...additions];

export default async function tokenCatalogJourney(page, { output }) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Open a sample', exact: true }).click();
  await page.getByRole('combobox').selectOption('folio-crooked-company');
  await page.getByRole('button', { name: 'Preview map', exact: true }).click();
  await page.getByRole('button', { name: 'Use this map', exact: true }).click();
  const saved = () => page.getByText('Saved on this device', { exact: true }).waitFor();
  const backup = async () => JSON.parse(await downloadExportText(page, 'backup')).project;
  await saved();
  const original = await backup();
  assert.equal(original.levels[0].tokens.length, 13);
  assert.deepEqual(original.levels[0].tokens.filter(token => !token.hidden).map(token => token.icon),
    catalog.map(name => `folio-token-v1-${name.toLowerCase()}`));
  await page.getByRole('button', { name: 'Decorate', exact: true }).click();
  const canvas = page.locator('canvas[role="application"]');
  for (const [index, name] of additions.entries()) {
    await canvas.focus();
    await page.keyboard.press(['2', '3', '4'][index % 3]);
    const box = await canvas.boundingBox();
    assert(box);
    await canvas.click({ position: { x: (5.5 + index) * box.width / 24, y: 21.5 * box.height / 24 } });
    const picker = page.getByRole('dialog', { name: 'Choose an icon for the token' });
    await picker.getByRole('button', { name: 'Folio tokens', exact: true }).click();
    for (const asset of catalog) assert(await picker.getByRole('button', { name: `Folio ${asset}`, exact: true }).count() === 1);
    await picker.getByRole('textbox', { name: 'Search icons' }).fill(name);
    await picker.getByRole('button', { name: `Folio ${name}`, exact: true }).click();
    await saved();
  }
  const placed = (await backup()).levels[0].tokens.slice(13);
  assert.equal(new Set(placed.map(token => token.id)).size, 9, 'Every placement needs its own identity');
  assert.deepEqual(placed.map(token => token.icon), additions.map(name => `folio-token-v1-${name.toLowerCase()}`));
  assert.deepEqual(placed.map(token => token.kind), additions.map((_, index) => ['player', 'npc', 'monster'][index % 3]));
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  assert.equal((await backup()).levels[0].tokens.length, 21);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await saved();
  await page.reload();
  await saved();
  assert.deepEqual((await backup()).levels[0].tokens.slice(13), placed);
  const svg = await downloadExportText(page, 'svg');
  assert.equal((svg.match(/fill-rule="evenodd"/g) ?? []).length, 84);
  assert(!svg.includes('Hidden lookout'));
  // Remove the nine test placements through normal editor actions only after
  // recording their persistence, keeping review images focused on the sample.
  await page.getByRole('button', { name: 'Decorate', exact: true }).click();
  for (const token of placed) {
    await page.getByLabel('Inspect object').selectOption(`token:${token.id}`);
    await page.getByRole('button', { name: 'Delete token', exact: true }).click();
  }
  await saved();
  assert.deepEqual((await backup()).levels[0].tokens, original.levels[0].tokens);
  await page.getByLabel('Inspect object').selectOption('token:1');
  await page.screenshot({ path: join(output, 'editor.png') });
  await page.getByRole('button', { name: 'Player preview', exact: true }).click();
  await page.getByRole('img', { name: /12 visible tokens/ }).waitFor();
  assert(!(await page.locator('body').innerText()).includes('Hidden lookout'));
  await page.screenshot({ path: join(output, 'player.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.player-map-scroll canvas');
    return canvas && canvas.getBoundingClientRect().width <= 390;
  });
  await page.screenshot({ path: join(output, 'player-phone.png') });
  return { silhouettes: 12, additionsPlaced: 9, affiliationIndependent: true, undoRedo: true,
    reload: true, backup: true, playerSvg: true, phoneViewport: '390 x 844' };
}
