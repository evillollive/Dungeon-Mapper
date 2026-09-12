// Page-based production journey. The caller owns the disposable context.
import { join } from 'node:path';
import { downloadExportText } from './exportJourney.mjs';
export default async function runFurnishingJourney(tab, { output }) {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  await tab.setViewportSize({ width: 1440, height: 1000 });
  await tab.getByRole('button', { name: 'Open a sample', exact: true }).click();
  await tab.getByRole('combobox').selectOption('folio-wayfarers-refuge');
  await tab.getByRole('button', { name: 'Preview map', exact: true }).click();
  await tab.getByRole('button', { name: 'Use this map', exact: true }).click();
  const saved = () => tab.getByText('Saved on this device', { exact: true }).waitFor();
  await saved();
  await tab.getByRole('button', { name: 'Decorate', exact: true }).click();
  await tab.getByRole('tab', { name: /Show.*Theme stamps/ }).click();
  assert(await tab.getByRole('button', { name: /^Folio / }).count() === 24, 'Expected 24 named furnishings');
  const backup = async () => JSON.parse(await downloadExportText(tab, 'backup')).project;
  const reference = (await backup()).levels[0];
  assert(new Set(reference.stamps.map(stamp => stamp.stampId)).size === 24, 'Reference is missing catalog assets');
  assert(reference.stamps.length === 34 && reference.lightSources.length === 0, 'Reference content or decorative-light contract changed');
  const canvas = tab.locator('canvas[role="application"]');
  const bounds = await canvas.boundingBox();
  for (const [name, id, scale, x] of [
    ['Folio bed', 'bed', 1.75, 8],
    ['Folio tent', 'tent', 2.5, 15],
  ]) {
    await tab.getByRole('searchbox', { name: 'Search stamps' }).fill(name);
    await tab.getByRole('button', { name, exact: true }).click();
    await canvas.click({ position: { x: (x + 0.5) * bounds.width / 24, y: 16.5 * bounds.height / 24 } });
    await saved();
    const added = (await backup()).levels[0].stamps.at(-1);
    assert(added.stampId === `folio-furnishings-v1-${id}` && added.scale === scale, `${name} default scale or placement failed`);
  }
  await tab.getByRole('searchbox', { name: 'Search stamps' }).fill('');
  const placed = (await backup()).levels[0].stamps.at(-1);
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
  await tab.screenshot({ path: join(output, 'editor.png') });
  const svg = await downloadExportText(tab, 'svg');
  assert(!svg.includes('sealed route ledger') && svg.includes('opacity="0.65"'), 'SVG privacy or opacity failed');
  await tab.getByRole('button', { name: 'Player preview', exact: true }).click();
  assert(!(await tab.locator('body').innerText()).includes('Hidden ledger'), 'Private note reached the player');
  await tab.screenshot({ path: join(output, 'player.png') });
  await tab.setViewportSize({ width: 390, height: 844 });
  await tab.screenshot({ path: join(output, 'player-phone.png') });
  return { browser: tab.context().browser().version(), kitSize: 24, placement: true, transforms: true,
    undoRedo: true, reload: true, backup: true, playerSvg: true };
}
