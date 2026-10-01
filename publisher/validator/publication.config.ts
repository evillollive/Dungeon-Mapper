import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom', include: ['publisher/validator/publication.test.ts'],
    testTimeout: 15_000, hookTimeout: 15_000, fileParallelism: false,
  },
});
