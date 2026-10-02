import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { expect } from 'playwright/test';
import { startLocalPublisher } from './local.ts';
import { TestGitProvider } from './gitProvider.ts';
import { createPublisherFixture } from './fixture.browser.mjs';

assert(process.env.QA_OUTPUT, 'Set QA_OUTPUT to a fresh simulation browser evidence directory.');
const output = resolve(process.env.QA_OUTPUT);
mkdirSync(output);
const results = [];
const gate = () => {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
};

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  const directory = join(output, engine); mkdirSync(directory);
  const receiptPath = join(directory, 'operations.sqlite');
  const provider = new TestGitProvider();
  const serverErrors = [];
  let server = await startLocalPublisher({ receiptPath, provider, onError: error => serverErrors.push(error) });
  let browser, page, deadline;
  const errors = [], external = [], requests = [];
  try {
    browser = await browserType.launch({ headless: true });
    deadline = setTimeout(() => { void browser.close(); }, 120_000);
    const fixture = await createPublisherFixture(browser, server.url, directory, engine);
    const upload = { name: 'LOCAL_ONLY_CREATOR_FILE.zip', mimeType: 'application/zip', buffer: Buffer.from(fixture.bytes) };
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== server.origin || !['http:', 'blob:'].includes(url.protocol)) {
        external.push(url.href); return route.abort();
      }
      return route.continue();
    });
    page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/publisher/api/')) return;
      const body = request.postDataBuffer();
      requests.push({ path: url.pathname, method: request.method(),
        bytes: body?.length ?? 0, ...(body ? { sha256: createHash('sha256').update(body).digest('hex') } : {}) });
    });
    const login = async () => {
      await page.goto(server.url);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Simulate GitHub sign-in', exact: true }).click();
      await page.getByRole('button', { name: 'Allow simulated sign-in', exact: true }).click();
      await expect(page.locator('#package-file')).toBeEnabled();
    };
    const disconnect = async () => {
      await page.getByRole('button', { name: 'Disconnect simulated account', exact: true }).click();
      await expect(page.locator('#signin')).toBeVisible();
      await expect(page.locator('#signin')).toBeEnabled();
    };
    const review = async () => {
      await page.getByRole('button', { name: 'List simulated repositories', exact: true }).click();
      await page.getByLabel('Simulated destination', { exact: true }).selectOption('2001');
      await page.getByLabel('Creator ZIP', { exact: true }).setInputFiles(upload);
      await expect(page.locator('#package-status')).toContainText('Inspected locally');
      await page.getByRole('button', { name: 'Review simulated destination', exact: true }).click();
      await expect(page.locator('#simulate')).toBeDisabled();
      await page.locator('#validate-consent').check();
      await page.getByRole('button', { name: 'Validate ZIP on local server', exact: true }).click();
      await expect(page.locator('#validation-status')).toContainText('native image checks passed', { timeout: 15_000 });
      await expect(page.locator('#simulate')).toBeDisabled();
    };
    await login(); await review();
    assert.equal(provider.writes.length, 0);
    assert.equal(requests.filter(request => request.path.endsWith('/simulate')).length, 0);
    await page.locator('#simulate-consent').check();
    provider.dropResponseAfter = 'branch';
    await page.getByRole('button', { name: 'Simulate publication', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.receipt[data-phase="outcome-unknown"]')).toHaveCount(1, { timeout: 15_000 });
    await expect(page.locator('#publish')).toBeDisabled();
    const receiptId = await page.locator('.receipt').getAttribute('data-operation');
    assert.equal(provider.writes.filter(kind => kind === 'branch').length, 1);
    const firstWrites = [...provider.writes];
    await page.getByRole('button', { name: 'Reconcile saved receipt (reads only)', exact: true }).click();
    await expect(page.locator('#message')).toContainText('Read-only reconciliation finished');
    await expect(page.locator('.receipt[data-phase="branch-verified"]')).toHaveCount(1);
    assert.deepEqual(provider.writes, firstWrites);
    const [branch, sha] = [...provider.branches.entries()].find(([name]) => name !== 'main');
    provider.branches.set(branch, 'f'.repeat(40));
    await page.getByRole('button', { name: 'Reconcile saved receipt (reads only)', exact: true }).click();
    await expect(page.locator('.receipt[data-phase="conflict"]')).toHaveCount(1);
    provider.branches.set(branch, sha);
    await page.getByRole('button', { name: 'Reconcile saved receipt (reads only)', exact: true }).click();
    await expect(page.locator('.receipt[data-phase="branch-verified"]')).toHaveCount(1);
    assert.deepEqual(provider.writes, firstWrites);
    await page.reload();
    await expect(page.locator('#package-status')).toHaveText('No package selected.');
    await page.getByRole('button', { name: 'Refresh saved receipts', exact: true }).click();
    await expect(page.locator('.receipt')).toHaveAttribute('data-operation', receiptId);
    await review();
    await page.locator('#simulate-consent').check();
    await page.getByRole('button', { name: 'Simulate publication', exact: true }).click();
    await expect(page.locator('#message')).toContainText('Simulation request settled');
    assert.deepEqual(provider.writes, firstWrites, 'A duplicate confirmation must not repeat fake writes');
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: join(directory, 'verified-390.png'), fullPage: true });
    await disconnect();
    await expect(page.locator('#operation-list')).toBeEmpty();
    provider.user = { id: 1002, login: 'other-fixture' };
    await login();
    await page.getByRole('button', { name: 'Refresh saved receipts', exact: true }).click();
    await expect(page.locator('#operation-progress')).toContainText('No saved receipts');
    const wrongOwner = await page.evaluate(async id => {
      const response = await fetch('/publisher/api/operations/' + id);
      return response.status;
    }, receiptId);
    assert.equal(wrongOwner, 404);
    await disconnect();
    provider.user = { id: 1001, login: 'fixture-creator' };

    const port = Number(new URL(server.origin).port);
    await server.close();
    server = await startLocalPublisher({ port, receiptPath, provider, onError: error => serverErrors.push(error) });
    await login();
    await page.getByRole('button', { name: 'Refresh saved receipts', exact: true }).click();
    await expect(page.locator('.receipt')).toHaveAttribute('data-operation', receiptId);
    await page.getByRole('button', { name: 'Reconcile saved receipt (reads only)', exact: true }).click();
    await expect(page.locator('#message')).toContainText('Read-only reconciliation finished');
    assert.deepEqual(provider.writes, firstWrites);

    // A second isolated account uses the same package identity without bypassing duplicate prevention.
    await disconnect();
    provider.user = { id: 1003, login: 'cancel-fixture' };
    await login();
    await review();
    const started = gate(), finish = gate();
    provider.afterWrite = async kind => { if (kind === 'blob') { started.release(); await finish.promise; } };
    await page.locator('#simulate-consent').check();
    await page.getByRole('button', { name: 'Simulate publication', exact: true }).click();
    await started.promise;
    await page.getByRole('button', { name: 'Refresh saved receipts', exact: true }).click();
    await expect(page.locator('.receipt[data-phase="writing"]')).toHaveCount(1);
    await page.getByRole('button', { name: "Cancel this session's simulation", exact: true }).click();
    await expect(page.locator('#message')).toContainText('Request cancelled');
    provider.afterWrite = undefined; finish.release();
    await page.getByRole('button', { name: 'Refresh saved receipts', exact: true }).click();
    await expect(page.locator('.receipt[data-phase="outcome-unknown"]')).toHaveCount(1);
    await page.screenshot({ path: join(directory, 'unknown-390.png'), fullPage: true });
    const beforeReconcile = [...provider.writes];
    await page.getByRole('button', { name: 'Reconcile saved receipt (reads only)', exact: true }).click();
    await expect(page.locator('#message')).toContainText('Read-only reconciliation finished');
    await expect(page.locator('.receipt[data-phase="outcome-unknown"]')).toHaveCount(1);
    assert.deepEqual(provider.writes, beforeReconcile);

    await disconnect();
    await server.close();
    // A true local composition restart loses fake remote objects. Never invent successful recovery.
    server = await startLocalPublisher({ port, receiptPath, onError: error => serverErrors.push(error) });
    await login();
    await page.getByRole('button', { name: 'Refresh saved receipts', exact: true }).click();
    await expect(page.locator('.receipt')).toHaveAttribute('data-operation', receiptId);
    await page.getByRole('button', { name: 'Reconcile saved receipt (reads only)', exact: true }).click();
    await expect(page.locator('#message')).toContainText('Read-only reconciliation finished');
    await expect(page.locator('.receipt[data-phase="outcome-unknown"]')).toHaveCount(1);
    assert.deepEqual(server.provider.writes, []);
    assert.deepEqual(await page.evaluate(async () => ({
      local: localStorage.length, session: sessionStorage.length, databases: (await indexedDB.databases()).length,
    })), { local: 0, session: 0, databases: 0 });
    assert.deepEqual(external, []); assert.deepEqual(errors, []); assert.deepEqual(serverErrors, []);
    for (const request of requests.filter(item => item.path.endsWith('/simulate'))) {
      assert(request.bytes > 0);
      assert.equal(request.sha256, fixture.metadata.packageSha256);
    }
    results.push({ engine, version: browser.version(), consentRequired: true, keyboardSimulation: true,
      exactZipSubmission: true, verifiedReadback: true, duplicateWritesPrevented: true, reloadRecovery: true,
      accountIsolation: true, restartFreshSignIn: true, retainedProviderRecovery: true,
      lostResponseNotSuccess: true, conflictVisible: true,
      discardedProviderStaysUnknown: true, cancellation: 'Fake blob response held until user cancellation; accepted object retained, no undo claim',
      progressVisible: true, reconciliationReadOnly: true, noBrowserPersistence: true, externalRequests: 0 });
    writeFileSync(join(directory, 'requests.json'), JSON.stringify(requests, null, 2));
    await context.close();
  } catch (error) {
    if (page && !page.isClosed()) await page.screenshot({ path: join(directory, 'failure.png'), fullPage: true });
    writeFileSync(join(directory, 'failure.json'), JSON.stringify({ message: error.message, stack: error.stack, errors, external }, null, 2));
    throw error;
  } finally {
    clearTimeout(deadline);
    if (browser) await browser.close();
    await server.close();
  }
}
const files = ['publisher/client/client.mjs', 'publisher/client/index.html', 'publisher/client/style.css',
  'publisher/src/app.ts', 'publisher/src/publication.ts', 'publisher/src/operationStore.ts', 'publisher/src/static.ts',
  'publisher/test/local.ts', 'publisher/test/gitProvider.ts', 'publisher/test/publication.browser.mjs',
  'publisher/test/fixture.browser.mjs', 'publisher/test/package-fixture.browser.mjs', 'publisher/dist/index.html',
  ...readdirSync('publisher/dist/assets').map(name => 'publisher/dist/assets/' + name)];
writeFileSync(join(output, 'receipt.json'), JSON.stringify({ observedAt: new Date().toISOString(), results,
  sourceFiles: files.map(path => ({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') })),
  realGitHubWrites: 0, hostedRuns: 0, productionQualified: false }, null, 2));
console.log(JSON.stringify(results, null, 2));
