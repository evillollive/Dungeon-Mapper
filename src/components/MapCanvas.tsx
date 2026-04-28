import React, { useRef, useEffect, useMemo, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import type { DungeonMap, TileType, ToolType, Token, TokenKind, ViewMode, AnnotationStroke, ShapeMarker, MarkerShape, MeasureShape, LightSource } from '../types/map';
import { TOKEN_KIND_COLORS } from '../types/map';
import { getTheme } from '../themes/index';
import { drawPrintTile, PRINT_BG, PRINT_GRID } from '../themes/printMode';
import { drawTileOverlay } from '../themes/tileOverlays';
import { isTokenFogged } from '../utils/tokenVisibility';
import { ICON_BY_ID } from '../utils/iconLibrary';

// Screen-mode canvas styling: light graph-paper background with cyan grid lines,
// evoking traditional engineering / quad-ruled graph paper regardless of theme.
const SCREEN_BG = '#f4f1e4';

// Fog overlay colors. Player mode uses a fully opaque medium grey so hidden
// content is genuinely hidden but the overlay reads as "fog" rather than a
// black void. GM mode normally renders no fog overlay at all (the GM is in
// control of the map and shouldn't have it obscured); when the GM opts in
// to the "Show Fog" preview, fogged cells are painted with a translucent
// grey wash so the GM can see *what* is fogged without losing the map.
const FOG_PLAYER_FILL = '#6b7280';
const FOG_GM_FILL = 'rgba(107, 114, 128, 0.55)';
/** Dimmed overlay for explored-but-not-visible cells in dynamic fog mode. */
const EXPLORED_PLAYER_FILL = 'rgba(107, 114, 128, 0.55)';
const EXPLORED_GM_FILL = 'rgba(107, 114, 128, 0.35)';

// Cache parsed Path2D objects for icon rendering. Keyed by icon id.
const iconPath2DCache = new Map<string, Path2D>();
function getIconPath2D(iconId: string): Path2D | null {
  const cached = iconPath2DCache.get(iconId);
  if (cached) return cached;
  const def = ICON_BY_ID.get(iconId);
  if (!def) return null;
  const p = new Path2D(def.path);
  iconPath2DCache.set(iconId, p);
  return p;
}

interface MapCanvasProps {
  map: DungeonMap;
  activeTool: ToolType;
  activeTile: TileType;
  themeId: string;
  printMode: boolean;
  viewMode: ViewMode;
  /**
   * GM-only preview toggle. When `true` and the current view is GM, fogged
   * cells are painted with a translucent grey wash so the GM can see at a
   * glance what is hidden from players. When `false` (default) the GM sees
   * the unobscured map. Has no effect in player view, where fog always
   * renders as an opaque grey overlay.
   */
  gmShowFog: boolean;
  selectedNoteId: number | null;
  /**
   * Token id currently highlighted in the Initiative panel. When set, the
   * matching token is rendered with a contrasting outline ring so the GM
   * and players can quickly locate whose turn it is.
   */
  selectedTokenId?: number | null;
  drawColor: string;
  drawWidth: number;
  onSetTile: (x: number, y: number, type: TileType) => void;
  onSetTiles: (tiles: { x: number; y: number; type: TileType }[]) => void;
  onFillTile: (x: number, y: number, type: TileType) => void;
  onAddNote: (x: number, y: number) => void;
  onSelectNote: (id: number | null) => void;
  onEraseTiles: (tiles: { x: number; y: number }[]) => void;
  onSetFogCells: (cells: { x: number; y: number }[], hidden: boolean) => void;
  onAddToken: (kind: TokenKind, x: number, y: number, label?: string, size?: number) => void;
  onMoveToken: (id: number, x: number, y: number) => void;
  onRemoveToken: (id: number) => void;
  onAddAnnotation: (stroke: Omit<AnnotationStroke, 'id'>) => void;
  onRemoveAnnotation: (id: number) => void;
  onAddMarker: (shape: MarkerShape, x: number, y: number, color: string, size: number) => void;
  onRemoveMarker: (id: number) => void;
  markerShape: MarkerShape;
  markerColor: string;
  markerSize: number;
  /**
   * Notified whenever the user-painted selection rectangle changes.
   * Receives `null` when the selection is cleared (e.g. after a
   * Delete/Backspace press while the select tool is active). Used by
   * features that operate on the selected region — currently the
   * "Generate into selection" toggle in the Generate Map dialog.
   */
  onSelectionChange?: (selection: { x: number; y: number; w: number; h: number } | null) => void;
  /** Whether the internal clipboard has content to paste. */
  hasClipboard?: boolean;
  /** Width/height of the clipboard buffer (for preview overlay sizing). */
  clipboardSize?: { w: number; h: number } | null;
  /**
   * Set of `"x,y"` keys representing cells visible from the current FOV
   * origin. When non-null, a darkened overlay is painted on all cells NOT
   * in this set. Computed externally via `computeFOV()`.
   */
  fovVisible?: Set<string> | null;
  /**
   * The FOV origin cell, rendered with a distinct marker so the user can
   * see where the sight calculation originates. `null` when FOV is off.
   */
  fovOrigin?: { x: number; y: number } | null;
  /**
   * Called when the user clicks a cell while the FOV tool is active.
   * App.tsx handles toggling the origin and recomputing visibility.
   */
  onFovClick?: (x: number, y: number) => void;
  /**
   * Whether dynamic fog of war is active. When `true`, the fog overlay
   * uses 3-state rendering driven by `playerVisible` and `explored`.
   */
  dynamicFogEnabled?: boolean;
  /**
   * Set of `"x,y"` keys for cells currently in line-of-sight of at least
   * one player token. These cells are rendered fully clear (no fog overlay).
   */
  playerVisible?: Set<string> | null;
  /**
   * Per-tile "explored" flags. Explored cells that are NOT currently
   * visible are rendered with a dimmed (semi-transparent) fog overlay so
   * the player can see the map layout but knows it's no longer in view.
   */
  explored?: boolean[][] | null;
  /** Shape for the measure tool overlay. */
  measureShape?: MeasureShape;
  /** Feet per tile cell for distance readout (default 5). */
  measureFeetPerCell?: number;
  /**
   * Light sources placed on the map. Each emits a warm glow overlay on the
   * canvas and, when `dynamicFogEnabled` is true, contributes to the
   * "visible" set so lit cells are shown without fog.
   */
  lightSources?: LightSource[];
  /**
   * Set of `"x,y"` keys for cells illuminated by at least one light source.
   * Non-null only when dynamic fog is active; `null` otherwise so the
   * renderer can skip the illumination pass cheaply.
   */
  lightVisible?: Set<string> | null;
  /** Called when the user clicks a cell with the light tool. */
  onAddLightSource?: (x: number, y: number) => void;
  /** Called when the user clicks a light source cell with the remove-light tool. */
  onRemoveLightSource?: (id: number) => void;
  /** Current light radius (preview ghost). */
  lightRadius?: number;
  /** Current light glow color (preview ghost). */
  lightColor?: string;
}

export interface MapCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
  /** Pan the viewport so the given tile coordinate is centered on screen. */
  centerOnTile: (tileX: number, tileY: number) => void;
  /** Zoom in by one step (matches the in-canvas + button). */
  zoomIn: () => void;
  /** Zoom out by one step (matches the in-canvas - button). */
  zoomOut: () => void;
  /** Reset zoom to 100% and recenter the viewport. */
  zoomReset: () => void;
  /** Fit the entire map into the visible viewport. */
  fitToScreen: () => void;
  /** Pan the viewport by a delta in pixels (positive dx = right, dy = down). */
  panBy: (dx: number, dy: number) => void;
  /** Move keyboard focus to the canvas (so arrow-key panning works). */
  focus: () => void;
}

const MINIMAP_MAX_W = 160;
const MINIMAP_MAX_H = 120;

function bresenhamLine(x0: number, y0: number, x1: number, y1: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0;
  let cy = y0;
  while (true) {
    points.push({ x: cx, y: cy });
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
  return points;
}

function rectOutline(x0: number, y0: number, x1: number, y1: number): { x: number; y: number }[] {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const points: { x: number; y: number }[] = [];
  for (let x = minX; x <= maxX; x++) {
    points.push({ x, y: minY });
    if (minY !== maxY) points.push({ x, y: maxY });
  }
  for (let y = minY + 1; y < maxY; y++) {
    points.push({ x: minX, y });
    if (minX !== maxX) points.push({ x: maxX, y });
  }
  return points;
}

/** Fill (not just outline) every cell in the inclusive rectangle. Used by
 * the Reveal/Hide fog tools so a drag selects a solid block of cells. */
function rectCells(x0: number, y0: number, x1: number, y1: number): { x: number; y: number }[] {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const points: { x: number; y: number }[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      points.push({ x, y });
    }
  }
  return points;
}

function drawToken(
  ctx: CanvasRenderingContext2D,
  token: Token,
  tileSize: number,
  isSelected: boolean = false
) {
  const size = Math.max(1, Math.floor(token.size ?? 1));
  const px = token.x * tileSize + (tileSize * size) / 2;
  const py = token.y * tileSize + (tileSize * size) / 2;
  const radius = tileSize * size * 0.42;
  const fill = token.color ?? TOKEN_KIND_COLORS[token.kind];

  ctx.save();
  // Selection ring sits just outside the token disc so it doesn't obscure
  // the kind color or glyph. A bright yellow ring contrasts with every
  // token kind color and the graph-paper background.
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(px, py, radius + Math.max(2, tileSize * size * 0.1), 0, Math.PI * 2);
    ctx.lineWidth = Math.max(2, tileSize * size * 0.12);
    ctx.strokeStyle = '#ffd400';
    ctx.stroke();
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(1, tileSize * size * 0.08);
  ctx.strokeStyle = '#1a1a2e';
  ctx.stroke();

  // Foreground glyph: library icon SVG path if the token's icon field
  // matches a library id, otherwise emoji icon or the first letter of the
  // label (or the token kind).
  const iconPath = token.icon ? getIconPath2D(token.icon) : null;
  if (iconPath) {
    // Render the library SVG path. The paths use a 512×512 coordinate
    // space, so we scale and translate to fit inside the token circle.
    const iconSize = radius * 1.5; // Icon drawn at 75% of diameter
    const scale = iconSize / 512;
    ctx.save();
    ctx.translate(px - iconSize / 2, py - iconSize / 2);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fill(iconPath);
    ctx.restore();
  } else {
    const glyph = token.icon ?? (token.label?.[0] ?? token.kind[0] ?? '?').toUpperCase();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(8, tileSize * size * 0.5)}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, px, py + 0.5);
  }
  ctx.restore();
}

function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  stroke: AnnotationStroke,
  tileSize: number
) {
  if (stroke.points.length === 0) return;
  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = Math.max(1, stroke.width * tileSize);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < stroke.points.length; i++) {
    const px = stroke.points[i].x * tileSize;
    const py = stroke.points[i].y * tileSize;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  // Single-point strokes (a click without dragging) draw as a filled dot
  // so the user gets visible feedback.
  if (stroke.points.length === 1) {
    const p = stroke.points[0];
    ctx.fillStyle = stroke.color;
    ctx.beginPath();
    ctx.arc(p.x * tileSize, p.y * tileSize, Math.max(1, stroke.width * tileSize / 2), 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.stroke();
  }
  ctx.restore();
}

/** Draw a shape marker (circle, square, or diamond) with transparency. */
function drawMarker(
  ctx: CanvasRenderingContext2D,
  marker: ShapeMarker,
  tileSize: number
) {
  const cx = marker.x * tileSize + tileSize / 2;
  const cy = marker.y * tileSize + tileSize / 2;
  const r = marker.size * tileSize;
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = marker.color;
  ctx.beginPath();
  if (marker.shape === 'circle') {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  } else if (marker.shape === 'square') {
    ctx.rect(cx - r, cy - r, r * 2, r * 2);
  } else {
    // diamond
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
  }
  ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = marker.color;
  ctx.lineWidth = Math.max(1, tileSize * 0.08);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw a warm glow halo for a light source. Uses a radial gradient that
 * fades from the source's color at the origin to fully transparent at the
 * illumination radius. The glow is composited with additive blending so
 * multiple overlapping lights blend naturally rather than opaquely stacking.
 */
function drawLightGlow(
  ctx: CanvasRenderingContext2D,
  ls: LightSource,
  tileSize: number,
) {
  const cx = (ls.x + 0.5) * tileSize;
  const cy = (ls.y + 0.5) * tileSize;
  const r = ls.radius * tileSize;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0,   hexToRgba(ls.color, 0.30));
  grad.addColorStop(0.4, hexToRgba(ls.color, 0.16));
  grad.addColorStop(1,   hexToRgba(ls.color, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Draw the light source icon pinned to its origin cell. */
function drawLightIcon(
  ctx: CanvasRenderingContext2D,
  ls: LightSource,
  tileSize: number,
) {
  const cx = (ls.x + 0.5) * tileSize;
  const cy = (ls.y + 0.5) * tileSize;
  ctx.save();
  ctx.font = `${Math.max(10, tileSize * 0.55)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🕯', cx, cy);
  ctx.restore();
}

/**
 * Convert a CSS hex color (`#rrggbb` or `#rgb`) to an rgba() string with
 * the given alpha. Only the 6-digit form is common here so we handle both.
 */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  let r: number, g: number, b: number;
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
  } else {
    r = parseInt(h.substring(0, 2), 16);
    g = parseInt(h.substring(2, 4), 16);
    b = parseInt(h.substring(4, 6), 16);
  }
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Find the topmost light source whose origin cell matches (tx, ty). */
function findLightSourceAt(lightSources: LightSource[] | undefined, tx: number, ty: number): LightSource | null {
  if (!lightSources) return null;
  for (let i = lightSources.length - 1; i >= 0; i--) {
    const ls = lightSources[i];
    if (ls.x === tx && ls.y === ty) return ls;
  }
  return null;
}

/** Hit-test markers at the given fractional tile coordinate. Returns the
 * top-most matching marker. */
function findMarkerAt(markers: ShapeMarker[] | undefined, fx: number, fy: number): ShapeMarker | null {
  if (!markers) return null;
  for (let i = markers.length - 1; i >= 0; i--) {
    const m = markers[i];
    const cx = m.x + 0.5;
    const cy = m.y + 0.5;
    const dx = fx - cx;
    const dy = fy - cy;
    const r = m.size;
    if (m.shape === 'circle') {
      if (dx * dx + dy * dy <= r * r) return m;
    } else if (m.shape === 'square') {
      if (Math.abs(dx) <= r && Math.abs(dy) <= r) return m;
    } else {
      // diamond: |dx|/r + |dy|/r <= 1
      if (Math.abs(dx) / r + Math.abs(dy) / r <= 1) return m;
    }
  }
  return null;
}

/** Hit-test tokens at the given fractional tile coordinate. Returns the
 * top-most matching token (last in z-order = drawn last). Multi-cell
 * tokens (size > 1) are hit when the cursor lands on any cell of their
 * footprint. */
function findTokenAt(tokens: Token[] | undefined, fx: number, fy: number): Token | null {
  if (!tokens) return null;
  const tx = Math.floor(fx);
  const ty = Math.floor(fy);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    const sz = Math.max(1, Math.floor(t.size ?? 1));
    if (tx >= t.x && tx < t.x + sz && ty >= t.y && ty < t.y + sz) return t;
  }
  return null;
}

const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(({
  map,
  activeTool,
  activeTile,
  themeId,
  printMode,
  viewMode,
  gmShowFog,
  selectedNoteId,
  selectedTokenId,
  drawColor,
  drawWidth,
  onSetTile,
  onSetTiles,
  onFillTile,
  onAddNote,
  onSelectNote,
  onEraseTiles,
  onSetFogCells,
  onAddToken,
  onMoveToken,
  onRemoveToken,
  onAddAnnotation,
  onRemoveAnnotation,
  onAddMarker,
  onRemoveMarker,
  markerShape,
  markerColor,
  markerSize,
  onSelectionChange,
  hasClipboard,
  clipboardSize,
  fovVisible,
  fovOrigin,
  onFovClick,
  dynamicFogEnabled,
  playerVisible,
  explored,
  measureShape = 'ruler',
  measureFeetPerCell = 5,
  lightSources,
  lightVisible,
  onAddLightSource,
  onRemoveLightSource,
  lightRadius = 4,
  lightColor = '#f97316',
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // Live freehand stroke being drawn — committed to the map on mouseup.
  const [activeStroke, setActiveStroke] = useState<{ x: number; y: number }[] | null>(null);
  // Cells visited by the in-progress freehand defog brush. Held locally so
  // the player gets immediate visual feedback (the fog overlay is skipped
  // for these cells) without spamming history; the whole batch is committed
  // to the map on mouseup as a single fog edit.
  const [defogStroke, setDefogStroke] = useState<{ x: number; y: number }[] | null>(null);
  const lastDefogCellRef = useRef<{ x: number; y: number } | null>(null);
  // Cached HTMLImageElement for the optional background image. Updated
  // whenever map.backgroundImage.dataUrl changes so the main render
  // effect can drawImage() without re-decoding every frame.
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bgImageUrlRef = useRef<string | null>(null);
  // Token currently being dragged via the move-token tool. `offsetX/Y`
  // captures where inside the (possibly multi-cell) footprint the user
  // grabbed, so the token follows the cursor without snapping its
  // top-left to the cursor cell.
  const draggingTokenRef = useRef<{ id: number; lastX: number; lastY: number; offsetX: number; offsetY: number } | null>(null);
  // Forward reference for the canvas's `fitToScreen` action so the
  // imperative handle (defined before `handleFitToScreen` is in scope) can
  // dispatch to the latest implementation.
  const handleFitToScreenRef = useRef<(() => void) | null>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    centerOnTile: (tx: number, ty: number) => {
      const { width, height, tileSize: ts } = map.meta;
      setPan({
        x: (width / 2 - (tx + 0.5)) * zoom * ts,
        y: (height / 2 - (ty + 0.5)) * zoom * ts,
      });
    },
    zoomIn: () => setZoom(z => Math.min(4, z + 0.25)),
    zoomOut: () => setZoom(z => Math.max(0.25, z - 0.25)),
    zoomReset: () => { setZoom(1); setPan({ x: 0, y: 0 }); },
    fitToScreen: () => handleFitToScreenRef.current?.(),
    panBy: (dx: number, dy: number) => setPan(prev => ({ x: prev.x + dx, y: prev.y + dy })),
    focus: () => canvasRef.current?.focus(),
  }), [map.meta, zoom]);

  // Forward selection changes to the parent so features outside the canvas
  // (e.g. the Generate Map dialog's "Generate into selection" toggle) can
  // react to the user-painted rectangle. The effect runs whenever the
  // selection's identity changes, including when it's cleared to null.
  useEffect(() => {
    onSelectionChange?.(selection);
  }, [selection, onSelectionChange]);

  const { meta, tiles } = map;
  const { tileSize } = meta;
  const notes = map.notes;
  // Memoize so the array identity is stable when the underlying field is
  // unset on the map (otherwise `?? []` returns a fresh array every render
  // and trips react-hooks/exhaustive-deps).
  const tokens = useMemo(() => map.tokens ?? [], [map.tokens]);
  const annotations = useMemo(() => map.annotations ?? [], [map.annotations]);
  const markers = useMemo(() => map.markers ?? [], [map.markers]);
  const fog = map.fog;
  const fogActive = (map.fogEnabled ?? false);
  const isPlayerView = viewMode === 'player';
  const backgroundImage = map.backgroundImage;

  // Load the background image whenever the data URL changes. The decoded
  // HTMLImageElement is cached in bgImageRef so the main render effect can
  // drawImage() without re-decoding every frame. We track the URL in a
  // separate ref to avoid re-loading when only offset/scale/opacity change.
  const [bgImageReady, setBgImageReady] = useState(false);
  useEffect(() => {
    const dataUrl = backgroundImage?.dataUrl ?? null;
    if (dataUrl === bgImageUrlRef.current) return;
    bgImageUrlRef.current = dataUrl;
    if (!dataUrl) {
      bgImageRef.current = null;
      setBgImageReady(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      bgImageRef.current = img;
      setBgImageReady(true);
    };
    img.onerror = () => {
      bgImageRef.current = null;
      setBgImageReady(false);
    };
    setBgImageReady(false);
    img.src = dataUrl;
  }, [backgroundImage?.dataUrl]);

  // Notes positioned on a fogged cell are hidden from the player view so a
  // visible note number doesn't leak the existence of a hidden room.
  const visibleNotes = (fogActive && isPlayerView)
    ? notes.filter(n => {
        if (!(fog?.[n.y]?.[n.x])) return true;
        if (dynamicFogEnabled) {
          const key = `${n.x},${n.y}`;
          if (playerVisible?.has(key)) return true;
          if (explored?.[n.y]?.[n.x]) return true;
        }
        return false;
      })
    : notes;

  // Tokens are hidden from players when *any* cell of their footprint sits
  // under fog — otherwise a multi-cell monster anchored on a fogged cell
  // could still be visible (or vice-versa) and leak the GM's prep.
  const visibleTokens = (fogActive && isPlayerView)
    ? tokens.filter(t => !isTokenFogged(t, fog, dynamicFogEnabled ? playerVisible : undefined, explored))
    : tokens;

  // Main render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const theme = getTheme(themeId);

    const w = meta.width * tileSize;
    const h = meta.height * tileSize;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = printMode ? PRINT_BG : SCREEN_BG;
    ctx.fillRect(0, 0, w, h);

    // Background image layer — rendered behind the tile grid so GMs can
    // trace over an imported battlemap. Hidden in print mode.
    const bgImg = bgImageRef.current;
    if (bgImg && backgroundImage && !printMode) {
      ctx.save();
      ctx.globalAlpha = backgroundImage.opacity;
      const imgW = bgImg.naturalWidth * backgroundImage.scale;
      const imgH = bgImg.naturalHeight * backgroundImage.scale;
      ctx.drawImage(
        bgImg,
        backgroundImage.offsetX * tileSize,
        backgroundImage.offsetY * tileSize,
        imgW,
        imgH
      );
      ctx.restore();
    }

    for (let y = 0; y < meta.height; y++) {
      for (let x = 0; x < meta.width; x++) {
        const tile = tiles[y]?.[x];
        if (tile) {
          if (printMode) {
            drawPrintTile(ctx, tile.type, x, y, tileSize);
          } else if (tile.type !== 'empty') {
            // Skip 'empty' tiles in screen mode so the light graph-paper
            // background (SCREEN_BG) shows through instead of the theme's
            // dark "empty" color.
            // Honor the per-tile theme override (set by the optional
            // "preserve tiles when switching themes" mode) so mixed-style
            // maps render each tile in its original theme.
            const tileTheme = tile.theme ? getTheme(tile.theme) : theme;
            tileTheme.drawTile(ctx, tile.type, x, y, tileSize);
            // Draw print-mode-inspired glyph overlay for quick identification.
            drawTileOverlay(ctx, tile.type, x, y, tileSize, tileTheme.tileColors[tile.type]);
          }
        }
      }
    }

    ctx.strokeStyle = printMode ? PRINT_GRID : theme.gridColor;
    ctx.lineWidth = 0.5;
    for (let y = 0; y <= meta.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * tileSize);
      ctx.lineTo(w, y * tileSize);
      ctx.stroke();
    }
    for (let x = 0; x <= meta.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * tileSize, 0);
      ctx.lineTo(x * tileSize, h);
      ctx.stroke();
    }

    // Light source glow halos — rendered right after the grid lines so the
    // warm overlay blends naturally with tile art. Glows are always visible
    // to the GM and are shown in player view regardless of dynamic fog mode
    // (the fog pass below still decides which cells are actually hidden).
    if (!printMode && lightSources && lightSources.length > 0) {
      for (const ls of lightSources) {
        drawLightGlow(ctx, ls, tileSize);
      }
    }

    visibleNotes.forEach(note => {
      const px = note.x * tileSize + tileSize / 2;
      const py = note.y * tileSize + tileSize / 2;
      const radius = tileSize * 0.38;
      const isSelected = note.id === selectedNoteId;
      if (printMode) {
        // Outlined circle with a black number — works equally well in B&W print.
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = isSelected ? 2 : 1.25;
        ctx.stroke();
        ctx.fillStyle = '#000000';
      } else {
        ctx.fillStyle = isSelected ? '#e94560' : '#f0c040';
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#fff' : '#8b6914';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#1a1a2e';
      }
      ctx.font = `bold ${Math.max(8, tileSize * 0.45)}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(note.id), px, py + 0.5);
    });

    // Annotations are drawn under tokens but over notes so token glyphs
    // remain readable. GM-only annotations are suppressed in player mode.
    for (const stroke of annotations) {
      if (isPlayerView && stroke.kind === 'gm') continue;
      drawAnnotation(ctx, stroke, tileSize);
    }

    // Shape markers are drawn on top of annotations but under tokens so
    // the tactical overlays don't obscure token glyphs.
    for (const marker of markers) {
      drawMarker(ctx, marker, tileSize);
    }

    // Light source icons (candle emoji) are drawn on top of markers and
    // annotations but still under tokens, so they remain identifiable
    // while token glyphs stay legible.
    if (!printMode && lightSources && lightSources.length > 0) {
      for (const ls of lightSources) {
        drawLightIcon(ctx, ls, tileSize);
      }
    }

    // Render tokens before fog so fogged cells in player mode genuinely
    // hide the tokens beneath them.
    for (const token of visibleTokens) {
      drawToken(ctx, token, tileSize, token.id === selectedTokenId);
    }

    // Live (in-progress) freehand stroke, drawn on top so the player sees
    // immediate feedback while dragging.
    if (activeStroke && activeStroke.length > 0) {
      drawAnnotation(ctx, {
        id: -1,
        kind: 'player',
        points: activeStroke,
        color: drawColor,
        width: drawWidth,
      }, tileSize);
    }

    // Fog overlay. In player view, paint fully opaque grey cells so hidden
    // content is genuinely hidden. In GM view, normally render nothing —
    // the GM is in control of the map and shouldn't have it obscured —
    // but when the GM has opted in to "Show Fog", paint a translucent grey
    // wash so they can see at a glance what is fogged.
    const renderFog = fogActive && fog && (isPlayerView || gmShowFog);
    if (renderFog) {
      // Cells the player is currently brushing with the Defog tool — skip
      // their fog overlay so the wipe is visible in real time before the
      // change is committed on mouseup.
      const defogSkip = defogStroke
        ? new Set(defogStroke.map(c => `${c.x},${c.y}`))
        : null;

      if (dynamicFogEnabled && playerVisible) {
        // 3-state dynamic fog: hidden → explored (dimmed) → visible (clear).
        // Cells visible from player tokens OR illuminated by light sources
        // are rendered clear (no overlay). Two passes avoid per-cell
        // save/restore overhead.
        const exploredFill = isPlayerView ? EXPLORED_PLAYER_FILL : EXPLORED_GM_FILL;
        const hiddenFill = isPlayerView ? FOG_PLAYER_FILL : FOG_GM_FILL;

        // Pass 1: explored (dimmed) cells.
        ctx.save();
        ctx.fillStyle = exploredFill;
        for (let y = 0; y < meta.height; y++) {
          for (let x = 0; x < meta.width; x++) {
            if (defogSkip && defogSkip.has(`${x},${y}`)) continue;
            if (!fog[y]?.[x]) continue;
            if (playerVisible.has(`${x},${y}`)) continue;
            if (lightVisible?.has(`${x},${y}`)) continue;
            if (explored?.[y]?.[x]) {
              ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            }
          }
        }
        ctx.restore();

        // Pass 2: fully hidden (never-seen) cells.
        ctx.save();
        ctx.fillStyle = hiddenFill;
        for (let y = 0; y < meta.height; y++) {
          for (let x = 0; x < meta.width; x++) {
            if (defogSkip && defogSkip.has(`${x},${y}`)) continue;
            if (!fog[y]?.[x]) continue;
            if (playerVisible.has(`${x},${y}`)) continue;
            if (lightVisible?.has(`${x},${y}`)) continue;
            if (!(explored?.[y]?.[x])) {
              ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            }
          }
        }
        ctx.restore();
      } else {
        // Classic 2-state fog: hidden (opaque/translucent) or revealed.
        ctx.save();
        ctx.fillStyle = isPlayerView ? FOG_PLAYER_FILL : FOG_GM_FILL;
        for (let y = 0; y < meta.height; y++) {
          for (let x = 0; x < meta.width; x++) {
            if (fog[y]?.[x]) {
              if (defogSkip && defogSkip.has(`${x},${y}`)) continue;
              ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            }
          }
        }
        ctx.restore();
      }
    }

    // FOV overlay. When fovVisible is provided, darken every cell that is
    // NOT in the visible set. Drawn after fog (so it stacks) but before
    // ghost previews and selection outlines.
    if (fovVisible) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      for (let y = 0; y < meta.height; y++) {
        for (let x = 0; x < meta.width; x++) {
          if (!fovVisible.has(`${x},${y}`)) {
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
          }
        }
      }
      ctx.restore();
      // Draw a bright marker on the FOV origin cell so the user can see
      // where the sight calculation is anchored.
      if (fovOrigin) {
        ctx.save();
        const cx = (fovOrigin.x + 0.5) * tileSize;
        const cy = (fovOrigin.y + 0.5) * tileSize;
        const r = tileSize * 0.32;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.7)';
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── Measure tool overlay ──────────────────────────────────────────
    if (activeTool === 'measure' && isDragging && dragStart && dragEnd) {
      const sx = (dragStart.x + 0.5) * tileSize;
      const sy = (dragStart.y + 0.5) * tileSize;
      const ex = (dragEnd.x + 0.5) * tileSize;
      const ey = (dragEnd.y + 0.5) * tileSize;
      const dx = dragEnd.x - dragStart.x;
      const dy = dragEnd.y - dragStart.y;
      // Chebyshev distance (D&D 5e default: each diagonal = 1 square)
      const distCells = Math.max(Math.abs(dx), Math.abs(dy));
      const distFeet = distCells * measureFeetPerCell;
      const angle = Math.atan2(dy, dx);
      const MEASURE_COLOR = '#22d3ee';
      const MEASURE_FILL = 'rgba(34, 211, 238, 0.18)';

      ctx.save();

      if (measureShape === 'ruler') {
        // Draw line from start to end with distance label
        ctx.strokeStyle = MEASURE_COLOR;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);

        // Start and end dots
        for (const [px, py] of [[sx, sy], [ex, ey]]) {
          ctx.beginPath();
          ctx.arc(px, py, tileSize * 0.18, 0, Math.PI * 2);
          ctx.fillStyle = MEASURE_COLOR;
          ctx.fill();
        }
      } else if (measureShape === 'circle') {
        // Circle area template with radius = distance
        const radiusPx = distCells * tileSize;
        ctx.beginPath();
        ctx.arc(sx, sy, radiusPx, 0, Math.PI * 2);
        ctx.fillStyle = MEASURE_FILL;
        ctx.fill();
        ctx.strokeStyle = MEASURE_COLOR;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Origin dot
        ctx.beginPath();
        ctx.arc(sx, sy, tileSize * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = MEASURE_COLOR;
        ctx.fill();

        // Radius line
        ctx.strokeStyle = MEASURE_COLOR;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (measureShape === 'cone') {
        // 90° cone emanating from start toward end
        const coneHalf = Math.PI / 4; // 45° each side = 90° total
        const radiusPx = distCells * tileSize;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.arc(sx, sy, radiusPx, angle - coneHalf, angle + coneHalf);
        ctx.closePath();
        ctx.fillStyle = MEASURE_FILL;
        ctx.fill();
        ctx.strokeStyle = MEASURE_COLOR;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Origin dot
        ctx.beginPath();
        ctx.arc(sx, sy, tileSize * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = MEASURE_COLOR;
        ctx.fill();
      } else if (measureShape === 'line') {
        // Line template: 1-cell-wide line from start to end
        const lineWidth = tileSize;
        const perp = angle + Math.PI / 2;
        const hw = lineWidth / 2;
        const px1 = sx + Math.cos(perp) * hw;
        const py1 = sy + Math.sin(perp) * hw;
        const px2 = sx - Math.cos(perp) * hw;
        const py2 = sy - Math.sin(perp) * hw;
        const px3 = ex - Math.cos(perp) * hw;
        const py3 = ey - Math.sin(perp) * hw;
        const px4 = ex + Math.cos(perp) * hw;
        const py4 = ey + Math.sin(perp) * hw;
        ctx.beginPath();
        ctx.moveTo(px1, py1);
        ctx.lineTo(px4, py4);
        ctx.lineTo(px3, py3);
        ctx.lineTo(px2, py2);
        ctx.closePath();
        ctx.fillStyle = MEASURE_FILL;
        ctx.fill();
        ctx.strokeStyle = MEASURE_COLOR;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Start and end dots
        for (const [px, py] of [[sx, sy], [ex, ey]]) {
          ctx.beginPath();
          ctx.arc(px, py, tileSize * 0.18, 0, Math.PI * 2);
          ctx.fillStyle = MEASURE_COLOR;
          ctx.fill();
        }
      }

      // Distance label — always shown
      if (distCells > 0) {
        const midX = (sx + ex) / 2;
        const midY = (sy + ey) / 2;
        const labelText = `${distCells} sq · ${distFeet} ft`;
        const fontSize = Math.max(12, tileSize * 0.4);
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        const textWidth = ctx.measureText(labelText).width;
        const pad = fontSize * 0.35;
        // Background pill
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        const pillX = midX - textWidth / 2 - pad;
        const pillY = midY - fontSize / 2 - pad;
        const pillW = textWidth + pad * 2;
        const pillH = fontSize + pad * 2;
        const pillR = Math.min(pillH / 2, 6);
        ctx.beginPath();
        ctx.moveTo(pillX + pillR, pillY);
        ctx.lineTo(pillX + pillW - pillR, pillY);
        ctx.quadraticCurveTo(pillX + pillW, pillY, pillX + pillW, pillY + pillR);
        ctx.lineTo(pillX + pillW, pillY + pillH - pillR);
        ctx.quadraticCurveTo(pillX + pillW, pillY + pillH, pillX + pillW - pillR, pillY + pillH);
        ctx.lineTo(pillX + pillR, pillY + pillH);
        ctx.quadraticCurveTo(pillX, pillY + pillH, pillX, pillY + pillH - pillR);
        ctx.lineTo(pillX, pillY + pillR);
        ctx.quadraticCurveTo(pillX, pillY, pillX + pillR, pillY);
        ctx.closePath();
        ctx.fill();
        // Label text
        ctx.fillStyle = MEASURE_COLOR;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, midX, midY);
      }

      ctx.restore();
    }

    // Ghost preview for line/rect
    if (isDragging && dragStart && dragEnd && (activeTool === 'line' || activeTool === 'rect')) {
      const ghostPoints = activeTool === 'line'
        ? bresenhamLine(dragStart.x, dragStart.y, dragEnd.x, dragEnd.y)
        : rectOutline(dragStart.x, dragStart.y, dragEnd.x, dragEnd.y);
      ctx.save();
      ctx.globalAlpha = 0.5;
      for (const p of ghostPoints) {
        if (p.x >= 0 && p.x < meta.width && p.y >= 0 && p.y < meta.height) {
          ctx.fillStyle = printMode ? '#000000' : (theme.tileColors[activeTile] ?? '#888');
          ctx.fillRect(p.x * tileSize, p.y * tileSize, tileSize, tileSize);
        }
      }
      ctx.restore();
    }

    // Ghost preview for fog reveal/hide drag — show the in-progress
    // rectangle the user is about to commit.
    if (isDragging && dragStart && dragEnd && (activeTool === 'reveal' || activeTool === 'hide')) {
      const minX = Math.min(dragStart.x, dragEnd.x);
      const maxX = Math.max(dragStart.x, dragEnd.x);
      const minY = Math.min(dragStart.y, dragEnd.y);
      const maxY = Math.max(dragStart.y, dragEnd.y);
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = activeTool === 'reveal' ? '#fbbf24' : '#1e293b';
      ctx.fillRect(minX * tileSize, minY * tileSize, (maxX - minX + 1) * tileSize, (maxY - minY + 1) * tileSize);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = activeTool === 'reveal' ? '#b45309' : '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(minX * tileSize, minY * tileSize, (maxX - minX + 1) * tileSize, (maxY - minY + 1) * tileSize);
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Selection box
    if (selection) {
      ctx.save();
      ctx.strokeStyle = printMode ? '#000000' : '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        selection.x * tileSize,
        selection.y * tileSize,
        selection.w * tileSize,
        selection.h * tileSize
      );
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Paste preview — when the clipboard has content and the select tool
    // is active, draw a translucent dashed outline at the mouse position
    // (or the selection origin) showing where the paste will land.
    if (hasClipboard && clipboardSize && activeTool === 'select' && mousePos) {
      ctx.save();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.globalAlpha = 0.7;
      ctx.strokeRect(
        mousePos.x * tileSize,
        mousePos.y * tileSize,
        clipboardSize.w * tileSize,
        clipboardSize.h * tileSize
      );
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(34, 211, 238, 0.12)';
      ctx.fillRect(
        mousePos.x * tileSize,
        mousePos.y * tileSize,
        clipboardSize.w * tileSize,
        clipboardSize.h * tileSize
      );
      ctx.restore();
    }

    // Marker preview — when the marker tool is active and the mouse is on
    // the canvas, show a ghost marker at the cursor position.
    if (activeTool === 'marker' && mousePos) {
      const ghost: ShapeMarker = {
        id: -1,
        x: mousePos.x,
        y: mousePos.y,
        shape: markerShape,
        color: markerColor,
        size: markerSize,
      };
      ctx.save();
      ctx.globalAlpha = 0.5;
      drawMarker(ctx, ghost, tileSize);
      ctx.restore();
    }
    // Light source preview — when the light tool is active and the mouse is
    // on the canvas, show a ghost glow at the cursor position so the user
    // can see the illumination radius before placing the source.
    if (activeTool === 'light' && mousePos) {
      const ghost: LightSource = {
        id: -1,
        x: mousePos.x,
        y: mousePos.y,
        radius: lightRadius,
        color: lightColor,
        label: 'preview',
      };
      ctx.save();
      ctx.globalAlpha = 0.6;
      drawLightGlow(ctx, ghost, tileSize);
      ctx.restore();
      // Dashed radius circle outline
      ctx.save();
      ctx.strokeStyle = lightColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(
        (mousePos.x + 0.5) * tileSize,
        (mousePos.y + 0.5) * tileSize,
        lightRadius * tileSize,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }, [map, tiles, notes, meta, tileSize, selectedNoteId, selectedTokenId, themeId, printMode, isDragging, dragStart, dragEnd, activeTool, activeTile, selection, tokens, annotations, markers, fog, fogActive, isPlayerView, gmShowFog, visibleNotes, visibleTokens, activeStroke, drawColor, drawWidth, defogStroke, hasClipboard, clipboardSize, mousePos, markerShape, markerColor, markerSize, backgroundImage, bgImageReady, fovVisible, fovOrigin, dynamicFogEnabled, playerVisible, explored, measureShape, measureFeetPerCell, lightSources, lightVisible, lightRadius, lightColor]);

  // Minimap render
  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const theme = getTheme(themeId);

    const mTile = Math.max(1, Math.min(Math.floor(MINIMAP_MAX_W / meta.width), Math.floor(MINIMAP_MAX_H / meta.height)));
    const mW = meta.width * mTile;
    const mH = meta.height * mTile;

    canvas.width = mW;
    canvas.height = mH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = printMode ? PRINT_BG : SCREEN_BG;
    ctx.fillRect(0, 0, mW, mH);

    for (let y = 0; y < meta.height; y++) {
      for (let x = 0; x < meta.width; x++) {
        const tile = tiles[y]?.[x];
        if (tile && tile.type !== 'empty') {
          ctx.fillStyle = printMode ? '#000000' : theme.tileColors[tile.type];
          ctx.fillRect(x * mTile, y * mTile, mTile, mTile);
        }
      }
    }

    const containerEl = containerRef.current;
    if (containerEl && zoom > 0) {
      const vw = containerEl.clientWidth / zoom / tileSize;
      const vh = containerEl.clientHeight / zoom / tileSize;
      const vcx = meta.width / 2 - pan.x / (zoom * tileSize);
      const vcy = meta.height / 2 - pan.y / (zoom * tileSize);
      const vx = (vcx - vw / 2) * mTile;
      const vy = (vcy - vh / 2) * mTile;
      ctx.strokeStyle = printMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(vx, vy, vw * mTile, vh * mTile);
    }
  }, [map, tiles, meta, tileSize, themeId, printMode, zoom, pan]);

  // Selection keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (activeTool !== 'select' || !selection) return;
      // Don't fire when the user is typing into a text field or focused on
      // a control (e.g. a header button or <select>) — Backspace there
      // would otherwise wipe their selection from a totally unrelated
      // interaction. Limit the handler to when the body or the canvas
      // itself has focus.
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          tag === 'BUTTON' ||
          target.isContentEditable
        ) return;
        // Skip when a modal dialog is open so cancellation/confirmation
        // keys in the modal don't double-fire here.
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const eraseList: { x: number; y: number }[] = [];
        for (let y = selection.y; y < selection.y + selection.h; y++) {
          for (let x = selection.x; x < selection.x + selection.w; x++) {
            eraseList.push({ x, y });
          }
        }
        onEraseTiles(eraseList);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelection(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTool, selection, onEraseTiles]);

  const getTileCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const scaleX = canvas.width / (rect.width * dpr);
    const scaleY = canvas.height / (rect.height * dpr);
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / tileSize);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / tileSize);
    if (x < 0 || x >= meta.width || y < 0 || y >= meta.height) return null;
    return { x, y };
  }, [tileSize, meta.width, meta.height]);

  /** Like getTileCoords, but returns sub-tile fractional coordinates (in
   * tile units) so freehand drawing follows the cursor smoothly instead of
   * snapping to cell boundaries. Returns null when outside the map. */
  const getFractionalCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const scaleX = canvas.width / (rect.width * dpr);
    const scaleY = canvas.height / (rect.height * dpr);
    const fx = ((e.clientX - rect.left) * scaleX) / tileSize;
    const fy = ((e.clientY - rect.top) * scaleY) / tileSize;
    if (fx < 0 || fx > meta.width || fy < 0 || fy > meta.height) return null;
    return { x: fx, y: fy };
  }, [tileSize, meta.width, meta.height]);

  /** Tools whose semantics are "drag a rectangle of cells" (fog reveal/hide).
   * Behave like the existing rect tool but commit to fog instead of tiles. */
  const isFogDragTool = activeTool === 'reveal' || activeTool === 'hide';

  const handleCanvasAction = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getTileCoords(e);
    if (!coords) return;
    const { x, y } = coords;

    // Token placement / removal tools work in both GM and Player views so
    // the GM can pre-place tokens before play starts. Players still can't
    // drop tokens onto fogged cells (that would leak hidden geography);
    // the GM has no such restriction.
    if (activeTool === 'token-player' || activeTool === 'token-npc'
        || activeTool === 'token-monster' || activeTool === 'token-monster-md'
        || activeTool === 'token-monster-lg') {
      const kind: TokenKind = activeTool === 'token-player' ? 'player'
        : activeTool === 'token-npc' ? 'npc' : 'monster';
      const size = activeTool === 'token-monster-lg' ? 3
        : activeTool === 'token-monster-md' ? 2
        : 1;
      // Don't drop tokens onto fogged cells in player view — players
      // shouldn't be able to interact with hidden geography.
      if (isPlayerView && fogActive && fog?.[y]?.[x]) return;
      // Reject if the map is too small to fit the footprint at all.
      if (size > meta.width || size > meta.height) return;
      // Clamp the top-left so a multi-cell footprint stays on the map
      // when the user clicks near the right/bottom edge.
      const px = Math.min(x, meta.width - size);
      const py = Math.min(y, meta.height - size);
      onAddToken(kind, px, py, undefined, size);
      return;
    }
    if (activeTool === 'remove-token') {
      const t = findTokenAt(tokens, x + 0.5, y + 0.5);
      // The Remove Token tool can delete any token kind in either view.
      if (t) onRemoveToken(t.id);
      return;
    }
    if (activeTool === 'marker') {
      onAddMarker(markerShape, x, y, markerColor, markerSize);
      return;
    }
    if (activeTool === 'remove-marker') {
      const fc = getFractionalCoords(e);
      if (fc) {
        const m = findMarkerAt(markers, fc.x, fc.y);
        if (m) onRemoveMarker(m.id);
      }
      return;
    }
    if (activeTool === 'fov') {
      onFovClick?.(x, y);
      return;
    }
    if (activeTool === 'light') {
      onAddLightSource?.(x, y);
      return;
    }
    if (activeTool === 'remove-light') {
      const ls = findLightSourceAt(lightSources, x, y);
      if (ls) onRemoveLightSource?.(ls.id);
      return;
    }

    // Player-only tools (drawing eraser).
    if (isPlayerView) {
      if (activeTool === 'perase') {
        // Click a stroke's bounding cell to remove it. Only player strokes
        // are removable from the player view.
        for (let i = annotations.length - 1; i >= 0; i--) {
          const s = annotations[i];
          if (s.kind !== 'player') continue;
          const hit = s.points.some(p => Math.floor(p.x) === x && Math.floor(p.y) === y);
          if (hit) { onRemoveAnnotation(s.id); break; }
        }
      }
      return;
    }

    if (activeTool === 'paint') {
      onSetTile(x, y, activeTile);
    } else if (activeTool === 'erase') {
      onSetTile(x, y, 'empty');
    } else if (activeTool === 'fill') {
      onFillTile(x, y, activeTile);
    } else if (activeTool === 'note') {
      const existingNote = notes.find(n => n.x === x && n.y === y);
      if (existingNote) {
        onSelectNote(existingNote.id === selectedNoteId ? null : existingNote.id);
      } else {
        onAddNote(x, y);
      }
    }
  }, [
    activeTool, activeTile, getTileCoords, onSetTile, onFillTile, onAddNote, onSelectNote,
    notes, selectedNoteId, isPlayerView, fogActive, fog, tokens, annotations,
    onAddToken, onRemoveToken, onRemoveAnnotation, meta.width, meta.height,
    onAddMarker, onRemoveMarker, markerShape, markerColor, markerSize, markers,
    getFractionalCoords, onFovClick, lightSources, onAddLightSource, onRemoveLightSource,
  ]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) {
      isPanningRef.current = true;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
      return;
    }
    isMouseDownRef.current = true;
    const coords = getTileCoords(e);

    // Player-mode interactive tools that need drag tracking.
    if (isPlayerView && activeTool === 'pdraw') {
      const fc = getFractionalCoords(e);
      if (fc) setActiveStroke([fc]);
      return;
    }
    if (isPlayerView && activeTool === 'defog' && coords) {
      // Start a freehand defog stroke. Cells are accumulated locally and
      // committed in a single fog edit on mouseup.
      lastDefogCellRef.current = coords;
      setDefogStroke([coords]);
      return;
    }
    if (activeTool === 'move-token' && coords) {
      const t = findTokenAt(tokens, coords.x + 0.5, coords.y + 0.5);
      // The Move Token tool can relocate any token kind, in either view.
      if (t) {
        draggingTokenRef.current = {
          id: t.id,
          lastX: t.x,
          lastY: t.y,
          offsetX: coords.x - t.x,
          offsetY: coords.y - t.y,
        };
      }
      return;
    }

    if (activeTool === 'line' || activeTool === 'rect' || activeTool === 'measure' || isFogDragTool) {
      if (coords) {
        setDragStart(coords);
        setDragEnd(coords);
        setIsDragging(true);
      }
    } else if (activeTool === 'select') {
      if (coords) {
        setDragStart(coords);
        setDragEnd(coords);
        setIsDragging(true);
        setSelection({ x: coords.x, y: coords.y, w: 1, h: 1 });
      }
    } else {
      handleCanvasAction(e);
    }
  }, [activeTool, getTileCoords, getFractionalCoords, handleCanvasAction, isFogDragTool, isPlayerView, tokens]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      const dx = e.clientX - lastPanPos.current.x;
      const dy = e.clientY - lastPanPos.current.y;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      return;
    }

    const coords = getTileCoords(e);
    if (coords) setMousePos(coords);

    if (!isMouseDownRef.current) return;

    // Player-mode drawing: append a point per move event.
    if (isPlayerView && activeTool === 'pdraw') {
      const fc = getFractionalCoords(e);
      if (fc) {
        setActiveStroke(prev => {
          if (!prev) return [fc];
          const last = prev[prev.length - 1];
          // Subsample so we don't spam thousands of points for short
          // distances. Threshold ~0.07 tiles (sqrt(0.005)) — finer than
          // pixel-level for typical tile sizes but coarse enough to keep
          // strokes lightweight when serialized.
          const dx = fc.x - last.x;
          const dy = fc.y - last.y;
          if (dx * dx + dy * dy < 0.005) return prev;
          return [...prev, fc];
        });
      }
      return;
    }

    // Player-mode defog brush: extend the in-progress stroke with every
    // new cell the cursor crosses, using bresenham to fill in cells the
    // cursor jumped over between events.
    if (isPlayerView && activeTool === 'defog' && coords) {
      const last = lastDefogCellRef.current;
      if (!last || last.x !== coords.x || last.y !== coords.y) {
        const filler = last
          ? bresenhamLine(last.x, last.y, coords.x, coords.y).slice(1)
          : [coords];
        if (filler.length > 0) {
          lastDefogCellRef.current = coords;
          setDefogStroke(prev => {
            const seen = new Set(prev?.map(c => `${c.x},${c.y}`) ?? []);
            const next = prev ? [...prev] : [];
            for (const c of filler) {
              const key = `${c.x},${c.y}`;
              if (!seen.has(key)) {
                seen.add(key);
                next.push(c);
              }
            }
            return next;
          });
        }
      }
      return;
    }

    // Token drag — works in both views.
    if (activeTool === 'move-token' && draggingTokenRef.current && coords) {
      const drag = draggingTokenRef.current;
      // Apply the grab offset so the token's top-left tracks where the
      // user originally clicked inside the footprint instead of snapping
      // to the cursor cell. moveToken clamps to the map bounds.
      const targetX = coords.x - drag.offsetX;
      const targetY = coords.y - drag.offsetY;
      if (targetX !== drag.lastX || targetY !== drag.lastY) {
        drag.lastX = targetX;
        drag.lastY = targetY;
        onMoveToken(drag.id, targetX, targetY);
      }
      return;
    }

    if ((activeTool === 'line' || activeTool === 'rect' || activeTool === 'measure' || isFogDragTool) && isDragging && coords) {
      setDragEnd(coords);
    } else if (activeTool === 'select' && isDragging && coords && dragStart) {
      setDragEnd(coords);
      setSelection({
        x: Math.min(dragStart.x, coords.x),
        y: Math.min(dragStart.y, coords.y),
        w: Math.abs(coords.x - dragStart.x) + 1,
        h: Math.abs(coords.y - dragStart.y) + 1,
      });
    } else if (activeTool === 'paint' || activeTool === 'erase') {
      handleCanvasAction(e);
    }
  }, [activeTool, isDragging, dragStart, getTileCoords, getFractionalCoords, handleCanvasAction, isFogDragTool, isPlayerView, onMoveToken]);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;

    // Commit player-mode freehand stroke.
    if (isPlayerView && activeTool === 'pdraw' && activeStroke && activeStroke.length > 0) {
      onAddAnnotation({
        kind: 'player',
        points: activeStroke,
        color: drawColor,
        width: drawWidth,
      });
      setActiveStroke(null);
    }

    // Commit player-mode defog brush — clear fog for every cell the
    // brush touched as a single fog edit (one undo step).
    if (isPlayerView && activeTool === 'defog' && defogStroke && defogStroke.length > 0) {
      onSetFogCells(defogStroke, false);
      setDefogStroke(null);
      lastDefogCellRef.current = null;
    }

    if (draggingTokenRef.current) {
      draggingTokenRef.current = null;
    }

    if (isMouseDownRef.current) {
      if ((activeTool === 'line' || activeTool === 'rect') && isDragging && dragStart && dragEnd) {
        const points = activeTool === 'line'
          ? bresenhamLine(dragStart.x, dragStart.y, dragEnd.x, dragEnd.y)
          : rectOutline(dragStart.x, dragStart.y, dragEnd.x, dragEnd.y);
        onSetTiles(points.map(p => ({ ...p, type: activeTile })));
      } else if (isFogDragTool && isDragging && dragStart && dragEnd) {
        const cells = rectCells(dragStart.x, dragStart.y, dragEnd.x, dragEnd.y);
        onSetFogCells(cells, activeTool === 'hide');
      } else if (activeTool === 'select' && isDragging && dragStart && dragEnd) {
        setSelection({
          x: Math.min(dragStart.x, dragEnd.x),
          y: Math.min(dragStart.y, dragEnd.y),
          w: Math.abs(dragEnd.x - dragStart.x) + 1,
          h: Math.abs(dragEnd.y - dragStart.y) + 1,
        });
      }
    }

    isMouseDownRef.current = false;
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [activeTool, isDragging, dragStart, dragEnd, activeTile, onSetTiles, onSetFogCells, isFogDragTool, isPlayerView, activeStroke, defogStroke, onAddAnnotation, drawColor, drawWidth]);

  const handleMouseLeave = useCallback(() => {
    isMouseDownRef.current = false;
    isPanningRef.current = false;
    setMousePos(null);
    if (activeStroke) setActiveStroke(null);
    // Commit any in-progress defog brush so the player doesn't lose work
    // if their cursor briefly leaves the canvas while dragging.
    if (defogStroke && defogStroke.length > 0) {
      onSetFogCells(defogStroke, false);
      setDefogStroke(null);
      lastDefogCellRef.current = null;
    }
    if (draggingTokenRef.current) draggingTokenRef.current = null;
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    }
  }, [isDragging, activeStroke, defogStroke, onSetFogCells]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Shift (or Caps Lock) + wheel pans the map. Unmodified wheel is ignored
    // so accidental scrolls don't interfere with the canvas.
    const capsOn = typeof e.getModifierState === 'function' && e.getModifierState('CapsLock');
    if (!e.shiftKey && !capsOn) return;
    e.preventDefault();
    // Pan: browsers typically swap deltaY into deltaX when Shift is held,
    // so deltaX already carries the vertical scroll value. We use both
    // deltas directly — deltaX for horizontal panning, deltaY for vertical.
    setPan(prev => ({
      x: prev.x - e.deltaX,
      y: prev.y - e.deltaY,
    }));
  }, []);

  const handleMinimapClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mTile = Math.max(1, Math.min(Math.floor(MINIMAP_MAX_W / meta.width), Math.floor(MINIMAP_MAX_H / meta.height)));
    const tileX = (e.clientX - rect.left) / mTile;
    const tileY = (e.clientY - rect.top) / mTile;
    const newPanX = (meta.width / 2 - tileX) * zoom * tileSize;
    const newPanY = (meta.height / 2 - tileY) * zoom * tileSize;
    setPan({ x: newPanX, y: newPanY });
  }, [meta, zoom, tileSize]);

  const handleFitToScreen = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const mapW = meta.width * tileSize;
    const mapH = meta.height * tileSize;
    if (mapW <= 0 || mapH <= 0) return;
    // The zoom-controls bar is absolutely positioned over the bottom of the
    // viewport, so it covers part of the map area. Subtract its height from
    // the available space and shift the map up by half that amount so the
    // visible space above and below the map is equal.
    const wrapper = containerRef.current;
    const controlsEl = wrapper?.querySelector('.zoom-controls') as HTMLElement | null;
    const controlsH = controlsEl?.offsetHeight ?? 0;
    // Leave a small padding so the map doesn't sit flush against the edges.
    const padding = 16;
    const availW = Math.max(1, viewport.clientWidth - padding * 2);
    const availH = Math.max(1, viewport.clientHeight - controlsH - padding * 2);
    const fit = Math.min(availW / mapW, availH / mapH);
    // Clamp to the same range as the +/- buttons so the value stays valid.
    const clamped = Math.max(0.25, Math.min(4, fit));
    setZoom(clamped);
    setPan({ x: 0, y: -controlsH / 2 });
  }, [meta.width, meta.height, tileSize]);

  // Keep the forwarded fit-to-screen ref pointing at the latest closure so
  // the imperative handle can invoke it without depending on declaration order.
  useEffect(() => {
    handleFitToScreenRef.current = handleFitToScreen;
  }, [handleFitToScreen]);

  const cursorStyle = activeTool === 'fill' ? 'cell'
    : activeTool === 'note' ? 'copy'
    : activeTool === 'select' ? 'default'
    : activeTool === 'reveal' || activeTool === 'hide' ? 'cell'
    : activeTool === 'defog' ? 'cell'
    : activeTool === 'pdraw' ? 'crosshair'
    : activeTool === 'perase' ? 'cell'
    : activeTool === 'move-token' ? 'grab'
    : activeTool === 'remove-token' ? 'not-allowed'
    : activeTool === 'token-player' || activeTool === 'token-npc'
        || activeTool === 'token-monster' || activeTool === 'token-monster-md'
        || activeTool === 'token-monster-lg' ? 'copy'
    : activeTool === 'marker' ? 'copy'
    : activeTool === 'remove-marker' ? 'not-allowed'
    : activeTool === 'fov' ? 'crosshair'
    : 'crosshair';

  const handleCanvasKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    // Arrow keys pan the viewport while the canvas itself has focus.
    // Holding Shift increases the step. Other keys bubble so the global
    // shortcut handler can pick them up.
    const step = e.shiftKey ? 64 : 16;
    if (e.key === 'ArrowLeft')      { e.preventDefault(); setPan(p => ({ x: p.x + step, y: p.y })); }
    else if (e.key === 'ArrowRight'){ e.preventDefault(); setPan(p => ({ x: p.x - step, y: p.y })); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setPan(p => ({ x: p.x, y: p.y + step })); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setPan(p => ({ x: p.x, y: p.y - step })); }
  }, []);

  const canvasAriaLabel = useMemo(
    () => `Map canvas: ${meta.name || 'Untitled'}, ${meta.width}×${meta.height} tiles, ${activeTool} tool active. Use arrow keys to pan; press question mark for keyboard shortcuts.`,
    [meta.name, meta.width, meta.height, activeTool]
  );

  return (
    <div className="canvas-wrapper" ref={containerRef}>
      <div className="canvas-viewport" ref={viewportRef}>
        <div
          className="canvas-transform-container"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <canvas
            ref={canvasRef}
            tabIndex={0}
            role="application"
            aria-label={canvasAriaLabel}
            style={{
              cursor: cursorStyle,
              display: 'block',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onContextMenu={e => e.preventDefault()}
            onWheel={handleWheel}
            onKeyDown={handleCanvasKeyDown}
          />
        </div>
      </div>
      <div className="zoom-controls" role="group" aria-label="Map zoom controls" title="Hold Shift + scroll to pan around the map">
        <button type="button" onClick={() => setZoom(z => Math.min(4, z + 0.25))} aria-label="Zoom in" aria-keyshortcuts="+">+</button>
        <span aria-live="off" aria-atomic="true">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} aria-label="Zoom out" aria-keyshortcuts="-">-</button>
        <button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} aria-label="Reset zoom to 100%" aria-keyshortcuts="0">Reset</button>
        <button type="button" onClick={handleFitToScreen} title="Fit map to screen" aria-label="Fit map to screen" aria-keyshortcuts="1">Fit</button>
        <span className="zoom-hint" aria-hidden="true">⇧+wheel: pan</span>
      </div>
      {mousePos && (
        <div className="coord-display" aria-hidden="true">
          X: {mousePos.x} &nbsp; Y: {mousePos.y}
        </div>
      )}
      <canvas
        ref={minimapRef}
        className="minimap-canvas"
        onClick={handleMinimapClick}
        title="Minimap - click to pan"
        aria-label="Minimap — click to pan the main viewport"
      />
    </div>
  );
});

MapCanvas.displayName = 'MapCanvas';

export default MapCanvas;
