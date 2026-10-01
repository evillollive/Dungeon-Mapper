import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { build } from 'vite';
import { test } from 'playwright/test';

function assertRedrawPixels(result, detail = result) {
  // Owner-approved full-redraw policy: RGB maxima remain diagnostic, not a gate.
  assert(result.alpha === 0 && result.mean <= 0.01,
    `Editor repaint mismatch: ${JSON.stringify(detail)}`);
}

test('full-redraw comparison preserves transparency and overall image limits', () => {
  assert.doesNotThrow(() => assertRedrawPixels({ maximum: 23, alpha: 0, mean: 0.000004186224708504801 }));
  assert.doesNotThrow(() => assertRedrawPixels({ maximum: 23, alpha: 0, mean: 0.01 }));
  assert.throws(() => assertRedrawPixels({ maximum: 0, alpha: 1, mean: 0 }), /Editor repaint mismatch/);
  assert.throws(() => assertRedrawPixels({ maximum: 0, alpha: 0, mean: 0.010001 }), /Editor repaint mismatch/);
});

test('token-only repaint matches the complete editor across movement and cancellation', async ({ browser }, info) => {
  const bundle = await build({
    configFile: false, logLevel: 'error',
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: { write: false, minify: false, lib: { entry: resolve('src/test/tokenRepaint.render.tsx'), formats: ['es'] } },
  });
  const outputs = Array.isArray(bundle) ? bundle : [bundle];
  assert(outputs.length === 1 && 'output' in outputs[0]);
  const entry = outputs[0].output.find(chunk => chunk.type === 'chunk' && chunk.isEntry);
  assert(entry && entry.imports.length === 0 && entry.dynamicImports.length === 0);
  const results = [];
  try {
    for (const dpr of [1, 1.25, 1.3, 1.5, 2, 3]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setContent('<!doctype html><html><head><title>Token repaint proof</title></head><body></body></html>');
        await page.addStyleTag({ content: `
          body{display:flex;margin:0}[data-proof]{width:700px;height:760px}
          .canvas-wrapper{height:700px;width:680px;display:flex;flex-direction:column;position:relative}
          .canvas-viewport{flex:1;overflow:hidden;display:flex;align-items:center;justify-content:center;position:relative}
          .zoom-controls,.canvas-hud,.minimap-canvas,.sr-only{position:absolute;left:-10000px}
        ` });
        await page.evaluate(async source => {
          const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
          try { window.mountTokenProof = (await import(url)).mountTokenRepaintProof; }
          finally { URL.revokeObjectURL(url); }
        }, entry.code);
        for (const scenario of [
          { size: 1, fog: false, text: false }, { size: 2, fog: false, text: false },
          { size: 3, fog: false, text: false }, { size: 1, fog: true, text: false },
          { size: 1, fog: false, text: true },
          { size: 1, fog: false, text: false, tileSize: 20 },
          { size: 3, fog: false, text: false, tileSize: 32 },
        ]) {
          await page.evaluate(async scenario => {
            window.tokenProof = await window.mountTokenProof(scenario.size, scenario.fog, scenario.text, false, scenario.tileSize ?? 24);
          }, scenario);
          let previousFull = 0;
          const compare = async phase => {
            const result = await page.evaluate(() => window.tokenProof.compare());
            results.push({ dpr, scenario, phase, ...result });
            assertRedrawPixels(result, results.at(-1));
            assert.equal(result.stats.candidate.partial, 0, 'Token changes must not use regional drawing');
            assert(result.stats.candidate.full > previousFull, `No complete redraw observed at ${phase}`);
            previousFull = result.stats.candidate.full;
            return result;
          };
          try {
            await compare('initial');
            await page.evaluate(() => window.tokenProof.pointer('pointerdown', 4, 5));
            for (const [x, y] of [[5, 5], [7, 5], [8, 6], [0, 0], [4, 5],
              [7, 16], [8, 16], [7, 16], [8, 16], [7, 16], [4, 5]]) {
              await page.evaluate(([x, y]) => window.tokenProof.pointer('pointermove', x, y), [x, y]);
              await compare(`move-${x}-${y}`);
            }
            await page.evaluate(() => window.tokenProof.pointer('pointercancel', 4, 5));
            await compare('cancelled');
            if (dpr === 1 && scenario.size === 1 && !scenario.fog && !scenario.text && !scenario.tileSize) {
              await page.evaluate(() => {
                const create = document.createElement;
                window.createdDragCanvases = 0;
                window.restoreCanvasAudit = () => { document.createElement = create; };
                document.createElement = function (...args) {
                  if (args[0].toLowerCase() === 'canvas') window.createdDragCanvases++;
                  return create.apply(this, args);
                };
              });
              try {
                await page.evaluate(() => window.tokenProof.pointer('pointerdown', 4, 5));
                for (let step = 0; step < 80; step++) {
                  await page.evaluate(x => window.tokenProof.pointer('pointermove', x, 5), 5 + step % 2);
                }
                await compare('long-drag-80-moves');
                assert.equal(await page.evaluate(() => window.createdDragCanvases), 0, 'Dragging allocated a new canvas');
                await page.evaluate(() => window.tokenProof.pointer('pointercancel', 4, 5));
                await compare('long-drag-cancelled');
              } finally {
                await page.evaluate(() => window.restoreCanvasAudit());
              }
            }
            await page.evaluate(() => window.tokenProof.pointer('pointerdown', 4, 5));
            await page.evaluate(() => window.tokenProof.pointer('pointermove', 6, 6));
            await compare('before-commit');
            await page.evaluate(() => window.tokenProof.pointer('pointerup', 6, 6));
            const committed = await compare('committed');
            assert.equal(committed.committed.candidate.x, 6);
            assert.deepEqual(committed.committed.candidate, committed.committed.reference);
            assert.equal(committed.stats.reference.partial, 0, 'Oracle must use the full-frame path');
          } catch (error) {
            await page.screenshot({ path: info.outputPath(`failure-${dpr}-${scenario.size}-${scenario.fog}-${scenario.text}.png`) });
            throw error;
          } finally {
            await page.evaluate(() => window.tokenProof.dispose());
          }
        }
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
  } finally {
    await info.attach('token-repaint-pixels', {
      body: JSON.stringify(results, null, 2), contentType: 'application/json',
    });
  }
});
