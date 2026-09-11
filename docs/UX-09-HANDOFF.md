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
budgets are still open. No latency threshold or usability success rate is
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
