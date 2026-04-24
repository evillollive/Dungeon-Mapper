# ⚔ Dungeon Mapper

A retro-styled, interactive grid-based dungeon map editor built with Vite + React + TypeScript.

## Features

- **Grid editor** — configurable map from 8×8 up to 128×128, default 32×32
- **Tile size** — selectable tile size (12, 16, 20, 24, 32 px), default 20 px
- **12 tile types** — Empty, Floor, Wall, Door (H/V), Stairs Up/Down, Water, Pillar, Trap, Treasure, Start
- **7 preset theme modes** — Fantasy, Sci-Fi, Old West, Steampunk, Wilderness, Cyberpunk, Post-Apocalypse (see [Preset Modes](#preset-modes) below)
- **Print mode** — toggle a high-contrast black-and-white renderer for printer-friendly output
- **Drawing tools** — Paint `P`, Erase `E`, Flood Fill `F`, Eyedropper `I`, Add Note `N`, Line `L`, Rectangle `R`, Select `S`
- **Zoom & pan** — mouse wheel zoom, right-click drag to pan
- **Undo / Redo** — up to 50 steps (`Ctrl+Z` / `Ctrl+Y` or `Ctrl+Shift+Z`)
- **Room notes** — numbered annotations placed on the map with labels and descriptions
- **Auto-save** — map state persisted to IndexedDB on every change (migrates legacy localStorage data automatically)
- **Export / Import** — JSON round-trip, PNG canvas export, and SVG vector export
- **Retro aesthetic** — dark navy background, parchment text, pixel-sharp canvas rendering

## Preset Modes

Dungeon Mapper ships with two kinds of presets: **theme modes** that re-skin the entire tile palette to match a setting, and a **print mode** for monochrome output. Switch themes from the **THEME** dropdown in the header; toggle print mode with the **🖨 Print** button.

### Theme modes

Each theme keeps the same 12 underlying tile types but renames them and re-renders them with setting-appropriate glyphs and colors. Maps stay portable across themes — swapping themes restyles the whole map without losing any tile data.

| Theme | Setting | Tile flavor (Floor / Wall / Door / Water / Pillar / Trap / Treasure / Start) |
| --- | --- | --- |
| **Fantasy** *(default)* | Classic dungeon crawl | Floor / Wall / Door / Water / Pillar / Trap / Treasure / Start |
| **Sci-Fi** | Starship interiors | Deck / Bulkhead / Blast Door / Coolant / Support / Laser Grid / Data Core / Airlock |
| **Old West** | Frontier towns and saloons | Dirt / Plank Wall / Saloon Door / Water Trough / Post / Bear Trap / Gold / Entrance |
| **Steampunk** | Industrial gear-and-steam works | Iron Plate / Gear Wall / Valve Door / Steam Pipe / Piston / Pressure Plate / Contraption / Engine |
| **Wilderness** | Outdoor overland maps | Grass / Trees / Gate / River / Boulder / Snare / Cache / Camp |
| **Cyberpunk** | Neon-lit street grids | Street / Barrier / Shutter / Acid Pool / Terminal / Turret / Chip Cache / Spawn |
| **Post-Apocalypse** | Ruined wastelands | Rubble / Ruins / Barricade / Toxic Pool / Rubble Pile / Landmine / Supplies / Shelter |

### Print mode

Print mode swaps the colored theme renderer for a high-contrast black-on-parchment monochrome view. Tiles are drawn as bold pixel glyphs and the grid is darkened so exported PNG/SVG files (or a browser print) read clearly on a black-and-white printer. Toggle it on or off at any time without affecting your map data.

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
