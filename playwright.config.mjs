import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { defineConfig } from 'playwright/test';

assert(process.env.QA_OUTPUT, 'Set QA_OUTPUT to a dedicated qualification artifact directory.');
const output = resolve(process.env.QA_OUTPUT);
const port = Number(process.env.QA_PORT ?? 5309);
assert(Number.isInteger(port) && port > 0 && port <= 65535, 'QA_PORT must be a valid TCP port.');
const baseURL = `http://127.0.0.1:${port}/Dungeon-Mapper/`;

export default defineConfig({
  testDir: './src/test',
  testMatch: ['ux09.spec.mjs', 'ux09Performance.spec.mjs', 'ux09EdgeBlend.spec.mjs'],
  outputDir: join(output, 'browser-results'),
  reporter: [
    ['list'],
    ['json', { outputFile: join(output, 'browser-report.json') }],
    ['html', { outputFolder: join(output, 'browser-report'), open: 'never' }],
  ],
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 180_000,
  globalTimeout: 20 * 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
  },
  projects: ['chromium', 'firefox', 'webkit'].map(browserName => ({
    name: browserName,
    use: { browserName },
  })),
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
  },
});
