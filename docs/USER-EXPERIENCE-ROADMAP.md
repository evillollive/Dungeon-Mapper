# End-user experience and visual design roadmap

**Date:** 2026-09-07

**Reviewed baseline:** `4633065`

**Status:** UX-00 prototype accepted with participant research deferred. UX-01 through UX-06 are merged. UX-07's first dungeon art slice is implemented for owner review, not accepted as the full package. Cross-browser follow-up and release research gates remain open. No participant usability acceptance is claimed.

**Audience:** Future product, design, development, art, and QA sessions.

**Latest implementation:** Following UX-06 #166, UX-07 introduces the opt-in Dungeon Folio v1 tile kit and The Quiet Cistern, a hand-authored 32 x 32 reference sample. See the [before/after and output contact sheet](./media/ux07/contact-sheet.png) and the scoped implementation record in UX-07 below. UX-00 participant research remains deferred with zero participants; physical-device and UX-09 acceptance gates remain open.

## 1. Product direction

Dungeon Mapper should help a DM **prepare a beautiful, readable encounter, run it without exposing secrets, and pick up next time without losing work**. A player should immediately understand **where they are, what they can see, and what they can do**.

The app already has substantial capability. Its main problem is that its interface is organized around implementation categories rather than user goals. A longer feature list will not fix that.

The recommended product shape is:

```text
Library -> Create or open project -> Edit map -> Prepare session -> Run session
                                      |                              |
                                      +-> Export                     +-> Player display
                                                                     |
                                                              End and resume later
```

Build a focused, local-first encounter mapper, not an entire virtual tabletop. Keep accounts optional and outside the first release. Local project organization, recovery, and a second-window display do not require cloud storage.

### Product principles

1. One obvious next action, with advanced controls available when needed.
2. The map is the visual focus; controls explain the current task.
3. Editing, DM session control, and player display are distinct experiences.
4. Nothing is called saved, private, shared, or offline-ready unless the implementation supports that promise.
5. Art enriches spatial understanding without changing game semantics.
6. Existing projects, deterministic generators, print output, and offline use remain supported.
7. Deliver complete vertical slices, not disconnected replacement panels.

### Scope boundary

The first redesigned release includes local projects, guided creation, focused editing, explicit content visibility, a DM session workspace, local player display, cohesive art, accessible controls, and dependable export/recovery.

Remote players, accounts, cloud backup, marketplaces, character sheets, dice automation, rules adjudication, and world-scale generation are separate expansions. Do not add them as prerequisites for fixing today's experience.

## 2. Review method and evidence

This is a source-informed product and UX review, supported by a local browser walkthrough. It is not a participant usability study, a comprehensive device certification, or an exploitable-security audit.

The walkthrough covered a fresh editor at 1440 x 900, Generate Hub, loading the bundled **The Sunken Crypt** sample, switching to Present, and Present at 390 x 844. Code inspection covered the app shell, editor panels, player controls, notes, initiative, art systems, persistence, export, and test/CI foundations.

Baseline screenshots:

- [Desktop, new project](./media/ux-review/current-desktop.png)
- [Desktop, sample project](./media/ux-review/current-sample.png)
- [Mobile, Present](./media/ux-review/current-mobile-present.png)

Observations below distinguish current behavior from recommendations. Performance numbers later in this document are proposed release gates, not measured results.

### Current experience assessment

| Area | Current evidence | User impact | Priority |
| --- | --- | --- | --- |
| First use | Fresh load opens an empty grid and long tool panel. Samples exist inside Generate Hub. | A new DM must discover how to start before making anything useful. | P0 |
| Returning users | IndexedDB persists a single `autosave` project, not a project catalog. | No reliable in-app collection of adventures or maps. Starting another project feels risky. | P0 |
| Navigation | Rail and Tabs duplicate Draw/Tactical/Advanced categories, with separate persisted selection. | Layout choice changes navigation mechanics without improving the mental model. | P1 |
| Desktop layout | At 1440 x 900 the header wraps into two rows. Room tool and rail labels truncate. Tools occupy the first screen of the Draw panel; material choices are lower down. | Users scan many equally prominent controls and scroll between tool and material. | P1 |
| Empty inspector | Map statistics occupy the right panel above empty initiative and notes. | Valuable map area explains internal counts instead of the next useful action. | P1 |
| Generation | Seeded generators, sample projects, and selection generation already exist. The default generation form starts with algorithm/corridor terminology. | Strong functionality is presented as parameter tuning rather than making an encounter. | P1 |
| Import and replacement | Import, New, generation, and samples enter through different callbacks and confirmations. | Users cannot easily predict whether an operation replaces a level or the whole project. | P0 |
| Map dimensions | The sample is 40 x 40, but header selects display 8 x 8 because 40 is not in `GRID_SIZES`. | The interface visibly disagrees with the map and makes resizing hard to trust. | P0 |
| DM versus player | Present uses `viewMode='player'`, yet retains header project actions and exposes fog and token controls. | Present is a DM-operated viewing mode, not a separate player role. | P0 |
| Notes | Player notes are filtered by fog, then passed to the same editable `NotesPanel` with no-op mutation callbacks. | Edit/Add/Delete affordances can imply changes that do not persist. Revealing geography can reveal note descriptions. | P0 |
| Visibility summaries | `MapCanvas` constructs accessible summaries from full token/note counts; the sample Present snapshot announces six tokens and sixty notes. | Visibility policy must cover text, counts, and assistive output, not only painted pixels. | P0 |
| Live play | Token ordering, drawing, measurement, fog, lights, and multi-level links exist. Initiative has ordering/selection, not a complete round/current-turn lifecycle. | Most components exist, but the DM must assemble the session workflow mentally. | P1 |
| Mobile | A bottom toolbar and drawers exist. Observed Present includes Defog and a long-press utility control. Zoom controls sit against the bottom chrome. | Phone interaction needs explicit roles and predictable sheets, not a compressed desktop editor. | P1 |
| Art | Themes already include wall depth, tile variation, water detail, textures, blending, hand-drawn effects, lighting, stamps, and presets. | The solution is art direction and controlled detail, not merely adding texture support. | P1 |
| Sample composition | The observed crypt has dense repeated wall highlights, bright blue water, frequent numbered markers, and noisy background detail. | Decorative detail competes with traversable space and tactical information. This is a visual judgment, not a statement that all themes look identical. | P1 |
| Export | Editable JSON, PNG, SVG, and high-DPI tiled print output exist across separate actions. | Users choose file formats before understanding audience, scope, or consequences. | P0 |
| Persistence trust | Debounced save exists; versioned schema migration, project recovery history, and user-facing save health are missing. Undo history is memory-only. | Autosave should not be mistaken for a backup or persisted undo. | P0 |
| Accessibility | Labels, shortcuts, focus traps, reduced-motion/forced-color styles, and utility tests exist. | Preserve these, but validate complete keyboard and nonvisual workflows rather than declaring the canvas accessible by itself. | P0 |
| Delivery | CI runs lint/build/tests, but lint has `continue-on-error: true`. Browser journey tests are not configured in package scripts. | Successful CI currently does not prove the full experience works. | P1 |

The development browser also reported a manifest parse error at a doubled `/Dungeon-Mapper/Dungeon-Mapper/manifest.webmanifest` path. Reproduce against the production build under the actual Pages base path before classifying its deployment impact. Do not infer a production outage from this development observation.

### Source map for future sessions

| Surface | Existing implementation to reuse or change |
| --- | --- |
| Shell and global actions | `src/App.tsx`, `src/components/MapHeader.tsx`, `src/contexts/*`, `src/hooks/useGlobalShortcuts.ts`, `src/hooks/keyBindings.ts` |
| Navigation | `NavigationRail.tsx`, `Toolbar.tsx`, `MobileToolbar.tsx`, `CommandPalette.tsx` in `src/components/` |
| Creation and editing | `GenerateHub.tsx`, `DrawToolsTab.tsx`, `SelectionInspector.tsx`, `StampPicker.tsx`, `SceneTemplateDialog.tsx`, `MapCanvas.tsx` |
| Play | `PlayerToolbar.tsx`, `TacticalToolsTab.tsx`, `NotesPanel.tsx`, `InitiativePanel.tsx`, `LevelTabs.tsx` |
| Project and recovery | `src/types/map.ts`, `src/utils/storage.ts`, `src/hooks/useMapPersistence.ts`, `useMapState.ts`, `useMapHistory.ts`, `useLevelManagement.ts` |
| Player visibility | `src/utils/tokenVisibility.ts`, `dynamicFog.ts`, `fov.ts`, `lightSources.ts`, plus consumers in `App.tsx`, `MapCanvas.tsx`, `export.ts`, `renderMap.ts` |
| Art | `src/themes/*`, `src/utils/artStylePresets.ts`, `paperTexture.ts`, `edgeBlend.ts`, `handDrawn.ts`, `lightingAtmosphere.ts`, `stampCatalog.ts`, `iconLibrary.ts` |
| Export | `src/components/ExportDialog.tsx`, `src/utils/export.ts`, `src/utils/renderMap.ts` |
| Styling and delivery | `src/App.css`, `src/index.css`, `vite.config.ts`, `index.html`, `public/`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` |

## 3. The end-user workflows

### A. New DM: "I need something playable tonight"

1. Land on **Your maps**, not a blank editor. Show **Create map**, **Open a sample**, and **Import project**. Explain "Stored on this device. Export a backup to keep another copy."
2. Choose a starting point: **Ready-to-play sample**, **Generate**, **Blank map**, or **Trace an image**. Samples are editable copies.
3. For Generate, choose environment, approximate size, and complexity. Show a visual preview and **Use this map**. Put seed and algorithm controls in Advanced.
4. Open the editor with the map fitted to the viewport. A dismissible checklist offers **Shape the map**, **Add details**, **Prepare for play**. It is optional and never blocks work.
5. Select an object directly to inspect it. Choose a material alongside the active drawing tool rather than scrolling to a distant palette.
6. Open **Prepare session**. Add the party, mark private notes, choose starting visibility, and inspect **Preview as player**.
7. Start the session only after a readable readiness summary. Warn about no visible starting area or missing party sight sources, but allow intentional manual-fog play.
8. Choose **Open player display** or stay in the DM workspace. The former opens a separate local viewing surface, not a network session.

**Completion:** A new DM can get from first launch to a playable sample without learning seeds, tile pixel sizes, or keyboard shortcuts.

### B. Experienced DM: "I need to build and reuse a location"

1. Find a project by title, tag, or recent use; duplicate it before making a variant.
2. Use the editor's Build, Decorate, and Look categories with remembered preferences.
3. Add floors within the project. Preserve the existing multi-level and stair-link model.
4. Save repeated arrangements as scene templates and favorite materials/stamps.
5. Generate into a selected region with an explicit preview of the affected area. Commit it as one undoable edit.
6. Review notes and encounters, then export either a private project backup or a player-facing image.

**Completion:** The user knows which project and level they are editing, which objects are selected, and whether their latest change is saved.

### C. DM during play: "Keep the table moving"

1. Resume a saved session or start one from the prepared project.
2. See DM notes and controls beside an always-available player preview.
3. Reveal an area, move a token, measure a distance, ping a location, and advance the turn without navigating through authoring tools.
4. Switch floors deliberately. The player display changes only on **Show this level**, not when the DM inspects another floor.
5. Blank/pause the player display immediately when needed. While blanked, queued revisions must not flash on screen.
6. End with **Save session progress** or **Discard changes since session start**, with clear confirmation and a retained recovery checkpoint.
7. Resume later with token positions, fog exploration, active level, and encounter progress restored.

**Completion:** The DM does not switch into a player-looking interface to reveal fog and then switch back to find private notes.

### D. Player at the table: "Show me what I can act on"

The first release's player display is read-only: full map view, public notes/legend, visible initiative, zoom/fit, and clear paused/reconnecting states. No setup wizard, library, editor switch, fog controls, or private exports.

A later remote interactive player joins by invitation, receives a player-safe projection, and has only explicitly granted token movement, pings, and drawing. "My token" requires identity and ownership infrastructure; do not simulate ownership with UI labels alone.

**Completion:** A player can understand the scene without knowing the editor exists. A local viewing mode is not represented as an authentication boundary.

### E. Returning, offline, and recovering

1. Library shows the last project and last session with **Continue**.
2. Distinguish **Saving**, **Saved on this device**, **Save failed**, and **Offline**. Being offline is not itself a save failure.
3. If restoration fails, retain the original stored record and offer recovery/import/download actions. Do not silently replace it with a fresh blank project.
4. If another tab has the same project open, explain the conflict and prevent stale automatic overwrites.
5. Export a backup from a failure state when possible. Local checkpoints are not protection against clearing browser storage.

### F. Sharing and printing

One **Export** entry asks for intent first:

| Intent | Default behavior |
| --- | --- |
| Back up editable project | Full project JSON, clearly labeled "Includes DM-only content". |
| Share with players | Audience-filtered PNG or SVG, previewed from the same projected state used by player display. |
| Print for the table | Audience selection, physical grid scale, page size, overlap/margins, page count, ink-friendly preview. |
| Use in another map tool | Grid-aligned image, dimensions and pixels-per-cell metadata shown; no claim of native VTT integration without an adapter. |

Cancel or failure must preserve the project. Large exports need a bounded rendering strategy and progress feedback, not just a warning before allocating an enormous canvas.

## 4. Information architecture and layout

### Proposed vocabulary

| Term | Meaning |
| --- | --- |
| Project | One location/adventure map document with one or more levels and reusable project assets. |
| Level | Existing floor/map inside a project; preserve this distinction from a separate project. |
| Template | A reusable arrangement or starting point, copied into editable content. |
| Edit | Author geometry, objects, notes, and appearance. |
| Prepare | Configure the party, encounter, visibility, and starting state. |
| Run | Control the current session as DM. |
| Player display | Only the published audience view. Replaces the ambiguous user-facing promise of Present. |
| Theme | Setting/material identity, such as dungeon or starship. |
| Art style | Visual treatment, such as illustrated, minimal, or print. |

### Desktop editor

```text
+--------------------------------------------------------------------------+
| Your maps / Project / Level     Saved on this device   Edit | Run  Export |
+----------+--------------------------------------------+------------------+
| Build    | Select  Room  Paint   [contextual options]  | Selected object  |
| Decorate |                                            | Name / material  |
| Look     |                                            | Transform        |
| Levels   |                MAP CANVAS                  | Visibility       |
|          |                                            |                  |
| Context  |                                            | Notes (on demand)|
| library  |                                            |                  |
+----------+--------------------------------------------+------------------+
| Tool hint / selection feedback                     Zoom / Fit / Help     |
+--------------------------------------------------------------------------+
```

At 1440 px, target a 64 px maximum normal header, a 64 px labeled rail, an optional 240 px library, and an optional 280 px inspector. Both panels can collapse. Never reserve an empty right panel for statistics. These are starting constraints, not pixel-perfect requirements at browser zoom.

- Global header: project identity, save health, Edit/Run, Export, and project menu.
- Geometry dimensions belong in **Project settings**, not permanent header selects.
- Canvas zoom, export resolution, grid distance, and interface text size are separate concepts with separate labels.
- Build: select/move, room shapes, floors, walls/openings, paths/rivers.
- Decorate: searchable stamps, tokens, markers, templates, favorites.
- Look: theme cards and art style previews, then optional advanced controls.
- Context inspector: only properties for the current selection; separate bulk-selection summary.
- Notes and encounter preparation open when requested. The editor does not permanently allocate space to an empty initiative list.
- Details, delete, and transform actions have visible buttons; shortcuts and right-click menus are accelerators.
- Preserve existing shortcuts where possible. Resolve a conflict explicitly instead of silently changing established muscle memory.

### DM run workspace

```text
+--------------------------------------------------------------------------+
| Project / Session  Saved   Player display: Live   Pause display  End      |
+------------------+-----------------------------------+-------------------+
| Levels / reveal  |                                   | Encounter         |
| Party / lights   |        DM MAP + player preview     | Current turn      |
| Measure / ping   |                                   | Public / DM notes |
+------------------+-----------------------------------+-------------------+
| Selected token / action hint                         Undo session action |
+--------------------------------------------------------------------------+
```

Show a persistent **DM view** label. Make the selected level and the published level distinguishable. **Pause display** stays available even when another tool or sheet is open.

### Tablet and phone

| Width | Behavior |
| --- | --- |
| 1280 px and above | Optional two-panel editor; large canvas; visible text labels. |
| 768 to 1279 px | One side panel at a time; inspector/library switch without stacking over each other. |
| Below 768 px | Canvas plus labeled bottom actions and one bottom sheet; creation and session basics prioritized. |
| Player display on any width | Canvas-first with optional public information; never a resized DM toolbar. |

Use at least 44 x 44 CSS px touch targets as a product standard. Handle safe-area insets, dynamic viewport height, landscape orientation, and the on-screen keyboard. No critical action may depend on long press, hover, drag-only interaction, or tiny icon recognition.

Default touch navigation to pan/zoom until an explicit drawing tool is selected. Make drawing mode obvious, allow immediate cancel, and provide non-drag alternatives for object placement and rearrangement.

### States that must be designed, not left to chance

Every milestone must cover loading, empty, selected, busy, disabled-with-reason, success, failure, and cancellation where applicable. Specifically design missing assets, blocked popups, failed saves, failed import/migration, stale tabs, zero visible cells, disconnected display, no encounter participants, and missing fonts.

Use plain labels: **Cover map**, **Reveal area**, **Player preview**, **Add private note**, **Download backup**. Explain technical terms such as FOV as "Line of sight" before exposing abbreviations.

## 5. Art direction: the illustrated cartographer's folio

### Visual concept

Use an illustrated atlas with a more playful interface: deep purple panels, blue-black map surrounds, lavender and blue accents, and warm red/orange actions. In UX-00, the owner approved the workflow direction for a pilot but rejected the initial ivory palette as too bland. Use one sans-serif family throughout the interface, with weight and italics for hierarchy. Keep accessible lettering and restrained map detail. Do not apply parchment texture to every control.

The memorable feature is the map: continuous architectural silhouettes, soft material variation, and restrained shadows. Reserve bright accents for selected objects, party tokens, and actionable state.

Pilot design tokens, revised after owner feedback in UX-00. Measured examples and remaining accessibility work are recorded in the [handoff](./UX-00-HANDOFF.md):

| Token | Initial direction |
| --- | --- |
| Canvas surround | Blue-black `#121723`, separate from floor materials |
| Panel surface | Deep purple `#1E1930`; raised surfaces `#272344` |
| Primary ink | Near-white `#F6F3FF` |
| Secondary ink | Pale lavender `#C4BDD7` |
| Primary action | Warm orange `#FF9569` with dark `#201018` text |
| Private/destructive state | Light red `#FFADAD`, paired with explicit text/icon |
| Decorative accent | Lavender `#B9A0FF` and blue `#8DBBFF` |
| Display type | Same sans-serif family as controls; bold/italic for hierarchy |
| UI type | Avenir Next in the prototype, sans-serif platform fallbacks; choose one licensed self-hosted family for production |
| Numeric type | Tabular numerals in the same sans-serif family |

Self-host approved font files with their license notices. Use readable fallbacks, never block map rendering on font loading. Suggested colors are not a claim of WCAG compliance.

### Map art rules

1. **Floors recede.** Low-contrast stone, wood, soil, or metal variation; no individually outlined noise at every grid cell.
2. **Walls form boundaries.** Render continuous wall masses and readable inner edges. Avoid repeated glossy highlights that resemble strings of beads.
3. **Water has banks.** Muted blue-green water, subtle directional flow, connected shores, and restrained highlights rather than a saturated geometric stripe.
4. **Objects have coherent scale.** Tables, crates, vegetation, machinery, and rocks share top-down perspective and a common light direction.
5. **Game information wins.** Token silhouettes, doors, hazards, movement boundaries, and fog remain legible above detail.
6. **Labels are selective.** Reduce label density at fit-to-map zoom. Show private room numbers only in the appropriate DM context.
7. **Beauty is optional.** Preserve Minimal and print treatments; reduce texture/detail at small zoom or constrained performance.
8. **Appearance does not change rules.** Cosmetic atmosphere must not modify visibility, movement, or geometry.

Do not replace existing assets wholesale. The current procedural art primitives and SVG catalogs are valuable foundations. Prototype one coherent kit first, then extend all thirteen settings using shared contracts.

### Commissionable asset backlog

Quantities below are initial production scope, not descriptions of assets already present.

| ID | Deliverable | Visual brief | Acceptance |
| --- | --- | --- | --- |
| ART-01 | Approximately 24 UI icons | One consistent stroke family for primary actions, levels, notes, visibility, save, export, and status. Replace emoji-dependent chrome, not expressive map art. | 24-unit viewBox; legible at 16/20/24 px; accessible name on the control; active/disabled/forced-color states. |
| ART-02 | Dungeon vertical-slice kit | Flagstone, worn wood, earth, rock, water; continuous stone walls; clear doors, arches, stairs, pillars. Four subtle variants per initial surface. | One complete 32 x 32 reference map; corners, T-junctions, narrow corridors, and tile seams reviewed at 25/50/100/200% zoom. |
| ART-03 | At least 24 furnishing stamps | Tables, seats, beds, shelves, crates, barrels, altar, rubble, vegetation and camp props. Restrained top-down linework. | Consistent scale/anchor/shadow; rotation/flip; transparent background; meaningful thumbnails and names. |
| ART-04 | Twelve token silhouettes and three affiliation frames | Readable humanoid/creature silhouettes; party/NPC/hostile identified by both shape/mark and color. Portrait uploads remain optional future work. | Recognizable at one-cell size and grayscale; focus ring independent of ownership/affiliation. |
| ART-05 | Wilderness and starship follow-up kits | Wilderness: moss, roots, soft banks, organic clustering. Starship: cool panels, grouped seams, small practical lights, crisp bulkheads. | Match the same geometry and visibility contracts; no fantasy parchment forced onto sci-fi maps. |
| ART-06 | Three launch sample projects and previews | Crypt, woodland crossing, and ship compartment; clear entrance, focal point, encounter space, and readable traversal. | Beautiful at fit-to-map; useful private/public notes; player-safe preview; fresh editable copy when opened. |
| ART-07 | Empty-state and first-use illustrations | Small original map fragments or line drawings explaining creation, storage, and player display. | Lightweight, decorative alt treatment where appropriate; no distracting animation or fake interactive controls. |
| ART-08 | Print companion set | Monochrome material hatching, wall contours, doors, stairs, and token markers. | Readable on A4/Letter at intended scale; no essential information lost without color. |
| ART-09 | Remaining theme adaptation sheets | A palette/material/object sheet for each remaining setting, rather than thirteen independent rendering engines. | Existing theme IDs still load; each setting has reviewed map and print contact sheets. |

### Asset and rendering contract

Proposed manifest fields: stable asset ID, pack ID/version, category, tags, author, source/license/attribution, dimensions or viewBox, footprint in cells, anchor, preview, variants, fallback, and content hash.

- Keep authored SVG sources for icons and stamps. Validate imported SVG and forbid executable or externally fetching content before admitting future uploads.
- If raster surfaces are needed, use seamless source textures and optimized WebP/PNG delivery. Supply 1x/2x derivatives and transparent padding where required.
- Footprints, collision, occlusion, and token ownership belong to semantic data, not image filenames or decorative shadows.
- Reuse existing coordinate-seeded variation. Save a render-version/pack reference so upgrades do not silently change old project appearance.
- Cache decoded images/patterns by asset version and relevant render parameters. Bound cache memory. Do not decode or synthesize textures during every pointer move.
- A missing asset produces a visible warning and semantic fallback, not an invisible wall or failed project.
- Extend the existing Canvas renderer and export composition deliberately. `MapCanvas`, `renderMapToCanvas`, and SVG export are separate consumers today; parity must be demonstrated, not assumed from the existence of shared utilities.
- SVG export may embed raster art when needed, with honest output labeling. Never depend on an external URL that can disappear or taint canvas export.
- Keep print suppression of texture, blending, and atmosphere intact, with a monochrome geometry/object fallback.
- Theme pack cache lifecycle must preserve assets used by locally saved projects. Lazy download optional packs; explicitly offer offline availability rather than caching the entire catalog by surprise.
- Initial targets: core UI icon/font addition at most 300 KB compressed; one starter map art kit at most 2 MB transferred; defer larger optional kits. Measure actual load and memory before accepting an exception.

Use original commissioned art or assets with explicitly compatible permissions. Store provenance and notices alongside each pack. Do not treat previous competitor/license commentary as legal clearance, and do not copy another product's artwork or distinctive interface.

## 6. Required architecture and behavioral contracts

### A. Project catalog and persistence

Retain IndexedDB; introduce a repository interface rather than coupling each screen to object-store calls.

**UX-01 follow-up closeout:** local UUID project records, atomic migration of the former autosave, per-project CAS/serialized saves, URL-scoped tab selection, and a minimal chooser/recovery manager are merged in [#159](https://github.com/evillollive/Dungeon-Mapper/pull/159). Independent browser/storage qualification is **Ready with minor follow-ups**, with 98 scenario-engine passes and no remaining failed data-integrity scenarios. This is not the UX-02 Library or UX-09 release certification. The owner approved pausing named destructive actions for explicit cleanup at 20 durable checkpoints per project while ordinary edits continue saving. Legacy originals are outside checkpoint cleanup. See [UX-01 handoff](./UX-01-HANDOFF.md) for keys/APIs and [qualification](./UX-01-QUALIFICATION.md) for exact candidate/merge provenance, evidence and remaining limitations.

Proposed records:

```text
ProjectRecord: stable ID, schemaVersion, revision, title, timestamps,
               thumbnail reference, tags, DungeonProject payload
RecoveryRecord: project ID, revision, reason, timestamp, snapshot reference
WorkspaceState: project ID, active level, mode, panel choices, viewport
SessionRecord: session ID, source project ID/revision, current map state,
               published level, encounter progress, timestamps
```

These are proposed contracts, not existing TypeScript interfaces. Existing map metadata names a level; introduce project naming without silently relabeling every level.

Migrate the single autosave transactionally into one project record. Keep legacy single-map JSON imports and existing project exports readable. Validate bounds and nested structures before applying data; preserve unknown future-version input for download and explain incompatibility.

Use revisions to reject stale writes. Serialize or coalesce autosaves so an older asynchronous write cannot overwrite a newer one. Define successful save as transaction completion. Expose storage/quota failures and retain recoverable in-memory work.

Do not persist the complete existing undo stack by accident. Initially, retain per-level undo within a session and durable recovery checkpoints across reloads; label this distinction. Add persisted undo only as a separately budgeted feature.

### B. One action model, several surfaces

Introduce a typed action registry that supplies labels, shortcuts, availability, mode, selection requirements, and handlers to the header, command palette, desktop controls, and mobile controls.

Reuse existing contexts and state hooks. Extract small boundaries from `App.tsx` as needed. Avoid replacing all state management or all CSS in one pull request.

Selection should be explicit and mutually coherent across tokens, notes, rooms, stamps, and regions. Changing tool, level, or role clears invalid selections and cancels unfinished gestures. Every destructive action identifies scope.

### C. Explicit visibility and audience projection

Fog answers "has the geography been seen?" It does not answer "may this note or secret be shared?"

Proposed defaults requiring acceptance in UX-00:

- Notes have distinct private text and public text, with explicit publication state.
- Legacy note descriptions migrate as DM-private until reviewed. Explain this migration; do not delete or rewrite content.
- Secret doors, traps, hidden entities, and secret level names need audience-aware representations independent of whether their cell is revealed.
- Encounter participants can exist without being public. Token labels, initiative entries, counts, selection outlines, and status messages follow the same visibility policy.
- Display publication is explicit. Merely selecting a DM level does not publish it.

Define a pure `projectForAudience`-style boundary and a serializable player-view model. The exact API name is open. It must cover tiles, objects, notes, annotations, levels, initiative, lighting/fog state, accessible descriptions, and export metadata.

All player surfaces consume the projection, not the full project plus ad hoc hidden CSS. Cover minimap and thumbnails as well as the main canvas. Existing FOV/token utilities remain the geometric foundation.

For a local same-browser display, send only this projection, but state clearly that the host device/browser remains trusted. Remote permission enforcement requires a server and is deferred.

### D. Session lifecycle and local display

Start a session from a versioned project checkpoint; save mutable play progress in a session record. End-session choices decide whether to retain progress, restore the start, or explicitly copy relevant changes back to the authored project.

Existing token ordering is reused. Add current turn, round, next/previous turn, and reset as a small rules-neutral encounter model. Conditions or hit points are later extensions unless usability research proves they are essential.

For a second window, use a same-origin transport such as BroadcastChannel with a narrow message contract: session/display ID, protocol version, monotonic revision, projected snapshot, pause state, and acknowledgement. Start blank until a valid snapshot arrives. Ignore stale revisions. On transport loss, blank or show a neutral disconnected state without revealing cached private data.

Add popup-blocked guidance and a same-window player-preview fallback. Navigation and reload must recover the correct session without opening a second independent editor over the same autosave key.

### E. Export contract

Separate render intent from current editor state. Pass explicit audience, level scope, grid visibility, resolution/physical scale, and art settings. Do not export the live editor canvas as a substitute for audience-safe rendering.

Use bounded tile/page rendering for large outputs. Show estimated output size and progress; handle decode failures, cancellation, and browser canvas limits. A "300 DPI" label is not enough to guarantee physical print scale; test final pixel dimensions and print instructions.

### F. Offline and release behavior

Keep no-account local use intact. Test the production PWA under the Pages base path, not only Vite development mode. Replace unsafe mid-session update behavior with a save-aware update prompt if production testing shows automatic activation can interrupt work.

Private thumbnails and session data remain local by default. Analytics are not needed to deliver this redesign. Use consented usability studies and local diagnostic exports stripped of map content.

## 7. Dependency-ordered implementation backlog

The status ledger below records actual progress. Each item is a work package for one or more sessions, not a promise of one-PR completion. P0 means trust or core workflow; P1 means first redesigned release; P2 means later expansion.

```text
UX-00 baseline and decision gates
  -> UX-01 save/recovery and compatibility
       -> UX-02 library and creation
  -> UX-03 action model and editor shell
       -> UX-04 focused editing and responsive controls
  -> UX-05 audience visibility (uses UX-01, UX-03)
       -> UX-06 session lifecycle and player display (also UX-02, UX-04)
  -> UX-07 art vertical slice (uses UX-03, UX-04; respects UX-05)
  -> UX-08 unified export and production offline (uses UX-01, UX-05, UX-07)
       -> UX-09 release qualification (all preceding packages)
            -> UX-10 optional remote collaboration
```

Art exploration and usability research may run alongside infrastructure work, but production player display must not precede the visibility contract.

### UX-00: Baseline, prototypes, and decision gates

**Priority:** P0. **Depends on:** none.

**Progress, 2026-09-07:** Reproduced the browser baseline at `01da138`. The owner approved local-first scope, private legacy notes, read-only local display, and separate authored-project/session progress. The workflow direction was accepted for a pilot with a requested colorful purple/blue/red-orange/black palette and one sans-serif family, replacing the initial ivory/serif treatment. Library/Edit/Run/Player prototypes include normal, empty, and error scenarios without changing production behavior. See the [evidence, decisions, prototype instructions, and research handoff](./UX-00-HANDOFF.md) and [command migration inventory](./UX-00-COMMAND-INVENTORY.md). No participants have been observed; research and final production visual acceptance remain required.

**Owner closeout, 2026-09-07:** The revised prototype is accepted. The owner explicitly chose to defer participant research and proceed to UX-01. This permits UX-01 to begin despite the open UX-00 research gate; it does not mark usability criteria passed or waive UX-09 release qualification.

**Deliverables:** Reproduce the walkthrough at the session's actual commit. Inventory every existing command and assign it to the proposed navigation. Produce clickable or coded prototypes for Library, Edit, Run, and Player display, including empty/error states. Record before/after screenshots and timings with the same fixture.

Resolve one decision at a time with the owner: local-first release scope; migration of legacy notes to private; read-only local player display before remote interaction; target art direction; authored-project versus session-progress semantics.

**Implementation anchors:** `docs/USER-EXPERIENCE-ROADMAP.md`, current shell/components and test directories. No product dependency changes just to draw a prototype.

**Acceptance/tests:** Five DMs and five players, or a documented smaller pilot before recruitment expands, can explain Edit versus Run versus Player display. Observe first-use tasks without coaching. Collect navigation errors and perceived map readability separately from aesthetic preference. No claim of usability success based solely on developer review.

**Handoff:** Approved decisions, fixture IDs, annotated layouts, revised milestone scope, and unresolved questions. Do not mark later milestones complete because prototypes exist.

### UX-01: Save trust, compatibility, and recovery

**Priority:** P0. **Depends on:** UX-00.

**Deliverables:** Versioned schema validation/migration, transactional repository, revision-aware autosave, visible save status, initial recovery checkpoints, and non-destructive replacement flows. Include the 40 x 40 header mismatch as a targeted regression fix before relocating size controls.

**Implementation anchors:** `src/types/map.ts`, `src/utils/storage.ts`, `src/hooks/useMapPersistence.ts`, `useMapState.ts`, `useLevelManagement.ts`, `MapHeader.tsx`.

**Tests:** Legacy bare-map and current-project fixtures migrate once without loss; custom themes/stamps/templates, rivers, room shapes, links, and fog survive round trips. Delay writes to force out-of-order completion. Simulate quota/transaction failure, invalid data, blocked upgrade, and two-tab stale writes. Failed restore leaves the original record intact. Resize UI truthfully displays 40 x 40 and preserves valid dimensions.

**Acceptance:** "Saved" appears only after the latest transaction succeeds. New/import/sample replacement never destroys the only recoverable project. Recovery actions work after reload. Backups retain private content with an explicit warning.

**Handoff:** Schema version, migration fixtures, repository API, save-state diagram, and documented recovery/undo limits.

### UX-02: Library and guided creation

**Priority:** P0. **Depends on:** UX-01.

**Deliverables:** Searchable local project library with recent projects, rename, duplicate, tags, archive/trash and deliberate deletion, import, and backup. Introduce the four creation paths and preview-before-commit generation. Templates/samples create new projects by default, not replacements.

**Implementation anchors:** New library/creation components, repository from UX-01, `GenerateHub.tsx`, `src/utils/premadeMaps.ts`, existing generator interfaces, background-image import.

**Tests:** Create two projects, reopen each, duplicate without ID aliasing, restore from trash, filter/search, and reload offline. Cancel creation/import/generation without touching the active project. Fail thumbnail generation without losing the map or hiding the error. Generate the same seed/options twice and compare geometry. Imported unsupported versions produce an actionable error.

**Acceptance:** New users can choose a ready-to-play sample from the initial screen. Returning users can reopen a project in at most two deliberate actions. Search does not require a network connection.

**Handoff:** Library schema/indexes, copy-versus-replace rules, and first-use browser journeys.

### UX-03: Unified navigation and design foundations

**Status:** Implemented and browser-qualified on September 8, 2026. Exact-head CI remains required before merge. All 68 shortcut identities are accounted for; production command parity, layout evidence, and intentional compatibility changes are recorded in [UX-03-HANDOFF.md](./UX-03-HANDOFF.md). UX-04 object/device parity and UX-05/06 audience/session work remain separate.

**Priority:** P1. **Depends on:** UX-00; integrate save/library controls after UX-01/02.

**Deliverables:** Typed action registry, semantic design tokens, new shell, mode labels, contextual panel host, consistent icon family, readable typography, and relocated settings. Retire Rail/Tabs as separate mental models after feature parity is recorded.

**Implementation anchors:** `App.tsx`, `src/contexts/*`, `MapHeader.tsx`, `NavigationRail.tsx`, `Toolbar.tsx`, `CommandPalette.tsx`, shortcuts, `App.css`, `index.css`.

**Tests:** Every old supported action maps to a visible new destination or documented intentional removal. Menu/palette/keyboard/mobile invoke the same handler with the same availability. Tool shortcuts do not fire in text inputs or inactive modes. Focus returns after dialogs; text zoom does not truncate essential labels.

**Acceptance:** Header remains focused at 1440 x 900; empty inspector does not consume a permanent column. All actions are discoverable without shortcuts. Contrast and focus tokens meet the accessibility gates.

**Handoff:** Command migration table, semantic token names, layout snapshots, and compatibility flag retirement criteria.

### UX-04: Focused editing and device parity

**Status:** Implemented and browser-qualified on September 8, 2026. Exact-head CI and Agent Merge readiness remain required before landing. [UX-04-HANDOFF.md](./UX-04-HANDOFF.md) records the selection/input model, three-engine evidence, compatibility contracts and physical-device limitations. No participant acceptance is claimed.

**Priority:** P1. **Depends on:** UX-03; creation integration uses UX-02.

**Deliverables:** Co-located tool/material controls, unified contextual selection inspector, searchable/favoritable asset browser, clear Build/Decorate/Look categories, responsive sheets, and complete cancel/undo behavior. Fit newly opened maps once without resetting a returning user's viewport.

**Implementation anchors:** `DrawToolsTab.tsx`, `StampPicker.tsx`, `SelectionInspector.tsx`, `MapCanvas.tsx`, `MobileToolbar.tsx`, `LevelTabs.tsx`, drawing/history hooks.

**Tests:** Place/select/edit/delete a token, note, stamp, room, river, and region; changing level clears invalid selection. One completed gesture maps to the intended undo unit. Pointer cancel, Escape, touch interruption, pen input, and viewport changes do not leave stuck tools. Keyboard alternatives cover level reorder and object transforms.

**Acceptance:** A DM can change room shape, material, and appearance without hunting through a long all-tools panel. At 390 x 844, required controls do not overlap the keyboard/safe area and no critical action is long-press-only.

**Handoff:** Selection model, input interaction matrix, browser journeys, and documented mobile feature boundaries.

### UX-05: Audience-safe content and player preview

**Status:** Implemented with Chromium production qualification on September 10, 2026. Firefox/WebKit reruns remain open because the external browser SDK could not be restored through the available package registries. Exact-head CI and PR review remain landing gates. [UX-05-HANDOFF.md](./UX-05-HANDOFF.md) documents the surface policy and conservative rendering limitations.

**Priority:** P0. **Depends on:** UX-01 and UX-03.

**Deliverables:** Explicit note publication/private text, discovery state for secrets, audience projection, and read-only player components. Replace misleading no-op mutation affordances. Apply the contract across canvas, minimap, initiative, notes, accessibility text, previews, and exports.

**Implementation anchors:** `src/types/map.ts`, fog/visibility utilities, `App.tsx`, `MapCanvas.tsx`, `NotesPanel.tsx`, `InitiativePanel.tsx`, `renderMap.ts`, `export.ts`.

**Tests:** Build the hidden-content fixture in section 8. Search player projection, DOM/accessibility tree, SVG/text/metadata, and outgoing display messages for private sentinel values. Verify secret doors resemble ordinary walls until discovered; explored areas do not publish private notes; partial token footprints and no-light dynamic fog behave consistently. Test that note controls are actually absent in read-only surfaces.

**Acceptance:** Player preview has no editor mutation entry points. Every audience consumer uses the same documented visibility policy; exceptions require explicit tests and rationale.

**Handoff:** Visibility truth table, migrated-content explanation, projected DTO schema, and surface-by-surface coverage.

### UX-06: DM session workspace and local player display

**Priority:** P1. **Depends on:** UX-02, UX-04, UX-05.

**Status:** Implemented with production Chromium two-window qualification on September 11, 2026 UTC. [UX-06 handoff](./UX-06-HANDOFF.md) records session/CAS isolation, the blank-first display protocol, recovery semantics, production evidence and remaining gates. PR review and exact-head CI remain required; Firefox/WebKit and later device/release qualification are open.

**Deliverables:** Prepare checklist, session checkpoints, Run workspace, current turn/round, next/previous turn, reveal controls, pings, player preview, local second-window display, pause/blank, and resume/end flow.

**Implementation anchors:** `App.tsx`, `TacticalToolsTab.tsx`, `PlayerToolbar.tsx`, `InitiativePanel.tsx`, level/fog/token hooks; new session repository and display transport.

**Tests:** Start, reveal, move, advance, pause, change DM level, explicitly publish level, reload, reconnect, and end. A new display starts blank; stale snapshots are ignored; a disconnected/reloaded display does not reveal an intermediate full map. Popup-blocked flow is actionable. Ending/discarding affects the session rather than silently destroying authored geometry.

**Acceptance:** Routine DM play actions remain available without returning to Edit. Public display never contains fog-authoring controls or a switch to the DM interface. UI explains that this is local display, not online multiplayer.

**Handoff:** Session state machine, transport protocol, ownership/trust assumptions, and two-window browser tests.

### UX-07: Cohesive art vertical slice and asset pipeline

**Priority:** P1. **Depends on:** UX-03/04; visibility-sensitive assets integrate with UX-05.

**First bounded milestone, September 11, 2026:** The owner chose the dungeon
slice first, with visual approval before expanding the artwork. Implemented
the opt-in **Dungeon Folio v1** theme and **The Quiet Cistern** sample.
This is a partial ART-02/reference and pack-contract slice, not completion of
ART-01 through ART-08. Owner art approval is pending.

Open **Your maps > Open a sample > The Quiet Cistern**, or choose
**Look > Theme > Dungeon Folio v1** on an existing map. The sample uses the
existing Minimal preset, no additional atmosphere, four notes with explicit
public/private content, a sealed room, and reused catalog stamps/tokens.
The original default sample, all existing theme IDs, and all preset IDs remain
unchanged.

The pack uses quieter flagstone and rock, muted connected water banks,
continuous wall masses, timber doors, distinct stairs, arches, pillars and
semantic hazard symbols. Four coordinate-seeded surface variants reduce
repetition. Fine surface marks are suppressed below a 16-pixel render tile.
This is render-resolution detail reduction, not a new editor zoom/LOD engine.
Worn-wood and earth floor materials, new furnishing/token art, UI icons/fonts,
illustrations, further samples and full print companion artwork remain later work.

**Version and renderer contract:** The immutable theme ID `dungeon-folio-v1`
is saved in the existing map/per-tile theme fields. No schema migration or
silent upgrade occurs. `src/themes/folio-v1/manifest.ts` records stable asset
IDs, pack/render versions, provenance, AGPL-3.0-or-later notice, viewBox,
footprints, anchors, variants, fallback semantics and a SHA-256 source fingerprint.
Editable source is `art.ts`; `NOTICE.txt` records authorship. Canvas and native
SVG consume the same normalized vector geometry. Print continues using the
existing semantic renderer. The cache is local to v1, bounded to 256 geometry
entries and keyed by semantic tile, variant, adjacency and detail tier.
There are no raster decodes or external requests.

Unknown Folio version IDs retain their saved reference and use the legacy Dungeon
renderer; Look reports that fallback explicitly. Bundled source corruption is a
build/fingerprint failure, not a runtime downloadable-asset recovery mechanism.
Optional pack installation, missing-file recovery and cache lifecycle UI remain
future work. This kit ships with the app; it adds no separate offline download.

**Evidence:** [Editor and pack picker](./media/ux07/editor.png),
[player preview](./media/ux07/player.png),
[phone player preview](./media/ux07/player-phone.png),
[before/after, player, SVG and print](./media/ux07/contact-sheet.png), and
[25/50/100/200% render-scale sheet](./media/ux07/zoom-sheet.png).
The production creation/save/reload/preview journey passed in Chromium
152.0.7977.83 at `/Dungeon-Mapper/`. Development render contact sheets use
the same reference with original Dungeon versus Folio art. These are not
cross-browser, physical-device, printed-paper or participant acceptance.

The 128 x 128 renderer probe at 16 pixels/cell measured 16.7 ms cold,
14.9 ms warm median and 18.1 ms warm maximum over ten warm samples, retaining
32 cached geometry entries. A production 32 x 32 editor probe measured
8.3 ms median and 8.9 ms p95 dispatch-to-next-frame time over 32 synthetic
pointer moves. These are local observations, not end-to-end hardware input
latency or a release performance certification. The source kit plus picker
CSS is 10,907 bytes, 3,861 bytes gzip; it is bundled into existing chunks,
not independently transferred. It introduces no image/font downloads.

Reusable Page-based browser helpers are `src/test/ux07Art.browser.mjs`
(production journey) and `src/test/ux07Art.render.browser.mjs` (Vite-only
contact sheets). Import their default functions in a Playwright-capable
runner and pass a Page already navigated to the appropriate base URL.
They create and close isolated contexts and add no application dependency.
Targeted Vitest coverage includes stable versions, source fingerprint,
determinism/cache bounds, exposed/shared edges, Canvas/SVG geometry,
sample connectivity, fresh copies, projected secrets and print fallback.

**Deliverables:** ART-01 through ART-04, ART-06 through ART-08 for the initial release, plus asset manifest/provenance, pack/version selection, previews, deterministic variants, caching, and fallbacks. ART-05/09 extend after the dungeon slice is approved.

**Implementation anchors:** `src/themes/*`, existing art utilities/catalogs, `artStylePresets.ts`, `MapCanvas.tsx`, `renderMap.ts`, `export.ts`, new versioned asset directories.

**Tests:** Determinism, cache invalidation, missing/corrupt asset fallback, seamless surfaces, rotated/scaled stamps, grayscale readability, and fog composition. Visual snapshots of the same maps in editor/player/PNG/SVG/print at several zooms. Evaluate pointer performance with art enabled.

**Acceptance:** Before/after review demonstrates more readable floor/wall/object hierarchy, not merely stronger effects. The owner approves the reference map at normal play scale. Existing saved theme/preset IDs continue to work; pack upgrades are deliberate.

**Handoff:** Art contact sheets, editable source files, licenses, manifest schema, measured asset budgets, and reference render fixtures.

### UX-08: Unified export, production offline, and portability

**Priority:** P0/P1. **Depends on:** UX-01, UX-05, UX-07.

**Deliverables:** One intent-first export dialog, private/public warnings and previews, bounded high-resolution export, print page planning, production base-path fixes if reproduced, offline pack readiness, and save-aware update/reload behavior.

**Implementation anchors:** `ExportDialog.tsx`, `MapHeader.tsx`, `src/utils/export.ts`, `renderMap.ts`, `vite.config.ts`, `index.html`, `public/`.

**Tests:** JSON round trip; PNG/SVG audience parity; no editor handles in exports; correct physical scale and page overlap; cancel/failure retains work. Test 128 x 128 export with high resolution without allocating the entire unbounded surface. Open production build at `/Dungeon-Mapper/`, cache intentionally, disconnect network, reload, edit/save/reopen, and trigger a controlled app upgrade.

**Acceptance:** User sees audience, dimensions, output scope, and expected page count before download. Optional missing art works with an explained fallback. Offline use does not depend on third-party fonts or remote images.

**Handoff:** Export contract, browser limits, production offline procedure, and release/update policy.

### UX-09: Accessibility, performance, and release qualification

**Priority:** P0/P1. **Depends on:** UX-01 through UX-08.

**Deliverables:** Completed acceptance matrix, human task study, keyboard/screen-reader pass, browser regression coverage, measured performance report, updated feature/help docs, and blocking CI for agreed gates.

**Implementation anchors:** Existing Vitest/Testing Library tests; new browser suite configured deliberately in this milestone or earlier when first needed; `.github/workflows/ci.yml`; docs.

**Tests:** All section 8 fixtures and journeys. Run lint and resolve or explicitly scope existing debt before removing `continue-on-error`; do not claim a clean baseline prematurely. New browser tooling must have locked dependencies and documented scripts rather than assuming Playwright is already an npm dependency.

**Acceptance:** No open P0 data-loss, audience disclosure, unrecoverable flow, or inaccessible critical-action defect. All first-release workflow packages are complete. Deferred platform/device limits are explicit.

**Handoff:** Release checklist, measured results, known limitations, rollback instructions, and completed roadmap statuses.

### UX-10: Optional remote collaboration

**Priority:** P2. **Depends on:** UX-09 and an explicit product decision.

**Deliverables:** Architecture decision for hosting/cost, identity/invitations, server-authoritative ownership and audience filtering, persistence, revisions/operations, conflict policy, reconnect, rate limits, backup/retention, and consent-aware diagnostics. Start with read-only remote viewers before interactive player actions.

**Tests:** Unauthorized commands rejected server-side; private fields never delivered to players; revoked invitations stop access; operation replay is deterministic; disconnect/duplicate/out-of-order requests do not corrupt state. Verify ownership independently of UI restrictions.

**Acceptance:** Separate threat-model review and operational ownership before launch. Do not promise a secure share URL using the full project JSON in a client-only route.

**Handoff:** Approved operating budget, permission model, incident/recovery runbook, and explicit support scope. Not a blocker for local-first release.

## 8. Test and acceptance plan

### Existing tests to preserve and extend

| Behavior | Current anchors |
| --- | --- |
| UI/dialogs | `src/components/__tests__/uiBehavior.test.tsx`, `dialogs.test.tsx` |
| State, geometry, performance | `src/hooks/__tests__/mapStateUtils.test.ts`, `mapStatePerformance.test.ts`, `mapStateRivers.test.ts`, `src/components/__tests__/MapCanvas.performance.test.tsx` |
| Visibility | `src/utils/__tests__/dynamicFog.test.ts`, `tokenVisibility.test.ts`, `fov.test.ts`, `lightSources.test.ts` |
| Export and art | `exportRender.test.ts`, `artStylePresets.test.ts`, `paperTexture.test.ts`, `edgeBlend.test.ts`, `handDrawn.test.ts`, `lightingAtmosphere.test.ts`, `stampCatalog.test.ts` in `src/utils/__tests/` |
| Generation and samples | `generatorOptionFidelity.test.ts`, `generatorRoomShapes.test.ts`, `premadeMaps.test.ts`, `random.test.ts` in `src/utils/__tests/` |
| Accessibility and code guardrails | `src/utils/__tests__/accessibility.test.ts`, `codebaseAudit.test.ts` |

Use targeted Vitest files for each change, for example:

```sh
npm test -- src/components/__tests__/uiBehavior.test.tsx src/components/__tests__/dialogs.test.tsx
npm test -- src/utils/__tests__/dynamicFog.test.ts src/utils/__tests__/tokenVisibility.test.ts src/utils/__tests__/exportRender.test.ts
```

Use the existing `npm run build`, `npm run lint`, and `npm test` for integrated release qualification. Documentation-only roadmap updates do not require application builds. Existing mocked canvas tests cannot prove visual output or browser storage behavior; supplement them, do not replace them.

### Required reusable fixtures

| Fixture | Contents | Purpose |
| --- | --- | --- |
| F01: Blank | Fresh storage, one empty level | First use, empty states, creation cancellation. |
| F02: Familiar sample | Fixed crypt seed/project including 40 x 40 dimensions | Reproduce baseline, fit behavior, dimension regression, before/after art. |
| F03: Hidden content | Private sentinel note, public note, hidden monster, secret door/trap, private annotation, secret level, hidden initiative | Projection, export, thumbnails, accessibility, and display message privacy. |
| F04: Multi-level | Three levels, stair links, custom themes/stamps/templates, rivers/rooms | Import/migration, switching, duplicate/delete, recovery, round trips. |
| F05: Dense map | 128 x 128 with representative geometry, 100 tokens, 200 stamps, 100 notes, dynamic fog and art | Interactive/render/export performance and memory behavior. |
| F06: Failure set | Invalid/truncated/future-version JSON, quota failure, delayed writes, missing assets | Error, recovery, and no-silent-loss behavior. |
| F07: Print sheet | Known grid, scale marks, doors, token footprints, grayscale legend | Physical scale, page tiling, print information preservation. |

### Browser journeys

1. Fresh storage -> sample copy -> edit note -> save -> reload -> reopen from Library.
2. Generate preview -> cancel -> verify unchanged project -> regenerate with same seed -> commit -> undo.
3. Import legacy project -> migrate -> duplicate -> alter duplicate -> verify original unchanged -> export/reimport.
4. Prepare -> private/public notes -> preview -> start Run -> reveal -> advance turn -> save/end -> resume.
5. Open player window -> pause -> change DM level -> publish -> disconnect/reload -> reconnect without secret flash.
6. Phone -> open project -> pan/zoom -> select token -> inspect -> dismiss sheet -> restore viewport.
7. Storage failure -> visible error -> download backup -> restore -> latest intended state.
8. Production offline -> reopen/edit/save -> resume online -> controlled update without loss.
9. Player PNG/SVG/print -> verify projected contents, geometry, grid scale, and no editing overlays.

Prefer role/name selectors. Use real browser IndexedDB and canvas for these tests. Test two windows and two tabs where relevant. Screenshot references should pin browser/font versions and disable nondeterministic motion; do not approve snapshot changes without reviewing them.

### Proposed measurable release gates

| Dimension | Gate | Method |
| --- | --- | --- |
| First use | At least 4 of 5 DM participants create a playable sample session in 5 minutes without coaching. | Moderated task, fixed starting state; report sample size and failure reasons. |
| Routine play | At least 4 of 5 DMs reveal an area, move a token, and advance turn without returning to Edit. | Observe task sequence and misnavigation. |
| Player comprehension | At least 4 of 5 players identify their visible area, public notes, and current turn within 60 seconds. | Read-only display test; do not imply token ownership before it exists. |
| Aesthetic/readability | At least 4 of 5 DMs prefer new hierarchy, and no majority regression in doorway/path recognition. | Side-by-side matched fixture, randomized presentation; collect preference and accuracy separately. |
| Data preservation | All migration/reload/failure fixtures preserve the last committed state and recoverable unsaved work where supported. | Repository, browser, and recovery tests. |
| Player content | Zero private sentinel occurrences in player DTO, text/metadata, accessibility tree, and transport; visual assertions for hidden geometry. | Projection tests plus browser/export inspection. |
| Accessibility | WCAG 2.2 AA target for interface chrome; 4.5:1 normal text, 3:1 large text/UI boundaries as applicable; visible focus; no keyboard trap. | Automated checks plus keyboard and screen-reader review. |
| Nonvisual access | Key public notes, initiative, object details, and selected-cell/object information accessible without interpreting canvas pixels. | VoiceOver/Safari and NVDA/Firefox task review; document residual spatial-editor limitations. |
| Layout | No blocked primary action at 390 x 844, 844 x 390, 768 x 1024, 1024 x 768, or 1440 x 900; usable at 200% text/zoom. | Real browser screenshots and interaction assertions. |
| Responsiveness | F05 p95 input-to-paint at most 100 ms on an agreed reference desktop; mobile target at most 150 ms with documented reduced detail. | Browser tracing, fixed hardware/DPR, repeated runs; never average away long stalls. |
| Loading | Usable shell and cached project within 2 seconds on the reference device after warm launch. | Production build measurements; cold/offline measured separately. |
| Export | F05 high-resolution export completes or rejects safely within documented browser limits, remains cancellable, and never loses edits. | Stress journey with memory observations; establish device-specific limits before release. |
| Art determinism | Same project, render version, and settings produce the same procedural composition. | Seeded unit tests and pinned-browser image comparisons with reviewed antialiasing tolerance. |

Targets should be revised only through a documented decision, not lowered silently after failures. Automated accessibility results alone are not conformance certification.

## 9. Delivery discipline and future-session handoff

### First three implementation sessions

1. **UX-00:** Confirm defaults one at a time, reproduce baseline, and build the workflow prototypes. Do not redesign every tool yet.
2. **UX-01A:** Add schema/migration and save-state tests, then transactional storage/save status. Keep current UI usable.
3. **UX-01B/02A:** Add project records and non-destructive switching, then a minimal Library with sample-copy creation. Deliver the full create/save/reopen slice before elaborate organization.

After that, sequence shell and editing changes alongside visibility work. The first art session should deliver a reference-map slice, not a bulk asset expansion.

### Session kickoff template

```text
Implement UX-XX from docs/USER-EXPERIENCE-ROADMAP.md.
Read its dependencies, source map, defaults, and acceptance tests.
Inspect current code and roadmap status; do not assume the reviewed baseline is current.
Ask about only unresolved decisions that block this package, one question at a time.
Preserve existing projects, unrelated edits, shortcuts, offline use, and print output.
Implement the smallest complete vertical slice with targeted regression coverage.
Record actual file paths, commands, screenshots when relevant, and known limitations.
Update this document's milestone status and handoff entry; do not claim adjacent work.
Use a feature branch and pull request with migration/rollback notes where applicable.
```

### Definition of done for every package

The dependency gates are satisfied; visible controls perform real actions; failure/cancel states are implemented; required unit/component/browser cases exist; old project fixtures still load; player data rules hold; keyboard/mobile scope is explicit; and docs match shipped behavior.

A milestone is not done because a panel exists, an endpoint responds, or a screenshot looks good. Save/open/resume and audience behavior must work end to end.

### Rollout and rollback

Use a temporary workspace preference/feature flag while shell parity is incomplete. Keep new serialized data versioned and back up before migration. Older app versions must reject unsupported schemas clearly, not attempt lossy writes.

Retain procedural/minimal art fallbacks when optional packs fail. Do not delete legacy assets required by saved projects. Retire the old navigation only after the action migration table and release journeys pass.

### Status ledger

| Package | Status | Completion reference / next gate |
| --- | --- | --- |
| UX-00 | Prototype accepted; research deferred | [Owner-approved closeout and dependency exception](./UX-00-HANDOFF.md); no participant acceptance claimed |
| UX-01 | Foundations merged in #159; browser/storage candidate qualified, Ready with minor follow-ups | [98-pass qualification, provenance and limitations](./UX-01-QUALIFICATION.md); [repository/recovery handoff](./UX-01-HANDOFF.md). Focus-return follow-up and later device/release gates remain; UX-00 research is deferred with zero participants; UX-09 gates are not waived |
| UX-02 | Implemented and browser-qualified | [Production library, creation, migration contract, and actual evidence](./UX-02-HANDOFF.md): 519 unit/component tests, 33 native library scenario-engine passes, three-engine production creation and stopped-origin offline journeys. UX-00 research remains deferred; UX-09 acceptance is not claimed |
| UX-03 | Merged in #162 | [Production shell, action migration and design tokens](./UX-03-HANDOFF.md) |
| UX-04 | Merged in #163 | [Focused editing, input matrix and device evidence](./UX-04-HANDOFF.md); later physical-device/research gates remain |
| UX-05 | Merged in #165; Chromium qualified; cross-browser follow-up open | [Publication, projection, discovery, evidence and limitations](./UX-05-HANDOFF.md); later release gates remain |
| UX-06 | Merged in #166; production Chromium two-window qualified | [Session lifecycle, isolated persistence, display protocol and evidence](./UX-06-HANDOFF.md); Firefox/WebKit and later release gates remain |
| UX-07 | First dungeon slice implemented; owner visual review pending | [Reference and output contact sheet](./media/ux07/contact-sheet.png); versioned tile kit and sample only. Remaining art packages and full acceptance are open |
| UX-08 | Not started | Export and production offline |
| UX-09 | Not started | Release qualification |
| UX-10 | Deferred | Explicit approval of remote scope |

## 10. Relationship to the previous roadmap

This document is the primary execution plan for the end-user redesign. [ROADMAP.md](./ROADMAP.md) remains a capability and historical competitor reference; [the archive](./archive/ROADMAP-history.md) records completed work.

Do not interpret the previous "Phases 1-12 complete" statement as evidence that these newly defined workflows are complete. In particular:

- Project search and organization can be local; cloud storage is not a prerequisite.
- Textures, edge blending, hand-drawn rendering, varied tiles, and lighting already exist. Older descriptions of flat-only art are historical.
- GM drawing is exposed through current advanced tools even where older code comments suggest otherwise.
- Present is not an authenticated player role.
- In-memory per-level undo is not persisted undo history.
- Accessibility foundations and unit tests do not establish complete accessible workflows.
- This review makes no fresh claims about competitor market size or license compatibility.

The intended outcome is fewer decisions on screen, clearer roles, safer continuity, and more beautiful maps using the strong foundation already present.
