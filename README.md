# ⚔ Dungeon Mapper

A retro-styled, interactive grid-based dungeon map editor built with Vite + React + TypeScript. Installable as a Progressive Web App with full offline support and touch/tablet-friendly UI.

> _Screenshots: drop captures of the editor into a `docs/screenshots/` folder and reference them here, e.g. `![Editor](docs/screenshots/editor.png)`. Suggested shots: the empty editor at default zoom, a painted map in the Dungeon theme, the same map switched to Wilderness, the Present View with fog-of-war partially revealed, and Print mode active._

## Features

- **Grid editor** — configurable map from 8×8 up to 128×128 (selectable widths/heights: 8, 16, 24, 32, 48, 64, 96, 128), default 32×32
- **Tile size** — selectable tile size (12, 16, 20, 24, 32 px), default 20 px
- **20 paintable tile types** — Floor, Wall, Door (H/V), Secret Door, Locked Door (H/V), Trapped Door (H/V), Portcullis, Archway, Barricade, Stairs Up/Down, Water, Pillar, Trap, Treasure, Start, plus project-scoped custom tiles (use the Erase tool to clear a tile back to empty)
- **13 preset theme modes** — Castle, Dungeon, Starship, Alien World, Lost Civilization, Old West, Steampunk, Wilderness, Cyberpunk, Post-Apocalypse, Modern City, Pirate, Desert — each with unique per-theme art for floors, walls, doors, water, treasure, traps, and start tiles (see [Preset Modes](#preset-modes) below)
- **Custom themes** — project-scoped custom theme builder with editable tile colors, labels, grid color, and optional uploaded tile graphics (see [Custom Themes](#custom-themes) below)
- **Multi-level dungeons** — create multi-floor projects with level tabs, stair links between levels, per-level undo history, and double-click stair navigation (see [Multi-Level Dungeons](#multi-level-dungeons) below)
- **Sample maps** — 26 bundled sample projects (28 levels) across all 13 themes for onboarding and inspiration (see [Sample Maps](#sample-maps) below)
- **Themed canvas** — per-theme grid colors, deterministic tile color jitter, and wall depth/shadow effects for a rich, organic look; warm parchment background with pixel-sharp rendering
- **Print mode** — toggle a high-contrast black-and-white renderer for printer-friendly output, with cross-hatched walls and stipple-shaded water
- **Tabbed toolbar** — GM tools organized into three tabs (Draw, Tactical, Advanced) for progressive disclosure and reduced clutter
- **Drawing tools** — Paint `P`, Erase `E`, Flood Fill `F`, Add Note `N`, Line `L`, Rectangle `R`, Select `S`, Line-of-Sight / FOV `O`, Measure `M`, Light Source `I`, GM Draw `D`
- **GM drawing tools** — freehand GM-only annotations with dashed line rendering, hidden from Present view in canvas, PNG, and SVG exports (`D` shortcut)
- **Copy / Paste / Cut** — select a region with the Select tool, then `Ctrl+C` to copy, `Ctrl+X` to cut, `Ctrl+V` to paste tiles and notes at the selection origin with a live preview overlay
- **Procedural map generation** — toolbar **🎲 Generate** opens a dialog with four algorithms (Rooms & Corridors, Open Terrain, Cavern, Village), a deterministic seed, a density slider, per-generator tile-mix sliders, corridor strategy and shape controls, optional theme room labels with procedural names, and an opt-in **Generate into selection** mode that stamps a generated map into an active selection rectangle without disturbing the rest of the map (see [Map Generation](#map-generation) below)
- **Edit / Present views** — header **👁 Present** toggle swaps to a player-safe toolbar with a freehand drawing pen, an eraser, fog-of-war controls, and token tools (see [Present View](#present-view) below)
- **Fog of war** — per-cell hidden / revealed flags with a Defog brush, Reveal `V` / Hide `H` drag-rectangles, Reset Fog (re-cover the map), Clear Fog (reveal everything), an optional GM **🌫 Show Fog** preview overlay, fog edge feathering, and **Dynamic Fog** mode that auto-reveals cells visible from player tokens with 3-state rendering (hidden / explored / visible)
- **Tokens with icon library** — drop Player, NPC, and Monster tokens (small 1×1, medium 2×2, large 3×3) onto the map with a searchable icon picker (30+ icons in 6 categories); Move Token to drag, Remove Token to delete
- **Initiative panel** — a turn-order list in the right-hand sidebar that mirrors placed tokens; the GM can drag entries to reorder, rename them inline, or clear the list (see [Initiative](#initiative) below)
- **Shape / area markers** — place colored shape overlays (circle, square, diamond) on the map for marking spell areas, hazard zones, and tactical effects; 8 color options with adjustable radius (see [Markers](#markers) below)
- **Measure tool** — measure distances between cells in four shapes (ruler, circle, cone, line) with configurable feet-per-cell scale (default 5 ft); overlays are drawn in cyan with a distance readout pill (see [Measure](#measure) below)
- **Light sources** — place light sources on the map from preset profiles (torch, lantern, magical, custom) with adjustable radius and color; integrates with dynamic fog to illuminate cells within range (see [Light Sources](#light-sources) below)
- **Background image import** — import a PNG/JPG as a background layer behind the tile grid for tracing existing battlemaps; adjustable opacity, scale, and position (see [Background Image](#background-image) below)
- **Player annotations** — freehand pen with eight color swatches and Thin / Medium / Thick brush widths; per-stroke eraser and a Clear All button
- **Zoom & pan** — `+` / `-` / `Reset` / `Fit` controls along the bottom of the map; right-click drag (or long-press on touch) to pan; mouse-wheel zoom while holding `Shift` (or with Caps Lock on); pinch-to-zoom and two-finger pan on touch devices
- **Undo / Redo** — up to 50 steps per level (`Ctrl+Z` / `Ctrl+Y` or `Ctrl+Shift+Z`)
- **Room notes** — numbered annotations placed on the map with labels and descriptions; in Present view, notes that sit under fog are hidden from the side panel
- **Auto-save** — map state persisted to IndexedDB on every change (migrates legacy localStorage data automatically)
- **Line-of-Sight / FOV** — click any cell to visualize which cells are visible from that point, with walls blocking the view; click the same cell again to clear (`O` shortcut)
- **Export / Import** — JSON round-trip, PNG canvas export, SVG vector export, and a print-optimized high-DPI PNG export dialog with page tiling and optional scale bar
- **Adjustable UI scale** — header **UI** dropdown rescales chrome text and controls (50%, 75%, 100%, 125%, 150%) and remembers your choice across sessions
- **Preserve-tiles toggle** — when enabled (toolbar **🎨 Preserve**), switching themes keeps already-painted tiles in their original style so you can mix terrain styles from multiple themes on a single map
- **Mobile & tablet support** — responsive layout with 4 breakpoints, dedicated mobile bottom toolbar, touch gestures (pinch-to-zoom, two-finger pan, long-press pan), and gesture shortcuts (two-finger tap = undo, three-finger tap = redo)
- **Progressive Web App** — installable on desktop and mobile with full offline support via service worker caching

## Preset Modes

Dungeon Mapper ships with two kinds of presets: **theme modes** that re-skin the entire tile palette to match a setting, and a **print mode** for monochrome output. Switch themes from the **🗺 Theme** dropdown in the left toolbar; toggle print mode with the **🖨 Print** button in the header.

### Theme modes

Each theme keeps the same underlying tile types but renames them and re-renders them with setting-appropriate glyphs, colors, and procedural art. Every theme features unique floor textures (e.g., Dungeon flagstone mortar, Starship deck plating, Wilderness grass blades, Cyberpunk circuit traces), distinct wall rendering (Castle ashlar masonry, Cyberpunk holographic force-fields, Wilderness dense foliage), themed doors, and per-theme treasure, trap, start, and water art. Tiles have deterministic color jitter for subtle per-cell variation, and walls display theme-appropriate depth effects (shadows, glows, or hard edges). Grid lines use per-theme colors for immersion (e.g., warm amber for Castle, neon for Cyberpunk, earthy olive for Wilderness).

Maps stay portable across themes — swapping themes restyles the whole map without losing any tile data. Enable the toolbar **🎨 Preserve** toggle if you want already-painted tiles to keep their original theme style when you switch themes (so you can blend, say, Wilderness terrain with a Dungeon crawl on a single map). The themes are listed alphabetically in the **🗺 Theme** dropdown.

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

Print mode swaps the colored theme renderer for a high-contrast black-on-parchment monochrome view. Tiles are drawn as bold pixel glyphs, walls use cross-hatching, water uses stipple shading, and the grid is darkened so exported PNG/SVG files (or a browser print) read clearly on a black-and-white printer. Toggle it on or off at any time without affecting your map data.

## Custom Themes

The GM toolbar's theme section includes a **Custom Theme** builder for creating project-scoped custom themes:

- **Base theme** — custom themes inherit from one of the 13 built-in themes, getting its tile rendering and grid color as defaults.
- **Editable properties** — change the theme name, grid line color, and per-tile colors and labels for all built-in tile types.
- **Custom tile palette** — add user-defined tile entries with a label, semantic base behavior (floor, wall, door, etc.), color fallback, and optional uploaded PNG/JPEG/WebP graphic stored as a data URL.
- **Base behavior** — custom tiles inherit line-of-sight blocking, dynamic fog interaction, light visibility, and print-mode fallback from their assigned base behavior.
- **Persistence** — custom themes round-trip through JSON export/import and IndexedDB auto-save. They are project-scoped, so each project can have its own theme customizations.

## Multi-Level Dungeons

Dungeon Mapper supports multi-floor projects with level management and inter-level navigation:

- **Level tabs** — a tab bar below the header with controls to add, rename (double-click), duplicate, delete, and drag-to-reorder levels.
- **Per-level undo** — each level maintains its own 50-step undo/redo history.
- **Stair links** — use the Stair Link tool (`K`) to connect stairs-up and stairs-down tiles between levels. Click a stairs tile to set the source, switch levels, then click the destination stairs to create a link.
- **Link badges** — linked stairs show blue "L#" badges on the canvas indicating the destination level. Level tabs show a 🔗 badge with the link count.
- **Stair navigation** — double-click a linked stairs tile to jump to the destination level and auto-center the viewport on the arrival cell.
- **Link management** — the STAIR LINKS toolbar section provides the Link tool, a Clear Links button, and a link count display. Links auto-reindex when levels are deleted, duplicated, or reordered.
- **Keyboard shortcuts** — `PageUp` / `PageDown` to cycle between levels; `K` to activate the Stair Link tool.
- **Full round-trip** — multi-level projects export/import as JSON with all stair links preserved. IndexedDB auto-save handles legacy single-map migration automatically.

## Sample Maps

The header's **Samples** button opens a gallery of 26 bundled sample projects (28 playable levels) across all 13 themes. Sample maps showcase each theme's art, tile variety, and generator capabilities — including rooms-and-corridors dungeons, villages, caverns, and open-terrain maps. Two multi-level samples (ISS Constellation and Temple of the Forgotten Sun) demonstrate stair links between levels. Loaded samples are fully editable and treated as new projects.

## Present View

The header **👁 Present** button swaps Dungeon Mapper between two toolbars that share the same map:

- **Edit mode** is the full editor: paint tiles, place notes, switch themes, etc.
- **Present mode** is a player-safe surface for use at the table. The tile-paint palette is hidden so the map can't be accidentally redrawn, and a different toolbar is exposed: fog-of-war controls, a freehand pen for table annotations, and tokens.

Your view-mode preference is remembered across sessions.

### Fog of war

New maps start with fog enabled and every cell hidden so the Present view is safe to share with the table by default. You can toggle fog on or off per map from the Present toolbar's **🌫 Enabled** checkbox. While fog is enabled:

- **Defog** — freehand brush; drag across the map to wipe fog away cell-by-cell.
- **Reveal `V`** / **Hide `H`** — drag a rectangle of cells to expose or re-cover them.
- **Reset Fog** — re-fog the entire map (hide every cell).
- **Clear Fog** — reveal the entire map (clear all fog).
- **Dynamic** — toggle auto-reveal mode. When enabled, cells visible from any player token are automatically revealed using line-of-sight. The fog uses 3-state rendering: **hidden** (opaque, never seen), **explored** (dimmed, previously visible but no longer in line-of-sight), and **visible** (clear, currently in line-of-sight of a player token). The explored grid persists with the map.
- **Reset Explored** — (appears when Dynamic is enabled) clears all explored memory so previously seen cells return to fully fogged.

In Present view, fogged cells are covered by an opaque overlay (with soft gradient feathering at revealed/hidden boundaries) and any room notes that sit under fog are omitted from the side panel so they don't leak hidden rooms. In Edit mode, the toolbar's **🌫 Show Fog** checkbox layers a translucent grey wash over the same cells so the GM can preview what's hidden from players without losing their own view of the map.

### Drawing pen

The Present toolbar exposes a freehand drawing tool for live table annotations:

- **Draw** / **Erase** — sketch over the map with the pen, or click an individual stroke to remove it.
- **Pen colors** — eight preset swatches (red, orange, yellow, green, blue, purple, near-black, white).
- **Brush widths** — Thin, Medium, and Thick.
- **Clear All** — remove every player-drawn stroke from the map at once.

### Tokens

Drop tokens onto cells to track participants and threats:

- **Player**, **NPC**, and **Monster** tokens. Monster tokens come in three footprints — Monster S (1×1), Monster M (2×2), and Monster L (3×3) — for varying creature sizes.
- **Icon picker** — when placing a token, a searchable icon picker dialog opens with 30+ icons across 6 categories (Characters, Weapons, Magic, Creatures, Items, Environment). Choose an icon to display on the token, or cancel to use the default letter/emoji fallback.
- **Move Token** — click and drag a token to relocate it.
- **Remove** — click a token to delete it.

Tokens, fog flags, and player annotations are all stored on the map and survive auto-save / JSON export.

### Initiative

A right-hand **Initiative** panel is shown in both Edit and Present views. Tokens are appended to the list as they are placed on the map and removed automatically when their token is deleted. Click an entry to highlight the matching token on the map (a yellow ring is drawn around it); click the same entry again to clear the highlight.

In **Edit mode** the panel is fully editable:

- **Drag** an entry up or down to change the turn order.
- **✎ Rename** an entry inline so the displayed label can be something other than the token's auto-generated name.
- **Clear** wipes the initiative list (tokens themselves stay on the map).

In **Present mode** the panel is read-only — no rename, reorder, or clear. When fog is enabled, tokens whose footprint sits entirely under fog are also omitted from the list so it doesn't leak the existence of hidden enemies.

The initiative order is persisted with the map (auto-save and JSON export).

### Markers

The toolbar's **MARKERS** section (Tactical tab) provides shape overlay tools for marking spell areas, hazard zones, and other tactical effects on the map:

- **Place** — click on the map to drop a colored shape marker at the cursor position.
- **Remove** — click an existing marker to delete it.
- **Clear All** — remove every marker from the map.
- **Shape** — choose between Circle, Square, and Diamond shapes.
- **Color** — pick from 8 preset colors (red, orange, yellow, green, blue, purple, pink, dark grey).
- **Radius** — adjust the marker size from 1 to 10 tiles using the slider.

Markers are rendered with transparency so the underlying map remains visible. They appear above annotations but below tokens in the rendering order. A ghost preview follows the cursor when the Place tool is active. Markers are persisted with the map and included in PNG and SVG exports.

### Measure

The toolbar's **MEASURE** section (Tactical tab) provides on-canvas distance measurement:

- **Measure tool** (`M`) — click and drag on the map to measure the distance between two cells.
- **Shape** — choose between four measurement shapes:
  - **Ruler** — straight-line point-to-point distance.
  - **Circle** — radial area from the origin point.
  - **Cone** — conical projection from the origin.
  - **Line** — linear path from the origin.
- **Scale** — set the feet-per-cell value (default 5 ft, range 1–100) to match your game system's grid scale.

Measurements are drawn as cyan overlays with a pill-shaped distance readout. Distances use Chebyshev (king-move) distance, matching the D&D 5e diagonal movement convention. Measurements are ephemeral — they are not saved with the map.

### Light Sources

The toolbar's **LIGHT** section (Tactical tab) lets you place light sources on the map for illumination effects:

- **Place** (`I`) — click a cell to drop a light source at that position.
- **Remove** — click an existing light source to delete it.
- **Presets** — choose from four profiles: Torch (warm orange, 4-cell radius), Lantern (amber, 6-cell radius), Magical (violet, 8-cell radius), or Custom.
- **Radius** — adjust the light radius from 1 to 20 cells.
- **Color** — pick from 8 preset colors (torch orange, lantern amber, pale yellow, white, magical violet, arcane green, ice blue, infernal red).

Light sources emit a soft glow overlay on the canvas and integrate with dynamic fog of war — cells illuminated by a light source are treated as visible when computing fog visibility. Light sources are persisted with the map (auto-save and JSON export).

### Copy, Cut & Paste

The Select tool (`S`) supports clipboard operations on the selected region:

- **Copy** (`Ctrl+C`) — copies all tiles and notes within the selection rectangle to an internal clipboard.
- **Cut** (`Ctrl+X`) — copies the selection and then erases the original tiles.
- **Paste** (`Ctrl+V`) — stamps the clipboard contents onto the map at the selection's top-left corner (or the map origin if no selection is active). A translucent dashed preview outline follows the cursor while the clipboard has content.

Notes within the selection are remapped to fresh IDs on paste to avoid collisions. Per-tile theme overrides (from the "Preserve" toggle) are preserved through copy/paste.

### Background Image

The toolbar's **BACKGROUND** section (Advanced tab) lets you import an image to display behind the tile grid — useful for tracing existing battlemaps or using pre-made art as a backdrop:

- **Import** — opens a file picker for PNG, JPEG, or WebP images. The image is loaded as a data URL and stored with the map.
- **Remove** — clears the background image.
- **Opacity** — controls the image transparency (0%–100%) so the grid and tiles remain visible on top.
- **Scale** — resizes the image (10%–500%) relative to its natural size.
- **Offset X / Y** — repositions the image in tile units (–50 to +50) to align it with the grid.

The background image is hidden in Print mode. It is included in PNG exports (captured with the canvas) and SVG exports (embedded as a data URL). The image data is persisted with auto-save and JSON export/import.

## Map Generation

The toolbar **🎲 Generate** button (in the **THEME** section of the Draw tab) opens a procedural map-generation dialog. Generated maps use the standard tile types (Floor, Wall, Door, Secret Door, Locked Door, Trapped Door, Portcullis, Archway, Barricade, Stairs, Water, Pillar, Trap, Treasure, Start) so the result is rendered in whatever theme the map currently uses — switching the theme afterwards restyles the generated map without losing any tile data.

### Algorithms

The **Algorithm** dropdown selects the generator. Opening the dialog pre-selects an algorithm based on the current theme; you can change it at any time.

| Algorithm | What it produces | Default for themes |
| --- | --- | --- |
| **Rooms & Corridors** | Rectangular rooms connected by corridors with configurable routing strategy. Best for dungeons, castles, ships, and other built spaces. | Dungeon, Castle, Starship, Alien World, Steampunk, Cyberpunk, Modern City, Pirate, Old West, Lost Civilization |
| **Open Terrain** | Open ground scattered with obstacles, water, and standing stones. Best for outdoor / overland maps. | Wilderness, Desert, Post-Apocalypse |
| **Cavern** | Organic cave system carved out via cellular-automata smoothing, guaranteed to be a single connected region. | (No theme defaults to this — pick it manually for any theme.) |
| **Village** | A settlement with buildings, streets, and optional walls. Uses BSP partitioning for organic district layout. | (No theme defaults to this — pick it manually for any theme.) |

### Dialog controls

- **Width / Height** — target map size in tiles. Clamped to 8–128 (the same range as the header **SIZE** dropdowns).
- **Generate into selection** — visible only when an active selection rectangle is present in the editor (use the Select tool `S` to make one) and is at least 6 × 6 tiles. When checked, Width / Height are taken from the selection and only cells inside the selection are overwritten — notes, tokens, fog, and tiles outside the selection are preserved. When unchecked (or no selection exists), generating replaces the entire map and clears notes and tokens.
- **Density** — global "how full should the map feel" multiplier (range: 0.1–1.5, default 1.0). Higher values pack in more rooms / obstacles / features; lower values produce sparser layouts.
- **Corridor style** *(Rooms & Corridors only)* — selects the corridor routing strategy:
  - **Classic L-bends** — connect rooms in sequence with right-angled corridors (default).
  - **Spanning tree** — connect each room to its nearest neighbors via a minimum spanning tree.
  - **Looping passages** — spanning tree plus extra short edges to create cycles.
  - **Winding passages** — spanning tree with Z-shaped corridors.
- **Corridor bend** *(Rooms & Corridors only)* — a slider controlling how straight corridors are, from winding (0) to straight (1), with the legacy default at 0.5.
- **Dungeon shape** *(Rooms & Corridors only)* — constrains room placement to a non-rectangular mask. Eight shapes available: Rectangle (default), Circle, Diamond, Cross, L-Shape, T-Shape, Hexagon, Octagon.
- **Dead-end pruning** *(Rooms & Corridors only)* — slider (0–100%) that iteratively removes dead-end corridor tiles. At 0% (default) dead ends are kept; at 100% all dead-end stubs are removed.
- **Tile mix** *(collapsible section)* — per-generator sliders for fine-tuning what gets sprinkled in. Each generator exposes its own set, e.g. Rooms & Corridors offers Treasure share, Trap / Hazard share, and Door fraction; Open Terrain and Cavern have their own. The dialog remembers the values you set per algorithm as you flip between them, and a **Reset** button restores the active algorithm's theme defaults.
- **Label rooms with theme archetypes** — Rooms & Corridors only, and only when the active theme has a room-archetype palette (built spaces such as Castle "Great Hall", Starship "Bridge", Modern City rooms, etc.). When checked, generated rooms are auto-labeled with theme-appropriate names dropped into the side notes panel.
- **Add procedural names** — visible when room labels are enabled. Appends flavor-text suffixes (e.g. "Crypt of the Crimson Veil") to room labels using per-theme word tables.
- **Seed** — text seed used to make generation deterministic; the same seed + algorithm + parameters always produces the same map. Accepts decimal digits, hex (with or without an `0x` prefix), or any free-form string (which is hashed). Use the **🎲** button next to the field to roll a new random seed; leaving the field blank also picks a fresh random seed at generate time.

### Confirmation and undo

- If the current map already contains painted tiles, generating a full map (i.e. with **Generate into selection** off) prompts for confirmation before replacing it. Notes and tokens are cleared by a full-map generation.
- A selection-scoped generation never asks for confirmation and never touches notes, tokens, or fog.
- Tile changes from any generation can be reverted with **Undo** (`Ctrl+Z`).

## Keyboard Shortcuts

Shortcuts fire whenever the focus is not in a text field, drop-down, or
modal dialog. Press <kbd>?</kbd> at any time (or click **❓ Shortcuts**
in the header) to bring up the in-app reference, which is generated from
the same registry these shortcuts are defined in.

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
| `O` | Line-of-Sight / FOV tool — click a cell to see what is visible from it |
| `M` | Measure / Distance tool — click and drag to measure distances |
| `I` | Light Source tool — click a cell to place a light source (Illuminate) |
| `D` | GM Draw tool — freehand GM-only annotations (dashed lines, hidden from Present view) |
| `K` | Stair Link tool — click stairs to link between levels |

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
| `G` | Open the Generate Map dialog (Edit mode) |
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

> Some browsers reserve `Ctrl+N`, `Ctrl+O`, and `Ctrl+S` for their own
> "new window", "open file", and "save page" actions and will not deliver
> them to the page. The header buttons (**New**, **↑ Import**, **↓ JSON**)
> and the documented alternates (`Ctrl+Alt+N` for **New**) work as a
> fallback in those browsers.

## Accessibility

Dungeon Mapper is designed to be usable from the keyboard alone and to
expose enough semantic information for screen readers to navigate the
editor confidently:

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
- **Modal dialogs.** All dialogs (Export, Generate Map, Icon Picker,
  Shortcuts Help) use `role="dialog"` and `aria-modal="true"` with
  `aria-label` or `aria-labelledby`. Global shortcuts are automatically
  suppressed while a modal is open, and `Escape` dismisses any dialog.
- **Print mode.** A high-contrast monochrome rendering of the map is
  available via the **🖨 Print** button (`Shift+P`) for users who need
  the highest possible contrast or want to print the map.


## Saving, Exporting & Importing

Your work is auto-saved to the browser's IndexedDB on every change, but the header buttons let you move maps in and out of Dungeon Mapper as files.

### Export

- **↓ JSON** — writes the full project (all levels, tiles, notes, tokens, stair links, grid size, theme, name, custom theme data, and other metadata) to a `.json` file. This is the only format that round-trips back into the editor.
- **↓ PNG** — saves a rasterized snapshot of the current canvas as a `.png` image. Great for sharing or printing, but it cannot be re-imported.
- **↓ SVG** — saves a vector rendering of the map as an `.svg` file, with each tile and numbered note drawn as scalable shapes. Like PNG, this is for sharing/printing only — it cannot be re-imported.
- **🖨 Print Export** (`Ctrl+Shift+P`) — opens a dialog for high-resolution, print-ready PNG output at 1 inch per tile. Options include:
  - **Resolution (DPI)** — choose the output DPI (300 DPI recommended).
  - **Page Size** — select a page preset to split large maps into printable page tiles.
  - **View Mode** — export as Edit (full map) or Present (fog hides content).
  - **Black & White** — toggle print mode for monochrome output.
  - The dialog shows the computed output dimensions and page count before exporting.

If **🖨 Print** mode is active, PNG/SVG exports use the high-contrast black-and-white renderer.

### Import

The **↑ Import** button in the header opens a file picker and loads a previously exported map back into the editor, replacing the current map.

- **Supported file type:** `.json` files produced by Dungeon Mapper's **↓ JSON** export. The file picker is restricted to `.json`, and the file is parsed as a `DungeonProject` (multi-level project with tiles, notes, theme, grid size, map name, stair links, etc.). Legacy single-map files are automatically upgraded to a one-level project on import.
- **Not supported:** PNG and SVG exports cannot be imported — they are image-only renders, not editable map data. No third-party formats (Dungeondraft, Universal VTT, images, CSV, etc.) are accepted.
- **On error:** if the selected file isn't valid JSON, an alert is shown ("Failed to import map: Invalid JSON file") and your current map is left untouched.

Because importing replaces the current map, export your work first if you want to keep it.

## Mobile & Touch Support

Dungeon Mapper is fully usable on tablets and phones through progressive enhancement — a single responsive codebase adapts to all screen sizes:

### Responsive layout

Four CSS breakpoints adapt the UI:

- **Desktop** (>1024px) — full 3-column layout: left toolbar, center canvas, right panels.
- **Tablet landscape** (768–1024px) — 2-column grid with collapsible left toolbar (icon-only with slide-out detail), right panel as overlay drawer, icon-only header labels.
- **Tablet portrait / large phone** (480–768px) — single-column grid with bottom toolbar, canvas fills viewport, stacked header.
- **Phone** (<480px) — minimal header, nearly full-width drawers, compact controls.

### Touch gestures

All canvas interactions use the Pointer Events API, supporting mouse, touch, and stylus input:

- **Pinch-to-zoom** — two-finger pinch to scale the canvas (0.25×–4×).
- **Two-finger pan** — drag with two fingers to pan the canvas.
- **Long-press pan** — long-press (400ms) starts pan mode, replacing right-click for touch devices.
- **Two-finger tap** — undo. **Three-finger tap** — redo.

### Mobile toolbar

On screens ≤768px, a dedicated bottom toolbar replaces the desktop sidebar:

- **Bottom bar** — 5–6 primary tool buttons with 44×44px touch targets (Draw, Erase, Fill, Fog/Defog, Select, More).
- **"More" flyout** — slides up from the bottom with categorized tool grids (Drawing, Fog, Tactical, Tokens, Advanced).
- **Floating action button (FAB)** — 56px circular undo button; long-press reveals a vertical menu with Undo, Redo, Generate, and Switch Mode.
- **Tool options bar** — contextual controls above the bottom bar showing relevant settings for the active tool.

### Progressive Web App (PWA)

Dungeon Mapper can be installed as a standalone app on desktop and mobile devices:

- **Install prompt** — browsers offer an "Add to Home Screen" or "Install" option for the app.
- **Offline support** — all assets are cached by a service worker (Workbox) for full offline use.
- **Standalone mode** — runs without browser chrome when installed, with proper safe-area handling for notched devices.

## Development

```bash
npm install
npm run dev      # development server
npm run build    # production build (tsc + vite)
npm run preview  # preview the production build
npm run lint     # ESLint
```

## License

MIT © Alex Perrault
