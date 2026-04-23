# ⚔ Dungeon Mapper

A retro-styled, interactive grid-based dungeon map editor built with Vite + React + TypeScript.

## Features

- **Grid editor** — configurable map from 8×8 up to 128×128, default 32×32
- **Tile size** — selectable tile size (12, 16, 20, 24, 32 px), default 20 px
- **12 tile types** — Empty, Floor, Wall, Door (H/V), Stairs Up/Down, Water, Pillar, Trap, Treasure, Start
- **7 themes** — Fantasy, Sci-Fi, Old West, Steampunk, Wilderness, Cyberpunk, Post-Apocalypse
- **Drawing tools** — Paint `P`, Erase `E`, Flood Fill `F`, Eyedropper `I`, Add Note `N`, Line `L`, Rectangle `R`, Select `S`
- **Zoom & pan** — mouse wheel zoom, right-click drag to pan
- **Undo / Redo** — up to 50 steps (`Ctrl+Z` / `Ctrl+Y` or `Ctrl+Shift+Z`)
- **Room notes** — numbered annotations placed on the map with labels and descriptions
- **Auto-save** — map state persisted to IndexedDB on every change (migrates legacy localStorage data automatically)
- **Export / Import** — JSON round-trip, PNG canvas export, and SVG vector export
- **Retro aesthetic** — dark navy background, parchment text, pixel-sharp canvas rendering

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
