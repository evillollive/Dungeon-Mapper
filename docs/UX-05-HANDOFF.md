# UX-05: audience content and player preview

**Foundation:** `c28f661`, merged UX-04 #163.

**Implementation date:** September 10, 2026.

**Status:** Implemented with production Chromium evidence. PR review and exact-head CI are landing gates. Firefox/WebKit, physical devices, participant research, and UX-09 release acceptance remain open.

## User-facing entry points

In Edit, open **Menu > Audience & secrets** to set the public level title, inspect note publication, inspect token/stamp visibility, or mark secrets discovered. Discovery is distinct from fog. Changes participate in existing saves and history.

The note inspector keeps the existing label and description DM-private. Separate **Public note title**, **Public note text**, and **Publish note to players** controls apply together in one undo step. Publishing without public text never copies private text.

Token and stamp inspectors can hide an entity independently of fog. A token can also be excluded from public initiative while remaining visible on the map.

**Player preview** is available in the header, command registry, and project menu. It replaces the mounted editor with a read-only content surface: map, minimap, public notes, initiative, visible-token legend, and zoom/fit. Editor shortcuts are disabled. Closing the host preview returns to the editor; that host control is not a player permission or authentication boundary.

**Export > Player PNG / Player SVG** explicitly selects audience-filtered output. The print/high-resolution dialog also uses the projection when Player is selected. Editable backups, DM canvas PNG, and DM level SVG remain private outputs and are labeled accordingly.

## Visibility truth table

| Content or state | Player behavior |
| --- | --- |
| Private project/level name | Omitted; use `meta.publicName`, otherwise `Player map` |
| Other levels and stair destinations | Omitted entirely |
| Legacy or unpublished note | Omitted even with fog disabled |
| Published note | Only public fields, and only on known geography |
| Explicitly hidden token/stamp | Omitted independently of fog |
| Partially fogged token footprint | Entire token and its initiative entry omitted |
| Visible token with private initiative | Map/visible-token legend only; initiative entry omitted |
| Undiscovered secret door | Ordinary wall |
| Undiscovered trap | Ordinary floor |
| Undiscovered trapped door | Ordinary door with matching orientation |
| Discovered secret | Actual type, still subject to fog |
| Classic fog | Only manually revealed cells are known |
| Dynamic fog | Player sight or light sight is current; prior exploration remains known and dimmed |
| No player/light sources | No invented current sight; manual reveal and exploration still apply |
| Hidden player-kind token | Does not contribute sight |
| GM annotation | Omitted |
| Shared annotation, marker, stamp, wall/path vector | Omitted if its conservative bounds intersect unknown geography |
| Room/river geometry | Rasterized first, then unknown cells removed; authoring vectors never transmitted |
| Background image | Raw image omitted while any geography is unknown |
| Unknown extension fields or unused asset definitions | Not copied to the player payload |

Visible tokens publish their existing label/icon. Imported artwork is not semantically inspected: a secret baked into pixels or vector art must be removed by the DM before sharing. Custom image metadata is not a protected channel for private text.

## Projection and surface contract

`projectForAudience(map, customThemes, customStamps)` returns a serializable `PlayerProjection` with protocol version 1, audience `player`, one projected map, and filtered asset definitions. Construction uses explicit field allowlists, including built-in keys in custom-theme color dictionaries. It does not spread complete authoring records into output.

Geometry is derived before sight calculation. Unknown cells become empty in the payload, not merely covered by a fog rectangle. Removing an exported SVG fog layer cannot reconstruct those hidden tiles or source room/river paths.

| Surface | Data boundary |
| --- | --- |
| Player preview main canvas | `PlayerProjection` through `renderPlayerProjection` |
| Player minimap | Same rendered projection, reduced to thumbnail size |
| Public notes, initiative, visible-token text | Projected collections only |
| Canvas accessible name and counts | Projected level title and collection lengths |
| Player PNG/high-resolution/print | `renderMapToCanvas` projects before rendering |
| Player SVG and filename | Projection before generating SVG elements; public title for filename |
| Local Library thumbnails/previews | Explicitly private DM collection, not a player surface |
| Existing Edit and DM view canvases/panels | Trusted DM surfaces, not publication boundaries |

The preview fits both axes, redraws at display resolution, and caps its backing surface at 4096 pixels per side for supported maps. It has no editing handlers or no-op mutation controls. The older shared Notes/Initiative components also no longer retain an open editing form when switched to read-only.

No display transport exists yet. UX-06 must send only the projection, start blank, and retain its independent level-publication/session lifecycle requirements.

## Compatibility and discovery

Project envelope/schema version 1 and IndexedDB version 1 are unchanged. The new validated optional fields are additive:

- Notes: `published`, `publicLabel`, `publicDescription`.
- Level metadata: `publicName`.
- Tokens: `hidden`, `hideFromInitiative`.
- Stamps: `hidden`.
- Tiles: `discovered`, and `discoveredType` for location-bound derived geometry.

Legacy descriptions are retained verbatim in their existing private fields. Absence of publication means private, so migration is a safe interpretation rather than a destructive rewrite. JSON round trips, local recovery copies, clipboard copies, and history preserve these fields. Older builds do not implement this publication policy and must not be used to produce player-safe output.

Discovery never materializes a derived door into base geometry. Room add/update/remove/clear invalidates location-bound derived discovery, conservatively requiring review after geometry edits. Ordinary authored-tile discovery remains attached to that tile; painting a different type clears it. Undo restores both geometry and its previous discovery.

## Shared sight correction

Qualification found that the existing shadowcasting implementation could see outside a fully enclosed room. Its column traversal ran opposite to its descending slope ranges and its merge step bridged real shadow gaps. The corrected traversal carries only unobstructed ranges and merges actual overlaps. Regressions cover every octant from multiple enclosed-room origins, while existing open-room, pillar, doorway, radius, dynamic-fog, and light-source behavior remains covered.

The app's explored-state update now uses the same derived room geometry and hidden-player policy as projection. Existing explored history is retained, not erased retroactively.

## Evidence and remaining gates

The integrated suite passed **581 tests in 45 files**. TypeScript/Vite build and ESLint error checks passed; existing lint warnings and the existing bundle-size advisory remain. Subsequent targeted checks cover the final authoring action/selection changes.

Production Chromium **152.0.7977.83** completed the callable journey in `src/test/ux05Audience.browser.mjs`: native JSON import, publication, save/reload, discovery undo, absence of private sentinels in the full DOM and accessibility tree, projected counts, editor unmount/shortcut isolation, responsive zoom/fit, and both player download filenames. Layouts were 1440x900, 768x1024, and 390x844.

The journey is an async function expression taking an isolated Playwright `Page`. Navigate that page to the local production preview, then run the file with the Playwright `browser_run_code` tool, or evaluate the function in an existing Playwright runner. It deliberately requires no new repository dependency. Each run imports a new fixture project rather than deleting existing projects.

- [Desktop player preview](./media/ux05/player-preview-desktop.png)
- [Phone player preview](./media/ux05/player-preview-phone.png)

The screenshots were visually inspected; phone content continues in the host's scrollable area. Pure/component tests additionally inspect SVG source, hidden sentinels in the serialized payload, unknown theme fields, token footprints, no-light/explored fog, derived geometry, private read-only forms, publication undo, ghost-door prevention, and PNG encoding failure.

Firefox/WebKit were not rerun: restoring the external SDK failed against both available package registries. This is an explicit qualification follow-up, not three-engine certification. Physical touch/pen, screen readers, human usability, and the final offline/update/export journeys remain release gates.

Conservative vector omission can temporarily remove a decoration's known portion instead of clipping it. Existing raster-versus-SVG artwork differences, including imported image rendering, remain for UX-07/08; this package unifies audience data, not every rendering effect. Do not treat the preview as a pixel-perfect print proof. Bounded high-resolution export and its complete intent-first UX remain UX-08 work.
