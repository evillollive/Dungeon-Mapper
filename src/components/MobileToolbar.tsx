import { useState, useCallback, useRef, useEffect } from 'react';
import type { ToolType, TileType, ViewMode, MarkerShape, MeasureShape } from '../types/map';
import {
  MEASURE_SHAPES,
  MEASURE_SHAPE_LABELS,
  MARKER_SHAPES,
  MARKER_SHAPE_LABELS,
  MARKER_COLORS,
  TILE_LABELS,
  isBuiltInTileType,
} from '../types/map';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface MobileToolbarProps {
  viewMode: ViewMode;
  activeTool: ToolType;
  activeTile: TileType;
  onSetTool: (tool: ToolType) => void;
  // Drawing
  drawColor: string;
  drawWidth: number;
  onSetDrawColor: (c: string) => void;
  onSetDrawWidth: (w: number) => void;
  gmDrawColor: string;
  gmDrawWidth: number;
  onSetGmDrawColor: (c: string) => void;
  onSetGmDrawWidth: (w: number) => void;
  // Measure
  measureShape: MeasureShape;
  onSetMeasureShape: (s: MeasureShape) => void;
  // Marker
  markerShape: MarkerShape;
  markerColor: string;
  markerSize: number;
  onSetMarkerShape: (s: MarkerShape) => void;
  onSetMarkerColor: (c: string) => void;
  onSetMarkerSize: (s: number) => void;
  // Fog actions
  onClearFog: () => void;
  onFillFog: () => void;
  // FAB actions
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenGenerateMap: () => void;
  onToggleViewMode: () => void;
}

/* ------------------------------------------------------------------ */
/*  Tool metadata                                                      */
/* ------------------------------------------------------------------ */

interface ToolMeta {
  id: ToolType;
  icon: string;
  label: string;
}

const ALL_TOOLS: ToolMeta[] = [
  // Drawing
  { id: 'paint',  icon: '✏️', label: 'Paint'  },
  { id: 'erase',  icon: '🧹', label: 'Erase'  },
  { id: 'fill',   icon: '🪣', label: 'Fill'   },
  { id: 'line',   icon: '📏', label: 'Line'   },
  { id: 'rect',   icon: '⬛', label: 'Rect'   },
  { id: 'note',   icon: '📍', label: 'Note'   },
  // Player drawing
  { id: 'pdraw',  icon: '🖊️', label: 'Draw'   },
  { id: 'perase', icon: '🧽', label: 'Erase'  },
  // Fog
  { id: 'reveal', icon: '👁', label: 'Reveal' },
  { id: 'hide',   icon: '🌫', label: 'Hide'   },
  { id: 'defog',  icon: '🔓', label: 'Defog'  },
  // Tactical
  { id: 'fov',            icon: '🔭', label: 'FOV'     },
  { id: 'measure',        icon: '📐', label: 'Measure' },
  { id: 'marker',         icon: '⭕', label: 'Marker'  },
  { id: 'remove-marker',  icon: '❌', label: 'Rm Mark' },
  { id: 'light',          icon: '🕯', label: 'Light'   },
  { id: 'remove-light',   icon: '🔅', label: 'Rm Light'},
  // Tokens
  { id: 'token-player',     icon: '🟢', label: 'Player'  },
  { id: 'token-npc',        icon: '🎭', label: 'NPC'     },
  { id: 'token-monster',    icon: '👹', label: 'Monster'  },
  { id: 'token-monster-md', icon: '👹', label: 'Mon MD'   },
  { id: 'token-monster-lg', icon: '👹', label: 'Mon LG'   },
  { id: 'move-token',       icon: '✋', label: 'Move Tkn' },
  { id: 'remove-token',     icon: '🗑', label: 'Rm Tkn'   },
  // Advanced
  { id: 'link-stair', icon: '🔗', label: 'Stairs'  },
  { id: 'gmdraw',     icon: '🖊️', label: 'GM Draw' },
  { id: 'gmerase',    icon: '🧽', label: 'GM Erase'},
  { id: 'select',     icon: '⬜', label: 'Select'  },
  // Wall & Path
  { id: 'wall',       icon: '🧱', label: 'Wall'    },
  { id: 'wall-erase', icon: '🧽', label: 'Rm Wall' },
  { id: 'path',       icon: '🛤️', label: 'Path'    },
  { id: 'path-erase', icon: '🧽', label: 'Rm Path' },
  // Stamps
];

/** Duration in ms a touch must be held to trigger the FAB long-press menu. */
const LONG_PRESS_DURATION_MS = 500;

/** Approximate pixel heights used for FAB positioning. */
const BAR_HEIGHT_PX = 52;
const OPTIONS_HEIGHT_PX = 40;

const toolMeta = (id: ToolType): ToolMeta =>
  ALL_TOOLS.find(t => t.id === id) ?? { id, icon: '❓', label: id };

/* ------------------------------------------------------------------ */
/*  Flyout category definitions                                        */
/* ------------------------------------------------------------------ */

interface ToolCategory {
  label: string;
  tools: ToolType[];
}

const GM_CATEGORIES: ToolCategory[] = [
  { label: 'Drawing',  tools: ['paint', 'erase', 'fill', 'line', 'rect', 'note'] },
  { label: 'Fog',      tools: ['reveal', 'hide', 'defog'] },
  { label: 'Tactical', tools: ['fov', 'measure', 'marker', 'remove-marker', 'light', 'remove-light'] },
  { label: 'Tokens',   tools: ['token-player', 'token-npc', 'token-monster', 'token-monster-md', 'token-monster-lg', 'move-token', 'remove-token'] },
  { label: 'Advanced', tools: ['link-stair', 'gmdraw', 'gmerase', 'select'] },
  { label: 'Walls & Paths', tools: ['wall', 'wall-erase', 'path', 'path-erase'] },
];

const PLAYER_CATEGORIES: ToolCategory[] = [
  { label: 'Drawing',  tools: ['pdraw', 'perase'] },
  { label: 'Fog',      tools: ['defog'] },
  { label: 'Tactical', tools: ['fov', 'measure', 'marker', 'remove-marker'] },
  { label: 'Tokens',   tools: ['token-player', 'move-token', 'remove-token'] },
];

/* ------------------------------------------------------------------ */
/*  Quick-bar button sets                                              */
/* ------------------------------------------------------------------ */

interface QuickButton {
  tool: ToolType;
  icon: string;
  label: string;
}

const GM_QUICK_BUTTONS: QuickButton[] = [
  { tool: 'paint',  icon: '✏️', label: 'Draw'   },
  { tool: 'erase',  icon: '🧹', label: 'Erase'  },
  { tool: 'fill',   icon: '🪣', label: 'Fill'   },
  { tool: 'reveal', icon: '👁', label: 'Fog'    },
  { tool: 'select', icon: '⬜', label: 'Select' },
];

const PLAYER_QUICK_BUTTONS: QuickButton[] = [
  { tool: 'pdraw',        icon: '🖊️', label: 'Draw'  },
  { tool: 'perase',       icon: '🧽', label: 'Erase' },
  { tool: 'defog',        icon: '🔓', label: 'Defog' },
  { tool: 'token-player', icon: '🟢', label: 'Token' },
];

/* ------------------------------------------------------------------ */
/*  Tools that show the options bar                                    */
/* ------------------------------------------------------------------ */

const PAINT_TOOLS: ReadonlySet<ToolType> = new Set(['paint', 'fill']);
const DRAW_TOOLS: ReadonlySet<ToolType> = new Set(['pdraw', 'gmdraw']);
const FOG_TOOLS: ReadonlySet<ToolType> = new Set(['reveal', 'hide', 'defog']);
const MARKER_TOOL: ToolType = 'marker';
const MEASURE_TOOL: ToolType = 'measure';

const hasOptions = (tool: ToolType): boolean =>
  PAINT_TOOLS.has(tool) ||
  DRAW_TOOLS.has(tool) ||
  FOG_TOOLS.has(tool) ||
  tool === MARKER_TOOL ||
  tool === MEASURE_TOOL;

/* ------------------------------------------------------------------ */
/*  Measure shape icons                                                */
/* ------------------------------------------------------------------ */

const MEASURE_SHAPE_ICONS: Record<MeasureShape, string> = {
  ruler:  '📏',
  circle: '⭕',
  cone:   '🔺',
  line:   '➖',
};

/* ------------------------------------------------------------------ */
/*  Marker shape icons                                                 */
/* ------------------------------------------------------------------ */

const MARKER_SHAPE_ICONS: Record<MarkerShape, string> = {
  circle:  '⭕',
  square:  '⬜',
  diamond: '💠',
};

/* ------------------------------------------------------------------ */
/*  CSS (to be added to App.css)                                       */
/* ------------------------------------------------------------------ */

export const MOBILE_TOOLBAR_CSS = `
/* ===== Mobile Toolbar ============================================= */

.mobile-toolbar-root {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 900;
  pointer-events: none;
  font-family: 'Courier New', Courier, monospace;
}
.mobile-toolbar-root * { pointer-events: auto; }

/* ---------- Options bar ------------------------------------------- */
.mobile-options-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #fff;
  border-top: 1px solid #c2bbab;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.mobile-options-bar.mobile-options-hidden {
  transform: translateY(100%);
  opacity: 0;
  pointer-events: none;
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
}
.mobile-options-bar.mobile-options-visible {
  transform: translateY(0);
  opacity: 1;
}
.mobile-options-label {
  font-size: 11px;
  color: #6a6258;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
}
.mobile-options-tile-badge {
  font-size: 12px;
  color: #2a2620;
  background: #ece6d6;
  border: 1px solid #c2bbab;
  border-radius: 4px;
  padding: 2px 8px;
  white-space: nowrap;
}
.mobile-options-swatch {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 2px solid #c2bbab;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  position: relative;
  overflow: hidden;
}
.mobile-options-swatch input[type="color"] {
  position: absolute;
  inset: -4px;
  width: calc(100% + 8px);
  height: calc(100% + 8px);
  border: none;
  cursor: pointer;
  opacity: 0;
}
.mobile-options-slider {
  flex: 1;
  min-width: 80px;
  max-width: 160px;
  accent-color: #8a3a3a;
}
.mobile-options-btn {
  font-size: 11px;
  font-family: inherit;
  padding: 4px 10px;
  border: 1px solid #c2bbab;
  border-radius: 4px;
  background: #f4f1ea;
  color: #2a2620;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.mobile-options-btn:active {
  background: #ece6d6;
}
.mobile-options-btn.mobile-options-btn--active {
  background: #8a3a3a;
  color: #fff;
  border-color: #8a3a3a;
}
.mobile-options-color-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}
.mobile-options-color-btn.mobile-options-color-btn--active {
  border-color: #2a2620;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px #2a2620;
}
.mobile-options-size-label {
  font-size: 11px;
  color: #6a6258;
  min-width: 24px;
  text-align: center;
  flex-shrink: 0;
}

/* ---------- Bottom bar -------------------------------------------- */
.mobile-toolbar-bar {
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  background: #fff;
  border-top: 1px solid #c2bbab;
  padding: 2px 0 max(2px, env(safe-area-inset-bottom));
}
.mobile-toolbar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 44px;
  min-height: 44px;
  padding: 4px 2px 2px;
  border: none;
  background: transparent;
  color: #6a6258;
  font-family: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.15s, background 0.15s;
  position: relative;
}
.mobile-toolbar-btn::after {
  content: '';
  position: absolute;
  top: 0;
  left: 25%;
  right: 25%;
  height: 3px;
  border-radius: 0 0 3px 3px;
  background: transparent;
  transition: background 0.15s;
}
.mobile-toolbar-btn--active {
  color: #8a3a3a;
}
.mobile-toolbar-btn--active::after {
  background: #8a3a3a;
}
.mobile-toolbar-btn:active {
  background: #ece6d6;
}
.mobile-toolbar-btn-icon {
  font-size: 20px;
  line-height: 1;
}
.mobile-toolbar-btn-label {
  font-size: 9px;
  margin-top: 1px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* ---------- Flyout panel ------------------------------------------ */
.mobile-flyout-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 910;
  animation: mobile-flyout-fade-in 0.2s ease;
}
@keyframes mobile-flyout-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.mobile-flyout-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 60vh;
  background: #fff;
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
  z-index: 920;
  display: flex;
  flex-direction: column;
  animation: mobile-flyout-slide-up 0.25s ease;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
}
@keyframes mobile-flyout-slide-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
.mobile-flyout-handle {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
  cursor: pointer;
  flex-shrink: 0;
}
.mobile-flyout-handle-bar {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: #c2bbab;
}
.mobile-flyout-body {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 12px 8px;
}
.mobile-flyout-category {
  margin-bottom: 12px;
}
.mobile-flyout-category-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #8a3a3a;
  border-bottom: 1px solid #ece6d6;
  padding-bottom: 3px;
  margin-bottom: 8px;
}
.mobile-flyout-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
  gap: 6px;
}
.mobile-flyout-tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  min-height: 48px;
  padding: 6px 2px;
  border: 1px solid #ece6d6;
  border-radius: 8px;
  background: #f4f1ea;
  color: #2a2620;
  font-family: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.15s, background 0.15s;
}
.mobile-flyout-tool-btn:active {
  background: #ece6d6;
}
.mobile-flyout-tool-btn--active {
  border-color: #8a3a3a;
  background: #fff;
  color: #8a3a3a;
  box-shadow: 0 0 0 1px #8a3a3a;
}
.mobile-flyout-tool-icon {
  font-size: 20px;
  line-height: 1;
}
.mobile-flyout-tool-label {
  font-size: 9px;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  text-align: center;
  line-height: 1.1;
}

/* ---------- FAB --------------------------------------------------- */
.mobile-fab-container {
  position: fixed;
  right: 16px;
  z-index: 905;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.mobile-fab-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: #8a3a3a;
  color: #fff;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 8px rgba(0,0,0,0.25);
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, transform 0.15s;
  position: relative;
  touch-action: none;
}
.mobile-fab-btn:active {
  transform: scale(0.93);
}
.mobile-fab-btn--disabled {
  background: #c2bbab;
}
.mobile-fab-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  animation: mobile-fab-pop 0.2s ease;
}
@keyframes mobile-fab-pop {
  from { opacity: 0; transform: translateY(16px) scale(0.8); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.mobile-fab-menu-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid #c2bbab;
  background: #fff;
  color: #2a2620;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  -webkit-tap-highlight-color: transparent;
  position: relative;
}
.mobile-fab-menu-btn:active {
  background: #ece6d6;
}
.mobile-fab-menu-btn--disabled {
  opacity: 0.4;
  pointer-events: none;
}
.mobile-fab-menu-tooltip {
  position: absolute;
  right: 54px;
  white-space: nowrap;
  font-size: 11px;
  font-family: 'Courier New', Courier, monospace;
  background: #2a2620;
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  pointer-events: none;
}
.mobile-fab-backdrop {
  position: fixed;
  inset: 0;
  z-index: 904;
}
`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * **MobileToolbar** – A mobile-first toolbar for the dungeon mapper
 * (Phase 6.3).
 *
 * Renders a fixed bottom bar with quick-access tool buttons, a "More"
 * flyout panel for the full tool set, a contextual options bar, and a
 * floating action button (FAB) for undo / redo / utilities.
 *
 * Designed for touch screens ≤ 768 px. All hit targets meet the 44 px
 * WCAG minimum.
 */
export default function MobileToolbar(props: MobileToolbarProps) {
  const {
    viewMode,
    activeTool,
    activeTile,
    onSetTool,
    // drawing
    drawColor,
    drawWidth,
    onSetDrawColor,
    onSetDrawWidth,
    gmDrawColor,
    gmDrawWidth,
    onSetGmDrawColor,
    onSetGmDrawWidth,
    // measure
    measureShape,
    onSetMeasureShape,
    // marker
    markerShape,
    markerColor,
    markerSize,
    onSetMarkerShape,
    onSetMarkerColor,
    onSetMarkerSize,
    // fog
    onClearFog,
    onFillFog,
    // fab
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onOpenGenerateMap,
    onToggleViewMode,
  } = props;

  /* ---- state ---- */
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);

  // Long-press timer for FAB
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fabRef = useRef<HTMLDivElement>(null);

  /* ---- derived ---- */
  const isGm = viewMode === 'gm';
  const quickButtons = isGm ? GM_QUICK_BUTTONS : PLAYER_QUICK_BUTTONS;
  const categories = isGm ? GM_CATEGORIES : PLAYER_CATEGORIES;
  const showOptions = hasOptions(activeTool);

  /* ---- handlers ---- */
  const selectTool = useCallback(
    (tool: ToolType) => {
      onSetTool(tool);
      setFlyoutOpen(false);
    },
    [onSetTool],
  );

  const openFlyout = useCallback(() => setFlyoutOpen(true), []);
  const closeFlyout = useCallback(() => setFlyoutOpen(false), []);

  // FAB long-press handlers
  const fabTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setFabMenuOpen(true);
      longPressTimer.current = null;
    }, LONG_PRESS_DURATION_MS);
  }, []);

  const fabTouchEnd = useCallback(() => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      // Short press → undo
      onUndo();
    }
  }, [onUndo]);

  const fabTouchCancel = useCallback(() => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const closeFabMenu = useCallback(() => setFabMenuOpen(false), []);

  // Close FAB menu on outside tap
  useEffect(() => {
    if (!fabMenuOpen) return;
    const handler = (e: PointerEvent) => {
      if (fabRef.current?.contains(e.target as Node)) return;
      setFabMenuOpen(false);
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [fabMenuOpen]);

  /* ---- tile label helper ---- */
  const tileLabel = isBuiltInTileType(activeTile)
    ? TILE_LABELS[activeTile]
    : String(activeTile);

  /* ---- bottom bar height for FAB positioning ---- */
  const fabBottom = BAR_HEIGHT_PX + (showOptions ? OPTIONS_HEIGHT_PX : 0) + 12;

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="mobile-toolbar-root">
      {/* ---- Options bar ---- */}
      <div
        className={`mobile-options-bar ${showOptions ? 'mobile-options-visible' : 'mobile-options-hidden'}`}
      >
        {renderOptions()}
      </div>

      {/* ---- Bottom bar ---- */}
      <nav className="mobile-toolbar-bar" aria-label="Mobile toolbar">
        {quickButtons.map(btn => (
          <button
            key={btn.tool}
            type="button"
            className={`mobile-toolbar-btn ${activeTool === btn.tool ? 'mobile-toolbar-btn--active' : ''}`}
            onClick={() => selectTool(btn.tool)}
            aria-label={btn.label}
            aria-pressed={activeTool === btn.tool}
          >
            <span className="mobile-toolbar-btn-icon" aria-hidden="true">
              {btn.icon}
            </span>
            <span className="mobile-toolbar-btn-label">{btn.label}</span>
          </button>
        ))}
        {/* More button */}
        <button
          type="button"
          className={`mobile-toolbar-btn ${flyoutOpen ? 'mobile-toolbar-btn--active' : ''}`}
          onClick={openFlyout}
          aria-label="More tools"
          aria-expanded={flyoutOpen}
        >
          <span className="mobile-toolbar-btn-icon" aria-hidden="true">⋯</span>
          <span className="mobile-toolbar-btn-label">More</span>
        </button>
      </nav>

      {/* ---- Flyout panel ---- */}
      {flyoutOpen && (
        <>
          <div
            className="mobile-flyout-backdrop"
            onClick={closeFlyout}
            role="presentation"
          />
          <div
            className="mobile-flyout-panel"
            role="dialog"
            aria-label="All tools"
          >
            {/* Drag handle / close area */}
            <div
              className="mobile-flyout-handle"
              onClick={closeFlyout}
              role="button"
              tabIndex={0}
              aria-label="Close panel"
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') closeFlyout();
              }}
            >
              <div className="mobile-flyout-handle-bar" />
            </div>

            {/* Tool categories */}
            <div className="mobile-flyout-body">
              {categories.map(cat => (
                <div key={cat.label} className="mobile-flyout-category">
                  <div className="mobile-flyout-category-label">{cat.label}</div>
                  <div className="mobile-flyout-grid">
                    {cat.tools.map(toolId => {
                      const meta = toolMeta(toolId);
                      return (
                        <button
                          key={toolId}
                          type="button"
                          className={`mobile-flyout-tool-btn ${activeTool === toolId ? 'mobile-flyout-tool-btn--active' : ''}`}
                          onClick={() => selectTool(toolId)}
                          aria-label={meta.label}
                          aria-pressed={activeTool === toolId}
                        >
                          <span className="mobile-flyout-tool-icon" aria-hidden="true">
                            {meta.icon}
                          </span>
                          <span className="mobile-flyout-tool-label">
                            {meta.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ---- FAB ---- */}
      <div
        className="mobile-fab-container"
        style={{ bottom: fabBottom }}
        ref={fabRef}
      >
        {/* FAB expanded menu */}
        {fabMenuOpen && (
          <>
            <div
              className="mobile-fab-backdrop"
              onClick={closeFabMenu}
              role="presentation"
            />
            <div className="mobile-fab-menu" role="menu">
              <button
                type="button"
                className={`mobile-fab-menu-btn ${!canRedo ? 'mobile-fab-menu-btn--disabled' : ''}`}
                onClick={() => { onRedo(); closeFabMenu(); }}
                disabled={!canRedo}
                aria-label="Redo"
                role="menuitem"
              >
                <span aria-hidden="true">↪</span>
                <span className="mobile-fab-menu-tooltip">Redo</span>
              </button>
              <button
                type="button"
                className="mobile-fab-menu-btn"
                onClick={() => { onOpenGenerateMap(); closeFabMenu(); }}
                aria-label="Generate map"
                role="menuitem"
              >
                <span aria-hidden="true">🎲</span>
                <span className="mobile-fab-menu-tooltip">Generate</span>
              </button>
              <button
                type="button"
                className="mobile-fab-menu-btn"
                onClick={() => { onToggleViewMode(); closeFabMenu(); }}
                aria-label={isGm ? 'Switch to player view' : 'Switch to GM view'}
                role="menuitem"
              >
                <span aria-hidden="true">{isGm ? '👁' : '✏️'}</span>
                <span className="mobile-fab-menu-tooltip">
                  {isGm ? 'Player' : 'GM'}
                </span>
              </button>
              <button
                type="button"
                className={`mobile-fab-menu-btn ${!canUndo ? 'mobile-fab-menu-btn--disabled' : ''}`}
                onClick={() => { onUndo(); closeFabMenu(); }}
                disabled={!canUndo}
                aria-label="Undo"
                role="menuitem"
              >
                <span aria-hidden="true">↩</span>
                <span className="mobile-fab-menu-tooltip">Undo</span>
              </button>
            </div>
          </>
        )}

        {/* Main FAB */}
        <button
          type="button"
          className={`mobile-fab-btn ${!canUndo ? 'mobile-fab-btn--disabled' : ''}`}
          onTouchStart={fabTouchStart}
          onTouchEnd={fabTouchEnd}
          onTouchCancel={fabTouchCancel}
          onMouseDown={fabTouchStart}
          onMouseUp={fabTouchEnd}
          aria-label="Undo (long press for more)"
        >
          ↩
        </button>
      </div>
    </div>
  );

  /* ================================================================ */
  /*  Options bar content                                              */
  /* ================================================================ */

  function renderOptions(): React.ReactNode {
    if (!showOptions) return null;

    /* Paint / Fill → tile indicator */
    if (PAINT_TOOLS.has(activeTool)) {
      return (
        <>
          <span className="mobile-options-label">Tile</span>
          <span className="mobile-options-tile-badge">{tileLabel}</span>
        </>
      );
    }

    /* Player draw / GM draw → color + width */
    if (DRAW_TOOLS.has(activeTool)) {
      const isPdraw = activeTool === 'pdraw';
      const color = isPdraw ? drawColor : gmDrawColor;
      const width = isPdraw ? drawWidth : gmDrawWidth;
      const setColor = isPdraw ? onSetDrawColor : onSetGmDrawColor;
      const setWidth = isPdraw ? onSetDrawWidth : onSetGmDrawWidth;

      return (
        <>
          <span className="mobile-options-label">Color</span>
          <div
            className="mobile-options-swatch"
            style={{ backgroundColor: color }}
          >
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              aria-label="Draw color"
            />
          </div>
          <span className="mobile-options-label">Width</span>
          <input
            type="range"
            className="mobile-options-slider"
            min={1}
            max={20}
            value={width}
            onChange={e => setWidth(Number(e.target.value))}
            aria-label="Draw width"
          />
          <span className="mobile-options-size-label">{width}px</span>
        </>
      );
    }

    /* Measure → shape buttons */
    if (activeTool === MEASURE_TOOL) {
      return (
        <>
          <span className="mobile-options-label">Shape</span>
          {MEASURE_SHAPES.map(s => (
            <button
              key={s}
              type="button"
              className={`mobile-options-btn ${measureShape === s ? 'mobile-options-btn--active' : ''}`}
              onClick={() => onSetMeasureShape(s)}
              aria-label={MEASURE_SHAPE_LABELS[s]}
              aria-pressed={measureShape === s}
            >
              {MEASURE_SHAPE_ICONS[s]} {MEASURE_SHAPE_LABELS[s]}
            </button>
          ))}
        </>
      );
    }

    /* Marker → shape + color + size */
    if (activeTool === MARKER_TOOL) {
      return (
        <>
          {/* Shape buttons */}
          {MARKER_SHAPES.map(s => (
            <button
              key={s}
              type="button"
              className={`mobile-options-btn ${markerShape === s ? 'mobile-options-btn--active' : ''}`}
              onClick={() => onSetMarkerShape(s)}
              aria-label={MARKER_SHAPE_LABELS[s]}
              aria-pressed={markerShape === s}
            >
              {MARKER_SHAPE_ICONS[s]}
            </button>
          ))}

          {/* Color swatches */}
          {MARKER_COLORS.map(c => (
            <button
              key={c}
              type="button"
              className={`mobile-options-color-btn ${markerColor === c ? 'mobile-options-color-btn--active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => onSetMarkerColor(c)}
              aria-label={`Marker color ${c}`}
              aria-pressed={markerColor === c}
            />
          ))}

          {/* Size slider */}
          <input
            type="range"
            className="mobile-options-slider"
            min={1}
            max={5}
            value={markerSize}
            onChange={e => onSetMarkerSize(Number(e.target.value))}
            aria-label="Marker size"
          />
          <span className="mobile-options-size-label">{markerSize}</span>
        </>
      );
    }

    /* Fog tools → Clear / Fill buttons */
    if (FOG_TOOLS.has(activeTool)) {
      return (
        <>
          <span className="mobile-options-label">Fog</span>
          <button
            type="button"
            className="mobile-options-btn"
            onClick={onClearFog}
          >
            Clear All
          </button>
          <button
            type="button"
            className="mobile-options-btn"
            onClick={onFillFog}
          >
            Fill All
          </button>
        </>
      );
    }

    return null;
  }
}
