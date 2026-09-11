# UX-09: Automated browser journeys and CI gates

First bounded milestone, 2026-09-11, based on `a38ea34`. The owner selected
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
not declared fixed. The strict required-check ruleset must retain **Build and
test** and include **Browser qualification** before this milestone is landed.

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

The integrated baseline had 663 passing Vitest cases across 55 files.
Three new resize lifecycle regressions and the existing seven audience-control
cases passed after the fix. Browser runs use real IndexedDB, canvas and local
display transport. Unit mocks are not the basis for the cross-browser claims.
The largest UX-08 raster surface remains 8,415,000 pixels, not an F05
interactive performance measurement.

Commands, ports, selectors and artifact locations are documented in
[DEVELOPMENT.md](./DEVELOPMENT.md#blocking-production-browser-journeys-ux-09).
CI results and source revisions attached to the pull request are the landing
evidence; local macOS results do not establish Linux CI or physical Safari
device qualification on their own.

## Remaining release gates

UX-09 remains **in progress**. These automated journeys cover parts of roadmap
section 8, not the entire nine-journey/seven-fixture acceptance matrix.
UX-07's full art catalog and launch assets remain incomplete. UX-00 participant
research remains deferred with zero participants.

Human keyboard/screen-reader review (VoiceOver/Safari and NVDA/Firefox), WCAG
2.2 AA evaluation, the full layout matrix, physical touch/pen/keyboard behavior,
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
