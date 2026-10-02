import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect } from 'playwright/test';
import { denseMapFixture } from './denseMapFixture.mjs';
import { records } from './ux02Creation.browser.mjs';
import { saved } from './ux09Library.browser.mjs';
import { downloadExportText } from './exportJourney.mjs';

function observeExport() {
  const native = {
    width: Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width'),
    height: Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height'),
    toBlob: HTMLCanvasElement.prototype.toBlob, click: HTMLAnchorElement.prototype.click,
    createURL: URL.createObjectURL, revokeURL: URL.revokeObjectURL,
  };
  const ids = new WeakMap(), surfaces = new Map(), urls = new Map();
  const data = {
    phase: 'setup', surfaces: [], encodings: [], requests: [], timerGaps: [], blocked: [],
    maxSurfacePixels: 0, peakManagedPixels: 0, cancel: null, limitReached: false,
    failNextEncoding: false, encodingHeld: false,
  };
  const editor = canvas => canvas.getAttribute('role') === 'application' || canvas.classList.contains('minimap-canvas');
  const identify = canvas => {
    let id = ids.get(canvas);
    if (!id) {
      id = surfaces.size + 1;
      ids.set(canvas, id);
      surfaces.set(id, { id, width: canvas.width, height: canvas.height, managed: false });
    }
    return surfaces.get(id);
  };
  const update = canvas => {
    const item = identify(canvas);
    item.width = canvas.width;
    item.height = canvas.height;
    item.managed ||= (item.width === 2250 && item.height === 3000) ||
      (item.width === 2550 && item.height === 3300) || (item.width === 2048 && item.height === 2048);
    data.maxSurfacePixels = Math.max(data.maxSurfacePixels, item.width * item.height);
    data.peakManagedPixels = Math.max(data.peakManagedPixels,
      [...surfaces.values()].filter(surface => surface.managed).reduce((sum, surface) => sum + surface.width * surface.height, 0));
  };
  for (const key of ['width', 'height']) {
    Object.defineProperty(HTMLCanvasElement.prototype, key, {
      ...native[key], set(value) {
        if (!editor(this)) {
          const width = key === 'width' ? value : this.width;
          const height = key === 'height' ? value : this.height;
          if (width > 8192 || height > 8192 || width * height > 16_000_000) {
            data.blocked.push({ phase: data.phase, width, height });
            throw new Error('Dense export requested an over-limit canvas before allocation');
          }
        }
        native[key].set.call(this, value);
        if (!editor(this)) update(this);
      },
    });
  }
  HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
    const surface = identify(this);
    const start = performance.now();
    const entry = { id: surface.id, phase: data.phase, width: this.width, height: this.height, start };
    const fail = data.failNextEncoding;
    data.failNextEncoding = false;
    data.encodings.push(entry);
    const hold = data.phase === 'batch' && data.encodings.filter(encoding => encoding.phase === 'batch').length === 2;
    native.toBlob.call(this, blob => {
      entry.end = performance.now();
      entry.bytes = blob?.size ?? 0;
      const deliver = () => {
        if (fail) {
          entry.injectedFailure = true;
          callback(null);
        } else callback(blob);
      };
      if (hold) {
        entry.injectedCallbackHold = true;
        data.encodingHeld = true;
        window.releaseDenseEncoding = () => {
          data.encodingHeld = false;
          entry.releasedAt = performance.now();
          delete window.releaseDenseEncoding;
          deliver();
        };
      } else deliver();
    }, ...args);
  };
  HTMLAnchorElement.prototype.click = function (...args) {
    if (this.download.endsWith('.png')) {
      if (data.phase === 'batch' && data.requests.filter(request => request.phase === 'batch').length >= 3) {
        data.limitReached = true;
        throw new Error('Stopped the dense export audit before a fourth batch download');
      }
      data.requests.push({ phase: data.phase, name: this.download, at: performance.now() });
    }
    return native.click.apply(this, args);
  };
  URL.createObjectURL = function (blob) {
    const url = native.createURL.call(this, blob);
    if (blob instanceof Blob && blob.type === 'image/png') urls.set(url, { bytes: blob.size, created: performance.now(), revoked: null });
    return url;
  };
  URL.revokeObjectURL = function (url) {
    if (urls.has(url)) urls.get(url).revoked = performance.now();
    return native.revokeURL.call(this, url);
  };
  const click = event => {
    if (event.target instanceof Element && event.target.closest('button')?.textContent?.trim() === 'Cancel export') {
      data.cancel = { requested: event.timeStamp, received: performance.now(), trusted: event.isTrusted, pendingShown: null, shown: null };
    }
  };
  document.addEventListener('click', click, true);
  const messages = new MutationObserver(() => {
    if (data.cancel && data.cancel.pendingShown === null &&
        document.body.textContent.includes('Cancelling export. Waiting for the current operation to finish.')) {
      data.cancel.pendingShown = performance.now();
    }
    if (data.cancel && data.cancel.shown === null && document.body.textContent.includes('Export cancelled.')) {
      data.cancel.shown = performance.now();
    }
  });
  messages.observe(document.body, { childList: true, characterData: true, subtree: true });
  let previous = performance.now();
  const timer = setInterval(() => {
    const now = performance.now();
    data.timerGaps.push({ phase: data.phase, elapsed: now - previous });
    previous = now;
  }, 50);
  window.denseExport = data;
  window.readDenseExport = () => ({
    ...data, surfaces: [...surfaces.values()], urls: [...urls.values()],
  });
  window.restoreDenseExport = (abort = false) => {
    clearInterval(timer);
    messages.disconnect();
    document.removeEventListener('click', click, true);
    for (const key of ['width', 'height']) Object.defineProperty(HTMLCanvasElement.prototype, key, native[key]);
    HTMLCanvasElement.prototype.toBlob = native.toBlob;
    HTMLAnchorElement.prototype.click = native.click;
    URL.createObjectURL = native.createURL;
    URL.revokeObjectURL = native.revokeURL;
    if (abort || data.encodingHeld) {
      document.querySelector('button[aria-label="Close Export"]')?.click();
      window.releaseDenseEncoding?.();
    }
  };
}

async function verifyPNG(context, download, output, name, width, height, dpi) {
  const path = join(output, name);
  await download.saveAs(path);
  const bytes = await readFile(path);
  assert(bytes.length >= 33, 'Truncated PNG header');
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16), width);
  assert.equal(bytes.readUInt32BE(20), height);
  let physical = null;
  let ended = false;
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    assert(offset + length + 12 <= bytes.length, 'Truncated PNG chunk');
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    if (type === 'pHYs') {
      assert.equal(physical, null, 'Duplicate PNG resolution chunk');
      physical = [bytes.readUInt32BE(offset + 8), bytes.readUInt32BE(offset + 12), bytes[offset + 16]];
    }
    if (type === 'IEND') {
      assert.equal(length, 0);
      assert.equal(offset + 12, bytes.length);
      ended = true;
    }
    offset += length + 12;
  }
  assert.deepEqual(physical, [Math.round(dpi / 0.0254), Math.round(dpi / 0.0254), 1]);
  assert(ended, 'PNG end marker is missing');
  const verifier = await context.newPage();
  try {
    const decoded = await verifier.evaluate(async base64 => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, 64, 64);
      const pixels = ctx.getImageData(0, 0, 64, 64).data;
      let nonwhite = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i] < 250 || pixels[i + 1] < 250 || pixels[i + 2] < 250) nonwhite++;
      return { width: image.naturalWidth, height: image.naturalHeight, nonwhite };
    }, bytes.toString('base64'));
    assert.deepEqual([decoded.width, decoded.height], [width, height]);
    assert(decoded.nonwhite > 0, 'Export decoded as an empty white page');
    return { name: download.suggestedFilename(), bytes: bytes.length, ...decoded, dpi };
  } finally { await verifier.close(); }
}

export default async function denseExport(page, { output }) {
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Import project', { exact: true }).setInputFiles({
    name: 'f05-export.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(denseMapFixture())),
  });
  await page.getByRole('button', { name: 'Import as new project', exact: true }).click();
  await saved(page);
  const beforeBackup = JSON.parse(await downloadExportText(page, 'backup'));
  const map = beforeBackup.project.levels[0];
  assert.deepEqual([map.tokens.length, map.stamps.length, map.notes.length, map.roomShapes.length, map.rivers.length], [100, 200, 100, 16, 1]);
  assert(map.paperTexture.enabled && map.edgeBlend.enabled && map.lightingAtmosphere.enabled);
  await saved(page);
  const before = await records(page);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export', exact: true });
  await dialog.getByRole('button', { name: /Print for the table/ }).click();
  await dialog.getByLabel('Audience', { exact: true }).selectOption('gm');
  await dialog.getByLabel('Resolution (DPI)').selectOption('300');
  await dialog.getByLabel('Ink-friendly map styling').uncheck();
  await expect(dialog.getByText('252 pages', { exact: true })).toBeVisible();
  await page.waitForFunction(() => document.querySelector('.export-preview canvas')?.height === 640);
  await page.evaluate(observeExport);
  const pngs = [];
  const receive = download => { if (download.suggestedFilename().endsWith('.png')) pngs.push(download); };
  page.on('download', receive);
  const result = { files: [], cancellation: null, allocation: null };
  let complete = false;
  try {
    await page.evaluate(() => { window.denseExport.phase = 'batch'; });
    let cancelDriverMs;
    await Promise.all([
      dialog.getByRole('button', { name: 'Download all 252 pages', exact: true }).click({ noWaitAfter: true }),
      (async () => {
        const cancel = dialog.getByRole('button', { name: 'Cancel export', exact: true });
        await cancel.focus();
        await page.waitForFunction(() => window.denseExport.encodingHeld);
        await expect(cancel).toBeFocused();
        const cancelStart = performance.now();
        await page.keyboard.press('Enter');
        await expect(dialog.getByText('Cancelling export. Waiting for the current operation to finish.', { exact: true })).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Cancellation requested', exact: true })).toBeDisabled();
        await expect(dialog.getByLabel('Resolution (DPI)')).toBeDisabled();
        await page.evaluate(() => window.releaseDenseEncoding());
        await expect(dialog.getByText('Export cancelled. Completed downloads are kept; your project is unchanged.', { exact: true })).toBeVisible();
        cancelDriverMs = performance.now() - cancelStart;
      })(),
    ]);
    const cancelled = await page.evaluate(() => window.readDenseExport());
    assert(cancelled.cancel?.trusted && cancelled.cancel.shown !== null);
    assert(cancelled.encodings.some(encoding => encoding.phase === 'batch' && encoding.start <= cancelled.cancel.received));
    assert.equal(cancelled.limitReached, false, 'Audit safety limit was reached before cancellation');
    assert(cancelled.requests.filter(request => request.phase === 'batch').every(request => request.at <= cancelled.cancel.received));
    result.cancellation = { input: 'Native Enter while the second real encoding callback is held',
      injectedCallbackHold: true,
      driverRequestToCompletionMs: cancelDriverMs,
      inputQueueMs: cancelled.cancel.received - cancelled.cancel.requested,
      receivedToFeedbackMs: (cancelled.cancel.pendingShown ?? cancelled.cancel.shown) - cancelled.cancel.received,
      receivedToCompletionMs: cancelled.cancel.shown - cancelled.cancel.received,
      completedRequests: cancelled.requests.length };
    await expect.poll(async () => (await page.evaluate(() => window.readDenseExport()))
      .surfaces.filter(surface => surface.managed && surface.width * surface.height > 0).length).toBe(0);
    await expect.poll(() => pngs.length).toBe(cancelled.requests.length);
    for (const [index, download] of pngs.entries()) {
      result.files.push(await verifyPNG(page.context(), download, output, `cancelled-batch-page-${index + 1}.png`, 2550, 3300, 300));
    }

    await dialog.getByLabel('Preview / download page').selectOption('251');
    await page.waitForFunction(() => document.querySelector('.export-preview canvas')?.height === 640);
    await page.evaluate(() => {
      window.denseExport.phase = 'encoding-failure';
      window.denseExport.failNextEncoding = true;
    });
    const failedCount = pngs.length;
    await dialog.getByRole('button', { name: 'Download page 252', exact: true }).click();
    await expect(dialog.getByRole('alert').filter({ hasText: 'PNG rendering failed.' })).toBeVisible();
    assert.equal(pngs.length, failedCount, 'Failed encoding requested a download');
    await expect.poll(async () => (await page.evaluate(() => window.readDenseExport()))
      .surfaces.filter(surface => surface.managed && surface.width * surface.height > 0).length).toBe(0);
    await page.evaluate(() => { window.denseExport.phase = 'last-page-retry'; });
    const retry = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Download page 252', exact: true }).click();
    const lastPage = await retry;
    assert(lastPage.suggestedFilename().endsWith('_page_14-18.png'));
    await expect(dialog.getByText(/Download requested/)).toBeVisible();
    result.files.push(await verifyPNG(page.context(), lastPage, output, 'last-page-retry.png', 2550, 3300, 300));

    await page.evaluate(() => { window.denseExport.phase = 'player-image'; });
    await dialog.getByRole('button', { name: /Share with players/ }).click();
    await dialog.getByLabel('Pixels per cell').selectOption('16');
    await page.waitForFunction(() => document.querySelector('.export-preview canvas')?.width === 640);
    const player = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Export PNG', exact: true }).click();
    const playerImage = await player;
    assert.equal(playerImage.suggestedFilename(), 'The_crowded_halls_16dpi.png');
    await expect(dialog.getByText(/Download requested/)).toBeVisible();
    result.files.push(await verifyPNG(page.context(), playerImage, output, 'player-image.png', 2048, 2048, 16));

    await dialog.getByRole('button', { name: /Back up project/ }).click();
    const backup = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Download private backup' }).click();
    const afterBackup = JSON.parse(await readFile(await (await backup).path(), 'utf8'));
    assert.deepEqual(afterBackup, beforeBackup, 'Exports must not mutate in-memory project data');
    assert.deepEqual(await records(page), before, 'Exports must not write project or recovery records');
    await expect.poll(async () => (await page.evaluate(() => window.readDenseExport()))
      .urls.filter(url => url.revoked === null).length).toBe(0);
    const data = await page.evaluate(() => window.readDenseExport());
    assert.deepEqual(data.blocked, []);
    assert(data.maxSurfacePixels <= 16_000_000);
    assert(data.peakManagedPixels <= 2250 * 3000 + 2550 * 3300, 'Export page surfaces accumulated instead of being released sequentially');
    assert(data.encodings.some(encoding => encoding.injectedFailure));
    assert(data.surfaces.filter(surface => surface.managed).every(surface => surface.width === 0 && surface.height === 0));
    result.allocation = data;
    result.limits = 'Tracks declared canvas dimensions, managed export surfaces and PNG URL lifetimes, not total GPU/process or decoded-image memory. A second encoding callback is held for deterministic cancellation coverage; those timings include injected delay and driver overhead, not natural cancellation latency.';
    complete = true;
    return result;
  } finally {
    page.off('download', receive);
    const observations = page.isClosed() ? { unavailable: 'Page closed before audit capture' }
      : await page.evaluate(() => window.readDenseExport());
    await writeFile(join(output, 'dense-export-audit.json'), JSON.stringify({
      source: process.env.QA_SOURCE_SHA ?? process.env.GITHUB_SHA ?? 'working tree',
      outcome: complete ? 'completed' : 'incomplete-or-failed', result, observations,
    }, null, 2));
    try {
      if (!complete) {
        for (const [index, download] of pngs.entries()) {
          await download.saveAs(join(output, `unverified-download-${index + 1}.png`));
        }
      }
    } finally {
      if (!page.isClosed()) await page.evaluate(abort => window.restoreDenseExport(abort), !complete);
    }
  }
}
