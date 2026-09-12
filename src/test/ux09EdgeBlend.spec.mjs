import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { build } from 'vite';
import { test } from 'playwright/test';
import { denseMapFixture } from './denseMapFixture.mjs';

let harness;
test.beforeAll(async () => {
  const result = await build({
    configFile: false,
    logLevel: 'error',
    build: {
      write: false,
      minify: false,
      lib: { entry: resolve('src/test/edgeBlend.render.ts'), formats: ['es'] },
    },
  });
  const outputs = Array.isArray(result) ? result : [result];
  assert.equal(outputs.length, 1);
  assert('output' in outputs[0]);
  const entry = outputs[0].output.find(chunk => chunk.type === 'chunk' && chunk.isEntry);
  assert(entry && entry.imports.length === 0 && entry.dynamicImports.length === 0, 'Expected a self-contained renderer harness');
  harness = entry.code;
});

test('edge strips preserve direct renderer pixels across edits and device scales', async ({ page }, info) => {
  await page.setContent('<title>Edge blend renderer comparison</title>');
  const result = await page.evaluate(async source => {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
      return (await import(url)).compareEdgeBlendPixels();
    } finally {
      URL.revokeObjectURL(url);
    }
  }, harness);
  assert.equal(result.checks, 192);
  await info.attach('edge-blend-pixels', {
    body: JSON.stringify(result, null, 2), contentType: 'application/json',
  });
  const needsDiagnostics = result.maximumIsolatedDelta > 2 || result.maximumDelta > 8 ||
    result.results.some(sample => sample.meanDelta > 0.25);
  if (needsDiagnostics || process.env.QA_EDGE_BLEND_DIAGNOSTICS === '1') {
    let diagnostics;
    try {
      diagnostics = await page.evaluate(async ({ source, samples }) => {
        const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
        try {
          return (await import(url)).diagnoseEdgeBlendPixels(samples);
        } finally {
          URL.revokeObjectURL(url);
        }
      }, { source: harness, samples: result.results });
    } catch (error) {
      diagnostics = { error: error.stack ?? String(error) };
    }
    await info.attach('edge-blend-diagnostics', {
      body: JSON.stringify(diagnostics, null, 2), contentType: 'application/json',
    });
    // A broken diagnostic must not replace the original pixel failure.
    if (!needsDiagnostics) assert(!diagnostics.error, diagnostics.error);
  }
  // Allow one coverage-rounding step and one compositing-rounding step when
  // comparing different device-pixel origins, without allowing shifted art.
  assert(result.maximumIsolatedDelta <= 2, `Atlas packing changed edge pixels: ${result.maximumIsolatedDelta}`);
  // Grouping source-over draws through an RGBA8 strip changes rounding, not
  // the art. Bound both outliers (< 3.2%) and mean error (< 0.1% of a channel).
  assert(result.maximumDelta <= 8, `Maximum compositing difference: ${result.maximumDelta}`);
  assert(result.results.every(sample => sample.meanDelta <= 0.25), 'Mean compositing error exceeded 0.25/255');
});

test('F05 edge cache remains bounded at DPR 1, 2 and 3 without traversal churn', async ({ page }, info) => {
  await page.setContent('<title>F05 edge cache allocation</title>');
  const result = await page.evaluate(async ({ source, map }) => {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
      return (await import(url)).measureDenseEdgeCache(map);
    } finally {
      URL.revokeObjectURL(url);
    }
  }, { source: harness, map: denseMapFixture().levels[0] });
  assert.equal(result.length, 3);
  await info.attach('f05-edge-cache-budget', {
    body: JSON.stringify(result, null, 2), contentType: 'application/json',
  });
});
