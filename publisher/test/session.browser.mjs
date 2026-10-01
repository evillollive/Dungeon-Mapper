import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { expect } from 'playwright/test';
import { startLocalPublisher } from './local.ts';
import { BASE, COOKIE } from '../src/app.ts';
import { createPublisherFixture } from './fixture.browser.mjs';
import { CREATOR_PACKAGE_LIMITS } from '../../src/utils/creatorPackageContract.ts';

assert(process.env.QA_OUTPUT, 'Set QA_OUTPUT to a new prototype evidence directory.');
const output = resolve(process.env.QA_OUTPUT);
mkdirSync(output);
const results = [];

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  const serverErrors = [];
  const server = await startLocalPublisher({ onError: error => serverErrors.push(error) });
  let browser;
  let page;
  let deadline;
  let deadlineExpired = false;
  try {
    browser = await browserType.launch({ headless: true });
    deadline = setTimeout(() => { deadlineExpired = true; void browser.close(); }, 90_000);
    console.log(`${engine}: generating synthetic package with the real package builder`);
    const fixture = await createPublisherFixture(browser, server.url, output, engine);
    console.log(`${engine}: running simulated publisher journey`);
    const upload = { name: 'LOCAL_FILENAME_DO_NOT_TRANSMIT.zip', mimeType: 'application/zip', buffer: Buffer.from(fixture.bytes) };
    writeFileSync(join(output, `${engine}-synthetic-package.zip`), upload.buffer);
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const requests = [], errors = [], responses = [], callbacks = [], posts = [];
    await context.exposeBinding('recordPublisherResponse', (_source, body) => {
      assert.equal(typeof body, 'string');
      responses.push(body);
    });
    await context.addInitScript(() => {
      const original = window.fetch.bind(window);
      window.fetch = async (...args) => {
        const response = await original(...args);
        if (response.url.startsWith(location.origin + '/publisher/api/')) {
          await window.recordPublisherResponse(await response.clone().text());
        }
        return response;
      };
    });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (!route.request().url().startsWith(server.origin + '/') && !(url.protocol === 'blob:' && url.origin === server.origin)) {
        requests.push(route.request().url());
        return route.abort();
      }
      return route.continue();
    });
    page = await context.newPage();
    await page.clock.install();
    page.setDefaultTimeout(15_000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      const url = new URL(request.url());
      if (request.method() === 'POST') {
        const zip = request.headers()['content-type'] === 'application/zip';
        const bytes = request.postDataBuffer();
        posts.push({ path: url.pathname, body: zip ? undefined : request.postData(),
          ...(zip ? { zip: true, bytes: bytes?.length, sha256: createHash('sha256').update(bytes).digest('hex') } : {}) });
      }
      if (url.pathname === BASE + 'auth/callback' && url.searchParams.has('code')) callbacks.push(url.href);
    });
    await page.goto(server.url);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Simulate GitHub sign-in', exact: true })).toBeEnabled();
    await expect(page.getByText(/Simulated provider only/)).toBeVisible();
    await expect(page.locator('#package-section')).toBeHidden();
    await expect(page.locator('#package-file')).toBeDisabled();
    assert.deepEqual(await page.evaluate(async () => ({
      local: localStorage.length, session: sessionStorage.length, databases: (await indexedDB.databases()).length,
    })), { local: 0, session: 0, databases: 0 });
    assert.equal(await page.evaluate(() => document.cookie), '', 'The synthetic session cookie must be HttpOnly');
    const before = (await context.cookies(server.url)).find(cookie => cookie.name === COOKIE);
    assert(before?.httpOnly);
    assert.equal(before.path, BASE);
    assert.equal(before.sameSite, 'Lax');
    assert.equal(before.secure, false, 'This probe is HTTP loopback only, not production HTTPS qualification');

    await page.getByRole('button', { name: 'Simulate GitHub sign-in', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Simulated authorization', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Deny simulated sign-in', exact: true }).click();
    await expect(page.getByText(/Simulated authorization was declined/)).toBeVisible();
    assert.equal(page.url(), server.url);
    await page.getByRole('button', { name: 'Simulate GitHub sign-in', exact: true }).click();
    await page.getByRole('button', { name: 'Allow simulated sign-in', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status').filter({ hasText: /Simulated account: fixture-creator/ })).toBeVisible();
    assert.equal(page.url(), server.url, 'OAuth callback query parameters must be removed');
    const authenticated = (await context.cookies(server.url)).find(cookie => cookie.name === COOKIE);
    assert.notEqual(authenticated.value, before.value);
    assert.equal(await page.evaluate(() => document.cookie), '');
    await page.getByRole('button', { name: 'List simulated repositories', exact: true }).click();
    await expect(page.getByRole('listitem')).toHaveText('fixture-creator/synthetic-maps: simulated write access');
    await page.getByLabel('Simulated destination', { exact: true }).selectOption('2001');
    const beforeFile = posts.length;
    await page.getByLabel('Creator ZIP', { exact: true }).setInputFiles(upload);
    await expect(page.locator('#package-status')).toContainText('Inspected locally');
    await expect(page.locator('#package-summary')).toContainText('Publisher local review fixture');
    await expect(page.locator('#package-summary')).toContainText('encounter');
    await expect(page.locator('#package-previews img')).toHaveCount(2);
    assert(await page.locator('#package-previews img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)));
    assert.equal(posts.length, beforeFile, 'File selection must not submit any request');
    await page.getByRole('button', { name: 'Review simulated destination', exact: true }).click();
    await expect(page.locator('#plan-detail')).toBeVisible();
    await expect(page.locator('#plan-summary')).toContainText(fixture.metadata.packageSha256);
    await expect(page.locator('#plan-summary')).toContainText('a'.repeat(40));
    await expect(page.getByRole('button', { name: 'Publish package to GitHub (not implemented)', exact: true })).toBeDisabled();
    await expect(page.locator('#simulation-confirmation')).toBeHidden();
    await page.getByRole('button', { name: 'Recheck simulated destination', exact: true }).click();
    await expect(page.locator('#message')).toContainText('still matches');
    server.provider.repositoryState.headSha = 'c'.repeat(40);
    await page.getByRole('button', { name: 'Recheck simulated destination', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('changed');
    await expect(page.locator('#plan-detail')).toBeHidden();
    await page.getByRole('button', { name: 'Review simulated destination', exact: true }).click();
    await expect(page.locator('#plan-summary')).toContainText('c'.repeat(40));
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: join(output, `${engine}-destination-390.png`), fullPage: true });
    await page.getByLabel('Simulated destination', { exact: true }).selectOption('');
    await expect(page.locator('#plan-detail')).toBeHidden();
    await page.getByLabel('Simulated destination', { exact: true }).selectOption('2001');
    const beforeInvalid = posts.length;
    await page.evaluate(() => { window.oldFixturePreview = document.querySelector('#package-previews img'); });
    await page.getByLabel('Creator ZIP', { exact: true }).setInputFiles({
      name: 'not-a-creator.zip', mimeType: 'application/zip', buffer: Buffer.from('{"privateProject":"DO_NOT_SEND"}'),
    });
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.locator('#package-detail')).toBeHidden();
    await expect(page.locator('#plan')).toBeDisabled();
    assert.equal(posts.length, beforeInvalid);
    await page.evaluate(() => {
      const original = File.prototype.arrayBuffer;
      window.fixtureFileReads = 0;
      window.restoreFixtureFileRead = () => { File.prototype.arrayBuffer = original; };
      File.prototype.arrayBuffer = function () { window.fixtureFileReads++; return original.call(this); };
    });
    await page.getByLabel('Creator ZIP', { exact: true }).setInputFiles({
      name: 'oversized.zip', mimeType: 'application/zip', buffer: Buffer.alloc(CREATOR_PACKAGE_LIMITS.zipBytes + 1),
    });
    await expect(page.getByRole('alert')).toContainText('32 MiB');
    assert.equal(await page.evaluate(() => window.fixtureFileReads), 0);
    await page.getByLabel('Creator ZIP', { exact: true }).setInputFiles({
      name: 'at-limit-invalid.zip', mimeType: 'application/zip', buffer: Buffer.alloc(CREATOR_PACKAGE_LIMITS.zipBytes),
    });
    await expect(page.getByRole('alert')).toContainText('Cannot import this creator ZIP');
    assert.equal(await page.evaluate(() => window.fixtureFileReads), 1);
    await page.evaluate(() => window.restoreFixtureFileRead());
    assert.equal(posts.length, beforeInvalid);
    await page.evaluate(() => {
      const original = File.prototype.arrayBuffer;
      File.prototype.arrayBuffer = async function () {
        const bytes = await original.call(this);
        await new Promise(resolve => { window.releaseFixtureRead = resolve; });
        File.prototype.arrayBuffer = original;
        return bytes;
      };
    });
    await page.getByLabel('Creator ZIP', { exact: true }).setInputFiles(upload);
    await page.waitForFunction(() => typeof window.releaseFixtureRead === 'function');
    await page.getByRole('button', { name: 'Cancel current request', exact: true }).click();
    await expect(page.locator('#package-file')).toBeDisabled();
    await page.evaluate(() => window.releaseFixtureRead());
    await expect(page.locator('#message')).toContainText('Request cancelled');
    await expect(page.locator('#package-status')).toHaveText('No package selected.');
    await expect(page.locator('#package-file')).toBeEnabled();
    await page.getByLabel('Creator ZIP', { exact: true }).setInputFiles(upload);
    await expect(page.locator('#package-status')).toContainText('Inspected locally');
    await page.evaluate(() => window.oldFixturePreview.dispatchEvent(new Event('error')));
    await expect(page.locator('#package-status')).toContainText('Inspected locally');
    await expect(page.locator('#package-previews img')).toHaveCount(2);
    await page.getByRole('button', { name: 'Review simulated destination', exact: true }).click();
    await expect(page.locator('#plan-detail')).toBeVisible();
    const planned = posts.filter(item => item.path === BASE + 'api/plans');
    assert.equal(planned.length, 3);
    for (const request of planned) assert.deepEqual(JSON.parse(request.body), { repositoryId: 2001, package: fixture.metadata });
    for (const request of posts) for (const text of [
      'PUBLISHER_LOCAL_DM_NOTE_DO_NOT_TRANSMIT', upload.name, 'Publisher local review fixture',
      'Synthetic fixture author', 'data:image', 'DO_NOT_SEND',
    ]) assert(!request.body?.includes(text), `Non-metadata package material reached the server: ${text}`);
    assert.equal(posts.filter(item => item.zip).length, 0, 'Package selection and destination planning must not upload ZIP contents');
    await expect(page.getByRole('button', { name: 'Validate ZIP on local server', exact: true })).toBeDisabled();
    await page.locator('#validate-consent').check();
    await page.getByRole('button', { name: 'Validate ZIP on local server', exact: true }).click();
    await expect(page.locator('#validation-status')).toContainText('native image checks passed', { timeout: 15_000 });
    await expect(page.locator('#plan-title')).toHaveText('Destination plan: server-validated package');
    await expect(page.locator('#validate')).toBeDisabled();
    const submitted = posts.filter(item => item.zip);
    assert.equal(submitted.length, 1);
    assert.equal(submitted[0].sha256, fixture.metadata.packageSha256);
    assert.equal(submitted[0].bytes, fixture.metadata.zipBytes);
    await page.getByRole('button', { name: 'Recheck simulated destination', exact: true }).click();
    await expect(page.locator('#message')).toContainText('still matches');
    await expect(page.locator('#validation-status')).toContainText('native image checks passed');
    await page.screenshot({ path: join(output, `${engine}-server-validation-390.png`), fullPage: true });

    const probe = async (metadata, changeAfterValidation = false) => {
      const prepared = await page.evaluate(async metadata => {
        const session = await (await fetch('/publisher/api/session')).json();
        const response = await fetch('/publisher/api/plans', { method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Publisher-CSRF': session.csrf },
          body: JSON.stringify({ repositoryId: 2001, package: metadata }) });
        return { csrf: session.csrf, plan: await response.json() };
      }, metadata);
      const original = server.provider.repository.bind(server.provider);
      let reads = 0;
      if (changeAfterValidation) server.provider.repository = async (...args) => {
        const repository = await original(...args);
        return ++reads === 2 ? { ...repository, headSha: 'e'.repeat(40) } : repository;
      };
      try {
        const result = await page.evaluate(async ({ prepared, bytes }) => {
          const response = await fetch(`/publisher/api/plans/${prepared.plan.id}/validate`, {
            method: 'POST', headers: { 'Content-Type': 'application/zip', 'X-Publisher-CSRF': prepared.csrf },
            body: Uint8Array.from(bytes),
          });
          const lookup = await fetch(`/publisher/api/plans/${prepared.plan.id}`);
          return { status: response.status, body: await response.json(), lookup: lookup.status };
        }, { prepared, bytes: Array.from(fixture.bytes) });
        if (changeAfterValidation) assert.equal(reads, 2, 'Destination must be checked before and after native validation');
        assert.equal(result.status, 409);
        assert.equal(result.lookup, 404);
        return result.body.error;
      } finally { server.provider.repository = original; }
    };
    assert.equal(await probe({ ...fixture.metadata, memberCount: fixture.metadata.memberCount + 1 }), 'package_metadata_changed');
    assert.equal(await probe(fixture.metadata, true), 'destination_changed');
    const tokens = server.provider.tokensForTest();
    assert.equal(tokens.length, 1);
    for (const body of responses) assert(!body.includes(tokens[0]), 'A provider token reached the browser');
    assert(!(await page.content()).includes(tokens[0]));
    assert(!JSON.stringify(serverErrors).includes(tokens[0]));
    const rejected = await page.evaluate(async () => {
      const response = await fetch('/publisher/api/disconnect', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Publisher-CSRF': 'wrong' }, body: '{}' });
      return response.status;
    });
    assert.equal(rejected, 403);
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: join(output, `${engine}-publisher-390.png`), fullPage: true });

    assert(callbacks.length);
    const replay = await page.goto(callbacks.at(-1));
    assert.equal(replay.status(), 400);
    await expect(page.getByRole('alert')).toContainText('Simulated sign-in failed');
    assert.equal(page.url(), server.url, 'Failed callback query parameters must also be removed');
    await expect(page.getByRole('status').filter({ hasText: /Simulated account: fixture-creator/ })).toBeVisible();
    await expect(page.locator('#package-status')).toHaveText('No package selected.');
    await expect(page.locator('#plan-detail')).toBeHidden();
    assert.equal((await context.cookies(server.url)).find(cookie => cookie.name === COOKIE).value, authenticated.value);
    await page.getByRole('button', { name: 'Disconnect simulated account', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /Simulated account disconnected/ })).toBeVisible();
    assert.equal(server.provider.tokensForTest().length, 0);
    await expect(page.getByRole('button', { name: 'Simulate GitHub sign-in', exact: true })).toBeEnabled();

    server.provider.user = { id: 1002, login: 'second-fixture-user' };
    await page.getByRole('button', { name: 'Simulate GitHub sign-in', exact: true }).click();
    await page.getByRole('button', { name: 'Allow simulated sign-in', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /Simulated account: second-fixture-user/ })).toBeVisible();
    await page.getByRole('button', { name: 'List simulated repositories', exact: true }).click();
    await expect(page.getByRole('listitem')).toContainText('second-fixture-user/synthetic-maps');
    await page.getByLabel('Creator ZIP', { exact: true }).setInputFiles(upload);
    await expect(page.locator('#package-status')).toContainText('Inspected locally');
    const secondToken = server.provider.tokensForTest()[0];
    tokens.push(secondToken);
    await server.provider.revoke(secondToken, new AbortController().signal);
    await page.getByRole('button', { name: 'List simulated repositories', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('revoked');
    await expect(page.getByRole('listitem')).toHaveCount(0);
    await expect(page.locator('#package-detail')).toBeHidden();
    await expect(page.locator('#package-notices')).toBeEmpty();
    await page.getByRole('button', { name: 'Refresh session', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Simulate GitHub sign-in', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Simulate GitHub sign-in', exact: true }).click();
    await page.getByRole('button', { name: 'Allow simulated sign-in', exact: true }).click();
    await expect(page.locator('#package-file')).toBeEnabled();
    tokens.push(server.provider.tokensForTest()[0]);
    await page.getByLabel('Creator ZIP', { exact: true }).setInputFiles(upload);
    await expect(page.locator('#package-status')).toContainText('Inspected locally');
    await page.clock.fastForward(60 * 60_000 + 10_000);
    await expect(page.locator('#connection')).toContainText('session expired');
    await expect(page.locator('#package-section')).toBeHidden();
    await expect(page.locator('#package-status')).toHaveText('No package selected.');
    await expect(page.locator('#package-summary')).toBeEmpty();
    await expect(page.locator('#package-notices')).toBeEmpty();
    await expect(page.locator('#package-previews img')).toHaveCount(0);
    assert.deepEqual(await page.evaluate(async () => ({
      local: localStorage.length, session: sessionStorage.length, databases: (await indexedDB.databases()).length,
    })), { local: 0, session: 0, databases: 0 });
    assert.deepEqual(requests, []);
    assert.deepEqual(errors, []);
    assert.deepEqual(serverErrors, []);
    for (const body of responses) for (const accessToken of tokens) assert(!body.includes(accessToken), 'A provider token reached the browser');
    results.push({ engine, browser: browser.version(), simulatedProvider: true, externalRequests: 0,
      denial: true, keyboardSignIn: true, sessionRotation: true, csrfRejection: true, callbackReplayRejected: true,
      cleanCallbackAddress: true, disconnect: true, accountChange: true, revocation: true,
      localPackageInspection: true, actualPreviews: 2, metadataOnlyPlans: planned.length,
      changedBaseRejected: true, destinationReset: true, invalidPackageRejected: true,
      stalePreviewFailureIgnored: true,
      zipLimit: { exactBoundaryRead: true, aboveBoundaryRejectedBeforeRead: true },
      clientExpiry: 'Browser clock advanced to test memory/UI cleanup; server expiry is covered separately by HTTP tests',
      cancellation: 'Native File.arrayBuffer completion deliberately held, then released; no timing qualification',
      fixtureMetadata: fixture.metadata, noAutomaticZipSubmission: true,
      explicitUiZipSubmissions: 1, directAdversarialZipSubmissions: 2,
      independentNativeValidation: true, fabricatedMetadataRejected: true, postValidationBaseChangeRejected: true,
      noBrowserTokenOrMapStorage: true, cookie: { httpOnly: true, sameSite: 'Lax', path: BASE, secure: false } });
    writeFileSync(join(output, `${engine}-result.json`), JSON.stringify(results.at(-1), null, 2));
    await context.close();
  } catch (error) {
    if (page && !page.isClosed()) await page.screenshot({ path: join(output, `${engine}-failure.png`), fullPage: true, timeout: 5000 });
    writeFileSync(join(output, `${engine}-failure.json`), JSON.stringify({ message: error.message, stack: error.stack, deadlineExpired }, null, 2));
    throw error;
  } finally {
    clearTimeout(deadline);
    if (browser) await browser.close();
    await server.close();
  }
}
const files = ['publisher/src/app.ts', 'publisher/src/provider.ts', 'publisher/src/plans.ts', 'publisher/src/static.ts', 'publisher/test/local.ts',
  'publisher/test/provider.ts', 'publisher/client/client.mjs', 'publisher/client/index.html',
  'publisher/client/style.css', 'publisher/client/package-review.mjs', 'publisher/test/session.browser.mjs',
  'publisher/test/package-fixture.browser.mjs', 'publisher/test/fixture.browser.mjs', 'src/utils/creatorPackageContract.ts',
  'src/utils/creatorAssets.ts', 'src/utils/creatorPackageImport.ts', 'publisher/src/validation.ts',
  'publisher/validator/worker.mjs', 'publisher/validator/inspect.ts', 'publisher/validator/dist/inspect.js',
  'publisher/package.json', 'publisher/package-lock.json',
  'publisher/dist/index.html', 'publisher/dist/.vite/manifest.json',
  ...readdirSync('publisher/dist/assets').map(name => 'publisher/dist/assets/' + name)];
writeFileSync(join(output, 'receipt.json'), JSON.stringify({
  observedAt: new Date().toISOString(), scope: 'Loopback HTTP and simulated provider only; no production TLS or real GitHub qualification',
  responseCapture: 'Native fetch responses cloned and recorded before client navigation; no latency claims',
  files: files.map(path => ({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') })),
  results, hostedTriggers: 0, localZipSubmissions: 9, githubUploads: 0, productionServiceCreated: false,
}, null, 2));
console.log(JSON.stringify(results, null, 2));
