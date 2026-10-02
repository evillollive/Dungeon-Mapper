import { defineConfig } from 'playwright/test';
import config from './playwright.config.mjs';

// Manual two-build rehearsal; the required CI suite and its policy are unchanged.
export default defineConfig({
  ...config,
  testMatch: ['ux09Upgrade.spec.mjs'],
  webServer: [],
});
