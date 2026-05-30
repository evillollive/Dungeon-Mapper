# ⚔ Dungeon Mapper

**Make battle maps that look great fast, then keep polishing until they feel like your table.**

Dungeon Mapper is a retro-styled, interactive, grid-based dungeon map editor built with Vite, React, and TypeScript. It's great when you want to sketch quickly, but it also has the deeper GM tools that usually show up later in the workflow: fog of war, tokens, initiative, generation, multi-level projects, flexible art layers, and exports that are ready to share or print. It's installable as a Progressive Web App, works offline, and feels comfortable on touch devices too.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111827)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)

![Dungeon Mapper hero screenshot](./public/pwa-512x512.png)

## Quick Start

If you just want to get a map on screen and start playing around, begin here:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

From there, you can paint by hand, press `G` to open Generate Hub, or load a sample and start remixing. It's a pretty friendly rabbit hole.


## The exciting stuff

Here is the short version before the deep dive:

- Four deterministic generators (Rooms & Corridors, Open Terrain, Cavern, Village)
- Dynamic room vectors (rect, circle, polygon) with additive/subtractive workflows
- Editable river vectors with generator integration and rasterized water flow metadata
- Full edit/present split with fog-of-war, FOV, tokens, initiative, lights, and measure tools
- Art system layers (paper texture, edge blending, hand-drawn mode, lighting/atmosphere)
- JSON/PNG/SVG plus print-optimized high-DPI export

## Theme Gallery

Different campaigns want different vibes. The nice part is that the same map data can wear a lot of different costumes.

| Theme | Style |
| --- | --- |
| Dungeon | Classic subterranean crawl |
| Castle | Aboveground stone keep |
| Starship | Sci-fi interior |
| Wilderness | Outdoor overland |
| Cyberpunk | Neon urban |
| Pirate | Naval adventure |

## The clever bits

A lot of Dungeon Mapper's best ideas are about staying flexible after the first draft.

- **Fog that helps you run the game.** Start fully hidden, reveal rooms manually, or let dynamic fog use token sight and light sources so exploration feels reactive instead of tedious.
- **Generation that respects your work.** Generate Hub can replace the whole map when you want a fresh start, or generate into a selection when you only need one region to change.
- **Art layers that stack cleanly.** Paper texture, edge blending, hand-drawn rendering, and lighting all stay composable, so you can chase a mood without repainting the map.
- **Themes that stay portable.** Tile behavior and presentation are separated, which means you can re-theme a map, preserve painted styles, or prep color and print versions without losing structure.

That separation between data, presentation, and table tools is what makes the whole thing feel surprisingly forgiving.

## What's in the box

If you want the broader project docs, start here:

- [Documentation Index](./docs/README.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Roadmap](./docs/ROADMAP.md)
- [Changelog](./CHANGELOG.md)
- [Contributing](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)

## Everything you can do

If you want the full tour in one place, this is it. Dungeon Mapper starts fast, then keeps unfolding as your map gets more ambitious. Every tool below is here to help you go from rough sketch to table-ready encounter without bouncing between five different apps.

- **Grid editor** - configurable map from 8×8 up to 128×128 (selectable widths/heights: 8, 16, 24, 32, 48, 64, 96, 128), default 32×32
- **Tile size** - selectable tile size (12, 16, 20, 24, 32 px), default 20 px
- **20 paintable tile types** - Floor, Wall, Door (H/V), Secret Door, Locked Door (H/V), Trapped Door (H/V), Portcullis, Archway, Barricade, Stairs Up/Down, Water, Pillar, Trap, Treasure, Start, plus project-scoped custom tiles (use the Erase tool to clear a tile back to empty)
- **13 preset theme modes** - Castle, Dungeon, Starship, Alien World, Lost Civilization, Old West, Steampunk, Wilderness, Cyberpunk, Post-Apocalypse, Modern City, Pirate, Desert - each with unique per-theme art for floors, walls, doors, water, treasure, traps, and start tiles (see [Preset Modes](#preset-modes) below)
- **Custom themes** - project-scoped custom theme builder with editable tile colors, labels, grid color, and optional uploaded tile graphics (see [Custom Themes](#custom-themes) below)
- **Multi-level dungeons** - create multi-floor projects with level tabs, stair links between levels, per-level undo history, and double-click stair navigation (see [Multi-Level Dungeons](#multi-level-dungeons) below)
- **Sample maps** - 26 bundled sample projects (including 2 multi-level maps totaling 28 levels) across all 13 themes for onboarding and inspiration (see [Sample Maps](#sample-maps) below)
- **Themed canvas** - per-theme grid colors, deterministic tile color jitter, and wall depth/shadow effects for a rich, organic look; warm parchment background with pixel-sharp rendering
- **Print mode** - toggle a high-contrast black-and-white renderer for printer-friendly output, with cross-hatched walls and stipple-shaded water
- **Navigation rail** - vertical icon strip with contextual side panel (default layout); switch between rail and classic tabbed toolbar via the LAYOUT dropdown in the header
- **Command palette** - fuzzy-search overlay (`Ctrl/Cmd+K`) for quick access to tools, themes, file actions, view toggles, and canvas commands
- **Selection inspector** - docked right panel showing properties of the selected stamp/token/note, or a map summary (dimensions, tile counts, theme) when nothing is selected
- **Generate Hub** - unified generation window (`G` shortcut) with tabbed Generate and Samples panels, archetype filtering, and all generation controls in one place
- **Stamps** - 196 built-in stamps (40 universal + 156 per-theme across 13 themes) plus custom stamp upload (PNG/SVG/JPEG/WebP, 2 MB limit); place, move, rotate, flip, scale, adjust opacity, lock, and z-order stamps on the canvas (see [Stamps](#stamps) below)
- **Wall, path & river drawing** - free-form wall segments snapped to grid edges (`W`), smooth path/road lines (`Shift+W`), and editable flowing river vectors (`U`) with erase modes; independent of tile grid until rivers rasterize to water (see [Wall, Path & River Tools](#wall-path--river-tools) below)
- **Scene/room templates** - save a selection of tiles, notes, and stamps as a reusable template; apply templates to stamp pre-built rooms onto any map (see [Scene Templates](#scene-templates) below)
- **Tabbed toolbar** - GM tools organized into three tabs (Draw, Tactical, Advanced) for progressive disclosure and reduced clutter
- **Drawing tools** - Paint `P`, Erase `E`, Flood Fill `F`, Add Note `N`, Line `L`, Rectangle `R`, Select `S`, Line-of-Sight / FOV `O`, Measure `M`, Light Source `I`, GM Draw `D`, Wall `W`, Path `Shift+W`
- **GM drawing tools** - freehand GM-only annotations with dashed line rendering, hidden from Present view in canvas, PNG, and SVG exports (`D` shortcut)
- **Copy / Paste / Cut** - select a region with the Select tool, then `Ctrl+C` to copy, `Ctrl+X` to cut, `Ctrl+V` to paste tiles and notes at the selection origin with a live preview overlay
- **Procedural map generation** - the **Generate Hub** (`G`) opens a unified window with four algorithms (Rooms & Corridors, Open Terrain, Cavern, Village), a deterministic seed, a density slider, per-generator tile-mix sliders, corridor strategy and shape controls, optional theme room labels with procedural names, and an opt-in **Generate into selection** mode that stamps a generated map into an active selection rectangle without disturbing the rest of the map (see [Map Generation](#map-generation) below)
- **Edit / Present views** - header **👁 Present** toggle swaps to a player-safe toolbar with a freehand drawing pen, an eraser, fog-of-war controls, and token tools (see [Present View](#present-view) below)
- **Fog of war** - per-cell hidden / revealed flags with a Defog brush, Reveal `V` / Hide `H` drag-rectangles, Reset Fog (re-cover the map), Clear Fog (reveal everything), an optional GM **🌫 Show Fog** preview overlay, fog edge feathering, and **Dynamic Fog** mode that auto-reveals cells visible from player tokens with 3-state rendering (hidden / explored / visible)
- **Tokens with icon library** - drop Player, NPC, and Monster tokens (small 1×1, medium 2×2, large 3×3) onto the map with a searchable icon picker (30+ icons in 6 categories); Move Token to drag, Remove Token to delete
- **Initiative panel** - a turn-order list in the right-hand sidebar that mirrors placed tokens; the GM can drag entries to reorder, rename them inline, or clear the list (see [Initiative](#initiative) below)
- **Shape / area markers** - place colored shape overlays (circle, square, diamond) on the map for marking spell areas, hazard zones, and tactical effects; 8 color options with adjustable radius (see [Markers](#markers) below)
- **Measure tool** - measure distances between cells in four shapes (ruler, circle, cone, line) with configurable feet-per-cell scale (default 5 ft); overlays are drawn in cyan with a distance readout pill (see [Measure](#measure) below)
- **Light sources** - place light sources on the map from preset profiles (torch, lantern, magical, custom) with adjustable radius and color; integrates with dynamic fog to illuminate cells within range (see [Light Sources](#light-sources) below)
- **Background image import** - import a PNG/JPG as a background layer behind the tile grid for tracing existing battlemaps; adjustable opacity, scale, and position (see [Background Image](#background-image) below)
- **Player annotations** - freehand pen with eight color swatches and Thin / Medium / Thick brush widths; per-stroke eraser and a Clear All button
- **Zoom & pan** - `+` / `-` / `Reset` / `Fit` controls along the bottom of the map; right-click drag (or long-press on touch) to pan; mouse-wheel zoom while holding `Shift` (or with Caps Lock on); pinch-to-zoom and two-finger pan on touch devices; on-canvas HUD displays current zoom level and cursor coordinates
- **Undo / Redo** - up to 50 steps per level (`Ctrl+Z` / `Ctrl+Y` or `Ctrl+Shift+Z`)
- **Room notes** - numbered annotations placed on the map with labels and descriptions; in Present view, notes that sit under fog are hidden from the side panel
- **Auto-save** - map state persisted to IndexedDB on every change (migrates legacy localStorage data automatically)
- **Line-of-Sight / FOV** - click any cell to visualize which cells are visible from that point, with walls blocking the view; click the same cell again to clear (`O` shortcut)
- **Export / Import** - JSON round-trip, PNG canvas export, SVG vector export, and a print-optimized high-DPI PNG export dialog with page tiling and optional scale bar
- **Adjustable UI scale** - header **UI** dropdown rescales chrome text and controls (50%, 75%, 100%, 125%, 150%) and remembers your choice across sessions
- **Preserve-tiles toggle** - when enabled (toolbar **🎨 Preserve**), switching themes keeps already-painted tiles in their original style so you can mix terrain styles from multiple themes on a single map
- **Art style presets** - 5 built-in visual presets (Classic, Hand-Drawn, Painted, Minimal, Print) that configure all four art layers in one click; tweak individual layers to create a Custom style (see [Art System](#art-system) below)
- **Paper texture** - procedural background texture with 5 patterns (parchment, linen, canvas, watercolor, marble), per-theme tints, adjustable opacity/grain/vignette
- **Edge blending** - softens tile boundaries with 3 styles (dither, smooth, stipple) for organic terrain transitions
- **Hand-drawn mode** - 3 rendering styles (sketchy, pencil, ink) that add wobbly grid lines, cross-hatch shading, and bold boundary strokes for a hand-crafted look
- **Lighting & atmosphere** - ambient occlusion in wall corners, drop-shadows under stamps, and day/night/dusk color grading for mood and depth
- **Mobile & tablet support** - responsive layout with 4 breakpoints, dedicated mobile bottom toolbar, touch gestures (pinch-to-zoom, two-finger pan, long-press pan), and gesture shortcuts (two-finger tap = undo, three-finger tap = redo)
- **Progressive Web App** - installable on desktop and mobile with full offline support via service worker caching

## Preset Modes

Preset modes are where the map starts feeling alive. The idea is simple: keep the structure of your dungeon, then let you change the mood in seconds. You can audition settings, swap aesthetics for a new campaign, or make a print-friendly version without repainting the whole thing.

### Theme modes

Every theme keeps the same underlying tile logic, but gives it a different visual language. That means your layout stays stable while the story around it changes: stone halls become neon corridors, wilderness trails become pirate decks, and so on. If you want to mix styles on purpose, the Preserve toggle lets already-painted tiles hang onto their original look while the rest of the map updates around them.

| Theme | Setting | Tile flavor (Floor / Wall / Door / Secret Door / Locked Door / Trapped Door / Portcullis / Archway / Barricade / Water / Pillar / Trap / Treasure / Start) |
| --- | --- | --- |
| **Alien World** | Otherworldly biological landscape | Spore Bed / Fungal Wall / Membrane / Hidden Burrow / Locked Membrane / Trapped Membrane / Chitin Gate / Nerve Arch / Growth Barricade / Acid Pool / Crystal Spire / Spore Burst / Crystal Cluster / Landing Site |
| **Castle** | Aboveground stone keep | Stone Tile / Battlement / Oak Door / Hidden Passage / Locked Oak Door / Trapped Oak Door / Castle Portcullis / Stone Archway / Wooden Barricade / Moat / Column / Murder Hole / Royal Hoard / Great Hall |
| **Cyberpunk** | Neon-lit street grids | Street / Barrier / Shutter / Cloaked Panel / Locked Shutter / Trapped Shutter / Security Gate / Neon Arch / Debris Barrier / Acid Pool / Terminal / Turret / Chip Cache / Spawn |
| **Desert** | Sun-baked sands and tombs | Sand / Sandstone / Tomb Door / Hidden Chamber / Locked Tomb Door / Trapped Tomb Door / Sand Gate / Desert Arch / Sand Barricade / Oasis / Cactus / Quicksand / Relic / Caravan |
| **Dungeon** *(default)* | Subterranean crawl | Flagstone / Stone Wall / Iron Door / Secret Door / Locked Iron Door / Trapped Iron Door / Iron Portcullis / Stone Archway / Wooden Barricade / Underground Pool / Pillar / Trap / Treasure / Entrance |
| **Lost Civilization** | Ancient temple complex | Flagstone / Carved Wall / Stone Slab / Hidden Glyph / Locked Carved Door / Trapped Carved Door / Stone Portcullis / Temple Arch / Stone Barricade / Reflecting Pool / Pillar / Cursed Glyph / Sarcophagus / Obelisk |
| **Modern City** | Contemporary urban streets | Sidewalk / Building / Doorway / Hidden Door / Locked Doorway / Trapped Doorway / Security Gate / Open Entry / Road Barrier / Fountain / Lamp Post / Manhole / ATM / Bus Stop |
| **Old West** | Frontier towns and saloons | Dirt / Plank Wall / Saloon Door / Hidden Passage / Locked Plank Door / Trapped Plank Door / Jail Gate / Open Doorway / Wooden Barricade / Water Trough / Post / Bear Trap / Gold / Entrance |
| **Pirate** | Tall ships and hidden coves | Deck / Hull / Hatch / Smuggler Hatch / Locked Hatch / Trapped Hatch / Chain Gate / Open Port / Cargo Barricade / Bilge / Mast / Cannon / Booty / Anchor |
| **Post-Apocalypse** | Ruined wastelands | Rubble / Ruins / Barricade / Hidden Stash / Locked Barricade / Trapped Barricade / Chain Gate / Ruined Arch / Scrap Barricade / Toxic Pool / Rubble Pile / Landmine / Supplies / Shelter |
| **Starship** | Deep-space vessel interiors | Deck / Bulkhead / Blast Door / Hidden Hatch / Locked Blast Door / Trapped Blast Door / Blast Shield / Open Bulkhead / Emergency Barrier / Coolant / Support / Laser Grid / Data Core / Airlock |
| **Steampunk** | Industrial gear-and-steam works | Iron Plate / Gear Wall / Valve Door / Concealed Hatch / Locked Valve Door / Trapped Valve Door / Steam Gate / Pipe Archway / Gear Barricade / Steam Pipe / Piston / Pressure Plate / Contraption / Engine |
| **Wilderness** | Outdoor overland maps | Grass / Trees / Gate / Hidden Path / Locked Gate / Trapped Gate / Fence Gate / Natural Arch / Log Barricade / River / Boulder / Snare / Cache / Camp |

### Print mode

Print mode is the practical friend in the group. It strips the map down to a crisp, high-contrast black-and-parchment look so exports stay readable on paper, at the table, or in any situation where color is more distraction than help. Flip it on when you need clarity, flip it off when you want the full atmosphere back.

## Custom Themes

If the built-in themes get you 90 percent of the way there, custom themes handle the last 10 percent that makes a map feel like yours. You can start from an existing style, tweak the palette, rename the tile language, and even bring in your own graphics without giving up the editor's built-in behavior.

- **Base theme** - custom themes inherit from one of the 13 built-in themes, getting its tile rendering and grid color as defaults.
- **Editable properties** - change the theme name, grid line color, and per-tile colors and labels for all built-in tile types.
- **Custom tile palette** - add user-defined tile entries with a label, semantic base behavior (floor, wall, door, etc.), color fallback, and optional uploaded PNG/JPEG/WebP graphic stored as a data URL.
- **Base behavior** - custom tiles inherit line-of-sight blocking, dynamic fog interaction, light visibility, and print-mode fallback from their assigned base behavior.
- **Persistence** - custom themes round-trip through JSON export/import and IndexedDB auto-save. They are project-scoped, so each project can have its own theme customizations.

## Multi-Level Dungeons

Some maps want to sprawl. Multi-level support keeps those bigger projects manageable, so stairs actually connect places, each floor keeps its own history, and hopping between levels feels natural instead of fiddly.

- **Level tabs** - a tab bar below the header with controls to add, rename (double-click), duplicate, delete, and drag-to-reorder levels.
- **Per-level undo** - each level maintains its own 50-step undo/redo history.
- **Stair links** - use the Stair Link tool (`K`) to connect stairs-up and stairs-down tiles between levels. Click a stairs tile to set the source, switch levels, then click the destination stairs to create a link.
- **Link badges** - linked stairs show blue "L#" badges on the canvas indicating the destination level. Level tabs show a 🔗 badge with the link count.
- **Stair navigation** - double-click a linked stairs tile to jump to the destination level and auto-center the viewport on the arrival cell.
- **Link management** - the STAIR LINKS toolbar section provides the Link tool, a Clear Links button, and a link count display. Links auto-reindex when levels are deleted, duplicated, or reordered.
- **Keyboard shortcuts** - `PageUp` / `PageDown` to cycle between levels; `K` to activate the Stair Link tool.
- **Full round-trip** - multi-level projects export/import as JSON with all stair links preserved. IndexedDB auto-save handles legacy single-map migration automatically.

## Sample Maps

Need a head start or just want to see what the editor can do when everything is firing at once? The Samples tab in Generate Hub is full of ready-to-explore projects across every theme. They are great for onboarding, inspiration, or shamelessly remixing into your own encounter prep.

## Present View

Present View is where Dungeon Mapper stops feeling like an editor and starts feeling like a session tool. You build in Edit mode, then switch to a player-safe surface that keeps the map shareable while preserving the same underlying project.

- **Edit mode** is the full editor: paint tiles, place notes, switch themes, etc.
- **Present mode** is a player-safe surface for use at the table. The tile-paint palette is hidden so the map can't be accidentally redrawn, and a different toolbar is exposed: fog-of-war controls, a freehand pen for table annotations, and tokens.

Your view-mode preference is remembered across sessions.

### Fog of war

Fog of war is designed for actual table use. New maps begin hidden, so you can safely throw the map on a screen right away, then reveal it however your game flows best: brush it in, box it out, or let tokens and light sources do the work for you.

- **Defog** - freehand brush; drag across the map to wipe fog away cell-by-cell.
- **Reveal `V`** / **Hide `H`** - drag a rectangle of cells to expose or re-cover them.
- **Reset Fog** - re-fog the entire map (hide every cell).
- **Clear Fog** - reveal the entire map (clear all fog).
- **Dynamic** - toggle auto-reveal mode. When enabled, cells visible from any player token are automatically revealed using line-of-sight. The fog uses 3-state rendering: **hidden** (opaque, never seen), **explored** (dimmed, previously visible but no longer in line-of-sight), and **visible** (clear, currently in line-of-sight of a player token). The explored grid persists with the map.
- **Reset Explored** - (appears when Dynamic is enabled) clears all explored memory so previously seen cells return to fully fogged.

In Present view, fogged cells are covered by an opaque overlay (with soft gradient feathering at revealed/hidden boundaries) and any room notes that sit under fog are omitted from the side panel so they don't leak hidden rooms. In Edit mode, the toolbar's **🌫 Show Fog** checkbox layers a translucent grey wash over the same cells so the GM can preview what's hidden from players without losing their own view of the map.

### Drawing pen

Sometimes you just need to sketch on the map and keep moving. The Present toolbar includes a lightweight annotation pen for those moment-to-moment notes, arrows, plans, and panic scribbles that happen mid-session.

- **Draw** / **Erase** - sketch over the map with the pen, or click an individual stroke to remove it.
- **Pen colors** - eight preset swatches (red, orange, yellow, green, blue, purple, near-black, white).
- **Brush widths** - Thin, Medium, and Thick.
- **Clear All** - remove every player-drawn stroke from the map at once.

### Tokens

Tokens are meant to be fast to place, easy to read, and flexible enough for a real encounter. Drop in heroes, NPCs, and monsters, give them icons, then move them around without breaking the flow of the session.

- **Player**, **NPC**, and **Monster** tokens. Monster tokens come in three footprints - Monster S (1×1), Monster M (2×2), and Monster L (3×3) - for varying creature sizes.
- **Icon picker** - when placing a token, a searchable icon picker dialog opens with 30+ icons across 6 categories (Characters, Weapons, Magic, Creatures, Items, Environment). Choose an icon to display on the token, or cancel to use the default letter/emoji fallback.
- **Move Token** - click and drag a token to relocate it.
- **Remove** - click a token to delete it.

Tokens, fog flags, and player annotations are all stored on the map and survive auto-save / JSON export.

### Initiative

The initiative panel keeps the tactical state tied to the map instead of floating off in a separate app or notebook. Place tokens, keep turn order nearby, and jump from list to canvas without losing your place.

In **Edit mode** the panel is fully editable:

- **Drag** an entry up or down to change the turn order.
- **✎ Rename** an entry inline so the displayed label can be something other than the token's auto-generated name.
- **Clear** wipes the initiative list (tokens themselves stay on the map).

In **Present mode** the panel is read-only - no rename, reorder, or clear. When fog is enabled, tokens whose footprint sits entirely under fog are also omitted from the list so it doesn't leak the existence of hidden enemies.

The initiative order is persisted with the map (auto-save and JSON export).

### Markers

Markers are the quick visual language for everything temporary: spell areas, danger zones, objectives, and all the other things players ask about five times in a round. They stay readable without covering up the map underneath.

- **Place** - click on the map to drop a colored shape marker at the cursor position.
- **Remove** - click an existing marker to delete it.
- **Clear All** - remove every marker from the map.
- **Shape** - choose between Circle, Square, and Diamond shapes.
- **Color** - pick from 8 preset colors (red, orange, yellow, green, blue, purple, pink, dark grey).
- **Radius** - adjust the marker size from 1 to 10 tiles using the slider.

Markers are rendered with transparency so the underlying map remains visible. They appear above annotations but below tokens in the rendering order. A ghost preview follows the cursor when the Place tool is active. Markers are persisted with the map and included in PNG and SVG exports.

### Measure

The measure tool is built for the constant, tiny rules questions that happen during play. Drag, check the distance, answer the question, and move on. No menus, no math detour.

- **Measure tool** (`M`) - click and drag on the map to measure the distance between two cells.
- **Shape** - choose between four measurement shapes:
 - **Ruler** - straight-line point-to-point distance.
 - **Circle** - radial area from the origin point.
 - **Cone** - conical projection from the origin.
 - **Line** - linear path from the origin.
- **Scale** - set the feet-per-cell value (default 5 ft, range 1–100) to match your game system's grid scale.

Measurements are drawn as cyan overlays with a pill-shaped distance readout. Distances use Chebyshev (king-move) distance, matching the D&D 5e diagonal movement convention. Measurements are ephemeral - they aren't saved with the map.

### Light Sources

Lighting isn't just decoration here. Light sources feed directly into dynamic fog, which means torches, lanterns, and magical glows can actively shape what the table sees. It's a small detail that makes exploration feel much more alive.

- **Place** (`I`) - click a cell to drop a light source at that position.
- **Remove** - click an existing light source to delete it.
- **Presets** - choose from four profiles: Torch (warm orange, 4-cell radius), Lantern (amber, 6-cell radius), Magical (violet, 8-cell radius), or Custom.
- **Radius** - adjust the light radius from 1 to 20 cells.
- **Color** - pick from 8 preset colors (torch orange, lantern amber, pale yellow, white, magical violet, arcane green, ice blue, infernal red).

Light sources emit a soft glow overlay on the canvas and integrate with dynamic fog of war - cells illuminated by a light source are treated as visible when computing fog visibility. Light sources are persisted with the map (auto-save and JSON export).

### Copy, Cut & Paste

When a room layout works, you should be able to reuse it. The Select tool's clipboard actions make it easy to duplicate wings, shift encounter areas around, or save yourself from repainting the same geometry by hand.

- **Copy** (`Ctrl+C`) - copies all tiles and notes within the selection rectangle to an internal clipboard.
- **Cut** (`Ctrl+X`) - copies the selection and then erases the original tiles.
- **Paste** (`Ctrl+V`) - stamps the clipboard contents onto the map at the selection's top-left corner (or the map origin if no selection is active). A translucent dashed preview outline follows the cursor while the clipboard has content.

Notes within the selection are remapped to fresh IDs on paste to avoid collisions. Per-tile theme overrides (from the "Preserve" toggle) are preserved through copy/paste.

### Background Image

Background images are there for the moments when you want to trace over an existing battlemap, line up a sketch, or use outside art as a guide. It's a practical bridge between freehand planning and the structured tile grid.

- **Import** - opens a file picker for PNG, JPEG, or WebP images. The image is loaded as a data URL and stored with the map.
- **Remove** - clears the background image.
- **Opacity** - controls the image transparency (0%–100%) so the grid and tiles remain visible on top.
- **Scale** - resizes the image (10%–500%) relative to its natural size.
- **Offset X / Y** - repositions the image in tile units (–50 to +50) to align it with the grid.

The background image is hidden in Print mode. It's included in PNG exports (captured with the canvas) and SVG exports (embedded as a data URL). The image data is persisted with auto-save and JSON export/import.

## Stamps

Stamps are how you add flavor without turning every detail into tile work. Furniture, hazards, props, creatures, clutter, little bits of scene dressing, they all sit on top of the map so you can make spaces feel inhabited without sacrificing clean layout control.

### Placing & managing stamps

- **Place** - select a stamp from the stamp picker, then click on the canvas to place it. Stamps are tile-aligned.
- **Move** - drag a placed stamp to reposition it.
- **Select** - click a placed stamp on the canvas to select it; a yellow dashed highlight appears.
- **Transform controls** - the Selection Inspector (right panel) exposes rotation, flip (horizontal/vertical), scale (0.25×–4×), opacity (10–100%), lock, z-order (bring to front / send to back), and delete.
- **Keyboard shortcuts** - `Shift+R` rotate 90° clockwise, `Shift+H` flip horizontal, `Shift+V` flip vertical, `Delete` remove.

### Per-theme filtering

The stamp picker can stay focused on the current theme or open up the whole library. That keeps browsing quick when you're in the zone, but still lets you break the rules whenever the map wants something weird.

### Custom stamp upload

If the built-in library doesn't have the exact prop you want, bring your own. Custom stamps live with the project, so the weird altar, custom logo, or hand-drawn boss marker stays attached to the map when you export and re-import it later.

## Wall, Path & River Tools

These tools sit in a sweet spot between strict grid editing and freeform drawing. Use them when you want cleaner structure than a paint brush gives you, but more expressive shapes than a tile-by-tile workflow would allow.

- **Wall tool** (`W`) - draw wall segments that snap to grid-edge intersections. Click to add vertices; the segment completes when you press Escape or start a new segment. Walls render as solid lines on top of the tile layer.
- **Wall Erase** - click near a wall segment to remove it.
- **Path tool** (`Shift+W`) - draw smooth freeform path/road lines using fractional coordinates for organic curves. Paths render with rounded caps and joins.
- **Path Erase** - click near a path segment to remove it.
- **River tool** (`U`) - drag across the canvas to draw a flowing vector river. Rivers stay editable via their control points, then rasterize to water tiles with flow direction metadata.
- **River settings** - choose stroke color, width (stream/river/wide/broad), and semantic type (water, lava, or underground stream). River polish adds theme-aware bank tiles plus source and mouth markers.
- **River editing** - drag control points to reshape a river, right-click a control point to remove it, use **Erase Rivers** to delete a whole river vector, or **Clear All** to remove every river from the level.
- **Contextual settings** - when a wall, path, or river tool is active, the Draw tab shows color and thickness/width/type controls.
- **Clear all** - buttons clear wall segments, path segments, or river vectors from the current level.

Walls, paths, and rivers are persisted with the map and included in all exports. They coexist with floor/wall tiles and are rendered above the tile layer but below stamps and tokens. Rivers also contribute rasterized water, bank, flow-direction, and endpoint metadata used by the canvas and export renderers.

## Scene Templates

Scene templates are the payoff for building reusable encounter pieces. Save a room once, drop it into future maps whenever you need it, and slowly build your own library of reliable dungeon chunks.

- **Save template** - select a region with the Select tool, then open the Templates dialog (📋 button in Advanced tab) and save the selection as a named template. Templates capture tiles, notes, and stamps within the selection.
- **Apply template** - choose a saved template from the dialog and stamp it onto the map at the current selection position.
- **Manage** - rename or delete templates from the dialog.
- **Persistence** - templates are project-scoped and round-trip through JSON export/import and IndexedDB auto-save.

## Navigation Rail & Layout

Not everybody likes the same workspace. Dungeon Mapper gives you two desktop layouts so you can lean into a compact rail or stick with classic tabs, whichever one makes the toolset feel easier to reach.

- **Rail** (default) - a vertical icon strip on the left with a contextual side panel that shows tool options for the active rail button. Compact and efficient for desktop use.
- **Tabs** - the classic tabbed toolbar (Draw / Tactical / Advanced) in a wider left sidebar.

The layout preference is saved to localStorage and restored on next visit. On mobile (≤768px), the bottom toolbar is always used regardless of this setting.

## Art System

The art system is one of the nicest parts of the app because it treats presentation as layers, not a one-way commitment. You can dial the map toward crisp, sketchy, painterly, moody, or printer-friendly looks, then keep tweaking without touching the actual tile data underneath.

### Art style presets

If you want a fast mood shift, presets do the heavy lifting. They bundle the four art layers into ready-made looks, then step aside so you can keep fine-tuning once a preset gets you close.

| Preset | Paper | Edges | Hand-Drawn | Lighting | Description |
| --- | --- | --- | --- | --- | --- |
| **Classic** | Parchment | Dither | - | AO | Subtle parchment texture, dithered edges, ambient occlusion - the default look |
| **Hand-Drawn** | Canvas | - | Sketchy | AO | Canvas texture, wobbly sketchy lines, cross-hatch shading |
| **Painted** | Watercolor | Smooth | Ink | Dusk grading | Watercolor washes, smooth blending, bold ink outlines, warm dusk tint |
| **Minimal** | - | - | - | - | Clean digital look - all art layers disabled |
| **Print** | Linen | Stipple | Pencil | AO | Linen texture, stipple edges, pencil lines - optimised for B&W print output |

Selecting a preset instantly applies its settings. If you manually adjust any individual layer afterward, the preset changes to **Custom** so you know it's been tweaked. All presets work with every theme - the art layers composite on top of the theme's base tile art.

### Paper texture

Paper texture gives the whole map a surface to live on. It's subtle, but it does a lot of work in making a digital grid feel more like something you could have unfolded on the table.

- **Pattern** - choose from 5 textures: parchment, linen, canvas, watercolor, marble.
- **Opacity** - blend strength of the texture layer (0–1).
- **Grain** - amount of fine noise added to the texture.
- **Vignette** - darkening at the edges of the map for a framed look.
- **Theme tint** - each theme applies its own color tint to the paper (e.g., warm amber for Castle, cool grey for Starship, olive for Wilderness).

### Edge blending

Edge blending softens that hard cut between terrain types, which matters more than you might think. A little blur, dither, or stipple goes a long way toward making the map feel organic instead of assembled from obvious blocks.

- **Style** - `dither` (scattered pixels), `smooth` (gradient fade), or `stipple` (dot pattern).
- **Intensity** - how far the blend extends from the tile edge.
- **Opacity** - overall strength of the blend layer.

### Hand-drawn mode

Hand-drawn mode is for when you want the map to feel made, not rendered. It introduces just enough wobble and texture to fake that penciled, inked, sketched-at-midnight energy.

- **Style** - `sketchy` (wobbly offset lines), `pencil` (fine textured strokes), or `ink` (bold confident outlines).
- **Wobble** - amplitude of line waviness.
- **Line width** - stroke thickness.
- **Opacity** - overall strength of the hand-drawn overlay.
- Honors print mode - renders in black & white when print mode is active.

### Lighting & atmosphere

Lighting and atmosphere are the finishing touches that give the map depth. They're also fully optional, which is the point: add mood when you want it, keep things clean when you don't.

- **Ambient occlusion** - darkens inner corners where wall tiles meet, simulating realistic shadow gathering. Adjustable intensity and radius.
- **Stamp shadows** - soft drop-shadows beneath placed stamps for visual lift. Adjustable opacity and offset.
- **Color grading** - a scene-wide tint overlay in four modes: `day` (warm daylight), `night` (cool blue), `dusk` (golden amber), or `none`. Adjustable intensity.
- **Overall opacity** - master control for the entire lighting layer.
- Disabled in print mode by default.

### Export integration

Each art layer has a corresponding export toggle in the PNG/SVG export dialogs so you can include or exclude paper texture, edge blending, hand-drawn effects, and lighting from your exports independently.

## Map Generation

Generate Hub is where the app earns its keep when you need ideas fast. You can spin up a whole map from a seed, pull in a sample, or generate inside a selection when only one part of the layout needs fresh life. It's built to help you iterate, not just dump out a random dungeon and call it done.

- **Generate** - procedural map generation with four algorithms and full parameter controls.
- **Samples** - a gallery of 26 bundled sample projects with archetype filtering (dungeon, village, cavern, terrain, multi-level).

Generated maps use the standard tile types (Floor, Wall, Door, Secret Door, Locked Door, Trapped Door, Portcullis, Archway, Barricade, Stairs, Water, Pillar, Trap, Treasure, Start) so the result is rendered in whatever theme the map currently uses - switching the theme afterwards restyles the generated map without losing any tile data.

### Algorithms

Each generator has a different personality. Some are great for structured spaces, some are better for organic terrain, and some are there for the moments when you need a believable settlement in a hurry.

| Algorithm | What it produces | Default for themes |
| --- | --- | --- |
| **Rooms & Corridors** | Rectangular rooms connected by corridors with configurable routing strategy. Best for dungeons, castles, ships, and other built spaces. | Dungeon, Castle, Starship, Alien World, Steampunk, Cyberpunk, Modern City, Pirate, Old West, Lost Civilization |
| **Open Terrain** | Open ground scattered with obstacles, water, and standing stones. Best for outdoor / overland maps. | Wilderness, Desert, Post-Apocalypse |
| **Cavern** | Organic cave system carved out via cellular-automata smoothing, guaranteed to be a single connected region. | (No theme defaults to this - pick it manually for any theme.) |
| **Village** | A settlement with buildings, streets, and optional walls. Uses BSP partitioning for organic district layout. | (No theme defaults to this - pick it manually for any theme.) |

### Dialog controls

- **Width / Height** - target map size in tiles. Clamped to 8–128 (the same range as the header **SIZE** dropdowns).
- **Generate into selection** - visible only when an active selection rectangle is present in the editor (use the Select tool `S` to make one) and is at least 6 × 6 tiles. When checked, Width / Height are taken from the selection and only cells inside the selection are overwritten - notes, tokens, fog, and tiles outside the selection are preserved. When unchecked (or no selection exists), generating replaces the entire map and clears notes and tokens.
- **Density** - global "how full should the map feel" multiplier (range: 0.1–1.5, default 1.0). Higher values pack in more rooms / obstacles / features; lower values produce sparser layouts.
- **Corridor style** *(Rooms & Corridors only)* - selects the corridor routing strategy:
 - **Classic L-bends** - connect rooms in sequence with right-angled corridors (default).
 - **Spanning tree** - connect each room to its nearest neighbors via a minimum spanning tree.
 - **Looping passages** - spanning tree plus extra short edges to create cycles.
 - **Winding passages** - spanning tree with Z-shaped corridors.
- **Corridor bend** *(Rooms & Corridors only)* - a slider controlling how straight corridors are, from winding (0) to straight (1), with the legacy default at 0.5.
- **Dungeon shape** *(Rooms & Corridors only)* - constrains room placement to a non-rectangular mask. Eight shapes available: Rectangle (default), Circle, Diamond, Cross, L-Shape, T-Shape, Hexagon, Octagon.
- **Dead-end pruning** *(Rooms & Corridors only)* - slider (0–100%) that iteratively removes dead-end corridor tiles. At 0% (default) dead ends are kept; at 100% all dead-end stubs are removed.
- **Tile mix** *(collapsible section)* - per-generator sliders for fine-tuning what gets sprinkled in. Each generator exposes its own set, e.g. Rooms & Corridors offers Treasure share, Trap / Hazard share, and Door fraction; Open Terrain and Cavern have their own. The dialog remembers the values you set per algorithm as you flip between them, and a **Reset** button restores the active algorithm's theme defaults.
- **Add river** *(supported terrain/cavern/village themes)* - opt-in river generation with controls for count, width, meander, and source edge. Generated rivers are editable vector layers; high-meander rivers can spawn tributaries, underground themes use underground-stream semantics, and village roads crossing generated rivers become bridge archways.
- **Label rooms with theme archetypes** - Rooms & Corridors only, and only when the active theme has a room-archetype palette (built spaces such as Castle "Great Hall", Starship "Bridge", Modern City rooms, etc.). When checked, generated rooms are auto-labeled with theme-appropriate names dropped into the side notes panel.
- **Add procedural names** - visible when room labels are enabled. Appends flavor-text suffixes (e.g. "Crypt of the Crimson Veil") to room labels using per-theme word tables.
- **Seed** - text seed used to make generation deterministic; the same seed + algorithm + parameters always produces the same map. Accepts decimal digits, hex (with or without an `0x` prefix), or any free-form string (which is hashed). Use the **🎲** button next to the field to roll a new random seed; leaving the field blank also picks a fresh random seed at generate time.

### Confirmation and undo

- If the current map already contains painted tiles, generating a full map (i.e. with **Generate into selection** off) prompts for confirmation before replacing it. Notes and tokens are cleared by a full-map generation.
- A selection-scoped generation never asks for confirmation and never touches notes, tokens, or fog.
- Tile changes from any generation can be reverted with **Undo** (`Ctrl+Z`).

## Keyboard Shortcuts

Once you spend a few minutes with Dungeon Mapper, shortcuts start doing a lot of the heavy lifting. The in-app overlay is generated from the same registry as the bindings themselves, so the reference stays honest and up to date.

### Tools

| Shortcut | Action |
| --- | --- |
| `P` | Paint tool |
| `E` | Erase tool |
| `F` | Flood Fill tool |
| `N` | Add Note tool |
| `L` | Line tool |
| `R` | Rectangle tool |
| `S` | Select tool |
| `V` | Reveal fog (drag-rectangle, fog must be enabled) |
| `H` | Hide fog (drag-rectangle, fog must be enabled) |
| `O` | Line-of-Sight / FOV tool - click a cell to see what is visible from it |
| `M` | Measure / Distance tool - click and drag to measure distances |
| `I` | Light Source tool - click a cell to place a light source (Illuminate) |
| `D` | GM Draw tool - freehand annotations visible only in Edit mode (dashed lines, hidden from Present view) |
| `W` | Wall drawing tool - draw walls along grid edges |
| `Shift+W` | Path/road drawing tool - draw free-form paths |
| `U` | River tool - drag to draw flowing water |
| `K` | Stair Link tool - click stairs to link between levels |
| `Shift+R` | Rotate selected stamp 90° clockwise |
| `Shift+H` | Flip selected stamp horizontally |
| `Delete` | Delete selected placed stamp |

### View

| Shortcut | Action |
| --- | --- |
| `Shift+P` | Toggle Print / B&W mode |
| `Shift+V` | Toggle Edit ↔ Present view |
| `T` / `Shift+T` | Cycle to next / previous theme (Edit mode) |
| `[` / `]` | Cycle to previous / next tile in the palette (Edit mode) |
| `Ctrl+=` *or* `Ctrl++` | Increase UI scale |
| `Ctrl+-` | Decrease UI scale |

### Canvas

| Shortcut | Action |
| --- | --- |
| `+` / `-` | Zoom in / out |
| `0` | Reset zoom to 100% |
| `1` | Fit map to screen |
| Arrow keys | Pan the canvas (focus the canvas first by clicking it or via the **Skip to map canvas** link) |
| `Shift` + mouse wheel | Zoom in / out (Caps Lock also enables wheel zoom without `Shift`) |
| Right-click drag | Pan the canvas |
| `PageUp` / `PageDown` | Switch to previous / next level (multi-level projects) |

### Edit

| Shortcut | Action |
| --- | --- |
| `Ctrl+Z` | Undo (up to 50 steps) |
| `Ctrl+Y` *or* `Ctrl+Shift+Z` | Redo |
| `Ctrl+C` | Copy selection to clipboard (Select tool) |
| `Ctrl+X` | Cut selection to clipboard (Select tool) |
| `Ctrl+V` | Paste clipboard at selection origin (Select tool) |
| `Delete` *or* `Backspace` | Clear tiles inside the active selection (Select tool) |
| `Esc` | Clear the active selection or close the open dialog |

### File

| Shortcut | Action |
| --- | --- |
| `G` | Open the Generate Hub (Edit mode) |
| `Ctrl+Alt+N` *or* `Ctrl+N` | New map (with confirmation) |
| `Ctrl+O` | Import map from JSON |
| `Ctrl+S` | Export map as JSON |
| `Ctrl+Shift+S` | Export map as PNG |
| `Ctrl+Alt+S` | Export map as SVG |
| `Ctrl+Shift+P` | Print-optimized export (high-DPI PNG with page tiling) |

### Help

| Shortcut | Action |
| --- | --- |
| `?` | Show the keyboard-shortcuts overlay |
| `Ctrl+K` *or* `Cmd+K` | Open command palette (fuzzy-search actions) |

> Some browsers reserve `Ctrl+N`, `Ctrl+O`, and `Ctrl+S` for their own
> "new window", "open file", and "save page" actions and won't deliver
> them to the page. The header buttons (**New**, **↑ Import**, **↓ JSON**)
> and the documented alternates (`Ctrl+Alt+N` for **New**) work as a
> fallback in those browsers.

## Accessibility

Dungeon Mapper is designed so keyboard users and screen-reader users can actually navigate the editor with confidence. The goal isn't just to check boxes, it's to make a complex tool feel dependable no matter how you use it.

- **Single-listener keyboard registry.** Every global shortcut listed
 above is owned by `useGlobalShortcuts`, which automatically suppresses
 shortcuts while you're typing in a text field, drop-down, or modal
 dialog so single-letter tool keys never fire from the wrong context.
- **Skip link.** A "Skip to map canvas" link is the first focusable
 element on the page, so keyboard users don't have to tab through the
 header on every visit.
- **Landmarks.** The header (`<header>`), tool sidebar (`<nav>`), map
 area (`<main>`), and side panels (`<aside>`) are real landmark
 elements with accessible names so screen-reader rotors can jump
 between regions.
- **Toggle state.** Every toggle button (Print, GM/Player view, Show
 Fog, Preserve theme, the active tool, the active palette tile, the
 pen color and brush size) carries `aria-pressed` so assistive
 technology reports its on/off state.
- **Shortcut hints.** Buttons with a hotkey advertise it via
 `aria-keyshortcuts`, and tooltips show the same key in `[brackets]`
 for sighted users.
- **Polite live region.** Undo / redo, theme switch, view-mode swap,
 print-mode toggle, zoom level changes, and "Map generated"
 announcements are surfaced via an `aria-live="polite"` status region
 so the actions are audible without checking the canvas.
- **Focus visibility.** All interactive controls (header buttons, tool
 buttons, palette tiles, drop-downs, zoom controls, the canvas, note
 and initiative panel items, form inputs, and edit/delete buttons)
 expose a high-contrast `:focus-visible` ring that is shown only for
 keyboard users.
- **Keyboard-navigable panels.** Room note and initiative panel entries
 are keyboard-focusable with `Enter`/`Space` to select. Initiative
 entries can be reordered with `Alt+Up`/`Alt+Down` arrow keys as a
 keyboard alternative to drag-and-drop.
- **Descriptive labels.** Note edit/delete buttons and initiative rename
 buttons carry `aria-label` attributes that include the item name for
 clear screen-reader identification. Form inputs in note editing have
 explicit `aria-label` values. All range sliders and color pickers in
 the toolbar include descriptive `aria-label` text.
- **Modal dialogs.** All dialogs (Export, Generate Hub, Icon Picker,
 Shortcuts Help, Scene Templates, Command Palette) use `role="dialog"` and `aria-modal="true"` with
 `aria-label` or `aria-labelledby`. Global shortcuts are automatically
 suppressed while a modal is open, and `Escape` dismisses any dialog.
- **Print mode.** A high-contrast monochrome rendering of the map is
 available via the **🖨 Print** button (`Shift+P`) for users who need
 the highest possible contrast or want to print the map.

## Saving, Exporting & Importing

Your work is auto-saved constantly, which is great for peace of mind, but file export is where the project becomes portable. You can archive it, share it, print it, or move it between devices depending on what kind of session prep you're doing.

### Export

- **↓ JSON** - writes the full project (all levels, tiles, notes, tokens, stair links, grid size, theme, name, custom theme data, and other metadata) to a `.json` file. This is the only format that round-trips back into the editor.
- **↓ PNG** - saves a rasterized snapshot of the current canvas as a `.png` image. Great for sharing or printing, but it can't be re-imported.
- **↓ SVG** - saves a vector rendering of the map as an `.svg` file, with each tile and numbered note drawn as scalable shapes. Like PNG, this is for sharing/printing only - it can't be re-imported.
- **🖨 Print Export** (`Ctrl+Shift+P`) - opens a dialog for high-resolution, print-ready PNG output at 1 inch per tile. Options include:
 - **Resolution (DPI)** - choose the output DPI (300 DPI recommended).
 - **Page Size** - select a page preset to split large maps into printable page tiles.
 - **View Mode** - export as Edit (full map) or Present (fog hides content).
 - **Black & White** - toggle print mode for monochrome output.
 - The dialog shows the computed output dimensions and page count before exporting.

If **🖨 Print** mode is active, PNG/SVG exports use the high-contrast black-and-white renderer.

### Import

Import is intentionally straightforward: bring back a JSON export, replace the current project, and pick up where you left off. It's a clean round-trip rather than a catch-all importer, which keeps the format dependable.

- **Supported file type:** `.json` files produced by Dungeon Mapper's **↓ JSON** export. The file picker is restricted to `.json`, and the file is parsed as a `DungeonProject` (multi-level project with tiles, notes, theme, grid size, map name, stair links, etc.). Legacy single-map files are automatically upgraded to a one-level project on import.
- **Not supported:** PNG and SVG exports can't be imported - they're image-only renders, not editable map data. No third-party formats (Dungeondraft, Universal VTT, images, CSV, etc.) are accepted.
- **On error:** if the selected file isn't valid JSON, an alert is shown ("Failed to import map: Invalid JSON file") and your current map is left untouched.

Because importing replaces the current map, export your work first if you want to keep it.

## Mobile & Touch Support

Dungeon Mapper isn't a desktop app awkwardly squeezed onto a phone. The interface adapts across screen sizes so tablets and touch devices feel like first-class citizens, especially when you want the map open at the table instead of at a desk.

### Responsive layout

The layout shifts with the screen instead of pretending one arrangement fits everything. That keeps the important tools reachable whether you're on a big monitor, a tablet in portrait, or a phone you handed across the table.

- **Desktop** (>1024px) - full 3-column layout: left toolbar, center canvas, right panels.
- **Tablet landscape** (768–1024px) - 2-column grid with collapsible left toolbar (icon-only with slide-out detail), right panel as overlay drawer, icon-only header labels.
- **Tablet portrait / large phone** (480–768px) - single-column grid with bottom toolbar, canvas fills viewport, stacked header.
- **Phone** (<480px) - minimal header, nearly full-width drawers, compact controls.

### Touch gestures

Touch support is built around the gestures people already expect. Zooming, panning, and quick undo or redo actions are meant to feel natural, not like a desktop shortcut awkwardly translated to glass.

- **Pinch-to-zoom** - two-finger pinch to scale the canvas (0.25×–4×).
- **Two-finger pan** - drag with two fingers to pan the canvas.
- **Long-press pan** - long-press (400ms) starts pan mode, replacing right-click for touch devices.
- **Two-finger tap** - undo. **Three-finger tap** - redo.

### Mobile toolbar

On smaller screens, the toolbar changes shape so the app stays usable with thumbs. The essentials stay close, and the deeper tools are still there when you need them.

- **Bottom bar** - 5–6 primary tool buttons with 44×44px touch targets (Draw, Erase, Fill, Fog/Defog, Select, More).
- **"More" flyout** - slides up from the bottom with categorized tool grids (Drawing, Fog, Tactical, Tokens, Advanced).
- **Floating action button (FAB)** - 56px circular undo button; long-press reveals a vertical menu with Undo, Redo, Generate, and Switch Mode.
- **Tool options bar** - contextual controls above the bottom bar showing relevant settings for the active tool.

### Progressive Web App (PWA)

If you want Dungeon Mapper to behave more like an installed tool than a browser tab, the PWA support is there for that. Install it, keep it offline, and treat it like part of your regular session kit.

- **Install prompt** - browsers offer an "Add to Home Screen" or "Install" option for the app.
- **Offline support** - all assets are cached by a service worker (Workbox) for full offline use.
- **Standalone mode** - runs without browser chrome when installed, with proper safe-area handling for notched devices.

## Development & Testing

If you want to hack on the project, the workflow is refreshingly normal. Spin up Vite for development, run the build when you want the production check, and use the existing test suite when you're touching behavior.

```bash
npm install
npm run dev # development server
npm run build # production build (tsc + vite)
npm run preview # preview the production build
npm run lint # ESLint
npm test # run the full test suite (one-shot, CI-friendly)
npm run test:watch # run tests in watch mode during development
```

The project uses [Vitest](https://vitest.dev/) with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) and jsdom for unit and component testing. The coverage is broad enough that you can poke at rendering, generation logic, and state behavior without flying blind.

**Test structure:**

| Area | Location | What's tested |
|------|----------|---------------|
| Generator utilities | `src/utils/__tests__/common.test.ts` | `makeTypeGrid`, `outlineWalls`, `bfsDistances`, `collectCells`, `reorderNotesReadingOrder` |
| Seedable RNG | `src/utils/__tests__/random.test.ts` | `makeRng`, `seedFromString`, `parseSeed`, determinism |
| FOV engine | `src/utils/__tests__/fov.test.ts` | `isOpaque`, `computeFOV` edge cases (walls, radius, doors) |
| Stamp catalog | `src/utils/__tests__/stampCatalog.test.ts` | `getStampDef`, built-in stamp integrity, category labels |
| Map state | `src/hooks/__tests__/mapStateUtils.test.ts` | `createDefaultMap`, `createDefaultProject`, `withDefaults`, `nextIdAfter` |
| Components | `src/components/__tests__/dialogs.test.tsx` | Dialog render/close lifecycle (ShortcutsHelp, ExportDialog) |
| Paper texture | `src/utils/__tests__/paperTexture.test.ts` | `generatePaperTexture`, pattern rendering, caching, vignette |
| Edge blending | `src/utils/__tests__/edgeBlend.test.ts` | `drawEdgeBlending`, dither/smooth/stipple styles, intensity |
| Hand-drawn mode | `src/utils/__tests__/handDrawn.test.ts` | `drawHandDrawn`, sketchy/pencil/ink styles, wobble, print mode |
| Lighting & atmosphere | `src/utils/__tests__/lightingAtmosphere.test.ts` | `drawLightingAtmosphere`, AO, stamp shadows, color grading |
| Art style presets | `src/utils/__tests__/artStylePresets.test.ts` | `getPresetSettings`, preset descriptions, layer configurations |
| Room rasterizer | `src/utils/__tests__/roomRasterizer.test.ts` | `rasterizeRoomShapes`, rectangle rooms, door hints, clipping, overlaps |
| Dynamic fog | `src/utils/__tests__/dynamicFog.test.ts` | player FOV union, explored-grid merging |
| Light sources | `src/utils/__tests__/lightSources.test.ts` | light FOV union, wall/radius handling |
| Token visibility | `src/utils/__tests__/tokenVisibility.test.ts` | classic and dynamic fog visibility for multi-cell tokens |
| Canvas geometry | `src/utils/__tests__/canvasGeometry.test.ts` | line, rectangle, snapping, polyline hit-test helpers used by `MapCanvas` |
| Rivers | `src/utils/__tests__/riverRasterizer.test.ts`, `src/hooks/__tests__/mapStateRivers.test.ts`, `src/utils/__tests__/premadeMaps.test.ts` | river rasterization metadata, map state actions, generated/premade river vectors |
| Export/rendering | `src/utils/__tests__/exportRender.test.ts` | player-safe SVG exports, dynamic fog, render-map canvas sizing |
| UI behavior | `src/components/__tests__/uiBehavior.test.tsx` | Generate Hub, Command Palette, Navigation Rail, Selection Inspector, ExportDialog interactions |

Shared mock context providers live in `src/test/testHelpers.tsx` - use `TestProviders` to wrap components that depend on `ToolContext`, `MapContext`, `ViewContext`, or `ActionContext`.

## Contributing

Found a bug, built a cool improvement, or have a quality-of-life tweak that would make prep smoother? Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## Code of Conduct

Please be good to each other. This project follows [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## License

AGPL-3.0 © Alex Perrault
