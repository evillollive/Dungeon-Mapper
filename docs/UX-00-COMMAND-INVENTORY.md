# UX-00 command migration inventory

**Source baseline:** `01da138`. **Status:** Source inventory and proposed destinations, not implemented navigation parity. Production controls and shortcuts remain unchanged.

This inventory enumerates all 68 entries in `src/hooks/keyBindings.ts`, the separate palette construction in `src/App.tsx`, and parameterized panel/canvas commands. Catalog entries such as individual themes, stamp names, icons, colors, and tile materials are parameters of their listed command, not separate handlers. No removal is approved by this table.

## Destination contract

| Destination | Responsibility |
| --- | --- |
| Library / Create | New project, sample copy, generation, import. Not the stamp or theme library. |
| Edit / Build | Geometry, selected region, wall/path/river/room operations and material choice. |
| Edit / Decorate | Stamps, tokens, markers, notes, reusable scene templates. |
| Edit / Look | Theme/material identity, visual art settings, tracing-image presentation, print preview. |
| Edit / Levels | Floor creation, identity, order, duplication/deletion, stairs and links. |
| Project settings / Preferences | Dimensions, source tile pixels, grid scale, UI scale and layout preferences, scoped clear action. |
| Prepare | Party, note visibility, initial fog/sight/lights, encounter preparation. |
| Run | DM operations during play: fog, movement, annotations, measuring, encounter, publication. |
| Player display | Read-only projected map/public information and viewport controls. No editing or fog tools. |
| Export / Help / Viewport | Audience/intent-aware output, discovery, and non-authoring view controls. |

Mode-sensitive reuse means one action has multiple entry points with explicit availability, not duplicated handlers. Shared geometry is not permission enforcement.

## All registered shortcuts

IDs and displayed keys below come from `buildKeyBindings`. Ctrl bindings generally also match Meta/Cmd through `isCtrlOrMeta`; preserve the exact existing predicates during UX-03 rather than assuming every modified-key combination is equivalent. `M` is Measure; moving a token is **Shift+M**.

| Binding ID | Existing key | Proposed home |
| --- | --- | --- |
| `tool.paint` | P | Edit / Build: paint |
| `tool.erase` | E | Edit / Build: erase |
| `tool.fill` | F | Edit / Build: flood fill |
| `tool.note` | N | Edit / Decorate: private note; Prepare notes |
| `tool.line` | L | Edit / Build: tile line |
| `tool.rect` | R | Edit / Build: tile rectangle |
| `tool.roomRect` | Q | Edit / Build: rectangular room |
| `tool.roomCircle` | Shift+C | Edit / Build: circular/elliptical room |
| `tool.roomPoly` | Shift+P | Edit / Build: polygon room |
| `tool.roomCut` | Shift+Q | Edit / Build: subtractive room |
| `tool.select` | S | Edit / Build: select region/object |
| `tool.reveal` | V | Run: reveal rectangle; Prepare starting visibility |
| `tool.hide` | H | Run: cover rectangle; Prepare starting visibility |
| `tool.fov` | O | Prepare / Run: line-of-sight preview |
| `tool.measure` | M | Run: measurement; Edit contextual viewport utility |
| `tool.linkStair` | K | Edit / Levels: link stairs |
| `tool.wall` | W | Edit / Build: wall vector |
| `tool.path` | Shift+W | Edit / Build: path vector |
| `tool.river` | U | Edit / Build: river vector |
| `tool.light` | I | Prepare / Run: place sight-affecting light |
| `tool.gmdraw` | D | Edit / Decorate and Run: DM annotation |
| `tool.gmerase` | Shift+D | Edit / Decorate and Run: erase DM annotation |
| `tool.tokenPlayer` | 2 | Edit / Decorate; Prepare / Run: place party token |
| `tool.tokenNpc` | 3 | Edit / Decorate; Prepare / Run: place NPC |
| `tool.tokenMonster` | 4 | Edit / Decorate; Prepare / Run: place small monster |
| `tool.tokenMonsterMd` | 5 | Same, medium 2 x 2 monster |
| `tool.tokenMonsterLg` | 6 | Same, large 3 x 3 monster |
| `tool.moveToken` | Shift+M | Edit object inspector / Run: move token |
| `tool.removeToken` | X | Edit object inspector / Run: remove token |
| `tool.marker` | A | Edit / Decorate and Run: place area marker |
| `tool.removeMarker` | Shift+A | Edit / Decorate and Run: remove marker |
| `tool.removeLight` | Shift+I | Prepare / Run: remove light |
| `tool.pdraw` | B | Retain DM-operated published annotation in Run; actual player authorship deferred |
| `tool.perase` | Shift+B | Same policy for erasing published annotation |
| `tool.defog` | Shift+F | Run: brush reveal; not a player control |
| `view.printMode` | Ctrl+B | Edit / Look and Export: monochrome preview |
| `view.viewMode` | Shift+V | Compatibility decision for Edit/Run/preview navigation; do not silently reinterpret |
| `view.themeNext` | T | Edit / Look: next theme |
| `view.themePrev` | Shift+T | Edit / Look: previous theme |
| `view.tileNext` | ] | Edit / Build: next material |
| `view.tilePrev` | [ | Edit / Build: previous material |
| `view.uiScaleUp` | Ctrl+= / Ctrl++ | Preferences: interface scale, not map zoom |
| `view.uiScaleDown` | Ctrl+- | Preferences: interface scale |
| `canvas.zoomIn` | + (also =) | Viewport in Edit/Run/Player |
| `canvas.zoomOut` | - (also _) | Viewport in Edit/Run/Player |
| `canvas.zoomReset` | 0 | Viewport: reset zoom/pan |
| `canvas.fit` | 1 | Viewport: fit map |
| `canvas.pan` | Arrow keys | Viewport when canvas focused; documentation-only registry entry |
| `edit.undo` | Ctrl+Z | Edit or Run undo with explicit state scope |
| `edit.redo` | Ctrl+Y / Ctrl+Shift+Z | Same scope as undo |
| `edit.copy` | Ctrl+C | Edit / Build: copy region |
| `edit.cut` | Ctrl+X | Edit / Build: cut region |
| `edit.paste` | Ctrl+V | Edit / Build: paste region |
| `file.generate` | G | Library / Create; Edit / Build selected-region generation |
| `file.new` | Ctrl+Alt+N | Library / Create; current Ctrl+N fallback may be browser-intercepted |
| `file.open` | Ctrl+O | Library / Import, with visible fallback |
| `file.exportJson` | Ctrl+S | Export / editable backup, not a new save-to-library shortcut |
| `file.exportPng` | Ctrl+Shift+S | Export / image |
| `file.exportSvg` | Ctrl+Alt+S | Export / vector |
| `file.printExport` | Ctrl+Shift+P | Export / print for table |
| `help.shortcuts` | ? | Help / shortcut reference |
| `help.commandPalette` | Ctrl+K | Help / command palette |
| `view.nextLevel` | PageDown | Edit / Levels; Run inspect level, not implicit publish |
| `view.prevLevel` | PageUp | Same distinction |
| `tools.rotateStampCW` | Shift+R | Edit / Decorate selected stamp |
| `tools.flipStampH` | Shift+H | Edit / Decorate selected stamp |
| `tools.flipStampV` | Shift+Y | Edit / Decorate selected stamp |
| `tools.deleteStamp` | Delete / Backspace | Edit / Decorate selected stamp |

Current gating is mixed: GM drawing, marker operations, removing lights, tile/theme cycling, and Generate have GM checks; player drawing/erase/defog require current Present mode; many other bindings do not encode a role themselves. `help.commandPalette` explicitly fires in editable fields. `useGlobalShortcuts.ts` controls editable/modal handling. Preserve native text editing, modal focus, and current accelerator behavior while adding explicit mode availability in UX-03.

## Command palette crosswalk

`App.tsx` constructs palette commands independently from `keyBindings.ts`. `CommandPalette.tsx` searches and executes those supplied items. These are the complete palette families; dynamic theme commands expand from the available theme list.

| Palette IDs | Registry correspondence / proposed destination |
| --- | --- |
| `tool.paint`, `tool.erase`, `tool.fill`, `tool.note`, `tool.line`, `tool.rect`, `tool.select`, `tool.reveal`, `tool.hide`, `tool.fov`, `tool.measure`, `tool.light`, `tool.wall`, `tool.path`, `tool.river`, `tool.gmdraw` | Same named binding and destination above. |
| `tool.room-rect`, `tool.room-circle`, `tool.room-poly`, `tool.room-cut` | Camel-case registry equivalents `tool.roomRect`, `tool.roomCircle`, `tool.roomPoly`, `tool.roomCut`; Edit / Build. |
| `tool.link-stair` | Registry `tool.linkStair`; Edit / Levels. |
| `tool.stamp` | No global shortcut; Edit / Decorate. |
| `theme.<theme.id>` | One command per built-in/project custom theme; Edit / Look. |
| `dialog.generate` | `file.generate`; Library / Create or selected-region generation. |
| `dialog.premade` | Library / sample copies. Currently opens the same Generate Hub callback, not an explicitly selected Samples tab. |
| `dialog.templates` | Edit / Decorate: scene templates. |
| `dialog.customTheme` | Edit / Look: custom theme builder. |
| `dialog.shortcuts` | `help.shortcuts`; Help. |
| `dialog.exportDialog` | `file.printExport`; Export / print. |
| `file.exportJson`, `file.exportPng`, `file.exportSvg` | Corresponding backup/image/vector Export intents. |
| `file.import` | Registry `file.open`; Library / Import. |
| `file.new` | Library / Create. |
| `view.printMode` | Edit / Look or Export preview. |
| `view.presentMode` | Registry `view.viewMode`; compatibility decision, not immediate replacement. |
| `view.zoomIn`, `view.zoomOut`, `view.zoomReset`, `view.fitScreen` | Registry `canvas.zoomIn`, `canvas.zoomOut`, `canvas.zoomReset`, `canvas.fit`; Viewport. |
| `edit.undo`, `edit.redo` | Edit/Run state-scoped history. |

The palette has 22 tool entries plus 19 fixed non-theme entries and dynamic themes. Missing palette counterparts include clipboard actions, most token/marker/player tools, level switching, and stamp transforms. UX-03 should derive discoverable actions from one registry instead of dropping those operations.

## Visible controls and contextual actions

All paths in this table are under `src/components/` unless specified otherwise. Grouped properties enumerate the controls sharing a handler family; the listed source remains the authority for allowed values and conditions.

| Source surface | Existing operations, including secondary controls | Proposed home |
| --- | --- | --- |
| `MapHeader.tsx` | Rename current map; width/height selects; tile pixel size; UI scale; Rail/Tabs density. | Level identity; Project settings; Preferences. Do not relabel current level name as project name. |
| `MapHeader.tsx` | Present/Edit; Print; Undo/Redo; New; More menu; JSON/PNG/SVG; print export; Generate Hub; Import; Clear entire map; Shortcuts. | Navigation compatibility, Look, Edit history, Library, Export, scoped Project action, Help respectively. |
| `NavigationRail.tsx`, `Toolbar.tsx` | Draw/Tactical/Advanced categories; Generate; tabs/rail variants and their keyboard navigation. | Edit categories plus Prepare/Run split. Retire duplicate layout models only after parity. |
| `DrawToolsTab.tsx` | All draw tools above; wall color/thickness, erase segments, clear all; path color/width, erase/clear; river color/width/type, erase/clear. | Edit / Build, contextual tool settings. |
| `DrawToolsTab.tsx`, `MapCanvas.tsx` | Rectangular/circular/polygon/subtractive rooms, per-edge merge modes; select/move/resize room shape; polygon vertices; double-click completion; right-click shape removal. | Edit / Build with visible alternatives to gesture-only edit/delete. |
| `MapCanvas.tsx` | River control-point dragging and right-click control-point deletion (removes river when last point is removed). | Edit / Build river inspector with explicit delete controls. |
| `DrawToolsTab.tsx` | Select theme; preserve existing tile styling on theme change; custom theme builder; choose every theme/custom tile in palette. | Theme and preservation in Look; active material adjacent to Build tool. |
| `DrawToolsTab.tsx` | Art presets Classic, Hand-Drawn, Painted, Minimal, Print, Custom; paper enable/pattern/opacity/grain/vignette/tint/reset. | Edit / Look; preset first, advanced properties on demand. |
| `DrawToolsTab.tsx` | Edge blend enable/style/intensity/opacity; hand-drawn enable/style/wobble/cross-hatch/opacity. | Edit / Look advanced art. |
| `DrawToolsTab.tsx` | Lighting/atmosphere enable; AO intensity/radius; stamp-shadow opacity; color-grading mode/intensity; overall opacity. | Edit / Look. These cosmetic controls are distinct from sight-affecting light sources. |
| `StampPicker.tsx` | Place/move/remove/clear placed stamps; category tabs including theme/custom; choose any catalog stamp; upload custom image/name; delete custom stamp. | Edit / Decorate library and selected object. Preserve existing project custom assets. |
| `SelectionInspector.tsx` | Deselect stamp; rotate CW/CCW; flip H/V; scale; opacity; lock/unlock; bring front/send back; delete. | Edit / Decorate contextual inspector. |
| `SelectionInspector.tsx` | Deselect token; edit label; icon picker; delete. Deselect note; edit label/description; delete. Remove individual listed light. | Decorate/Prepare object inspector; Run where appropriate. |
| `SelectionInspector.tsx` | Empty-selection statistics: dimensions, theme, tile/object counts, light list. | On-demand map information, not permanent empty inspector. Counts later need audience rules. |
| `IconPicker.tsx` | Open token icon picker; search names/categories; select icon; use default letter/icon; dismiss including Escape. | Edit / Decorate / Prepare token details. |
| `TokenToolsSection.tsx` | Party/NPC/monster placement, sizes, move/remove. | Decorate/Prepare and Run DM controls. |
| `TacticalToolsTab.tsx` | Show fog preview; sight tool click/reset; Measure shapes and feet/cell. | Prepare/Run with optional Edit viewport utility; grid distance in Project settings. |
| `TacticalToolsTab.tsx` | Marker place/remove/clear; shape/color/radius. | Decorate or Run tactical annotation. |
| `TacticalToolsTab.tsx` | Light place/remove/clear; named presets, radius, color. | Prepare/Run illumination. |
| `AdvancedToolsTab.tsx` | Import/remove background image; opacity/scale/X/Y offsets. | Library / Trace entry, then Edit / Look tracing layer. |
| `AdvancedToolsTab.tsx` | Stair link tool; clear links for current level. | Edit / Levels, explicit level scope. |
| `AdvancedToolsTab.tsx` | GM draw/erase/clear; pen color/brush width; open scene templates. | Decorate/Run annotations; Decorate templates. |
| `SceneTemplateDialog.tsx` | Save selected rectangular region with name; choose/apply template with X/Y offsets; confirm/cancel apply; rename/confirm/cancel; delete; close. | Edit / Decorate template library; region capture discoverable from Build selection. |
| `CustomThemeDialog.tsx` | Select/create theme; name; base theme; grid color; built-in tile labels/colors; add custom tile; custom label/semantic behavior/color/image; remove graphic/delete tile; delete theme; cancel; save and use. | Edit / Look theme builder, preserving semantic tile behavior separately from art. |
| `GenerateHub.tsx` | Generate/Sample tabs; shrink/enlarge dialog text; algorithm; corridor strategy/bend; dungeon shape; dead-end pruning; width/height/density; into-selection toggle. | Library / Create and Edit / Build region generation; UI text size remains separate. |
| `GenerateHub.tsx` | Generator-specific tile-mix sliders/reset; label/name rooms; background fill; enable rivers/count/width/meander/source edge; seed/reroll; Generate/Cancel. | Creation preview advanced controls. Current generation commits directly; do not claim preview exists today. |
| `GenerateHub.tsx` | Sample theme/archetype filters; select bundled sample; Load Sample/Cancel and replacement confirmation. | Library / sample copy, not silent replacement. Preserve all existing generators and samples. |
| `PlayerToolbar.tsx` | Fog enable; defog; reveal/hide rectangle; reset/clear all fog; dynamic fog; reset explored memory. | **Run and Prepare DM controls, never the read-only player display.** |
| `PlayerToolbar.tsx` | Player draw/erase/clear; pen colors and widths; player token place/move/remove. | Retain DM-operated published annotations/token control in Run. Actual player input is a later remote capability, not first-release display behavior. |
| `NotesPanel.tsx` | Add; select via click/Enter/Space; edit room name/description; save/cancel; delete. | Decorate/Prepare and DM Run notes. Player gets read-only explicitly public content later. Current Present no-op edit handlers are not a valid read-only component. |
| `InitiativePanel.tsx` | Select token; drag reorder; Alt+Up/Down reorder; rename/Enter save/Escape cancel; clear ordering without deleting tokens. | Prepare/Run encounter; player later gets filtered read-only order. No current round/turn lifecycle. |
| `LevelTabs.tsx` | Select by click/Enter/Space/arrows; add; drag reorder; double-click rename; context-menu rename/duplicate/delete; rename Enter/Escape. | Edit / Levels; Run inspect separate from publishing. Context-menu actions need visible equivalents. |
| `ExportDialog.tsx` | DPI; page preset; GM/player view; monochrome; scale bar; calculated pixel/page summary; Export PNG; Cancel (disabled while exporting). | Export / print intent. Bounded/cancellable large rendering remains later work. |
| `MapCanvas.tsx` | Zoom in/out/reset/fit; focused arrows; Shift or Caps Lock plus wheel pan; minimap click pan/Enter fit; pointer/touch navigation and editing gestures. | Viewport utilities across modes, with mode-specific edit tools. Public minimap must use the future audience projection. |
| `MobileToolbar.tsx` | Primary tool strip; All tools sheet/close; grouped tools; Undo with long-press More; Redo; Generate; role toggle; draw color/width; measure shape; marker shape/color/size. | Same registry and destinations above with visible buttons; long press must not be the only entry. |
| `CommandPalette.tsx`, `ShortcutsHelp.tsx`, modal components | Open/search/select/execute/close palette, help reference/close; dialog cancellation, backdrop/Escape handling, focus return. | Help and common modal contract; preserve editable-field protection and keyboard reachability. |

## Compatibility decisions still required in UX-03

No shortcut has been changed in UX-00. Retain legacy commands until an explicit migration is accepted. In particular:

1. Shift+V toggles Edit/Present today. Decide whether it opens a DM preview or switches Edit/Run, with a visible explanation and compatibility path.
2. B/Shift+B and defog are currently Present-only. DM equivalents must remain discoverable in Run; the approved read-only player display does not inherit them.
3. Ctrl+S exports JSON today. Do not silently turn it into a different local-save action.
4. PageUp/PageDown currently change the active floor. In Run this must mean inspect, not implicitly publish.
5. Retiring Rail/Tabs must not remove secondary controls, imported assets, generation parameters, print treatments, or shortcut alternatives.

Scope/status and research evidence: [UX-00 handoff](./UX-00-HANDOFF.md).
