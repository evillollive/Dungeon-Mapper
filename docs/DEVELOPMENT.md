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

### Manual real-version upgrade and rollback rehearsal

`npm run test:upgrade:run` uses `playwright.upgrade.config.mjs` and
`ux09Upgrade.spec.mjs`. It inherits the locked engines, one-worker/no-retry
settings, timeouts and reporting from the existing runner, but owns its
switchable Vite preview server. It is **not** registered in required CI or the
default `test:browser` suite. Test discovery is not execution evidence.

Build an actual prior application revision and the intended candidate into
separate retained directories. Record the full source SHA of each build; do
not point both inputs at the same `dist` or identify a dirty build as clean
HEAD. Use task-owned archives or build directories, not another session's or
the main checkout. The recorded rehearsal rebuilt the source of the latest
successful Pages deployment, rather than downloading its original artifact.
Identical lockfiles allowed reuse of existing dependencies without an install.
If lockfiles differ, inspect compatibility before attempting a build.

```bash
QA_OUTPUT=/absolute/path/to/new-rehearsal \
QA_PRIOR_DIST=/absolute/path/to/retained-prior/dist \
QA_PRIOR_SHA=72f32e16c30be85e92f48e13fccb1576f36ed35e \
QA_CANDIDATE_DIST=/absolute/path/to/retained-candidate/dist \
QA_CANDIDATE_SHA=d9036c503c833ca44061bef86283c13440e4d6b4 \
QA_SOURCE_SHA="$(git rev-parse HEAD)" \
npm run test:upgrade:run
# Append -- --project=firefox for a bounded investigation.
```

The example SHAs identify the recorded pair. Change them only when the
corresponding retained build comes from that different revision.

`QA_PORT` has the existing 5309 default and must be free. The test restarts
the sole loopback origin with each build; it does not alter worker bytes or
application data to fake a version change. It verifies different real App
and worker hashes, the document module URL and the loaded App resource.
Each engine owns a synthetic persistent profile, which is closed on teardown.
Use a new `QA_OUTPUT` to retain prior runs because the normal runner replaces
its browser-results/report subdirectories.

The fixture reuses the existing rich Library project: two levels, embedded
art, custom libraries, unknown extension fields, a project recovery copy and
a separately saved session with a named checkpoint. Assertions cover an
update blocked by a pending native write; exact durable records and real
backup downloads across activation; candidate session-checkpoint recovery;
rollback preserving newer project/session work; subsequent writes by the
older application; private project-backup reimport as a separate identity;
and offline reload with the sole origin stopped.

Results retain source/build hashes, native storage snapshots, actual private
synthetic downloads and profiles. These are one pair's compatibility evidence,
not generic downgrade support, a new schema migration, physical storage
failure, browser/OS restart qualification or a release receipt. See the
[recorded version pair and limitations](./UX-09-HANDOFF.md#local-documentation-and-real-version-update-milestone).

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

The workflow journeys cover guided creation and Library continuity, editor
navigation/focus/layout, player publication/preview, session recovery with a
real second window, critical keyboard workflows, and furnishing catalog
placement/transforms/player export. Each test owns fresh browser storage, and the runner closes
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
always runs every registered journey for each engine.

After building once, `npm run test:browser:run` and `npm run test:ux08:run`
reuse `dist`. Only the latter uses `QA_ENGINES` and defaults to port 5308.
The UX-08 runner owns its server so it can stop the sole origin and control
worker updates. Do not run both suites concurrently on the same custom port.

### Local creator-package qualification

The registered `Creator sharing reviewed ZIP and independent Library import`
journey reuses the required production runner:

```bash
npm run build
QA_OUTPUT=/absolute/fresh/creator-evidence \
  npm run test:browser:run -- src/test/ux09.spec.mjs --grep="Creator sharing"
```

It covers explicit profile/content/license selection, custom image rights,
actual ZIP member hashes and disclosure sentinels, short-viewport review,
native downloads, independent IndexedDB import, cancellation/error preservation,
inherited-license choices from the editor entry point and native directory
selection on all three engines. Existing required suites/timeouts are unchanged.
Future Actions budgets must include these three additional cases.

Core tests are `creatorProject`, `creatorProvenance`, `creatorAssets`,
`creatorPackageFormat`, `creatorZipIntake` and `creatorPackage` under
`src/utils/__tests__`, plus the provenance hook and sharing component tests.
They distinguish mocked native codecs/previews from the actual browser evidence.
Untrusted intake uses bounded ZIP directory/stream checks, actual output lengths
and CRC, full member hashes, content/profile/rights validation and independent
storage confirmation; do not replace it with unrestricted `unzipSync`.
`fflate` is the only added runtime dependency.

The retained manual offline campaign reuses this exact production journey with
its sole preview origin stopped after cache readiness, before opening creator
sharing. It verifies cached lazy modules and worker-based compression, not just
an already-open dialog. Source/build identities and artifacts are recorded in
the [creator contract](./CREATOR-PACKAGE-CONTRACT.md). Neither local campaign is
a hosted receipt or a total-memory, legal, screen-reader or physical-device
certification.

The same creator journey also covers **Manage > Compare creator package**:
an identical package against a locally renamed copy, a changed package with
reviewed file differences, focus/scrollport visibility at 390 pixels, and a
second independent import while both original records stay unchanged.
`creatorPackageOrigin.test.ts` and `creatorPackageComparison.test.tsx` cover
receipt bounds, private backup preservation, malformed/future receipts,
different IDs, unchanged labels with changed bytes, cancellation and focus
return. The receipt is created from validated imported files, not accepted
from an incoming package or inferred from local edits.

CI runs every registered journey plus UX-08 for Chromium, Firefox and WebKit, with
independent engine jobs, no fail-fast cancellation and fourteen-day artifacts.
The checked-in workflow now creates the production distribution once in Build
and test and materializes that canonical artifact in each engine job. Engines
still install their own test/browser dependencies. Artifact identity and every
file hash are verified before use and again after the suites. Diagnostic
renderer bundles remain in-memory builds, not replacements for `dist`.
It also runs the F05 diagnostic, its delayed-draw probe, and the two edge-cache
pixel/allocation cases described below. Their behavior assertions block CI, but their latency values do not
certify a release or impose machine-dependent timing thresholds.
The aggregate **Browser qualification** check fails when any engine fails,
is skipped or is cancelled. The active default-branch ruleset requires that
aggregate and **Build and test**, both strict/up-to-date. **Build and test** also
blocks on lint errors and warnings with `--max-warnings 0`. The five remaining
hook dependency warnings in `App.tsx` and `MapCanvas.tsx` have been resolved
without new suppressions; do not raise the ceiling to admit new warnings.
Existing scoped rule suppressions elsewhere remain a separate concern, not a
claim of a suppression-free codebase. Map-state, level-management and history callbacks declare
their dependencies without hook-rule suppressions. Shared history helpers stay
stable across ordinary renders but read the current history ref, including
after level reindexing. Project-scoped actions still refresh when the editor
generation changes, so callbacks retained from a previous project are rejected.

See [UX-09 qualification status](./UX-09-HANDOFF.md) for actual coverage and
remaining human/device/performance gates. Passing these jobs is not an
accessibility conformance or full-release certification.

### Canonical build and Pages gating

Local implementation is in `.github/workflows/ci.yml` and
`scripts/qualification-artifact.mjs`; the independent `deploy.yml` is removed.
Remote workflows are unchanged until this branch is budgeted, published and
merged. Local validation does not prove GitHub job dependencies, permissions,
artifact service behavior, environment enforcement or Pages delivery.

The helper's `create`, `materialize` and `verify` commands bind a distribution
to repository/source/event/ref/run/attempt, lockfile and an externally supplied
manifest hash. They reject missing/extra/changed files, unsafe paths, links,
stale checkout content and mixed-attempt evidence. A target distribution must
not already exist. CI downloads by immutable artifact ID with explicit root
extraction, rather than looking up a "latest" artifact.

Only a successful full main push/dispatch in this repository can reach packaging
and deployment. Both required check names remain unchanged. Build/browser jobs
cancel superseded work; the Pages job is serialized without workflow-wide
cancellation. Its preflight rechecks main and the Pages artifact's run/source
inside the deployment slot. A stale candidate fails without publishing.

Canonical builds and qualification/receipt artifacts retain the existing
fourteen-day evidence window. The intermediate Pages archive retains the
previous one-day lifetime. None of these is the durable release archive still
requiring owner approval. Production file bytes, not the archive wrapper, are
the identity contract. Playwright report metadata, the copied manifest and
UX-08 results carry the canonical identity.

The deployment receipt distinguishes ready-to-submit, not-published,
deployment-outcome-unknown, verified and published-but-unverified. Public HTTP
smoke checks have at most three rounds, a two-minute request deadline,
per-request timeouts and qualified-size response bounds. Pages submission has
a six-minute action limit inside a ten-minute job, leaving time for smoke
checks and receipts. There is no automatic redeployment or rollback.
Manual cancellation can prevent final receipt upload; retain the pre-submission
intent and resolve server-side status before further publication.

```bash
npm test -- src/utils/__tests__/qualificationArtifact.test.ts
actionlint .github/workflows/ci.yml
```

The tests use synthetic metadata, temporary repositories and mocked public
responses. They do not contact Pages or submit deployments. `actionlint` is a
local validation tool, not a new CI job or npm dependency. A missing local
installation should be handled explicitly rather than claiming the check ran.
Whole-workflow reruns are required for attempt-consistent publication evidence;
diagnose first and obtain a numeric budget before any hosted trigger.

See the [design and approved scope](./RELEASE-DEPLOYMENT-DESIGN.md) and
[local implementation evidence](./UX-09-HANDOFF.md#local-exact-artifact-deployment-implementation).

## Launch art and print companion review

ART-08's original geometry is `src/themes/print-companion-v1/art.ts`, with
provenance and source fingerprints in its manifest and notice. The renderer
reuses the Folio vector primitives, not the color kit or its caches.
`src/utils/printTokenRender.ts` preserves Folio tokens and supplies matching
monochrome affiliations for legacy markers. Folio furnishings retain their
approved paths, with neutral charcoal print strokes. No extra dependencies,
asset requests, raster atlases or persistent render caches are introduced.
The editable tile source is 5,772 bytes (1,952 gzip), legacy token adapter
1,486 bytes (752 gzip), and three scene compositions 9,930 bytes (3,448 gzip).
These are individual source measurements, not application chunk sizes.

ART-06's three original 24 x 24 compositions are in
`src/utils/launchSamples.ts`. They join the existing sample entry point
without replacing the default sample or old IDs. Only the new launch samples
select player-safe creation previews; generation, tracing and legacy sample
previews keep their existing behavior.

The owner-approved door revision uses vector H/V overlays on plain doors.
Lock/trap symbols keep their outer orientation posts without the rectangle
fragments behind them. `printCompanions.test.ts` pins these shapes and the H's
matching minimum clearance from the frame. No platform font is needed.

```bash
QA_OUTPUT=/absolute/path/to/launch-art npm run test:browser -- --grep='launch art'
```

The existing three-engine runner executes four cases per engine: one art
matrix and one production journey for each sample. It records a self-contained
`review.html`, the tile/material/token key, paired color/print maps, A4/Letter
layouts and a one-inch detail crop. Production journeys preserve actual
300-DPI PNG downloads for both paper sizes, physical metadata, monochrome
pixels, player previews at phone width, private backups, reload and independent
project identities. The art matrix compares 21 semantic states at four
sizes, page windows at quarter-inch and one-inch scale, and safe creation
previews against player rendering.

Native WebKit repeats/PNG decoding can differ by one channel value. Creation
previews are bounded to maximum 1/255 and mean below 0.0001/255; overlapping
art windows to maximum 1/255 and mean below 0.005/255. Tile Canvas/SVG comparison
uses a per-tile mean below 2/255. The pre-existing UX-08 pixel-identical
downloaded-page gate and furnishing/token raster thresholds are unchanged.
The diagonal hatch candidate and colored print-stroke trial were corrected,
not admitted by widening the older limits.

Relevant regressions include `printCompanions.test.ts`, `launchSamples.test.ts`,
creation/export unit cases, the existing furnishing/token renderer matrices,
the guided creation journey and UX-08 production export/offline coverage.
This evidence does not constitute owner artwork approval, physical printing,
participant acceptance or performance qualification.

### Critical editing regression journeys

`ux09Editing.browser.mjs` registers thirteen independent production cases in
the required three-engine runner, replacing external-SDK invocation for the
critical object paths from `ux04Editing.browser.mjs`. The older standalone
script remains historical input/device evidence, not the current CI entry
point.

```bash
QA_OUTPUT=/absolute/path/to/editing npm run test:browser -- --grep='Editing:'
# Include related keyboard, shell, publication and two-window display cases:
QA_OUTPUT=/absolute/path/to/editing npm run test:browser -- \
  --grep='Editing:|keyboard critical|editor navigation|publication and|session recovery'
```

Coverage includes six object variants, atomic history, invalid/cancelled
drafts, failed-save backup/retry, favorite persistence/failure, overlapping
regions, mouse cancellation, viewport/selection scope and inspector
keyboard/reflow checks. The keyboard helper follows actual Tab navigation,
including macOS WebKit Option+Tab, and native select typeahead. Fixtures and
secondary property setup can use pointer controls; keyboard access is asserted
for each primary property and Apply/Cancel, plus the complete note inspector
layout matrix. Numeric input preserves fractional precision without relying
on Firefox's rounding `valueAsNumber`.

Each text-scale case records eight viewport sizes at 100% or 200% interface
text, with screenshots, measured focus/clipping/hit targets and sampled text
contrast. This is not native page zoom, physical keyboard/device acceptance,
screen-reader qualification or full WCAG conformance. Quota and preference
faults are page-scoped native-method injections restored in `finally`, not
physical disk failures. Negative persistence assertions wait beyond the
production save debounce and compare raw native records; content/history
equality ignores absent-versus-undefined optional keys through the portable
JSON contract.

The added 390x440 case retains the local reproduction of Firefox's partially
clipped focus at short heights. Every viewport uses a distinct draft and
requires an enabled Apply action, including adjacent reduced-height cases.
The application focus trap scrolls keyboard destinations fully into view;
the test does not call `scrollIntoView` to manufacture a passing result.

See [A-EDIT scope, evidence and remaining gates](./UX-09-HANDOFF.md#a-edit-production-editing-milestone).

### Library and recovery regression journeys

`ux09Library.browser.mjs` adds nine independent production cases to the
existing `ux09.spec.mjs` runner. Run the selected milestone with:

```bash
QA_OUTPUT=/absolute/path/to/library-recovery npm run test:browser -- --grep='Library recovery:'
# Include guided creation when changing their shared native storage reader:
QA_OUTPUT=/absolute/path/to/library-and-creation npm run test:browser -- --grep='Library recovery:|guided creation and library continuity'
```

The cases cover rich two-level duplication and backup equality, copied tags
without copied checkpoints, source isolation, archive/Trash cancellation and
restoration across reload, isolated permanent deletion, competing Library
metadata/duplicate actions, stale editor saves after rename/archive/Trash/delete,
durable duplicates after opening fails, and failed-save backup/retry with newer
in-memory edits. Recovery predecessors are created through the recovery UI,
not fabricated records. The shared creation reader observes real IndexedDB;
actions use the built application's controls, not development-only module imports.

Two failure cases temporarily intercept native IndexedDB `get` or `put` in
the test page, count the injected failures, and restore the methods in `finally`.
They establish handled read failures and atomic quota-abort behavior, not
physical disk exhaustion or natural browser eviction. Every case has fresh
runner-owned storage, traces, all-tab page-error capture and the unchanged
three-minute timeout. Existing required CI automatically includes them without
retries, optional checks, or larger timeout budgets.

This promotes selected invariants from the standalone
`ux02Library.browser.mjs` suite, not that entire suite. Its development-server
repository probes, thumbnail failures, and dedicated Library keyboard/reflow
checks remain separate coverage. The A-DATA follow-up below promotes the
remaining startup/migration preservation cases. Human/device, real-version
upgrade, and performance release gates remain open.

### A-DATA production preservation journeys

`ux09Preservation.browser.mjs` adds ten independent cases to the same required
three-engine runner:

```bash
QA_OUTPUT=/absolute/path/to/data-preservation npm run test:browser -- --grep='A-DATA'
# Include the existing journeys that share Library fixtures and actions:
QA_OUTPUT=/absolute/path/to/data-and-library npm run test:browser -- --grep='A-DATA|Library recovery:|guided creation and library continuity'
```

These cover concurrent migration and source precedence, localStorage bare-map
assets, migration abort/retry, unsupported-source recovery in both legacy
stores, atomic deletion tombstones, failed-startup quota recovery, competing
recoveries, and missing/corrupt startup sources with disappearing alternatives.
Fixtures are seeded through native IndexedDB in disposable runner contexts.
Subsequent actions use production UI, not imported source modules or a
test-only application API. The Library suite supplies its rich fixture,
download and recovery helpers; the creation suite supplies the storage reader.

Faults abort native transactions after migration adds or deletion operations
have been queued, or throw quota errors while saving recovery checkpoints.
The race holds delivery of one completed native read while another tab
commits through the recovery UI. Interceptions are page-scoped, counted or
explicitly observed, and restored on completion/failure. They do not simulate
physical disk exhaustion, OS crashes, or natural storage eviction. Unexpected
same-tab pending work remains covered at the coordinator/hook layer because
the production UI blocks editing and creation during failed-startup recovery.

See the [A-DATA evidence and defect fix](./UX-09-HANDOFF.md#a-data-production-preservation-milestone).
Timeouts, retries, dependencies, storage schema and required-check policy are
unchanged.

## First-use illustration review

ART-07's three scenes are editable SVG path data in
`src/assets/firstUseIllustrations.ts`, rendered by `FirstUseIllustration.tsx`.
They take only a scene name, never map data, project identity or storage state.
The drawings are decorative, non-focusable and do not introduce controls,
images, fonts, external requests or animation. Print and forced colors use
explicit CSS treatments; the monochrome drawings do not replace ART-08's
map-rendering print companion scope.

```bash
QA_OUTPUT=/absolute/path/to/illustrations npm run test:browser -- --grep='first-use illustrations'
```

The existing three-engine runner executes two cases: a source-driven art
review and a production Library -> sample -> private backup -> Prepare -> blank
player display journey. The latter keeps real download, local storage and
two-window behavior, plus phone, short-landscape and enlarged-text checks.
Creation artwork is absent from search misses, trash and storage failures.
The player window still receives no source-project data and has no map canvas
while blank; its neutral drawing is not the published scene.

The runner stores `review.html`, `contact-sheet.png`, individual scene images,
forced-color/phone sheets and in-app screenshots in each engine's
`browser-results` directory. The review HTML is self-contained. The in-memory
React harness is not a production route. Geometry bounds, grayscale fill/stroke
colors and inherited system colors are asserted without weakening existing
workflow gates. The creation, keyboard, session and UX-08 export/offline
journeys remain relevant integration coverage.

## Interface icon artwork review

ART-01 uses the original SVG path sources in `src/assets/interfaceIcons.ts`
and the shared `Icon.tsx` component. The 32 names are typed; controls supply
visible words or an accessible name while the SVG remains decorative and
non-focusable. Sizes 16/20/24 scale relative to 16-pixel text. Status icons use
the actual save phase, not a parsed label or network state.

```bash
QA_OUTPUT=/absolute/path/to/icons npm run test:browser -- --grep='interface icon family'
```

`interfaceIcons.spec.mjs` builds the source-driven React review in memory,
without adding a production route. It covers every icon's geometry bounds
including stroke clearance, three display sizes, inherited color, default/
selected/disabled/focus treatments, native disabled-button tab skipping,
forced colors and doubled text sizing in Chromium, Firefox and WebKit.
macOS WebKit uses Option+Tab, matching the existing keyboard journey.
The runner keeps `review.html`, `catalog.png`, `player-display.png`,
`states.png`, `forced-colors.png` and `mobile-text-size.png` under each
engine's `browser-results` directory. Open the HTML locally to review the
artwork; it has embedded CSS/SVG and no external dependencies.

The review is also in the required browser suite. For changes to icon placement,
run the affected existing creation, shell, keyboard, session and UX-08
export/offline journeys. Do not raise layout thresholds to accommodate icons.
This artwork coverage does not certify whole-app accessibility, human
recognition or physical-device behavior.

## Folio furnishing catalog qualification

The 24-piece catalog has a production UI journey in `ux07Furnishings.browser.mjs`
and a renderer matrix in `ux07Furnishings.spec.mjs`. Both run on all three
engines in the existing blocking browser suite:

```bash
QA_OUTPUT=/absolute/path/to/furnishings npm run test:browser -- --grep='[Ff]urnishing'
```

The UI journey checks sample creation, the full catalog, legacy and new placement
scales, transforms, undo/redo, reload, backup and player output. Its screenshots
are written to the runner's evidence directory, not into historical docs.
The renderer harness is bundled in memory from current source, with no
test route in the production app. It compares actual editor and export paint
commands, bounds independent Canvas rasterization differences, and compares
each asset's player SVG at four scales and four transform/opacity settings.
The in-memory command recorder is restored even when the comparison fails.
Color/print contact sheets, a composed sample and zoom sheets are retained under
`browser-results`. These do not certify physical print scale, touch interaction
or dense-map performance. See the UX roadmap for the owner-approval status.

## Folio token reference qualification

ART-04's original scene has a production journey in `ux07Tokens.browser.mjs`.
`ux07TokenCatalog.browser.mjs` covers the full twelve-token scene and nine
new picker placements, including unique IDs, independent affiliations,
undo/redo, reload, deletion and player-safe exports. The shared renderer
matrix in `ux07Tokens.spec.mjs` covers all twelve silhouettes. All three
cases run in the existing three-engine blocking browser suite:

```bash
QA_OUTPUT=/absolute/path/to/tokens npm run test:browser -- --grep='Folio token'
```

The journey covers sample creation, choosing a silhouette independently of
affiliation, cancellation, coordinate changes, undo/redo, reload, backup and
player output at desktop/phone viewports. The matrix compares all 36
silhouette/frame combinations at four cell sizes and three token footprints,
432 comparisons per browser. Short-copy assertions cap each biography at
one sentence and ten words.
It compares the shared editor drawing path with the actual map export and
monochrome renderers, plus native SVG rasterization within each token footprint.
Reference, affiliation, composed-map and scale sheets are saved with browser
results. These checks do not establish owner approval, physical-device
readability, printer acceptance or dense-map responsiveness.

For interactive visual review, run `npm run dev` and open
`/Dungeon-Mapper/docs/prototypes/ux07-tokens/index.html` on that server.
This source-driven review is not a production application route.
The template approval and subsequent six-artwork revision request are recorded
in the UX roadmap. Screenshots in `docs/media/ux07-tokens` preserve the original
reference; `docs/media/ux07-token-catalog` contains the current complete kit.

## Local publisher authentication, planning and validation prototype

The optional publisher's test composition is isolated under `publisher/`.
It requires Node 24.16+ for native TypeScript execution; the editor's existing
runtime/build and hosted checks are unchanged. The publisher-only native
validator uses pinned Sharp and jsdom dependencies in its own lockfile.
No external database, container engine, GitHub App or real credentials are
needed. The separate fake-publication engine uses Node's built-in SQLite for
owner-approved local metadata-only recovery receipts.

```bash
npm ci --prefix publisher
npm run publisher:dev
npm run build:publisher
npm run check:publisher
npm run test:publisher
npm run test:publisher:validation
QA_OUTPUT=/absolute/fresh/publication-evidence npm run test:publisher:publication
QA_OUTPUT=/absolute/fresh/publisher-evidence npm run test:publisher:browser
QA_OUTPUT=/absolute/fresh/simulation-evidence npm run test:publisher:simulation
```

The dev command prints a loopback URL and runs a clearly labeled simulated
provider. Set `PUBLISHER_RECEIPTS=/absolute/private/directory/operations.sqlite`
to enable authenticated fake publication and durable receipt recovery; the
directory must already exist. Without that setting the validation-only
composition creates no journal. Stop with Ctrl+C. The native browser runner owns and stops its local
servers. The protocol tests include a real ten-second deadline case; do not
mistake test duration for an authentication performance target.
Dev and publisher-test scripts build the separate `publisher/dist` client and
`publisher/validator/dist` Node inspector first. The editor's `npm run build`,
dependencies and service worker remain separate.

This shell exercises sign-in state/PKCE, first-party session/CSRF behavior,
rotation, denial, expiry, revocation, stale callbacks and bounded repository
responses. It also inspects selected creator ZIPs locally with the existing
browser validator and creates explicit metadata-only simulated destination
plans. Rechecks reject changed permission/visibility/base snapshots. Planning
does not post file contents; separate consent sends the exact ZIP to the local
server for independent native validation. The child receives no provider
credentials, has an enforced deadline and is awaited through cancellation/exit.
Its V8 heap ceiling is not a native-memory cap or OS sandbox. Uploaded bodies
are not saved or returned by the HTTP validator. Explicitly confirmed simulation
resubmits the ZIP and writes only to the fake provider's memory. There is no real branch writer, production startup
composition or real GitHub adapter. HTTP loopback cookies are not production
TLS/Secure-cookie evidence, and all session state is ephemeral.

The focused publication command exercises the fake Git provider, SQLite
operation journal and authenticated HTTP routes. It verifies exact
package readback, unrelated-file preservation, create-only refs, duplicate
prevention, lost/delayed responses, cancellation, bounded admission and
read-only restart reconciliation. Test database files are retained under
`QA_OUTPUT`, contain metadata only, and should not be confused with production
credential/session persistence. The simulation browser command adds explicit
confirmation, progress, lost responses, conflicts, account isolation and
read-only reload/restart recovery on three engines. The real GitHub button
remains disabled. See the
[engine boundary](../publisher/README.md#fake-publication-engine-and-restart-receipts).

These dedicated tests are manual/local commands, not newly required hosted
checks. Root lint includes the prototype sources; a production service pipeline
needs separate GH-A02 scope and budget approval. See the
[prototype README](../publisher/README.md) and
[publisher design](./GITHUB-PUBLISHER-DESIGN.md#15-authenticated-simulation-and-browser-recovery).

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
single-action undo before accepting the run. Together with the delayed full-
and partial-draw probes, F05 contributes five tests per engine.

Timing begins at a trusted browser event's timestamp. Painting and token edits
must reach a main-canvas width reset or regional clear, finish
its synchronous drawing stack, and reach two subsequent animation frames.
Hover and pan use the frame opportunity without requiring a map redraw.
The two probe regressions deliberately delay drawing by 100 ms and reject
context-only or unrelated-canvas operations, so an earlier frame cannot
prematurely end an edit measurement. Synchronous clears are coalesced per
canvas; the v2 probe records `drawKind` and its source Git blob identity.
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
Compare builds with the same probe version/blob; a measurement based only on
width assignment cannot qualify an implementation that paints without resizing.

There are deliberately no 100 ms/2-second CI assertions before representative
hardware and measurement methodology are agreed. Do not lower the roadmap
targets or interpret a green diagnostic as performance acceptance.
See [actual local results and remaining bottleneck](./UX-09-HANDOFF.md#dense-map-diagnostic-milestone).

### Dense-map export lifecycle

`ux09DenseExport.browser.mjs` adds one F05 journey per engine through the
existing production runner:

```bash
QA_OUTPUT=/absolute/path/to/dense-export npm run test:browser -- src/test/ux09.spec.mjs --grep="F05 dense export"
```

It reuses the unchanged dense fixture for a color DM 300-DPI Letter batch,
selected last-page error/retry and a player PNG. The case caps batch download
requests at three and holds the second real encoding callback to make
cancellation deterministic. It never claims to export all 252 pages. Browser
encoding is real; the hold and null-result fault injection are recorded
explicitly in the retained audit.

Per-surface checks retain the 16 MP / 8192-side limits. Known page/content
surfaces must stay within the two-surface capacity and be explicitly zeroed
after normal completion, error and cancellation. PNG URLs must be revoked.
Completed downloads are browser-decoded and checked for dimensions, DPI,
nonblank content and unchanged backup/IndexedDB data. These observations do
not measure native/GPU/decoder memory or establish physical-print quality.

ExportDialog shows cancellation requested as soon as the input is handled, but waits for the current
operation to settle before enabling another export. Native encoding cannot be
preempted by AbortSignal. The unit regression holds an operation pending to
verify feedback and locking without adding a cancellation race.

Use a fresh `QA_OUTPUT` for each attempt. Failures retain their audit and any
unverified received PNGs before restoring instrumentation and aborting the
owned export. See [results and natural-timing limitations](./UX-09-HANDOFF.md#dense-f05-export-and-cancellation-milestone).

### Bounded editor token repaint

**Current behavior, October 1, 2026:** MapCanvas always resets and redraws the
complete main canvas for a required frame, including token-drag previews.
The owner withdrew the regional path after Linux WebKit exceeded the unchanged
pixel tolerance. There is no browser/OS exception, hidden toggle or partial
production branch. Last-frame/damage bookkeeping and region clipping were
removed; tile, bank, edge and lighting traversal again covers the complete map.

`tokenRepaint.ts` and `tokenSceneBounds.ts` retain their pure planning helpers
and unit tests as historical experimental logic, not an enabled renderer.
Only the existing `sameRepaintInputs` comparer remains imported by MapCanvas.
Ordinary input comparison, coordinate-only hover suppression, bounded edge
strips and floor-path caches remain. No second canvas, new bitmap cache,
export/player renderer change, map schema change or art-detail reduction is
introduced.

```bash
npm test -- src/utils/__tests__/tokenRepaint.test.ts \
  src/utils/__tests__/tokenSceneBounds.test.ts \
  src/components/__tests__/MapCanvas.performance.test.tsx
QA_OUTPUT=/absolute/path/to/token-repaint npm run test:browser -- src/test/tokenRepaint.spec.mjs
```

The source-bundled browser harness compares the actual editor with its full-
render path. It compares complete images across six DPRs and 20/24/32-pixel
tiles, overlapping artwork, token footprints, movement/cancel/commit and
former fallback scenes. Every observation must now increase the candidate's
complete-draw counter and keep its partial-draw counter at zero. This replaces
the former optimization-activation assertion.

The owner subsequently approved removing only this retired optimization
test's single-pixel RGB maximum gate. Alpha must still match exactly and
whole-image mean difference must remain at most 0.01 byte levels per channel
(0.01/255 normalized). Maximum RGB and worst-pixel details are still recorded,
but isolated color-byte differences are not a release blocker in this one
full-vs-full comparison. Boundary controls explicitly reject any alpha
difference or mean above 0.01. No other rendering test, scenario, movement,
cancellation, commit, redraw or allocation assertion changes.
It uses synthetic events for differential pixels, while
existing production journeys and F05 retain genuine input/persistence checks.
An eighty-move case observes no new DOM canvas allocations; this is not a
total browser-memory ceiling or physical-device soak test.

The case remains in the required runner under its existing name, without a new
job, dependency, timeout or retry. Source-linked evidence, expected loss of the
preview speedup, and the Linux-first gate for any reintroduction are recorded
in the [correctness restoration handoff](./UX-09-HANDOFF.md#owner-approved-full-token-redraw-restoration).
The later [owner-approved policy change](./UX-09-HANDOFF.md#owner-approved-release-candidate-comparison-policy)
is an explicit acceptance decision, not a claim that the native discrepancy
was diagnosed or fixed.
The earlier optimization measurements remain historical and must not be
reported as current performance. This rollback does not close A-PERF or
replace exact-head hosted qualification. The App chunk-size advisory remains.

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

Keep the performance probe's five cases, these two renderer cases and the
workflow journeys in every engine job. Read
[the cache milestone](./UX-09-HANDOFF.md#bounded-edge-strip-cache-milestone)
for final measurements, startup costs, memory exclusions and remaining gates.

### Bounded Folio floor-path regressions

`ux09FolioTiles.spec.mjs` uses an in-memory Vite bundle of
`src/test/folioTiles.render.ts`, with no production debug route. The existing
blocking runner discovers all three cases on every engine:

```bash
QA_OUTPUT=/absolute/path/to/floor-cache npm run test:browser -- src/test/ux09FolioTiles.spec.mjs
```

The pixel matrix covers 210 combinations per engine, including cold/warm
reuse, materials, paint/undo, derived geometry, dense floors, two backgrounds,
three cell sizes and five DPRs. Alpha equality is exact; RGB may differ by at
most 1/255 with mean error at most 0.01/255. The bounds are unchanged from
the rejected bitmap candidates; current rendering reuses native vector paths.
The other cases cover physical placement, clipping, caller state and F05
allocation/reuse. All resolution and compositing still happen on the original
destination, without high-DPR cutoffs. Existing export renderers remain uncached.

The per-editor bounds are twelve entries and 56 native paths. No new canvases
or image-copy operations are used. Unit/component coverage includes material
keys, complete-variant path bounds, allocation-free warm traversal, detail-tier
changes, high resolutions, caller alpha, project/theme/audience/print changes
and disposal.

WebKit runs the same pixel case as a fail-fast preflight before the full
required browser suite. Set `QA_FLOOR_DIAGNOSTICS=1` when investigating raster
behavior to attach bounded comparisons of backing sizes, readback hints,
coordinate origins and copy modes. These diagnose the rejected bitmap approach,
never alter the pixel assertion, and are not exposed by the production app.
See [measured results and limitations](./UX-09-HANDOFF.md#bounded-folio-floor-path-milestone).
