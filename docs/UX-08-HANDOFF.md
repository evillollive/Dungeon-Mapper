# UX-08: Export, offline and portability

Implemented 2026-09-11, based on `e65eae1`. This package uses the approved Folio
foundation, materials and eight furnishings. It does not complete the remaining
UX-07 asset catalog, physical-device research or UX-09 release qualification.

## Export contract

The header, command palette and existing JSON/PNG/SVG/print shortcuts all enter
one intent-first dialog. The default is player sharing. Private backups contain
the full in-memory project, all levels, reusable assets and stair links, including
DM-only content. Device checkpoint history and separately stored play sessions
are outside that project backup. Session recovery remains in the session workspace.

Images always cover the current level, not all levels, a selection or the visible
editor viewport. PNG uses the standalone renderer, so pointer cursors, selection
handles and editor chrome cannot be captured. Player outputs use
`projectForAudience` exactly once for rendering; projected maps must be passed to
`renderPlayerProjection`, never projected a second time. Public filenames, notes,
known geography and discovered secrets follow the existing player policy.
Raw backgrounds are excluded while any geography remains unknown.

The dialog previews the audience and output scope, dimensions and page count.
SVG is a color/vector output with raster art layers where necessary. Ink-friendly
PNG uses semantic map styling and monochrome Folio paths; embedded images and
token colors can remain colored. Optional missing stamps use outlined
placeholders, missing custom-tile images use base colors, and unavailable
backgrounds are omitted with an explained fallback. Assets are decoded before
PNG/SVG download; the export path does not fetch external image URLs.
Users must review secrets embedded inside otherwise public images themselves.

## Physical scale and allocation limits

| Property | Contract |
| --- | --- |
| Single raster surface | At most 16,000,000 pixels and 8192 pixels on either side; reject before allocation |
| Print plan | Letter or A4 physical sheet; 72/150/300 DPI; 0.5/1/1.5/2 inches per cell |
| Default print settings | 150 DPI, Letter, 1 inch per cell, 0.5 inch margins, 0.25 inch overlap |
| Tiling | Global map coordinates, page-sized viewports, repeated overlap, white margins included |
| Page count | At most 1024; select one page or explicitly download all |
| Paper texture | At most 1024 pixels on the longer side, scaled consistently across pages |
| Physical PNG metadata | A single CRC-protected `pHYs` chunk stores pixels per meter for the chosen DPI |
| Download lifetime | Sequential encoding; page canvases released after use; PNG object URLs expire after one second |
| Cancellation | Checked between asset loads/pages and after encoding before download; completed files remain |

A 128 x 128 map at 300 DPI represents 38,400 x 38,400 pixels, but Letter
planning produces 252 pages (18 columns x 14 rows), each 2550 x 3300 pixels.
No full-map surface is allocated. At most the content/page canvases and bounded
art caches are needed by the renderer. The browser also owns image decoding and
download memory; this is not a promise of a universal process-memory ceiling.
Large imported raster assets can still be expensive to decode.

Consumers should print at 100% / actual size. Some print applications ignore
PNG DPI metadata or impose extra margins. Physical printer/paper measurement
remains a human release gate. Bulk downloads can require browser permission;
individual page download is always available. The image-tool intent exposes
grid alignment values, not a native VTT adapter.

## Production offline and update policy

`vite.config.ts` builds `src/service-worker.ts` with Workbox InjectManifest.
The generated cache includes the application, lazy routes, bundled art, icons,
manifest and styles. No runtime Google Fonts cache or external-art dependency
is retained. The production HTML resolves the manifest to
`/Dungeon-Mapper/manifest.webmanifest`; the previously reported doubled path
was not reproduced, so no speculative base-path rewrite was made.

Open **Offline & updates** in the Library or editor while online. A worker-side
check compares every precache-manifest entry with its actual cache record before
showing **App and built-in art cached**. Offline detection and save health remain
separate. Caches and project storage can be evicted independently; neither is a
backup. Failed initial worker setup can be retried without reloading the editor.

Updated workers wait. Only an explicit **Update saved workspace** request asks
the worker to activate. The current save coordinator must have no pending or
in-flight write and be in the saved phase. Open dialogs block the action.
The worker also requires that the requesting tab be the sole app window in its
scope, including player displays. Input is held during the handshake, and save
health is checked again before reload. Other tabs are never automatically
reloaded. Run/prepare/player routes do not expose the update control.

For a running session, save/end it and return to the editor first. On pending,
failed, conflicted or failed-restoration saves, retain/export in-memory work and
resolve save health before updating. Worker timeouts and activation failures
surface an error rather than forcing reload. Existing pre-UX-08 clients retain
their old behavior until they load this release.

## Qualification

The locked `npm run test:ux08` runner builds production assets and writes its
JSON results and screenshots to `QA_OUTPUT`. The current run passed:

| Engine | Version | Export / update / stopped-origin journeys | Largest measured surface |
| --- | --- | --- | --- |
| Chromium | 151.0.7922.34 | Passed | 8,415,000 pixels |
| Firefox | 153.0 | Passed | 8,415,000 pixels |
| WebKit | 26.5 | Passed | 8,415,000 pixels |

The journey downloads real PNG/SVG/JSON files, checks public versus private
content and filenames, both levels in the backup, PNG dimensions and physical
DPI, exact pixel equality across adjacent page overlaps, missing/corrupt optional
artwork, 390-pixel dialog layout, 128-cell/300-DPI last-page allocation, and
unchanged project JSON after cancellation. It holds a native IndexedDB write
open, proves the waiting worker cannot reload it, rejects updates with another
app window open, then releases the write and applies an explicit update.

All engines reload, edit, save, reopen from the Library and export with the
sole HTTP origin stopped. Chromium and Firefox additionally use protocol
offline emulation. WebKit's protocol switch produced an internal navigation
error, so its recorded success uses a genuinely stopped origin without that
emulator. No page errors occurred in the successful journeys.
First-install failure/retry and removal of an actual cached icon also confirm
that readiness reflects cache contents rather than the presence of a worker.

Targeted regression coverage: 158 tests across 16 existing/new Vitest files.
Touched production code has no lint errors; existing hook-dependency warnings
in the large App/useMapState modules remain outside this package.
Independent code review identified and corrected double audience projection
and a background-image/paper-texture nesting defect, both with regressions.

The controlled upgrade changes worker bytes but not application schema.
Physical printing, assistive-technology review, real mobile devices,
OS interruption, cache eviction recovery and cross-schema application upgrades
are not claimed as qualified here. The remaining UX-07 and UX-09 gates remain
open.
