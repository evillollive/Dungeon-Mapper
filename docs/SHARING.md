# Sharing Guide

Dungeon Mapper is easiest to share as a browser-first TTRPG map editor: fast enough for a blank-grid sketch, deep enough for fog, tokens, procedural generation, exports, and print prep.

## Positioning

**Short description:** Browser-based TTRPG battle-map editor with procedural generation, fog of war, tokens, themes, exports, and offline PWA support.

**One-liner:** Make a playable battle map in the browser, then reveal it at the table with fog, tokens, light, and print-ready exports.

**Longer pitch:** Dungeon Mapper is a local-first React + TypeScript map editor for tabletop RPGs. It combines deterministic generators, grid painting, room/river/path vectors, themed art layers, Present view, fog-of-war, token tools, and JSON/PNG/SVG/print exports in one installable browser app.

## Best-fit audiences

| Audience | Angle |
| --- | --- |
| Game masters | "Prep a battle map quickly, then run it safely from Present view." |
| TTRPG creators | "Generate, theme, export, and remix maps without leaving the browser." |
| Front-end developers | "A compact canvas-heavy React app with generators, FOV, PWA, exports, and accessibility patterns." |
| Open-source contributors | "Plenty of approachable feature, UX, docs, generator, and rendering work." |

## Demo script ideas

### Two-minute hosted demo

1. Open the live demo.
2. Press `G`, choose **Rooms & Corridors**, set or randomize a seed, and generate a map.
3. Switch themes to show that structure and presentation are separated.
4. Toggle **Present**, place a player token and light source, then enable dynamic fog.
5. Export PNG/SVG, then mention JSON for editable backups.

### Five-minute deeper demo

1. Start from a sample in Generate Hub.
2. Use **Generate into selection** to replace one wing without disturbing the rest of the map.
3. Draw or edit a river vector and show rasterized water/flow behavior.
4. Add stamps, notes, and a scene template.
5. Toggle art presets and print mode.
6. Install the PWA or reload offline to show local-first behavior.

## Suggested repository metadata

**Description:** Browser-based TTRPG battle-map editor with procedural generation, fog of war, tokens, themes, exports, and offline PWA support.

**Homepage:** `https://evillollive.github.io/Dungeon-Mapper/`

**Topics:** `ttrpg`, `battlemap`, `dungeon-mapper`, `map-editor`, `procedural-generation`, `react`, `typescript`, `vite`, `pwa`, `tabletop-rpg`

## Sharing channels

| Channel | Suggested angle |
| --- | --- |
| GitHub social preview / README | Lead with the Generate Hub GIF and live demo link. |
| Mastodon / Bluesky / X | Short clip/GIF plus "browser-based, local-first, no account required." |
| Reddit TTRPG/mapmaking communities | Emphasize GM workflow, export formats, and offline use. Follow subreddit self-promo rules. |
| Hacker News / Show HN | Emphasize React canvas architecture, deterministic generators, PWA/offline, and local-first data. |
| Discords for TTRPG tools | Use the two-minute demo flow and invite feedback on table workflows. |
| Dev communities | Highlight canvas rendering, FOV/dynamic fog, generator tests, and export paths. |

## Launch copy

### Short social post

I built Dungeon Mapper, a browser-based TTRPG battle-map editor. It has seeded map generation, themes, fog of war, tokens, light/FOV, stamps, notes, JSON/PNG/SVG/print exports, and offline PWA support.

Try it: https://evillollive.github.io/Dungeon-Mapper/

### Show HN-style draft

Show HN: Dungeon Mapper - a local-first browser battle-map editor for TTRPGs

Dungeon Mapper is a React + TypeScript canvas app for making and running grid battle maps in the browser. You can paint maps by hand, generate rooms/terrain/caverns/villages from deterministic seeds, switch visual themes, add notes/stamps/tokens, reveal maps with fog of war, and export JSON, PNG, SVG, or high-DPI print images.

I built it as a local-first tool: it auto-saves in IndexedDB, has no account system, and can be installed as a PWA for offline use. The technical pieces I think are most interesting are the generator pipeline, editable room/river/path vectors, dynamic fog with token sight and light sources, and the export/rendering path.

Live demo: https://evillollive.github.io/Dungeon-Mapper/
Repo: https://github.com/evillollive/Dungeon-Mapper

I would love feedback from both GMs and front-end/canvas developers.

## Follow-up backlog for stronger sharing

- Record a polished 60-90 second demo video that starts from Generate Hub and ends in Present view.
- Add a real full-screen screenshot or social preview image; the current GIFs are useful but a static Open Graph image would share better.
- Add a small "sample map JSON" folder or release asset if the project wants reusable examples outside the app.
- Consider a GitHub Pages "What's new" section if the project starts doing regular releases.
- Add contribution-friendly issues for generator presets, export integrations, accessibility audits, and demo assets.
