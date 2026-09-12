import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { build } from 'vite';
import { test } from 'playwright/test';

test('Folio furnishings preserve editor, player SVG and print rendering at four scales', async ({ page }, info) => {
  const bundle = await build({
    configFile: false, logLevel: 'error',
    build: { write: false, minify: false, lib: { entry: resolve('src/test/folioFurnishings.render.ts'), formats: ['es'] } },
  });
  const outputs = Array.isArray(bundle) ? bundle : [bundle];
  assert.equal(outputs.length, 1);
  assert('output' in outputs[0]);
  const entry = outputs[0].output.find(chunk => chunk.type === 'chunk' && chunk.isEntry);
  assert(entry && entry.imports.length === 0 && entry.dynamicImports.length === 0, 'Expected a self-contained art harness');
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.setContent('<title>Folio furnishing review</title>');
  const result = await page.evaluate(async source => {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
      const harness = await import(url);
      const result = await harness.compareFurnishings();
      await harness.showFurnishingReview();
      return result;
    } finally {
      URL.revokeObjectURL(url);
    }
  }, entry.code);
  await info.attach('furnishing-render-results', {
    body: JSON.stringify(result, null, 2), contentType: 'application/json',
  });
  for (const section of ['catalog', 'maps', 'zooms']) {
    await page.evaluate(active => {
      for (const id of ['catalog', 'maps', 'zooms']) document.getElementById(id).hidden = id !== active;
    }, section);
    await page.screenshot({ path: info.outputPath(`${section}.png`), fullPage: true });
  }
  assert.equal(result.assets, 24);
  assert.equal(result.cases, 16);
  assert(result.cacheEntries <= 128, 'Path cache exceeded its existing ceiling');
  for (const sample of result.results) {
    assert(sample.paintOperations > 24, 'Missing furnishing paint operations');
    assert(sample.editorCommandsEqual, 'Editor/export geometry, transforms or paints differ');
    assert(sample.printCommandsEqual, 'Print companion geometry, transforms or paints differ');
    // Identical vector commands can rasterize differently in WebKit, including
    // repeated exports. Require exact commands above and bounded pixel drift.
    for (const delta of [sample.editorDelta, sample.repeatDelta]) {
      assert(delta.maximum <= 2 && delta.mean < 0.0001, `Editor/export pixel drift at ${sample.tileSize}px: ${JSON.stringify(delta)}`);
    }
    for (const delta of [sample.printDelta, sample.printRepeatDelta]) {
      assert(delta.maximum <= 32 && delta.mean < 0.01, `Print pixel drift at ${sample.tileSize}px: ${JSON.stringify(delta)}`);
    }
    assert.equal(sample.svgAssets.length, 24);
    // Native SVG and Canvas antialias edges independently; bound each asset's
    // four-cell review region to less than one channel level of mean error.
    for (const asset of sample.svgAssets) assert(asset.meanDelta < 1,
      `${asset.id} SVG mismatch at ${sample.tileSize}px: ${asset.meanDelta}`);
  }
});
