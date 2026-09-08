# UX-02: local library and guided creation

**Foundation:** latest main at `02e529a`, including merged UX-01 foundations #159 and qualification #160.

**Status:** Implemented and browser-qualified within the bounds below. Merge remains subject to the PR head's current CI check.

**Scope:** production local project organization and creation. UX-00 participant research remains explicitly deferred with zero participants. This is not UX-09 release acceptance.

## Storage and migration contract

The IndexedDB database remains `dungeon-mapper`, version 1, with the existing `maps` store. Portable project schema remains version 1. Existing project UUIDs, extension fields, map formats, project asset libraries, migration originals, previous saves, and recovery checkpoints are retained.

The existing `project:<UUID>` envelope gains optional local-only `library` metadata:

```ts
{
  status: 'active' | 'archived' | 'trash';
  tags: string[];
  lastOpenedAt: string;
}
```

Records without this field are active, untagged projects with no recorded last-open time. Reading these defaults does not rewrite the record. Malformed metadata produces a retained-source diagnostic rather than silently restoring an archived project. Catalog enumeration retains the existing bounded `project:` key range, excluding recovery arrays and originals.

Rename, tags, archive, restore, and Trash changes compare the selected content revision inside the same readwrite transaction. They rotate `storageRevision`; a stale editor cannot undo organization changes by autosaving an old envelope. Ordinary saves preserve the latest library metadata. Opened-time updates reread and preserve the current record transactionally without changing content revision. They cannot reactivate archived or trashed projects.

Archive and Trash are reversible states, not deletion schedules. Loading a non-active record into the editor is refused until the user restores it in Your maps. Permanent deletion is available only in Trash, requires a separate confirmation, compares the displayed revision, and atomically deletes only that project's current, previous-save, and checkpoint keys. It does not delete any other project or retained legacy source. Deleting the migrated project replaces its migration marker with the `deleted` sentinel, preventing accidental reimport of retained legacy bytes on the next launch.

Local names are still `DungeonProject.name`, independent from the current level name. Tags, archive/Trash state, and recent-use dates are device catalog data, not portable project fields. Editable JSON backups preserve the complete portable project including private content, not catalog organization or recovery history. Permanent deletion is not secure erasure: external downloads, retained legacy originals, and already-open tab memory can still contain copies.

## Library and navigation

Fresh/root entry opens Your maps, not an editable blank grid. A selected `?project=<UUID>` still restores that tab's project directly. `view=library` preserves the library route on reload without changing selection in another tab.

The library searches names and tags locally, sorts by last-open time with saved time as the initial fallback, and offers direct Open/Continue actions. Continue last map sits above the card collection, so returning users do not need to scroll through cards. From an editor, Your maps followed by Continue is two deliberate actions; from the library, one Continue suffices. No account or network query is involved.

Create and import use the UX-01 generation-bound dispatch and new-project allocation. Save failures keep the candidate in memory and do not relabel it as committed. Duplicate CAS-checks its source and atomically adds a new UUID with copied portable content and tags, active status, and no copied recovery history, then safely opens it. A failed open leaves the durable duplicate available in the refreshed library. Dirty, writing, failed-save, and conflict states pause project changes. Failed startup can create a separate project without rewriting the unavailable source, or open/restore another retained project. The older direct `newMap` mutation remains guarded during failed startup.

Library rename/tag changes on the current project safely reload its new revision before returning to editing. Changing project identity resets memory undo, selection, and canvas gestures. Global editor shortcuts are paused in the library and guided dialog. Background exploration updates are paused there too, so merely browsing or cancelling does not edit the active map. Opening a project focuses and fits the canvas.

Permanently deleting the active project detaches its old identity, removes its URL selection, and labels the retained in-memory content unsaved rather than continuing to claim Saved. It does not create a phantom durable blank or replacement. Unexpected pending edits cause a conflict with the backup retained instead of automatic recreation.

## Creation and copy versus replacement

The four guided starting points are ready-to-play sample, generator, blank map, and trace a local background image. Candidates are previewed in memory before explicit creation. Cancelling a file read or closing a dialog prevents its late result from being applied.

The library has a direct Open a sample action. Guided dimensions are 10 to 100 whole tiles per axis, with generator presets of 24 x 18, 40 x 30, and 64 x 48. The existing advanced generator retains its 8 to 128 controls. Trace input accepts PNG/JPEG/WebP up to 10 MB and 24 megapixels, centers the reference without stretching, and exposes opacity before preview. These are creation-form bounds, not restrictions on existing imported projects.

Samples, imported files, blank maps, generated full maps, duplicates, and new projects from scene templates receive distinct local IDs. Imported portable IDs remain content/provenance, never repository keys. Project-scoped custom themes, stamps, and templates remain supported.

The existing advanced Generate Hub retains its algorithms, seed/options, tile mixes, shapes, corridors, rivers, and selection-generation controls. Generate now opens a preview; Use this map is the commit boundary. Full-map output creates a new project. Explicit selection generation remains a checkpointed, undoable current-project edit with its target coordinates shown before commit.

Scene templates expose Create project as the default copy action and keep Place in current map as an explicit existing-project action. Recovery restore continues to mean whole-project replacement with a retained predecessor and the same local identity.

The approved maximum of 20 durable checkpoints per project is unchanged. Ordinary saves remain unaffected. Creating independent projects does not consume replacement checkpoints. Existing destructive editor actions and recovery still require explicit cleanup at capacity.

## Thumbnails and visual boundaries

Thumbnails are generated from local content, not fetched from an account or remote thumbnail service, and are not authoritative saves. Geometry thumbnails use the existing bounded-size renderer and explicitly disclose that uploaded image layers may not appear. Traced maps show a labeled background-reference preview, not a claim of final map composition. A rendering or image-load failure shows Thumbnail unavailable and Retry thumbnail without hiding Open or Export backup.

The library and creation workflow use deep purple/black surfaces, blue focus indicators, red-orange primary actions, readable light text, and one Avenir Next sans-serif family with local fallbacks. Controls use 44-pixel minimum targets and responsive wrapping. The existing editor layout, scene art, export renderer, print controls, player/session semantics, and tool navigation are not redesigned in this phase.

## Evidence

Executed September 7, 2026 Pacific on macOS using the existing Vitest, ESLint, TypeScript/Vite, and externally installed Playwright 1.62.1. No new repository dependencies or CI bypasses were introduced.

| Gate | Actual result |
| --- | --- |
| Existing complete unit/component suite | 519 tests across 40 files passed |
| TypeScript and production build | Passed; existing large-bundle warning remains |
| ESLint | Zero errors; 70 pre-existing hook dependency warnings |
| Native repository and library browser suite | 11 scenario groups in each of Chromium 151, Firefox 153, and WebKit 26.5: 33 passes |
| Production guided creation journey | Passed in all three engines |
| Production stopped-origin library reload and browser-process reopen | Passed in all three engines |
| Read-only actual-diff correctness review | Library review found one recovery race, corrected and covered; guided creation review found no significant issues |

The native library suite covers isolated projects, full rich-content backup/import equality, source-revision guards, copied tags, duplicate failure durability, name/tag/search, archive and Trash restore, explicit permanent deletion including active-project detachment, retained migration bytes and tombstone behavior, two-tab stale writes, recovery serialization, injected quota failure, thumbnail errors/retry/open/export, keyboard management, and 390-pixel reflow. Unexpected pending work during failed-source recovery is explicitly rejected rather than written under another ID.

The production creation journey starts from Your maps and uses the actual UI for sample preview/cancel/commit, blank dimensions, two deterministic seeded generations, preview/back cancellation, trace upload/alignment/reload, and template-to-new-project copying. It checks native saved IDs and contents, exact prior-project preservation, mobile trace layout, and browser errors. No mock panels or screenshots alone establish these passes.

The production offline script installs the real service worker under `/Dungeon-Mapper/`, saves two projects, stops its sole HTTP server, verifies the origin is unreachable, reloads the library, searches/opens/renames offline, closes the browser process, and reopens the same isolated profile with the server still stopped. All three engines retain both projects and the latest edit. This is not OS-interruption, natural eviction, mixed-version worker-update, or physical-device certification.

Reusable scripts:

```sh
# Start Vite on 5192 for the native repository imports and library suite.
npm run dev -- --host 127.0.0.1 --port 5192 --strictPort
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  QA_OUTPUT=/absolute/session/artifacts/library \
  node src/test/ux02Library.browser.mjs

# Build and serve production on 5300 for guided creation.
npm run build
npm run preview -- --host 127.0.0.1 --port 5300 --strictPort
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  QA_OUTPUT=/absolute/session/artifacts/creation \
  node src/test/ux02Creation.browser.mjs

# Owns and stops its production server on 5299; run separately.
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  QA_OUTPUT=/absolute/session/artifacts/offline \
  node src/test/ux02Offline.browser.mjs
```

All scripts use disposable isolated browser contexts/profiles, never a user's real storage. `QA_ENGINES` can select a subset for targeted work; subset results are not the full matrix. Final JSON and screenshots are retained as session artifacts in `ux02-library`, `ux02-creation`, and `ux02-offline`, not committed browser profiles or generated fixtures.

The material review fix serializes failed-startup recovery before its first asynchronous operation. Previously, a concurrent new-project action could change coordinator identity while recovery was pending and redirect the queued autosave to the old project. The corrected coordinator publishes a blocked state, checks generation/pending work before activation, and retains the failed source on quota failure. Both the hook regression and native three-engine scenarios cover this boundary.

## Remaining boundaries

Browser/device storage can be cleared or evicted. Device copies and checkpoints are not external backups. Full catalog reads still decode complete project envelopes; this is not a large-library indexing or storage-performance certification. Image reference thumbnails are deliberately not full-fidelity composites.

UX-03 owns the unified action registry and whole-editor shell. UX-04 owns broader touch/pen and editor accessibility parity. UX-05/06 own audience projection, private-note migration, session separation, and local player display. UX-07 owns final font bundling and map-art acceptance. UX-08 owns broader export/offline qualification. Remote play, accounts, and cloud synchronization remain excluded.

Rollback requires exported backups first. Older clients do not understand library status and must not remain open while managing archive/Trash. Do not clear IndexedDB or legacy originals to roll back.
