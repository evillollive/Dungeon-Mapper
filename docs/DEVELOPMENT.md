# Development Guide

This page collects setup, validation, and test-structure notes for contributors.

## Prerequisites

- Node.js 20+
- npm 10+

## Development & Testing

If you want to hack on the project, the workflow is refreshingly normal. Spin up Vite for development, run the build when you want the production check, and use the existing test suite when you're touching behavior.

```bash
npm install
npm run dev # development server
npm run build # production build (tsc + vite)
npm run preview # preview the production build
npm run lint # ESLint
npm test # run the full test suite (one-shot, CI-friendly)
npm run test:watch # run tests in watch mode during development
```

The project uses [Vitest](https://vitest.dev/) with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) and jsdom for unit and component testing. The coverage is broad enough that you can poke at rendering, generation logic, and state behavior without flying blind.

**Test structure:**

| Area | Location | What's tested |
|------|----------|---------------|
| Generator utilities | `src/utils/__tests__/common.test.ts` | `makeTypeGrid`, `outlineWalls`, `bfsDistances`, `collectCells`, `reorderNotesReadingOrder` |
| Seedable RNG | `src/utils/__tests__/random.test.ts` | `makeRng`, `seedFromString`, `parseSeed`, determinism |
| FOV engine | `src/utils/__tests__/fov.test.ts` | `isOpaque`, `computeFOV` edge cases (walls, radius, doors) |
| Stamp catalog | `src/utils/__tests__/stampCatalog.test.ts` | `getStampDef`, built-in stamp integrity, category labels |
| Map state | `src/hooks/__tests__/mapStateUtils.test.ts` | `createDefaultMap`, `createDefaultProject`, `withDefaults`, `nextIdAfter` |
| Components | `src/components/__tests__/dialogs.test.tsx` | Dialog render/close lifecycle (ShortcutsHelp, ExportDialog) |
| Paper texture | `src/utils/__tests__/paperTexture.test.ts` | `generatePaperTexture`, pattern rendering, caching, vignette |
| Edge blending | `src/utils/__tests__/edgeBlend.test.ts` | `drawEdgeBlending`, dither/smooth/stipple styles, intensity |
| Hand-drawn mode | `src/utils/__tests__/handDrawn.test.ts` | `drawHandDrawn`, sketchy/pencil/ink styles, wobble, print mode |
| Lighting & atmosphere | `src/utils/__tests__/lightingAtmosphere.test.ts` | `drawLightingAtmosphere`, AO, stamp shadows, color grading |
| Art style presets | `src/utils/__tests__/artStylePresets.test.ts` | `getPresetSettings`, preset descriptions, layer configurations |
| Room rasterizer | `src/utils/__tests__/roomRasterizer.test.ts` | `rasterizeRoomShapes`, rectangle rooms, door hints, clipping, overlaps |
| Dynamic fog | `src/utils/__tests__/dynamicFog.test.ts` | player FOV union, explored-grid merging |
| Light sources | `src/utils/__tests__/lightSources.test.ts` | light FOV union, wall/radius handling |
| Token visibility | `src/utils/__tests__/tokenVisibility.test.ts` | classic and dynamic fog visibility for multi-cell tokens |
| Canvas geometry | `src/utils/__tests__/canvasGeometry.test.ts` | line, rectangle, snapping, polyline hit-test helpers used by `MapCanvas` |
| Rivers | `src/utils/__tests__/riverRasterizer.test.ts`, `src/hooks/__tests__/mapStateRivers.test.ts`, `src/utils/__tests__/premadeMaps.test.ts` | river rasterization metadata, map state actions, generated/premade river vectors |
| Export/rendering | `src/utils/__tests__/exportRender.test.ts` | player-safe SVG exports, dynamic fog, render-map canvas sizing |
| UI behavior | `src/components/__tests__/uiBehavior.test.tsx` | Generate Hub, Command Palette, Navigation Rail, Selection Inspector, ExportDialog interactions |

Shared mock context providers live in `src/test/testHelpers.tsx` - use `TestProviders` to wrap components that depend on `ToolContext`, `MapContext`, `ViewContext`, or `ActionContext`.

## Production export and offline qualification

Playwright is a locked development dependency. Install its browser engines once,
then run the UX-08 production journey with artifacts outside the repository:

```bash
npx playwright install chromium firefox webkit
QA_OUTPUT=/absolute/path/to/artifacts npm run test:ux08
```

`QA_ENGINES=chromium` selects one engine; the default runs all three sequentially.
`QA_PORT` defaults to 5308. The runner owns a strict-port Vite preview server,
disposable browser contexts, real file downloads and server shutdown.
It runs against `/Dungeon-Mapper/`, checks PNG dimensions and physical metadata,
pixel-identical page overlaps, missing/corrupt artwork fallbacks, audience policy,
cancellation, a bounded 128 x 128 / 300 DPI page, update blocking and offline
reload/edit/save/reopen/export. The sole origin is stopped for every engine;
Chromium and Firefox also use protocol offline emulation. WebKit's protocol
offline switch can itself reject service-worker navigation, so its qualification
uses the stopped-origin check instead.

The controlled update changes service-worker bytes without changing the app
bundle. It is an activation and data-continuity test, not a cross-schema upgrade
test. Historical UX-01 scenario scripts remain baseline-specific; use the
current UX-08 runner for export and update behavior.

## Blocking production browser journeys (UX-09)

The locked `playwright` package also provides `playwright/test`; no external SDK,
Python environment, or additional test package is required. The production
journeys now run through `playwright.config.mjs`:

```bash
npx playwright install chromium firefox webkit
QA_OUTPUT=/absolute/path/to/qualification npm run test:browser
# One engine or journey while developing:
QA_OUTPUT=/absolute/path/to/qualification npm run test:browser -- --project=webkit --grep=publication
```

The five journeys cover guided creation and Library continuity, editor
navigation/focus/layout, player publication/preview, session recovery with a
real second window, and critical keyboard workflows. Each test owns fresh browser storage, and the runner closes
its pages and contexts on success, failure, or timeout. These use production
assets under `/Dungeon-Mapper/`, not a development-only fixture route.
`ux02Creation.browser.mjs`, `ux03Shell.browser.mjs`, `ux05Audience.browser.mjs`
and `ux06Session.browser.mjs` now export Page-based journeys instead of being
standalone scripts or function expressions for external evaluation.

`ux09Keyboard.browser.mjs` uses actual key presses and Tab/Shift+Tab navigation,
not `click()` or programmatic `focus()` as substitutes for keyboard access.
Importing its fixed project uses `setInputFiles` instead of the native OS picker.
On macOS WebKit it uses Option+Tab to reach all controls, matching the browser's
native alternative to its text-field-only Tab default. Firefox's headless
shell stops at the document edge; the journey reverses direction there.
Neither case changes application tab indices or skips assertions.

```bash
QA_OUTPUT=/absolute/path/to/keyboard npm run test:browser -- --grep="keyboard critical"
```

The journey covers creation cancellation and collapsed advanced options, note
spaces/newlines and cancellation, initiative renaming/reordering, modal focus
during responsive sheet mounting, recovery, a real backup download, reload,
preparation and keyboard-operated session movement/turn/end/resume. Note actions
are exercised at all five roadmap viewports and at 100%/200% interface text.
Assertions cover 44-pixel edit targets, visible focus, clipping and hit testing,
and 4.5:1 contrast for note labels/descriptions/badges and initiative names/order.
These are scoped checks, not an automated WCAG conformance declaration or an
OS screen-reader task study. The configured interface text size is not browser
page zoom. Artifacts record the navigation mode and actual layout/contrast values.

`QA_OUTPUT` is required. The runner replaces only its `browser-results` and
`browser-report` subdirectories there; keep separate directories for evidence
you want to retain across runs. The JSON report is `browser-report.json`.
Failed journeys retain a Playwright trace, screenshot and error context.
Results include browser version, engine, source revision when supplied through
`QA_SOURCE_SHA` (or CI's `GITHUB_SHA`), and browser errors from every page,
including player windows. HTML reports never open automatically.

The strict-port preview server defaults to port 5309 (`QA_PORT` overrides it);
an existing server is not reused. Tests run serially, with no retries, a
three-minute test timeout and a twenty-minute suite timeout. `test.only` and
empty test selection fail. `--grep` and `--project` are local selectors; CI
always runs all five journeys for each engine.

After building once, `npm run test:browser:run` and `npm run test:ux08:run`
reuse `dist`. Only the latter uses `QA_ENGINES` and defaults to port 5308.
The UX-08 runner owns its server so it can stop the sole origin and control
worker updates. Do not run both suites concurrently on the same custom port.

CI runs all five journeys plus UX-08 for Chromium, Firefox and WebKit, with
independent engine jobs, no fail-fast cancellation and fourteen-day artifacts.
The aggregate **Browser qualification** check fails when any engine fails,
is skipped or is cancelled. The active default-branch ruleset requires that
aggregate and **Build and test**, both strict/up-to-date. **Build and test** also treats lint errors as
blocking. The existing 73 `react-hooks/exhaustive-deps` warnings remain visible
and are capped with `--max-warnings 73`; lower that ceiling as debt is removed,
never increase it to hide new warnings. This is a count ceiling, not per-warning
identity tracking. Existing debt is confined to `App.tsx`, `MapCanvas.tsx`,
`useLevelManagement.ts` and `useMapState.ts`.

See [UX-09 qualification status](./UX-09-HANDOFF.md) for actual coverage and
remaining human/device/performance gates. Passing these jobs is not an
accessibility conformance or full-release certification.
