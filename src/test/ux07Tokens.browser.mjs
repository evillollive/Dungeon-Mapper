import assert from 'node:assert/strict';
import { join } from 'node:path';
import { downloadExportText } from './exportJourney.mjs';

export default async function tokenJourney(page, { output }) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Open a sample', exact: true }).click();
  await page.getByRole('combobox').selectOption('folio-token-watch');
  await page.getByRole('button', { name: 'Preview map', exact: true }).click();
  await page.getByRole('button', { name: 'Use this map', exact: true }).click();
  const saved = () => page.getByText('Saved on this device', { exact: true }).waitFor();
  const backup = async () => JSON.parse(await downloadExportText(page, 'backup')).project;
  await saved();
  const original = (await backup()).levels[0].tokens;
  assert.equal(original.length, 4);
  assert.equal(new Set(original.map(token => token.icon)).size, 3);
  await page.getByRole('button', { name: 'Decorate', exact: true }).click();
  await page.getByLabel('Inspect object').selectOption('token:1');
  const properties = page.getByRole('form', { name: 'Token properties', exact: true });
  await properties.getByLabel('X', { exact: true }).fill('5');
  await properties.getByRole('button', { name: 'Apply changes', exact: true }).click();
  await saved();
  assert.equal((await backup()).levels[0].tokens[0].x, 5);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  assert.equal((await backup()).levels[0].tokens[0].x, 6);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await saved();
  const canvas = page.locator('canvas[role="application"]');
  const cellClick = async (x, y) => {
    const box = await canvas.boundingBox();
    assert(box);
    await canvas.click({ position: { x: (x + 0.5) * box.width / 16, y: (y + 0.5) * box.height / 16 } });
  };
  // Choose a creature silhouette for a player token, then a humanoid for a
  // monster, proving that artwork does not silently decide affiliation.
  for (const [key, icon, kind, x, y] of [
    ['2', 'Folio Drake', 'player', 4, 9],
    ['4', 'Folio Warden', 'monster', 10, 6],
  ]) {
    await canvas.focus();
    await page.keyboard.press(key);
    await cellClick(x, y);
    const picker = page.getByRole('dialog', { name: 'Choose an icon for the token' });
    await picker.getByRole('button', { name: 'Folio tokens', exact: true }).click();
    assert.match(await picker.innerText(), kind === 'player' ? /Party shield/ : /Hostile hexagon/);
    await picker.getByRole('textbox', { name: 'Search icons' }).fill(icon);
    await picker.getByRole('button', { name: icon, exact: true }).click();
    await saved();
    const token = (await backup()).levels[0].tokens.at(-1);
    assert.equal(token.kind, kind);
    assert.equal(token.icon, `folio-token-v1-${icon.replace('Folio ', '').toLowerCase()}`);
  }
  await canvas.focus();
  await page.keyboard.press('3');
  await cellClick(9, 10);
  await page.getByRole('dialog', { name: 'Choose an icon for the token' }).getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal((await backup()).levels[0].tokens.length, 6, 'Cancelling the picker must not add a token');
  await page.reload();
  await saved();
  const restored = await backup();
  assert.equal(restored.levels[0].tokens[0].x, 5);
  assert.equal(restored.levels[0].tokens.length, 6);
  await page.getByRole('button', { name: 'Decorate', exact: true }).click();
  await page.getByLabel('Inspect object').selectOption('token:1');
  await page.screenshot({ path: join(output, 'editor.png') });
  const svg = await downloadExportText(page, 'svg');
  assert(!svg.includes('Hidden lookout'));
  assert.equal((svg.match(/fill-rule="evenodd"/g) ?? []).length, 20, 'Expected five visible four-path tokens in SVG');
  await page.getByRole('button', { name: 'Player preview', exact: true }).click();
  await page.getByRole('main', { name: 'Player content' }).waitFor();
  assert(!(await page.locator('body').innerText()).includes('Hidden lookout'));
  await page.screenshot({ path: join(output, 'player.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('img', { name: /5 visible tokens/ }).waitFor();
  // Wait for the resize observer's scheduled canvas redraw, not a fixed sleep.
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.player-map-scroll canvas');
    return canvas && canvas.getBoundingClientRect().width <= 390;
  });
  await page.screenshot({ path: join(output, 'player-phone.png') });
  return { referenceSilhouettes: 3, affiliationFrames: 3, placement: true, cancel: true,
    movement: true, undoRedo: true, reload: true, backup: true, playerSvg: true, phoneViewport: '390 x 844' };
}
