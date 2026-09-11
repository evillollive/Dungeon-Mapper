import assert from 'node:assert/strict';
import { cpus, totalmem, release } from 'node:os';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { test, expect } from 'playwright/test';
import { denseMapFixture, summarizeSamples } from './denseMapFixture.mjs';

const throttle = Number(process.env.QA_CPU_THROTTLE ?? 1);
assert(Number.isFinite(throttle) && throttle >= 1 && throttle <= 20, 'QA_CPU_THROTTLE must be between 1 and 20.');

// Observe the existing synchronous main-canvas render, without a production hook.
// A frame callback alone can precede React's passive drawing effect under load.
function installMeasurements() {
  window.__f05 = { samples: [], longTasks: [], draws: [], pending: null, active: null };
  const finish = sample => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const end = performance.now();
      window.__f05.samples.push({ ...sample, durationMs: end - sample.startMs,
        postDrawFrameMs: sample.drawEndMs === undefined ? null : end - sample.drawEndMs });
      window.__f05.active = null;
      performance.mark(`f05:${sample.label}:frame`);
    }));
  };
  // MapCanvas assigns its backing width at the start of every full render.
  // The microtask runs after that synchronous drawing stack, even when React
  // schedules it later than the input's next animation frame.
  const width = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width');
  Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
    ...width,
    set(value) {
      width.set.call(this, value);
      if (this.getAttribute('role') !== 'application') return;
      const drawStartMs = performance.now();
      queueMicrotask(() => {
        const drawEndMs = performance.now();
        window.__f05.draws.push({ drawStartMs, drawEndMs });
        const active = window.__f05.active;
        if (!active?.requiresDraw || active.drawEndMs !== undefined || active.startMs > drawStartMs) return;
        active.drawStartMs = drawStartMs;
        active.drawEndMs = drawEndMs;
        finish(active);
      });
    },
  });
  if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
    new PerformanceObserver(list => {
      window.__f05.longTasks.push(...list.getEntries().map(entry => ({ startMs: entry.startTime, durationMs: entry.duration })));
    }).observe({ type: 'longtask', buffered: true });
  }
  for (const type of ['pointermove', 'pointerdown', 'pointerup', 'keydown', 'click']) {
    addEventListener(type, event => {
      const pending = window.__f05.pending;
      if (!pending || pending.type !== type || !event.isTrusted) return;
      window.__f05.pending = null;
      const received = performance.now();
      const sample = { ...pending, startMs: event.timeStamp, queueMs: received - event.timeStamp };
      window.__f05.active = sample;
      performance.mark(`f05:${pending.label}:input`);
      if (!sample.requiresDraw) finish(sample);
    }, true);
  }
}

test('F05 probe waits for delayed canvas drawing', async ({ page }) => {
  await page.setContent('<button>Draw</button><canvas role="application"></canvas>');
  await page.evaluate(installMeasurements);
  await page.evaluate(() => {
    window.__f05.pending = { label: 'delayed-draw', type: 'click', requiresDraw: true };
    document.querySelector('button').addEventListener('click', () => {
      setTimeout(() => {
        const canvas = document.querySelector('canvas');
        canvas.width = 64;
        canvas.getContext('2d').fillRect(0, 0, 64, 64);
      }, 100);
    });
  });
  await page.getByRole('button', { name: 'Draw', exact: true }).click();
  await page.waitForFunction(() => window.__f05.samples.length === 1);
  const sample = await page.evaluate(() => window.__f05.samples[0]);
  assert(sample.durationMs >= 100, 'A frame opportunity before drawing must not end the measurement');
  assert(sample.drawEndMs >= sample.drawStartMs && sample.drawStartMs >= sample.startMs);
  assert(sample.postDrawFrameMs >= 0);
});

test('F05 dense-map local performance diagnostics', async ({ page, context, baseURL }, info) => {
  assert(throttle === 1 || info.project.name === 'chromium', 'CPU throttling requires --project=chromium.');
  test.setTimeout(180_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const result = {
    fixture: 'F05 v1',
    source: process.env.QA_SOURCE_SHA ?? process.env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    workingTreeDirty: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim() !== '',
    engine: info.project.name, browserVersion: context.browser().version(),
    host: { cpu: cpus()[0]?.model, memoryBytes: totalmem(), platform: process.platform, osRelease: release() },
    viewport: { width: 1440, height: 900 }, cpuThrottle: throttle,
    acceptance: 'Diagnostic only. Reference-device and mobile acceptance remain open.',
    method: 'Trusted event timestamp through completed main-canvas drawing, when required, then two animation frames. Rendering opportunity proxy, not physical input-to-paint or INP. Warm loading includes browser-driver readiness checks and a frame opportunity.',
    runs: [],
  };
  let cdp;
  let tracing = false;
  let completed = false;
  if (info.project.name === 'chromium') {
    cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  }
  await page.addInitScript(installMeasurements);
  const saved = () => expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  const readMap = () => page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('dungeon-mapper', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('maps', 'readonly');
      const read = tx.objectStore('maps').get(`project:${new URL(location.href).searchParams.get('project')}`);
      tx.oncomplete = () => { db.close(); resolve(read.result.project.levels[0]); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }));
  const measure = async (label, type, action) => {
    const count = await page.evaluate(({ label, type }) => {
      if (window.__f05.active || window.__f05.pending) throw new Error('Overlapping F05 measurements');
      window.__f05.pending = { label, type, requiresDraw: label.startsWith('paint-') || label.startsWith('token-') };
      return window.__f05.samples.length;
    }, { label, type });
    await action();
    await page.waitForFunction(count => window.__f05.samples.length > count, count);
  };
  const frame = () => page.evaluate(() => new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))));
  try {
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Import project', { exact: true }).setInputFiles({
      name: 'f05.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(denseMapFixture())),
    });
    await page.getByRole('button', { name: 'Import as new project', exact: true }).click();
    await saved();
    const imported = await readMap();
    assert.equal(imported.tokens.length, 100);
    assert.equal(imported.stamps.length, 200);
    assert.equal(imported.notes.length, 100);
    assert.equal(imported.dynamicFogEnabled, true);
    assert.equal(imported.paperTexture.enabled, true);
    assert.equal(imported.edgeBlend.enabled, true);
    assert.equal(imported.lightingAtmosphere.enabled, true);
    assert.deepEqual(imported.roomShapes, denseMapFixture().levels[0].roomShapes);
    assert.deepEqual(imported.rivers, denseMapFixture().levels[0].rivers);
    await expect(page.locator('#map-canvas-summary')).toContainText('128 by 128');
    await page.getByRole('button', { name: 'Fit map to screen', exact: true }).click();
    // Import and art-cache population are setup, not warm-loading measurements.
    for (let run = 0; run < 3; run++) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('application')).toBeVisible();
      await saved();
      await frame();
      const warmLoad = await page.evaluate(() => ({
        readyMs: performance.now(), dpr: devicePixelRatio,
        navigation: performance.getEntriesByType('navigation')[0].toJSON(),
        serviceWorkerControlled: !!navigator.serviceWorker.controller,
        assets: performance.getEntriesByType('resource').filter(entry => entry.name.includes('/assets/')).map(entry => entry.name),
      }));
      result.dpr = warmLoad.dpr;
      assert.equal(warmLoad.dpr, 1);
      const samples = [];
      const canvas = page.getByRole('application');
      const point = async (x, y) => {
        const box = await canvas.boundingBox();
        assert(box, 'Missing editor canvas');
        return { x: box.x + (x + 0.5) * box.width / 128, y: box.y + (y + 0.5) * box.height / 128 };
      };
      await page.getByLabel('Active building tool').selectOption('paint');
      await page.getByLabel('Active material', { exact: true }).selectOption('water');
      await frame();
      if (cdp && run === 0) {
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.start');
        await cdp.send('Tracing.start', { categories: 'devtools.timeline,blink.user_timing',
          transferMode: 'ReturnAsStream' });
        tracing = true;
      }
      for (let i = 0; i < 24; i++) {
        const p = await point(20 + i, 22);
        await measure('hover', 'pointermove', () => page.mouse.move(p.x, p.y));
        await expect(page.locator('.hud-coords')).toHaveText(`X:${20 + i} Y:22`);
      }
      const paintStart = await point(20, 23);
      await page.mouse.move(paintStart.x, paintStart.y);
      await measure('paint-start', 'pointerdown', () => page.mouse.down());
      for (let i = 1; i <= 24; i++) {
        const p = await point(20 + i, 23);
        await measure('paint-drag', 'pointermove', () => page.mouse.move(p.x, p.y));
      }
      await measure('paint-commit', 'pointerup', () => page.mouse.up());
      await saved();
      assert((await readMap()).tiles[23].slice(20, 45).every(tile => tile.type === 'water'), 'Paint did not persist');
      await page.locator('[data-action="edit.undo"]').filter({ visible: true }).first().click();
      await saved();
      assert.deepEqual((await readMap()).tiles[23], imported.tiles[23], 'Stroke must undo as one action');
      await page.locator('[data-action="panel.decorate"]').filter({ visible: true }).first().click();
      await page.getByRole('button', { name: 'Move token tool', exact: true }).click();
      await page.getByRole('button', { name: 'Fit map to screen', exact: true }).click();
      const tokenStart = await point(3, 3);
      await page.mouse.move(tokenStart.x, tokenStart.y);
      await page.mouse.down();
      for (let i = 1; i <= 12; i++) {
        const p = await point(3 + i, 3);
        await measure('token-drag', 'pointermove', () => page.mouse.move(p.x, p.y));
      }
      await measure('token-commit', 'pointerup', () => page.mouse.up());
      await saved();
      assert.equal((await readMap()).tokens[0].x, 15, 'Token movement did not persist');
      await page.locator('[data-action="edit.undo"]').filter({ visible: true }).first().click();
      await saved();
      assert.deepEqual((await readMap()).tokens, imported.tokens, 'Token drag must undo as one action');
      await page.locator('[data-action="panel.build"]').filter({ visible: true }).first().click();
      await canvas.focus();
      for (let i = 0; i < 24; i++) {
        await measure('pan', 'keydown', () => page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight'));
      }
      await page.getByRole('button', { name: 'Fit map to screen', exact: true }).click();
      const recorded = await page.evaluate(() => window.__f05);
      for (const label of ['hover', 'paint-start', 'paint-drag', 'paint-commit', 'token-drag', 'token-commit', 'pan']) {
        samples.push({ label, ...summarizeSamples(recorded.samples.filter(sample => sample.label === label).map(sample => sample.durationMs)) });
      }
      result.runs.push({ run: run + 1, profiled: !!cdp && run === 0, warmLoad, samples, rawEvents: recorded.samples, draws: recorded.draws,
        longTasks: recorded.longTasks, longTaskSupport: await page.evaluate(() => PerformanceObserver.supportedEntryTypes.includes('longtask')) });
      if (tracing) {
        const { profile } = await cdp.send('Profiler.stop');
        await writeFile(info.outputPath('f05-chromium.cpuprofile'), JSON.stringify(profile));
        const complete = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve));
        await cdp.send('Tracing.end');
        const { stream } = await complete;
        tracing = false;
        const chunks = [];
        let eof = false;
        while (!eof) {
          const chunk = await cdp.send('IO.read', { handle: stream });
          chunks.push(Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8'));
          eof = chunk.eof;
        }
        await cdp.send('IO.close', { handle: stream });
        await writeFile(info.outputPath('f05-chromium-trace.json'), Buffer.concat(chunks));
      }
    }
    await page.screenshot({ path: info.outputPath('f05-editor.png') });
    assert.deepEqual(errors, []);
    completed = true;
  } finally {
    if (tracing) await cdp.send('Tracing.end');
    result.errors = errors;
    result.outcome = completed ? 'completed' : 'incomplete-or-failed';
    result.expectedRuns = 3;
    result.completedRuns = result.runs.length;
    await info.attach('f05-results', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
    await writeFile(info.outputPath('f05-results.json'), JSON.stringify(result, null, 2));
  }
});
