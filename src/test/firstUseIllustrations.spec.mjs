import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'vite';
import { test, expect } from 'playwright/test';

test('first-use illustrations preserve bounded decorative geometry and adaptive colors', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const bundle = await build({
    configFile: false, logLevel: 'error',
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: { write: false, minify: false, lib: { entry: resolve('src/test/firstUseIllustrations.render.tsx'), formats: ['es'] } },
  });
  const outputs = Array.isArray(bundle) ? bundle : [bundle];
  assert(outputs.length === 1 && 'output' in outputs[0]);
  const entry = outputs[0].output.find(chunk => chunk.type === 'chunk' && chunk.isEntry);
  assert(entry && entry.imports.length === 0 && entry.dynamicImports.length === 0);
  await page.setViewportSize({ width: 1140, height: 900 });
  await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>');
  for (const asset of outputs[0].output.filter(chunk => chunk.type === 'asset' && chunk.fileName.endsWith('.css'))) {
    await page.addStyleTag({ content: String(asset.source) });
  }
  await page.evaluate(async source => {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try { (await import(url)).showFirstUseReview(); }
    finally { URL.revokeObjectURL(url); }
  }, entry.code);
  const paths = await page.locator('#collection path').evaluateAll(elements => elements.map(path => {
    const box = path.getBBox();
    return { scene: path.closest('svg').dataset.scene, x: box.x, y: box.y, width: box.width, height: box.height };
  }));
  assert.equal(new Set(paths.map(path => path.scene)).size, 3);
  for (const box of paths) {
    assert(box.x >= 1 && box.y >= 1 && box.x + box.width <= 239 && box.y + box.height <= 143,
      `${box.scene}: geometry clipped by viewBox: ${JSON.stringify(box)}`);
  }
  assert.equal(await page.getByRole('img').count(), 0);
  assert.equal(await page.locator('svg image, svg use, svg text, svg a, svg foreignObject, svg script, svg animate, svg [tabindex]').count(), 0);
  await expect(page.locator('#collection svg')).toHaveCount(3);
  await page.screenshot({ path: info.outputPath('contact-sheet.png'), fullPage: true });
  for (const scene of ['create', 'backup', 'display']) {
    await page.locator(`#scene-${scene}`).screenshot({ path: info.outputPath(`${scene}.png`) });
  }
  await writeFile(info.outputPath('review.html'), await page.content());
  await page.emulateMedia({ forcedColors: 'active' });
  const forced = await page.locator('#collection .first-use-illustration').evaluateAll(elements => elements.map(svg => ({
    color: getComputedStyle(svg).color,
    strokes: [...svg.querySelectorAll('path')].map(path => getComputedStyle(path).stroke),
  })));
  for (const svg of forced) assert(svg.strokes.every(stroke => stroke === svg.color));
  await page.locator('#collection').screenshot({ path: info.outputPath('forced-colors.png') });
  await page.emulateMedia({ forcedColors: 'none', media: 'print' });
  const printColors = await page.locator('#collection path').evaluateAll(elements => elements.map(path => ({
    fill: getComputedStyle(path).fill, stroke: getComputedStyle(path).stroke,
  })));
  for (const color of printColors) {
    assert.equal(color.stroke, 'rgb(0, 0, 0)');
    assert(['none', 'rgb(255, 255, 255)', 'rgb(238, 238, 238)', 'rgb(221, 221, 221)'].includes(color.fill));
  }
  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: info.outputPath('phone-sheet.png'), fullPage: true });
  assert.deepEqual(errors, []);
});

test('first-use illustrations accompany existing creation backup and local-display actions', async ({ page, context, baseURL }, info) => {
  const errors = [];
  const observe = tab => tab.on('pageerror', error => errors.push(error.message));
  context.on('page', observe);
  observe(page);
  await page.goto(baseURL);
  await expect(page.getByRole('heading', { name: 'A new adventure starts here' })).toBeVisible();
  await expect(page.locator('.library-empty [data-scene="create"]')).toHaveCount(1);
  await page.screenshot({ path: info.outputPath('library-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('library-phone.png'), fullPage: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole('button', { name: 'Open a sample', exact: true }).click();
  await page.getByRole('button', { name: 'Preview map', exact: true }).click();
  await page.getByRole('button', { name: 'Use this map', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('button', { name: /Back up project/ }).click();
  await expect(page.locator('.export-backup [data-scene="backup"]')).toHaveCount(1);
  await expect(page.getByText(/Never send this backup to players/)).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download private backup', exact: true }).click();
  assert((await download).suggestedFilename().endsWith('.json'));
  await page.locator('.export-backup').screenshot({ path: info.outputPath('backup-phone.png') });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole('button', { name: 'Close Export' }).click();
  await page.getByRole('button', { name: 'Prepare session', exact: true }).click();
  await expect(page.locator('.prepare-intro [data-scene="display"]')).toBeVisible();
  await page.screenshot({ path: info.outputPath('prepare-phone.png'), fullPage: true });
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
  await page.getByRole('button', { name: 'Start session', exact: true }).scrollIntoViewIfNeeded();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: info.outputPath('prepare-phone-large-text.png'), fullPage: true });
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Session saved on this device' })).toBeVisible();
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open player display', exact: true }).click();
  const player = await popup;
  await player.setViewportSize({ width: 844, height: 390 });
  await expect(player.locator('.display-neutral [data-scene="display"]')).toBeVisible();
  await expect(player.locator('canvas')).toHaveCount(0);
  await player.getByRole('button', { name: 'Reconnect display' }).scrollIntoViewIfNeeded();
  await player.screenshot({ path: info.outputPath('waiting-landscape.png'), fullPage: true });
  assert(await player.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await player.getByRole('heading', { name: 'Waiting at the table' }).scrollIntoViewIfNeeded();
  assert(await player.getByRole('heading', { name: 'Waiting at the table' }).evaluate(element => element.getBoundingClientRect().top >= 0));
  await player.setViewportSize({ width: 390, height: 844 });
  await player.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
  await player.getByRole('button', { name: 'Reconnect display' }).scrollIntoViewIfNeeded();
  assert(await player.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await player.screenshot({ path: info.outputPath('waiting-phone-large-text.png'), fullPage: true });
  await player.close();
  assert.deepEqual(errors, []);
});
