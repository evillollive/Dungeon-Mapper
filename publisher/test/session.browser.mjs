import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { expect } from 'playwright/test';
import { startLocalPublisher } from './local.ts';
import { BASE, COOKIE } from '../src/app.ts';

assert(process.env.QA_OUTPUT, 'Set QA_OUTPUT to a new prototype evidence directory.');
const output = resolve(process.env.QA_OUTPUT);
mkdirSync(output);
const results = [];

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  const serverErrors = [];
  const server = await startLocalPublisher({ onError: error => serverErrors.push(error) });
  let browser;
  let page;
  try {
    browser = await browserType.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const requests = [], errors = [], responses = [], callbacks = [];
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
      if (!route.request().url().startsWith(server.origin + '/')) {
        requests.push(route.request().url());
        return route.abort();
      }
      return route.continue();
    });
    page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === BASE + 'auth/callback' && url.searchParams.has('code')) callbacks.push(url.href);
    });
    await page.goto(server.url);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Simulate GitHub sign-in', exact: true })).toBeEnabled();
    await expect(page.getByText(/Simulated provider only/)).toBeVisible();
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
    const secondToken = server.provider.tokensForTest()[0];
    tokens.push(secondToken);
    await server.provider.revoke(secondToken, new AbortController().signal);
    await page.getByRole('button', { name: 'List simulated repositories', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('revoked');
    await expect(page.getByRole('listitem')).toHaveCount(0);
    await page.getByRole('button', { name: 'Refresh session', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Simulate GitHub sign-in', exact: true })).toBeEnabled();
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
      noBrowserTokenOrMapStorage: true, cookie: { httpOnly: true, sameSite: 'Lax', path: BASE, secure: false } });
    await context.close();
  } catch (error) {
    if (page) await page.screenshot({ path: join(output, `${engine}-failure.png`), fullPage: true });
    writeFileSync(join(output, `${engine}-failure.json`), JSON.stringify({ message: error.message, stack: error.stack }, null, 2));
    throw error;
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}
const files = ['publisher/src/app.ts', 'publisher/src/provider.ts', 'publisher/test/local.ts',
  'publisher/test/provider.ts', 'publisher/client/client.mjs', 'publisher/client/index.html',
  'publisher/client/style.css', 'publisher/test/session.browser.mjs'];
writeFileSync(join(output, 'receipt.json'), JSON.stringify({
  observedAt: new Date().toISOString(), scope: 'Loopback HTTP and simulated provider only; no production TLS or real GitHub qualification',
  responseCapture: 'Native fetch responses cloned and recorded before client navigation; no latency claims',
  files: files.map(path => ({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') })),
  results, hostedTriggers: 0, mapsUploaded: 0, productionServiceCreated: false,
}, null, 2));
console.log(JSON.stringify(results, null, 2));
