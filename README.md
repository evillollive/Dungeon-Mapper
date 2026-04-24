# ⚔ Dungeon Mapper

A retro-styled, interactive grid-based dungeon map editor built with Vite + React + TypeScript.

## Features

- **Grid editor** — configurable map from 8×8 up to 128×128, default 32×32
- **Tile size** — selectable tile size (12, 16, 20, 24, 32 px), default 20 px
- **12 paintable tile types** — Floor, Wall, Door (H/V), Secret Door, Stairs Up/Down, Water, Pillar, Trap, Treasure, Start (use the Erase tool to clear a tile back to empty)
- **10 preset theme modes** — Castle, Dungeon, Starship, Alien World, Old West, Steampunk, Wilderness, Cyberpunk, Post-Apocalypse, Modern City (see [Preset Modes](#preset-modes) below)
- **Graph-paper canvas** — light parchment background with cyan grid lines, evoking traditional engineering / quad-ruled graph paper
- **Print mode** — toggle a high-contrast black-and-white renderer for printer-friendly output
- **Drawing tools** — Paint `P`, Erase `E`, Flood Fill `F`, Add Note `N`, Line `L`, Rectangle `R`, Select `S`
- **Zoom & pan** — `+` / `-` / `Reset` / `Fit` controls along the bottom of the map; right-click drag to pan; mouse-wheel zoom while holding `Shift` (or with Caps Lock on)
- **Undo / Redo** — up to 50 steps (`Ctrl+Z` / `Ctrl+Y` or `Ctrl+Shift+Z`)
- **Room notes** — numbered annotations placed on the map with labels and descriptions
- **Auto-save** — map state persisted to IndexedDB on every change (migrates legacy localStorage data automatically)
- **Export / Import** — JSON round-trip, PNG canvas export, and SVG vector export
- **Adjustable UI scale** — header **UI** dropdown rescales chrome text and controls (50%, 75%, 100%, 125%, 150%) and remembers your choice across sessions
- **Preserve-tiles toggle** — when enabled (toolbar **🎨 Preserve**), switching themes keeps already-painted tiles in their original style so you can mix terrain styles from multiple themes on a single map
- **Light parchment aesthetic** — warm off-white background, deep brick-red accents, and pixel-sharp canvas rendering for a graph-paper feel

## Preset Modes

Dungeon Mapper ships with two kinds of presets: **theme modes** that re-skin the entire tile palette to match a setting, and a **print mode** for monochrome output. Switch themes from the **🗺 Theme** dropdown in the left toolbar; toggle print mode with the **🖨 Print** button in the header.

### Theme modes

Each theme keeps the same underlying tile types but renames them and re-renders them with setting-appropriate glyphs and colors. Maps stay portable across themes — swapping themes restyles the whole map without losing any tile data. Enable the toolbar **🎨 Preserve** toggle if you want already-painted tiles to keep their original theme style when you switch themes (so you can blend, say, Wilderness terrain with a Dungeon crawl on a single map).

| Theme | Setting | Tile flavor (Floor / Wall / Door / Secret Door / Water / Pillar / Trap / Treasure / Start) |
| --- | --- | --- |
| **Dungeon** *(default)* | Subterranean crawl | Flagstone / Stone Wall / Iron Door / Secret Door / Underground Pool / Pillar / Trap / Treasure / Entrance |
| **Castle** | Aboveground stone keep | Stone Tile / Battlement / Oak Door / Hidden Passage / Moat / Column / Murder Hole / Royal Hoard / Great Hall |
| **Starship** | Deep-space vessel interiors | Deck / Bulkhead / Blast Door / Hidden Hatch / Coolant / Support / Laser Grid / Data Core / Airlock |
| **Alien World** | Otherworldly biological landscape | Spore Bed / Fungal Wall / Membrane / Hidden Burrow / Acid Pool / Crystal Spire / Spore Burst / Crystal Cluster / Landing Site |
| **Old West** | Frontier towns and saloons | Dirt / Plank Wall / Saloon Door / Hidden Passage / Water Trough / Post / Bear Trap / Gold / Entrance |
| **Steampunk** | Industrial gear-and-steam works | Iron Plate / Gear Wall / Valve Door / Concealed Hatch / Steam Pipe / Piston / Pressure Plate / Contraption / Engine |
| **Wilderness** | Outdoor overland maps | Grass / Trees / Gate / Hidden Path / River / Boulder / Snare / Cache / Camp |
| **Cyberpunk** | Neon-lit street grids | Street / Barrier / Shutter / Cloaked Panel / Acid Pool / Terminal / Turret / Chip Cache / Spawn |
| **Post-Apocalypse** | Ruined wastelands | Rubble / Ruins / Barricade / Hidden Stash / Toxic Pool / Rubble Pile / Landmine / Supplies / Shelter |
| **Modern City** | Contemporary urban streets | Sidewalk / Building / Doorway / Hidden Door / Fountain / Lamp Post / Manhole / ATM / Bus Stop |

### Print mode

Print mode swaps the colored theme renderer for a high-contrast black-on-parchment monochrome view. Tiles are drawn as bold pixel glyphs and the grid is darkened so exported PNG/SVG files (or a browser print) read clearly on a black-and-white printer. Toggle it on or off at any time without affecting your map data.

## Saving, Exporting & Importing

Your work is auto-saved to the browser's IndexedDB on every change, but the header buttons let you move maps in and out of Dungeon Mapper as files.

### Export

- **💾 Export JSON** — writes the full map (tiles, notes, grid size, theme, name, and other metadata) to a `.json` file. This is the only format that round-trips back into the editor.
- **🖼 Export PNG** — saves a rasterized snapshot of the current canvas as a `.png` image. Great for sharing or printing, but it cannot be re-imported.
- **🧾 Export SVG** — saves a vector rendering of the map as an `.svg` file, with each tile and numbered note drawn as scalable shapes. Like PNG, this is for sharing/printing only — it cannot be re-imported.

If **🖨 Print** mode is active, PNG/SVG exports use the high-contrast black-and-white renderer.

### Import

The **📂 Import** button in the header opens a file picker and loads a previously exported map back into the editor, replacing the current map.

- **Supported file type:** `.json` files produced by Dungeon Mapper's **Export JSON** action. The file picker is restricted to `.json`, and the file is parsed as a `DungeonMap` object (tiles, notes, theme, grid size, map name, etc.).
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
