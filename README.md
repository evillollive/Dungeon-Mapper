# ⚔ Dungeon Mapper

A retro-styled, interactive grid-based dungeon map editor built with Vite + React + TypeScript.

## Features

- **Grid editor** — 8×8 to 64×64 configurable map, default 32×32
- **12 tile types** — Empty, Floor, Wall, Door (H/V), Stairs Up/Down, Water, Pillar, Trap, Treasure, Start
- **Drawing tools** — Paint, Erase, Flood Fill, Eyedropper, Add Note (keyboard shortcuts: P/E/F/I/N)
- **Zoom & pan** — mouse wheel zoom, right-click drag to pan, +/− buttons
- **Room notes** — numbered annotations placed on the map with labels and descriptions
- **Auto-save** — map state persisted to localStorage on every change
- **Export/Import** — JSON round-trip and PNG canvas export
- **Retro aesthetic** — dark navy background, parchment text, pixel-sharp canvas rendering

## Development

```bash
npm install
npm run dev    # development server
npm run build  # production build
```

## License

MIT © Alex Perrault
