# Dungeon-Mapper Competitive Analysis & Feature Roadmap

> **Last updated:** 2026-04-29
> **Status:** Phases 1, 2, 3, 4.1, 4.2, 4.3, 4.5.1, 4.5.2, 4.5.3, 5.1, 5.2, 5.3, 7.1, & 7.3 complete.

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
| GM overlay layer | Hidden content visible only to GM | Partial (fog) |
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

### Medium-Term — Active Roadmap
- *(No active medium-term phase selected.)*

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

---

## Changes History

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
