# ⚔ Dungeon Mapper

A retro-styled, interactive grid-based dungeon map editor built with Vite + React + TypeScript.

> _Screenshots: drop captures of the editor into a `docs/screenshots/` folder and reference them here, e.g. `![Editor](docs/screenshots/editor.png)`. Suggested shots: the empty editor at default zoom, a painted map in the Dungeon theme, the same map switched to Wilderness, the Player View with fog-of-war partially revealed, and Print mode active._

## Features

- **Grid editor** — configurable map from 8×8 up to 128×128 (selectable widths/heights: 8, 16, 24, 32, 48, 64, 96, 128), default 32×32
- **Tile size** — selectable tile size (12, 16, 20, 24, 32 px), default 20 px
- **12 paintable tile types** — Floor, Wall, Door (H/V), Secret Door, Stairs Up/Down, Water, Pillar, Trap, Treasure, Start (use the Erase tool to clear a tile back to empty)
- **12 preset theme modes** — Castle, Dungeon, Starship, Alien World, Old West, Steampunk, Wilderness, Cyberpunk, Post-Apocalypse, Modern City, Pirate, Desert (see [Preset Modes](#preset-modes) below)
- **Graph-paper canvas** — light parchment background with cyan grid lines, evoking traditional engineering / quad-ruled graph paper
- **Print mode** — toggle a high-contrast black-and-white renderer for printer-friendly output
- **GM drawing tools** — Paint `P`, Erase `E`, Flood Fill `F`, Add Note `N`, Line `L`, Rectangle `R`, Select `S`
- **Procedural map generation** — toolbar **🎲 Generate** opens a dialog with three algorithms (Rooms & Corridors, Open Terrain, Cavern), a deterministic seed, a density slider, per-generator tile-mix sliders, optional theme room labels, and an opt-in **Generate into selection** mode that stamps a generated map into an active selection rectangle without disturbing the rest of the map (see [Map Generation](#map-generation) below)
- **Player view** — header **🛡 GM View / 👁 Player View** toggle swaps to a player-safe toolbar with a freehand drawing pen, an eraser, fog-of-war controls, and token tools (see [Player View](#player-view) below)
- **Fog of war** — per-cell hidden / revealed flags with a Defog brush, Reveal `V` / Hide `H` drag-rectangles, Reset Fog (re-cover the map), Clear Fog (reveal everything), and an optional GM **🌫 Show Fog** preview overlay
- **Tokens** — drop Player, NPC, and Monster tokens (small 1×1, medium 2×2, large 3×3) onto the map; Move Token to drag, Remove Token to delete
- **Initiative panel** — a turn-order list in the right-hand sidebar that mirrors placed tokens; the GM can drag entries to reorder, rename them inline, or clear the list (see [Initiative](#initiative) below)
- **Player annotations** — freehand pen with eight color swatches and Thin / Medium / Thick brush widths; per-stroke eraser and a Clear All button
- **Zoom & pan** — `+` / `-` / `Reset` / `Fit` controls along the bottom of the map; right-click drag to pan; mouse-wheel zoom while holding `Shift` (or with Caps Lock on)
- **Undo / Redo** — up to 50 steps (`Ctrl+Z` / `Ctrl+Y` or `Ctrl+Shift+Z`)
- **Room notes** — numbered annotations placed on the map with labels and descriptions; in Player View, notes that sit under fog are hidden from the side panel
- **Auto-save** — map state persisted to IndexedDB on every change (migrates legacy localStorage data automatically)
- **Export / Import** — JSON round-trip, PNG canvas export, and SVG vector export
- **Adjustable UI scale** — header **UI** dropdown rescales chrome text and controls (50%, 75%, 100%, 125%, 150%) and remembers your choice across sessions
- **Preserve-tiles toggle** — when enabled (toolbar **🎨 Preserve**), switching themes keeps already-painted tiles in their original style so you can mix terrain styles from multiple themes on a single map
- **Light parchment aesthetic** — warm off-white background, deep brick-red accents, and pixel-sharp canvas rendering for a graph-paper feel

## Preset Modes

Dungeon Mapper ships with two kinds of presets: **theme modes** that re-skin the entire tile palette to match a setting, and a **print mode** for monochrome output. Switch themes from the **🗺 Theme** dropdown in the left toolbar; toggle print mode with the **🖨 Print** button in the header.

### Theme modes

Each theme keeps the same underlying tile types but renames them and re-renders them with setting-appropriate glyphs and colors. Maps stay portable across themes — swapping themes restyles the whole map without losing any tile data. Enable the toolbar **🎨 Preserve** toggle if you want already-painted tiles to keep their original theme style when you switch themes (so you can blend, say, Wilderness terrain with a Dungeon crawl on a single map). The themes are listed alphabetically in the **🗺 Theme** dropdown.

| Theme | Setting | Tile flavor (Floor / Wall / Door / Secret Door / Water / Pillar / Trap / Treasure / Start) |
| --- | --- | --- |
| **Alien World** | Otherworldly biological landscape | Spore Bed / Fungal Wall / Membrane / Hidden Burrow / Acid Pool / Crystal Spire / Spore Burst / Crystal Cluster / Landing Site |
| **Castle** | Aboveground stone keep | Stone Tile / Battlement / Oak Door / Hidden Passage / Moat / Column / Murder Hole / Royal Hoard / Great Hall |
| **Cyberpunk** | Neon-lit street grids | Street / Barrier / Shutter / Cloaked Panel / Acid Pool / Terminal / Turret / Chip Cache / Spawn |
| **Desert** | Sun-baked sands and tombs | Sand / Sandstone / Tomb Door / Hidden Chamber / Oasis / Cactus / Quicksand / Relic / Caravan |
| **Dungeon** *(default)* | Subterranean crawl | Flagstone / Stone Wall / Iron Door / Secret Door / Underground Pool / Pillar / Trap / Treasure / Entrance |
| **Modern City** | Contemporary urban streets | Sidewalk / Building / Doorway / Hidden Door / Fountain / Lamp Post / Manhole / ATM / Bus Stop |
| **Old West** | Frontier towns and saloons | Dirt / Plank Wall / Saloon Door / Hidden Passage / Water Trough / Post / Bear Trap / Gold / Entrance |
| **Pirate** | Tall ships and hidden coves | Deck / Hull / Hatch / Smuggler Hatch / Bilge / Mast / Cannon / Booty / Anchor |
| **Post-Apocalypse** | Ruined wastelands | Rubble / Ruins / Barricade / Hidden Stash / Toxic Pool / Rubble Pile / Landmine / Supplies / Shelter |
| **Starship** | Deep-space vessel interiors | Deck / Bulkhead / Blast Door / Hidden Hatch / Coolant / Support / Laser Grid / Data Core / Airlock |
| **Steampunk** | Industrial gear-and-steam works | Iron Plate / Gear Wall / Valve Door / Concealed Hatch / Steam Pipe / Piston / Pressure Plate / Contraption / Engine |
| **Wilderness** | Outdoor overland maps | Grass / Trees / Gate / Hidden Path / River / Boulder / Snare / Cache / Camp |

### Print mode

Print mode swaps the colored theme renderer for a high-contrast black-on-parchment monochrome view. Tiles are drawn as bold pixel glyphs and the grid is darkened so exported PNG/SVG files (or a browser print) read clearly on a black-and-white printer. Toggle it on or off at any time without affecting your map data.

## Player View

The header **🛡 GM View / 👁 Player View** button swaps Dungeon Mapper between two toolbars that share the same map:

- **GM View** is the full editor: paint tiles, place notes, switch themes, etc.
- **Player View** is a player-safe surface for use at the table. The tile-paint palette is hidden so the map can't be accidentally redrawn, and a different toolbar is exposed: fog-of-war controls, a freehand pen for table annotations, and tokens.

Your view-mode preference is remembered across sessions.

### Fog of war

New maps start with fog enabled and every cell hidden so the Player View is safe to share with the table by default. You can toggle fog on or off per map from the Player toolbar's **🌫 Enabled** checkbox. While fog is enabled:

- **Defog** — freehand brush; drag across the map to wipe fog away cell-by-cell.
- **Reveal `V`** / **Hide `H`** — drag a rectangle of cells to expose or re-cover them.
- **Reset Fog** — re-fog the entire map (hide every cell).
- **Clear Fog** — reveal the entire map (clear all fog).

In Player View, fogged cells are covered by an opaque overlay and any room notes that sit under fog are omitted from the side panel so they don't leak hidden rooms. In GM View, the toolbar's **🌫 Show Fog** checkbox layers a translucent grey wash over the same cells so the GM can preview what's hidden from players without losing their own view of the map.

### Drawing pen

The Player toolbar exposes a freehand drawing tool for live table annotations:

- **Draw** / **Erase** — sketch over the map with the pen, or click an individual stroke to remove it.
- **Pen colors** — eight preset swatches (red, orange, yellow, green, blue, purple, near-black, white).
- **Brush widths** — Thin, Medium, and Thick.
- **Clear All** — remove every player-drawn stroke from the map at once.

### Tokens

Drop tokens onto cells to track participants and threats:

- **Player**, **NPC**, and **Monster** tokens. Monster tokens come in three footprints — Monster S (1×1), Monster M (2×2), and Monster L (3×3) — for varying creature sizes.
- **Move Token** — click and drag a token to relocate it.
- **Remove** — click a token to delete it.

Tokens, fog flags, and player annotations are all stored on the map and survive auto-save / JSON export.

### Initiative

A right-hand **Initiative** panel is shown in both GM and Player views. Tokens are appended to the list as they are placed on the map and removed automatically when their token is deleted. Click an entry to highlight the matching token on the map (a yellow ring is drawn around it); click the same entry again to clear the highlight.

In **GM View** the panel is fully editable:

- **Drag** an entry up or down to change the turn order.
- **✎ Rename** an entry inline so the displayed label can be something other than the token's auto-generated name.
- **Clear** wipes the initiative list (tokens themselves stay on the map).

In **Player View** the panel is read-only — no rename, reorder, or clear. When fog is enabled, tokens whose footprint sits entirely under fog are also omitted from the list so it doesn't leak the existence of hidden enemies.

The initiative order is persisted with the map (auto-save and JSON export).

## Map Generation

The toolbar **🎲 Generate** button (in the **THEME** section of the GM toolbar) opens a procedural map-generation dialog. Generated maps use the standard tile types only (Floor, Wall, Door, Secret Door, Stairs, Water, Pillar, Trap, Treasure, Start) so the result is rendered in whatever theme the map currently uses — switching the theme afterwards restyles the generated map without losing any tile data.

### Algorithms

The **Algorithm** dropdown selects the generator. Opening the dialog pre-selects an algorithm based on the current theme; you can change it at any time.

| Algorithm | What it produces | Default for themes |
| --- | --- | --- |
| **Rooms & Corridors** | Rectangular rooms connected by L-shaped corridors. Best for dungeons, castles, ships, and other built spaces. | Dungeon, Castle, Starship, Alien World, Steampunk, Cyberpunk, Modern City, Pirate, Old West |
| **Open Terrain** | Open ground scattered with obstacles, water, and standing stones. Best for outdoor / overland maps. | Wilderness, Desert, Post-Apocalypse |
| **Cavern** | Organic cave system carved out via cellular-automata smoothing, guaranteed to be a single connected region. | (No theme defaults to this — pick it manually for any theme.) |

### Dialog controls

- **Width / Height** — target map size in tiles. Clamped to 8–128 (the same range as the header **SIZE** dropdowns).
- **Generate into selection** — visible only when an active selection rectangle is present in the editor (use the Select tool `S` to make one) and is at least 6 × 6 tiles. When checked, Width / Height are taken from the selection and only cells inside the selection are overwritten — notes, tokens, fog, and tiles outside the selection are preserved. When unchecked (or no selection exists), generating replaces the entire map and clears notes and tokens.
- **Density** — global "how full should the map feel" multiplier (range: 0.1–1.5, default 1.0). Higher values pack in more rooms / obstacles / features; lower values produce sparser layouts.
- **Tile mix** *(collapsible section)* — per-generator sliders for fine-tuning what gets sprinkled in. Each generator exposes its own set, e.g. Rooms & Corridors offers Treasure share, Trap / Hazard share, and Door fraction; Open Terrain and Cavern have their own. The dialog remembers the values you set per algorithm as you flip between them, and a **Reset** button restores the active algorithm's theme defaults.
- **Label rooms with theme archetypes** — Rooms & Corridors only, and only when the active theme has a room-archetype palette (built spaces such as Castle "Great Hall", Starship "Bridge", Modern City rooms, etc.). When checked, generated rooms are auto-labeled with theme-appropriate names dropped into the side notes panel.
- **Seed** — text seed used to make generation deterministic; the same seed + algorithm + parameters always produces the same map. Accepts decimal digits, hex (with or without an `0x` prefix), or any free-form string (which is hashed). Use the **🎲** button next to the field to roll a new random seed; leaving the field blank also picks a fresh random seed at generate time.

### Confirmation and undo

- If the current map already contains painted tiles, generating a full map (i.e. with **Generate into selection** off) prompts for confirmation before replacing it. Notes and tokens are cleared by a full-map generation.
- A selection-scoped generation never asks for confirmation and never touches notes, tokens, or fog.
- Tile changes from any generation can be reverted with **Undo** (`Ctrl+Z`).

## Keyboard Shortcuts

Shortcuts fire whenever the focus is not in a text field:

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
| `Ctrl+Z` | Undo (up to 50 steps) |
| `Ctrl+Y` *or* `Ctrl+Shift+Z` | Redo |
| `Delete` *or* `Backspace` | Clear tiles inside the active selection |
| `Esc` | Clear the active selection (Select tool) or close the Generate dialog |
| `Shift` + mouse wheel | Zoom in / out (Caps Lock also enables wheel zoom without `Shift`) |
| Right-click drag | Pan the canvas |

## Saving, Exporting & Importing

Your work is auto-saved to the browser's IndexedDB on every change, but the header buttons let you move maps in and out of Dungeon Mapper as files.

### Export

- **↓ JSON** — writes the full map (tiles, notes, grid size, theme, name, and other metadata) to a `.json` file. This is the only format that round-trips back into the editor.
- **↓ PNG** — saves a rasterized snapshot of the current canvas as a `.png` image. Great for sharing or printing, but it cannot be re-imported.
- **↓ SVG** — saves a vector rendering of the map as an `.svg` file, with each tile and numbered note drawn as scalable shapes. Like PNG, this is for sharing/printing only — it cannot be re-imported.

If **🖨 Print** mode is active, PNG/SVG exports use the high-contrast black-and-white renderer.

### Import

The **↑ Import** button in the header opens a file picker and loads a previously exported map back into the editor, replacing the current map.

- **Supported file type:** `.json` files produced by Dungeon Mapper's **↓ JSON** export. The file picker is restricted to `.json`, and the file is parsed as a `DungeonMap` object (tiles, notes, theme, grid size, map name, etc.).
- **Not supported:** PNG and SVG exports cannot be imported — they are image-only renders, not editable map data. No third-party formats (Dungeondraft, Universal VTT, images, CSV, etc.) are accepted.
- **On error:** if the selected file isn't valid JSON, an alert is shown ("Failed to import map: Invalid JSON file") and your current map is left untouched.

Because importing replaces the current map, export your work first if you want to keep it.

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
