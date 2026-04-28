# Dungeon-Mapper Competitive Analysis & Feature Roadmap

> **Last updated:** 2026-04-28
> **Status:** Phases 1, 2, 3, 4.1, 4.2, 4.3, 7.1, & 7.3 complete. Phase 5+ in planning.

---

## Part 1: Current Feature Inventory

Dungeon-Mapper is a React + TypeScript + Vite single-page app with Canvas-based rendering. It currently offers:

- Square grid maps (8×8 to 128×128 tiles, **20 tile types**)
- 4 procedural generators: Rooms & Corridors, Open Terrain, Cavern, **Village** (all seeded/deterministic)
- **8 dungeon shape masks** (rectangle, circle, diamond, cross, L-shape, T-shape, hexagon, octagon)
- **Corridor style control** with continuity slider (0%–100%) across 4 pluggable strategies
- **Dead-end removal** with configurable fraction slider
- **Richer door generation** with probabilistic type distribution (archway, locked, trapped, portcullis, barricade)
- **Procedural name generation** (theme-aware, 13 themes)
- 13 visual themes (Dungeon, Castle, Wilderness, Starship, etc.)
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
- Undo/Redo (50-step history)
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
| Elevation/stairs visualization | Multi-level passage indicators | Partial |
| Copy/paste regions | Selection-based content duplication | ✅ |
| Image import tool | Import existing battlemaps | ✅ |
| Multi-resolution export | 32px, 64px, 192px, 300 DPI battlemap | ✅ |
| Sparse grid storage | Only populated cells stored (infinite grid potential) | ❌ |
| Tile caching (DOM→PNG) | Performance optimization for large maps | ❌ |
| Operation-based sync | Conflict-free operation ordering | ❌ |
| Forking/remixing maps | Create derivatives of shared maps | ❌ |

### HexTML (No License Specified)

Repo: playest/hextml | Stack: JavaScript + HTML5 Canvas

| Feature | Description | We Have It? |
|---|---|---|
| Hexagonal grid | Pointy-top and flat-top hex support | ❌ (not planned) |
| Custom tile uploads | User-provided tile graphics | ❌ |
| Secret/private notes | GM-only vs player-visible annotations | ✅ (via fog) |
| Submap/layer system | Multi-level map organization | ❌ |
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

### Phase 5: Collaboration & Sharing

Transform from a single-device tool to a shared experience.

**5.1 — Shareable Map Links**
- Cloud storage for maps (Firebase, Supabase, or similar)
- Generate shareable URLs; read-only sharing gives Player View automatically
- No registration required for viewing
- Inspired by: Mipui's no-registration link sharing

**5.2 — Real-Time Collaboration**
- Multi-user simultaneous editing via operation-based sync
- GM edits tiles/fog; players move their tokens
- Conflict resolution via operation ordering; presence indicators
- Inspired by: Mipui (MIT — can adapt sync patterns freely)
- Why: Single biggest feature gap vs. Mipui

**5.3 — Map Forking & Templates**
- Fork/duplicate shared maps as starting points
- Curated template library of pre-built maps
- Community sharing gallery (longer-term)

### Phase 6: Advanced Rendering & World Building

Longer-term features that expand map richness.

**6.1 — Multi-Layer System**
- Replace single tile grid with a layer stack (floor, walls, objects, GM overlay, annotations)
- Per-layer visibility toggling; layer-specific tools
- Why: Layers enable richer maps without tile-type limitations

**6.2 — Multi-Level Dungeon Support**
- Link multiple maps as dungeon levels
- Stairs connect specific cells between levels; level navigator UI
- Why: Multi-floor dungeons are common but require manually managing separate files today

**6.3 — Geomorphic Tile Assembly Mode**
- Assemble pre-drawn tile art into seamless maps with edge-matching constraints
- Bundle default geomorph tiles; allow custom tile uploads
- Inspired by: Dave's Mapper (GPL — study concept only, reimplement)

**6.4 — World/Region Map Generator (New Generator)**
- 5th generator for world-scale maps
- Voronoi-based terrain with heightmap, biome assignment, river generation, political boundaries, settlement placement
- Inspired by: Azgaar (MIT — can study algorithms freely)
- Why: Most ambitious feature — positions us as a comprehensive mapping suite
- **Note:** Depends on 6.1 (Multi-Layer) and likely 6.5 (SVG rendering) for usability at world scale

**6.5 — SVG/Vector Rendering Option**
- Optional SVG rendering mode alongside Canvas
- Benefits: infinite zoom quality, better print output, CSS styling
- Why: Canvas works for dungeon-scale; world-scale needs vector

### Phase 7: Quality-of-Life & Polish

Smaller features that improve the overall experience.

**~~7.1 — Print-Optimized Export~~** ✅ COMPLETE
- ✅ Multi-DPI export (72, 150, 300 DPI) at 1 inch per tile cell
- ✅ Grid-aligned rendering for VTT import
- ✅ Page-size presets (US Letter, A4) with automatic page tiling for large maps
- ✅ Export dialog with view mode (GM/Player) and print mode toggles
- ✅ Keyboard shortcut (Ctrl+Shift+P) and header button

**7.2 — Custom Tile/Theme Creation**
- User-defined custom tile types with uploaded graphics
- Custom theme builder with color picker and tile assignment

**~~7.3 — Measurement & Distance Tools~~** ✅ COMPLETE
- ✅ Ruler/measurement tool showing distance in grid squares and feet (Chebyshev/D&D distance)
- ✅ Circle, cone, and line measurement templates for spell areas
- ✅ Configurable scale (feet per cell, default 5 ft)
- ✅ Scale bar on exported maps (PNG print export)
- ✅ Keyboard shortcut [M] for measure tool

**7.4 — Map Search & Organization**
- Map search/filter (if cloud storage added in Phase 5)
- Tags, folders, or categories for organizing saved maps; recent maps list

---

## Part 5: Recommended Priority Order

### Next Up — Completed ✅
- ~~**Phase 4.1** — Line-of-Sight / FOV~~ ✅
- ~~**Phase 4.2** — Dynamic Fog of War~~ ✅
- ~~**Phase 7.3** — Measurement & Distance Tools~~ ✅
- ~~**Phase 4.3** — Light Sources~~ ✅

### Medium-Term — New Generation & Advanced Features
- **Phase 6.2** — Multi-Level Dungeon Support *(high demand, moderate complexity)*
- **Phase 7.2** — Custom Tile/Theme Creation

### Long-Term Vision
- **Phase 5.1–5.2** — Cloud Sharing & Real-Time Collaboration *(requires backend decision)*
- **Phase 5.3** — Map Forking & Templates
- **Phase 6.1** — Multi-Layer System *(biggest refactor; needed before 6.4)*
- **Phase 6.3** — Geomorphic Tile Assembly
- **Phase 6.4** — World/Region Map Generator *(most ambitious; depends on 6.1, probably 6.5)*
- **Phase 6.5** — SVG/Vector Rendering Option
- **Phase 7.4** — Map Search & Organization *(depends on Phase 5)*

---

## Part 6: Technical Architecture Notes

### Algorithm Study Sources (Clean-Room Reimplementation Required)

| Algorithm | Study From | License Constraint |
|---|---|---|
| Voronoi + Lloyd relaxation | Azgaar (MIT) or Watabou (GPL—study only) | Reimplement; use `delaunator` npm package |
| Operation-based sync | Mipui (MIT) | Can adapt freely |
| Tile caching (DOM→PNG) | Mipui (MIT) | Can adapt freely |

### Recommended New Dependencies (to investigate when implementing)

| Feature | Candidate Library | Purpose |
|---|---|---|
| Voronoi/Delaunay | `delaunator` (ISC) | Town/world generation tessellation |
| Label placement | `polylabel` (ISC) | Optimal text placement in polygons |
| Collaboration backend | Firebase or Supabase | Real-time sync and cloud storage |
| Icon set expansion | game-icons.net SVG set (CC-BY) | Additional token icons |

### Key Architectural Decisions Needed Before Starting

1. **Canvas vs SVG vs Hybrid:** Current Canvas renderer works for dungeon-scale. World-scale maps (Phase 6.4) and multi-layer support (Phase 6.1) may push toward SVG or a hybrid. Decide before Phase 6.
2. **Backend choice:** Cloud sharing (Phase 5) requires a backend. Firebase is proven (Mipui uses it) but creates vendor lock-in. Supabase is open-source alternative.
3. **Layer architecture:** The multi-layer system (Phase 6.1) would be the biggest refactor. Plan the data model early so Phases 3–5 are compatible.

---

## Design Decisions Log

| Decision | Date | Rationale |
|---|---|---|
| No hex grid support | 2026-04-28 | Non-square tiles not desired; removes former Phase 3 entirely |
| Town generator as standalone phase | 2026-04-28 | Scope and algorithmic complexity warrants its own phase rather than being part of generation upgrades |
| BSP over Voronoi for village gen | 2026-04-28 | BSP partitioning produces clean rectangular buildings that map well to the existing square-grid tile system; Voronoi deferred to world-map scale (Phase 6.4) |

---

## Changes History

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
