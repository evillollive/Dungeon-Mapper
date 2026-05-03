# Dungeon-Mapper Competitive Analysis & Feature Roadmap

> **Last updated:** 2026-05-03
> **Status:** Phases 1, 2, 3, 4.1, 4.2, 4.3, 4.5.1, 4.5.2, 4.5.3, 5.1, 5.2, 5.3, 6.4.1, 6.4.2, 6.4.3, 6.4.4, 6.4.6, 6.6, 7.1, 7.3, & 7.5 complete. Accessibility fixes (partial, excluding dark mode) complete. Phase 6 (UI/UX Overhaul, Accessibility, Refactoring, Mobile, New Features) analysis complete. Phase 6.4 broken into 6 sub-phases (6.4.1–6.4.6). Phases 7–12 roadmap approved and integrated (2026-05-03).

---

## Part 1: Current Feature Inventory

Dungeon-Mapper is a React + TypeScript + Vite single-page app with Canvas-based rendering. It currently offers:

- Square grid maps (8×8 to 128×128 tiles, **20 built-in tile types** plus project-scoped custom tiles)
- 4 procedural generators: Rooms & Corridors, Open Terrain, Cavern, **Village** (all seeded/deterministic)
- **8 dungeon shape masks** (rectangle, circle, diamond, cross, L-shape, T-shape, hexagon, octagon)
- **Corridor style control** with continuity slider (0%–100%) across 4 pluggable strategies
- **Dead-end removal** with configurable fraction slider
- **Richer door generation** with probabilistic type distribution (archway, locked, trapped, portcullis, barricade)
- **Procedural name generation** (theme-aware, 13 themes)
- 13 visual themes (Dungeon, Castle, Wilderness, Starship, etc.) with **per-theme grid colors**, **tile color jitter**, and **wall depth effects**
- Fog of War with per-cell reveal/hide, GM preview, and **Dynamic Fog** (3-state: hidden/explored/visible, auto-reveal from player tokens)
- **Line-of-Sight / FOV** (recursive shadowcasting from any cell, wall occlusion, GM tool [O])
- **Light Sources** (torch/lantern/magical presets with configurable radius and glow color, FOV-limited illumination interacts with dynamic fog, [I] shortcut)
- Tokens & Initiative Tracking (player/NPC/monster with multi-cell footprints, **icon library with 30+ SVG icons**)
- Notes & Annotations (room/poi kinds, theme-aware auto-labeling, **procedural name suffixes**)
- **Shape/Area Markers** (circle, square, diamond with colors and sizes)
- **Measurement & Distance Tools** (ruler, circle/cone/line templates, configurable ft/cell scale)
- **Copy/Paste & Selection Operations** (Ctrl+C/V/X with preview overlay)
- **Image Import / Background Layer** (PNG/JPG behind the grid)
- Dual GM/Player views (Shift+V toggle)
- Player drawing tools (freehand pen with colors and widths)
- **GM drawing/annotation tools** (freehand pen with dashed rendering, hidden from player view, [D] shortcut)
- Export: JSON (round-trip), PNG, SVG (GM and Player variants)
- **Print-Optimized Export** (72/150/300 DPI, page tiling for Letter & A4)
- **Multi-Level Dungeons** (level tabs with add/rename/duplicate/reorder, stair links between levels with navigation, per-level undo history)
- Undo/Redo (50-step history, per-level in multi-level projects)
- IndexedDB auto-save with legacy localStorage migration
- 30+ keyboard shortcuts with discoverable help overlay
- Zoom/Pan with minimap
- UI scaling (50%–150%)

---

## Part 2: Competitor Feature Analysis

### Azgaar's Fantasy Map Generator (MIT License)

Repo: Azgaar/Fantasy-Map-Generator | Stack: TypeScript + D3.js + Vite

| Feature | Description | We Have It? |
|---|---|---|
| Voronoi/Delaunay world tessellation | Grid-free organic region generation | ❌ |
| Heightmap generation & editing | Interactive terrain sculpting tools | ❌ |
| River generation with erosion | Discharge-based natural waterways | ❌ |
| Biome/climate simulation | Temperature, precipitation → biome assignment | ❌ |
| Political boundaries & states | Procedural nations with territories | ❌ |
| Culture & religion generation | Cultural spread and naming systems | ❌ |
| Settlement/burg generation | Population-aware city placement | ✅ (village generator) |
| Procedural name generation | Culture-based naming for all entities | ✅ |
| Route/road generation | Trade routes via pathfinding | ❌ |
| SVG multi-layer rendering | 15+ toggleable map layers | ❌ |
| Emblem/heraldry generation | State/city coat of arms | ❌ |
| Polygon label placement (polylabel) | Optimal text positioning in regions | ❌ |
| Seeded RNG | Reproducible generation | ✅ |

### Mipui (MIT License)

Repo: amishne/mipui | Stack: Pure JavaScript + Firebase

| Feature | Description | We Have It? |
|---|---|---|
| Real-time collaboration | Multi-user editing via Firebase sync | ❌ |
| No-registration sharing | Share map via URL, instant access | ❌ |
| 8-layer rendering system | Floors, walls, images, separators, text, shapes, elevation, GM overlay | Partial (fog only) |
| Vision/FOV (shadowcasting) | Line-of-sight calculation from any cell | ✅ |
| GM overlay layer | Hidden content visible only to GM | ✅ (fog + GM annotations) |
| 1000+ game icons (game-icons.net) | Searchable icon library for tokens | ✅ (30+ icons) |
| Angled/oval wall drawing | Non-rectangular wall shapes | ❌ |
| Separator types | Doors, windows, bars, fences, curtains, archways | ✅ |
| Shape overlays | Colored squares/circles/diamonds for marking | ✅ |
| Elevation/stairs visualization | Multi-level passage indicators | ✅ |
| Copy/paste regions | Selection-based content duplication | ✅ |
| Image import tool | Import existing battlemaps | ✅ |
| Multi-resolution export | 32px, 64px, 192px, 300 DPI battlemap | ✅ |
| Sparse grid storage | Only populated cells stored (infinite grid potential) | ❌ |
| Tile caching (DOM→PNG) | Performance optimization for large maps | ❌ |
| Operation-based sync | Conflict-free operation ordering | ❌ |
| Forking/remixing maps | Create derivatives of shared maps | ❌ |
| Public sample/community maps | Browse and load pre-made maps | ❌ |

### HexTML (No License Specified)

Repo: playest/hextml | Stack: JavaScript + HTML5 Canvas

| Feature | Description | We Have It? |
|---|---|---|
| Hexagonal grid | Pointy-top and flat-top hex support | ❌ (not planned) |
| Custom tile uploads | User-provided tile graphics | ❌ |
| Secret/private notes | GM-only vs player-visible annotations | ✅ (via fog) |
| Submap/layer system | Multi-level map organization | ✅ (multi-level project) |
| Hex coordinate numbering | Standard hex grid addressing | ❌ (not planned) |

### Donjon (CC BY-NC 3.0 — Non-Commercial Only ⚠️)

Repos: atomicstack/donjon_dungeon_generator, mikemol/donjonrp | Stack: Perl + JavaScript

| Feature | Description | We Have It? |
|---|---|---|
| Bitfield cell encoding | 32-bit flags for walls/rooms/doors/traps/etc. | ❌ (string-based) |
| Multiple dungeon shapes | Box, Cross, Dagger, Saltire, Keep, Hexagon, Round | ✅ (8 shapes) |
| Corridor style control | Labyrinth (0%), Bent (50%), Straight (90%) | ✅ (continuity slider) |
| Dead-end removal | Configurable dead-end pruning (0%/50%/100%) | ✅ |
| Packed vs scattered room layout | Two room placement strategies | ❌ (one strategy) |
| Door type distribution | Arch, locked, trapped, secret, portcullis | ✅ |
| Hex grid overlay | Hexagonal grid on generated maps | ❌ (not planned) |
| Adaptive door count | sqrt-based door allocation per room size | ✅ |

### Watabou TownGeneratorOS (GPL v3)

Repo: watabou/TownGeneratorOS | Stack: Haxe + OpenFL

| Feature | Description | We Have It? |
|---|---|---|
| Voronoi + Lloyd relaxation | Even, organic district generation | ❌ |
| BSP building subdivision | Recursive room splitting with chaos control | ✅ (village generator) |
| A* corridor pathfinding | Optimal corridor routing between areas | Partial (BSP-sibling streets) |
| Ward/district types (13+) | Market, Cathedral, Castle, Military, Slum, etc. | ✅ (13 theme palettes) |
| City wall & fortification generation | Defensive perimeters with gates/towers | ✅ (village walls + gates) |
| Polygon geometry library | Shrink, buffer, cut, intersection ops | ❌ |
| Junction optimization | Automatic vertex merging and smoothing | ❌ |

### Dave's Mapper (GPL v3)

Repo: davmillar/DavesMapper | Stack: PHP + jQuery

| Feature | Description | We Have It? |
|---|---|---|
| Geomorphic tile assembly | Seamless edge-matching tile composition | ❌ |
| Community artist tile contributions | Multi-artist tile library system | ❌ |
| Multiple map view modes | Open-edge, closed-edge, staggered, cube, side-view | ❌ |
| Compact map serialization (base36) | Efficient encoding for sharing | ❌ |
| Grid overlay options | 5ft/10ft square or hex grid | Partial (square + measure) |

---

## Part 3: Fork/Integration Feasibility Analysis

| Competitor | License | Language Match? | Architecture Match? | Can Fork? | Verdict |
|---|---|---|---|---|---|
| Azgaar | MIT | Partial (TS, but D3+SVG) | ❌ (SVG vs Canvas) | Legally ✅ | No direct fork. Study algorithms, reimplement. |
| Mipui | MIT | Partial (JS, no React) | ❌ (DOM vs Canvas) | Legally ✅ | No direct fork. Can freely adapt algorithms (shadowcasting, sync patterns). |
| HexTML | None specified | JS | ❌ | Legally ❌ | Cannot fork. No license = all rights reserved. |
| Donjon | CC BY-NC 3.0 | Partial (JS portion) | Partial | Legally ❌ (commercial) | Cannot fork for commercial use. Study algorithms only. |
| Watabou | GPL v3 | ❌ (Haxe) | ❌ (OpenFL) | Legally risky ⚠️ | Should not fork. GPL copyleft. Study algorithms, reimplement cleanly. |
| Dave's Mapper | GPL v3 | ❌ (PHP) | ❌ (server-side) | Legally risky ⚠️ | Should not fork. Study tile assembly concept only. |

**Summary:** No direct forking recommended. MIT repos (Azgaar, Mipui) are architecturally incompatible but algorithms can be studied freely. GPL v3 repos would force our codebase to become GPL v3. CC BY-NC prohibits commercial use. No license means no code reuse.

---

## Part 3b-ii: Competitor Sample & Template Map Analysis

Most successful dungeon mapping tools offer some form of pre-made or sample maps. This analysis informs Phase 5.2.

| Competitor | Sample/Template Maps? | Details |
|---|---|---|
| **Inkarnate** | ✅ Yes (236K+ maps) | Massive community map library; Pro users get curated templates; any map can be cloned and edited instantly |
| **DungeonFog** | ✅ Yes (community library) | Community HUB for browsing shared maps; claim and customize others' maps; 3K+ assets for customization |
| **Mipui** | ✅ Yes (public maps) | Public community maps browsable and editable; no registration needed to view |
| **DungeonForge** | ✅ Yes (community gallery) | Featured/hot/new maps with search and tags; free to download and customize |
| **Worldographer** | ✅ Yes (auto-generated) | Auto-generates world/city/dungeon maps as starting points; fully customizable |
| **Tabletop Arc** | ✅ Yes (AI-generated) | AI creates complete dungeon adventures (layout + encounters + lore); editable SVG |
| **Mystic Waffle** | ✅ Yes (instant generation) | Instant editable map generation; copyright-free for commercial use |
| **Donjon** | ❌ Random only | Generates random maps on each visit; no saved gallery or browsable samples |
| **Dungeondraft** | ❌ No built-in samples | No bundled maps; relies on community sharing via external sites |
| **Dave's Mapper** | Partial (tile remix) | Generates maps from community-contributed art tiles; no curated sample dungeons |
| **HexTML** | ❌ No | No sample maps |

**Key Findings:**
1. **Sample/template maps are a standard feature** among the most popular tools — Inkarnate, DungeonFog, and Mipui all treat them as core onboarding
2. **Community-driven libraries** (Inkarnate's 236K+) are the gold standard but require backend infrastructure we don't have
3. **Bundled sample maps** (our planned approach) are the right client-only alternative — they serve as both onboarding and feature showcase
4. **2 maps per theme** is a reasonable minimum; competitors with curated libraries typically offer 10–50+ per category
5. **Editability is expected** — every competitor that offers samples allows full editing after loading

---

## Part 3b: Competitor Art & Visual Style Analysis

Our 13 themes currently share a uniform rendering approach: flat solid-color fills, thin geometric shapes, and a single hardcoded grid color (`#2d3561`) across all themes. This analysis identifies art techniques used by competitors to inform a visual upgrade.

### Current Art Architecture

Each theme implements `TileTheme.drawTile()` with Canvas 2D calls — `fillRect`, `arc`, `lineTo`, etc. No textures, gradients, patterns, or images are used. This is a strength (instant theme switching, perfect DPI scaling, no external assets) but also a limitation:

- **Floor/wall tiles are visually identical** within a theme — no per-tile variation
- **Doors, stairs, traps, treasure, start** look nearly the same across all 13 themes (colored bar, step pattern, X mark, rectangle, arrow)
- **Grid stroke is the same dark blue** (`#2d3561`) in every theme, undermining immersion
- **No depth effects** — walls and floors occupy the same visual plane
- **Water rendering is identical** across themes (same wave lines, different base color)

### Competitor Art Techniques

| Competitor | Art Style | Key Techniques | Applicable to Us? |
|---|---|---|---|
| **Azgaar** | Rich SVG cartography | D3-powered contour lines, relief icon sprites via Poisson-disc sampling, terracing via color darkening, multiple color schemes, layered rendering | ✅ Study color palettes, terracing/depth, and layered rendering |
| **Watabou** | Clean vector cartography | Flat colors with crisp outlines, minimal textures, diagrammatic building shapes, SVG output, limited but purposeful palette | ✅ Key inspiration — organic/soft look with clean lines |
| **Mipui** | Ultra-minimal | Bold black wall-edge lines, flat white cells, monochrome icons, neutral palette | Already surpass this; wall-edge rendering is an interesting contrast |
| **Donjon** | Classic B&W line-art | Solid fills, bold outlines, room numbers, TSR/AD&D aesthetic | Already more detailed than Donjon |
| **Dave's Mapper** | Multi-artist hand-drawn PNGs | Pre-rendered tile images, edge-matching, community tile contributions | Different approach (image tiles); relevant to Phase 5.2 custom tiles |
| **HexTML** | Hex-focused | Custom tile image uploads | Hex-focused; not directly applicable |

### Key Findings

1. **Azgaar and Watabou achieve a softer, more organic look** through subtle color gradients, outline-only rendering, and purposeful palette choices — not through complex textures or pre-made images
2. **Canvas 2D has unused rendering features** that can achieve similar effects: `createPattern()`, `createLinearGradient()`/`createRadialGradient()`, `shadowBlur`/`shadowColor`, and `globalCompositeOperation` for glow/blend
3. **Deterministic per-tile variation** via `hash(x, y)` can break visual monotony without per-cell state — subtly varying color, pattern rotation, or detail placement
4. **Theme identity is strongest in floor, wall, and water** (the most-visible tiles) — the remaining tile types (doors, traps, treasure, etc.) are where themes look most alike
5. **Grid color should match the theme palette** — warm amber for Castle, neon for Cyberpunk, earthy olive for Wilderness, etc.
6. **Print mode must remain a B&W fallback** for all art upgrades — every new visual effect needs a clean monochrome equivalent

---

## Part 4: Feature Implementation Roadmap

### ~~Phase 1: Core Editor Enhancements~~ ✅ COMPLETE

All 5 items shipped:
- ✅ 1.1 — Copy/Paste & Selection Operations
- ✅ 1.2 — Richer Separator/Door Types (locked, trapped, portcullis, archway, barricade)
- ✅ 1.3 — Shape/Area Markers
- ✅ 1.4 — Icon/Token Library (30+ SVG icons with search and categories)
- ✅ 1.5 — Image Import / Background Layer

### ~~Phase 2: Generation Engine Upgrades~~ ✅ COMPLETE

All shipped items:
- ✅ 2.1 — Non-Rectangular Dungeon Shapes (8 shape masks)
- ✅ 2.2 — Corridor Style Control (continuity slider, 4 strategies)
- ✅ 2.3 — Dead-End Management (configurable removal fraction)
- ✅ 2.4 — Richer Door Generation (probabilistic type distribution)
- ✅ 2.6 — Procedural Name Generation (theme-aware, 13 themes)

### ~~Phase 3: Town/Settlement Generator~~ ✅ COMPLETE

*Formerly Phase 2.5 — promoted to standalone phase given its scope and distinct algorithmic requirements.*

A 4th generator type that is a unique differentiator — no competitor in our space does both dungeon editing AND town generation.

- ✅ **3.1 — Town/Settlement Generator**
  - BSP partitioning for district/ward layout with recursive splitting
  - Building footprints carved inside BSP leaves with randomised insets
  - Street network connecting sibling BSP nodes via L-shaped corridors
  - Per-theme ward palettes (13 themes) mapping to district archetypes (Market, Temple, Barracks, etc.)
  - Optional walls/fortifications with gates on each side
  - Tile-mix sliders: town walls toggle, building size, treasure, traps
  - POI placement (start at gate, treasure, traps) with theme-aware labels
  - Full integration with POI/Notes engine for auto-labeled district notes

### ~~Phase 4.1: Line-of-Sight / FOV~~ ✅ COMPLETE

- ✅ **4.1 — Line-of-Sight / Field-of-View**
  - Recursive shadowcasting algorithm (`src/utils/fov.ts`) for FOV from any cell
  - 8-octant sweep with wall occlusion (walls, secret doors, pillars block sight)
  - GM "Sight" tool (👁) in toolbar with keyboard shortcut [O]
  - Click to set sight origin → darkened overlay on non-visible cells
  - Click same cell to clear; switching tools auto-hides overlay
  - Yellow origin marker for clear visual anchor
  - Works alongside fog overlay (FOV stacks on top)

### ~~Phase 4.2: Dynamic Fog of War~~ ✅ COMPLETE

- ✅ **4.2 — Dynamic Fog of War**
  - Union FOV computed from all player tokens via recursive shadowcasting
  - 3-state fog: hidden (opaque) → explored (dimmed) → visible (clear)
  - Explored cells persist across token movement (persisted in map data)
  - Manual fog tools (reveal/hide/defog) coexist with dynamic mode
  - Toggle in Player toolbar with "Reset Explored" to clear exploration memory
  - Notes, tokens, and initiative panel respect dynamic fog visibility
  - Export renderer supports 3-state fog for print/PNG output

### ~~Phase 4: Vision & Lighting System (continued)~~ Phase 4 complete ✅

Advanced tactical features for live play.

- ✅ **4.3 — Light Sources**
  - `LightSource` data type persisted on `DungeonMap.lightSources[]`
  - 4 presets: Torch (radius 4, orange), Lantern (radius 6, amber), Magical (radius 8, violet), Custom
  - Configurable illumination radius (1–20 cells) and glow color (8 swatches)
  - FOV-limited illumination: walls block light propagation via recursive shadowcasting (same algorithm as player/GM FOV)
  - Warm radial-gradient glow overlay rendered on canvas in all view modes
  - When Dynamic Fog is enabled: lit cells treated as "visible" (clear, no fog) just like player-token FOV — illuminated areas visible even without direct player line-of-sight
  - Explored grid updated for lit cells — removing a light source leaves previously lit area as "explored" (dimmed) rather than snapping back to hidden
  - Place tool with [I] shortcut; Remove tool; Clear All button — all in GM toolbar LIGHT section
  - Light source ghost preview (glow + dashed radius circle) follows cursor while tool is active

### Phase 4.5: Art & Visual Polish

Upgrade procedural tile rendering across all 13 themes simultaneously for stronger per-theme identity, richer visual detail, and a softer/more organic aesthetic inspired by Watabou and Azgaar. No new tile types — better-looking versions of existing ones. All upgrades must degrade cleanly to the existing B&W print mode.

**~~4.5.1 — Foundation: Grid Colors, Tile Jitter, Wall Depth~~** ✅ COMPLETE
- ✅ Per-theme grid line color via new `TileTheme.gridColor` field (replaces hardcoded `#2d3561` in all 13 themes and the global grid pass in MapCanvas + renderMap)
- ✅ Deterministic per-tile color jitter using `tileHash(x, y)` in `src/themes/artUtils.ts` — floors and walls subtly vary ±6–8% in lightness so no two tiles are pixel-identical
- ✅ Wall shadow/depth effect via `drawWallDepth()` — three styles: `shadow` (Dungeon, Castle, Wilderness, Post-Apocalypse, Pirate, Desert, Ancient), `glow` (Cyberpunk, Starship, Alien), `hard-edge` (Modern City, Old West, Steampunk)
- ✅ Shared art utilities in `src/themes/artUtils.ts`: `tileHash()`, `jitterColor()`, `drawWallDepth()`
- Performance: hash jitter and grid colors are essentially free; shadow effects are lightweight Canvas 2D fills/strokes

**~~4.5.2 — Theme Personality: Floors, Walls, Doors~~** ✅ COMPLETE
- ✅ Theme-specific floor textures via Canvas patterns or procedural micro-detail:
  - Dungeon: stone flagstone mortar lines (3 mortar seams: 2 horizontal + 1 vertical offset by hash)
  - Castle: full checkerboard hall tiles with cross seams (replaces subtle hint)
  - Starship: deck plating seams with corner rivet dots + center panel mark
  - Wilderness: hash-seeded grass blade strokes (5–6 angled blades per tile)
  - Pirate: horizontal plank lines with wood knots + grain line
  - Cyberpunk: circuit-board traces (3 neon right-angle paths + solder pad)
  - Desert: stippled sand dots (8–10 per tile in 2 alternating shades)
  - Alien: bioluminescent spore dots with glow halos + organic vein curve
  - Modern City: concrete aggregate speckles; Old West: boot-print dashes; Post-Apocalypse: crack lines; Steampunk: corner rivet dots; Ancient: mortar grid with carved chevron
- ✅ Theme-specific wall rendering — distinct material per theme:
  - Dungeon: rough stone blocks with 2 horizontal + 1 vertical mortar seam
  - Castle: ashlar masonry with horizontal mortar + row-offset vertical seams + crenel notch
  - Starship: riveted bulkhead panels (4 corner rivets + center seam)
  - Cyberpunk: holographic force-field shimmer (3 scan-lines in alternating alpha)
  - Modern City: windowed building facade with entry mark
  - Post-Apocalypse: cracked concrete with rebar line + diagonal crack
  - Wilderness: dense foliage cluster with leaf highlights
  - Old West: plank wall with nail dots; Steampunk: gear wall with inner hub + spokes; Pirate: hull planking with nail heads; Desert: sandstone bricks with erosion cracks; Ancient: carved relief blocks with mortar + diamond detail
- ✅ Theme-specific door rendering — distinct door per theme:
  - Castle: iron-banded oak plank with hinges + plank seam lines
  - Starship: sliding blast door with chevron hazard stripes
  - Cyberpunk: glitching holographic barrier with glitch lines + pixel dot
  - Wilderness: wooden gate with crossbar + nail pegs
  - Pirate: trapdoor hatch with ring pull + hinge marks
  - Dungeon: iron-bound timber with band stripes + rivet; Alien: organic membrane with vein lines; Desert: tomb door with hieroglyph diamond accents; Modern City: glass door with push-bars; Old West: saloon door with louver slats; Steampunk: valve door with pressure gauge; Post-Apocalypse: barricade door with scrap metal bands + bolt; Ancient: stone slab with carved chevron marks
- All rendering deterministic via `tileHash()` — no Math.random()
- No changes to print mode — all art upgrades are screen-mode only
- Performance: lightweight Canvas 2D calls only (thin lines, small dots/circles)

**~~4.5.3 — Iconic Tiles: Treasure, Traps, Start, Water~~** ✅ COMPLETE
- ✅ Per-theme treasure/trap/start icons — all 13 themes upgraded with unique thematic art:
  - Treasure: Dungeon → chest with lock + coins, Castle → crowned chest, Starship → hexagonal data core, Alien → crystal cluster, Cyberpunk → data chip with pins, Wilderness → buried cache mound, Old West → gold nuggets, Steampunk → clockwork gears, Modern City → bank safe, Post-Apocalypse → supply crate, Pirate → skull chest, Desert → ankh relic, Ancient → sarcophagus
  - Trap: Dungeon → pressure plate with spikes, Castle → murder hole with arrow slits, Starship → laser grid with glow, Alien → spore burst, Cyberpunk → electric arc, Wilderness → bear trap jaws, Old West → bear trap, Steampunk → gear pressure plate, Modern City → manhole cover, Post-Apocalypse → landmine, Pirate → cannon with fuse, Desert → quicksand spiral, Ancient → cursed glyph pentagram
  - Start: Dungeon → stone archway, Castle → royal banner, Starship → airlock hatch with status lights, Alien → landing beacon, Cyberpunk → neon portal, Wilderness → campfire with stone ring, Old West → saloon doors, Steampunk → boiler engine, Modern City → bus stop sign, Post-Apocalypse → shelter entrance, Pirate → anchor with rope, Desert → caravan tent, Ancient → obelisk with inscriptions
- ✅ Theme-specific water/liquid rendering — all 13 themes upgraded:
  - Dungeon → dark ripple pools with torchlight reflections, Castle → moat with lily pads, Starship → coolant with bubbles and pipe, Alien → acid with organic swirls, Cyberpunk → toxic neon with shimmer, Wilderness → river with current arrows, Old West → water trough, Steampunk → steam pipe with valve, Modern City → fountain with spray, Post-Apocalypse → toxic pool with radiation dots, Pirate → bilge with deck planks, Desert → oasis with palm silhouette, Ancient → reflecting pool with lotus
- ✅ Fog edge feathering — soft gradient at revealed/hidden boundaries (always on, both MapCanvas and exports)
- ✅ Print mode art pass — cross-hatching for walls and stipple shading for water in B&W mode

### Phase 5: Multi-Level Dungeons & Customization

Features that extend dungeon mapping depth and personalization.

**~~5.1 — Multi-Level Dungeon Support~~** ✅ COMPLETE *(formerly 6.2)*
- ✅ `DungeonProject` wraps ordered array of `DungeonMap` levels with `activeLevelIndex` and `stairLinks[]`
- ✅ Level tab bar UI with add, rename (double-click), duplicate, delete, and drag-to-reorder
- ✅ Per-level undo/redo history (50-step, isolated per level)
- ✅ Stair link tool ([K] shortcut) — click stairs tile to set source, switch levels, click destination stairs to create link
- ✅ Stair link badges rendered on canvas — blue "L#" badge on linked stairs tiles showing destination level
- ✅ Pending stair link source highlighted with dashed orange border
- ✅ Double-click linked stairs to navigate to destination level (auto-centers viewport on destination cell)
- ✅ Level tabs show 🔗 badge with link count for levels that have stair connections
- ✅ Stair links auto-reindex on level delete, duplicate, and reorder
- ✅ STAIR LINKS toolbar section with Link tool, Clear Links button, and link count display
- ✅ PageUp/PageDown keyboard shortcuts to cycle between levels
- ✅ Full JSON round-trip — multi-level project export/import with stair links preserved
- ✅ IndexedDB autosave with legacy bare-map migration via `wrapMapAsProject()`

**~~5.2 — Sample & Default Maps~~** ✅ COMPLETE
- ✅ Bundled collection of 26 sample projects / 28 playable levels across 13 themes
- ✅ Maps showcase each theme's art, tile variety, and generator capabilities (rooms-and-corridors, village, cavern, open-terrain)
- ✅ "Sample Maps" gallery accessible from the header — browse by theme, review details, and load into editor
- ✅ Loaded sample maps are fully editable (treated as a new project)
- ✅ Maps range from small encounters to medium dungeon, settlement, cavern, and terrain maps
- ✅ Multi-level sample projects showcase stair links between levels (ISS Constellation and Temple of the Forgotten Sun)
- ✅ No backend required — maps are bundled in the application source/build
- ✅ Serves as onboarding for new users who want to explore features without starting from scratch or using random generation

**~~5.3 — Custom Tile/Theme Creation~~** ✅ COMPLETE *(formerly 5.2, originally 7.2)*
- ✅ Project-scoped custom theme builder accessible from the GM Theme toolbar
- ✅ Custom themes inherit a built-in base theme, with editable theme name, grid color, built-in tile colors, and built-in tile labels
- ✅ User-defined custom tile palette entries with label, semantic base behavior, color fallback, and optional uploaded PNG/JPEG/WebP graphics stored as data URLs
- ✅ Custom tiles render in the toolbar palette, map canvas, minimap, SVG export color fallback, and high-DPI/print export fallback
- ✅ Custom tile base behavior feeds line-of-sight, dynamic fog, light visibility, and print-mode fallback semantics
- ✅ Custom themes and custom tile definitions round-trip through project JSON export/import and IndexedDB autosave

**5.4 — Premade Map Design Review** *(new — recurring sweep)*

*Premade maps were authored organically alongside generator/theme work; some no longer read as the archetype they're named after (castle, ship, cavern, settlement, etc.). This phase introduces a structured audit pass that repeats whenever a new content tool ships.*

- **Pass 1 — archetype audit (initial):**
  - Walk each of the 26 bundled sample projects in `src/utils/premadeMaps.ts` and compare its layout against its intended design (castle, boat, dungeon, cavern, terrain, settlement, temple, etc.)
  - Per-map polish: tighten room shapes, relocate/replace stamps and tokens, sharpen flavor notes, fix walkability issues that no longer match the archetype
  - **Background fill audit:** every premade must have its empty cells filled with the theme `background` tile so maps don't render as floating geometry — matches the default behavior of the Generate dialog (opt-out, not opt-in)
  - Tag each premade with its intended archetype in `PremadeMapSpec` so the gallery can group/filter by archetype, not just theme
- **Pass 2 — after Phase 11 (Rivers) ships:** re-review every premade and add rivers/streams where the archetype calls for them — castle moat, wilderness river, pirate harbor/docks, swamp cavern stream, etc. Uses the same checklist as Pass 1
- **Pass 3 — after each future content/art tool ships** (Phase 6.4.5 per-theme stamps, Phase 9 art presets, Phase 10 dynamic rooms, etc.): quick re-sweep to fold new stamps, presets, or shape features into existing premades where they improve showcase value
- Outcome: bundled samples stay aligned with the app's current capabilities and serve as both onboarding and a feature showcase

### Completed Quality-of-Life Phases

**~~7.1 — Print-Optimized Export~~** ✅ COMPLETE
- ✅ Multi-DPI export (72, 150, 300 DPI) at 1 inch per tile cell
- ✅ Grid-aligned rendering for VTT import
- ✅ Page-size presets (US Letter, A4) with automatic page tiling for large maps
- ✅ Export dialog with view mode (GM/Player) and print mode toggles
- ✅ Keyboard shortcut (Ctrl+Shift+P) and header button

**~~7.3 — Measurement & Distance Tools~~** ✅ COMPLETE
- ✅ Ruler/measurement tool showing distance in grid squares and feet (Chebyshev/D&D distance)
- ✅ Circle, cone, and line measurement templates for spell areas
- ✅ Configurable scale (feet per cell, default 5 ft)
- ✅ Scale bar on exported maps (PNG print export)
- ✅ Keyboard shortcut [M] for measure tool

**~~7.5 — GM Drawing / Annotation Tools~~** ✅ COMPLETE
- ✅ GM freehand drawing tool (`gmdraw` ToolType) in the GM toolbar with [D] keyboard shortcut
- ✅ GM erase tool (`gmerase` ToolType) to click-remove individual GM strokes
- ✅ GM annotations use `kind: 'gm'` on `AnnotationStroke` — hidden from player view (canvas, PNG export, SVG export)
- ✅ GM strokes rendered with dashed line pattern to visually distinguish from player drawings
- ✅ Independent color palette (8 swatches) and brush width controls (Thin/Medium/Thick) separate from player pen settings
- ✅ Clear All button to remove all GM drawings from the map
- ✅ Dashed pattern renders consistently in live canvas, PNG export (`renderMap.ts`), and SVG export (`export.ts`)

**~~6.1 — Touch & Pointer Event Foundation~~** ✅ COMPLETE
- ✅ All mouse events in MapCanvas replaced with Pointer Events API (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerLeave`, `onPointerCancel`)
- ✅ `getTileCoords` and `getFractionalCoords` accept generic `{clientX, clientY}` for unified mouse/touch/pen input
- ✅ `touch-action: none` CSS on canvas prevents browser scroll/zoom interference
- ✅ Pinch-to-zoom gesture: two-finger distance tracking scales zoom between 0.25×–4×
- ✅ Two-finger pan gesture: midpoint delta tracking for smooth touch panning
- ✅ Long-press (400ms) on touch starts pan mode, replacing right-click for touch devices
- ✅ Pointer capture (`setPointerCapture`/`releasePointerCapture`) for reliable drag tracking
- ✅ `onPointerCancel` handling commits in-progress strokes on interrupted gestures
- ✅ `onWheel` retained for mouse scroll panning (Shift+wheel)

**~~6.2 — Responsive Layout Overhaul~~** ✅ COMPLETE
- ✅ Desktop (>1024px): full 3-column layout unchanged, panel toggles hidden
- ✅ Tablet landscape (768–1024px): 2-column grid, collapsible left toolbar, right panel as overlay drawer, header labels hidden, toolbar tab labels icon-only
- ✅ Tablet portrait / large phone (480–768px): single-column grid, toolbar as bottom sheet, stacked header layout, reduced header buttons
- ✅ Phone (<480px): minimal header (center controls hidden), nearly full-width right drawer, compact zoom controls, smaller level tabs
- ✅ Toolbar collapse/expand toggle with `▶`/`◀` indicators
- ✅ Right panel slide-in drawer with smooth CSS transition, toggle button at canvas edge
- ✅ All breakpoints use progressive enhancement — no separate mobile codebase

### Far Future

Items that may be revisited someday but are not on the active roadmap. Most require backend infrastructure or a fundamentally different scope (world-scale mapping).

**Collaboration & Sharing** *(requires backend)*
- Shareable Map Links — cloud storage, shareable URLs, no-registration viewing
- Real-Time Collaboration — multi-user editing via operation-based sync
- Map Forking & Templates — fork shared maps, template library, community gallery

**World Building & Advanced Rendering** *(different product scope)*
- Multi-Layer System — replace single tile grid with a layer stack (floor, walls, objects, GM overlay); mainly needed as a prerequisite for world-scale mapping
- World/Region Map Generator — Voronoi-based terrain, heightmap, biomes, rivers, political boundaries, settlements (inspired by Azgaar)
- SVG/Vector Rendering — optional SVG mode for infinite zoom quality; mainly needed for world-scale maps

**Specialized Features**
- Geomorphic Tile Assembly — assemble pre-drawn tile art with edge-matching constraints (inspired by Dave's Mapper)
- Map Search & Organization — tags, folders, categories for organizing saved maps (depends on cloud storage)

**Visual & Accessibility** *(deferred)*
- Dark Mode — requires converting 336+ hardcoded color values to CSS custom properties; deferred indefinitely
- River ↔ FOV / Lighting Interaction — water reflects torchlight, blocks/slows movement, etc.; deferred until rivers (Phase 11) are stable

### Phase 7: Test Infrastructure

*Foundation for all subsequent feature work. A test suite built before Phase 10 (dynamic rooms) — the most complex change in the roadmap — pays for itself immediately.*

**7.A — Test Runner Setup**
- Vitest + React Testing Library + jsdom environment
- `npm test` script in package.json, CI-friendly config
- `vitest.config.ts` and `src/test/setup.ts` boilerplate

**7.B — Initial Test Coverage for High-Risk Pure Modules**
- `useMapState` reducers (add/remove/update tiles, stamps, notes, undo/redo)
- Generator utilities (`common.ts` outlineWalls, fillFloor, BFS; `doorEngine.ts` applyDoors)
- FOV engine (`fov.ts` computeFOV edge cases)
- Stamp catalog (`stampCatalog.ts` getStampDef, category filtering)

**7.C — Component Smoke Tests**
- MapCanvas mounts without crashing (with mocked canvas context)
- Toolbar tab switching renders correct sub-panels
- Dialog open/close lifecycle (GenerateMapDialog, ExportDialog, etc.)

📘 **README checkpoint #1:** Add "Development & Testing" section with `npm test` instructions.

### Phase 8: UI Redesign

*Modernise the interface to match proven competitor patterns (Dungeondraft-style: left icon rail → contextual panel → docked right inspector). Existing 4-tab toolbar preserved as a fallback density mode.*

**8.1 — Navigation Rail**
- 8.1.1 — Left icon-rail component (vertical strip of mode icons: Draw, Tactical, Generate, Advanced — same groupings as today)
- 8.1.2 — Contextual sub-panel that swaps based on selected rail mode (replaces center area of current toolbar)
- 8.1.3 — Layout density toggle in Settings: **"Rail (new)" / "Tabs (classic)"** — old 4-tab toolbar preserved as fallback
- 8.1.4 — Mobile: rail collapses to existing bottom toolbar (no change to MobileToolbar)

**8.2 — Docked Inspector**
- 8.2.1 — New `<SelectionInspector>` component, docked to right panel, shows properties of currently selected stamp / token / note / light
- 8.2.2 — Migrate stamp transform controls out of StampPicker into the inspector
- 8.2.3 — Inspector empty-state shows quick map info (dimensions, tile counts, theme)

**8.3 — UI Polish**
- 8.3.1 — Command palette (Ctrl/Cmd+K) — fuzzy search for tools, themes, dialogs, recent maps
- 8.3.2 — Persistent zoom + cursor-coordinate HUD overlaid bottom-right of canvas
- 8.3.3 — Header simplification: collapse Export / Print / Samples / Help into one overflow menu

**8.4 — Generate Hub (dedicated window)**

*Today the Generate and Samples buttons live inside the Draw tab (`DrawToolsTab.tsx`), which buries map-creation flows inside an unrelated tool category and gives users no preview of what they're getting. Competitors (Dungeondraft, DungeonFog, Worldographer) expose generation and template browsing as a dedicated surface. This sub-phase pulls those flows out into their own window/tab.*

- 8.4.1 — New **Generate Hub** surface (full-size dialog or dockable window) that combines procedural generation and the premade map gallery in one place — left side picks generator type or premade archetype, right side previews the result with all parameters
- 8.4.2 — All `GenerateMapDialog` controls move into the hub, including the **"Fill empty space with background tile"** toggle — which remains **on by default** so generated maps never read as floating geometry; user must explicitly opt out
- 8.4.3 — All `PremadeMapsDialog` browsing moves into the hub, with archetype filtering surfaced from Phase 5.4's tagging
- 8.4.4 — Reachable from the navigation rail (8.1) as its own icon, from the header File menu, and via the existing [G] shortcut
- 8.4.5 — Remove the `🎲 Generate` and `📦 Samples` buttons from `DrawToolsTab` once the hub ships; Draw tab returns to drawing tools only

📘 **README checkpoint #2:** Screenshots/GIFs of new UI layout *(includes the Generate Hub)*.

### Phase 9: Art System v2

*Visual quality leap: parchment textures, edge blending, hand-drawn mode, atmosphere, and per-map art style presets. All upgrades honor print-mode B&W contract.*

**9.1 — Texture & Paper Layer**
- Parchment / paper background layer with per-theme tinting
- Optional grain noise + vignette
- **Export toggle** on PNG/SVG export so users can include or exclude the paper texture

**9.2 — Edge Blending**
- Stochastic edge dithering between adjacent floor/wall/water tiles to soften grid stepping
- Per-theme blend masks; falls back cleanly in print mode

**9.3 — Hand-Drawn Mode**
- Wobbly walls (Perlin-jittered stroke offsets)
- Cross-hatch shading and ink texture (Dyson / Watabou inspired)
- Honors print-mode B&W contract

**9.4 — Lighting & Atmosphere**
- Ambient occlusion in wall corners
- Soft shadow falloff under stamps
- Day/night/dusk color grading per scene

**9.5 — Art Style Presets**
- **Per-map** `artStylePreset` field on `DungeonMap`
- Built-in presets: **Classic** (current), **Hand-Drawn**, **Painted**, **Minimal**, **Print**
- Preset picker in Map settings; export honors active preset

📘 **README checkpoint #3:** Showcase gallery of all presets across themes.

### Phase 10: Dynamic Rooms (Shape Layer)

*Transforms map editing from tile-only to shape+tile hybrid. Shapes rasterize to the existing tile grid; individual tile painting coexists with shapes (no lock). Merging is visual only — rooms remain separate logical objects.*

**10.1 — Shape Data Model & Rasterizer**
- New `RoomShape` type (rect for v1: position, dimensions, optional door hints, fill/wall tile overrides)
- `DungeonMap.roomShapes: RoomShape[]` (additive — old maps unaffected)
- Rasterizer (shapes → floor + wall tiles) runs on every shape edit; tile grid remains the source of truth for rendering
- **Coexistence:** individual tile painting still works on top of rasterized output (no lock)
- Undo/redo support for shape ops
- Tests for rasterizer correctness (built on Phase 7)

**10.2 — Rectangle Drawing & Resize**
- New `room-rect` tool — drag to draw a rectangular room shape
- Edit handles for resize / move
- Live preview while dragging
- Right-click / context menu to delete a room shape

**10.3 — Visual Merging**
- When two rectangles overlap or touch edges, the rasterizer dissolves shared interior walls
- Room shapes remain **separate logical objects** (visual merge only — no auto-combined notes/IDs)
- Door inference at touch boundaries (auto / open arch / wall — per-edge override)

📘 **README checkpoint #4:** GIF of room overlap/merge.

**10.4 — Generator Integration**
- BSP / Rooms & Corridors generators emit `RoomShape[]` going forward (existing maps unaffected)
- Generated rooms become editable as shapes immediately after generation

**10.5 — Subtractive Shapes**
- "Cut" rectangles for alcoves, pillars, courtyards
- Per-edge wall override controls

**10.6 — Additional Shapes**
- Circle / ellipse room shape
- Polygon room shape (click-to-add-vertex)
- Same merge / subtract semantics as rectangles

### Phase 11: Rivers

*Rivers as a vector layer (like room shapes) that rasterizes to water tiles with directional flow metadata. Generator integration via opt-in checkbox + sliders.*

**11.1 — Vector Layer & Manual Tool**
- New `River` type (vector layer: control points, width, flow direction, type)
- `DungeonMap.rivers: River[]`
- Smooth curve rasterizer (Catmull-Rom or Bézier) → water tiles with directional flow attribute
- New `river` tool — click control points; drag to set width
- Edit handles for moving control points; right-click to delete a control point
- Renders flow direction in screen mode (subtle ripple) and print mode (current arrows)

📘 **README checkpoint #5:** GIF of drawing a river.

**11.2 — Generator Integration**
- Optional **"Add river"** checkbox in Generate dialog → reveals sliders: count, width, meander, source edge
- Open Terrain & Cavern: rivers carve through `floor`/`empty` cells before wall placement
- Village (BSP): rivers placed first; partitioning routes around them; bridges auto-inserted on roads that cross
- Underground themes (Dungeon, Cavern): river checkbox available; produces "underground stream" with appropriate tile

**11.3 — River Polish**
- Bank tiles (sand/dirt/rock edges) per theme
- Source / mouth markers
- Branching tributaries
- **Premade map re-review** (Phase 5.4 Pass 2): walk each bundled sample project and add rivers/streams where the archetype calls for them — castle moat, wilderness river, pirate harbor, swamp stream, etc. Uses the same per-map checklist as 5.4 Pass 1

### Phase 12: Final Pass — Accessibility, Codebase Audit & Documentation

*Closing phase of the active roadmap. Ensures the codebase is clean, tested, documented, and accessible.*

**12.1 — Accessibility Audit**
- Re-audit against WCAG AA across all 13 themes (color contrast, focus order, keyboard reachability, touch target sizes)
- User-test the canvas summary + aria-live announcements with real screen readers (NVDA, VoiceOver, TalkBack)
- Fix any gaps surfaced
- *(Dark mode is **not** in this phase — moved to Far Future)*

**12.2 — Codebase Audit & Refactor**
- Re-measure component sizes (MapCanvas, MobileToolbar, useMapState) and split any new god modules from Phases 8–11
- Dead-code sweep
- Performance profile against 128×128 maps with full feature stack
- Bundle-size audit
- Type-strictness sweep (`any`, missing nullable handling)
- Expand test suite to fill gaps surfaced by audit

**12.3 — README & Documentation Overhaul (Final Pass)**
- Best-practice README: hero screenshot, badges, quick start, feature highlights, theme gallery, install/run, contributing, license
- Animated GIFs of headline features
- Add `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md`
- Verify `LICENSE` is present and correct
- Move ROADMAP under a structured `docs/` tree with clean cross-links

### Phase 6: UI/UX Overhaul, Accessibility, Refactoring & Mobile

*Comprehensive analysis phase — the app has grown from a simple editor to a feature-rich dungeon mapping platform with 25,000+ lines of code, 14 components, 40+ keyboard shortcuts, and 11 toolbar sections. The interface and architecture need to evolve to match.*

---

#### Part 3c: UI/UX Competitive Analysis

### Current UI Inventory

The app currently has a 3-column desktop layout: left toolbar (GM or Player), center canvas, right panels (notes + initiative). The header contains map controls, export buttons, and view toggles.

| Element | Content | Clutter Level |
|---|---|---|
| **Header** (MapHeader) | Map name, width/height/tile-size/UI-scale dropdowns, 13+ buttons (view toggle, print mode, undo, redo, new, samples, clear, JSON/PNG/SVG export, print export, import, shortcuts help) | 🔴 High |
| **GM Toolbar** (Toolbar) | 11 sections: tools (7), tile palette (20+ tiles), theme picker, custom theme, fog, generator, markers, background image, measure, lights, stair links — 43+ props passed from App | 🔴 High |
| **Player Toolbar** (PlayerToolbar) | 4 sections: fog controls, draw tools, pen settings, tokens — 14 props | ✅ Clean |
| **Canvas** (MapCanvas) | Map rendering + all mouse interactions — 54+ props, 1,925 lines | 🔴 Monolithic |
| **Right Panels** | Initiative tracker + Notes panel — always visible | ⚠️ Moderate (takes space even when unused) |
| **Level Tabs** | Multi-level navigation with context menus | ✅ Clean |
| **Dialogs** (6) | Generate, Custom Theme, Export, Samples, Icon Picker, Shortcuts | ✅ Appropriately modal |

### UI Problems Identified

**1. GM Toolbar Overload**
The GM toolbar has grown to 11 distinct sections with ~50+ controls. Sections include tile painting, theme selection, fog preview, generators, shape markers, background images, measurement tools, light sources, and stair linking. A new user encounters all of these at once with no progressive disclosure. Competitors like Dungeondraft and DungeonFog use collapsible panels, tabbed tool categories, and context-sensitive toolbars that only show relevant options.

**2. Header Bar Congestion**
The header contains 13+ buttons plus 4 dropdown selectors. Map metadata controls (name, width, height, tile size, UI scale) share space with action buttons (export formats, undo/redo, new/clear). This mixes "settings" with "actions" in a way that's confusing. Competitors separate file operations into menus and keep the header minimal.

**3. Mode Naming: "GM" vs "Player"**
The current view modes are named "GM" (Game Master) and "Player." These labels assume TTRPG context and may confuse users from other backgrounds (architects, game designers, writers, worldbuilders). Additionally, the distinction is unclear — GM mode is actually "Edit" mode and Player mode is actually "Present/Play" mode. The GM/Player naming also implies these are different user roles requiring separate logins, when really they're just view modes on the same session.

**Recommendation:** Rename to **"Edit"** and **"Present"** (or "Edit" and "Play"). These names are universally understood and accurately describe what each mode does — one is for building/editing the map, the other is for presenting it to players with fog and restricted visibility.

**4. Right Panels Always Visible**
The Initiative Panel and Notes Panel are always rendered in the right column, even when the user isn't using tokens or notes. This wastes ~200px of horizontal space. They should be collapsible, tabbed, or drawer-based.

**5. No Progressive Disclosure**
Every tool section is visible at all times in the GM toolbar. Advanced features (light sources, stair links, shape markers, background images) should be behind expandable sections, a secondary toolbar tab, or discoverable via search.

### Competitor UI Patterns Worth Adopting

| Pattern | Used By | Current Status | Recommendation |
|---|---|---|---|
| **Collapsible tool panels** | Dungeondraft, DungeonFog, Inkarnate | ❌ All sections always visible | Add collapsible accordion sections with memory |
| **Tabbed toolbar categories** | DungeonFog (Build/Light/Objects) | ❌ Single scrolling toolbar | Group tools into 3–4 tabs: Draw, Generate, Tactical, Advanced |
| **Context-sensitive toolbar** | Dungeondraft | ❌ All tools always shown | Show relevant options only when a tool is active |
| **File/Edit/View menus** | Dungeondraft, DungeonFog | ❌ All in header buttons | Move file ops (import/export/new/clear) into dropdown menus |
| **Floating/dockable panels** | Dungeondraft | ❌ Fixed 3-column layout | Allow panels to float, dock, or hide |
| **Command palette** | VS Code, Figma | ❌ Not implemented | Add Ctrl+P / Cmd+K command palette for power users |
| **Bottom toolbar (mobile)** | Inkarnate (tablet mode) | ❌ Not implemented | Essential for touch/mobile support |
| **Dark mode** | DungeonFog, Foundry VTT | ❌ Light only | Add theme toggle (reduces eye strain for long sessions) |

### Proposed UI Restructure

**Header (simplified):**
- App name + map name (left)
- Undo/Redo + View mode toggle (center)
- File menu (dropdown: New, Import, Export JSON/PNG/SVG/Print, Samples) + Settings gear (dropdown: UI scale, tile size, print mode, shortcuts) (right)

**Left Toolbar (tabbed):**
- **Tab 1: Draw** — Paint/Erase/Fill/Line/Rect/Select + tile palette + theme picker
- **Tab 2: Tactical** — Fog, FOV, Light Sources, Measure, Tokens, Initiative
- **Tab 3: Generate** — Generator button, Markers, Background image
- **Tab 4: Advanced** — Custom themes, Stair links, Level management
- Each tab shows only its relevant controls — dramatic clutter reduction

**Right Panel (collapsible drawer):**
- Tabbed: Notes | Initiative | Map Info
- Can be collapsed to give full canvas width
- Auto-opens when relevant (e.g., placing a note opens Notes tab)

**Canvas:**
- Remains center stage, gains space from collapsible panels
- Floating minimap (already exists)
- Floating zoom controls (already exists)

---

#### Part 3d: Accessibility Audit

### Current Accessibility Strengths (Score: 8/10 WCAG A/AA)

The app has strong baseline accessibility that was built intentionally:

| Feature | Status | Details |
|---|---|---|
| **Skip link** | ✅ | "Skip to map canvas" link, properly hidden until focused |
| **Semantic HTML** | ✅ | `<nav>`, `<main>`, `<aside>`, `<section>` used correctly |
| **ARIA labels** | ✅ | 200+ `aria-label` attributes across all interactive elements |
| **ARIA roles** | ✅ | `role="dialog"`, `role="tablist"`, `role="button"`, `role="application"`, `role="status"` |
| **Focus indicators** | ✅ | `:focus-visible` styles on all interactive elements (brick-red `#8a3a3a` outline) |
| **Screen reader support** | ✅ | `.sr-only` class, `aria-live="polite"` announcements for state changes |
| **Keyboard shortcuts** | ✅ | 40+ shortcuts, `aria-keyshortcuts` attributes, `?` opens help overlay |
| **Modal dialogs** | ✅ | All 6 dialogs use `role="dialog"` + `aria-modal="true"` + Escape dismissal |
| **Tab order** | ✅ | Logical document order, `tabIndex={0}` on interactive non-button elements |
| **Color contrast** | ✅ | Dark text on light background, brick-red accents — likely WCAG AA compliant |
| **Canvas keyboard nav** | ✅ | Arrow keys pan, Shift+Arrow for fast pan, canvas is focusable |

### Accessibility Gaps

**~~1. No `prefers-reduced-motion` support~~** ✅ FIXED
CSS transitions exist (e.g., `transition: background 0.12s, color 0.12s`) but no `@media (prefers-reduced-motion: reduce)` query to disable them for users who need reduced motion. While the animations are subtle, WCAG 2.3.3 requires respecting this preference.

**Action:** ~~Add a `prefers-reduced-motion` media query that sets all `transition-duration` and `animation-duration` to `0s`.~~ Done — global `*` selector in `@media (prefers-reduced-motion: reduce)`.

**2. No dark mode / `prefers-color-scheme` support** ⏳ DEFERRED
The app is light-theme only. Users with light sensitivity, low vision, or who simply prefer dark mode have no option. WCAG doesn't require dark mode, but it's an accessibility best practice — especially for an app used in long TTRPG sessions.

**Action:** Add `prefers-color-scheme: dark` support with a manual toggle. Define CSS custom properties for all colors and swap them in dark mode. *(Deferred: requires converting 336 hardcoded colors to CSS custom properties — full session.)*

**~~3. No high-contrast mode~~** ✅ FIXED
No `forced-colors` or `prefers-contrast: more` media query support. Users with Windows High Contrast Mode may see broken layouts.

**Action:** ~~Add `@media (forced-colors: active)` styles ensuring all interactive elements remain visible and distinguishable.~~ Done — buttons, dialogs, canvas, and focus indicators styled for forced-colors.

**~~4. Touch target sizes below WCAG 2.5.8~~** ✅ FIXED
Toolbar buttons are ~30–40px, below the WCAG recommended 44×44px minimum touch target. This affects both accessibility and mobile usability.

**Action:** ~~Increase all interactive element minimum sizes to 44×44px (or add sufficient spacing to create 44px effective targets).~~ Done — `.tool-btn`, `.toolbar-tab-btn`, `.zoom-controls button`, `.level-tab` all have `min-height: 44px`.

**~~5. Focus trapping in modals is incomplete~~** ✅ FIXED
Modals have `aria-modal="true"` and Escape dismissal, but there is no explicit focus trap preventing Tab from escaping the dialog into background elements. The `aria-modal` attribute hints to assistive technology but doesn't enforce focus containment.

**Action:** ~~Implement focus trap utility (or use a library like `focus-trap-react`) for all 6 dialog components.~~ Done — `useFocusTrap` hook implemented and applied to all 6 dialogs.

**~~6. Canvas content not accessible to screen readers~~** ✅ FIXED (partial)
The canvas element has an `aria-label` describing the map but the actual map content (tiles, tokens, notes, markers) is not programmatically accessible. A screen reader user cannot discover or interact with individual map elements.

**Action (partial):** ~~Add an off-screen text description that summarizes the map state (room count, token positions, note summaries).~~ Done — off-screen `.sr-only` div summarizes token/note/marker/stamp counts and fog status. Full canvas accessibility is an unsolved problem in the industry — even Foundry VTT and Roll20 have limited canvas screen reader support.

**~~7. No announcements for tool actions~~** ✅ FIXED
When a user paints a tile, places a token, or toggles fog, there is no `aria-live` announcement confirming the action. The status message system exists but may not cover all actions.

**Action:** ~~Extend the `aria-live` region to announce key actions: tile painted, token placed, fog toggled, level switched, etc.~~ Done — announcements added for token, marker, stamp, light source, and FOV actions via `announce` prop on MapCanvas.

---

#### Part 3e: Codebase Refactoring Assessment

### Current Architecture Overview

| Metric | Value | Health |
|---|---|---|
| **Total source lines** | ~25,350 | ⚠️ Large for a single-page app with no state management library |
| **Largest component** | MapCanvas.tsx (1,925 lines) | 🔴 God component — rendering + interactions + tools |
| **Largest hook** | useMapState.ts (1,177 lines) | 🔴 God hook — all state + history + persistence + 50+ actions |
| **App.tsx** | 988 lines, 21+ useState hooks | 🔴 Prop-drilling hub — passes 54 props to MapCanvas, 43 to Toolbar |
| **State management** | Pure React hooks, all prop-drilled from App.tsx | ⚠️ Scaling limit reached |
| **Test coverage** | 0% — no test infrastructure | 🔴 Risk for refactoring |
| **Circular dependencies** | None detected | ✅ Clean import hierarchy |
| **TypeScript strictness** | Full TypeScript with strict types | ✅ Strong type safety |

### Critical Refactoring Targets

**1. MapCanvas.tsx (1,925 lines → split into 4–5 modules)**

The canvas component handles rendering, mouse event processing, tool-specific interaction logic, overlay drawing, and token/marker management — all in one file.

Proposed split:
- `MapCanvasRenderer.ts` — Pure canvas rendering functions (tiles, tokens, markers, fog, lights, overlays)
- `MapCanvasInteractions.tsx` — Mouse event handlers, drag logic, coordinate mapping
- `useCanvasTools.ts` — Tool-specific handlers (paint, erase, fill, select, measure, FOV, etc.)
- `MapCanvasOverlays.ts` — FOV, fog, light glow, measurement template rendering
- `MapCanvas.tsx` — Thin orchestrator connecting the above

**2. useMapState.ts (1,177 lines → split into 4–5 hooks)**

This hook manages the entire dungeon state, undo/redo history, multi-level projects, clipboard, persistence, and 50+ action handlers.

Proposed split:
- `useMapData.ts` — Core tile/note/token/marker CRUD operations
- `useMapHistory.ts` — Undo/redo stack management
- `useLevelManagement.ts` — Multi-level project operations (add/delete/duplicate/reorder levels)
- `useMapClipboard.ts` — Copy/paste/cut logic
- `useMapPersistence.ts` — IndexedDB save/load, legacy migration

**3. App.tsx state management (21+ useState → context providers)**

App.tsx currently props-drills everything to children. With 54 props going to MapCanvas and 43 to Toolbar, this is at the scaling limit of pure prop-drilling.

Proposed solution — introduce 3–4 React Contexts (no external library needed):
- `ToolContext` — activeTool, activeTile, markerShape/color/size, measureShape/feetPerCell, lightPreset/radius/color
- `MapContext` — map, project, activeLevelIndex, theme
- `ViewContext` — viewMode, printMode, uiScale, gmShowFog
- `ActionContext` — callbacks for setTile, setTool, undo, redo, etc.

This eliminates most prop-drilling while keeping the architecture pure React.

**4. Toolbar.tsx (695 lines → tabbed sub-components)**

The toolbar renders 11 sections unconditionally. Splitting into tab-based sub-components aligns with the UI restructure and reduces per-render cost:
- `DrawToolsTab.tsx` — Paint, Erase, Fill, Line, Rect, Select + tile palette + theme
- `TacticalToolsTab.tsx` — Fog, FOV, Lights, Measure, Tokens
- `GenerateToolsTab.tsx` — Generator, Markers, Background
- `AdvancedToolsTab.tsx` — Custom themes, Stair links

### Impact on Far Future Goals

| Far Future Goal | Refactoring Benefit |
|---|---|
| **Real-Time Collaboration** | Context-based state management makes it straightforward to intercept state changes for sync. useMapData hook becomes the single point where remote changes are applied. Without refactoring, collaboration would require touching 50+ prop-drilled callbacks. |
| **Multi-Layer System** | Splitting MapCanvas renderer from interactions makes it possible to add layer-aware rendering without rewriting mouse handling. Each layer could get its own render pass in MapCanvasRenderer. |
| **World/Region Maps** | Clean separation of rendering (MapCanvasRenderer) from tile logic (useMapData) allows swapping the tile-grid model for a polygon-based model without rewriting the canvas infrastructure. |
| **Map Organization** | useMapPersistence as a separate hook makes it trivial to add cloud storage, tagging, and folder operations alongside the existing IndexedDB persistence. |
| **Test Coverage** | Smaller, focused modules are dramatically easier to unit test. The current god hook and god component are essentially untestable. |

---

#### Part 3f: Extended Competitor Analysis

### Competitors Not Previously Analyzed

| Competitor | Type | Key Features We Lack |
|---|---|---|
| **Foundry VTT** (desktop app, $50 one-time) | Full virtual tabletop | Dynamic lighting with walls/doors as light barriers, module/plugin ecosystem, journal entries linked to map locations, audio ambiance per scene, animated tiles/tokens, ruler waypoints, macro scripting |
| **Owlbear Rodeo** (browser, free) | Lightweight VTT | Real-time multiplayer with zero setup (share URL), drag-drop simplicity, fog reveal with pointer gestures, extension marketplace, character sheet integration |
| **Shmeppy** (browser, free/$6/mo) | Minimalist VTT | Live collaborative editing (Google Docs style), infinite canvas, ultra-simple UX with near-zero learning curve, tile labeling, persistent game rooms |
| **Dungeondraft** (desktop, $19.99) | Dungeon map editor | Asset/stamp library (1000+ objects), wall/path tools with auto-theming, cave tool with organic edges, custom asset pack import (community packs), batch export, water tool with animated preview |
| **Inkarnate** (browser, $5/mo) | Map design studio | 236K+ community maps (cloneable), Pro asset library (10K+ stamps), world/region/city/battle map modes, layer system with blend modes, custom stamp upload, commercial use license |
| **DungeonFog** (browser, €4.90/mo) | Interior/dungeon editor | Dynamic lighting (Pro), 3K+ asset library, multi-floor support, reusable room templates, commercial license, Foundry VTT/Roll20 export integration |

### New Feature Opportunities

Based on this expanded competitor analysis, the following features represent realistic, high-impact additions that don't require backend infrastructure:

**6.4 — Asset/Stamp Library** *(high impact, medium effort — broken into 6 sub-phases)*

The stamp library is the single most impactful missing feature for visual map quality. Competitors: Dungeondraft has 1000+ objects, Inkarnate 10K+, DungeonFog 3K+; Dungeon Mapper currently has 30 token icons but zero placeable map objects. Each sub-phase is independently shippable.

**~~6.4.1 — Stamp Data Model & Placement Engine~~** ✅ COMPLETE *(foundation, low effort)*
- ✅ Defined `StampDef` type (id, name, category, themeId, svgPath/paths, viewBox) in `types/map.ts`
- ✅ Defined `PlacedStamp` type (stampId, x, y, rotation, scale, flipX, flipY, opacity, locked) on `DungeonMap`
- ✅ Added `stamps?: PlacedStamp[]` field to `DungeonMap` interface
- ✅ Added `'stamp' | 'move-stamp' | 'remove-stamp'` to `ToolType` union
- ✅ Wired undo/redo support for stamp add/move/remove in `useMapState`
- ✅ No UI yet — just the data layer and state management

**6.4.2 — Core Stamp Rendering & Canvas Interaction** *(foundation, low effort)*
- Render `PlacedStamp[]` on canvas (new `canvasStampRenderer.ts` module, follows existing pattern)
- Click-to-place stamp at cell position with snap-to-grid
- Click stamp to select → drag to move, Delete to remove
- Render stamp selection handles (bounding box outline)
- Include stamps in PNG/SVG export via `renderMap.ts`
- Include stamps in JSON save/load round-trip

**6.4.3 — Stamp Picker UI & First 40 Universal Stamps** *(first visible feature, medium effort)*
- Create `StampPicker.tsx` component (grid of stamp thumbnails with category tabs, search filter)
- Add STAMPS section to `AdvancedToolsTab.tsx` toolbar with [Y] keyboard shortcut
- Create `src/stamps/stampLibrary.ts` with the first 40 universal stamps across 5 categories:
  - Furniture (10): table, chair, bed, bookshelf, chest, barrel, crate, throne, altar, fireplace
  - Dungeon Dressing (10): skull, bones, rubble, cobweb, torch-sconce, chain, cage, well, fountain, statue
  - Nature (10): tree, bush, rock, mushroom, flower, vine, log, stump, pond, campfire
  - Structures (5): column, archway, bridge-plank, ladder, lever
  - Markers (5): X-mark, arrow, exclamation, question-mark, flag
- SVG paths use 512×512 viewBox (same convention as existing `iconLibrary.ts`)

**~~6.4.4 — Stamp Transform Controls~~** ✅ COMPLETE *(polish, low effort)*
- ✅ Click-to-select placed stamps on canvas (stamp and move-stamp tools) with yellow dashed selection highlight
- ✅ Rotation: 90° snap with Shift+R keyboard shortcut + counter-clockwise/clockwise buttons in transform panel
- ✅ Scale: slider control in transform panel (0.25×–4× range)
- ✅ Flip: horizontal/vertical flip buttons in transform panel + Shift+H / Shift+V keyboard shortcuts
- ✅ Opacity slider (10%–100%) in stamp transform panel
- ✅ Lock/unlock stamps to prevent accidental moves — lock badge rendered on canvas
- ✅ Z-order: bring-to-front / send-to-back buttons for overlapping stamps
- ✅ Delete selected stamp via Delete/Backspace key or trash button
- ✅ `updateStamp`, `bringStampToFront`, `sendStampToBack` actions in useMapState with undo/redo support
- ✅ Transform panel appears in StampPicker when a placed stamp is selected
- ✅ All transforms wired through ActionContext and ToolContext

**6.4.5 — Per-Theme Stamp Sets (160+ stamps)** *(content, high effort — can be split further)*
- Extend `stampLibrary.ts` with theme-tagged stamps, 10–15 per theme:
  - Dungeon: iron maiden, portcullis, sarcophagus, brazier, weapon rack, etc.
  - Castle: banner, chandelier, tapestry, armor stand, candelabra, etc.
  - Wilderness: tent, animal tracks, fallen tree, berry bush, antler, etc.
  - Starship: console, cryo-pod, airlock, reactor, terminal, etc.
  - Alien: egg cluster, tentacle, crystal, spore, bio-pod, etc.
  - Cyberpunk: neon sign, dumpster, hologram, drone, server rack, etc.
  - Steampunk: gear, pipe, gauge, boiler, clockwork, etc.
  - Old West: cactus, wagon wheel, trough, hitching post, saloon door, etc.
  - Pirate: anchor, cannon, treasure map, rum barrel, ship wheel, etc.
  - Desert: oasis palm, sand dune, scarab, obelisk, tent, etc.
  - Ancient: hieroglyph, broken column, urn, mosaic, slab, etc.
  - Modern City: trash can, bench, lamppost, fire hydrant, mailbox, etc.
  - Post-Apocalypse: radiation sign, wrecked car, barbed wire, gas mask, etc.
- Stamp picker shows "All" + per-theme filter tabs
- This sub-phase can itself be delivered incrementally (a few themes at a time)

**6.4.6 — Custom Stamp Upload** *(extension, low effort)* **✅ COMPLETE**
- Upload user PNG/SVG images as custom stamps (reuses pattern from custom tile upload)
- Custom stamps stored as data URLs in `DungeonProject.customStamps?: StampDef[]`
- Appear in a "Custom" category in the stamp picker with upload UI (PNG/SVG/JPEG/WebP, 2MB limit)
- Delete overlay on custom stamp grid items; `saveCustomStamp` / `deleteCustomStamp` in useMapState
- `getStampDef()` now accepts `customStamps` param, resolving custom before built-in
- Canvas image cache with preloader in MapCanvas; SVG export uses `<image>` elements
- Import/export with JSON project files

**6.5 — Wall & Path Drawing Tools** *(medium impact, medium effort)*
- Free-form wall drawing (not just tile-based walls) — click to place wall segments along grid edges
- Path/road drawing tool for connecting areas with natural-looking paths
- Competitors: Dungeondraft, DungeonFog both have dedicated wall tools
- Would complement the existing tile-based system rather than replace it

**6.6 — Scene/Room Templates** *(medium impact, low effort)* **✅ COMPLETE**
- Save and reuse room configurations as reusable templates
- Templates include tiles, notes, and stamps for a selected region (via selection tool)
- `SceneTemplate` type with tiles, notes, stamps, dimensions, createdAt
- `DungeonProject.sceneTemplates` array; `saveSceneTemplate` / `deleteSceneTemplate` / `renameSceneTemplate` / `applySceneTemplate` in useMapState
- `SceneTemplateDialog.tsx` modal — save from selection, list/apply/rename/delete
- 📋 Templates button in Advanced tab
- `ClipboardBuffer` now includes stamps field — copy/cut/paste captures stamps within selection
- Builds on existing copy/paste infrastructure

**6.7 — Map Linking & Journal Integration** *(medium impact, medium effort)*
- Link notes to external content (URLs, text documents)
- Cross-map note references (link a note on one map to a location on another)
- Rich text formatting in notes (bold, italic, lists)
- Competitors: Foundry VTT has deep journal/map integration

**6.8 — Audio Ambiance** *(low-medium impact, low effort)*
- Per-map ambient audio URL or uploaded audio file
- Play/pause controls in present mode
- Optional: per-room audio zones
- Competitors: Foundry VTT, Syrinscape integration

**6.9 — Animated Tokens & Effects** *(low impact, high effort)*
- Animated token movement (smooth interpolation between cells)
- Spell effect animations (fireball, lightning bolt)
- Water/lava tile animation
- Competitors: Foundry VTT has extensive animation support
- Lower priority — high effort for marginal gameplay benefit in a mapping tool

---

#### Part 3g: Mobile & Tablet Adaptation Analysis

### Current Mobile Readiness (Score: 3/10)

| Aspect | Status | Details |
|---|---|---|
| **Viewport meta** | ✅ | `<meta name="viewport" content="width=device-width, initial-scale=1.0">` |
| **Touch events** | ❌ | Zero touch/pointer event handlers — canvas uses only mouse events |
| **Responsive layout** | ⚠️ | Grid layout with `clamp()` but only 2 media queries (both at 760px, both for dialogs only) |
| **Touch target sizes** | ❌ | Buttons are ~30–40px (below 44px minimum) |
| **Gesture support** | ❌ | No pinch-to-zoom, no two-finger pan, no long-press |
| **Mobile toolbar** | ❌ | No collapsible/bottom toolbar pattern |
| **PWA** | ❌ | No manifest.json, no service worker, no offline support |
| **Tablet landscape** | ⚠️ | Usable but cramped — left/right panels consume ~40% of width on 10" tablets |

### Mobile Adaptation Strategy

#### Approach: Progressive Enhancement (not a separate mobile app)

The app should remain a single codebase with responsive behavior, following the pattern used by Inkarnate and DungeonFog — both are browser-based map tools that work on tablets through responsive design and touch event support.

**Phase 6.1 — Touch & Pointer Event Foundation**

Replace all mouse events in MapCanvas with Pointer Events API (`pointerdown`, `pointermove`, `pointerup`). Pointer Events unify mouse, touch, and stylus input into a single API, eliminating the need for separate mouse and touch handlers.

Key changes:
- `onMouseDown` → `onPointerDown` (with `pointerType` detection for mouse vs touch vs pen)
- `onMouseMove` → `onPointerMove`
- `onMouseUp` → `onPointerUp`
- `onWheel` → keep for mouse scroll, add pinch-to-zoom via touch gesture detection
- Add `touch-action: none` CSS on canvas to prevent browser scroll/zoom interference
- Two-finger pan gesture (detect 2 active pointers, compute delta)
- Pinch-to-zoom gesture (detect 2 active pointers, compute distance change)
- Long-press for context menu (replaces right-click on touch)
- Add `onPointerCancel` handling for interrupted gestures

**Phase 6.2 — Responsive Layout Overhaul**

Breakpoint strategy:
- **Desktop** (>1024px): Current 3-column layout — left toolbar, center canvas, right panels
- **Tablet landscape** (768–1024px): Collapsible left toolbar (icon-only rail with slide-out detail), canvas expands, right panel as overlay drawer
- **Tablet portrait / large phone** (480–768px): Bottom toolbar with tool selection, canvas fills viewport, panels as full-screen overlays
- **Phone** (<480px): Simplified bottom toolbar, canvas fills viewport, panels as modal sheets, reduced tool set

Key CSS changes:
- Convert fixed grid to responsive grid with `@container` queries or media queries
- Left toolbar collapses to icon rail at tablet widths
- Right panels become slide-in drawers (toggle button at edge)
- Header simplifies: hide text labels, use icon-only buttons, overflow menu
- Dialog max-widths already use `min(Xpx, 94vw)` — good

**Phase 6.3 — Mobile-First Tool UX** ✅ COMPLETE

Implemented a dedicated mobile toolbar experience for touch screens ≤ 768 px:
- **MobileToolbar component** (`MobileToolbar.tsx`, 1026 lines) — replaces desktop toolbar on mobile
- **Bottom bar**: 5–6 primary tool buttons (44×44 px touch targets) — Draw, Erase, Fill, Fog/Defog, Select, More
- **"More" flyout**: Slides up from bottom (60vh max), categorized tool grid (Drawing/Fog/Tactical/Tokens/Advanced)
- **Floating action button (FAB)**: 56 px circular undo button; long-press reveals vertical menu with Undo/Redo/Generate/Switch Mode
- **Gesture shortcuts**: Two-finger tap = undo, three-finger tap = redo (in MapCanvas pointer handlers)
- **Tool options bar**: Contextual controls above bottom bar — tile badge for paint/fill, color picker + width slider for draw, shape buttons for measure, shape + color + size for markers, Clear/Fill buttons for fog
- **isMobile detection**: `matchMedia('(max-width: 768px)')` with live listener in App.tsx
- **GM and Player modes**: Separate quick-button sets and flyout categories per view mode

**Phase 6.3.1 — PWA Support** ✅ COMPLETE

Converted to installable Progressive Web App:
- **manifest.webmanifest** with app name, icons, theme color (#f4f1ea), `display: standalone`
- **Service worker** via vite-plugin-pwa (Workbox generateSW) — precaches all JS/CSS/HTML/SVG/PNG assets
- **PWA icons**: 192×192 and 512×512 PNG generated from favicon.svg (with maskable variant)
- **Apple mobile web app** meta tags: apple-touch-icon, apple-mobile-web-app-capable, status-bar-style
- **Offline support**: App shell and all assets cached for full offline use
- **viewport-fit: cover**: Ensures proper rendering in notched/island device safe areas

---

## Part 5: Recommended Priority Order

### Next Up — Completed ✅
- ~~**Phase 4.1** — Line-of-Sight / FOV~~ ✅
- ~~**Phase 4.2** — Dynamic Fog of War~~ ✅
- ~~**Phase 7.3** — Measurement & Distance Tools~~ ✅
- ~~**Phase 4.3** — Light Sources~~ ✅
- ~~**Phase 4.5.2** — Theme Personality: Floors, Walls, Doors~~ ✅
- ~~**Phase 4.5.3** — Iconic Tiles: Treasure, Traps, Start, Water~~ ✅
- ~~**Phase 5.1** — Multi-Level Dungeon Support~~ ✅
- ~~**Phase 5.2** — Sample & Default Maps~~ ✅
- ~~**Phase 5.3** — Custom Tile/Theme Creation~~ ✅
- ~~**Phase 7.5** — GM Drawing / Annotation Tools~~ ✅
- ~~**Phase 6.1** — Touch & Pointer Events~~ ✅
- ~~**Phase 6.2** — Responsive Layout~~ ✅
- ~~**Phase 6.3** — Mobile-First Tool UX~~ ✅
- ~~**Phase 6.3.1** — PWA Support~~ ✅
- ~~**Phase 6.4.1** — Stamp Data Model & Placement Engine~~ ✅

### Medium-Term — Active Roadmap (Phase 6)

Recommended implementation order based on dependency analysis, impact, and effort:

**Sprint 1: Foundation (enables everything else)** ✅ COMPLETE
1. ~~**Phase 6 Refactoring** — Split MapCanvas, useMapState, and introduce React Contexts~~ ✅
   - *Why first:* Every subsequent phase modifies these files. Splitting them first prevents merge conflicts and makes parallel work possible. Also enables testing.
   - *Effort:* Medium (restructuring, no new features)
   - *Risk:* Low (pure refactoring, no behavior change)

2. ~~**Phase 6.1 — Touch & Pointer Events** — Replace mouse events with Pointer Events API~~ ✅
   - *Why second:* Foundation for all mobile/tablet work. Small, self-contained change.
   - *Effort:* Low-medium
   - *Risk:* Low (Pointer Events are a superset of mouse events)

**Sprint 2: UI/UX Overhaul** ✅ COMPLETE
3. ~~**Phase 6.2 — Responsive Layout** — Breakpoint system, collapsible panels, drawer-based right panel~~ ✅
   - *Why:* Largest UX improvement — reduces clutter for desktop users AND enables tablet use
   - *Effort:* Medium-high
   - *Dependency:* Benefits from refactored Toolbar (Sprint 1)

4. ~~**Accessibility fixes (partial)** — prefers-reduced-motion, focus traps, high-contrast, touch targets, canvas summary, action announcements~~ ✅
   - *Why:* Ships alongside layout changes — same CSS files being modified
   - *Effort:* Low-medium
   - *Dependency:* Layout work in 6.2
   - *Note:* Dark mode deferred to a dedicated session (requires converting 336 hardcoded colors to CSS custom properties)

5. ~~**Mode rename** — "GM" → "Edit", "Player" → "Present"~~ ✅
   - *Why:* Trivial change, big clarity improvement, no dependencies
   - *Effort:* Very low

**Sprint 3: Mobile & Polish** ✅ COMPLETE
6. ~~**Phase 6.3 — Mobile Tool UX** — Bottom toolbar, gesture shortcuts, contextual options bar~~ ✅
   - *Why:* Makes the app usable on tablets (large new user segment)
   - *Effort:* Medium
   - *Dependency:* Requires 6.1 (touch events) and 6.2 (responsive layout)

7. ~~**Phase 6.3.1 — PWA** — manifest.json, service worker, offline caching~~ ✅
   - *Why:* Enables "install" on tablets, offline use
   - *Effort:* Low
   - *Dependency:* Standalone, can ship anytime after 6.3

**Sprint 4: New Features**
8. ~~**Phase 6.4.1 — Stamp Data Model & Placement Engine** — Types, state management, undo/redo~~ ✅
   - *Why:* Foundation for all stamp features — no UI, just data layer
   - *Effort:* Low
   - *Dependency:* Benefits from refactored MapCanvas (Sprint 1)

9. ~~**Phase 6.4.2 — Stamp Rendering & Canvas Interaction** — Draw stamps on canvas, click-to-place, drag-to-move~~ ✅
   - *Why:* Makes stamps functional end-to-end
   - *Effort:* Low
   - *Dependency:* Requires 6.4.1

10. ~~**Phase 6.4.3 — Stamp Picker UI & First 40 Stamps** — Picker component, toolbar integration, 40 universal SVG stamps~~ ✅
    - *Why:* First user-visible stamp feature — immediately usable
    - *Effort:* Medium
    - *Dependency:* Requires 6.4.2

11. ~~**Phase 6.4.4 — Stamp Transform Controls** — Rotation, scale, flip, opacity, lock, z-order~~ ✅
    - *Why:* Polish that makes stamps flexible enough for real use
    - *Effort:* Low
    - *Dependency:* Requires 6.4.2

12. **Phase 6.4.5 — Per-Theme Stamp Sets (160+ stamps)** — 10–15 stamps per theme, theme-filtered picker
    - *Why:* Bulk content that closes the competitive gap
    - *Effort:* High (mostly SVG authoring, can deliver incrementally per theme)
    - *Dependency:* Requires 6.4.3

13. ~~**Phase 6.4.6 — Custom Stamp Upload** — User PNG/SVG upload, project-scoped storage~~ ✅
    - *Why:* Lets users bring their own assets (matches custom tile upload pattern)
    - *Effort:* Low
    - *Dependency:* Requires 6.4.3

14. ~~**Phase 6.6 — Scene/Room Templates** — Save/reuse room configurations~~ ✅
    - *Why:* Builds on existing clipboard infrastructure, high user value
    - *Effort:* Low
    - *Dependency:* None

15. **Phase 6.5 — Wall & Path Tools** — Free-form wall drawing along grid edges
    - *Why:* Fills a competitive gap vs Dungeondraft/DungeonFog
    - *Effort:* Medium
    - *Dependency:* Benefits from refactored MapCanvas

**Later / As Needed:**
16. **Phase 6.7 — Map Linking & Journal** — Rich notes, cross-map references
17. **Phase 6.8 — Audio Ambiance** — Per-map ambient audio
18. **Phase 6.9 — Animated Tokens** — Smooth movement, spell effects

**Active Roadmap — Phases 7–12** (approved 2026-05-03):

19. **Phase 7 — Test Infrastructure** — Vitest + React Testing Library setup, initial coverage for high-risk modules, component smoke tests
    - *Why first:* Phase 10 (dynamic rooms) is the most complex change in the roadmap; a test suite built before that work pays for itself immediately
    - *Effort:* Medium
    - *Dependency:* None — standalone
    - 📘 **README checkpoint #1** after completion: add "Development & Testing" section

20. **Phase 8.1 → 8.2 → 8.3 → 8.4 — UI Redesign** — Navigation rail, docked inspector, command palette + HUD, **Generate Hub (dedicated window for generators + samples)**
    - *Why:* Matches proven competitor layout (Dungeondraft: left icon rail + contextual panel + docked right inspector); reduces toolbar complexity; pulls map creation out of the Draw tab into its own surface
    - *Effort:* Medium-high (4 sub-phases)
    - *Dependency:* Benefits from test suite (Phase 7); 8.4 depends on 8.1 navigation rail being in place
    - 📘 **README checkpoint #2** after 8.4: screenshots/GIFs of new UI (including Generate Hub)

21. **Phase 9.1 → 9.2 → 9.3 → 9.4 → 9.5 — Art System v2** — Texture/paper layer, edge blending, hand-drawn mode, lighting/atmosphere, style presets
    - *Why:* Visual quality leap; parchment + hand-drawn mode are the most requested art features
    - *Effort:* High (5 sub-phases, can deliver incrementally)
    - *Dependency:* None — standalone art work
    - 📘 **README checkpoint #3** after 9.5: showcase gallery of all presets across themes

22. **Phase 10.1 → 10.2 → 10.3 → 10.4 → 10.5 → 10.6 — Dynamic Rooms** — Shape data model, rectangle drawing, visual merging, generator integration, subtractive shapes, additional shapes (circle/polygon)
    - *Why:* Biggest architectural change — transforms map editing from tile-only to shape+tile hybrid
    - *Effort:* High (6 sub-phases)
    - *Dependency:* Test suite (Phase 7) strongly recommended
    - 📘 **README checkpoint #4** after 10.3: GIF of room overlap/merge

23. **Phase 11.1 → 11.2 → 11.3 — Rivers** — Vector layer + manual tool, generator integration, polish (banks/branching) + **Phase 5.4 Pass 2 premade re-review**
    - *Why:* Natural water features are a gap vs open-terrain competitors; vector layer enables future editing; rivers also unblock the second sweep of the premade audit (moats, harbors, wilderness rivers)
    - *Effort:* Medium (3 sub-phases)
    - *Dependency:* Benefits from shape infrastructure (Phase 10)
    - 📘 **README checkpoint #5** after 11.1: GIF of drawing a river

24. **Phase 5.4 — Premade Map Design Review** — Recurring sweep that audits each bundled sample against its intended archetype (castle, boat, dungeon, cavern, etc.); ensures background tile fill on every premade; tags archetypes for hub filtering
    - *Why:* Premades drift as new tools/themes ship; a structured sweep keeps the showcase aligned with current capabilities — and it's a natural recurring task triggered by Phases 6.4.5, 9, 10, and 11
    - *Effort:* Low-medium per pass (mostly authoring)
    - *Dependency:* Pass 1 standalone; Pass 2 after Phase 11; Pass 3 after each new content/art tool
    - *Cross-link:* 8.4 surfaces the archetype tags in the Generate Hub

25. **Phase 12 — Final Pass: Accessibility, Codebase Audit & Documentation** — WCAG re-audit, refactor sweep, README overhaul, CONTRIBUTING.md, ARCHITECTURE.md, CHANGELOG.md
    - *Why:* Closes the active roadmap with a clean, documented, tested codebase
    - *Effort:* Medium
    - *Dependency:* All prior phases complete

---

## Part 6: Technical Architecture Notes

### Algorithm Study Sources (Clean-Room Reimplementation Required)

| Algorithm | Study From | License Constraint |
|---|---|---|
| Voronoi + Lloyd relaxation | Azgaar (MIT) or Watabou (GPL—study only) | Reimplement; use `delaunator` npm package |

*Note: Operation-based sync and tile caching algorithms (Mipui, MIT) remain relevant if collaboration features are ever pursued — see Far Future section.*

### Key Architectural Decisions Needed Before Starting

1. **Canvas vs SVG vs Hybrid:** Current Canvas renderer works well for dungeon-scale. Only relevant if world-scale maps (Far Future) are ever pursued.

---

## Design Decisions Log

| Decision | Date | Rationale |
|---|---|---|
| No hex grid support | 2026-04-28 | Non-square tiles not desired; removes former Phase 3 entirely |
| No backend / collaboration (far future) | 2026-04-28 | App stays client-only; cloud sharing, real-time collab, and map forking moved to far future — no backend infrastructure needed |
| No world mapping (far future) | 2026-04-28 | World/region maps, multi-layer system, SVG rendering, and geomorphic tiles moved to far future — focus stays on dungeon-scale mapping |
| Map organization deferred (far future) | 2026-04-28 | Map search/tags/folders depend on cloud storage; deferred alongside backend features |
| Town generator as standalone phase | 2026-04-28 | Scope and algorithmic complexity warrants its own phase rather than being part of generation upgrades |
| BSP over Voronoi for village gen | 2026-04-28 | BSP partitioning produces clean rectangular buildings that map well to the existing square-grid tile system; Voronoi deferred to world-map scale (Phase 6.4) |
| Art upgrade all 13 themes simultaneously | 2026-04-28 | Avoids jarring quality gap between upgraded and non-upgraded themes; each sub-phase ships a consistent improvement across all themes |
| Softer/organic art direction (Watabou/Azgaar inspired) | 2026-04-28 | Differentiates from Donjon's stark line-art and Mipui's ultra-minimal style; still procedural Canvas 2D (no external assets) |
| Grid color picker with per-theme defaults | 2026-04-28 | Per-theme default grid color for immersion; user-customisable picker for flexibility; fits naturally with Phase 5.2 custom themes |
| Art phase before Phase 5 | 2026-04-28 | Art improvements ship fast (no architectural changes), improve first impressions immediately, and the TileTheme interface extensions (gridColor) benefit Phase 5.2 custom themes |
| Print mode as mandatory B&W fallback | 2026-04-28 | All art upgrades must degrade cleanly to the existing monochrome print renderer; no color-only differentiation |
| Shadow/depth effects at artist discretion | 2026-04-28 | Canvas shadowBlur and gradient-based depth effects add polish but are expensive at scale; auto-disable above 96×96 if frame budget is exceeded |
| Bidirectional stair links by convention | 2026-04-29 | A single StairLink entry covers travel in both directions — simplifies UI and avoids the need for paired entries; removal deletes any link matching either endpoint |
| Double-click for stair navigation | 2026-04-29 | Double-clicking a linked stair tile navigates to the destination level and centers viewport — intuitive discovery without requiring a separate "navigate" tool |
| Stair link tool as explicit mode | 2026-04-29 | Link creation requires the dedicated link-stair tool ([K]) rather than auto-linking on placement — prevents accidental links and gives the user full control over which stairs connect |
| Sample maps before custom themes | 2026-04-29 | Bundled sample maps (Phase 5.2) ship before custom tile/theme creation (Phase 5.3) — simpler to implement, immediately improves new-user onboarding, and showcases existing theme art without requiring new infrastructure; competitors like Inkarnate, DungeonFog, and Mipui all offer pre-made maps |
| Rename GM/Player to Edit/Present | 2026-04-29 | "GM" and "Player" assume TTRPG context and imply separate user roles; "Edit" and "Present" are universally understood, accurately describe behavior (build vs view), and don't confuse non-TTRPG users (architects, game designers, worldbuilders) |
| Pointer Events over separate mouse/touch | 2026-04-29 | Pointer Events API unifies mouse, touch, and stylus into one handler set — eliminates duplicated event logic, provides `pointerType` for input-specific behavior, and is supported by all modern browsers |
| React Context over state library | 2026-04-29 | 3–4 React Contexts (Tool, Map, View, Action) replace prop drilling without adding an external dependency; app complexity doesn't warrant Redux/Zustand, and contexts align with React's built-in patterns |
| Progressive enhancement for mobile | 2026-04-29 | Single codebase with responsive breakpoints rather than a separate mobile app — follows Inkarnate/DungeonFog pattern; responsive CSS + pointer events + PWA achieves tablet support without maintaining two apps |
| Refactoring before features | 2026-04-29 | Splitting MapCanvas (1,925 lines) and useMapState (1,177 lines) before adding new features prevents merge conflicts, enables testing, and makes parallel development possible — every Sprint 2–4 phase touches these files |
| Tabbed toolbar over accordion | 2026-04-29 | Tabs (Draw/Tactical/Generate/Advanced) provide clearer mental model than accordion sections — user sees exactly 4 categories, each tab shows only relevant controls; accordion still shows all section headers creating visual noise |
| Asset/stamp library as top new feature | 2026-04-29 | Biggest competitive gap: Dungeondraft has 1000+ objects, Inkarnate 10K+, DungeonFog 3K+; Dungeon Mapper has 30 token icons but zero placeable map objects (furniture, vegetation, dungeon dressing) |
| Phase 6.4 split into 6 sub-phases | 2026-04-30 | 200+ stamps + data model + UI + transforms + custom upload is too large for a single phase; splitting into 6.4.1 (data model) → 6.4.2 (canvas) → 6.4.3 (picker + 40 stamps) → 6.4.4 (transforms) → 6.4.5 (160+ theme stamps) → 6.4.6 (custom upload) makes each chunk independently shippable, enables incremental commits, and allows 6.4.4/6.4.5/6.4.6 to proceed in parallel |
| CSS media queries over container queries | 2026-04-29 | Media queries have universal browser support and are simpler to reason about for the 4-breakpoint strategy (>1024, 768–1024, 480–768, <480px); container queries would be useful for component-level responsive behavior but add complexity without clear benefit at the app shell level |
| Right panel as overlay drawer | 2026-04-29 | At tablet widths the right panel (initiative + notes) becomes an overlay drawer rather than being hidden entirely — preserves quick access to game state while giving the canvas maximum screen area; toggle button at canvas edge is discoverable without being intrusive |
| Test infrastructure before dynamic rooms | 2026-05-03 | Phase 10 is the most complex change in the roadmap; building tests first (Phase 7) lets us refactor with confidence and catch regressions early |
| Navigation rail as additive density mode | 2026-05-03 | Old 4-tab toolbar kept as fallback under a Settings toggle ("Rail" / "Tabs"); can be removed later if rail proves out — no forced migration for existing users |
| Inspector docked, not floating | 2026-05-03 | Docked to right panel (Inkarnate/Dungeondraft style) rather than modal-floating (Figma style); consistent with existing right-panel drawer pattern and user preference |
| Art style presets stored per-map | 2026-05-03 | Per-map `artStylePreset` field lets a project mix styles across scenes (e.g., classic dungeon + hand-drawn overworld); more flexible than project-level |
| Parchment layer optional in exports | 2026-05-03 | User-controllable export checkbox ("Include paper texture"); preserves clean transparent exports for VTT use while enabling print-ready parchment output |
| Shape layer additive, no lock | 2026-05-03 | Tile painting remains available on top of rasterized room shapes; reduces friction vs a lock/unlock toggle — if coexistence proves clunky, a hotkey toggle can be added later |
| Visual-only room merging | 2026-05-03 | Rooms remain separate logical objects when visually merged (walls dissolve, but IDs/notes stay independent); avoids ID/note disambiguation problems |
| Generators emit shapes going forward only | 2026-05-03 | No migration of existing maps; backwards-compatible additive `roomShapes` field — only new generations produce shape data |
| Rectangle-only shapes for v1 | 2026-05-03 | Ships incrementally; circles/polygons land in their own sub-phase (10.6) — keeps Phase 10.1–10.3 focused and shippable |
| Rivers as vector layer | 2026-05-03 | Vector data structure (control points + width + flow direction) mirrors the room-shapes architecture; rasterizes to existing water tiles; preserves flow metadata for future features like animation |
| README/docs interspersed at checkpoints | 2026-05-03 | Five README checkpoint updates throughout Phases 7–11, plus a final overhaul in Phase 12; avoids one giant documentation dump at the end |
| Dark mode → Far Future | 2026-05-03 | Not committed this round; requires converting 336+ hardcoded colors to CSS custom properties — substantial effort with no feature value |
| River ↔ FOV interaction → Far Future | 2026-05-03 | Out of scope for v1 rivers; water reflecting torchlight / blocking movement is a polish feature that can layer on later |
| Generate as a dedicated hub, not a Draw tab section | 2026-05-03 | Today Generate + Samples buttons live inside `DrawToolsTab`, which buries map-creation flows inside an unrelated tool category and gives no preview before commit; competitors (Dungeondraft, DungeonFog, Worldographer) expose generation as its own window — Phase 8.4 introduces a Generate Hub combining procedural generation and the premade gallery in one surface |
| Background tile fill on by default for generated maps | 2026-05-03 | `GenerateMapDialog` already defaults `fillBackground` to `true`; codifying this as a design rule so future generator UIs (Phase 8.4 hub, mobile equivalents) keep it opt-out — empty cells render as floating geometry which never matches user intent for a finished map |
| Premade maps must also default-fill the background tile | 2026-05-03 | Bundled samples in `src/utils/premadeMaps.ts` were authored before the background-fill default was standardized; Phase 5.4 Pass 1 audit makes background fill mandatory on every premade so generated and premade maps render consistently |
| Premade map design review as a recurring sweep | 2026-05-03 | Premades drift as themes/generators/tools evolve — a one-time pass goes stale; Phase 5.4 defines repeating passes (initial archetype audit, post-rivers, post-each new content tool) so bundled samples stay representative of current capabilities |
| Archetype tagging on premades | 2026-05-03 | Premades currently tag only by theme; adding an explicit archetype tag (castle, boat, dungeon, cavern, settlement, temple, etc.) lets the Generate Hub group/filter by intent and makes the 5.4 audit checklist concrete and verifiable |

---

## Changes History

**2026-05-03 — Generate Hub, Premade Map Design Review, and default background-fill captured**
- Added **Phase 5.4 — Premade Map Design Review** as a recurring sweep: Pass 1 audits each of the 26 bundled premades against its intended archetype (castle, boat, dungeon, cavern, etc.) and enforces background-tile fill on every map; Pass 2 re-reviews after Phase 11 (Rivers) to add moats/streams/harbors; Pass 3 re-sweeps after each new content/art tool (6.4.5, 9, 10)
- Added **Phase 8.4 — Generate Hub (dedicated window)** to Phase 8: pulls Generate + Samples out of the Draw tab into a single dedicated surface (Dungeondraft / DungeonFog pattern), reachable from the rail, header File menu, and `[G]` shortcut; surfaces 5.4 archetype tags for filtering; preserves the "Fill empty space with background tile" toggle as on-by-default opt-out
- Cross-linked **Phase 11.3 — River Polish** to 5.4 Pass 2 so the premade re-review ships alongside river polish
- Codified that **background tile fill defaults to ON** for generated maps (already the case in `GenerateMapDialog.tsx`) and made it a Phase 5.4 audit requirement for premade maps
- Updated **Part 5 priority order**: item 20 now spans 8.1 → 8.4; item 23 (Rivers) cross-links to the 5.4 Pass 2 re-review; new item 24 covers Phase 5.4
- Logged 5 new design decisions: generate-as-dedicated-hub, background-fill-default-on, premade-background-fill, recurring premade design review, archetype tagging

**2026-05-03 — Phases 7–12 roadmap approved and integrated**
- Added **Phase 7: Test Infrastructure** — Vitest + React Testing Library setup, initial coverage for high-risk pure modules (useMapState, generators, FOV, stamps), component smoke tests
- Added **Phase 8: UI Redesign** — 8.1 Navigation Rail (left icon rail + contextual panel + density toggle), 8.2 Docked Inspector (right-panel property inspector), 8.3 UI Polish (command palette, zoom HUD, header simplification)
- Added **Phase 9: Art System v2** — 9.1 Texture & Paper Layer (parchment background + export toggle), 9.2 Edge Blending (stochastic dithering), 9.3 Hand-Drawn Mode (wobbly walls + cross-hatch), 9.4 Lighting & Atmosphere (AO + day/night), 9.5 Art Style Presets (per-map presets: Classic/Hand-Drawn/Painted/Minimal/Print)
- Added **Phase 10: Dynamic Rooms** — 10.1 Shape Data Model & Rasterizer, 10.2 Rectangle Drawing & Resize, 10.3 Visual Merging, 10.4 Generator Integration, 10.5 Subtractive Shapes, 10.6 Additional Shapes (circle/polygon)
- Added **Phase 11: Rivers** — 11.1 Vector Layer & Manual Tool, 11.2 Generator Integration (opt-in checkbox + sliders), 11.3 Polish (banks/branching)
- Added **Phase 12: Final Pass** — 12.1 Accessibility Audit, 12.2 Codebase Audit & Refactor, 12.3 README & Documentation Overhaul
- **Far Future additions:** Dark Mode, River ↔ FOV/Lighting Interaction
- **5 README checkpoints** interspersed throughout Phases 7–11 (after 7, 8.3, 9.5, 10.3, 11.1)
- Priority order extended with items 19–24 covering the full Phase 7–12 sequence
- 14 new design decisions logged (test-first, rail fallback, docked inspector, per-map presets, parchment export toggle, shape coexistence, visual merge, forward-only generators, rect-only v1, vector rivers, docs at checkpoints, dark mode deferred, river FOV deferred)

**2026-05-03 — Accessibility fixes (partial) complete: 6 of 7 WCAG gaps addressed**
- Added `@media (prefers-reduced-motion: reduce)` — disables all CSS transitions and animations for users who need reduced motion (WCAG 2.3.3)
- Added `@media (forced-colors: active)` — ensures buttons, dialogs, focus indicators, and canvas remain visible in Windows High Contrast Mode
- Increased touch target sizes to 44×44px minimum on toolbar buttons, tab buttons, zoom controls, and level tabs (WCAG 2.5.5)
- Implemented `useFocusTrap` hook — traps Tab/Shift+Tab focus inside modals, moves focus on open, restores focus on close
- Applied focus trap to all 6 dialog components: GenerateMapDialog, CustomThemeDialog, ExportDialog, PremadeMapsDialog, ShortcutsHelp, IconPicker
- Added off-screen canvas state summary — screen readers can discover token count, note count, marker count, stamp count, and fog status
- Extended action announcements via `aria-live` — token placed/removed, marker placed/removed, stamp placed/removed, light source placed/removed, FOV origin set
- Dark mode (gap #2) deferred to a dedicated session — requires converting 336 hardcoded color values to CSS custom properties

**2026-05-02 — Phase 6.4.3 complete: Stamp Picker UI & First 40 Stamps shipped**
- Expanded stamp catalog from 8 to 40 universal SVG stamps across 5 categories: Furniture (8), Dungeon Dressing (12), Nature (8), Structures (8), Markers (6)
- Created `StampPicker` component (`src/components/StampPicker.tsx`) with category filter tabs, scrollable grid, and SVG previews
- Integrated stamp tool buttons (Place, Move, Remove, Clear) into the picker UI
- Clicking a stamp auto-selects the 'stamp' placement tool if not already in a stamp tool mode
- Added `STAMP_CATEGORY_LABELS` to stamp catalog for category display names
- Integrated StampPicker into DrawToolsTab with props threaded through Toolbar from App.tsx
- Added stamp picker CSS: category tab bar, responsive grid layout with SVG thumbnails, active states

**2026-05-02 — Phase 6.4.2 complete: Stamp Rendering & Canvas Interaction shipped**
- Created stamp catalog (`src/utils/stampCatalog.ts`) with 8 built-in universal stamps (chest, table, chair, barrel, campfire, skull, tree, pillar)
- Added `drawStamp()` rendering function in MapCanvas — renders SVG-path stamps at tile coordinates with rotation, scale, flip, and opacity
- Added `findStampAt()` hit-testing for stamp click detection
- Added stamp placement via `stamp` tool (click-to-place using `selectedStampId`)
- Added stamp dragging via `move-stamp` tool (drag to reposition, respects `locked` flag)
- Added stamp removal via `remove-stamp` tool (click to delete)
- Added `selectedStampId` to ToolContext for stamp selection state
- Wired stamp callbacks (`onAddStamp`, `onMoveStamp`, `onRemoveStamp`) from App.tsx → MapCanvas
- Added stamp rendering in high-DPI PNG export (`renderMap.ts`) and SVG export (`export.ts`)
- Added appropriate cursor styles for all stamp tools (copy, grab, not-allowed)

**2026-05-02 — Phase 6.4.1 complete: Stamp Data Model & Placement Engine shipped**
- Added stamp data model types: `StampDef`, `StampSvgPath`, `StampCategory`, `PlacedStamp`, and `StampPlacementOptions`
- Added `DungeonMap.stamps` with defaults for new maps, loaded/imported legacy maps, generated maps, cleared maps, and resized maps
- Added stamp tool ids (`stamp`, `move-stamp`, `remove-stamp`) to the shared `ToolType` union
- Added stamp state operations in `useMapState`: add, move, remove, and clear stamps
- Extended undo/redo snapshots so stamp placement, movement, removal, and clearing can be undone/redone
- Exposed stamp actions through `ActionContext` for Phase 6.4.2 canvas interaction and Phase 6.4.3 picker UI

**2026-04-29 — Phase 7.5 complete: GM Drawing / Annotation Tools shipped**
- GM freehand drawing tool (`gmdraw` ToolType) with [D] keyboard shortcut in the GM toolbar
- GM erase tool (`gmerase` ToolType) — click a GM stroke to remove it
- GM annotations stored as `AnnotationStroke` with `kind: 'gm'` — hidden from player view in canvas, PNG export, and SVG export
- GM strokes rendered with dashed line pattern to visually distinguish from solid player drawings
- Independent 8-color swatch palette and 3 brush widths (Thin/Medium/Thick) separate from player pen settings
- Clear All button removes all GM drawings from the current level
- Dashed rendering consistent across live canvas (`MapCanvas.tsx`), high-DPI PNG (`renderMap.ts`), and SVG export (`export.ts`)
- Data model forward-compatibility: `AnnotationStroke.kind` already existed as `'player' | 'gm'` — no schema changes needed
- Priority order and feature inventory updated

**2026-04-29 — Phase 6 analysis complete: UI/UX Overhaul, Accessibility, Refactoring & Mobile**
- Comprehensive UI competitive analysis: identified 11-section toolbar overload, header congestion, GM/Player naming confusion, non-collapsible right panels, zero progressive disclosure
- Proposed UI restructure: simplified header with dropdown menus, 4-tab toolbar (Draw/Tactical/Generate/Advanced), collapsible right panel drawer, command palette for power users
- Accessibility audit (8/10 WCAG A/AA): documented strengths (skip link, 200+ ARIA labels, 40+ keyboard shortcuts, semantic HTML, focus indicators, screen reader support) and 7 gaps (prefers-reduced-motion, dark mode, high-contrast mode, touch targets, focus traps, canvas screen reader access, action announcements)
- Codebase refactoring assessment: identified god component (MapCanvas 1,925 lines), god hook (useMapState 1,177 lines), excessive prop drilling (54 props to MapCanvas, 43 to Toolbar); proposed splits and React Context introduction; analyzed impact on far-future goals (collaboration, multi-layer, world maps, testing)
- Extended competitor analysis: added Foundry VTT, Owlbear Rodeo, Shmeppy, Dungeondraft, Inkarnate, DungeonFog; identified 6 new feature opportunities (asset/stamp library, wall/path tools, room templates, journal integration, audio ambiance, animated tokens)
- Mobile/tablet analysis (3/10): zero touch events, 2 media queries, no gestures, no PWA; proposed 3-phase adaptation (pointer events → responsive layout → mobile tool UX + PWA)
- Implementation priority: 4 sprints ordered by dependency (Foundation → UI/UX → Mobile → Features); refactoring first to enable all subsequent work
- 8 new design decisions logged

**2026-04-29 — Phase 5.2 complete: Sample & Default Maps shipped**
- Code-confirmed bundled samples in `src/utils/premadeMaps.ts`: 26 sample projects / 28 playable levels across all 13 themes
- Gallery UI in `src/components/PremadeMapsDialog.tsx`, opened from the header `Samples` button, supports theme filtering and loading into the editor
- Sample projects include generated notes, themed tokens, light sources, fog-of-war setup, initiative order, and two multi-level linked-stair examples
- Roadmap status updated to make Phase 5.3 the next active phase

**2026-04-29 — Phase 5.2 added: Sample & Default Maps**
- New Phase 5.2: bundled sample maps — at least 2 hand-crafted maps per theme (26+ maps across 13 themes)
- Maps showcase theme art, tile variety, and generator types; range from small encounters to medium dungeons; includes multi-level projects with stair links
- Gallery UI for browsing by theme with thumbnail preview; loaded maps are fully editable
- No backend required — maps bundled as JSON in the app build
- Competitor research: Inkarnate (236K+ cloneable community maps, Pro templates), DungeonFog (community map library + 3K+ assets), Mipui (public community maps, browse & edit), DungeonForge (community gallery with search/tags), Dave's Mapper (tile-based remixing), Donjon (random generation only, no saved samples), Dungeondraft (no built-in samples, import only)
- Most successful competitors (Inkarnate, DungeonFog) treat sample/template maps as a core onboarding and retention feature
- Former Phase 5.2 (Custom Tile/Theme Creation) renumbered to Phase 5.3
- Priority order updated: 5.2 (Sample Maps) → 5.3 (Custom Themes)
- Design decision logged: sample maps before custom themes

**2026-04-29 — Phase 5.1 complete: Multi-level dungeon support shipped**
- Stair link tool ([K] shortcut) in GM toolbar: click stairs tile to set source, switch levels, click destination stairs to link
- Blue "L#" badges rendered on linked stairs tiles showing destination level number
- Pending stair link source highlighted with dashed orange border
- Double-click any linked stairs tile to navigate to destination level (viewport auto-centers on destination cell)
- Level tabs show 🔗 badge with link count for levels that have stair connections
- STAIR LINKS toolbar section with Link tool button, Clear Links button, and total link count
- `addStairLink()` and `removeStairLink()` functions in useMapState (bidirectional removal)
- Stair links auto-reindex on level delete, duplicate, and reorder (existing infrastructure)
- Tool state cleanup: switching away from link-stair tool clears pending source
- Priority order updated to show 5.2 as next

**2026-04-28 — Phase 4.5.3 complete: Iconic tiles shipped**
- All 13 themes: water tiles upgraded with unique per-theme liquid rendering (dungeon ripple pools, castle moat with lily pads, starship coolant bubbles, alien acid swirls, cyberpunk neon shimmer, wilderness river currents, old west water trough, steampunk steam pipe + valve, modern city fountain, post-apocalypse toxic pool, pirate bilge planks, desert oasis + palm, ancient reflecting pool + lotus)
- All 13 themes: trap tiles upgraded with thematic trap art (pressure plate, murder hole, laser grid, spore burst, electric arc, bear trap jaws, gear plate, manhole cover, landmine, cannon, quicksand spiral, cursed glyph pentagram)
- All 13 themes: treasure tiles upgraded with unique treasure art (chest with coins, crowned chest, data core, crystal cluster, data chip, buried cache, gold nuggets, clockwork gears, bank safe, supply crate, skull chest, ankh relic, sarcophagus)
- All 13 themes: start tiles upgraded with distinct entrance art (stone archway, royal banner, airlock hatch, landing beacon, neon portal, campfire, saloon doors, boiler engine, bus stop, shelter, anchor, caravan tent, obelisk)
- Print mode art pass: walls now use cross-hatching (diagonal white lines over black fill), water uses stipple dot pattern under wave lines
- Fog edge feathering: soft 1–2px gradient at revealed/hidden boundaries in both MapCanvas (live) and renderMap (exports) — always on
- All detail rendering is deterministic via `tileHash()` — no runtime randomness
- Priority order updated to show 5.1 as next

**2026-04-28 — Phase 4.5.2 complete: Theme personality shipped**
- All 13 themes: floor tiles upgraded with distinct per-theme micro-detail (flagstone mortar, checkerboard, deck plating rivets, grass blades, plank knots, circuit traces, sand stipple, spore glow, concrete aggregate, boot prints, iron rivets, rubble cracks, carved mortar grid)
- All 13 themes: wall tiles upgraded with unique material rendering (stone blocks + mortar, ashlar masonry, riveted bulkheads, holographic shimmer, windowed facade + entry, cracked concrete + rebar, foliage highlights, plank nails, gear hub, hull nails, sandstone erosion, carved relief diamonds)
- All 13 themes: door-h and door-v tiles upgraded with distinct door art (iron-banded timber, oak + plank seams, blast door chevrons, holographic glitch, membrane veins, gate crossbar, hatch ring pull, tomb hieroglyphs, glass push-bars, saloon louvers, valve gauge, barricade scrap, stone slab chevrons)
- All detail rendering is deterministic via `tileHash()` — no runtime randomness
- No changes to print mode — all art upgrades are screen-mode only
- Priority order updated to show 4.5.3 as next

**2026-04-28 — Phase 4.5.1 complete: Foundation art polish shipped**
- New `TileTheme.gridColor` field replaces hardcoded `#2d3561` grid color across all 13 themes
- Per-theme grid colors: Dungeon `#2d3561`, Castle `#5a4a30`, Starship `#1a3050`, Alien `#2d1a3a`, Cyberpunk `#1a0a2a`, Wilderness `#1a3a10`, Old West `#3a2a18`, Steampunk `#3a2810`, Modern City `#2a2a2a`, Post-Apocalypse `#2a2018`, Pirate `#2a1a0a`, Desert `#6a5020`, Ancient `#4a3a20`
- `SCREEN_GRID` constant removed from MapCanvas.tsx and renderMap.ts — global grid pass now uses `theme.gridColor`
- New `src/themes/artUtils.ts` shared utility: `tileHash(x,y)` spatial hash, `jitterColor()` for ±6–8% lightness variation, `drawWallDepth()` with 3 styles (shadow/glow/hard-edge)
- All 13 themes: floor tiles now use `jitterColor` for subtle per-cell color variation
- All 13 themes: wall tiles now use `jitterColor` + `drawWallDepth` for visual depth (shadow for fantasy themes, neon glow for sci-fi, hard-edge for modern)
- No changes to print mode — all art upgrades are screen-mode only
- Priority order updated to show 4.5.2 as next

**2026-04-29 — Phase 6.1 + 6.2 implemented: Touch Events & Responsive Layout**
- Phase 6.1: All MapCanvas mouse events replaced with Pointer Events API; pinch-to-zoom and two-finger pan gestures; long-press pan for touch; pointer capture for reliable drag; `onPointerCancel` for interrupted gestures
- Phase 6.2: 4-breakpoint responsive CSS (>1024px, 768–1024, 480–768, <480px); collapsible left toolbar with toggle; right panel as slide-in overlay drawer; header simplification at narrow widths; toolbar as bottom sheet on portrait tablets/phones
- Sprint 1 (Foundation) fully complete; Sprint 2 (UI/UX) in progress
- 2 new design decisions logged (media queries over container queries, right panel as overlay drawer)

**2026-04-28 — Phase 4.5 added: Art & Visual Polish roadmap**
- New Part 3b: Competitor Art & Visual Style Analysis — detailed review of Azgaar, Watabou, Mipui, Donjon, Dave's Mapper, and HexTML art approaches
- New Phase 4.5 with 3 sub-phases: Foundation (grid colors, tile jitter, wall depth), Theme Personality (floors, walls, doors), Iconic Tiles (treasure, traps, start, water)
- Art direction: softer/organic look inspired by Watabou and Azgaar, all 13 themes upgraded simultaneously
- Grid color picker with per-theme defaults added to Phase 4.5.1
- All art upgrades must degrade to B&W print mode
- Shadow/depth effects auto-disable on large maps if frame budget exceeded
- Phase 4.5 placed before Phase 5 in priority order
- 6 new design decisions logged

**2026-04-28 — Roadmap restructured: backend & world-mapping items moved to Far Future**
- Former Phase 5 (Collaboration & Sharing: shareable links, real-time collab, map forking) moved to Far Future — app stays client-only with no backend
- Former Phase 6.1 (Multi-Layer System), 6.3 (Geomorphic Tiles), 6.4 (World Map Generator), 6.5 (SVG Rendering) moved to Far Future — focus stays on dungeon-scale mapping
- Former Phase 7.4 (Map Search & Organization) moved to Far Future — depends on cloud storage
- Multi-Level Dungeon Support (formerly 6.2) and Custom Tile/Theme Creation (formerly 7.2) renumbered as Phase 5.1 and 5.2
- Architecture notes simplified: removed backend-dependent libraries and decisions
- Design decisions log updated with rationale

**2026-04-28 — Phase 4.3 complete: Light Sources shipped**
- `LightSource` data type (`id`, `x`, `y`, `radius`, `color`, `label`) persisted on `DungeonMap.lightSources[]`
- `computeLightVisible()` in `src/utils/lightSources.ts` computes union FOV from all light sources using the existing recursive shadowcasting engine — walls block light propagation exactly as they block sight
- 4 presets in GM toolbar LIGHT section: Torch (radius 4, orange 🕯), Lantern (radius 6, amber 🔦), Magical (radius 8, violet ✨), Custom (💡) — each sets a sensible default radius and color with one click
- Configurable radius slider (1–20 cells) and 8 color swatches (orange, amber, pale yellow, white, violet, arcane green, ice blue, infernal red)
- Place Light tool with `[I]` keyboard shortcut; Remove Light tool; Clear All button
- Ghost preview: warm glow + dashed radius circle follows cursor while Place tool is active
- Dynamic fog integration: when `dynamicFogEnabled` is true, `lightVisible` cells are treated as "visible" (clear, no fog) alongside `playerVisible` cells — torches light up areas no player can directly see
- Explored grid updated for lit cells in dynamic fog mode — previously lit areas remain "explored" (dimmed) after a light is removed
- Warm radial-gradient halos and candle-emoji icons rendered on canvas in screen mode (hidden in print mode)
- Priority order, feature inventory, and phase status updated

**2026-04-28 — Phase 7.3 complete: Measurement & Distance Tools shipped**
- Measure tool (`measure` ToolType) with [M] keyboard shortcut
- 4 measurement shapes: ruler (point-to-point), circle (radius template), cone (90° arc), line (1-cell-wide corridor)
- Chebyshev distance calculation (D&D 5e style: diagonals count as 1 square)
- Configurable feet-per-cell scale (default 5 ft) in toolbar
- Distance readout overlay with dark pill background showing "N sq · N ft"
- Scale bar on print-optimized PNG exports (toggle in Export dialog)
- Cyan-themed measurement overlays with dashed borders for visual clarity
- Priority order and feature inventory updated

**2026-04-28 — Phase 4.2 complete: Dynamic Fog of War shipped**
- Union FOV computed from all player-kind tokens via `computePlayerFOV()` in `src/utils/dynamicFog.ts`
- 3-state fog rendering: hidden (opaque) → explored (dimmed/semi-transparent) → visible (clear)
- `explored` boolean grid persisted on `DungeonMap` so exploration survives saves/reloads
- `dynamicFogEnabled` toggle in Player toolbar; manual fog tools (reveal/hide/defog) still work alongside
- "Reset Explored" button to clear exploration memory
- Notes, tokens, and initiative panel all respect dynamic fog visibility states
- Export renderer (`renderMap.ts`) supports 3-state fog for print/PNG output
- Priority order updated to reflect Phase 4.2 completion

**2026-04-28 — Phase 4.1 complete: Line-of-Sight / FOV shipped**
- Recursive shadowcasting FOV algorithm in `src/utils/fov.ts` (8-octant sweep)
- Walls, secret doors, and pillars block line of sight
- GM "Sight" tool (👁) in toolbar with [O] keyboard shortcut
- Click to set origin → darkened overlay on non-visible cells, yellow origin marker
- Click same cell to clear; overlay auto-hides when switching tools
- Stacks with existing fog overlay
- Competitor table updated: Mipui Vision/FOV marked ✅
- Shadowcasting removed from "clean-room reimplement" table (done)
- Priority order updated to reflect Phase 4.1 completion

**2026-04-28 — Phase 7.1 complete: Print-Optimized Export shipped**
- Standalone `renderMapToCanvas()` utility for offscreen high-DPI rendering
- `ExportDialog` component with DPI (72/150/300), page-size (Letter, A4), view-mode, and print-mode options
- `exportHighResPNG()` function with page tiling for large maps
- Header button (🖨 Print Export) and keyboard shortcut (Ctrl+Shift+P)
- Competitor table updated: Mipui multi-resolution export marked ✅
- Priority order updated to reflect Phase 7.1 completion

**2026-04-28 — Phase 3 complete: Village Generator shipped**
- New `village` generator added (4th generator type)
- BSP-based district/building layout with street network
- Per-theme ward palettes for 13 themes
- Optional town walls with gates
- Tile-mix sliders (walls, building size, treasure, traps)
- Theme-aware POI labels for village context
- Competitor tables updated (Watabou BSP/wards/walls, Azgaar settlements)
- BSP/A* removed from "clean-room reimplement" table (done)
- Priority order updated to reflect Phase 3 completion

**2026-04-28 — Initial committed version (revised from chat-based plan)**
- Part 1 updated to reflect all features shipped in Phases 1 & 2
- Competitor tables updated with new ✅ marks for shipped features
- Former Phase 2.5 (Town/Settlement Generator) promoted to Phase 3
- Former Phase 3 (Hex Grid Support) removed entirely — not a desired feature
- Subsequent phases renumbered to be contiguous
- Priority order updated to reflect completed work
- Hex grid entries removed from architecture notes
- Already-implemented algorithms removed from "clean-room reimplement" table
