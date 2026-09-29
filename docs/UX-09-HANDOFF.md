# UX-09: Accessible workflows and release gates

First bounded milestone, 2026-09-11, based on `a38ea34`, merged in #171. The owner selected
automated browser journeys and enforced CI gates before remaining UX-07 art
work. This starts UX-09; it does not complete its release acceptance.

**Launch-scope decision, September 15, 2026:** The owner approved desktop-first
early access with **physical A4/Letter printing included**. The
[roadmap release milestones](./USER-EXPERIENCE-ROADMAP.md#release-milestones-and-ownership)
now separate UX-09A early-access closure, UX-09B broader device/assistive
qualification and UX-09C observed usability. Agents lead A, but outstanding
owner artwork approval and real-paper qualification remain pre-launch gates.
This documentation decision does not pass any unassessed gate or change the
existing performance targets. Earlier milestone results below retain their
original scope and source revisions.

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

All six renderer browser cases passed locally after this correction, alongside
41 targeted unit/component cases and the existing build/lint gates. Linux CI
at `c08e327` reduced the worst oracle difference from 55/255 to 5/255, but
still failed the unchanged 2/255 bound for small maps. Failure artifacts remain in
`files/ci-webkit-failure`; local corrective evidence is in `files/ci-small-atlas-fix`.

### CI follow-up: device-pixel compositing

The remaining Linux WebKit discrepancy is not hidden with a larger tolerance.
Cached strips now copy directly in physical pixel coordinates with equal source
and destination extents, instead of dividing their dimensions by DPR and
scaling them back through the destination transform. The copy preserves the
integer viewport translation and restores the caller's drawing state. It also
retains the caller's image-smoothing setting rather than forcing a different
sampling path from the independent oracle.

The added regression requires integer source/destination rectangles, equal
pixel extents, retained translation and balanced context restoration. All
42 targeted unit/component cases and nine local browser cases passed, covering
the unchanged pixel matrix and cache bounds plus one full F05 repetition per
engine. That repetition's paint/token p95 values were 156.1/148.6 ms in
Chromium, 162/158 ms in Firefox and 90/93 ms in WebKit. This is a targeted
regression observation, not a replacement three-repetition benchmark.
The build and existing lint gate pass; Linux confirmation remains pending the
new head's CI. Evidence is in `files/ci-device-pixel-fix` and
`files/ci-webkit-small-atlas`. No samples, thresholds or timeouts changed.

### CI follow-up: bounded pixel diagnostics

Linux run `34700570563` at `f9d063e` retained the same 192 measurements as
`c08e327`, including 54 small-map oracle failures (maximum 5/255). Browser
qualification is a cascade of the WebKit journey failure, not a separate cause.
The renderer is unchanged in this diagnostic follow-up.

After the original comparisons, a failure in any engine attaches
`edge-blend-diagnostics` JSON for two 8px cases at different DPRs and one matching
32px control. At most four edges per case expose actual atlas/source rectangles,
context attributes, exact vector commands, worst-pixel crops, transparent
alpha/premultiplied deltas, same-surface translation replays, and full-source
versus cropped-source compositing. Source reads occur after diagnostic blits.
The original matrix, inputs, assertions, F05 harness and CI timeouts are unchanged.
For local validation only, set `QA_EDGE_BLEND_DIAGNOSTICS=1` alongside `QA_OUTPUT`
when running `npm run test:browser:run -- src/test/ux09EdgeBlend.spec.mjs`.
This forces evidence collection, never changes the pass/fail bounds, and is not
Linux reproduction or a claim that CI is fixed.

The forced local pass completed all six renderer/allocation cases across the
three engines. All selected diagnostic replays matched their original case's
isolated maximum, direct maximum and direct mean. Focused lint and strict
type-checking of the test-only harness also passed.

Run `34701738152` reproduced the 54 Linux WebKit failures and showed identical
visible source pixels but source-rectangle-dependent compositing. The follow-up
adds a test-only whole-atlas copy, shifted by destination minus source offset
and clipped to the destination strip. The same three cases/four inspected edges
report per-edge deltas against the cropped atlas and full-map oracle, plus
all-edge composed deltas and a small worst-pixel crop. `composedReplay.atlasVsCached`
checks that the source-subrectangle replay reproduces the measured cached image.
All source consumers finish before diagnostic source readbacks. This alternative
is evidence only, not a replacement gate or a production fix; Ubuntu must still
establish whether it removes the rounding difference.

The forced Mac comparison passed all six browser/allocation tests, with all 192
original measurements per engine identical to the pre-change baseline. Both
atlas replays matched the cached image exactly in all nine selected cases.
Diagnostics took 80-130 ms; focused lint and strict harness type-checking passed.

### CI follow-up: clipped whole-atlas compositing

Ubuntu run [`34702635983`](https://github.com/evillollive/Dungeon-Mapper/actions/runs/34702635983)
at `b110564` confirms the same PR-caused WebKit pixel failure: 54 small-map
cases exceed the isolated 2/255 bound, with maximum 5/255. Direct-renderer
maximum 6/255 and mean maximum 0.217/255 still pass. Browser qualification
fails only because it aggregates that job. Build/test, Chromium and Firefox
pass; all ten other WebKit cases pass. No transient or pre-existing check
failure was found.

The three diagnostic replays exactly reproduce the original measurements,
and every cropped all-edge replay matches its measured cached image.
For the two failing selected cases, source pixels are identical but cropped
source copies introduce per-edge compositing differences. Clipped whole-atlas
copies eliminate those per-edge differences, reducing the composed isolated
maxima from 5 to 1 (8px/DPR 1) and 4 to 1 (8px/DPR 1.5). The 32px control
is unchanged at 1. This supports changing the copy operation, not the
rasterization, art, oracle or tolerances. It is bounded evidence for these
cases, not yet a passing Linux production-head matrix.

Production now clips a whole-page copy to the physical destination strip and
shifts it by destination minus source offset. Each admitted entry retains one
rectangle-only `Path2D`, reused across hits/color changes and released with the
entry. This stays within the existing 16,384-entry bound, adds no raster pages,
and preserves the caller's current path as well as drawing/clip state.
There is no browser-specific branch. Diagnostics understand the whole-page
call and report `clippedAtlasVsCached` as its replay-fidelity check.

Local validation passes 42 targeted unit/component tests, strict harness
type-checking, build, and lint with the same five existing warnings. Fifteen
three-engine browser cases cover all 192 unchanged pixel measurements per
engine, eight physical-placement/clip/path/state scenarios per engine,
unchanged F05 allocation limits, delayed-draw probes, and one complete F05
repetition per engine. Isolated maxima are 2/2/0 for Chromium/Firefox/WebKit;
direct maxima are 7/7/5, with mean maxima below 0.237. All nine selected
diagnostic replays are faithful. DPR 1/2/3 retained-edge/overflow counts and
16 MiB raster limits are unchanged, without warm traversal raster/path churn.

Focused before/after observations on the same M5 Max/64 GiB development host
retain every interaction and persistence/undo assertion. Paint/token p95 ms:
Chromium 156.2/151.2 to 159.6/155.2; Firefox 161/159 to 159/149; WebKit 102/106
to 98/90. This single paired repetition indicates the cache benefit remains,
not statistical equivalence or reference-device acceptance. Candidate
warm-ready times are 2.03/1.33/1.58 seconds; release targets remain open.
Evidence is in `logs/ci-clipped-ubuntu-34702635983`,
`logs/ci-clipped-copy-baseline` and `logs/ci-clipped-copy-candidate/validation.json`
in the follow-up worktree. The exact production-head Ubuntu checks remain
pending after push; no assertions, F05 samples, CI settings or timeouts changed.

## Bounded Folio floor-path milestone

September 14, 2026, based on `e6c0b11`. The unchanged F05 Chromium profile
identified repeated Folio tile drawing as the largest remaining art cost:
approximately 1,977 ms inclusive across the profiled interaction sequence,
including 1,821 ms in shape drawing and its native Canvas calls.

`src/themes/folio-v1/tileCache.ts` now reuses only the four variants of
flagstone, worn wood and earth floors in `MapCanvas`. Walls, water, symbols,
other themes and all export renderers keep their direct drawing paths. The
versioned artwork, source fingerprints, map schema, fog policy, derived geometry,
furnishings, lighting and gesture/undo implementation are unchanged.

### Admission, memory and fidelity

Each editor owns at most **twelve variants and 56 native `Path2D` objects**.
The cache retains immutable line/circle paths and rectangle commands. It
creates no canvases, bitmaps, image copies or additional raster pages.
The existing edge cache's 16 MiB raw raster ceiling is unchanged; native path
storage is separately bounded by object count, not an asserted byte estimate.

Floors are drawn into the original destination context, preserving primitive
order, materials, contours, resolution and caller compositing. Size changes
refresh the detail tier. DPR and transforms are applied at drawing time without
raster resampling or a high-resolution cutoff. Project/level changes,
dimensions, themes, audience, print mode and unmount release retained paths.
Token movement, fog, painting and undo reuse artwork, never cached map state.

**Rejected bitmap approaches and Linux investigation:** CI run `34837437995`
at `0ce50af` exposed Linux WebKit floor-sprite differences up to 14/255.
Uniform backing surfaces in `34690f7` did not solve the pixel mismatch and
introduced a performance regression in run `34838899112`: all three F05
repetitions exceeded their unchanged 180-second limits. Traces show
3.6-3.9-second drawing waits, not missing commit events.

The owner explicitly approved a focused Linux investigation after that bounded
pass was paused. Diagnostics in run `34840840359` vary backing size,
`willReadFrequently`, source origin and whole/clipped/cropped copies.
Changing copy mode or normalizing geometry does not remove the differences.
Rasterization changes with surface size and readback hints; drawing at the
original origin on an equally sized surface reproduces the reference.
That does not justify allocating full-map buffers for every tile variant.
Both sprite implementations are therefore replaced, not conditionally shipped.
There is no browser/OS branch, no main-canvas backend change and no relaxed
image tolerance. The reusable native-path approach avoids cross-surface
rasterization entirely.

The new blocking browser matrix compares direct and cached rendering for
210 combinations per engine: 8/32/64-pixel cells, DPR 1/1.25/1.5/2/3,
transparent and paper backgrounds, cold/warm traversal, paint/undo, materials,
derived room/river geometry and a dense floor grid. Alpha must match exactly;
RGB allows one 8-bit rounding step, with mean error at most 0.01/255.
Local native-path maxima are 0/0/0 for Chromium/Firefox/WebKit, with zero alpha
or mean difference. Eight additional scenarios per engine cover physical
translation, clipping, caller state and cold/warm path reuse.

### Comparable local observations

Both baseline and final runs use the unchanged F05 diagnostic, three
independent repetitions per engine, identical samples and persistence/undo
assertions, 1440 x 900, DPR 1, and no CPU throttling. Host: Apple M5 Max,
64 GiB, macOS kernel 25.6.0. Browsers: Chromium 151.0.7922.34,
Firefox 153.0 and WebKit 26.5. These are ranges of repetition p95 values,
not pooled statistics or representative-device acceptance.

| Engine | Paint p95 before / after (ms) | Token p95 before / after (ms) | Warm-ready before / after (s) |
| --- | --- | --- | --- |
| Chromium | 153.2-161.7 / 150.6-151.8 | 151.8-157.4 / 143.8-157.0 | 1.49-1.54 / 1.49-2.00 |
| Firefox | 158-193 / 140-143 | 164-204 / 138-144 | 1.25-1.27 / 1.24-1.25 |
| WebKit | 91-99 / 77-79 | 84-98 / 76-86 | 1.49-1.54 / 1.47-1.53 |

Chromium repetition one is profiled in both runs; its paint/token p95 changes
from 157.3/157.4 to 150.6/147.2 ms. The two unprofiled repetitions change from
161.7/151.8 and 153.2/153.1 to 151.6/143.8 and 151.8/157.0 ms.
Chromium's improvement is modest and token p95 is mixed; its last token
repetition is slightly slower. Firefox and WebKit paint p95 are consistently
lower in this local sample. This is not a universal speedup or a 100 ms
desktop-target pass. Earlier approximately 20% Chromium figures described
rejected raster prototypes and must not be attributed to the native-path change.

Chromium's warm-ready proxy remains variable, including one repetition at
2.00 seconds. It includes browser-driver assertions as well as drawing.
No startup improvement or loading acceptance is claimed.

The current native-path candidate passes 82 focused unit/component cases,
strict harness type-checking, lint/build, nine floor browser cases and all
twelve F05 cases locally. Raster-specific allocation tests have been replaced
with path-count, no-canvas-allocation, high-resolution and caller-alpha coverage.
The original pixel matrix, clip/state scenarios, F05 samples, timing targets,
retries and timeouts remain unchanged. WebKit runs the pixel matrix as an early
CI preflight; failure blocks the job before expensive full-suite execution.
Passing it still requires the full unchanged browser and UX-08 suites.

Current artifacts: `files/perf-baseline`, `files/floor-vector-final` and
`files/perf-vector-final`. Rejected approaches and diagnostics remain in
`files/ci-webkit`, `files/ci-webkit-surface`, `files/ci-floor-diagnostics`,
`files/floor-surface-fix` and `files/perf-surface-fix`.
Exact-head remote CI remains the landing gate. UX-09 and human/device
release qualification remain open.

### Next bounded performance work

Re-profile the remaining non-floor tile, furnishing, edge and lighting redraws
before choosing another bounded optimization. Investigate the Chromium
warm-readiness interval separately from first-draw time. A static/dynamic-layer and dirty-region redesign
is a separate, larger scope requiring explicit agreement on invalidation and
memory budgets. Preserve fog, derived geometry, cursor previews, undo and export
behavior; do not silently reduce detail or add unbounded full-map bitmaps.
The 100 ms desktop, 150 ms mobile and two-second warm-launch targets remain
unchanged and unaccepted. CPU throttling is only a stress probe; reference
hardware, physical input-to-paint tracing, mobile/detail policy, memory
pressure, cold/offline loading and F05 high-resolution export remain open.

## Hook and performance PR cleanup

Bounded cleanup, 2026-09-12, based on `9dd4b10` after #175. The five remaining
hook dependency warnings are resolved and `npm run lint` now permits zero
warnings. Selection callbacks track their current project/scope, the canvas
selection key listener uses its current owner, draft cancellation/completion
declare the stable paint-cell ref, and pointer movement drops an unused zoom
dependency. No lint rule or browser gate is disabled.

Older performance PRs are reconciled in this cleanup rather than merged onto
newer canvas code unchanged:

| PR | Reconciled behavior |
| --- | --- |
| #155 | Preserve cursor-position identity within a tile. #174 already avoids ordinary cursor-only art redraws, but marker, light, clipboard and polygon previews still benefit from this additional guard. Crossing a tile boundary continues updating the preview and HUD. |
| #164 | Remove full-map JSON serialization from draft completion and skip identity-no-op stages. Unlike the original proposal, compare changed branches through structural sharing so dragging a token, stamp or river back to its origin still creates no commit. Unchanged map branches and tile rows are not traversed. |

Regressions cover all four preview tools, replacement selection callbacks,
serialization-free completion, untouched branch/row access, identity no-ops,
repeated completion, changed object keys and return-to-origin moves. Existing
gesture interruption and single-commit behavior remain intact. This is not a
new renderer architecture or a claim that F05 release targets are met.

Local candidate evidence: 72 cases in eight targeted Vitest files, the
zero-warning lint gate and production build pass. Twelve browser cases cover
editor navigation, keyboard workflows, the delayed-draw probe and one complete
F05 repetition per engine in Chromium, Firefox and WebKit. This focused run is
not a three-repetition benchmark or full release qualification. Artifacts are
in the cleanup session's `files/cleanup-browser` directory. Exact-head required
CI remains the landing gate.

## Library and recovery regression milestone

September 15, 2026, based on `c72371c` after ART-06/08 merged in #181.
The owner selected a bounded, low-input follow-up: promote selected Library
and recovery invariants from the standalone development-server qualification
into the existing required production-browser jobs.

`src/test/ux09Library.browser.mjs` registers nine independent cases through
`ux09.spec.mjs`. The existing runner owns their pages, contexts, teardown,
traces, screenshots, result attachments and all-tab error capture. The
creation journey's native IndexedDB reader is reused for durable-state
assertions. No application API, storage schema, artwork, rendering cache,
dependency, retry policy or CI timeout changes.

| Cases | Production assertions |
| --- | --- |
| Rich duplication | Distinct local identity/revision, complete two-level content and asset equality, portable provenance, copied tags, no copied previous-save/checkpoint records, exact source/checkpoint preservation after copy edits, real private JSON download |
| Archive and Trash | Cancel writes nothing; reload and restore preserve identity/content/tags/recovery copies; no Open control for non-active records; confirmed permanent deletion removes only the target's current/previous/checkpoint records |
| Competing Library tabs | Stale metadata and duplication fail visibly without writing or leaving an orphan copy; refresh shows the winning title |
| Four stale-editor variants | Rename, archive, Trash and deletion in a second tab invalidate the old editor revision; stale saves cannot overwrite or resurrect the durable project; latest unsaved work remains downloadable |
| Failed duplicate opening | A native read fault after commit leaves exactly one durable copy in the refreshed Library; reload and retry open that same identity |
| Failed save | Native quota faults roll back the complete transaction, including the previous-save slot; repeated retries remain failed; backup retains newer edits; successful retry, reload and Library reopen preserve the latest intended work |

Fixtures enter through the public import UI; retained predecessors/checkpoints
are created through the actual recovery UI. Native storage reads observe
committed state rather than replacing repository functions. The two fault
cases count page-scoped native `get`/`put` failures and restore the methods
in `finally`. This is injected transaction failure, not physical disk exhaustion,
OS interruption or natural storage eviction.

The first Chromium pass exposed two new-harness mistakes: an unscoped saved
status locator matched both header and dialog, and stale duplication used the
metadata-conflict message rather than its own source-conflict message. Those
selectors were corrected without changing product behavior or assertions.
The cross-engine pass also confirmed that restoring the unavailable current
project remounts the Library in Recent maps. The journey now asserts committed
active status and explicitly reselects Archive/Trash before checking absence,
rather than mistaking the restored Recent card for a failed restoration.

The final local production run on the merged ART-06/08 baseline passed all
27 new case/engine combinations plus the three existing guided-creation cases
that share the storage reader: 30 cases in 2.4 minutes. The zero-warning lint
gate and production build also pass. Evidence is retained in the session's
`files/library-final`, with source metadata identifying `c72371c` plus the
working-tree patch. Earlier failed harness evidence remains in
`files/library-first` and `files/library-three-engine`; it is not passing
qualification. Exact-head required Linux CI remains the landing gate.

The older standalone suite remains available. This milestone does not promote
its entire native repository matrix, failed-startup recovery races, legacy
migration/deletion tombstones, thumbnail failures, or Library-specific
keyboard/reflow checks. It does not qualify human/device, cross-schema update,
physical printing, or performance acceptance. Commands and artifact handling
are in [Development](./DEVELOPMENT.md#library-and-recovery-regression-journeys).

## A-DATA production preservation milestone

September 15, 2026. Implementation and browser cases: `ca0dedb5f5f0fc4e65fca68d53695cc8649be59d`,
based on the owner-approved release ledger at `62e0b95`. Responsible reviewer:
Copilot, using source inspection, production-browser behavior and native
storage assertions. Disposition: **passed** for the bounded cases below on
the recorded local engines; exact-head required Linux CI remains the landing
gate, not a result inferred from local execution.

`ux09Preservation.browser.mjs` promotes ten independent cases from the older
Library/foundations scenarios into `ux09.spec.mjs`. Existing required CI
automatically runs them on every configured engine with the same runner,
three-minute case timeout, twenty-minute suite budget, no retries and all-tab
error capture.

| Cases | Production assertions |
| --- | --- |
| Concurrent migration | Two startup tabs obtain one local identity and revision; IndexedDB takes precedence; rich project data and both original sources remain exact; repeated root startup is idempotent |
| Bare-map migration | Whitespace-bearing localStorage bytes, embedded custom assets and unknown fields survive migration, backup download and reload |
| Migration abort/retry | Aborting after both adds are queued exposes neither project nor marker; the original remains downloadable; Retry restore commits once |
| Two unsupported legacy sources | IndexedDB and localStorage each retain their original through preview cancellation, recovery, original download from Recovery copies and reload |
| Deletion tombstone | A native abort while writing the tombstone rolls back current/previous/checkpoint deletion; retry commits the tombstone; detached in-memory backup stays usable and Library/bare-root reload never resurrect retained sources |
| Failed-startup quota recovery | Repeated checkpoint quota failures preserve identity and every prior record; retry commits the recovered project with exactly one original checkpoint and survives reload |
| Competing recovery | One tab holds a completed native read while another recovers the same source; creation/editing remain unavailable, the stale restore cannot overwrite newer work or add a checkpoint, and original download plus Retry restore remain usable |
| Two unavailable-source variants | Missing and corrupt startup sources survive an alternative disappearing after catalog enumeration; no blank editor or writes appear, and a healthy alternative opens and reloads |

The race revealed a product defect: `recoverFailedProject` turned a clean
failed-startup CAS rejection into ordinary editor conflict state. That exposed
the default blank map and removed Retry restore even though no project had
loaded. The coordinator now stays in failed-startup state with an explicit
retry message when no newer in-memory work arrived. Unexpected pending work
still enters conflict and stops automatic saving, preserving the existing
in-memory recovery contract. Two coordinator regressions cover these distinct
outcomes; existing hook coverage retains the creation-during-recovery guard.
No serialized data, migration policy, artwork or rendering behavior changes.

The final run at `ca0dedb` passed 60 case/engine combinations in 209.8 seconds:
30 new preservation cases, 27 existing Library cases and three guided-creation
cases sharing their storage reader. Environment: macOS 26.6.2, headless locked
Playwright engines, 1440 x 900, DPR 1, production `/Dungeon-Mapper/` assets.

| Engine | Recorded browser version | New A-DATA cases | Related regressions |
| --- | --- | --- | --- |
| Chromium | 151.0.7922.34 | 10 passed | 10 passed |
| Firefox | 153.0 | 10 passed | 10 passed |
| WebKit | 26.5 | 10 passed | 10 passed |

Evidence is retained in session `24484730-7e2b-45b8-a5e8-d25ad816604c`,
`files/data-final/browser-report.json`, its HTML report and per-case
`journey-results`/`page-errors` attachments. Every result records the full
implementation revision above. The first two runs retain harness failures and
the pre-fix blank-editor reproduction in `files/data-first` and
`files/data-second`; those are not passing evidence. `files/data-three-engine`
is the earlier successful patched-tree run. The build, zero-warning lint
and 68 targeted coordinator/hook/recovery component tests also passed.

This closes the bounded A-DATA production coverage gap, not all historical
repository probes or every failure mode of physical storage. The same-tab
unexpected-pending branch is unit-level evidence, not fabricated UI activity
through disabled controls. Cross-version updates, release publication,
performance, art approval, physical printing and broader device/participant
acceptance remain open. A-EDIT's subsequent milestone is recorded below.

## A-EDIT production editing milestone

September 16, 2026. Implementation and browser cases:
`4f3fad334852da61af3af2f8e48815aa4e1f6686`, based on merged A-DATA `72f32e1`.
Responsible reviewer: Copilot, using source inspection, production browser
journeys, native storage observations and focused screenshot review.
Disposition: **passed for the bounded local cases below**. Required exact-head
Linux CI remains the landing gate.

`ux09Editing.browser.mjs` brings critical paths from the standalone
`ux04Editing.browser.mjs` into thirteen independent required cases. It reuses
the existing native IndexedDB reader, Library/backup helpers, keyboard traversal
and contrast calculation. No additional runner, dependency, retry, test timeout
or suite budget is introduced.

| Cases | Production assertions |
| --- | --- |
| Six object variants | Rectangle/ellipse room, polygon, river, note, token and stamp placement; actual keyboard primary-property edit, Apply and Cancel; complete atomic Undo/Redo; no-op Apply; deletion/Undo without stale selection; reload retains content and IDs |
| Object-specific guards | Token picker cancellation creates nothing; note movement maintains tile references; polygon material edits preserve vertices; exact fractional river edits and point removal/Undo; locked stamps require committed unlocking before transforms |
| Overlapping regions | Tiles, notes and stamps move together with retained IDs; unrelated rooms/rivers remain exact; fill/erase/Undo cover the whole selection; edge move controls are disabled |
| Gestures | Native mouse stroke and one-step history; dispatched pointercancel/blur and real Escape discard unsaved previews; visible polygon completion; first token drag does not open a layout-shifting inspector before release |
| Scope and viewport | Exact pan/zoom on Library return and same-tab reload; dirty forms cannot cross levels with equal object IDs, DM view or Library return |
| Preferences | Stamp search/favorites survive reload; an injected localStorage write fault is announced, affects only current-visit favorites and does not block project editing or saving |
| Invalid fields and save failure | Native required/range validation retains the original; quota failure rolls back every storage record; a real backup keeps applied unsaved object content and references; retry, Undo/Redo and reload preserve the intended project |
| Two keyboard layout cases | Note chooser, multiline inspector edits, Apply, Cancel and dirty/clean Escape through real key navigation at 100% and 200% interface text; focus, clipping, hit testing, target size and contrast at seven viewport sizes |

The layout matrix is 1440x900, 1024x768, 768x1024, 390x844, 844x390,
390x460 and 720x450 at DPR 1. The last two are reduced-height and reflow
equivalents, not an OS keyboard or native browser zoom. Each engine records
14 layout observations. Apply has at least a 44x44 CSS-pixel target, an
unobscured solid focus ring of at least 2 pixels, no document horizontal
overflow, and no clipping ancestor or covering hit target. Measured focus
width was 3 pixels; minimum sampled inspector label/help/action text contrast
was 8.39:1 against the 4.5:1 assertion. These are scoped critical-control
measurements, not full interface or WCAG conformance acceptance.

### Defects found and fixed

The legacy inspector had a nested shrinking scroll area inside the contextual
panel. At 844x390 with 200% interface text, keyboard focus reached Apply but
the action was clipped and covered. The inspector now uses the contextual
panel's single scroll area, as notes and initiative already do. In short
viewports its action row is non-sticky, so the focused action can scroll fully
into view. Before/after short-window and reduced-height screenshots were
inspected; the production focus/hit-test assertion reproduces the original
failure without weakening its threshold.

Firefox 153's native `input.valueAsNumber` converts the exact input string
`0.3333333333333333` to `0.333333333333333`. An isolated native input reproduced
the difference. The shared inspector NumberField now parses the original
number string, retaining JavaScript numeric precision while keeping blank
required fields invalid rather than coercing them to zero. Two focused
component regressions cover native-rounding independence and blank-field
validation/cancellation. The same exact fractional browser assertion passes
on all three engines; it was not replaced with a tolerance.

### Revision-linked local evidence

Production assets at `/Dungeon-Mapper/`, macOS 26.6.2, locked headless engines:

| Engine | Browser version | New editing cases | Related existing cases | Duration of selected runner |
| --- | --- | --- | --- | --- |
| Chromium | 151.0.7922.34 | 13 passed | 4 passed | 184.3 seconds |
| Firefox | 153.0 | 13 passed | 4 passed | 180.3 seconds |
| WebKit | 26.5 | 13 passed | 4 passed | 213.2 seconds |

The 51 passing case/engine combinations include the existing shell,
keyboard-critical, publication/preview and two-window session journeys.
The unchanged UX-08 export/offline/controlled-worker journeys also passed
all three engines, retaining player-export sentinels and real downloads.
The production build, zero-warning lint and 41 focused editing/gesture
component cases passed.

Evidence is retained in session `20233d90-7a79-4423-a564-f75af5b08662`,
`files/editing-final-chromium`, `files/editing-final-firefox`,
`files/editing-final-webkit` and `files/editing-final-exports`. The three
runner reports and journey attachments record the implementation revision
above, browser version, results, per-layout measurements and page errors.
Their preview servers used separate strict ports; each runner retained one
worker and no retries. Earlier `editing-keyboard-4` and `editing-firefox`
artifacts retain the pre-fix product failures. Other earlier runs include
harness corrections for native select typeahead, textarea accessible-name
lookup, responsive-mode timing and absent-versus-undefined optional keys.
Content equality uses the portable JSON contract; no-write assertions still
compare raw native records and revisions.

This closes the bounded A-EDIT production gap, not every legacy scenario,
all input devices or full accessibility qualification. Chromium pen/two-touch
dispatch, physical touch/pen, assistive technologies, native zoom, forced-color
qualification beyond existing styling, and participant acceptance are not
promoted to passed by these cases. No project schema, renderer, audience
policy or display/export contract changes. Continue with A-UPDATE's real
application-version upgrade/recovery milestone.

### September 28 local-only correction and reference retention

The September 16 result above is historical macOS evidence, not a passed
Linux qualification. PR #185 is still open at `dbba27f`. In
[run 35037146541](https://github.com/evillollive/Dungeon-Mapper/actions/runs/35037146541),
Firefox passed 58 registered cases and failed the 200% inspector case at
390x460: Apply was partly outside the sheet and viewport. Build/test,
Chromium and WebKit passed on that revision. The Browser qualification
aggregate correctly failed because Firefox failed. The failure is an
application focus defect exposed by the new A-EDIT coverage, not a package
registry, runner or cancellation failure. Rerunning unchanged code is not the
remedy.

The prior investigation left an uncommitted 390x440 regression size and a
viewport-specific assertion message. Both are preserved. The original
production assets reproduce clipping at that size locally in Firefox.
The focus trap advances with `focus()`, which can leave a partly visible
control clipped in Firefox. Keyboard traversal now also calls
`scrollIntoView({ block: 'nearest', inline: 'nearest' })`, matching Notes and
Initiative's existing focus-restoration pattern. Context panels reserve four
pixels of scroll padding for the focus outline. No scripted scrolling is added
to the browser test to conceal the defect, and no assertion, timeout or
qualification requirement is weakened.

The correction is locally committed as
`aa40a14932537ace59c05536a5bd4fd5d99ae41b`. A subsequent test-only commit,
`0d0e0bb5fc1a73b5108da5ff25ae839d4f1d7112`, includes both width and height in
each draft and requires Apply to be enabled. This prevents adjacent 390x440
and 390x460 cases from accidentally exercising a no-op Apply. The retained
eight-size matrix now has sixteen observations per engine.

| Local evidence | Result and applicability |
| --- | --- |
| Original application plus retained 390x440 case | Firefox reproduced sheet clipping at 200%; command failed as expected, not passing evidence |
| `aa40a14`, macOS 26.7, DPR 1, production assets | Four selected journeys per engine passed: both inspector text sizes, existing editor navigation and existing critical keyboard workflows; zero skipped cases |
| `0d0e0bb`, same application build | Both strengthened inspector journeys passed on Chromium 151.0.7922.34, Firefox 153.0 and WebKit 26.5; each size now commits a distinct edit; zero skipped cases |
| Focus trap, inspector and dialog component selection | 31 tests passed, including forward/backward scroll-target assertions; jsdom is not visual scrolling evidence |
| Build and lint | Production build and zero-warning lint passed; no dependencies were installed or changed |

The final inspector results are in `files/zero-actions-applied-{chromium,firefox,webkit}/`.
The September 28 host version above corrects an initially copied 26.6.2 label
to the retained `sw_vers` result, 26.7. September 16's actual 26.6.2 records
remain unchanged.
Existing shell/critical-keyboard results are in
`files/zero-actions-final-{chromium,firefox,webkit}/`. Each browser attachment
records its source commit and browser version. All local runs kept the
existing single-worker, no-retry and timeout settings. The inspector assertions
still require unclipped, hit-testable, viewport-visible focus and at least
44x44 CSS-pixel actions. Minimum sampled contrast remained 8.39:1 and the
focus outline 3 pixels. Selected reduced-height screenshots were inspected.
No OS screen reader, native browser settings or physical-input tests ran.

The shared focus trap affects modal keyboard scrolling, so the existing
critical-keyboard journey was refreshed alongside the inspector matrix. It
includes nested dialogs, export-backup/recovery controls and session actions.
Storage transactions, project schema, numeric parsing, renderer geometry,
player projections and export pixels did not change in this correction.
Their earlier evidence remains applicable to those unchanged implementations,
but is not a new exact-head or release receipt. Renderer, preservation and
UX-08 campaigns were not repeated solely because this CSS/hook changed.
Future full hosted qualification is still required by the existing policy.

Build identity for both final local groups: `App-CCpLUrr1.js`,
`App-THvbwtv0.css`, service worker SHA-256
`0a1c061ddce052e4c2668a0541d8ac82feb680c7d8a06ee8ad4edb3b51fe5a9f`.
The original Linux report records the PR test-merge revision
`bd69b5f5cd70d3b7f66a6f25667b21c9d64d0ab5`, based on main `72f32e1` and PR
head `dbba27f`; it must not be confused with the local correction.

Reference dispositions, recorded before relocating the old untracked folders:

| Material | Disposition |
| --- | --- |
| Original Linux Firefox report, failed-case screenshot/trace, other case artifacts and UX-08 results in `.pr185-check-fix-ci/` | Retain the complete downloaded directory, unchanged, in session `20233d90-7a79-4423-a564-f75af5b08662`, `files/zero-actions-retained-ci/`; do not commit generated reports |
| Earlier font/height/padding screenshots in `.pr185-check-fix-probe/` | Retain unchanged in `files/zero-actions-retained-probes/` as diagnostic references only; screenshots without run/source metadata are not passing qualification |
| September 16 `files/editing-final-*` reports and synthetic fixtures in `src/test/` | Already retained; do not rerun unrelated storage, renderer or export campaigns or delete their evidence |
| New local reproduction | Retain `files/zero-actions-editing-baseline/`, identified as `dbba27f` application code plus the retained 390x440 regression and diagnostics; this is a failed result |
| First corrected local run | Retain `files/zero-actions-editing-candidate/` as a working-tree result, not a hosted receipt |

No original failure or synthetic fixture is discarded. The repository's
existing policy remains: generated local evidence lives in session artifacts;
CI evidence has fourteen-day retention; release evidence must outlive that
window. Relocation preserves content, rather than replacing failure evidence
with a successful report.

The relocation completed without removing evidence. The original Firefox
`browser-report.json` SHA-256 before and after relocation is
`80f03d45bc92c7f2fa7b17936f23bcb5ff07532ef6abfa5ab42cfaf2b4827b39`.
Read-only GitHub run metadata was added beside it, preserving both run-head
and test-merge identities. The screenshots-only probes remain explicitly
non-qualifying. No new evidence framework or test fixture was introduced.

### Zero-Actions roadmap disposition and resume checklist

**Budget and scope:** September 28 task approval is **0 hosted runner
minutes**. This task initiated **0 hosted triggers**, reserved **0 minutes**
and has **0 allowance remaining**. No push, PR mutation, merge, workflow
dispatch/rerun, hosted review/agent, paid-provider call or automation was
requested. Local compute and disk usage were not metered; GitHub account
quota, billed storage/cache usage and other actors' consumption are unknown.
Read-only GitHub queries do not establish a free account balance. Previous
run costs are historical, not spending authorized by this task.

| Remaining work | Owner / dependency / permission | Reusable evidence and smallest next execution | Completion evidence / stop |
| --- | --- | --- | --- |
| Locally completed: A-DOCS | Agent; current UI and documented contracts; publication still requires budget | `d9036c5` updates README, Features, Sharing, help/demo guidance and release notes; targeted help/action cases passed | See the milestone below. Do not repeat the audit or claim release/support approval |
| Bounded local pass: A-UPDATE | Agent; owner still decides supported-version scope and final candidate; publication/hosted integration requires budget and policy scope | Rebuilt deployment source `72f32e1`, candidate `d9036c5`, manual harness `db024ac`; three-engine upgrade/rollback evidence below | Reuse this pair's evidence where applicable. Rerun only for a changed build pair, schema or claim; final release evidence must name the accepted versions. Stop on lossy writes or an unresolved support decision |
| Owner: A-ART and A-PRINT | Owner/reviewer with approved art sheets, printer and print application; agree scale/alignment tolerances before measurement | Existing ART-01/06/08 sheets, F07 and exported A4/Letter files; review remaining art and print actual-size overview/assembled miniature pages | Explicit revision-tied art decisions, measured paper scale/overlap and monochrome acceptance. Remain pre-release blockers, not post-release follow-ups |
| Local analysis plus owner: A-PERF | Agent can profile; owner must identify/approve reference hardware and any support-scope exception | Retain existing F05/cache diagnostics. Profile an identified workload only for an actual gap or proposed change; do not repeat the completed cache campaigns | Measured target results or explicit scoped early-access decision. Development Mac results alone do not pass reference acceptance |
| Hosted: A-EDIT landing / #185 | Agent plus owner numeric budget approval; final head and base must be refreshed; fix is only local | Original failed run and current local correction/results above. After approval, one batched push and full existing CI on that head, including all three engines and UX-08; do not rerun the stale failed head or only the aggregate | Build and test plus Browser qualification succeed with all constituent results on the actual candidate/merge revision. Stop on failure, quota rejection or budget exhaustion; diagnose before any retry |
| Hosted and policy approval: A-RELEASE | Owner authorizes qualification/deployment policy changes and separately budgets publication/post-merge work; depends on A-UPDATE and all other A gates | Existing workflows and retained failure/candidate evidence. Design a fail-closed exact-revision Pages qualification dependency locally; do not change the current policy without approval | Exact deployed source matches successful qualification; versioned evidence survives CI expiry; real-version rollback/recovery rehearsed. Merge alone is not release approval |
| Later full-release: B-DEVICE / C-USERS | Owner, owned devices and real participants; separate authorization/restoration plan for native settings and assistive tools | Existing task scripts and synthetic fixtures, not AI personas or private data | Actual platform/input/screen-reader observations and participant results. Explicitly deferred from early access, not passed or optional for full qualification |
| Optional: ART-05/09 and UX-10 | Owner product and operating-cost decision | Existing scope boundaries; no work started | No implementation until explicitly selected; not initial-release dependencies |

The subsequent zero-Actions A-DOCS/A-UPDATE milestones are recorded below.
Remaining work needs the reference-hardware/workload decision for A-PERF,
owner art/print participation, or explicit policy scope for A-RELEASE; hosted
qualification still needs a numeric budget. Do not invent a supported
browser/device range or imply that early access is approved. No dependency update is bundled:
this failure involves focus/layout, not package exposure. Any future dependency
finding must identify the installed path, affected version, runtime/build
exposure and compatible fix before changing the lockfile.

**CI waste assessment, read-only:** Feature-branch pushes have no direct CI
push trigger, but updating the open PR starts one full PR workflow. CI also
runs after merge on main; Pages starts separately. There is no merge-queue
trigger in the checked-in workflows. CI uses per-ref superseded-run
cancellation; Pages has its own cancellation group. Each PR run performs four
dependency installs/builds, one in Build and test and one in each engine job.
Main adds a separate Pages install/build. Each engine already reuses its build
for the runner and UX-08, so no extra build should be added between those
steps. The WebKit pixel preflight deliberately runs before the full suite.
Job limits remain 15 minutes for Build and test, 20 per engine and 2 for the
aggregate; Pages has no explicit job timeout.

No change-aware selection currently exists. Deduplicating production builds
would require artifact identity/integrity handling; safe docs-only selection
would require an approved policy that keeps required checks fail-closed and
distinguishes unexecuted evidence from passes. Adding `paths-ignore`, omitting
an engine, making the aggregate green on a skipped job or removing the
preflight is not an authorized optimization. Pages currently runs
independently of successful CI, which remains an A-RELEASE defect to address
under explicit policy scope, not a reason to weaken checks.

Historical run `35037146541` used about **32.5 aggregate job minutes**,
approximately **35** after per-job whole-minute rounding, not its 11.5-minute
elapsed duration. Earlier main run `35034579302` used about 24.4 aggregate
minutes, before this added editing suite; Pages run `35034579361` used
44 seconds across two jobs, approximately 2 rounded minutes. These are
observed standard-Linux durations, not invoices. A future one-update/one-merge
cycle with the enlarged suite is roughly 70-80 rounded runner minutes for
two CI runs plus Pages, before retries; another full CI attempt adds roughly
35-40. Refresh durations, triggers, billing rules and artifact/storage
implications, propose a conservative numeric ceiling with post-merge/retry
reservations, and obtain approval **before** a trigger. None of these estimates
grants an allowance now. Stop rather than exceed the approved ceiling.

### Local documentation and real-version update milestone

September 28, 2026. All work is locally committed with no pushes or hosted
triggers. Documentation/help source: `d9036c503c833ca44061bef86283c13440e4d6b4`.
Manual rehearsal: `db024ac7470e4f61dc7dcf6c557dcccf8e197a13`.

A-DOCS reconciles README, Features, Sharing/demo scripts, the documentation
index, changelog and in-app shortcut help against the actual UI source and
existing UX-02/05/06/08 contracts. It corrects the obsolete fresh-Library
G/Present flow, Rail/Tabs and mobile menus, import replacement claims, print
shortcut, export-overlay labels, save promises and qualification overclaims.
Library import previews and direct editor imports are described separately.
Project backup JSON excludes separate session records; session recovery files
have no dedicated importer. Historical GIFs remain labeled references.
Nineteen targeted help/action component assertions, build and lint passed.
Only help/action wording changed in application code; action handlers,
publication and serialized data did not.

The prior source was identified read-only from successful Pages run
[`35034579361`](https://github.com/evillollive/Dungeon-Mapper/actions/runs/35034579361):
`72f32e16c30be85e92f48e13fccb1576f36ed35e`. It was exported with `git archive`
into task-owned session artifacts, not another session or the main checkout.
Both versions were built locally with Node 24.16.0 and the identical dependency
lockfile (SHA-256
`e038ea92ee0771faac9355d3892b01fc838daf42350251bbc7cbbde08806ee50`).
The archived build reused the existing dependency directory after byte equality
of the lockfiles was checked. No install, upgrade or schema change was needed.
This is a reconstruction of the deployed source, not a claim that the original
hosted artifact was downloaded or its byte identity independently established.

| Build | App asset | App SHA-256 | Worker SHA-256 |
| --- | --- | --- | --- |
| Prior `72f32e1` | `App-CbydfPzw.js` | `32c23606ba87c1b2ccd50ec93d1826f8d28dd179ba5f5d56e7b01d157c5a4af2` | `5cd81b01a4780d216c7126760b1f00255f17416780145782d1ea89f72502bd2c` |
| Candidate `d9036c5` | `App-BE003znV.js` | `171eaac1c1c34284f77cbc985b77e74a5a0190bc4554cdb8fa18606194bc8774` | `d1012ad893e5348c4b7e50b32809890492a8bc987c52f2fe4cc1d9020f4c8460` |

`ux09Upgrade.spec.mjs` uses the locked Playwright runner and real Vite production
previews at the same `/Dungeon-Mapper/` loopback origin. It restarts that origin
with each complete build; it does not append worker comments or invent a data
migration. Assertions verify distinct bundle bytes, the loaded document module,
the actual App resource and content hashes after upgrade and rollback.

The synthetic input reuses `ux09Library.browser.mjs`'s rich two-level fixture,
including embedded image, custom theme/tile/stamp/template libraries and unknown
extension fields, with one added player token and initiative entry. Public UI
creates the local identity, recovery copy, session movement and named session
checkpoint. There are no real users, live AI personas, external providers or
native browser-setting operations.

Each engine asserts:

- A held native IndexedDB write blocks the explicit update without navigation;
  the latest committed project then survives activation.
- Every durable record remains equal immediately across upgrade and rollback,
  including project/session identities, revisions, source checkpoint, project
  recovery copy and named session checkpoint.
- Private backup downloads before/after upgrade are equal; candidate session
  checkpoint restoration preserves the pre-restore progress in the recovery slot.
- Candidate edits survive rollback; the older application can save a new project
  edit and session turn without losing assets, unknown fields or recovery history.
- A real downloaded project backup imports as a separate identity, leaving source
  project/session work intact. The rolled-back application reloads and reopens
  that copy with the sole HTTP origin stopped.

| Local environment | Actual result |
| --- | --- |
| macOS 26.7, Chromium 151.0.7922.34 | One complete upgrade/rollback journey passed, 19.9 seconds |
| macOS 26.7, Firefox 153.0 | One complete upgrade/rollback journey passed, 22.1 seconds |
| macOS 26.7, WebKit 26.5 | One complete upgrade/rollback journey passed, 19.6 seconds |

All three passed in 62.4 seconds with zero skipped/flaky cases, one worker,
no retries and the existing three-minute case/twenty-minute suite limits.
Persistent profiles are synthetic and task-owned, and contexts/servers were
closed by fixture teardown. Browser errors were empty. Neither browser-process
restart nor OS interruption, physical storage loss, all historical version
pairs, arbitrary downgrades or a schema migration was qualified.

Reference dispositions in session
`20233d90-7a79-4423-a564-f75af5b08662`:

| Material | Disposition |
| --- | --- |
| `files/upgrade-prior-source/` | Retained source archive, build and read-only deployment metadata; its dependency symlink is build tooling, not part of the immutable distribution |
| `files/upgrade-candidate-dist/` | Retained copy of the tested candidate distribution, checked against the full file-hash manifest |
| `files/upgrade-final/` | Retained runner reports, build/runner source identities, complete distribution hashes, synthetic persistent profiles, original input, native record snapshots and real project/session recovery downloads |
| `files/upgrade-first-chromium/`, `upgrade-second-chromium/`, `upgrade-third-chromium/` | Retained failed harness attempts: inherited preview server collision, then native Fetch response API mismatch. These failed before qualifying upgrade behavior and are not product failures or passes |
| `files/upgrade-fourth-chromium/` | Retained initial successful working-tree rehearsal; final three-engine evidence supersedes it for this pair |
| Existing UX-08, preservation and A-EDIT references | Already retained. Their original outcomes remain unchanged; no unrelated renderer/export campaign was repeated |

The manual config is deliberately outside default CI. The required runner still
discovers 177 tests in nine files; this was a discovery check only, not 177 passes.
No workflow, trigger, required-check policy, timeout or hosted resource changed.
Commands and prerequisites are in
[Development](./DEVELOPMENT.md#manual-real-version-upgrade-and-rollback-rehearsal).

**Release applicability:** This supplies bounded local A-UPDATE evidence for
`72f32e1 -> d9036c5 -> 72f32e1`, not an approved supported-version range or a
final-release receipt. A-RELEASE must still bind the accepted candidate and
supported predecessor to exact qualification and a publication/rollback policy.
Adding this rehearsal to hosted CI or changing Pages qualification needs explicit
policy scope and a numeric budget. The known #185 hosted Firefox failure is
not cleared by these local runs. A-PERF reference acceptance, owner art approval,
physical A4/Letter evidence and the later B/C gates remain open.

**Accounting:** The continuation retains a zero-minute hosted budget, zero
initiated triggers and zero reservations. No remote publication or paid-provider
call occurred. Local compute and disk costs were not metered; account-wide
quota, billed storage/cache usage and other actors' usage remain unknown.

## Remaining release gates

Subsequent housekeeping removes 68 of the original 73 hook warnings and
19 dependency-rule suppressions from map-state, level-management and history
hooks. The September 12 cleanup resolves the other five warnings in `App.tsx`
and `MapCanvas.tsx`, making the current lint allowance zero. Existing scoped
rule suppressions outside that cleanup remain; this is not a claim that every
suppression has been retired. History helpers have stable identities; editing callbacks
declare current dependencies while preserving per-level undo and stale-project
callback rejection. The counts above describe the earlier milestone evidence,
not the current warning baseline.

UX-09 remains **in progress**. These automated journeys cover parts of roadmap
section 8, not the entire nine-journey/seven-fixture acceptance matrix.
UX-07's initial-release art is implemented, with remaining owner acceptance
recorded in the [art closeout ledger](./USER-EXPERIENCE-ROADMAP.md#initial-release-art-closeout);
ART-05/09 are deferred expansions, not launch dependencies. UX-00 participant
research remains deferred with zero participants under UX-09C.

The bounded A-DATA preservation and A-EDIT editing journeys are covered above.
UX-09A still requires exact-head CI, real application-version upgrade and
rollback evidence, a measured desktop
performance/support scope, accurate public workflow guidance, owner art
closeout and exact-revision release handling. **Physical printing also blocks
UX-09A:** digital DPI/layout evidence cannot replace A4/Letter paper measurement,
assembled overlap and monochrome readability acceptance. See the
[release gate ledger and print procedure](./USER-EXPERIENCE-ROADMAP.md#release-gate-ledger).

Human screen-reader review (VoiceOver/Safari and NVDA/Firefox), WCAG 2.2 AA
evaluation beyond scoped critical-action checks, broader native zoom and
physical touch/pen/keyboard behavior, and remaining device-specific performance
qualification belong to UX-09B. They are deferred from early access, not passed.
Known inaccessible critical actions still block release. Desktop performance
scope must be resolved in A; local F05 diagnostics do not establish reference
acceptance, and the existing full-release budgets remain unchanged.
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

The new A-RELEASE gate is planned work, not an already implemented deployment
guarantee: Pages currently starts independently on pushes to main. Require
successful qualification of the published revision, rehearse actual
application-version rollback/recovery, and preserve a versioned release
evidence/limitations summary beyond the current fourteen-day CI retention.

**September 28 design-only follow-up:** The
[exact-revision Pages design](./RELEASE-DEPLOYMENT-DESIGN.md) records the proposed
same-workflow dependency graph, canonical artifact reuse, explicit integrity
checks, main-only deployment, superseded-job versus active-deployment handling,
rollout/rollback and retention decisions. Read-only inspection confirmed both
strict required checks and the main-only Pages environment; neither changed.
The design's acceptance table is planned work, not simulated or hosted passes.
Implementation needs explicit policy-scope approval; publication and hosted
verification need a separate numeric budget. This design task initiated zero
hosted triggers and made no workflow/environment or remote changes.
