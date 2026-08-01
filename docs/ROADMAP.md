# Dungeon-Mapper Competitive Analysis & Feature Roadmap

> **Last updated:** 2026-07-31
> **Status:** Phases 1–12 are **COMPLETE**. The full implementation history for every
> completed phase, the retrospective UI/accessibility/refactoring analyses, the recommended
> priority ordering, and the dated Changes History now live in
> [archive/ROADMAP-history.md](./archive/ROADMAP-history.md). This document keeps the current
> feature inventory, competitor reference, forward-looking roadmap, and design rationale.

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

## Part 4: Active & Future Roadmap

Phases 1–12 shipped and are archived in [archive/ROADMAP-history.md](./archive/ROADMAP-history.md).
The items below are the only forward-looking work; most require backend infrastructure or a
fundamentally different product scope (world-scale mapping) and are not on the active build queue.

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
