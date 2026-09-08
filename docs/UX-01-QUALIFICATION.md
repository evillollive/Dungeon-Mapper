# UX-01 browser and storage qualification

**Verdict: Ready with minor follow-ups for the tested UX-01 candidate.**

The save/recovery foundations are merged in [PR #159](https://github.com/evillollive/Dungeon-Mapper/pull/159). Independent qualification found **98 scenario-engine passes**, **zero remaining failed data-integrity scenarios**, and **two explicitly unsupported environment probes**. This report integrates that evidence and the five reusable scripts, not another application implementation.

UX-00 research remains deferred with **zero participants**. This is not physical-device, participant, full accessibility, or UX-09 release certification. Later release gates remain open.

## Provenance

| Stage | Application revision | Meaning |
| --- | --- | --- |
| Baseline #158 | `34f09851959a7fd5aa5d5818e52276af60dac5b5` | Earlier single-autosave qualification. Does not establish the later catalog and general-recovery contracts. |
| Intermediate foundations | `11cabe86` | Missing/corrupt startup selection defect reproduced. Superseded by the final candidate. |
| Final tested candidate | `275ed482f6ec162baec16f85032895ce44bdb308` | All final results below were executed against this application content. |
| Foundation merge #159 | `4289da6984c5c4a70cf07e794c1d8b97cd9dfb42` | Merged application source/build inputs match the final tested candidate. |
| QA integration base | `2515648c7bdb1ef99309cfd472b25fa5b639582d` | Normal merge of main into the QA branch, with no conflicts. Diff against main contains only the five qualification scripts before this documentation update. |

The browser matrix is candidate evidence, not a fresh run on the eventual qualification-PR merge SHA. Application source/build-input parity connects it to #159; the follow-up PR adds only scripts and documentation. The follow-up PR's GitHub merge record identifies its eventual merge SHA.

Executed September 7, 2026 Pacific / September 8 UTC on macOS, Node 24.16.0, headless Playwright JS SDK, against a production build served at `/Dungeon-Mapper/`.

## Final results

| Engine | Version | Common groups | Catalog groups | Stopped-origin reload/process reopen | Bounded real SW update | Emulated offline |
| --- | --- | --- | --- | --- | --- | --- |
| Chromium | 151.0.7922.34 | 13 passed | 17 passed | Passed | Passed | Passed |
| Firefox | 153.0 | 13 passed | 17 passed | Passed | Passed | Passed |
| WebKit | 26.5 | 13 passed | 17 passed | Passed | Passed | Unsupported |

Counting: `(13 + 17) x 3 + 3 + 3 + 2 = 98` passing scenario-engine groups. Each group can contain multiple assertions. The unsupported Chromium native-quota probe is separate from the passing common groups.

### Common production behavior

All engines passed complete rich save/reload fidelity; named whole-project clear checkpoints surviving later edits/reload; inert cancellation; idempotent legacy migration retaining original bytes; every bundled sample with truthful dimensions including 40 x 40; explicit fog repair preserving unrelated rich content and the original; real two-tab stale-save rejection with losing in-memory backup; injected quota failure and retry; native transaction abort after put-request success without false Saved; retained/downloadable unsupported and corrupt originals; native blocked/versionchange contention with late-connection cleanup; actual JSON, PNG, SVG and six-page print downloads without storage mutation; and complete medium/large project and checkpoint round trips.

JSON checks compare full semantic content, including unknown fields, grids/layers, private notes, custom themes/tiles/images, built-in/custom stamps, templates, art settings, links, rivers and room shapes. PNG was 320 x 320 for the 16 x 16 fixture. At 72 DPI, letter print produced six 540 x 720 pages. SVG retained embedded image content. This is not physical-printer certification.

### Catalog and recovery behavior

All engines passed these 17 groups:

1. Concurrent native migrations create one identity/marker and retain IndexedDB and whitespace-bearing localStorage originals with correct source precedence.
2. Abort after the migration-marker request succeeds leaves no partial project/marker; retry is stable.
3. Project naming is separate from level naming; tab-local selections save independently; New and repeated rich imports create distinct IDs without rewriting prior projects or portable provenance.
4. Preview cancel writes nothing; confirmed whole-project restore preserves local identity and the exact committed predecessor.
5. Quota failure retains preview/original; a competing real tab causes conflict instead of overwrite.
6. At 20 checkpoints, clear is refused before memory changes, ordinary edits still save, explicit cleanup deletes only the selected copy, and the next checkpointed action succeeds.
7. Archive-only second-tab instrumentation exercises the commit-time capacity recheck; a 21st copy is refused, and stale concurrent checkpoint deletion is rejected.
8. Delayed real image FileReader callback after a successful switch cannot contaminate either project.
9. The same image callback after whole-project restore is rejected.
10. A delayed image during a held target read followed by failed switch remains pending on the original ID, reports Save failed, exports, and retries without changing the target.
11. Delayed editable-project FileReader import after switching cannot create an unintended project or replace the new selection.
12. The same import after recovery restore is rejected.
13. Missing selected ID can reach a healthy project through the UI without manual URL edits or replacement writes.
14. Corrupt selected project can reach a healthy project while its original stays unchanged.
15. Explicit clearing of disposable profile storage followed by external rich JSON import recovers the complete project.
16. Keyboard-only switch, preview, cancel, cleanup, restore and backup complete at 390 x 844 with visible focused controls and no document horizontal overflow.
17. The same journey completes at 720 x 450 CSS pixels with deviceScaleFactor 2, a bounded 200-percent reflow proxy.

## Measured project bounds

| Fixture | Compact UTF-8 JSON bytes before edit | Geometry |
| --- | --- | --- |
| Rich | 251,594 | 2 floors, 16 x 16 |
| Medium | 1,838,851 | 6 floors, 64 x 64 |
| Large | 8,144,119 | 8 floors, 128 x 128 |

Fixtures use bundled PNG/stamp assets, not payload padding. Full semantic project and checkpoint comparisons pass across later edits and reloads.

| Engine | Medium edit-through-commit | Large edit-through-commit |
| --- | --- | --- |
| Chromium | 1,161 ms | 2,417 ms |
| Firefox | 1,372 ms | 3,201 ms |
| WebKit | 1,142 ms | 2,276 ms |

These single-run host observations include debounce and serialization. They are not performance distributions, supported-size maxima, or device quota guarantees. Storage serialization/compression differs by engine.

## Offline and worker-update evidence

The production manifest resolves under the real base path. Stopped-origin tests install the actual production service worker, observe its controller and Workbox cache, stop the sole HTTP server, verify a Node fetch fails, reload and save, then close the entire browser and reopen the same isolated profile while the origin remains stopped. All engines restore the latest committed edit.

The update test appends a qualification comment to the served production worker, producing a real byte change and worker activation while a native IndexedDB save is held uncommitted. All engines keep the document and pending edit, commit after release, and retain project selection/content after reload. The application bundle is unchanged. This does not qualify mixed application versions, changed cache manifests, interrupted deployments, or OS termination.

## Limitations and retained follow-ups

- **Native quota unsupported:** Chromium CDP reports an active one-byte quota but permits a bounded 16 MiB incompressible native payload. No further padding or disk filling was attempted. Injected quota/abort results do not establish real disk exhaustion.
- **WebKit emulation unsupported:** context-offline reload produces an internal navigation error. Actual stopped-origin reload/process reopen passes. Playwright WebKit is not Safari-device certification.
- **Focus predictability:** Removing chooser/preview nodes does not restore the triggering focus. Forward paths can be long. Firefox forward wrapping sometimes skips earlier SaveHealth controls; reverse Shift+Tab reaches all required actions and completes the journey. Reproduce with the 20-checkpoint fixture: keyboard-open B then A, return to Recovery copies, cancel/restore preview, then reach cleanup/backup. A focused accessibility follow-up should restore trigger focus. This is not a remaining data-loss blocker and does not require a UX-04 redesign here.
- **Keyboard/reflow bounds:** Firefox uses `accessibility.tabfocus=7`; WebKit uses Option+Tab. The 720 x 450 at 2x check is a reflow proxy, not native browser-menu zoom. No screen-reader study, participant task-success, touch/pen or physical-keyboard certification is claimed.
- **Controlled storage loss:** Only disposable test-profile IndexedDB/localStorage was deleted. Import recovery is demonstrated, not natural device eviction or its prevention. Local checkpoints are not external backups.
- **Labeled instrumentation:** Native blocked/versionchange testing requests database version 2 via IDBFactory prototype instrumentation while production remains version 1. Archive-only capacity races and held transactions are bounded instrumentation, not ordinary user workflows.
- **Later gates:** Natural quota/eviction, OS interruption, mixed-version release updates, broad nonvisual/device accessibility, participant research and UX-09 release acceptance remain unqualified. No UX-02 scope is added.

## Reproducing the scripts

Use an isolated checkout/profile environment, existing repository dependencies, and an externally available Playwright JS SDK with the required browser binaries. No new dependency or runner is added to this repository. Run from the repository root. Output directories must be disposable artifact directories outside tracked source.

Build with `npm run build`. In a separate terminal, run:

```sh
npm run preview -- --host 127.0.0.1 --port 5297 --strictPort
```

In the test terminal, substitute your SDK path. Record the actual application revision for a new run rather than reusing the historical candidate label:

```sh
export PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs
export QA_OUTPUT="$(mktemp -d)"
export QA_SOURCE_SHA="$(git rev-parse HEAD)"
export QA_CATALOG=1
node src/test/ux01Qualification.browser.mjs
node src/test/ux01Qualification.catalog.mjs
node src/test/ux01Qualification.offline.mjs
node src/test/ux01Qualification.update.mjs
```

`QA_CATALOG=1` is necessary for the common script to exercise current project-record semantics rather than the historical baseline. The latter two scripts own separate preview servers on default port 5298 and must run sequentially. Stop the separate port-5297 preview when finished. Scripts close owned browser contexts and remove temporary persistent profiles.

Optional engine selection: `QA_ENGINES=chromium,firefox,webkit`. Common/catalog filtering: `QA_SCENARIOS=<regular-expression>`. Common/catalog origin: `QA_ORIGIN=http://127.0.0.1:5297/Dungeon-Mapper/`. Owned-server port overrides: `QA_OFFLINE_PORT` and `QA_UPDATE_PORT`. Filtered runs are not the complete matrix.

Persistent files: `src/test/ux01Qualification.fixtures.ts` and the four `.browser.mjs`, `.catalog.mjs`, `.offline.mjs`, `.update.mjs` companions with the same `ux01Qualification` prefix.

## Evidence retention and integration validation

This report is adapted from the independent session's `UX-01-final-qualification.md` and `UX-01-baseline-qualification.md`. Original JSON/screenshots remain session artifacts, not committed generated fixtures, profiles, or developer-machine paths. Their relative artifact names are:

- `foundation-275ed482-common-final/results.json` and `*-export-evidence.json`
- `foundation-275ed482-catalog-final/catalog-results.json`, `*-focus-trace.json`, `*-focus-target.json`, and `*-preview.png`
- `foundation-275ed482-network-loss-final/network-loss-results.json`
- `foundation-275ed482-update/worker-update-results.json`

The original session artifact collection is not a repository-relative directory or a public download. Baseline/intermediate troubleshooting artifacts are not substituted for final results. All qualification-owned servers were stopped and temporary profiles removed.

Independent integration validation on `2515648c7bdb1ef99309cfd472b25fa5b639582d` passed all four `node --check` commands, focused fixture ESLint, `npm run lint` (0 errors, 70 existing warnings), `npm test` (**455 tests in 35 files**), and `npm run build`. Existing hook-dependency and large-bundle warnings remain. Scripts and application inputs were unchanged after this validation; subsequent integration edits are documentation only. The browser matrix was not rerun for ancestry/documentation integration. GitHub's required **Build and test** check must pass on the PR head before merge.
