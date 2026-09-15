import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'vite';
import { test } from 'playwright/test';
import { downloadExportText } from './exportJourney.mjs';

test('launch art print companion geometry, page seams and review sheets', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const bundle = await build({
    configFile: false, logLevel: 'error',
    build: { write: false, minify: false, lib: { entry: resolve('src/test/launchArt.render.ts'), formats: ['es'] } },
  });
  const outputs = Array.isArray(bundle) ? bundle : [bundle];
  assert(outputs.length === 1 && 'output' in outputs[0]);
  const entry = outputs[0].output.find(chunk => chunk.type === 'chunk' && chunk.isEntry);
  assert(entry && entry.imports.length === 0 && entry.dynamicImports.length === 0);
  await page.setViewportSize({ width: 1320, height: 1000 });
  await page.setContent('<title>Launch artwork</title>');
  const result = await page.evaluate(async source => {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
      const harness = await import(url);
      const result = await harness.compareLaunchArt();
      harness.showLaunchArt();
      await Promise.all(Array.from(document.images, image => image.decode()));
      return result;
    } finally { URL.revokeObjectURL(url); }
  }, entry.code);
  await info.attach('launch-art-results', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  for (const id of ['companions', 'launch-lantern-crypt', 'launch-alder-crossing', 'launch-kestrel-bay', 'paper', 'tactical']) {
    await page.locator(`#${id}`).screenshot({ path: info.outputPath(`${id}.png`) });
  }
  await writeFile(info.outputPath('review.html'), await page.content());
  // WebKit can round a channel by one on independent native draws/PNG decode.
  // These bounds do not admit the multi-pixel diagonal-stroke clipping defect.
  for (const sample of result.previews) assert(sample.maximum <= 1 && sample.mean < 0.0001, `Unsafe creation preview: ${sample.id}`);
  for (const sample of result.overlaps) assert(sample.maximum <= 1 && sample.mean < 0.005, `Page seam mismatch: ${JSON.stringify(sample)}`);
  for (const sample of result.geometry) assert.equal(sample.coloredPixels, 0, `Non-monochrome print: ${sample.id}`);
  assert.equal(result.shapes.length, 84);
  for (const shape of result.shapes) assert(shape.mean < 2, `SVG/Canvas print geometry: ${JSON.stringify(shape)}`);
  assert.deepEqual(errors, []);
});

const samples = [
  { id: 'launch-lantern-crypt', name: 'The Lantern Crypt', actors: 2, secret: 'brass key' },
  { id: 'launch-alder-crossing', name: 'Alder Crossing', actors: 3, secret: 'wolf waits' },
  { id: 'launch-kestrel-bay', name: 'Kestrel Docking Bay', actors: 3, secret: 'Crew credentials' },
];

for (const sample of samples) test(`launch art ${sample.name} safe preview, editable copies and A4/Letter print`, async ({ page, baseURL }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseURL);
  await page.waitForLoadState('networkidle');
  const saved = () => page.getByText('Saved on this device', { exact: true }).waitFor();
  const openSample = async () => {
    await page.getByRole('button', { name: 'Open a sample', exact: true }).click();
    await page.getByLabel('Ready-to-play sample').selectOption(sample.id);
    await page.getByRole('button', { name: 'Preview map', exact: true }).click();
    const preview = page.getByRole('region', { name: 'Map preview' });
    await preview.getByRole('img').waitFor();
    assert((await preview.innerText()).includes('Player-safe preview'));
    assert(!(await preview.innerText()).includes(sample.secret));
    await page.screenshot({ path: info.outputPath('creation.png') });
    await page.getByRole('button', { name: 'Use this map', exact: true }).click();
    await saved();
  };
  await openSample();
  const firstId = new URL(page.url()).searchParams.get('project');
  assert(firstId);
  const backup = JSON.parse(await downloadExportText(page, 'backup')).project;
  assert(JSON.stringify(backup).includes(sample.secret));
  assert(backup.levels[0].tokens.some(token => token.hidden));
  await page.screenshot({ path: info.outputPath('editor.png') });
  const svg = await downloadExportText(page, 'svg');
  assert(!svg.includes(sample.secret));
  for (const token of backup.levels[0].tokens.filter(token => token.hidden)) assert(!svg.includes(token.label));

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export', exact: true });
  await dialog.getByRole('button', { name: /Print for the table/ }).click();
  await dialog.getByLabel('Audience', { exact: true }).selectOption('player');
  await dialog.getByLabel('Resolution (DPI)').selectOption('300');
  await dialog.getByLabel('Inches per cell').selectOption('0.25');
  await dialog.getByLabel('Ink-friendly map styling').check();
  const files = [];
  for (const pageSize of ['a4', 'letter']) {
    await dialog.getByLabel('Page size').selectOption(pageSize);
    await dialog.getByText('1 image', { exact: true }).waitFor();
    await page.screenshot({ path: info.outputPath(`${pageSize}-planning.png`) });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      dialog.getByRole('button', { name: 'Download page 1', exact: true }).click(),
    ]);
    const chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    assert.equal(bytes.readUInt32BE(16), pageSize === 'a4' ? 2480 : 2550);
    assert.equal(bytes.readUInt32BE(20), pageSize === 'a4' ? 3508 : 3300);
    const physical = bytes.indexOf('pHYs');
    assert(physical > 0); assert.equal(bytes.readUInt32BE(physical + 4), 11811);
    assert.equal(bytes.readUInt32BE(physical + 8), 11811);
    await download.saveAs(info.outputPath(`${pageSize}-300dpi.png`));
    files.push({ pageSize, bytes: bytes.length });
    const colored = await page.evaluate(async data => {
      const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let colored = 0, ink = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] !== pixels[i + 1] || pixels[i + 1] !== pixels[i + 2]) colored++;
        if (pixels[i] < 128) ink++;
      }
      return { colored, ink };
    }, bytes.toString('base64'));
    assert.equal(colored.colored, 0);
    assert(colored.ink > 20_000, 'Printed page must contain real map detail, not a blank fallback');
  }
  await dialog.getByRole('button', { name: 'Close Export', exact: true }).click();
  await page.getByRole('button', { name: 'Player preview', exact: true }).click();
  await page.getByRole('img', { name: new RegExp(`${sample.actors} visible tokens`) }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('.player-map-scroll canvas')?.getBoundingClientRect().width <= 390);
  await page.screenshot({ path: info.outputPath('player-phone.png') });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseURL}?project=${firstId}`); await saved();
  await page.getByRole('button', { name: 'Your maps', exact: true }).click();
  await openSample();
  assert.notEqual(new URL(page.url()).searchParams.get('project'), firstId);
  await page.reload(); await saved();
  const second = JSON.parse(await downloadExportText(page, 'backup')).project;
  assert.deepEqual(second.levels[0].tiles, backup.levels[0].tiles);
  assert.deepEqual(second.levels[0].notes, backup.levels[0].notes);
  assert.deepEqual(second.levels[0].stamps, backup.levels[0].stamps);
  assert.deepEqual(errors, []);
  await info.attach('launch-journey', { body: JSON.stringify({ sample: sample.id, files, independentProjectIds: true }), contentType: 'application/json' });
});
