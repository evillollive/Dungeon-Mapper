import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'vite';
import { test } from 'playwright/test';

test('interface icon family preserves size, stroke, names and control states', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const bundle = await build({
    configFile: false, logLevel: 'error',
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: { write: false, minify: false, lib: { entry: resolve('src/test/interfaceIcons.render.tsx'), formats: ['es'] } },
  });
  const outputs = Array.isArray(bundle) ? bundle : [bundle];
  assert(outputs.length === 1 && 'output' in outputs[0]);
  const entry = outputs[0].output.find(chunk => chunk.type === 'chunk' && chunk.isEntry);
  assert(entry && entry.imports.length === 0 && entry.dynamicImports.length === 0);
  await page.setViewportSize({ width: 1180, height: 900 });
  await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>');
  for (const asset of outputs[0].output.filter(chunk => chunk.type === 'asset' && chunk.fileName.endsWith('.css'))) {
    await page.addStyleTag({ content: String(asset.source) });
  }
  await page.evaluate(async source => {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try { (await import(url)).showIconReview(); }
    finally { URL.revokeObjectURL(url); }
  }, entry.code);
  const icons = await page.locator('#catalog .ui-icon').evaluateAll(elements => elements.map(svg => {
    const path = svg.querySelector('path');
    const bounds = path.getBBox();
    const rect = svg.getBoundingClientRect();
    return { name: svg.dataset.icon, width: rect.width, height: rect.height,
      bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
      stroke: getComputedStyle(svg).stroke, color: getComputedStyle(svg).color };
  }));
  assert.equal(icons.length, 96);
  assert.equal(new Set(icons.map(icon => icon.name)).size, 32);
  for (const [index, icon] of icons.entries()) {
    assert.equal(icon.width, [16, 20, 24][index % 3]);
    assert.equal(icon.height, icon.width);
    assert.equal(icon.stroke, icon.color);
    const box = icon.bounds;
    assert(box.width > 0 && box.height > 0, `${icon.name}: empty path`);
    assert(box.x >= 0.8 && box.y >= 0.8 && box.x + box.width <= 23.2 && box.y + box.height <= 23.2,
      `${icon.name}: stroke clipped by viewBox: ${JSON.stringify(box)}`);
  }
  assert.equal(await page.getByRole('img').count(), 0);
  assert.equal(await page.locator('.ui-icon:not([aria-hidden="true"]), .ui-icon:not([focusable="false"])').count(), 0);
  await page.locator('#catalog').screenshot({ path: info.outputPath('catalog.png') });
  await page.locator('#icon-display').screenshot({ path: info.outputPath('player-display.png') });
  await page.locator('#states').screenshot({ path: info.outputPath('states.png') });
  await writeFile(info.outputPath('review.html'), await page.content());
  const tab = info.project.name === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
  await page.getByRole('button', { name: 'Create default', exact: true }).focus();
  await page.keyboard.press(tab);
  assert.equal(await page.locator(':focus').getAttribute('aria-label'), 'Create selected');
  await page.keyboard.press(tab);
  assert.equal(await page.locator(':focus').getAttribute('aria-label'), 'Create focus treatment');
  await page.emulateMedia({ forcedColors: 'active' });
  await page.locator('#states').screenshot({ path: info.outputPath('forced-colors.png') });
  const states = await page.locator('#states button').evaluateAll(elements => elements.map(button => {
    const svg = button.querySelector('svg');
    return { stroke: getComputedStyle(svg).stroke, color: getComputedStyle(button).color,
      display: getComputedStyle(svg).display, width: svg.getBoundingClientRect().width };
  }));
  for (const state of states) {
    assert.equal(state.stroke, state.color);
    assert.notEqual(state.display, 'none');
    assert(state.width >= 20);
  }
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.review-sizes').evaluateAll(elements => elements.forEach(element => { element.style.fontSize = '32px'; }));
  const doubled = await page.locator('#catalog .ui-icon').evaluateAll(elements => elements.map(svg => svg.getBoundingClientRect().width));
  for (const [index, width] of doubled.entries()) assert.equal(width, [32, 40, 48][index % 3]);
  await page.screenshot({ path: info.outputPath('mobile-text-size.png'), fullPage: true });
  await info.attach('icon-geometry', { body: JSON.stringify(icons, null, 2), contentType: 'application/json' });
  assert.deepEqual(errors, []);
});
