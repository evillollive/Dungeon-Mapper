# UX-04: focused editing and device parity

**Foundation:** `0717577000811df302cc9d98c2d070c699f57c63`, merged UX-03 #162. Main was fetched and verified again on September 8, 2026.

**Status:** Implemented and browser-qualified within the bounds below. Exact-head CI and the app's Agent Merge readiness conditions remain required before landing.

**Research:** Participant research remains explicitly deferred with **zero participants**. Browser automation is not participant usability acceptance, physical-device certification, or a waiver of UX-09.

## Production editing

Build keeps the active tool and material together above the expandable tool inventory. Decorate retains stamps and token/note tools; Look retains existing appearance controls. The UX-03 action registry, shortcuts, Commands, All actions, semantic colors/icons and single sans-serif UI family remain the production shell. No alternate navigation architecture or art pack was introduced.

Materials and built-in/custom stamps are searchable and favoritable. Favorites are device preferences, not project data or cloud synchronization. A write failure leaves the current visit usable and displays a persistence warning. Missing favorites do not affect project saving.

The object chooser and coordinate placement form expose overlapping objects without relying on canvas hit testing. Tokens, notes, stamps, rectangular/elliptical/polygon rooms, rivers and tile regions have visible editing paths. Stamp transforms and layer ordering, room shape/material/edges/vertices, river points/width/type/color, note text/location and token text/location/icon are editable without dragging. Existing placement catalogs and renderers are reused.

## Selection model

`useEditorSelection` owns a single discriminated union: token, note, stamp, room or river plus numeric ID; tile region plus bounds; or no selection. App derives legacy callback props from that union rather than keeping independent competing IDs.

Selection is scoped to project generation, active level index and view mode. Changing any scope clears it and remounts the canvas's transient gesture state. Removing an object clears its selection; undo restores content but does not resurrect that stale selection. Regions are cleared when resizing invalidates their bounds. Select-tool hit precedence is token, note, stamp, river, room, then tile region; the object chooser provides an explicit alternative for overlaps.

The inspector opens only for a real selection. A canvas drag defers opening a newly selected object's inspector until release, avoiding a viewport resize that would cancel the initiating gesture. A no-selection Map info destination remains available without reserving a permanent column.

Property forms hold a draft. Apply commits the complete edit as one history entry; Cancel changes or Escape discards uncommitted fields. Changing objects discards the prior form draft. Imported fractional stamp/river/polygon geometry is not rounded by input steps, and retained off-map room/river/polygon geometry remains editable. A locked stamp must be unlocked and applied before transforming it.

**Tile region** means tiles, notes and stamps, not a hidden group of all object families. Directional move buttons move that content atomically, preserving IDs and overlap behavior. Fill and erase act on tiles. Tokens, room shapes and rivers remain separately selectable objects. Changing region bounds is a selection operation, not project history; undoing a region move restores content rather than its transient selection bounds.

## Input and history matrix

| Interaction | Pointer/touch/pen path | Visible keyboard or click alternative | Commit/cancellation |
| --- | --- | --- | --- |
| Paint/erase | Continuous local stroke preview with skipped-cell interpolation | Build material/tool controls and coordinate tile-region fill/erase | One completed stroke; retracing does not change interpolation origin incorrectly |
| Token/stamp movement | Local position preview | Object chooser and numeric X/Y; stamp rotation/flip/scale/layer controls | One final move; no history or save writes for canceled previews |
| Notes | Release to place, then contextual fields | Coordinate placement and complete note form | One placement or one applied text/location edit |
| Token placement | Release opens the existing icon picker | Coordinate placement plus catalog or No Icon | Icon and token creation share one undo entry; canceling picker creates nothing |
| Rooms | Existing shape drag/resize and polygon vertices | Coordinate shape placement, numeric bounds/vertices, shape/material/edge fields | One completed shape or transform; visible Finish polygon and Cancel gesture |
| Rivers | Existing path/control-point interaction | Coordinate placement and numbered point fields/removal | One completed path or point edit; exact fractional geometry retained |
| Tile regions | Drag selection and existing clipboard commands | Numeric bounds, move arrows, fill/erase controls | One content move/fill/erase; selection changes do not create history |
| Fog and drawing | Existing local rectangle/freehand previews | Existing visible tool and undo controls | Interrupted gestures discard previews; completed annotation/marker/light mutations now have history |
| Levels | Existing drag reorder | Move earlier/later buttons with accessible level names | Existing project-level reorder behavior retained |
| Viewport | Pan, pinch, minimap, modified wheel | Zoom/fit/reset buttons, canvas arrow keys and existing shortcuts | Viewport changes are not map edits and cancel an active edit first |

Pointer cancel, lost capture, blur, Escape, tool/level/mode changes, source-map history changes and viewport resizing cancel active edits. Two-finger interruption cancels painting before starting pan/pinch. Idle pointer leave preserves an unfinished polygon so its completion button is reachable. An active uncaptured pointer leaving the canvas cancels the gesture.

History/source invalidation uses a separate layout effect. Resize observation ignores its initial notification and cancels only on a real size change, so an immediately following pen gesture is not canceled by observation setup after Undo/Redo. Neither staged map previews nor abandoned property forms enter autosave. Annotation, marker and light placement/removal/clear now push the existing history snapshot, which already contains those layers. This is not a redesign of legacy appearance-setting history or session lifecycle.

## Responsive controls and viewport memory

At widths up to 768px, the contextual panel becomes a focus-trapped modal sheet. Close stays visible; fields scroll; Apply/Cancel remain reachable. `useVisualViewport` publishes visible height/top so sheets respond to keyboard-sized viewports, with safe-area padding. Escape cancels a dirty form first, then closes a clean sheet. A document-level fallback handles Safari leaving focus on body after a button click.

Viewport preferences use per-tab `sessionStorage`, keyed by stable project ID and existing level index. The first visit without a valid preference fits once; Library return and same-tab reload restore the exact pan/zoom. Explicit Fit remains available. Preferences do not modify project schema or save status. Level preferences follow ordinal slots because the existing project format has no stable level IDs. Closing the tab ends the preference lifetime; blocked storage can prevent retention and produces a diagnostic.

Essential object placement/transforms and level reorder do not require long press, hover or drag-only interaction. Two/three-finger undo/redo accelerators remain optional alongside visible actions. Existing DM view remains a local fog-aware surface, not an authenticated player role or a safe publication boundary.

## Qualification and evidence

Executed against the production build and isolated browser storage on September 8, 2026:

| Coverage | Result |
| --- | --- |
| Existing Vitest suite plus focused editing/gesture regressions | 562 tests, 43 files passed |
| TypeScript/Vite build and ESLint error check | Passed; existing large-bundle advisory remains |
| UX-04 production journey | Chromium 151.0.7922.34, Firefox 153.0, WebKit 26.5 |
| UX-04 object operations | Six-family selection/editing; creation/cancel; delete/undo; region movement/fill/erase; native polygon completion; first drag with closed inspector |
| UX-04 input/scope | Mouse strokes, cancellation, undo/redo, touch taps, Chromium pen and two-touch interruption; level/mode clearing; Library/reload viewport retention |
| UX-04 responsive | 1440x900, 768x1024, 390x844, 390x460 keyboard-height equivalent, 720x450 reflow equivalent and actual application text size 200% |
| Previous UX-02 Library suite | 33 scenario-engine passes, including native CAS, migration originals, rich import/export, recovery faults, copies, metadata and mobile keyboard management |
| Previous UX-02 creation and offline suites | Three-engine guided creation and stopped-origin production offline journeys passed |
| Previous UX-03 shell suite | Three-engine command/settings/save/print and responsive journeys passed |

`src/test/ux04Editing.browser.mjs` is the reproducible production journey. Like previous browser harnesses it uses an externally installed Playwright SDK selected with `PLAYWRIGHT_MODULE`, `QA_ORIGIN` and `QA_OUTPUT`; no dependency or test-runner changes were required. Unit/component regressions live in `focusedEditing.test.tsx` and `canvasGestures.test.tsx`. Existing module-size guardrails remain unchanged.

Read-only actual-diff correctness reviews found and drove corrections for brush retracing, fractional river input, inspector opening during a drag, polygon completion on pointer leave, and retained off-map polygon editing. Dedicated regressions cover those findings.

Durable evidence:

- [Three-engine editing results](./media/ux04/editing-results.json)
- [Desktop room inspector](./media/ux04/desktop-room.png)
- [Tablet note sheet](./media/ux04/tablet-note.png)
- [Phone note sheet](./media/ux04/phone-note.png)
- [Reduced-height keyboard equivalent](./media/ux04/phone-keyboard-equivalent.png)
- [Phone at application text size 200%](./media/ux04/phone-text-200.png)
- [720x450 reflow equivalent](./media/ux04/zoom-equivalent.png)

Screenshots were inspected, not merely generated. Required fields/actions remain usable with no document horizontal overflow in the recorded matrix. Reduced-height automation is not a real iOS/Android keyboard; reflow dimensions are not native browser zoom. Physical pen/touch devices, notched-device safe areas, screen-reader behavior, IME and platform keyboard/zoom combinations still need release-device qualification.

## Preserved contracts and next boundaries

Project schema 1, IndexedDB version 1, stable project identity, CAS, migration originals, backup/recovery behavior, the 20-checkpoint explicit cleanup policy and independent creation/import copies are unchanged. Preview/favorite preferences never masquerade as durable project saves. Existing offline and print paths remain in use.

UX-05 owns audience-safe projection/publication and player preview. UX-06 owns session lifecycle and local display transport. Remote play, additional art packs and the unified export redesign remain outside this package. UX-09 must still qualify real devices and deferred human research; this handoff does not claim those gates passed.
