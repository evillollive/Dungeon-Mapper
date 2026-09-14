import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { build } from 'vite';
import { test } from 'playwright/test';
import { denseMapFixture } from './denseMapFixture.mjs';

let harness;
test.beforeAll(async () => {
  const result = await build({
    configFile: false, logLevel: 'error',
    build: { write: false, minify: false, lib: { entry: resolve('src/test/folioTiles.render.ts'), formats: ['es'] } },
  });
  const outputs = Array.isArray(result) ? result : [result];
  assert.equal(outputs.length, 1);
  assert('output' in outputs[0]);
  const entry = outputs[0].output.find(chunk => chunk.type === 'chunk' && chunk.isEntry);
  assert(entry && entry.imports.length === 0 && entry.dynamicImports.length === 0, 'Expected a self-contained renderer harness');
  harness = entry.code;
});

test('Folio tile sprites preserve direct pixels across materials, edits and device scales', async ({ page }, info) => {
  await page.setContent('<title>Folio tile renderer comparison</title>');
  const result = await page.evaluate(async source => {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
      return (await import(url)).compareFolioTilePixels();
    } finally {
      URL.revokeObjectURL(url);
    }
  }, harness);
  await info.attach('folio-tile-pixels', { body: JSON.stringify(result), contentType: 'application/json' });
  assert.equal(result.length, 210);
  // Translating the same vector commands to a small surface can round RGB by one
  // 8-bit step. Coverage must stay exact, with no contour or opacity allowance.
  assert(result.every(sample => sample.alphaDelta === 0 && sample.maxDelta <= 1 && sample.meanDelta <= 0.01),
    `Tile pixels changed: ${JSON.stringify(result.filter(sample => sample.alphaDelta > 0 || sample.maxDelta > 1 || sample.meanDelta > 0.01).slice(0, 5))}`);
});

test('Folio tile sprite copies preserve physical placement, clipping and caller state', async ({ page }) => {
  await page.setContent('<title>Folio tile copy state</title>');
  const checks = await page.evaluate(async source => {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
      return (await import(url)).verifyFolioTileCopyState();
    } finally {
      URL.revokeObjectURL(url);
    }
  }, harness);
  assert.equal(checks, 8);
});

test('F05 Folio tile sprites stay bounded without warm traversal allocations', async ({ page }, info) => {
  await page.setContent('<title>F05 tile sprite allocation</title>');
  const result = await page.evaluate(async ({ source, map }) => {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
      return (await import(url)).measureDenseFolioTileCache(map);
    } finally {
      URL.revokeObjectURL(url);
    }
  }, { source: harness, map: denseMapFixture().levels[0] });
  assert.equal(result.length, 3);
  await info.attach('f05-folio-tile-budget', { body: JSON.stringify(result), contentType: 'application/json' });
});
