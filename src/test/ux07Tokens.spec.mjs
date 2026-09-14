import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { build } from 'vite';
import { test } from 'playwright/test';

test('Folio token silhouettes and affiliation frames preserve raster, SVG and print geometry', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const bundle = await build({
    configFile: false, logLevel: 'error',
    build: { write: false, minify: false, lib: { entry: resolve('src/test/folioTokens.render.ts'), formats: ['es'] } },
  });
  const outputs = Array.isArray(bundle) ? bundle : [bundle];
  assert(outputs.length === 1 && 'output' in outputs[0]);
  const entry = outputs[0].output.find(chunk => chunk.type === 'chunk' && chunk.isEntry);
  assert(entry && entry.imports.length === 0 && entry.dynamicImports.length === 0);
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.setContent('<title>Token reference</title>');
  const result = await page.evaluate(async source => {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
      const harness = await import(url);
      const result = await harness.compareTokens();
      await harness.showTokenReview();
      return result;
    } finally { URL.revokeObjectURL(url); }
  }, entry.code);
  await info.attach('token-render-results', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  for (const section of ['reference', 'affiliations', 'maps', 'scales']) {
    await page.getByRole('button', { name: section, exact: false }).click();
    await page.screenshot({ path: info.outputPath(`${section}.png`), fullPage: true });
  }
  assert.equal(result.length, 432);
  assert.equal(new Set(result.map(sample => sample.icon)).size, 12);
  await page.getByRole('button', { name: 'Reference', exact: true }).click();
  const blurbs = await page.locator('#reference .card p').allTextContents();
  assert.equal(blurbs.length, 12);
  for (const blurb of blurbs) {
    assert.match(blurb, /^[^.!?]+[.]$/, 'Each character gets one sentence');
    assert(blurb.split(/\s+/).length <= 10, 'Keep character copy short');
  }
  for (const sample of result) {
    for (const field of ['editor', 'print']) {
      assert(sample[field].maximum <= 2 && sample[field].mean < 0.01,
        `${sample.icon} ${sample.kind} ${sample.tileSize}px ${field}: ${JSON.stringify(sample[field])}`);
    }
    // Native SVG and canvas antialias independently. Measure the token's
    // actual footprint, not the surrounding empty map.
    assert(sample.svg.mean < 2, `${sample.icon} SVG mismatch: ${JSON.stringify(sample)}`);
  }
  assert.deepEqual(errors, []);
});
