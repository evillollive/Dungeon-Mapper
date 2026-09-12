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
| Hook lifecycle | `src/hooks/__tests__/useMapHistory.test.ts`, `src/hooks/__tests__/useLevelManagement.test.ts`, `src/hooks/__tests__/savePersistence.test.tsx` | Stable editing callbacks, current injected dependencies, per-level history and project-generation isolation |
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
It also runs the F05 diagnostic, its delayed-draw probe, and the two edge-cache
pixel/allocation cases described below. Their behavior assertions block CI, but their latency values do not
certify a release or impose machine-dependent timing thresholds.
The aggregate **Browser qualification** check fails when any engine fails,
is skipped or is cancelled. The active default-branch ruleset requires that
aggregate and **Build and test**, both strict/up-to-date. **Build and test** also treats lint errors as
blocking. The remaining five `react-hooks/exhaustive-deps` warnings remain visible
and are capped with `--max-warnings 5`; lower that ceiling as debt is removed,
never increase it to hide new warnings. This is a count ceiling, not per-warning
identity tracking. Remaining warnings are confined to `App.tsx` and
`MapCanvas.tsx`. Map-state, level-management and history callbacks now declare
their dependencies without hook-rule suppressions. Shared history helpers stay
stable across ordinary renders but read the current history ref, including
after level reindexing. Project-scoped actions still refresh when the editor
generation changes, so callbacks retained from a previous project are rejected.

See [UX-09 qualification status](./UX-09-HANDOFF.md) for actual coverage and
remaining human/device/performance gates. Passing these jobs is not an
accessibility conformance or full-release certification.

## Dense-map performance diagnostics (F05)

`src/test/denseMapFixture.mjs` builds a deterministic 128 x 128 dungeon with
100 tokens (eight party sight sources), 200 versioned Folio furnishings,
100 notes, sixteen room shapes, a river, wall/path vectors, twelve lights,
dynamic fog, and classic paper/blending/atmosphere effects. It is imported
through the real production Library, not a hidden application fixture route.

```bash
QA_OUTPUT=/absolute/path/to/f05 npm run test:browser -- --grep=F05
# Reuse dist and apply a labeled CPU stress probe to the interaction diagnostic:
QA_CPU_THROTTLE=4 QA_OUTPUT=/absolute/path/to/f05-throttled \
  npm run test:browser:run -- src/test/ux09Performance.spec.mjs --project=chromium
```

The same strict-port server, dependency lock, failure artifacts and three-minute
per-test limit apply. `QA_CPU_THROTTLE` accepts 1 through 20, defaults to 1,
and rejects non-Chromium diagnostic runs when greater than 1. CPU throttling
does not reproduce a slower GPU, memory pressure, thermal behavior or a real
mobile device. An incomplete stress run is a failure, not a shortened pass.

The diagnostic registers three independent repetition tests, each with fresh
browser storage, a full fixture import and one warm reload at 1440 x 900 and
DPR 1. Each repetition retains its own existing three-minute test timeout;
the suite still has the existing twenty-minute limit and one worker. This
avoids making three repetitions share a single journey timeout on slower
hosts. No sample counts or behavior assertions are reduced.

Each repetition samples 24 hovers, 24 paint-drag updates, twelve token-drag
updates, 24 keyboard pans, and separate paint/token start or commit events.
It checks coordinate feedback, imported density/art, persisted edits and
single-action undo before accepting the run. Together with the delayed-draw
probe, F05 now contributes four tests per engine to the required browser jobs.

Timing begins at a trusted browser event's timestamp. Painting and token edits
must reach the existing main-canvas render (backing-width assignment), finish
its synchronous drawing stack, and reach two subsequent animation frames.
Hover and pan use the frame opportunity without requiring a map redraw.
The separate probe regression deliberately delays drawing by 100 ms to ensure
an earlier animation frame cannot prematurely end an edit measurement.
This is an event-to-render/frame **proxy**, not physical input-to-paint or INP.
Browser scheduling and headless frame cadence differ between engines.

Warm loading runs from navigation start through visible editor controls,
saved-state readiness and a frame opportunity. It includes browser-driver
assertion overhead, so it is a conservative diagnostic, not an isolated
shell-ready performance mark. Cold load, offline load and the roadmap's agreed
reference-device loading gate are not established by this measurement.

`f05-results.json` retains every sample, nearest-rank median/p95/max, queue
delay, drawing times, supported long-task observations, navigation/resource
entries, browser/OS/CPU/RAM, DPR, throttle rate, source revision, dirty-worktree
flag and completion status. Each test writes its own artifact directory and
report, identified by `repetition` and `totalRepetitions: 3`; `expectedRuns: 1`
describes that test only. All three repetition tests must complete for a full
diagnostic result. Failed repetitions retain failure evidence and an incomplete
report, never a zero-latency sample. Chromium's first repetition additionally produces
`f05-chromium-trace.json` and `f05-chromium.cpuprofile`, and is explicitly
marked profiled. Compare profiled and unprofiled runs separately. Timelines
contain the `f05:` input/frame marks. Later repetitions do not use CDP profiling.

There are deliberately no 100 ms/2-second CI assertions before representative
hardware and measurement methodology are agreed. Do not lower the roadmap
targets or interpret a green diagnostic as performance acceptance.
See [actual local results and remaining bottleneck](./UX-09-HANDOFF.md#dense-map-diagnostic-milestone).

### Bounded edge-cache regressions

`ux09EdgeBlend.spec.mjs` adds two required cases per engine using the existing
Vite/Playwright dependencies. Vite bundles `src/test/edgeBlend.render.ts` in
memory for an isolated browser harness. No test route, debug flag or renderer
API is exposed by the production app. The existing F05 interaction diagnostic
continues to exercise the actual production editor.

```bash
QA_OUTPUT=/absolute/path/to/edge-cache npm run test:browser -- src/test/ux09EdgeBlend.spec.mjs
```

The pixel case compares cold/warm, paint/undo, derived geometry, theme,
opacity and intensity across 8/32/64-pixel cells, four DPR values and two
backgrounds. `edge-blend-pixels` records all 192 cases, direct-renderer channel
differences and an independent per-edge raster oracle. Tolerances are
2/255 against the oracle, 8/255 maximum and 0.25/255 mean against the direct
renderer, accounting for intermediate RGBA8 rounding rather than claiming
byte-identical compositing.

`f05-edge-cache-budget` records page count, raw bytes, retained edges,
rasterizations, hits and overflow at DPR 1/2/3. It traverses all F05 geometry
with a small destination, so this is a cache allocation/reuse test, not total
application memory or high-DPR interaction qualification. The hard bounds are
16 MiB raw raster and 16,384 entries per editor. Overflow uses direct drawing;
the test rejects new rasterization/page allocation on an unchanged second
traversal. Unit/component tests also cover semantic/color invalidation,
settings, disposal and populating pages before sampling them.

Keep the performance probe's four cases, these two renderer cases and the five
workflow journeys in every engine job. Read
[the cache milestone](./UX-09-HANDOFF.md#bounded-edge-strip-cache-milestone)
for final measurements, startup costs, memory exclusions and remaining gates.
