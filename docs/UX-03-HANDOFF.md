# UX-03: unified navigation and design foundations

**Foundation:** `ae6908b`, merged UX-02 #161. Main was fetched and checked again on September 8, 2026 before delivery.

**Status:** Implemented and browser-qualified within the bounds below. Merge is subject to the exact PR head's current CI.

**Research:** UX-00 prototypes were accepted by the owner. Participant research remains explicitly deferred with **zero participants**. This implementation is not usability acceptance and does not waive UX-09.

## Production shell

The production editor uses a focused project header, controlled Build / Decorate / Look / Levels / Fog & sight navigation, and an on-demand detail host. Notes, Encounter, and Map info are explicit destinations. A real selected stamp, token, or note opens its existing inspector; no selection reserves no right-hand column. Existing selection, context providers, drawing hooks, persistence, generation, and canvas implementations are reused.

Your maps and Create retain UX-02 navigation and copy semantics. The header shows actual save phase through the same label function as SaveHealth, with offline state separate from save success. Menu and Commands expose Recovery copies and the existing failure/conflict workflow, not a parallel recovery implementation. Ctrl+S still downloads an editable JSON backup, including DM content.

The old Present label is now **DM view**. Its notice explicitly says this is a fog-aware local control surface, not a player-safe display, and notes/exports may contain private content. The stored `viewMode: 'player'`, existing renderer behavior, token controls, fog controls, and shared drawing remain compatible. No Prepare, Run, ownership, publication, authentication, or future lifecycle controls are represented as shipped.

## Shared action contract

`src/utils/editorActions.ts` defines typed `ActionId`, `EditorAction`, `EditorPanel`, and an exhaustive `Record<ToolType, ActionId>`. `buildEditorActions` combines the existing 68 shortcut bindings with panel, file/dialog, missing tool, and theme actions. All built-in themes currently produce **102 executable command entries**. Custom themes add entries dynamically.

Header/menu `ActionButton`, command palette, mobile All actions, and global keyboard handling use the same registered callback and availability. Incompatible commands remain discoverable with a reason rather than silently disappearing. The guarded callback also refuses an unavailable command when invoked directly. Global editor shortcuts are suspended on Library/Create routes, in editable fields, during composition, and while modal dialogs are open.

Parameterized controls retain their existing handlers: a color, catalog stamp, algorithm option, slider position, or per-object operation is not a separate global action. Their hosts are discoverable through registered destinations. Canvas-local gestures remain canvas-local. `canvas.pan` remains the 68th documentation-only shortcut entry, not a fake executable command.

### Shortcut migration and visible homes

This is the implementation crosswalk for every ID in the [UX-00 shortcut inventory](./UX-00-COMMAND-INVENTORY.md#all-registered-shortcuts). Keys and matching predicates are retained, except the explicitly documented editable-field policy below. All executable entries also appear in Commands and mobile All actions. A visible destination does not imply that every parameter has a shortcut.

| Existing IDs | Production visible destination |
| --- | --- |
| `tool.paint`, `tool.erase`, `tool.fill`, `tool.line`, `tool.rect` | Build tool buttons |
| `tool.roomRect`, `tool.roomCircle`, `tool.roomPoly`, `tool.roomCut`, `tool.select` | Build tool buttons and existing shape/selection controls |
| `tool.wall`, `tool.path`, `tool.river` | Build tools and vector properties |
| `tool.note` | Decorate: Add note; Notes: Add |
| `tool.reveal`, `tool.hide` | DM view fog tools; Commands also permits these existing tools in Edit |
| `tool.fov`, `tool.measure` | Fog & sight; DM view tools |
| `tool.linkStair` | Levels: Link stairs |
| `tool.light`, `tool.removeLight` | Fog & sight; DM view tools |
| `tool.gmdraw`, `tool.gmerase` | Decorate: DM drawing |
| `tool.tokenPlayer`, `tool.tokenNpc`, `tool.tokenMonster`, `tool.tokenMonsterMd`, `tool.tokenMonsterLg` | Decorate and DM view token buttons, including all monster sizes |
| `tool.moveToken`, `tool.removeToken` | Decorate and DM view token buttons |
| `tool.marker`, `tool.removeMarker` | Decorate; DM view marker tools |
| `tool.pdraw`, `tool.perase`, `tool.defog` | DM view shared drawing and defog tools |
| `view.printMode` | Export: print preview toggle; Commands: Look |
| `view.viewMode` | Header Edit / DM view toggle |
| `view.themeNext`, `view.themePrev` | Look theme selector; Commands exposes each cycle action |
| `view.tileNext`, `view.tilePrev` | Build material selector and tile palette; Commands exposes each cycle action |
| `view.uiScaleUp`, `view.uiScaleDown` | Settings: Interface text size; Commands exposes each increment |
| `canvas.zoomIn`, `canvas.zoomOut`, `canvas.zoomReset`, `canvas.fit` | Canvas zoom controls and Commands |
| `canvas.pan` | Focused canvas arrow keys, pointer navigation, and minimap; intentionally not an executable menu action |
| `edit.undo`, `edit.redo` | Footer, Menu, mobile quick actions / All actions |
| `edit.copy`, `edit.cut`, `edit.paste` | Build quick actions; disabled with selection/clipboard reason when unavailable |
| `file.generate` | Build: Generate; Menu: Advanced generator |
| `file.new` | Menu: Create map; Your maps: Create map |
| `file.open` | Menu: Import project JSON; Your maps: Import |
| `file.exportJson`, `file.exportPng`, `file.exportSvg`, `file.printExport` | Export dialog: editable backup, current canvas PNG, current level SVG, print/high-resolution PNG |
| `help.shortcuts` | Footer Help; Menu: Keyboard shortcuts |
| `help.commandPalette` | Header Commands; Menu |
| `view.nextLevel`, `view.prevLevel` | Level tabs and Commands; disabled at first/last level |
| `tools.rotateStampCW`, `tools.flipStampH`, `tools.flipStampV`, `tools.deleteStamp` | Selected stamp inspector; Commands explains the selection requirement |

The registry test parses all 68 IDs from the UX-00 inventory and compares them with the binding factory. It also checks uniqueness, all tool types, inactive-mode guards, selection/history/level guards, and common button/keyboard/palette/mobile dispatch. DM token placement, sight, marker, and light dispatch have explicit regressions.

### Former palette aliases and missing entries

| Previous entry or family | Current identity / destination |
| --- | --- |
| `tool.room-rect`, `tool.room-circle`, `tool.room-poly`, `tool.room-cut` | Existing binding IDs `tool.roomRect`, `tool.roomCircle`, `tool.roomPoly`, `tool.roomCut` |
| `tool.link-stair` | `tool.linkStair` |
| Other 16 shared named tool entries | Matching binding ID above; one handler, not a second palette catalog |
| `tool.stamp` | Retained; move/remove stamp and wall/path/river erasers now also have registry entries |
| `theme.<id>` | Retained for built-in and project custom themes in Look |
| `dialog.generate` | `file.generate`, existing advanced preview/commit workflow |
| `dialog.premade` | `file.samples`, opens UX-02 Samples directly rather than an unspecified Generate tab |
| `dialog.templates`, `dialog.customTheme` | Retained; Decorate templates and Look theme builder |
| `dialog.shortcuts`, `dialog.exportDialog` | `help.shortcuts`, `file.printExport` |
| `file.import` | `file.open` |
| `view.presentMode` | `view.viewMode`, explicitly DM view |
| `view.zoomIn`, `view.zoomOut`, `view.zoomReset`, `view.fitScreen` | `canvas.zoomIn`, `canvas.zoomOut`, `canvas.zoomReset`, `canvas.fit` |
| `file.new`, three file exports, `view.printMode`, `edit.undo`, `edit.redo` | Same IDs |
| Previously missing clipboard, token, marker, shared drawing, level, stamp transform actions | Included through bindings instead of duplicating an incomplete palette list |

### Parameter and contextual control parity

This table accounts for the remaining [UX-00 visible-control families](./UX-00-COMMAND-INVENTORY.md#visible-controls-and-contextual-actions). The source components still own their parameter sets.

| Existing family | New home and preservation decision |
| --- | --- |
| Project name, level name, dimensions, source tile pixels, UI size | Settings with distinct labels; nonpreset imported dimensions remain valid displayed options |
| Clear map | Settings / Commands, retaining existing destructive-action checkpoint and confirmation |
| Rail/Tabs and Draw/Tactical/Advanced selection | Replaced by one controlled destination model after the parity inventory; compatibility reset below |
| Wall/path/river color, width/thickness/type, segment erase, clear | Build, unchanged handlers |
| Room edge merge, shape/vertex editing, region selection/move/resize, polygon completion, right-click deletion | Build and existing canvas interactions retained; broad gesture alternatives belong to UX-04 |
| River point drag/right-click delete | Existing canvas behavior retained; a new point inspector is not claimed |
| Theme, preserve-existing styling, every built-in/custom tile | Look theme/preservation; Build material selector and tile palette |
| Art presets; paper pattern/opacity/grain/vignette/tint/reset | Look |
| Edge blend style/intensity/opacity; hand-drawn style/wobble/hatch/opacity | Look |
| Cosmetic atmosphere, AO/radius, stamp shadow, grading/intensity/opacity | Look, distinct from sight-affecting lights |
| Stamp catalogs/categories, placement/move/remove/clear, custom upload/name/delete | Decorate, existing StampPicker and project asset handlers |
| Selected stamp rotate both directions, flips, scale, opacity, lock, z-order, delete/deselect | Contextual inspector |
| Token label/icon/default/search/delete/deselect; note label/description/delete/deselect | Contextual inspector and existing IconPicker |
| Dimensions/theme/counts/light list without selection | On-demand Map info, not a permanently reserved column |
| Party/NPC/monster sizes, movement/removal | Decorate and DM view, same action registry |
| Fog preview; sight click/reset; measurement shapes/feet per cell | Fog & sight; DM tools expose measurement and sight parameters too |
| Marker shape/color/radius/place/remove/clear | Decorate; DM tools, including phone parameter controls |
| Sight light presets/radius/color/place/remove/clear | Fog & sight; DM tools |
| Background import/remove/opacity/scale/X/Y | Look tracing layer; UX-02 Trace remains a separate create path |
| Stair source/link/clear current-level links | Levels |
| DM annotation draw/erase/clear/color/width | Decorate |
| Scene template capture/name/apply offsets/rename/delete/cancel; new project copy | Decorate: Scene templates; existing UX-02 semantics retained |
| Custom theme base/name/grid/tile semantics/colors/images/removal/save/cancel | Look: Custom theme builder |
| All generator algorithms, corridors, shape, pruning, dimensions/density, selection target | Build/Menu Advanced generator, existing preview and explicit commit |
| Generator tile mixes/reset, room labels, background, rivers/count/width/meander/source, seed/reroll, dialog text controls | Same advanced dialog, unchanged handlers |
| Sample filters/select/preview/copy/cancel | Your maps / Menu Samples, existing UX-02 copy workflow |
| Fog enable, defog, reveal/hide, reset/clear, dynamic fog, exploration reset | DM view, not a player role |
| Shared drawing/erase/clear, pen colors/widths | DM view tools on desktop and phone |
| Notes add/select/edit/save/cancel/delete | Notes in Edit; DM view uses honest read-only notes instead of no-op mutation buttons |
| Encounter selection/order/drag/Alt+arrows/rename/clear | On-demand Encounter; no new round/turn lifecycle |
| Level select/add/rename/duplicate/delete/reorder | Existing LevelTabs plus visible Levels management controls; no publishing behavior |
| DPI/page/audience/monochrome/scale bar/pixel summary/export/cancel | Existing print dialog reached through Export; current audience limitations disclosed |
| Canvas zoom/pan/minimap/touch/pointer gestures | Canvas controls retained; no change to geometry, zoom math, FOV, or rendering |
| Mobile quick tools, all-tools sheet, history/generation/mode/drawing/measurement/markers | Shared All actions plus scrollable contextual tools; no utility is exclusively long-press |
| Palette search/execute/close, help, dialog Escape/cancel/focus | Commands and existing dialogs; common focus trap with launcher/canvas return |

## Semantic tokens and typography

`src/design-tokens.css` is the source for shell semantics. `src/editor-shell.css` composes the shell and responsive behavior; `App.css` consumes the shared palette for reused panels.

| Token family | Meaning |
| --- | --- |
| `--surface-base`, `--surface-panel`, `--surface-raised`, `--surface-active`, `--surface-canvas` | Black/deep purple surface hierarchy, not map materials |
| `--text-primary`, `--text-secondary` | Readable primary and supporting lettering |
| `--accent`, `--action-primary`, `--action-ink` | Purple selection and orange primary actions with dark ink |
| `--focus`, `--border`, `--danger`, `--surface-error` | Blue focus, boundaries, and error surfaces |
| `--font-ui`, `--text-small`, `--text-body`, `--text-heading` | One Avenir Next sans-serif family, local Avenir/sans-serif fallbacks; no network font dependency |
| `--space-*`, `--radius-control`, `--radius-panel`, `--target` | Spacing, shape, and 44-pixel primary interaction targets |

New shell chrome uses original stroke SVGs in `Icon.tsx` and visible words. Legacy decorative toolbar emoji slots are hidden in the production shell. Map artwork, token icon catalogs, and meaningful material/color swatches are not navigation chrome and remain unchanged. The same sans-serif stack applies to dialogs and reused panels. Existing reduced-motion and forced-color support is retained; semantic text/action pairs have contrast regression coverage.

Keep four independent concepts: **tile dimensions** describe geometry, **source tile pixels** describe source rendering scale, **canvas zoom** describes the viewport, and **export DPI** describes output resolution. **Interface text size** changes UI lettering, not any of those values.

## Compatibility and retirement decisions

1. Retired duplicate `Toolbar.tsx` and the Rail/Tabs selector. `NavigationRail.tsx` is now the single controlled category host, not a user-selectable legacy layout mode.
2. Existing stored layout/category keys are left intact but ignored. The new shell starts at Build. Old Draw/Tactical/Advanced categories split across several new homes, so guessing a one-to-one selected-panel migration would misrepresent the destination. These keys never become invalid active states.
3. UI size remains a stored numeric preference. Supported presets are 75%, 100%, 125%, 150%, and 200%; nonpreset in-range values get their own displayed option. The old 50% preference explicitly clamps to 75% to avoid unreadable editor lettering. Legacy font-size variables receive a 1.25 baseline multiplier.
4. Shift+V keeps toggling the same stored modes, with truthful Edit / DM view labels. B, Shift+B, and Shift+F remain DM-view-only. All previously supported DM token sizes remain usable. Marker/light/sight utilities now share availability and parameters across desktop and mobile; conflicting old GM-only callback guards were removed where necessary.
5. Ctrl+K no longer steals focus from text fields. Like other global editor shortcuts, it is ignored there and inside modal dialogs. Commands remains visibly available. Browser-reserved accelerators retain visible fallbacks.
6. PageUp/PageDown still inspect levels, never publish them. Ctrl+S still exports backup, never silently becomes a local-save command. UI-size shortcuts remain distinct from unmodified canvas zoom shortcuts.
7. Footer duplicate zoom buttons were retired because the actual canvas controls and Commands provide those actions. Footer history/help remain. Mobile long-press-only discovery was replaced with an explicit All actions button.
8. No schema, project ID, migration, CAS revision, checkpoint capacity, import identity, rendering, geometry, FOV, generator, or custom-asset contract changed. The 20-checkpoint explicit-cleanup policy remains intact.

## Qualification and layout evidence

Executed September 8, 2026 on macOS with existing tooling and Playwright 1.62.1. No dependency manifest changes, upgrades, new test runners, or CI bypasses.

| Gate | Actual evidence |
| --- | --- |
| Unit/component suite | 529 tests across 41 files passed |
| TypeScript / production build / ESLint | Passed; existing bundle-size warning and hook warnings remain |
| Native Library suite | 11 scenario groups in Chromium, Firefox, WebKit: 33 passes |
| Production guided creation | Sample, blank, deterministic generation, trace, and template-copy journey passed in all three engines |
| Production stopped-origin offline | Library reload, search/open/rename, and persistent-profile process reopen passed in all three engines with the origin stopped |
| Production shell journey | Chromium 151.0.7922.34, Firefox 153.0, WebKit 26.5 passed |
| Actual-diff read-only correctness review | Corrected DM NPC/monster availability and a DM panel scroll selector mismatch; regressions cover both |
| Focus correction from real browser testing | WebKit pointer launch did not focus Commands; explicit opener focus now restores correctly after modal close |

Shell journeys cover sample opening, old stored UI preferences, every destination, actual/no-selection inspector layout, project/level name separation, imported-size controls, editable-field/inactive-mode shortcuts, palette Escape/focus, Recovery focus, backup download, mobile registry parity, DM token/pen/measurement parameters, text enlargement, reflow, and durable reload. Existing Library/creation/offline scripts were reused, with selectors updated only for relocated controls and the already-shipped Continue-first tab order.

| Layout | Measured result across all three engines | Screenshot |
| --- | --- | --- |
| Desktop 1440 x 900 | 64-pixel header; no empty inspector column; no document horizontal overflow | [Build](./media/ux-03/desktop-build.png), [Look](./media/ux-03/desktop-look.png), [Notes](./media/ux-03/desktop-notes.png), [DM view](./media/ux-03/desktop-dm-view.png) |
| Tablet 768 x 1024 | 109-pixel wrapped header; no horizontal overflow | [Tablet](./media/ux-03/tablet.png) |
| Phone 390 x 844 | 157-pixel wrapped header; tools collapse/scroll; All actions available | [Phone](./media/ux-03/phone.png), [DM parameters](./media/ux-03/phone-dm-parameters.png) |
| Phone, 200% interface text | Header approximately 334 pixels; primary labels/actions remain reachable and wrap without document overflow | [WebKit text 200%](./media/ux-03/phone-text-200.png) |
| 720 x 450 reflow viewport | No document horizontal overflow; primary actions reachable | [Zoom-equivalent reflow](./media/ux-03/zoom-equivalent-200.png) |

Machine-readable measurements: [shell-results.json](./media/ux-03/shell-results.json). Screenshots are from the production sample journey, not the UX-00 prototype. The 720 x 450 case is the layout equivalent of a 1440 x 900 browser at 200% zoom, **not native browser-zoom certification**. Enlarged text uses the actual application setting.

Reusable commands, with an already installed Playwright module and an external output directory:

```sh
npm test
npm run lint -- --quiet
npm run build
QA_ORIGIN=http://127.0.0.1:5303/Dungeon-Mapper/ QA_OUTPUT=/absolute/artifacts/shell PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node src/test/ux03Shell.browser.mjs
QA_ORIGIN=http://127.0.0.1:5193/Dungeon-Mapper/ QA_OUTPUT=/absolute/artifacts/library PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node src/test/ux02Library.browser.mjs
QA_ORIGIN=http://127.0.0.1:5303/Dungeon-Mapper/ QA_OUTPUT=/absolute/artifacts/creation PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node src/test/ux02Creation.browser.mjs
QA_OUTPUT=/absolute/artifacts/offline PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node src/test/ux02Offline.browser.mjs
```

Shell/creation require a production preview on the specified origin. Library uses Vite's native module imports and requires the dev server. Offline starts and stops only its own production server on port 5299.

## Remaining limits and UX-04 boundary

This is navigation and design foundation delivery, not a full interaction redesign. Room/river gesture-only operations, broad object transforms, selection unification, asset search/favorites, touch/pen cancellation parity, complete keyboard interaction coverage, physical-device safe-area/keyboard coverage, and extensive native zoom/screen-reader certification remain UX-04/UX-09 work. Levels now has ordinary keyboard-reachable reorder buttons, but this is not certification of the full object/device interaction matrix. Long property panels still scroll. A phone with 200% lettering trades substantial map space for readable controls.

DM view is not audience-safe. No private/public field migration, projection, player window, local session lifecycle, ownership, remote multiplayer, or new art pack is introduced. Existing image exports may include private information. These limits remain explicit UX-05/UX-06 work rather than promises inferred from the new shell.

Storage eviction, OS power loss, mixed-version service-worker updates, and dependency audit remediation are not newly certified here. The prior dependency restore reported 12 audit findings; this UI work did not upgrade packages. CI still has the existing lint `continue-on-error` setting, so a separate successful local lint run remains part of this handoff.
