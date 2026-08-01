# ⚔ Dungeon Mapper

**Make battle maps that look great fast, then keep polishing until they feel like your table.**

[![CI](https://github.com/evillollive/Dungeon-Mapper/actions/workflows/ci.yml/badge.svg)](https://github.com/evillollive/Dungeon-Mapper/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/evillollive/Dungeon-Mapper/actions/workflows/deploy.yml/badge.svg)](https://github.com/evillollive/Dungeon-Mapper/actions/workflows/deploy.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111827)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-offline_ready-5A0FC8)
![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)

Dungeon Mapper is a retro-styled, client-only grid map editor for tabletop RPG prep and play. Paint tiles, generate rooms or terrain from a seed, add notes/stamps/tokens, switch into a player-safe Present view with fog of war, and export JSON, PNG, SVG, or print-ready images from the browser.

**Try it now:** [evillollive.github.io/Dungeon-Mapper](https://evillollive.github.io/Dungeon-Mapper/)

![Generate Hub demo](./docs/media/generate-hub.gif)

## Who it's for

| Audience | What Dungeon Mapper helps with |
| --- | --- |
| Game masters | Prep battle maps, reveal them safely at the table, and keep notes/tokens nearby. |
| Solo designers | Rapidly explore room layouts, terrain, rivers, villages, and theme variants. |
| TTRPG hackers | Study a compact React + TypeScript canvas app with procedural generation, FOV, fog, export, PWA, and accessibility work. |

## Why it's interesting

- **Fast first draft, deep polish later.** Start from a blank grid, a sample project, or one of four deterministic generators, then keep refining with stamps, vectors, notes, themes, art layers, and exports.
- **Built for live-table use.** Present view hides editing controls, supports player annotations, and pairs fog-of-war with tokens, light sources, and line-of-sight.
- **Themeable without losing structure.** The same map data can become a dungeon, castle, starship, cyberpunk street, wilderness trail, pirate ship, desert site, and more.
- **Local-first and portable.** The app auto-saves in IndexedDB, works offline as a PWA, and round-trips editable projects through JSON.

## Quick start

Use the hosted app if you just want to make a map:

1. Open the [live demo](https://evillollive.github.io/Dungeon-Mapper/).
2. Press `G` to open **Generate Hub**, pick a generator or sample, and create a starting map.
3. Toggle **Present** to test fog, tokens, light, and player-safe exports.
4. Export JSON when you want an editable backup; export PNG/SVG/print images when you want to share or print.

Run it locally when you want to hack on the project:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Feature highlights

| Area | Highlights |
| --- | --- |
| Map editing | 8×8 to 128×128 grids, 20 built-in tile types, custom themes/tiles, undo/redo, copy/cut/paste, background-image tracing, multi-level stair links. |
| Generation | Rooms & Corridors, Open Terrain, Cavern, and Village generators with deterministic seeds, density controls, tile mixes, room labels, rivers, and generate-into-selection workflows. |
| Table tools | Edit/Present split, fog-of-war, dynamic token sight, light sources, FOV preview, tokens, initiative, markers, measurement shapes, and player annotations. |
| Art and themes | 13 preset themes, print mode, paper textures, edge blending, hand-drawn rendering, lighting/atmosphere presets, stamps, wall/path/river vectors, and scene templates. |
| Portability | IndexedDB auto-save, JSON import/export, PNG/SVG export, high-DPI print export, installable PWA, and offline service-worker caching. |

## Visual tour

| Generate maps | Draw rivers | Shape rooms |
| --- | --- | --- |
| ![Generate Hub demo](./docs/media/generate-hub.gif) | ![River tool demo](./docs/media/river-tool.gif) | ![Room shapes demo](./docs/media/room-shapes.gif) |

## Documentation map

The README is intentionally a landing page. The detailed reference material is preserved in focused docs:

| Need | Start here |
| --- | --- |
| Full feature tour and tool reference | [Feature Reference](./docs/FEATURES.md) |
| Project architecture | [Architecture](./docs/ARCHITECTURE.md) |
| Setup, scripts, and test structure | [Development Guide](./docs/DEVELOPMENT.md) |
| Roadmap and competitive analysis | [Roadmap](./docs/ROADMAP.md) |
| Sharing and launch copy | [Sharing Guide](./docs/SHARING.md) |
| Release notes | [Changelog](./CHANGELOG.md) |
| Contribution expectations | [Contributing](./CONTRIBUTING.md) |

## Commands

```bash
npm install       # install dependencies
npm run dev       # start Vite dev server
npm run build     # type-check and build production assets
npm run preview   # preview the production build
npm run lint      # run ESLint
npm test          # run the Vitest suite once
npm run test:watch
```

The project targets Node.js 20+ and npm 10+. CI runs install, lint, build, and tests on pushes and pull requests to `main`; the Pages workflow builds and deploys `dist` from `main`.

## Format notes and caveats

- JSON is the editable project format and includes levels, tiles, notes, tokens, stair links, themes, fog, stamps, vectors, and metadata.
- PNG, SVG, and print exports are share/print formats, not import formats.
- The app is browser-based and client-only; there is no account system or hosted project sync.
- Custom uploaded graphics are stored with the project export, so keep file-size limits in mind for portable maps.

## Contributing

Found a bug, built a cool improvement, or have a quality-of-life tweak that would make prep smoother? Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## License

AGPL-3.0 © Alex Perrault
