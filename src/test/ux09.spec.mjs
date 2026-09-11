import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { test } from 'playwright/test';
import creation from './ux02Creation.browser.mjs';
import shell from './ux03Shell.browser.mjs';
import audience from './ux05Audience.browser.mjs';
import session from './ux06Session.browser.mjs';

const journeys = [
  ['guided creation and library continuity', creation],
  ['editor navigation, focus and responsive layout', shell],
  ['publication and player-safe preview', audience],
  ['session recovery and two-window player display', session],
];

for (const [name, journey] of journeys) {
  test(name, async ({ page, context, baseURL }, info) => {
    const errors = [];
    const observe = observed => observed.on('pageerror', error => {
      errors.push({ url: observed.url(), message: error.message });
    });
    context.on('page', observe);
    context.pages().forEach(observe);
    const output = info.outputPath('evidence');
    await mkdir(output, { recursive: true });
    try {
      await page.goto(baseURL);
      const result = await journey(page, { output, engine: info.project.name });
      assert.deepEqual(errors, [], 'Unexpected browser errors, including player windows');
      await info.attach('journey-results', {
        body: JSON.stringify({
          journey: name,
          engine: info.project.name,
          browserVersion: context.browser().version(),
          source: process.env.GITHUB_SHA ?? process.env.QA_SOURCE_SHA ?? 'working tree',
          result,
        }, null, 2),
        contentType: 'application/json',
      });
    } finally {
      await info.attach('page-errors', {
        body: JSON.stringify(errors, null, 2), contentType: 'application/json',
      });
    }
  });
}
