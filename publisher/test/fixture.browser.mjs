import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { build } from 'vite';
import { zipSync } from 'fflate';

const fixtureBuild = await build({
  configFile: false, publicDir: false, logLevel: 'warn',
  build: { write: false, minify: false, lib: {
    entry: resolve('publisher/test/package-fixture.browser.mjs'), formats: ['iife'], name: 'PublisherFixture',
  } },
});
assert(!Array.isArray(fixtureBuild) || fixtureBuild.length === 1);
const fixtureOutput = Array.isArray(fixtureBuild) ? fixtureBuild[0] : fixtureBuild;
assert('output' in fixtureOutput);
const fixtureChunk = fixtureOutput.output.find(item => item.type === 'chunk' && item.isEntry);
assert(fixtureChunk);

export async function createPublisherFixture(browser, url, output, engine) {
  const context = await browser.newContext();
  const consoleErrors = [];
  try {
    const origin = new URL(url).origin;
    await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
    const page = await context.newPage();
    page.on('console', entry => { if (entry.type() === 'error') consoleErrors.push(entry.text()); });
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.evaluate(fixtureChunk.code);
    const prepared = await page.evaluate(() => window.PublisherFixture.generate());
    const files = Object.fromEntries(prepared.files.map(file =>
      [`maps/${prepared.packageId}/${file.path}`, Uint8Array.from(file.bytes)]));
    // Only the small synthetic test ZIP is compressed in Node, outside the publisher CSP.
    const bytes = zipSync(files, { level: 6, mtime: new Date(1980, 0, 1) });
    assert.deepEqual(consoleErrors, []);
    return { bytes, metadata: {
      packageId: prepared.packageId, contentVersion: prepared.contentVersion,
      packageSha256: createHash('sha256').update(bytes).digest('hex'), zipBytes: bytes.length,
      expandedBytes: prepared.files.reduce((sum, file) => sum + file.bytes.length, 0), memberCount: prepared.files.length,
    } };
  } finally {
    writeFileSync(join(output, `${engine}-fixture-console.json`), JSON.stringify(consoleErrors, null, 2));
    await context.close();
  }
}
