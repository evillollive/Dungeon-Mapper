import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: [
      'playwright.config.mjs',
      'src/test/ux09.spec.mjs',
      'src/test/ux09Keyboard.browser.mjs',
      'src/test/ux09Performance.spec.mjs',
      'src/test/ux09EdgeBlend.spec.mjs',
      'src/test/denseMapFixture.mjs',
      'src/test/ux02Creation.browser.mjs',
      'src/test/ux03Shell.browser.mjs',
      'src/test/ux05Audience.browser.mjs',
      'src/test/ux06Session.browser.mjs',
      'src/test/ux08.browser.mjs',
    ],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/test/**', 'src/**/*.test.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['src/test/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
])
