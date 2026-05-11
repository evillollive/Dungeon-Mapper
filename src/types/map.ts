export type BuiltInTileType =
  | 'empty' | 'floor' | 'wall' | 'door-h' | 'door-v' | 'secret-door'
  | 'locked-door-h' | 'locked-door-v'
  | 'trapped-door-h' | 'trapped-door-v'
  | 'portcullis' | 'archway' | 'barricade'
  | 'stairs-up' | 'stairs-down' | 'water' | 'pillar'
  | 'trap' | 'treasure' | 'start' | 'background';

export type CustomTileType = `custom:${string}`;
export type TileType = BuiltInTileType | CustomTileType;

export interface CustomTileDefinition {
  id: CustomTileType;
  label: string;
  color: string;
  /** Optional uploaded PNG/JPEG/WebP artwork stored as a data URL. */
  imageDataUrl?: string;
  /**
   * Built-in tile behavior this custom tile follows for systems that need
   * semantics (line of sight, print fallback, generators, etc.).
   */
  baseType: BuiltInTileType;
}

export interface CustomThemeDefinition {
  id: `custom-theme:${string}`;
  name: string;
  baseThemeId: string;
  gridColor: string;
  tileColors: Partial<Record<BuiltInTileType, string>>;
  tileLabels: Partial<Record<BuiltInTileType, string>>;
  customTiles: CustomTileDefinition[];
}

export interface Tile {
  type: TileType;
  noteId?: number;
  /**
   * Optional per-tile theme override. When set, this tile is rendered using
   * the named theme instead of the map's current `meta.theme`. This is used
   * to preserve the visual style of tiles that were painted under a previous
   * theme when the user opts in to the "preserve tiles when switching
   * themes" mode, so terrain styles from multiple themes can coexist on a
   * single map. When unset, the tile follows the current map theme.
   */
  theme?: string;
}

export interface MapNote {
  id: number;
  x: number;
  y: number;
  label: string;
  description: string;
  /**
   * Internal classification used by the procedural generators so the UI /
   * future logic can tell whether a note represents an actual room (a
   * carved room archetype like "Strongroom", or a POI whose label happens
   * to name a room such as "Gatehouse" / "Lobby") versus a non-room point
   * of interest (entrance markers, treasure, traps, …). The generators
   * guarantee that no `kind: 'room'` note is ever placed inside another
   * `kind: 'room'` note's footprint, so consumers can rely on this tag
   * for hierarchy. Optional for backward compatibility with notes saved
   * before the field existed and with manually-authored notes (treat
   * absent as untagged).
   */
  kind?: 'room' | 'poi';
}

export interface MapMeta {
  name: string;
  width: number;
  height: number;
  tileSize: number;
  theme?: string;
}

export type TokenKind = 'player' | 'npc' | 'monster';

export interface Token {
  id: number;
  /** Tile-aligned X coordinate of the token's top-left cell. */
  x: number;
  /** Tile-aligned Y coordinate of the token's top-left cell. */
  y: number;
  kind: TokenKind;
  label: string;
  /** Optional override fill color; defaults are derived from `kind`. */
  color?: string;
  /** Optional emoji/icon; falls back to first letter of `label`. */
  icon?: string;
  /**
   * Footprint size in tiles (size × size). Defaults to 1 (single cell).
   * Currently only used by monster tokens (1 = small, 2 = medium,
   * 3 = large). The token's `(x, y)` is the top-left cell of the
   * footprint and the token occupies `[x, x + size) × [y, y + size)`.
   */
  size?: number;
}

export type MarkerShape = 'circle' | 'square' | 'diamond';

export interface ShapeMarker {
  id: number;
  /** Tile-aligned X coordinate of the marker's center cell. */
  x: number;
  /** Tile-aligned Y coordinate of the marker's center cell. */
  y: number;
  shape: MarkerShape;
  /** Hex color (e.g. '#dc2626'). */
  color: string;
  /**
   * Radius in tiles (1 = covers 1 tile out from center in each direction,
   * i.e. a 3×3 footprint). Minimum 1.
   */
  size: number;
}

export const MARKER_SHAPES: MarkerShape[] = ['circle', 'square', 'diamond'];

// ── Light Sources ──────────────────────────────────────────────────────────

export type LightSourcePreset = 'torch' | 'lantern' | 'magical' | 'custom';

export interface LightSource {
  id: number;
  /** Tile-aligned X coordinate of the light's origin cell. */
  x: number;
  /** Tile-aligned Y coordinate of the light's origin cell. */
  y: number;
  /** Illumination radius in cells (Chebyshev). */
  radius: number;
  /** Hex glow color rendered on the canvas (e.g. '#f97316'). */
  color: string;
  /** Display name shown in the toolbar and future UI. */
  label: string;
}

/**
 * Built-in light source presets. Each preset has a representative radius,
 * colour, and display icon so the toolbar can offer one-click placement
 * without requiring the user to dial in every value manually.
 */
export const LIGHT_SOURCE_PRESETS: {
  id: LightSourcePreset;
  label: string;
  radius: number;
  color: string;
  icon: string;
}[] = [
  { id: 'torch',   label: 'Torch',   radius: 4, color: '#f97316', icon: '🕯' },
  { id: 'lantern', label: 'Lantern', radius: 6, color: '#fbbf24', icon: '🔦' },
  { id: 'magical', label: 'Magical', radius: 8, color: '#a78bfa', icon: '✨' },
  { id: 'custom',  label: 'Custom',  radius: 5, color: '#ffffff', icon: '💡' },
];

// ── Asset / Stamp Library ───────────────────────────────────────────────────

export type StampCategory =
  | 'furniture'
  | 'dungeon-dressing'
  | 'nature'
  | 'structures'
  | 'markers'
  | 'custom';

export interface StampSvgPath {
  path: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface StampDef {
  id: string;
  name: string;
  category: StampCategory;
  /** Optional theme id; absent means the stamp is universal. */
  themeId?: string;
  /** SVG viewBox, e.g. "0 0 512 512". */
  viewBox: string;
  /** Single-path shorthand for simple stamps. */
  svgPath?: string;
  /** Multi-path definition for stamps that need layered fills/strokes. */
  paths?: StampSvgPath[];
  /** Base64 data URL for custom uploaded PNG/SVG stamps. */
  imageDataUrl?: string;
}

export interface PlacedStamp {
  id: number;
  stampId: string;
  /** Tile-aligned X coordinate of the stamp center. */
  x: number;
  /** Tile-aligned Y coordinate of the stamp center. */
  y: number;
  /** Rotation in degrees. */
  rotation: number;
  /** Uniform scale factor. */
  scale: number;
  flipX: boolean;
  flipY: boolean;
  /** Opacity from 0 to 1. */
  opacity: number;
  /** Locked stamps cannot be moved by the placement engine. */
  locked: boolean;
}

export interface StampPlacementOptions {
  rotation?: number;
  scale?: number;
  flipX?: boolean;
  flipY?: boolean;
  opacity?: number;
  locked?: boolean;
}

export const MARKER_COLORS = [
  '#dc2626', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#a855f7', '#ec4899', '#1f2937',
];
export const MARKER_SHAPE_LABELS: Record<MarkerShape, string> = {
  circle: 'Circle',
  square: 'Square',
  diamond: 'Diamond',
};

export interface AnnotationStroke {
  id: number;
  /**
   * `'player'` strokes are drawn from the Player toolbar and visible to
   * everyone. `'gm'` strokes are reserved for GM-only annotations (rendered
   * only in GM mode); the GM toolbar does not yet expose a draw tool, but
   * the kind exists so the data model is forward-compatible.
   */
  kind: 'player' | 'gm';
  /** Polyline points expressed in *tile* coordinates (may be fractional). */
  points: { x: number; y: number }[];
  color: string;
  /** Stroke width expressed in *tile* units (typically 0.1 – 0.5). */
  width: number;
}

// ── Wall & Path Segments ─────────────────────────────────────────────────

/**
 * A free-form wall segment drawn along grid edges. Each segment is a
 * polyline whose points snap to grid-edge intersections (integer tile
 * coordinates) so walls align with the grid. Walls are geometric overlays
 * independent of the tile grid — they coexist with floor/wall tiles and
 * are rendered on top of the tile layer.
 */
export interface WallSegment {
  id: number;
  /** Polyline points in tile coordinates (integers, snapped to grid intersections). */
  points: { x: number; y: number }[];
  /** Stroke color (CSS color string). */
  color: string;
  /** Stroke thickness in tile units (e.g., 0.08 = thin wall line). */
  thickness: number;
}

/**
 * A free-form path/road segment connecting areas with a natural-looking
 * line. Unlike wall segments, path points are NOT snapped to grid edges —
 * they use fractional tile coordinates for smooth, organic curves. Paths
 * are rendered with rounded caps and joins for a softer appearance.
 */
export interface PathSegment {
  id: number;
  /** Polyline points in tile coordinates (fractional for smooth curves). */
  points: { x: number; y: number }[];
  /** Stroke color (CSS color string). */
  color: string;
  /** Stroke width in tile units (e.g., 0.3 = moderate road width). */
  width: number;
}

// ── Room Shapes (Phase 10: Dynamic Rooms) ─────────────────────────────────

/**
 * Cardinal edge direction on a rectangular room shape. Used by `DoorHint`
 * to specify where a door should (or should not) appear.
 */
export type RoomEdge = 'n' | 's' | 'e' | 'w';

/**
 * A hint that tells the rasterizer what to place at a specific cell along
 * a room's boundary edge. If `type` is a door tile, the rasterizer inserts
 * the door tile instead of a wall at that position. `'wall'` forces a
 * wall even if visual merging (Phase 10.3) would dissolve it.
 */
export interface DoorHint {
  /** Which edge of the room this hint applies to. */
  edge: RoomEdge;
  /**
   * Offset along the edge in tiles from the edge's start (left-to-right
   * for n/s edges, top-to-bottom for e/w edges). Must be ≥ 0 and less
   * than the edge length.
   */
  offset: number;
  /** The tile type to place at this position. Defaults to 'door-h' or 'door-v' based on edge. */
  type?: TileType;
}

/**
 * A logical room shape that rasterizes onto the tile grid. For v1 only
 * rectangular rooms are supported (Phase 10.6 adds circles and polygons).
 *
 * Room shapes are additive — they coexist with individually-painted tiles.
 * The rasterizer fills interior cells with `fillTile` (default `'floor'`)
 * and outlines the perimeter with `wallTile` (default `'wall'`), then
 * applies any `doorHints`.
 */
export interface RoomShape {
  /** Unique identifier within the map. */
  id: number;
  /** Top-left X coordinate in tile units (integer). */
  x: number;
  /** Top-left Y coordinate in tile units (integer). */
  y: number;
  /** Width in tiles (must be ≥ 1). */
  width: number;
  /** Height in tiles (must be ≥ 1). */
  height: number;
  /** Tile type used for interior cells. Defaults to `'floor'`. */
  fillTile?: TileType;
  /** Tile type used for perimeter cells. Defaults to `'wall'`. */
  wallTile?: TileType;
  /** Optional door hints along the room boundary. */
  doorHints?: DoorHint[];
}

/**
 * An imported background image rendered behind the tile grid. Useful for
 * tracing existing battlemaps or using pre-made art as a backdrop. The
 * image data is stored as a data-URL so it round-trips through JSON
 * export/import and IndexedDB auto-save.
 */
export interface BackgroundImage {
  /** Base-64 data-URL of the imported image (PNG or JPEG). */
  dataUrl: string;
  /** Horizontal offset in tiles (can be fractional). */
  offsetX: number;
  /** Vertical offset in tiles (can be fractional). */
  offsetY: number;
  /** Scale factor (1 = 1 image pixel per tile pixel at current tileSize). */
  scale: number;
  /** Opacity 0–1 for blending under the tile grid. */
  opacity: number;
}

// ── Paper Texture ──────────────────────────────────────────────────────────

/** Built-in paper texture pattern names. */
export type PaperTexturePattern = 'parchment' | 'linen' | 'canvas' | 'watercolor' | 'marble';

/**
 * Settings for the optional parchment / paper background layer. When
 * enabled, a procedural texture is rendered behind the tile grid to give
 * the map a hand-crafted, tabletop feel. The texture respects the
 * current theme via per-theme tint colours and is disabled in print mode.
 */
export interface PaperTextureSettings {
  /** Whether the paper texture layer is active. */
  enabled: boolean;
  /** Paper texture pattern. Defaults to `'parchment'`. */
  pattern: PaperTexturePattern;
  /** Overall opacity of the paper layer (0–1). Defaults to 0.6. */
  opacity: number;
  /** Grain noise intensity (0–1). Defaults to 0.3. */
  grain: number;
  /** Vignette intensity — darkened edges (0–1). Defaults to 0.25. */
  vignette: number;
  /**
   * Optional custom tint colour override. When unset, the theme's
   * default `paperTint` colour is used.
   */
  tintOverride?: string;
}

/** Sensible defaults for a freshly-enabled paper texture. */
export const DEFAULT_PAPER_TEXTURE: PaperTextureSettings = {
  enabled: true,
  pattern: 'parchment',
  opacity: 0.6,
  grain: 0.3,
  vignette: 0.25,
};

/** Edge blending style presets. */
export type EdgeBlendStyle = 'dither' | 'smooth' | 'stipple';

/**
 * Settings for stochastic edge blending between adjacent tiles of
 * different types (e.g. floor/wall, floor/water). When enabled, the
 * renderer draws per-theme blend masks at tile boundaries to soften
 * the hard grid stepping.  Disabled in print mode by default.
 */
export interface EdgeBlendSettings {
  /** Whether edge blending is active. */
  enabled: boolean;
  /** Blend style. `'dither'` is stochastic noise, `'smooth'` is gradient,
   *  `'stipple'` is dot-pattern. Defaults to `'dither'`. */
  style: EdgeBlendStyle;
  /** Blend intensity / width as a fraction of tile size (0–1). Defaults to 0.35. */
  intensity: number;
  /** Overall opacity of the blend layer (0–1). Defaults to 0.6. */
  opacity: number;
}

/** Sensible defaults for a freshly-enabled edge blend. */
export const DEFAULT_EDGE_BLEND: EdgeBlendSettings = {
  enabled: true,
  style: 'dither',
  intensity: 0.35,
  opacity: 0.6,
};

// ── Hand-Drawn Mode ────────────────────────────────────────────────────────

/** Hand-drawn rendering style presets. */
export type HandDrawnStyle = 'sketchy' | 'pencil' | 'ink';

/**
 * Settings for the hand-drawn rendering mode. When enabled, grid lines
 * and tile-boundary walls are rendered with wobbly, jittered strokes
 * (Perlin-inspired offsets), and wall tiles receive cross-hatch shading
 * to evoke a Dyson / Watabou hand-drawn cartography aesthetic.
 *
 * The renderer honours the print-mode B&W contract: in print mode, the
 * hand-drawn effect uses solid black strokes on white.
 */
export interface HandDrawnSettings {
  /** Whether the hand-drawn rendering mode is active. */
  enabled: boolean;
  /** Visual style preset. `'sketchy'` has loose lines, `'pencil'` is
   *  softer/thinner, `'ink'` is bold with higher contrast. Defaults to `'sketchy'`. */
  style: HandDrawnStyle;
  /** Wobble amplitude as a fraction of tile size (0–1). Controls how
   *  far grid lines deviate from straight. Defaults to 0.3. */
  wobble: number;
  /** Cross-hatch density for wall tiles (0–1). Higher values draw more
   *  hatch lines. Defaults to 0.5. */
  crossHatch: number;
  /** Overall opacity of the hand-drawn overlay (0–1). Defaults to 0.8. */
  opacity: number;
}

/** Sensible defaults for a freshly-enabled hand-drawn mode. */
export const DEFAULT_HAND_DRAWN: HandDrawnSettings = {
  enabled: true,
  style: 'sketchy',
  wobble: 0.3,
  crossHatch: 0.5,
  opacity: 0.8,
};

// ── Art Style Presets ────────────────────────────────────────────────────

/**
 * Built-in art style preset identifiers. Each preset configures all four
 * art system layers (paper texture, edge blending, hand-drawn mode,
 * lighting & atmosphere) with curated settings for a particular visual
 * style. `'custom'` indicates the user has manually tweaked settings.
 */
export type ArtStylePresetId = 'classic' | 'hand-drawn' | 'painted' | 'minimal' | 'print' | 'custom';

/** Human-readable labels for each preset, ordered for UI display. */
export const ART_STYLE_PRESET_IDS: readonly ArtStylePresetId[] = [
  'classic', 'hand-drawn', 'painted', 'minimal', 'print',
] as const;

/** Display labels for presets. */
export const ART_STYLE_PRESET_LABELS: Record<ArtStylePresetId, string> = {
  'classic': 'Classic',
  'hand-drawn': 'Hand-Drawn',
  'painted': 'Painted',
  'minimal': 'Minimal',
  'print': 'Print',
  'custom': 'Custom',
};

// ── Lighting & Atmosphere ───────────────────────────────────────────────

/** Day/night/dusk color grading presets. */
export type ColorGradingMode = 'day' | 'night' | 'dusk' | 'none';

/**
 * Settings for the lighting & atmosphere system. Provides three layers:
 *
 * 1. **Ambient Occlusion** — darkens inner corners where wall tiles meet,
 *    simulating realistic shadow gathering in tight spaces.
 * 2. **Stamp Shadows** — adds a soft drop-shadow beneath placed stamps to
 *    give them depth and visual lift from the map surface.
 * 3. **Color Grading** — applies a scene-wide tint overlay (day / night /
 *    dusk) to shift the overall mood of the map.
 *
 * Disabled in print mode by default.
 */
export interface LightingAtmosphereSettings {
  /** Whether the lighting & atmosphere system is active. */
  enabled: boolean;
  /** Ambient occlusion intensity (0–1). Higher values produce darker
   *  corner shadows. Defaults to 0.4. */
  aoIntensity: number;
  /** Ambient occlusion radius as a fraction of tile size (0–1). Controls
   *  how far the shadow spreads from corners. Defaults to 0.35. */
  aoRadius: number;
  /** Stamp shadow opacity (0–1). Controls how visible the drop-shadow
   *  beneath stamps is. Defaults to 0.3. */
  stampShadowOpacity: number;
  /** Stamp shadow offset as a fraction of tile size (0–1). Defaults to 0.1. */
  stampShadowOffset: number;
  /** Color grading mode. `'none'` disables the tint overlay. Defaults to `'none'`. */
  colorGrading: ColorGradingMode;
  /** Color grading intensity (0–1). Controls how strongly the tint
   *  overlay affects the scene. Defaults to 0.25. */
  colorGradingIntensity: number;
  /** Overall opacity of the lighting & atmosphere layer (0–1). Defaults to 0.8. */
  opacity: number;
}

/** Sensible defaults for a freshly-enabled lighting & atmosphere layer. */
export const DEFAULT_LIGHTING_ATMOSPHERE: LightingAtmosphereSettings = {
  enabled: true,
  aoIntensity: 0.4,
  aoRadius: 0.35,
  stampShadowOpacity: 0.3,
  stampShadowOffset: 0.1,
  colorGrading: 'none',
  colorGradingIntensity: 0.25,
  opacity: 0.8,
};

export interface DungeonMap {
  meta: MapMeta;
  tiles: Tile[][];
  notes: MapNote[];
  /**
   * Per-tile fog-of-war flags parallel to `tiles`. `true` means the cell is
   * hidden from players. Optional for backward-compat with maps saved
   * before the player-view feature; treat absent as "all revealed".
   */
  fog?: boolean[][];
  /** Whether fog is active for this map. Off by default. */
  fogEnabled?: boolean;
  /**
   * When `true`, fog is driven automatically by player-token FOV: cells
   * visible from any player token are revealed, previously-seen cells are
   * dimmed ("explored"), and unseen cells remain fully fogged. The manual
   * fog tools still work alongside this mode. Optional for backward-compat;
   * treat absent as `false`.
   */
  dynamicFogEnabled?: boolean;
  /**
   * Per-tile "explored" flags parallel to `tiles`. `true` means the cell
   * has been seen at some point by a player token's FOV. Used only when
   * `dynamicFogEnabled` is `true` to render the 3-state fog overlay
   * (hidden → explored/dimmed → visible/clear). Optional; treat absent as
   * "nothing explored yet".
   */
  explored?: boolean[][];
  /** Player / NPC / monster tokens placed on the map. */
  tokens?: Token[];
  /** Free-form pen strokes drawn over the map. */
  annotations?: AnnotationStroke[];
  /** Shape/area markers placed on the map (spell AoE, hazard zones, etc.). */
  markers?: ShapeMarker[];
  /**
   * Ordered list of token ids representing the initiative order shown in
   * the right-hand Initiative panel. The order is GM-controlled (drag to
   * reorder) and persisted with the map. Tokens are appended in placement
   * order and removed automatically when a token is removed from the map.
   */
  initiative?: number[];
  /**
   * Optional imported background image rendered behind the tile grid.
   * Persisted with auto-save and JSON export so the background survives
   * round-trips.
   */
  backgroundImage?: BackgroundImage;
  /**
   * Light source markers placed on the map. Each light source projects an
   * FOV-limited illumination radius that interacts with the dynamic fog
   * system: when `dynamicFogEnabled` is `true`, cells inside a light
   * source's field of view are treated as visible (clear) regardless of
   * whether any player token can see them. Light sources are purely
   * visual when dynamic fog is off. Optional; treat absent as no lights.
   */
  lightSources?: LightSource[];
  /** Placeable map-object stamps such as furniture, dressing, or markers. */
  stamps?: PlacedStamp[];
  /** Free-form wall segments drawn along grid edges. */
  wallSegments?: WallSegment[];
  /** Free-form path/road segments connecting areas. */
  pathSegments?: PathSegment[];
  /**
   * Optional parchment / paper background texture layer. When present and
   * `enabled`, a procedural texture with per-theme tinting is rendered
   * behind the tile grid. Disabled in print mode by default.
   */
  paperTexture?: PaperTextureSettings;
  /**
   * Optional edge blending layer. When present and `enabled`, stochastic
   * dithering is rendered at boundaries between different tile types to
   * soften grid stepping. Per-theme blend masks are used. Disabled in
   * print mode by default.
   */
  edgeBlend?: EdgeBlendSettings;
  /**
   * Optional hand-drawn rendering mode. When present and `enabled`,
   * grid lines are drawn with wobbly jitter and wall tiles receive
   * cross-hatch shading for a hand-crafted cartography look. Works in
   * both screen mode and print mode (B&W strokes).
   */
  handDrawn?: HandDrawnSettings;
  /**
   * Optional lighting & atmosphere layer. When present and `enabled`,
   * ambient occlusion shadows in wall corners, soft shadows under stamps,
   * and day/night/dusk color grading are rendered. Disabled in print mode
   * by default.
   */
  lightingAtmosphere?: LightingAtmosphereSettings;
  /**
   * Active art style preset. When set to a built-in preset id, the four
   * art layers (paper texture, edge blending, hand-drawn, lighting) are
   * configured with curated settings. `'custom'` means the user has
   * manually adjusted individual layer settings.
   */
  artStylePreset?: ArtStylePresetId;
  /**
   * Logical room shapes that rasterize onto the tile grid. When shapes are
   * present the rasterizer produces floor + wall tiles from them on every
   * edit; individual tile painting still works on top of rasterized output
   * (no lock). Optional for backward-compat; treat absent as no shapes.
   */
  roomShapes?: RoomShape[];
}

// ── Multi-Level Project ────────────────────────────────────────────────────

/**
 * An explicit stair connection between two levels. Each link records the
 * source and destination level indices and tile coordinates. Links are
 * bidirectional by convention: a single entry covers travel in both
 * directions.
 */
export interface StairLink {
  fromLevel: number;
  fromCell: { x: number; y: number };
  toLevel: number;
  toCell: { x: number; y: number };
}

/**
 * A saved scene/room template. Captures tile data, notes, and stamps from
 * a rectangular selection so the region can be stamped onto any level.
 */
export interface SceneTemplate {
  id: string;
  name: string;
  /** Tile data from the copied region. */
  tiles: Tile[][];
  /** Notes within the region (coordinates relative to region origin). */
  notes: MapNote[];
  /** Stamps within the region (coordinates relative to region origin). */
  stamps: PlacedStamp[];
  width: number;
  height: number;
  /** ISO timestamp when the template was saved. */
  createdAt: string;
}

/**
 * Top-level container for a multi-level dungeon project. Wraps an ordered
 * array of `DungeonMap` levels plus project-level metadata. A single-map
 * file is simply a 1-level project. The `activeLevelIndex` tracks which
 * level the user was last editing (for autosave / session restore).
 */
export interface DungeonProject {
  /** Project display name (shown in the header). */
  name: string;
  /** Ordered list of dungeon levels. At least one level is always present. */
  levels: DungeonMap[];
  /** Index into `levels` of the currently-active level. */
  activeLevelIndex: number;
  /** Explicit stair connections between levels. */
  stairLinks: StairLink[];
  /** Project-scoped user-created tile/theme definitions. */
  customThemes?: CustomThemeDefinition[];
  /** Project-scoped user-uploaded stamp definitions. */
  customStamps?: StampDef[];
  /** Saved scene/room templates for reuse across levels. */
  sceneTemplates?: SceneTemplate[];
}

/**
 * Type-guard: returns `true` when the payload has the shape of a
 * `DungeonProject` (has a `levels` array) rather than a bare `DungeonMap`.
 */
export function isDungeonProject(obj: unknown): obj is DungeonProject {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Array.isArray((obj as DungeonProject).levels)
  );
}

export type ToolType =
  | 'paint' | 'erase' | 'fill' | 'note' | 'line' | 'rect' | 'select'
  // GM fog tools — reveal/hide drag-rectangles of cells.
  | 'reveal' | 'hide'
  // Freehand "wipe away the fog" brush — clears fog cell-by-cell as the
  // cursor is dragged across the map. Available in the player view as a
  // more discoverable alternative to the rectangle Reveal / whole-map
  // Clear Fog buttons.
  | 'defog'
  // Player tools — visible only when viewMode === 'player'.
  | 'pdraw' | 'perase'
  | 'token-player' | 'token-npc'
  | 'token-monster' | 'token-monster-md' | 'token-monster-lg'
  | 'move-token' | 'remove-token'
  | 'marker' | 'remove-marker'
  | 'fov'
  | 'measure'
  // Light source tools — place and remove light source markers.
  | 'light' | 'remove-light'
  // Stair link tool — click stairs to link them between levels.
  | 'link-stair'
  // Stamp placement foundation.
  | 'stamp' | 'move-stamp' | 'remove-stamp'
  // GM drawing tools — freehand annotations visible only in GM view.
  | 'gmdraw' | 'gmerase'
  // Wall & path tools — free-form wall/road drawing along grid edges.
  | 'wall' | 'wall-erase' | 'path' | 'path-erase';

export type ViewMode = 'gm' | 'player';

/**
 * Shape used by the Measure tool. 'ruler' measures point-to-point
 * distance; the other shapes display spell/ability area templates.
 */
export type MeasureShape = 'ruler' | 'circle' | 'cone' | 'line';

export const MEASURE_SHAPES: MeasureShape[] = ['ruler', 'circle', 'cone', 'line'];

export const MEASURE_SHAPE_LABELS: Record<MeasureShape, string> = {
  ruler: 'Ruler',
  circle: 'Circle',
  cone: 'Cone',
  line: 'Line',
};

export const TOKEN_KIND_COLORS: Record<TokenKind, string> = {
  player: '#3b82f6',
  npc: '#22c55e',
  monster: '#dc2626',
};

export const TOKEN_KIND_LABELS: Record<TokenKind, string> = {
  player: 'Player',
  npc: 'NPC',
  monster: 'Monster',
};

export const BUILT_IN_TILE_TYPES: BuiltInTileType[] = [
  'empty', 'floor', 'wall', 'door-h', 'door-v', 'secret-door',
  'locked-door-h', 'locked-door-v',
  'trapped-door-h', 'trapped-door-v',
  'portcullis', 'archway', 'barricade',
  'stairs-up', 'stairs-down', 'water', 'pillar',
  'trap', 'treasure', 'start', 'background',
];

export function isBuiltInTileType(type: TileType): type is BuiltInTileType {
  return (BUILT_IN_TILE_TYPES as TileType[]).includes(type);
}

export const TILE_LABELS: Record<BuiltInTileType, string> = {
  empty: 'Empty',
  floor: 'Floor',
  wall: 'Wall',
  'door-h': 'Door (H)',
  'door-v': 'Door (V)',
  'secret-door': 'Secret Door',
  'locked-door-h': 'Locked Door (H)',
  'locked-door-v': 'Locked Door (V)',
  'trapped-door-h': 'Trapped Door (H)',
  'trapped-door-v': 'Trapped Door (V)',
  portcullis: 'Portcullis',
  archway: 'Archway',
  barricade: 'Barricade',
  'stairs-up': 'Stairs Up',
  'stairs-down': 'Stairs Down',
  water: 'Water',
  pillar: 'Pillar',
  trap: 'Trap',
  treasure: 'Treasure',
  start: 'Start',
  background: 'Background',
};

// Tile types shown in the toolbar palette. The 'empty' tile is intentionally
// omitted: it represents an unpainted / cleared cell (the graph-paper
// background shows through it in screen mode, and SVG/print export treat it
// as background), so a "paint empty" button would appear to do nothing on
// the map. Use the Erase tool to clear a tile back to empty.
export const ALL_TILE_TYPES: BuiltInTileType[] = [
  'floor', 'wall', 'door-h', 'door-v', 'secret-door',
  'locked-door-h', 'locked-door-v',
  'trapped-door-h', 'trapped-door-v',
  'portcullis', 'archway', 'barricade',
  'stairs-up', 'stairs-down', 'water', 'pillar',
  'trap', 'treasure', 'start', 'background',
];
