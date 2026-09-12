# UX-09: Accessible workflows and release gates

First bounded milestone, 2026-09-11, based on `a38ea34`, merged in #171. The owner selected
automated browser journeys and enforced CI gates before remaining UX-07 art
work. This starts UX-09; it does not complete its release acceptance.

## Implemented contract

`playwright.config.mjs` uses the existing locked Playwright 1.62.1 test runner.
`src/test/ux09.spec.mjs` imports the existing creation, shell, audience and session
journeys. The runner, rather than each journey, owns isolated browser contexts,
timeout teardown, failure traces and screenshots. Session popups share that
context, so player-window errors are included rather than silently missed.
No assertion is weakened to accommodate another engine.

The initial cross-browser run failed in WebKit on
`ResizeObserver loop completed with undelivered notifications`. Player preview
was resizing its canvas synchronously while observing the containing viewport.
`PlayerPreview.tsx` now coalesces resize notifications into one animation frame,
skips unchanged display/backing sizes, and cancels scheduled work on projection
replacement or unmount. Projection changes, zoom and device-pixel-ratio changes
still redraw. Browser error filtering is not used.

CI builds production assets and runs four journeys plus the UX-08 export/offline
journey in each of three independent engine jobs. It retains failure evidence
and results for fourteen days. The aggregate **Browser qualification** job
requires every engine to succeed. **Build and test** now blocks on lint errors
and on increases beyond the recorded 73-warning baseline. Hook warning debt is
not declared fixed. The active **Protect default branch** ruleset (21362094)
requires both **Build and test** and **Browser qualification**, with strict
up-to-date checks. Its existing PR, deletion, force-push and bypass policies
were preserved.

The existing UX-08 runner remains separate because it controls worker bytes and
actually shuts down its server. It uses the same production build and locked
engines. Build failures, missing engines and journey failures are failures,
not skipped qualification. Workflow jobs and browser tests have bounded
timeouts, no automated retries, and no `continue-on-error`.

## Scope and local results

Production macOS observations use Chromium 151.0.7922.34, Firefox 153.0 and
WebKit 26.5. All four journeys passed in each engine after the player resize fix.
The three-engine UX-08 export/offline journey also passed. The initial WebKit
failure artifacts are retained separately from the corrective run.

| Journey | Automated coverage | Still outside this milestone |
| --- | --- | --- |
| Guided creation and Library | Sample preview cancellation, 40-cell sample, new blank project, deterministic seeded previews, independent generated copies, image trace/reload, scene template copy and continue-last-map | Full catalog search/delete/migration/failure matrix from UX-01/02 |
| Editor shell | Project identity, dimensions, navigation, command availability, focus return, text-input shortcut isolation, recovery dialogs, backup download, 390/768/1440 widths and enlarged text | Complete keyboard-only editing, all landscape sizes and physical mobile input |
| Publication and preview | Persisted public/private fields, discovery undo, DOM/accessibility sentinels, visible counts, absent editing controls, shortcut isolation, player downloads and responsive preview | Screen-reader task review, comprehensive contrast and nonvisual spatial editing |
| Session and local display | Prepare/start, reveal/move, turn/round, measure/ping, checkpoints, inspect versus publish, blank handshake, stale epoch, disconnect/reconnect, DM/player reload, quota recovery, CAS conflict, end/resume/discard and unchanged authored source | Real mobile interruption, OS-level termination and participant routine-play acceptance |
| UX-08 exports/offline | Actual PNG/SVG/JSON, physical DPI and pixel-identical overlaps, bounded 128-cell print page, cancellation, missing artwork, actual cache readiness, delayed writes, multi-window update rejection and stopped-origin editing/export | Physical printer measurement, cross-schema upgrade and browser cache eviction recovery |

The integrated Ubuntu run at `ab86a35` passed 666 Vitest cases across 56 files,
including three new resize lifecycle regressions. All twelve browser journeys
and three export/offline journeys also passed there. That run's jobs still failed
at artifact publication because the upload action excluded the hidden output
directory. The workflow now uses a non-hidden `qualification-artifacts` directory
and still fails if artifacts are missing; exact-head CI remains the landing gate.
Browser runs use real IndexedDB, canvas and local
display transport. Unit mocks are not the basis for the cross-browser claims.
The largest UX-08 raster surface remains 8,415,000 pixels, not an F05
interactive performance measurement.

Commands, ports, selectors and artifact locations are documented in
[DEVELOPMENT.md](./DEVELOPMENT.md#blocking-production-browser-journeys-ux-09).
CI results and source revisions attached to the pull request are the landing
evidence; local macOS results do not establish Linux CI or physical Safari
device qualification on their own.

## Critical keyboard workflows milestone

Second bounded milestone, 2026-09-11, based on `b3a7e94`, merged in #172. It adds the fifth
journey to the existing required browser jobs without introducing a dependency,
weakening a gate or changing project/session schemas.

| Surface | Change |
| --- | --- |
| Notes | Native selection button is separate from the editing form and actions. Spaces and newlines remain input, Enter submits the title form, and Escape cancels the draft. Save/cancel focuses and scrolls the edit action fully into view, including Firefox's short-landscape case. Descriptions preserve line breaks and use readable theme text; labels wrap and badges scale with text. |
| Initiative | Native selection no longer swallows input keys. Enter saves and Escape cancels renaming with focus return; ordinary blur still saves. Visible Up/Down buttons supplement Alt+Arrow and drag ordering. Displayed positions map to original indices when stale IDs are omitted. Reorder status is announced. |
| Modals | One focus primitive covers creation, scene templates and existing dialogs. It excludes hidden/disabled/inert/collapsed controls, contains empty/busy dialogs and restores the opener, remaining sheet or editor fallback. Icon picker contents mount only while open, so its trap registers on every opening. Responsive sheets cannot steal focus from an open dialog. Draft Escape does not dismiss the enclosing sheet. |
| Panel layout | Edit/delete/rename/reorder targets are at least 44 CSS pixels. Notes and initiative use the context panel's outer scroller instead of a squeezed legacy inner scroller. Below 501 pixels in viewport height, Close panel scrolls with content rather than covering the focused action. |
| Run | Current round and turn form a named, atomic polite live region. Existing keyboard coordinate controls and session persistence are unchanged. No new private data enters player projections. |

The browser journey is deliberately pointer-free after file-picker fixture setup:
creation cancellation, note multiline edits, initiative rename/reorder, scene
templates, nested modal resize, backup download, recovery focus return, reload,
preparation, token movement, next turn, end and resume. It records five viewport
sizes at both 100% and 200% interface text, with focus, actual clipping/hit tests,
edit-target size and scoped note/initiative text contrast. It does not substitute
programmatic focus for keyboard reachability.

macOS WebKit uses its native Option+Tab route to all controls. Firefox's headless
shell does not cycle back from the document edge, so the journey can reverse with
Shift+Tab. Native select type-ahead is used instead of platform-specific Home/End
behavior. These input choices are recorded, not presented as universal browser
defaults. Full browser/OS keyboard settings and screen-reader interaction still
need human qualification.

Housekeeping consolidates duplicate creation focus logic, includes the new
journey in the existing lint scope, updates contributor/user guidance, and
corrects #171's stale pending-merge status. The 73-warning hook baseline remains
unchanged. Local artifacts stay outside the repository; CI retains them through
the existing upload step.

### Local candidate evidence

The integrated production run passed all fifteen UX-09 journey/engine cases.
After the final label/badge sizing adjustment, the keyboard journey passed
again in all engines. The UX-08 export/offline/update journey also passed in all
three engines. The full Vitest run passed 683 cases across 58 files, including
17 new keyboard/focus regressions; the targeted nine-file set passed 82 cases.
Build and the existing lint gate pass without adding to the 73-warning ceiling.
Existing jsdom navigation warnings remain outside this milestone.

| Engine | Version | Keyboard journey | Note layout cases | Lowest sampled text contrast |
| --- | --- | --- | --- | --- |
| Chromium | 151.0.7922.34 | Passed | 10 | 10.61:1 |
| Firefox | 153.0 | Passed | 10 | 10.61:1 |
| WebKit | 26.5 | Passed with macOS Option+Tab | 10 | 10.61:1 |

The contrast samples are note labels, descriptions and badges plus initiative
names/order in the fixture's default UI theme. They are not every theme, state
or interface element. Layout evidence checks the full edit-button rectangle
against clipping ancestors and its actual hit target, not just viewport bounds.
This caught a legacy inner scroller and a sticky close button covering actions
in short landscape windows. Independent review also caught the initially closed
icon picker's missing trap registration; its open/resize/close lifecycle now
has a focused regression.

Artifacts are under the session's `files/ux09-release-candidate`,
`files/ux09-final-layout` and `files/ux08-regression` directories. Exact-head
GitHub CI remains the landing gate; local macOS results do not establish Linux,
physical-device or assistive-technology acceptance.

## Dense-map diagnostic milestone

Third bounded milestone, 2026-09-11, based on `54741da`. The owner selected F05
performance work, explicitly declined to designate this unusually powerful
development Mac as the reference desktop, and then approved bounded closeout
with the cursor fix and measured renderer backlog rather than extending into
a larger renderer rewrite. **Reference-device acceptance remains open.**

`src/test/denseMapFixture.mjs` now supplies F05 v1: 128 x 128 cells, 100 tokens,
200 furnishings, 100 notes, derived room/river geometry, dynamic fog, lights
and art enabled. `ux09Performance.spec.mjs` adds a production import/reload,
hover/paint/token/pan diagnostic plus a delayed-draw probe regression to the
existing three-engine runner and required browser jobs. Durable edits and
single-action undo are assertions; latency remains diagnostic, not a CI
performance certification. No dependency, schema, rendering cache or additional
production raster allocation was introduced.

The reproduced product defect was full map/art repainting for coordinate-only
cursor HUD updates. `MapCanvas.tsx` now depends on cursor position only when
the selected tool actually paints a cursor preview: marker, light, clipboard
selection or an in-progress polygon. Paint/drag edits still redraw normally.
Five component regressions preserve the HUD/no-redraw contract and the four
live preview cases, alongside the existing pointer-cancellation tests.

### Local observations

Host: Apple M5 Max, 64 GiB RAM, macOS, 1440 x 900, DPR 1. These are headless
desktop observations, not typical-user, physical Safari or mobile results.
The fixture uses 32-pixel cells, so the main raster is 4096 x 4096 even when
the map is fitted to the viewport. No detail settings were reduced.

The initial frame-only Chromium probe recorded hover p95 values of
251.5, 259.6 and 256.0 ms across three repetitions. Profiling identified
`drawDitherEdge` / native `fillRect` calls as the largest painting cost, with
Folio strokes and furnishing rendering also contributing. Removing the
unnecessary hover repaint does **not** fix those costs during actual edits.

The finalized probe waits for synchronous canvas drawing before its frame
opportunity for paint/token edits. An earlier frame-only probe was discarded
for edit comparisons because CPU throttling exposed frames occurring before
React's delayed drawing effect. A deliberate delayed-draw regression protects
against that misleading low-latency result.

The table gives the range of each repetition's p95, not an average or pooled
percentile. All three repetitions are retained, including the profiled first
Chromium run. Warm-ready figures are navigation-to-driver-observed readiness,
including saved-state checks and a frame opportunity, not a shell-ready mark.

| Engine / version | Hover p95 ms | Paint-drag p95 ms | Token-drag p95 ms | Pan p95 ms | Warm-ready seconds |
| --- | --- | --- | --- | --- | --- |
| Chromium 151.0.7922.34 | 5.9-16.8 | 261.1-269.5 | 258.8-263.8 | 12.0-12.7 | 1.48-2.00 |
| Firefox 153.0 | 7-13 | 265-268 | 261-268 | 13-14 | 1.24-1.25 |
| WebKit 26.5 | 31-33 | 199-212 | 201-210 | 37-39 | 1.47-1.49 |

Each repetition retains 24 hover/paint-drag/pan samples, twelve token-drag
samples and separate start/commit samples with their maxima. Chromium's
unprofiled final repetitions had hover p95 of 8.5 and 5.9 ms; its profiled
first repetition was 16.8 ms. Do not turn these into a physical latency,
refresh-rate or representative-device claim. The painting bottleneck is
still present even on this high-end host.

The initial candidate at `5241fe0` completed all six diagnostic/probe cases.
Local evidence is in this session's `files/f05-final` directory. Earlier
`f05-baseline`, `f05-profile` and `f05-candidate` evidence is retained separately;
do not mix their different probe revisions into one benchmark population.
Reproduction commands, sample semantics and artifact names are in
[the development guide](./DEVELOPMENT.md#dense-map-performance-diagnostics-f05).

That candidate's 4x CPU-throttled Chromium stress run **failed its existing
180-second limit** during the third repetition. Its first two completed
repetitions recorded paint-drag p95 of 1139.5/1117.2 ms, token-drag p95 of
1174.8/1109.3 ms, hover p95 of 11.7/10.8 ms, and warm-ready times of
5.14/5.05 seconds. These are partial observations, not a completed three-run
result or an estimate of a typical device. `files/f05-throttled-final`
retains the explicit incomplete result, two completed repetitions, CPU profile,
timeline and timeout trace. The earlier frame-only throttled run also timed
out; its misleading paint-drag timings are superseded, not improvement evidence.
No timeout, sample count, assertion or roadmap threshold was relaxed.

### CI follow-up: independent repetitions

The required Linux WebKit job for `5241fe0` then exposed the same workload
partitioning problem without artificial throttling. On its AMD EPYC 7763
runner, the first complete repetition reported paint-drag p95 of 2447 ms,
token-drag p95 of 2456 ms and warm-ready time of 4.70 seconds. The test timed
out during painting in repetition two because all three repetitions shared
one 180-second journey budget. The five existing workflow journeys and the
delayed-draw probe passed; this was not an assertion failure in those flows.

Each repetition is now an independent test with fresh browser storage, the
same full F05 import, one warm reload, and all of its original samples and
assertions. Each retains the runner's three-minute per-test limit; the
twenty-minute suite limit, serial execution, zero retries and blocking CI
remain unchanged. The complete diagnostic still requires all three repetitions
plus the delayed-draw probe. Individual reports identify the repetition and
the required total of three, and keep failures explicit. This changes workload
isolation, not the recorded per-action latency or a release acceptance target.

The earlier local and failed-CI evidence remains historical; do not relabel it
as a successful run of the independently isolated harness. Source revision,
test name and repetition metadata distinguish the two arrangements.
Linux's multi-second edits reinforce the still-open renderer bottleneck and
the owner's decision not to qualify performance using the high-end Mac.

The independent-repetition candidate completed the delayed-draw probe and
all three repetitions locally with 4x Chromium CPU throttling. Each repetition
took about 1.1 minutes, within its unchanged limit; the complete run took
3.3 minutes. Every original sample and persistence/undo assertion was retained.
Paint-drag p95 remained 1100.9-1112.8 ms and token-drag p95 1081.9-1126.4 ms.
This is successful collection of slow results, not a renderer improvement.
Artifacts are in `files/f05-ci-fix-stress`; the new head's Linux CI remains
the landing gate.

## Bounded edge-strip cache milestone

Fourth bounded milestone, 2026-09-11, based on `7130a7f` after #174 merged.
The owner selected a 16 MiB edge-strip cache, not the broader static/dynamic
renderer invalidation redesign. There are no dependency, schema, artwork,
export-policy or release-threshold changes.

### Renderer and memory contract

`EdgeBlendCache` in `src/utils/edgeBlend.ts` retains only dither strips in
at most sixteen RGBA canvas pages, each no larger than 512 x 512, per mounted editor: **16 MiB of
raw raster storage**, with an independent **16,384-entry metadata limit**.
It allocates pages on demand, never a second full-map image. These bounds
do not include browser/GPU copies, object overhead, the existing main canvas,
paper texture or other renderer allocations, and are not a total process-memory
guarantee.

Edges are identified by cell and direction. Every traversal rechecks derived
geometry, semantic neighbor types and the resolved neighbor color. A changed
color replaces that strip in place; removed edges are not replayed. Token,
fog and selection changes reuse unaffected strips. Scale, cell size, intensity
or opacity changes clear the atlas. Project/level, map dimensions, theme,
custom-theme definitions, viewing role and unmount also release it; disabling
blending or entering print mode releases it rather than retaining unused pages.

Capacity overflow draws directly with the original detail. Admission stops
instead of evicting an entire traversal's working set on every frame. High-DPR
maps therefore get fewer cached edges, not lower-resolution art. Non-dither
styles, oversized strips, non-pixel-aligned transforms and unsupported drawing
state keep the direct path. Export/player-projection renderers do not request
this editor cache and retain their existing resolution-independent path.

An initial candidate exposed a startup regression, particularly in WebKit:
alternating a strip write with an atlas read caused expensive source
synchronization/copying. The final implementation populates all missing strips
before compositing them in the original order, and avoids clearing fresh slots.
A regression asserts that all atlas writes finish before the first read.
The superseded `files/f05-final` and `files/f05-stress` observations are not
the final loading results below.

### Art and behavior evidence

The seeds, dot positions, edge order, colors and opacity formula are unchanged.
Intermediate RGBA8 compositing is **not byte-identical** to drawing every
individual dot onto the final background. The new three-engine browser test
compares 192 cases per engine across cell sizes 8/32/64, DPR 1/1.25/1.5/2,
light/dark backgrounds, cold/warm caches, painting/undo, derived rooms/rivers,
theme changes and intensity/opacity changes.

An independent full-size, per-edge compositing oracle detects misplaced,
clipped or stale atlas strips, allowing two channel levels for device-origin
coverage/compositing rounding. The original direct renderer comparison allows
at most 8/255 per channel and mean error at most 0.25/255. Measured maxima were
7/255 in Chromium/Firefox and 5/255 in WebKit, with maximum mean error below
0.237/255. These explicit rasterization tolerances replace an initial,
unsubstantiated 3/255 test assumption, not any existing release gate.

The bounded F05 allocation case traverses the complete derived fixture with a
small destination canvas, separately from the real full-size interaction
diagnostic. All engines recorded:

| DPR | Retained edges | Direct overflow per traversal | Atlas raw raster |
| --- | --- | --- | --- |
| 1 | 12,268 | 0 | 16 MiB |
| 2 | 3,584 | 8,684 | 16 MiB |
| 3 | 1,760 | 10,508 | 16 MiB |

An unchanged second traversal performs no new strip rasterization or page
allocation. Unit/component regressions cover color replacement, custom
semantics, removed boundaries, settings/DPR, capacity, metadata bounds,
oversized strips, token/fog reuse, project/theme/role changes and disposal.
Existing cursor-preview and gesture-cancellation cases remain intact.

### Local measurements

Same development host and F05 v1 as above: Apple M5 Max, 64 GiB, 1440 x 900,
DPR 1, full detail. All three independent repetitions and every existing
sample/persistence/undo assertion were retained. Ranges are repetition p95
values, not pooled percentiles. Chromium repetition one is profiled in both
the baseline and candidate. No representative hardware acceptance is claimed.

| Engine / version | Hover p95 ms | Paint-drag p95 ms | Token-drag p95 ms | Pan p95 ms | Warm-ready seconds |
| --- | --- | --- | --- | --- | --- |
| Chromium 151.0.7922.34 | 4.6-15.9 | 150.2-158.6 | 148.8-157.5 | 11.9-12.1 | 1.49-2.01 |
| Firefox 153.0 | 13-14 | 158-192 | 156-159 | 13-14 | 1.24-1.25 |
| WebKit 26.5 | 30-38 | 88-93 | 84-86 | 36-41 | 1.47-1.50 |

The fresh Chromium baseline in this session recorded paint p95 261.9-266.8 ms
and token p95 254.4-257.8 ms: approximately **40% lower edit latency**.
Firefox/WebKit's earlier direct-renderer numbers remain historical comparisons,
not fresh same-session baseline runs. The Firefox 192 ms repetition is retained,
not discarded. Chromium's first synchronous drawing stack after reload rose
from 1.02-1.04 seconds to 1.08-1.09 seconds while populating the bounded cache.
Warm readiness includes polling overhead and one 2.01-second result; do not
claim a loading-target pass.

The complete final 4x Chromium CPU stress run took 2.3 minutes, with each
repetition inside its unchanged three-minute limit. Paint p95 was
632.4-653.1 ms, token p95 615.0-637.2 ms, and warm readiness 5.09-5.56 seconds.
These are still slow results, not typical-device estimates or mobile acceptance.

The integrated pre-batching candidate passed all 33 browser cases and all
three UX-08 export/offline journeys. After correcting atlas population, all
18 targeted renderer/F05 cases and four Chromium stress cases passed again,
along with 84 targeted unit/component cases. Evidence is under this session's
`files/f05-baseline`, `files/f05-batched-final`, `files/f05-batched-stress` and
`files/ux08-regression`. Raw reports identify the base revision and dirty
working tree; the PR identifies the committed patch. Exact-head CI remains
the landing gate, with no skipped checks, relaxed samples or timeout changes.

### CI follow-up: small-map atlas surfaces

The first Linux run at `e51d702` passed the build, Chromium and Firefox jobs,
and ten of eleven WebKit browser cases. The pixel comparison failed only for
8-pixel cells: cached versus isolated-edge differences reached 55/255, while
all 32/64-pixel cases remained inside the existing 2/255 oracle bound.
This is a rendering discrepancy, not a reason to loosen that bound.

Atlas page dimensions now also stop at the map's physical backing dimensions,
so a small map does not force its edge rasterization onto a larger 512-pixel
surface. Canvas raster backends can differ with surface size. This is a shared
renderer change, with no browser/OS branch. The sixteen-page and 16 MiB limits,
the full-size F05 atlas layout, and every existing pixel assertion are unchanged.
A new regression checks rectangular small-map pages and disposal on resize.
The custom-semantic cache fixture retains both edge assertions using an empty
second row so the strips and their gutters fit the smaller surface.

All six renderer browser cases pass locally after this correction, alongside
41 targeted unit/component cases and the existing build/lint gates. Linux
confirmation is pending the new head's CI. Failure artifacts remain in
`files/ci-webkit-failure`; local corrective evidence is in `files/ci-small-atlas-fix`.

### Next bounded performance work

Profile the remaining full tile, furnishing and lighting redraws before choosing
another bounded optimization. A static/dynamic-layer and dirty-region redesign
is a separate, larger scope requiring explicit agreement on invalidation and
memory budgets. Preserve fog, derived geometry, cursor previews, undo and export
behavior; do not silently reduce detail or add unbounded full-map bitmaps.
The 100 ms desktop, 150 ms mobile and two-second warm-launch targets remain
unchanged and unaccepted. CPU throttling is only a stress probe; reference
hardware, physical input-to-paint tracing, mobile/detail policy, memory
pressure, cold/offline loading and F05 high-resolution export remain open.

## Remaining release gates

Subsequent housekeeping removes 68 of the original 73 hook warnings and
19 dependency-rule suppressions from map-state, level-management and history
hooks. The current lint allowance is five warnings, confined to `App.tsx` and
`MapCanvas.tsx`. History helpers now have stable identities; editing callbacks
declare current dependencies while preserving per-level undo and stale-project
callback rejection. The counts above describe the earlier milestone evidence,
not the current warning baseline.

UX-09 remains **in progress**. These automated journeys cover parts of roadmap
section 8, not the entire nine-journey/seven-fixture acceptance matrix.
UX-07's full art catalog and launch assets remain incomplete. UX-00 participant
research remains deferred with zero participants.

Human keyboard/screen-reader review (VoiceOver/Safari and NVDA/Firefox), WCAG
2.2 AA evaluation beyond the scoped panel checks, the full-app layout/zoom matrix, physical touch/pen/keyboard behavior,
printed-paper scale, reference-device selection and F05 input-to-paint/loading
budgets are still open. Local F05 diagnostics above do not close those gates.
No latency threshold or usability success rate is
claimed from test-run duration. Existing React `act` and jsdom navigation
warnings are not silently presented as a warning-free unit-test baseline.

## Rollout and rollback

There is no data schema, serialized project, artwork or service-worker policy
change. Keep both required checks strict and up to date on the default branch.
Older PR branches must update to include this workflow before merging; a missing
required browser check should block, not be bypassed.

Revert a problematic product change through a reviewed PR while retaining the
qualification jobs. A full rollback to a pre-UX-09 workflow would stop emitting
**Browser qualification**; restoring that workflow and changing the server-side
required-check policy must therefore be a deliberate coordinated operation,
not an emergency silent weakening. Preserve project backups and follow UX-08's
explicit saved-workspace update process for any deployed rollback.
