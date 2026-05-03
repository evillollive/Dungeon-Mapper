import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import MapCanvas, { type MapCanvasHandle } from './components/MapCanvas';
import Toolbar from './components/Toolbar';
import PlayerToolbar from './components/PlayerToolbar';
import MobileToolbar from './components/MobileToolbar';
import NotesPanel from './components/NotesPanel';
import InitiativePanel from './components/InitiativePanel';
import IconPicker from './components/IconPicker';
import MapHeader, { type MapHeaderHandle } from './components/MapHeader';
import GenerateMapDialog from './components/GenerateMapDialog';
import PremadeMapsDialog from './components/PremadeMapsDialog';
import CustomThemeDialog from './components/CustomThemeDialog';
import ShortcutsHelp from './components/ShortcutsHelp';
import ExportDialog from './components/ExportDialog';
import type { GeneratedMap } from './utils/generators';
import { useMapState, getClipboard } from './hooks/useMapState';
import { useDrawingTool } from './hooks/useDrawingTool';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { exportMapSVG } from './utils/export';
import { isTokenFogged } from './utils/tokenVisibility';
import { computeFOV } from './utils/fov';
import { computePlayerFOV, mergeExplored } from './utils/dynamicFog';
import { computeLightVisible } from './utils/lightSources';
import { buildThemeList, getThemeWithCustom } from './utils/customThemes';
import { ALL_TILE_TYPES, isBuiltInTileType, type ToolType, type ViewMode, type MarkerShape, type TokenKind, type MeasureShape, type LightSourcePreset, LIGHT_SOURCE_PRESETS } from './types/map';
import LevelTabs from './components/LevelTabs';
import { ToolContext, type ToolContextValue } from './contexts/ToolContext';
import { MapContext, type MapContextValue } from './contexts/MapContext';
import { ViewContext, type ViewContextValue } from './contexts/ViewContext';
import { ActionContext, type ActionContextValue } from './contexts/ActionContext';
import './App.css';

const UI_SCALE_STORAGE_KEY = 'dungeon-mapper:ui-scale';
const UI_SCALE_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5] as const;
const DEFAULT_UI_SCALE = 1;
const MIN_UI_SCALE = UI_SCALE_OPTIONS[0];
const MAX_UI_SCALE = UI_SCALE_OPTIONS[UI_SCALE_OPTIONS.length - 1];

const PRESERVE_THEME_STORAGE_KEY = 'dungeon-mapper:preserve-on-theme-switch';
const VIEW_MODE_STORAGE_KEY = 'dungeon-mapper:view-mode';
const GM_SHOW_FOG_STORAGE_KEY = 'dungeon-mapper:gm-show-fog';

// Stable no-op handlers for the player-view notes panel — defined at module
// scope so we don't allocate fresh callbacks on every render.
const NOOP_UPDATE_NOTE = () => { /* read-only in player view */ };
const NOOP_DELETE_NOTE = () => { /* read-only in player view */ };
const NOOP_ACTIVATE_NOTE_TOOL = () => { /* note tool is GM-only */ };

function loadInitialPreserveOnThemeSwitch(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PRESERVE_THEME_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function loadInitialViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'gm';
  try {
    return window.localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'player' ? 'player' : 'gm';
  } catch {
    return 'gm';
  }
}

function loadInitialGmShowFog(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(GM_SHOW_FOG_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function loadInitialUIScale(): number {
  if (typeof window === 'undefined') return DEFAULT_UI_SCALE;
  try {
    const raw = window.localStorage.getItem(UI_SCALE_STORAGE_KEY);
    if (!raw) return DEFAULT_UI_SCALE;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_UI_SCALE;
    // Clamp to the supported range to avoid extreme values from older
    // versions or hand-edited storage breaking the layout. Older
    // versions used a different baseline where the user's "150%" was
    // today's "100%", so values outside the new range collapse to the
    // nearest supported option.
    return Math.min(Math.max(parsed, MIN_UI_SCALE), MAX_UI_SCALE);
  } catch {
    return DEFAULT_UI_SCALE;
  }
}

function App() {
  const {
    map,
    project,
    activeLevelIndex,
    selectedNoteId,
    setSelectedNoteId,
    setTile,
    fillTiles,
    setTiles,
    setMapName,
    resizeMap,
    clearMap,
    newMap,
    loadProjectData,
    generateMap,
    applyGeneratedRegion,
    addNote,
    updateNote,
    deleteNote,
    setTileSize,
    setTheme,
    saveCustomTheme,
    deleteCustomTheme,
    undo,
    redo,
    canUndo,
    canRedo,
    setFogCells,
    fillAllFog,
    setFogEnabled,
    setDynamicFogEnabled,
    setExplored,
    resetExplored,
    addToken,
    moveToken,
    removeToken,
    updateToken,
    reorderInitiative,
    clearInitiative,
    addAnnotation,
    removeAnnotation,
    clearAnnotations,
    copySelection,
    cutSelection,
    pasteClipboard,
    addMarker,
    removeMarker,
    clearMarkers,
    setBackgroundImage,
    clearBackgroundImage,
    updateBackgroundImage,
    addLightSource,
    removeLightSource,
    clearLightSources,
    addStamp,
    moveStamp,
    removeStamp,
    clearStamps,
    updateStamp,
    bringStampToFront,
    sendStampToBack,
    switchLevel,
    addLevel,
    renameLevel,
    deleteLevel,
    duplicateLevel,
    reorderLevels,
    addStairLink,
    removeStairLink,
  } = useMapState();

  const {
    activeTool,
    setActiveTool,
    activeTile,
    setActiveTile,
  } = useDrawingTool();

  const canvasRef = useRef<MapCanvasHandle>(null);
  const headerRef = useRef<MapHeaderHandle>(null);
  const themeId = map.meta.theme ?? 'dungeon';
  const customThemes = useMemo(() => project.customThemes ?? [], [project.customThemes]);
  const themeList = useMemo(() => buildThemeList(customThemes), [customThemes]);
  const [printMode, setPrintMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(loadInitialViewMode);
  const [uiScale, setUIScale] = useState<number>(loadInitialUIScale);
  const [preserveOnThemeSwitch, setPreserveOnThemeSwitch] = useState<boolean>(
    loadInitialPreserveOnThemeSwitch
  );
  const [gmShowFog, setGmShowFog] = useState<boolean>(loadInitialGmShowFog);
  const [showGenerateDialog, setShowGenerateDialog] = useState<boolean>(false);
  const [showPremadeMapsDialog, setShowPremadeMapsDialog] = useState<boolean>(false);
  const [showCustomThemeDialog, setShowCustomThemeDialog] = useState<boolean>(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState<boolean>(false);
  const [showExportDialog, setShowExportDialog] = useState<boolean>(false);
  // Polite live-region message announced to screen readers when the user
  // performs an action whose visual feedback is the canvas (e.g. undo,
  // theme switch, view-mode toggle). Cleared automatically a moment
  // later so the same message can be announced again if the user
  // repeats the action.
  const [statusMessage, setStatusMessage] = useState<string>('');
  // Latest selection rectangle painted with the Select tool (in tile
  // coordinates), mirrored from `MapCanvas` so the Generate Map dialog can
  // offer "Generate into selection" as a target region. `null` when no
  // selection is active.
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // Token currently highlighted in the Initiative panel (and rendered with
  // a yellow ring on the map). Cleared on view-mode switch and when the
  // user clicks the same entry again.
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  // Player drawing pen state — color and brush width are UI-only and not
  // persisted on the map; they're a per-session preference.
  const [drawColor, setDrawColor] = useState<string>('#dc2626');
  const [drawWidth, setDrawWidth] = useState<number>(0.25);
  // GM drawing pen state — separate from player pen so each has independent
  // color/width preferences.
  const [gmDrawColor, setGmDrawColor] = useState<string>('#ff6b6b');
  const [gmDrawWidth, setGmDrawWidth] = useState<number>(0.25);
  // Stamp tool settings — currently selected stamp definition id.
  const [selectedStampId, setSelectedStampId] = useState<string | null>(null);
  // Currently selected placed stamp id (for transform controls).
  const [selectedPlacedStampId, setSelectedPlacedStampId] = useState<number | null>(null);
  // Marker tool settings — shape, color, radius (in tiles).
  const [markerShape, setMarkerShape] = useState<MarkerShape>('circle');
  const [markerColor, setMarkerColor] = useState<string>('#dc2626');
  const [markerSize, setMarkerSize] = useState<number>(2);
  // Measure tool settings — shape and scale (feet per cell).
  const [measureShape, setMeasureShape] = useState<MeasureShape>('ruler');
  const [measureFeetPerCell, setMeasureFeetPerCell] = useState<number>(5);
  // Light source tool settings — preset, radius (cells), and glow color.
  const [lightPreset, setLightPreset] = useState<LightSourcePreset>('torch');
  const [lightRadius, setLightRadius] = useState<number>(LIGHT_SOURCE_PRESETS[0].radius);
  const [lightColor, setLightColor] = useState<string>(LIGHT_SOURCE_PRESETS[0].color);
  // Icon picker dialog state. When a token is placed and the user should
  // pick an icon, we store the pending token details and show the picker.
  const [showIconPicker, setShowIconPicker] = useState(false);
  const pendingTokenRef = useRef<{
    kind: TokenKind; x: number; y: number; label?: string; size?: number;
  } | null>(null);
  // Track clipboard state for the paste preview overlay on the canvas.
  // Updated after every copy/cut so the canvas knows whether a paste
  // preview should be rendered and how large the buffer is.
  const [clipboardInfo, setClipboardInfo] = useState<{ w: number; h: number } | null>(null);

  // ── Responsive layout panel state ──────────────────────────────────
  // Collapsible toolbar (left) and drawer panel (right) for tablet/mobile.
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  // ── Mobile detection (≤768px) ─────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
  );
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // FOV / Line-of-Sight state. The origin is the cell the user clicked
  // with the FOV tool; the visible set is recomputed whenever the origin
  // or the tile grid changes.
  const [fovOrigin, setFovOrigin] = useState<{ x: number; y: number } | null>(null);

  const fovVisible = useMemo(() => {
    if (!fovOrigin || activeTool !== 'fov') return null;
    return computeFOV(map.tiles, fovOrigin.x, fovOrigin.y, 0, customThemes);
  }, [fovOrigin, map.tiles, activeTool, customThemes]);

  // When the user clicks a cell with the FOV tool, toggle the origin on/off.
  // Clicking the same cell again clears it; clicking a different cell moves it.
  const handleFovClick = useCallback((x: number, y: number) => {
    setFovOrigin(prev => {
      if (prev && prev.x === x && prev.y === y) return null;
      return { x, y };
    });
  }, []);

  // ── Stair Link tool ─────────────────────────────────────────────────
  // When the link-stair tool is active, the user clicks a stairs tile to
  // set the "pending source", then switches levels and clicks a destination
  // stairs tile. The pending source is cleared when the tool changes.
  const [stairLinkSource, setStairLinkSource] = useState<{
    level: number; x: number; y: number;
  } | null>(null);

  // Clear pending source when the tool changes away from link-stair.
  const handleSetActiveTool = useCallback((tool: ToolType | ((prev: ToolType) => ToolType)) => {
    setActiveTool((prev: ToolType) => {
      const next = typeof tool === 'function' ? tool(prev) : tool;
      if (prev === 'link-stair' && next !== 'link-stair') {
        setStairLinkSource(null);
      }
      // Deselect placed stamp when leaving stamp tools.
      const isStampTool = (t: ToolType) => t === 'stamp' || t === 'move-stamp' || t === 'remove-stamp';
      if (isStampTool(prev) && !isStampTool(next)) {
        setSelectedPlacedStampId(null);
      }
      return next;
    });
  }, [setActiveTool]);

  // Compute stair links relevant to the active level for canvas rendering.
  const activeStairLinks = useMemo(() => {
    return project.stairLinks.filter(
      l => l.fromLevel === activeLevelIndex || l.toLevel === activeLevelIndex,
    );
  }, [project.stairLinks, activeLevelIndex]);

  const handleStairLinkClick = useCallback((x: number, y: number) => {
    const tile = map.tiles[y]?.[x]?.type;
    if (tile !== 'stairs-up' && tile !== 'stairs-down') return;

    if (!stairLinkSource) {
      // First click: set as source.
      setStairLinkSource({ level: activeLevelIndex, x, y });
    } else {
      // Second click: create the link (must be on a different level).
      if (stairLinkSource.level === activeLevelIndex &&
          stairLinkSource.x === x && stairLinkSource.y === y) {
        // Clicking the same cell clears the selection.
        setStairLinkSource(null);
        return;
      }
      addStairLink({
        fromLevel: stairLinkSource.level,
        fromCell: { x: stairLinkSource.x, y: stairLinkSource.y },
        toLevel: activeLevelIndex,
        toCell: { x, y },
      });
      setStairLinkSource(null);
    }
  }, [stairLinkSource, activeLevelIndex, map.tiles, addStairLink]);

  // Navigate to destination when double-clicking a linked stair.
  const handleStairNavigate = useCallback((x: number, y: number) => {
    const link = project.stairLinks.find(
      l => (l.fromLevel === activeLevelIndex && l.fromCell.x === x && l.fromCell.y === y) ||
           (l.toLevel === activeLevelIndex && l.toCell.x === x && l.toCell.y === y),
    );
    if (!link) return;
    // Determine destination.
    const isFrom = link.fromLevel === activeLevelIndex &&
                   link.fromCell.x === x && link.fromCell.y === y;
    const destLevel = isFrom ? link.toLevel : link.fromLevel;
    const destCell = isFrom ? link.toCell : link.fromCell;
    switchLevel(destLevel);
    // Center on destination after a brief delay to let the level swap render.
    requestAnimationFrame(() => {
      canvasRef.current?.centerOnTile(destCell.x, destCell.y);
    });
  }, [project.stairLinks, activeLevelIndex, switchLevel]);

  // ── Dynamic Fog of War ──────────────────────────────────────────────
  // When dynamic fog is enabled, compute the union FOV from all player
  // tokens and merge newly-visible cells into the persisted explored grid.
  const dynamicFogEnabled = (map.dynamicFogEnabled ?? false) && (map.fogEnabled ?? false);
  const playerVisible = useMemo(() => {
    if (!dynamicFogEnabled) return null;
    return computePlayerFOV(map.tiles, map.tokens ?? [], customThemes);
  }, [dynamicFogEnabled, map.tiles, map.tokens, customThemes]);

  // ── Light Sources ───────────────────────────────────────────────────
  // Compute the union FOV from all placed light sources. When dynamic fog
  // is enabled, `lightVisible` cells are treated as "visible" (clear) in
  // the fog renderer, even without a player token in direct line-of-sight.
  // When dynamic fog is off, `lightVisible` is used only for the canvas
  // glow overlay — no fog is removed.
  const lightVisible = useMemo(
    () => computeLightVisible(map.tiles, map.lightSources, customThemes),
    [map.tiles, map.lightSources, customThemes],
  );

  // Whenever the visible set changes, merge into the explored grid so
  // previously-seen cells stay marked even after tokens move away.
  // Light sources also contribute to explored so lit areas stay dimmed
  // after a light source is removed.
  useEffect(() => {
    if (!dynamicFogEnabled) return;
    const w = map.meta.width;
    const h = map.meta.height;
    const currentExplored = map.explored ?? Array.from({ length: h }, () => Array<boolean>(w).fill(false));

    // Merge both player-visible and light-visible cells into explored.
    let merged = currentExplored;
    if (playerVisible) {
      merged = mergeExplored(merged, playerVisible, w, h);
    }
    if (lightVisible) {
      merged = mergeExplored(merged, lightVisible, w, h);
    }
    if (merged !== currentExplored) {
      setExplored(merged);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerVisible, lightVisible, dynamicFogEnabled]);

  const handleToggleDynamicFog = useCallback(() => {
    setDynamicFogEnabled(!dynamicFogEnabled);
  }, [dynamicFogEnabled, setDynamicFogEnabled]);

  const handleResetExplored = useCallback(() => resetExplored(), [resetExplored]);

  // Briefly announce a status message via the polite live region. The
  // automatic blank-out makes repeated identical announcements (e.g. two
  // consecutive Ctrl+Z presses) get re-read by screen readers.
  const announce = useCallback((message: string) => {
    setStatusMessage('');
    // Defer to the next tick so the empty string is committed first; the
    // live region fires only when its text actually changes.
    requestAnimationFrame(() => setStatusMessage(message));
  }, []);

  // Wrap undo/redo so the announcement happens whenever the user invokes
  // them — including via the global keyboard shortcut.
  const handleUndo = useCallback(() => {
    undo();
    announce('Undid last action');
  }, [undo, announce]);
  const handleRedo = useCallback(() => {
    redo();
    announce('Redid last action');
  }, [redo, announce]);
  const handleTogglePrintMode = useCallback(() => {
    setPrintMode(prev => {
      const next = !prev;
      announce(next ? 'Print mode on' : 'Print mode off');
      return next;
    });
  }, [announce]);
  const handleToggleGmShowFogAnnounced = useCallback(() => {
    setGmShowFog(prev => {
      const next = !prev;
      announce(next ? 'Show fog preview on' : 'Show fog preview off');
      return next;
    });
  }, [announce]);

  // When switching view modes, snap the active tool to a sensible default
  // for that mode so the user isn't left holding a tool the new toolbar
  // doesn't expose. Fog tools (reveal/hide) live on the player toolbar
  // now, so they're treated as player tools for this purpose.
  const switchViewMode = useCallback(() => {
    setViewMode(prev => {
      const next: ViewMode = prev === 'gm' ? 'player' : 'gm';
      handleSetActiveTool(next === 'player' ? 'pdraw' : 'paint');
      announce(next === 'player' ? 'Switched to Present mode' : 'Switched to Edit mode');
      try {
        window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, next);
      } catch {
        // Ignore storage failures; the toggle still applies for the session.
      }
      return next;
    });
  }, [handleSetActiveTool, announce]);

  const fogEnabled = map.fogEnabled ?? false;
  const handleToggleFogEnabled = useCallback(() => {
    setFogEnabled(!fogEnabled);
  }, [fogEnabled, setFogEnabled]);
  const handleResetFog = useCallback(() => fillAllFog(true), [fillAllFog]);
  const handleClearFog = useCallback(() => fillAllFog(false), [fillAllFog]);
  const handleClearPlayerDrawings = useCallback(() => clearAnnotations('player'), [clearAnnotations]);
  const handleClearGmDrawings = useCallback(() => clearAnnotations('gm'), [clearAnnotations]);

  // When a token is placed, prompt for name (player view) then open the
  // icon picker so the user can choose an icon for the token.
  const handleAddToken = useCallback(
    (kind: Parameters<typeof addToken>[0], x: number, y: number, _label?: string, size?: number) => {
      let label: string | undefined;
      if (viewMode === 'player') {
        const defaultName = kind.charAt(0).toUpperCase() + kind.slice(1);
        const raw = window.prompt(`Name for this ${kind}?`, defaultName);
        if (raw === null) return;
        const trimmed = raw.trim();
        label = trimmed.length > 0 ? trimmed : undefined;
      }
      // Store the pending token and open the icon picker.
      pendingTokenRef.current = { kind, x, y, label, size };
      setShowIconPicker(true);
    },
    [viewMode]
  );

  const handleIconSelected = useCallback((iconId: string) => {
    setShowIconPicker(false);
    const pending = pendingTokenRef.current;
    if (!pending) return;
    pendingTokenRef.current = null;
    const tokenId = addToken(pending.kind, pending.x, pending.y, pending.label, pending.size);
    // If the user selected a library icon, update the token with it.
    if (iconId && tokenId != null) {
      updateToken(tokenId, { icon: iconId });
    }
  }, [addToken, updateToken]);

  const handleIconPickerCancel = useCallback(() => {
    setShowIconPicker(false);
    // Still place the token even if the user cancels — just without a
    // library icon (falls back to emoji/letter).
    const pending = pendingTokenRef.current;
    if (!pending) return;
    pendingTokenRef.current = null;
    addToken(pending.kind, pending.x, pending.y, pending.label, pending.size);
  }, [addToken]);

  const handleRenameToken = useCallback((id: number, label: string) => {
    updateToken(id, { label });
  }, [updateToken]);

  // Whether the current map has any non-empty tiles. Used by the generator
  // dialog to decide whether to show a stronger overwrite warning.
  const hasExistingContent = useMemo(
    () => map.tiles.some(row => row.some(t => t.type !== 'empty')) ||
      (map.notes?.length ?? 0) > 0 ||
      (map.tokens?.length ?? 0) > 0,
    [map.tiles, map.notes, map.tokens]
  );

  const handleOpenGenerateMap = useCallback(() => setShowGenerateDialog(true), []);
  const handleCancelGenerateMap = useCallback(() => setShowGenerateDialog(false), []);
  const handleGenerateMap = useCallback(
    (
      result: GeneratedMap,
      suggestedName: string,
      target?: { x: number; y: number; w: number; h: number }
    ) => {
      if (target) {
        // Stamp into the existing map at the selection's offset; the rest
        // of the canvas (notes outside the rect, tokens, fog) is kept.
        applyGeneratedRegion(result.tiles, target.x, target.y, result.notes);
      } else {
        generateMap(result.tiles, result.width, result.height, result.notes, suggestedName);
      }
      setShowGenerateDialog(false);
      announce('Map generated');
    },
    [generateMap, applyGeneratedRegion, announce]
  );

  const handleSetTheme = useCallback((next: string, preserveExisting?: boolean) => {
    setTheme(next, preserveExisting);
    const themeName = themeList.find(t => t.id === next)?.name ?? next;
    announce(`Theme switched to ${themeName}`);
  }, [setTheme, announce, themeList]);

  // Cycle the active theme by `direction` (+1 next, -1 previous), wrapping
  // around at the ends of the alphabetised theme list. Driven by the T /
  // Shift+T global shortcuts; preserves the current preserve-existing
  // setting so users who've opted in keep their hand-painted tiles.
  const cycleTheme = useCallback((direction: 1 | -1) => {
    const idx = themeList.findIndex(t => t.id === themeId);
    const start = idx >= 0 ? idx : 0;
    const len = themeList.length;
    const next = themeList[((start + direction) % len + len) % len];
    handleSetTheme(next.id, preserveOnThemeSwitch);
  }, [themeId, themeList, preserveOnThemeSwitch, handleSetTheme]);

  // Cycle the active palette tile by `direction`. Wraps around the
  // displayed palette (`ALL_TILE_TYPES`); used by the [/] shortcuts so
  // keyboard users can change paint targets without reaching for the
  // mouse.
  const cycleActiveTile = useCallback((direction: 1 | -1) => {
    const idx = isBuiltInTileType(activeTile) ? ALL_TILE_TYPES.indexOf(activeTile) : -1;
    const start = idx >= 0 ? idx : 0;
    const len = ALL_TILE_TYPES.length;
    const next = ALL_TILE_TYPES[((start + direction) % len + len) % len];
    setActiveTile(next);
  }, [activeTile, setActiveTile]);

  const adjustUIScale = useCallback((direction: 1 | -1) => {
    setUIScale(prev => {
      const idx = UI_SCALE_OPTIONS.indexOf(prev as typeof UI_SCALE_OPTIONS[number]);
      // Fall back to the default index if the current scale was loaded
      // from storage outside the supported set.
      const start = idx >= 0 ? idx : UI_SCALE_OPTIONS.indexOf(DEFAULT_UI_SCALE);
      const nextIdx = Math.max(0, Math.min(UI_SCALE_OPTIONS.length - 1, start + direction));
      const next = UI_SCALE_OPTIONS[nextIdx];
      if (next !== prev) {
        announce(`UI scale ${Math.round(next * 100)}%`);
      }
      return next;
    });
  }, [announce]);

  // Persist the preserve-on-theme-switch preference across sessions.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        PRESERVE_THEME_STORAGE_KEY,
        preserveOnThemeSwitch ? '1' : '0'
      );
    } catch {
      // Ignore storage failures (e.g. private mode).
    }
  }, [preserveOnThemeSwitch]);

  // Persist the GM "Show Fog" preview toggle across sessions.
  useEffect(() => {
    try {
      window.localStorage.setItem(GM_SHOW_FOG_STORAGE_KEY, gmShowFog ? '1' : '0');
    } catch {
      // Ignore storage failures (e.g. private mode).
    }
  }, [gmShowFog]);

  // Apply the UI scale to :root so every CSS rule using --ui-scale picks
  // it up, and persist the preference across sessions.
  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', String(uiScale));
    try {
      window.localStorage.setItem(UI_SCALE_STORAGE_KEY, String(uiScale));
    } catch {
      // Ignore storage failures (e.g. private mode); scale still applies
      // for the current session.
    }
  }, [uiScale]);

  // When a note is selected from the panel, center the map viewport on it.
  const handleSelectNote = useCallback((id: number | null) => {
    setSelectedNoteId(id);
    if (id != null) {
      const note = map.notes.find(n => n.id === id);
      if (note) {
        canvasRef.current?.centerOnTile(note.x, note.y);
      }
    }
  }, [setSelectedNoteId, map.notes]);

  const handleEraseTiles = useCallback((tiles: { x: number; y: number }[]) => {
    setTiles(tiles.map(t => ({ ...t, type: 'empty' as const })));
  }, [setTiles]);

  const handleExportSVG = useCallback(() => {
    const theme = getThemeWithCustom(themeId, customThemes);
    exportMapSVG(map, theme, id => getThemeWithCustom(id, customThemes), { viewMode });
  }, [map, themeId, customThemes, viewMode]);

  // Auto-clear the polite live-region message a second after announcing
  // it, so the same string can be announced again on the next action.
  useEffect(() => {
    if (!statusMessage) return;
    const id = window.setTimeout(() => setStatusMessage(''), 1500);
    return () => window.clearTimeout(id);
  }, [statusMessage]);

  // Clipboard handlers for copy / cut / paste within the selection.
  // `selection` holds the current user-painted rectangle (if any) — see
  // the useState + onSelectionChange wiring below. Copy and cut require
  // an active selection; paste places at the selection's top-left (or the
  // top-left of the map when no selection is active).
  const handleCopySelection = useCallback(() => {
    if (!selection) return;
    copySelection(selection);
    const buf = getClipboard();
    if (buf) setClipboardInfo({ w: buf.width, h: buf.height });
    announce('Selection copied');
  }, [selection, copySelection, announce]);

  const handleCutSelection = useCallback(() => {
    if (!selection) return;
    cutSelection(selection);
    const buf = getClipboard();
    if (buf) setClipboardInfo({ w: buf.width, h: buf.height });
    announce('Selection cut');
  }, [selection, cutSelection, announce]);

  const handlePasteClipboard = useCallback(() => {
    const origin = selection ?? { x: 0, y: 0 };
    pasteClipboard(origin.x, origin.y);
    announce('Pasted from clipboard');
  }, [selection, pasteClipboard, announce]);

  // Centralised global keyboard shortcuts. The hook owns one keydown
  // listener and dispatches to the wired actions; the registry it returns
  // also feeds the in-app help overlay.
  const shortcutBindings = useGlobalShortcuts({
    setActiveTool: handleSetActiveTool,
    undo: handleUndo,
    redo: handleRedo,
    togglePrintMode: handleTogglePrintMode,
    toggleViewMode: switchViewMode,
    openGenerateMap: handleOpenGenerateMap,
    showShortcuts: () => setShowShortcutsHelp(true),
    triggerNewMap: () => headerRef.current?.triggerNew(),
    triggerImport: () => headerRef.current?.triggerImport(),
    triggerExportJSON: () => headerRef.current?.triggerExportJSON(),
    triggerExportPNG: () => headerRef.current?.triggerExportPNG(),
    triggerExportSVG: handleExportSVG,
    openExportDialog: () => setShowExportDialog(true),
    cycleTheme,
    cycleActiveTile,
    zoomIn: () => canvasRef.current?.zoomIn(),
    zoomOut: () => canvasRef.current?.zoomOut(),
    zoomReset: () => canvasRef.current?.zoomReset(),
    fitToScreen: () => canvasRef.current?.fitToScreen(),
    uiScaleUp: () => adjustUIScale(1),
    uiScaleDown: () => adjustUIScale(-1),
    isGmView: () => viewMode === 'gm',
    copySelection: handleCopySelection,
    cutSelection: handleCutSelection,
    pasteClipboard: handlePasteClipboard,
    toggleFov: () => {
      if (viewMode === 'gm') {
        handleSetActiveTool(prev => prev === 'fov' ? 'paint' : 'fov');
      }
    },
    nextLevel: () => {
      if (activeLevelIndex < project.levels.length - 1) {
        switchLevel(activeLevelIndex + 1);
      }
    },
    prevLevel: () => {
      if (activeLevelIndex > 0) {
        switchLevel(activeLevelIndex - 1);
      }
    },
    rotateStampCW: () => {
      if (selectedPlacedStampId == null) return;
      const stamp = (map.stamps ?? []).find(s => s.id === selectedPlacedStampId);
      if (!stamp) return;
      updateStamp(selectedPlacedStampId, { rotation: ((stamp.rotation || 0) + 90) % 360 });
    },
    flipStampH: () => {
      if (selectedPlacedStampId == null) return;
      const stamp = (map.stamps ?? []).find(s => s.id === selectedPlacedStampId);
      if (!stamp) return;
      updateStamp(selectedPlacedStampId, { flipX: !stamp.flipX });
    },
    flipStampV: () => {
      if (selectedPlacedStampId == null) return;
      const stamp = (map.stamps ?? []).find(s => s.id === selectedPlacedStampId);
      if (!stamp) return;
      updateStamp(selectedPlacedStampId, { flipY: !stamp.flipY });
    },
    deleteStamp: () => {
      if (selectedPlacedStampId == null) return;
      removeStamp(selectedPlacedStampId);
      setSelectedPlacedStampId(null);
    },
  });

  // ── Context values ──────────────────────────────────────────────────
  const toolContextValue = useMemo<ToolContextValue>(() => ({
    activeTool, setActiveTool: handleSetActiveTool,
    activeTile, setActiveTile,
    markerShape, markerColor, markerSize,
    setMarkerShape, setMarkerColor, setMarkerSize,
    measureShape, measureFeetPerCell,
    setMeasureShape, setMeasureFeetPerCell,
    lightPreset, lightRadius, lightColor,
    setLightPreset, setLightRadius, setLightColor,
    drawColor, drawWidth, setDrawColor, setDrawWidth,
    gmDrawColor, gmDrawWidth, setGmDrawColor, setGmDrawWidth,
    selectedStampId, setSelectedStampId,
    selectedPlacedStampId, setSelectedPlacedStampId,
  }), [
    activeTool, handleSetActiveTool, activeTile, setActiveTile,
    markerShape, markerColor, markerSize, setMarkerShape, setMarkerColor, setMarkerSize,
    measureShape, measureFeetPerCell, setMeasureShape, setMeasureFeetPerCell,
    lightPreset, lightRadius, lightColor, setLightPreset, setLightRadius, setLightColor,
    drawColor, drawWidth, setDrawColor, setDrawWidth,
    gmDrawColor, gmDrawWidth, setGmDrawColor, setGmDrawWidth,
    selectedStampId, setSelectedStampId,
    selectedPlacedStampId, setSelectedPlacedStampId,
  ]);

  const mapContextValue = useMemo<MapContextValue>(() => ({
    map, project, activeLevelIndex, themeId, customThemes,
  }), [map, project, activeLevelIndex, themeId, customThemes]);

  const viewContextValue = useMemo<ViewContextValue>(() => ({
    viewMode, printMode, uiScale, gmShowFog,
  }), [viewMode, printMode, uiScale, gmShowFog]);

  const actionContextValue = useMemo<ActionContextValue>(() => ({
    setTile, setTiles, fillTiles,
    setMapName, resizeMap, clearMap, newMap, loadProjectData,
    generateMap, applyGeneratedRegion,
    addNote, updateNote, deleteNote,
    setTileSize, setTheme, saveCustomTheme, deleteCustomTheme,
    undo: handleUndo, redo: handleRedo, canUndo, canRedo,
    setFogCells, fillAllFog, setFogEnabled,
    setDynamicFogEnabled, setExplored, resetExplored,
    addToken, moveToken, removeToken, updateToken,
    reorderInitiative, clearInitiative,
    addAnnotation, removeAnnotation, clearAnnotations,
    copySelection, cutSelection, pasteClipboard,
    addMarker, removeMarker, clearMarkers,
    setBackgroundImage, clearBackgroundImage, updateBackgroundImage,
    addLightSource, removeLightSource, clearLightSources,
    addStamp, moveStamp, removeStamp, clearStamps, updateStamp, bringStampToFront, sendStampToBack,
    switchLevel, addLevel, renameLevel, deleteLevel,
    duplicateLevel, reorderLevels,
    addStairLink, removeStairLink,
  }), [
    setTile, setTiles, fillTiles,
    setMapName, resizeMap, clearMap, newMap, loadProjectData,
    generateMap, applyGeneratedRegion,
    addNote, updateNote, deleteNote,
    setTileSize, setTheme, saveCustomTheme, deleteCustomTheme,
    handleUndo, handleRedo, canUndo, canRedo,
    setFogCells, fillAllFog, setFogEnabled,
    setDynamicFogEnabled, setExplored, resetExplored,
    addToken, moveToken, removeToken, updateToken,
    reorderInitiative, clearInitiative,
    addAnnotation, removeAnnotation, clearAnnotations,
    copySelection, cutSelection, pasteClipboard,
    addMarker, removeMarker, clearMarkers,
    setBackgroundImage, clearBackgroundImage, updateBackgroundImage,
    addLightSource, removeLightSource, clearLightSources,
    addStamp, moveStamp, removeStamp, clearStamps, updateStamp, bringStampToFront, sendStampToBack,
    switchLevel, addLevel, renameLevel, deleteLevel,
    duplicateLevel, reorderLevels,
    addStairLink, removeStairLink,
  ]);

  return (
    <ToolContext.Provider value={toolContextValue}>
    <MapContext.Provider value={mapContextValue}>
    <ViewContext.Provider value={viewContextValue}>
    <ActionContext.Provider value={actionContextValue}>
    <div className="app">
      <a className="skip-link" href="#dm-canvas-area">Skip to map canvas</a>
      <MapHeader
        ref={headerRef}
        map={map}
        project={project}
        onSetName={setMapName}
        onResize={resizeMap}
        onSetTileSize={setTileSize}
        onClear={clearMap}
        onNew={newMap}
        onLoadProject={loadProjectData}
        onExportSVG={handleExportSVG}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        printMode={printMode}
        onTogglePrintMode={handleTogglePrintMode}
        uiScale={uiScale}
        uiScaleOptions={UI_SCALE_OPTIONS}
        onSetUIScale={setUIScale}
        getCanvas={() => canvasRef.current?.getCanvas() ?? null}
        viewMode={viewMode}
        onToggleViewMode={switchViewMode}
        onShowShortcuts={() => setShowShortcutsHelp(true)}
        onOpenExportDialog={() => setShowExportDialog(true)}
      />
      <LevelTabs
        levels={project.levels}
        activeIndex={activeLevelIndex}
        onSwitch={switchLevel}
        onAdd={addLevel}
        onRename={renameLevel}
        onDelete={deleteLevel}
        onDuplicate={duplicateLevel}
        onReorder={reorderLevels}
        stairLinks={project.stairLinks}
      />
      <div className={`app-body${toolbarCollapsed ? ' toolbar-collapsed' : ''}${isMobile ? ' app-body--mobile' : ''}`}>
        {isMobile ? (
          /* ── Mobile toolbar (≤768px) ─────────────────────────── */
          <MobileToolbar
            viewMode={viewMode}
            activeTool={activeTool}
            activeTile={activeTile}
            onSetTool={handleSetActiveTool}
            drawColor={drawColor}
            drawWidth={drawWidth}
            onSetDrawColor={setDrawColor}
            onSetDrawWidth={setDrawWidth}
            gmDrawColor={gmDrawColor}
            gmDrawWidth={gmDrawWidth}
            onSetGmDrawColor={setGmDrawColor}
            onSetGmDrawWidth={setGmDrawWidth}
            measureShape={measureShape}
            onSetMeasureShape={setMeasureShape}
            markerShape={markerShape}
            markerColor={markerColor}
            markerSize={markerSize}
            onSetMarkerShape={setMarkerShape}
            onSetMarkerColor={setMarkerColor}
            onSetMarkerSize={setMarkerSize}
            onClearFog={handleClearFog}
            onFillFog={handleResetFog}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onOpenGenerateMap={handleOpenGenerateMap}
            onToggleViewMode={switchViewMode}
          />
        ) : viewMode === 'gm' ? (
          <nav aria-label="Edit tools" className={toolbarCollapsed ? 'nav-collapsed' : ''}>
            <button
              type="button"
              className="panel-toggle toolbar-toggle"
              onClick={() => setToolbarCollapsed(c => !c)}
              title={toolbarCollapsed ? 'Expand toolbar' : 'Collapse toolbar'}
              aria-label={toolbarCollapsed ? 'Expand toolbar' : 'Collapse toolbar'}
              aria-expanded={!toolbarCollapsed}
            >
              {toolbarCollapsed ? '▶' : '◀'}
            </button>
            {!toolbarCollapsed && (
            <Toolbar
              activeTool={activeTool}
              activeTile={activeTile}
              themeId={themeId}
              customThemes={customThemes}
              onSetTool={handleSetActiveTool}
              onSetTile={setActiveTile}
              onSetTheme={handleSetTheme}
              preserveOnThemeSwitch={preserveOnThemeSwitch}
              onTogglePreserveOnThemeSwitch={() => setPreserveOnThemeSwitch(p => !p)}
              onOpenCustomThemeBuilder={() => setShowCustomThemeDialog(true)}
              fogEnabled={fogEnabled}
              gmShowFog={gmShowFog}
              onToggleGmShowFog={handleToggleGmShowFogAnnounced}
              onOpenGenerateMap={handleOpenGenerateMap}
              onOpenPremadeMaps={() => setShowPremadeMapsDialog(true)}
              markerShape={markerShape}
              markerColor={markerColor}
              markerSize={markerSize}
              onSetMarkerShape={setMarkerShape}
              onSetMarkerColor={setMarkerColor}
              onSetMarkerSize={setMarkerSize}
              onClearMarkers={clearMarkers}
              backgroundImage={map.backgroundImage}
              onImportBackgroundImage={setBackgroundImage}
              onUpdateBackgroundImage={updateBackgroundImage}
              onClearBackgroundImage={clearBackgroundImage}
              measureShape={measureShape}
              measureFeetPerCell={measureFeetPerCell}
              onSetMeasureShape={setMeasureShape}
              onSetMeasureFeetPerCell={setMeasureFeetPerCell}
              lightPreset={lightPreset}
              lightRadius={lightRadius}
              lightColor={lightColor}
              onSetLightPreset={(preset) => {
                setLightPreset(preset);
                const p = LIGHT_SOURCE_PRESETS.find(p => p.id === preset);
                if (p) { setLightRadius(p.radius); setLightColor(p.color); }
              }}
              onSetLightRadius={setLightRadius}
              onSetLightColor={setLightColor}
              onClearLightSources={clearLightSources}
              stairLinkSource={stairLinkSource}
              stairLinkCount={project.stairLinks.length}
              onClearStairLinks={() => {
                // Remove all stair links for the current level.
                for (const link of [...project.stairLinks]) {
                  if (link.fromLevel === activeLevelIndex || link.toLevel === activeLevelIndex) {
                    removeStairLink(
                      link.fromLevel === activeLevelIndex ? link.fromLevel : link.toLevel,
                      link.fromLevel === activeLevelIndex ? link.fromCell.x : link.toCell.x,
                      link.fromLevel === activeLevelIndex ? link.fromCell.y : link.toCell.y,
                    );
                  }
                }
              }}
              gmDrawColor={gmDrawColor}
              gmDrawWidth={gmDrawWidth}
              onSetGmDrawColor={setGmDrawColor}
              onSetGmDrawWidth={setGmDrawWidth}
              onClearGmDrawings={handleClearGmDrawings}
              selectedStampId={selectedStampId}
              onSelectStamp={(id: string) => { setSelectedStampId(id); }}
              onClearStamps={clearStamps}
              stamps={map.stamps ?? []}
              selectedPlacedStampId={selectedPlacedStampId}
              onSelectPlacedStamp={setSelectedPlacedStampId}
              onUpdateStamp={updateStamp}
              onRemoveStamp={removeStamp}
              onBringStampToFront={bringStampToFront}
              onSendStampToBack={sendStampToBack}
            />
            )}
          </nav>
        ) : (
          <nav aria-label="Present tools" className={toolbarCollapsed ? 'nav-collapsed' : ''}>
            <button
              type="button"
              className="panel-toggle toolbar-toggle"
              onClick={() => setToolbarCollapsed(c => !c)}
              title={toolbarCollapsed ? 'Expand toolbar' : 'Collapse toolbar'}
              aria-label={toolbarCollapsed ? 'Expand toolbar' : 'Collapse toolbar'}
              aria-expanded={!toolbarCollapsed}
            >
              {toolbarCollapsed ? '▶' : '◀'}
            </button>
            {!toolbarCollapsed && (
            <PlayerToolbar
              activeTool={activeTool}
              onSetTool={handleSetActiveTool}
              drawColor={drawColor}
              onSetDrawColor={setDrawColor}
              drawWidth={drawWidth}
              onSetDrawWidth={setDrawWidth}
              onClearPlayerDrawings={handleClearPlayerDrawings}
              fogEnabled={fogEnabled}
              onToggleFogEnabled={handleToggleFogEnabled}
              onResetFog={handleResetFog}
              onClearFog={handleClearFog}
              dynamicFogEnabled={dynamicFogEnabled}
              onToggleDynamicFog={handleToggleDynamicFog}
              onResetExplored={handleResetExplored}
            />
            )}
          </nav>
        )}
        <main id="dm-canvas-area" className="canvas-area" aria-label="Map canvas area">
          <MapCanvas
            ref={canvasRef}
            map={map}
            activeTool={activeTool}
            activeTile={activeTile}
            themeId={themeId}
            customThemes={customThemes}
            printMode={printMode}
            viewMode={viewMode}
            gmShowFog={gmShowFog}
            selectedNoteId={selectedNoteId}
            selectedTokenId={selectedTokenId}
            drawColor={drawColor}
            drawWidth={drawWidth}
            gmDrawColor={gmDrawColor}
            gmDrawWidth={gmDrawWidth}
            onSetTile={setTile}
            onSetTiles={setTiles}
            onFillTile={fillTiles}
            onAddNote={addNote}
            onSelectNote={setSelectedNoteId}
            onEraseTiles={handleEraseTiles}
            onSetFogCells={setFogCells}
            onAddToken={handleAddToken}
            onMoveToken={moveToken}
            onRemoveToken={removeToken}
            onAddAnnotation={addAnnotation}
            onRemoveAnnotation={removeAnnotation}
            onAddMarker={addMarker}
            onRemoveMarker={removeMarker}
            markerShape={markerShape}
            markerColor={markerColor}
            markerSize={markerSize}
            onSelectionChange={setSelection}
            hasClipboard={clipboardInfo != null}
            clipboardSize={clipboardInfo}
            fovVisible={fovVisible}
            fovOrigin={activeTool === 'fov' ? fovOrigin : null}
            onFovClick={handleFovClick}
            dynamicFogEnabled={dynamicFogEnabled}
            playerVisible={playerVisible}
            explored={map.explored}
            measureShape={measureShape}
            measureFeetPerCell={measureFeetPerCell}
            lightSources={map.lightSources}
            lightVisible={dynamicFogEnabled ? lightVisible : null}
            onAddLightSource={(x, y) => addLightSource(x, y, lightRadius, lightColor, lightPreset)}
            onRemoveLightSource={removeLightSource}
            lightRadius={lightRadius}
            lightColor={lightColor}
            onAddStamp={addStamp}
            onMoveStamp={moveStamp}
            onRemoveStamp={removeStamp}
            selectedStampId={selectedStampId}
            selectedPlacedStampId={selectedPlacedStampId}
            onSelectPlacedStamp={setSelectedPlacedStampId}
            stairLinks={activeStairLinks}
            stairLinkSource={activeTool === 'link-stair' ? stairLinkSource : null}
            onStairLinkClick={handleStairLinkClick}
            onStairNavigate={handleStairNavigate}
            activeLevelIndex={activeLevelIndex}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        </main>
        <button
          type="button"
          className="panel-toggle right-panel-toggle"
          onClick={() => setRightPanelOpen(o => !o)}
          title={rightPanelOpen ? 'Hide panels' : 'Show panels'}
          aria-label={rightPanelOpen ? 'Hide initiative and notes panels' : 'Show initiative and notes panels'}
          aria-expanded={rightPanelOpen}
        >
          {rightPanelOpen ? '▶' : '◀'}
        </button>
        {viewMode === 'gm' && (
          <aside className={`right-panel right-panel-drawer${rightPanelOpen ? ' open' : ''}`} aria-label="Initiative and notes">
            <InitiativePanel
              tokens={map.tokens ?? []}
              initiative={map.initiative ?? []}
              selectedTokenId={selectedTokenId}
              onSelectToken={setSelectedTokenId}
              onRenameToken={handleRenameToken}
              onReorder={reorderInitiative}
              onClear={clearInitiative}
              viewMode="gm"
            />
            <NotesPanel
              notes={map.notes}
              selectedNoteId={selectedNoteId}
              onSelectNote={handleSelectNote}
              onUpdateNote={updateNote}
              onDeleteNote={deleteNote}
              onActivateNoteTool={() => handleSetActiveTool('note')}
            />
          </aside>
        )}
        {viewMode === 'player' && (
          <aside className={`right-panel right-panel-drawer${rightPanelOpen ? ' open' : ''}`} aria-label="Initiative and notes">
            <InitiativePanel
              // Hide tokens whose footprint touches any fogged cell from
              // the player initiative list so the panel doesn't leak the
              // existence of hidden enemies (matching MapCanvas).
              tokens={
                fogEnabled
                  ? (map.tokens ?? []).filter(t => !isTokenFogged(t, map.fog, dynamicFogEnabled ? playerVisible : undefined, map.explored))
                  : (map.tokens ?? [])
              }
              initiative={map.initiative ?? []}
              selectedTokenId={selectedTokenId}
              onSelectToken={setSelectedTokenId}
              // Player view is read-only — these handlers are wired to
              // satisfy the prop shape but never actually invoked because
              // the panel hides the rename/clear/drag affordances.
              onRenameToken={handleRenameToken}
              onReorder={reorderInitiative}
              onClear={clearInitiative}
              viewMode="player"
            />
            <NotesPanel
              // In player mode, hide notes that sit under fog so the panel
              // doesn't leak the existence of hidden rooms. Editing/deleting
              // is also disabled by routing through no-op callbacks.
              notes={
                fogEnabled
                  ? map.notes.filter(n => {
                      // Manually revealed cells are always visible.
                      if (!(map.fog?.[n.y]?.[n.x])) return true;
                      // In dynamic fog mode, show notes in visible or explored cells.
                      if (dynamicFogEnabled) {
                        const key = `${n.x},${n.y}`;
                        if (playerVisible?.has(key)) return true;
                        if (map.explored?.[n.y]?.[n.x]) return true;
                      }
                      return false;
                    })
                  : map.notes
              }
              selectedNoteId={selectedNoteId}
              onSelectNote={handleSelectNote}
              onUpdateNote={NOOP_UPDATE_NOTE}
              onDeleteNote={NOOP_DELETE_NOTE}
              onActivateNoteTool={NOOP_ACTIVATE_NOTE_TOOL}
            />
          </aside>
        )}
      </div>
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusMessage}
      </div>
      {showGenerateDialog && viewMode === 'gm' && (
        <GenerateMapDialog
          themeId={themeId}
          initialWidth={map.meta.width}
          initialHeight={map.meta.height}
          hasExistingContent={hasExistingContent}
          selection={selection}
          onCancel={handleCancelGenerateMap}
          onGenerate={handleGenerateMap}
        />
      )}
      {showPremadeMapsDialog && (
        <PremadeMapsDialog
          currentHasContent={hasExistingContent}
          onCancel={() => setShowPremadeMapsDialog(false)}
          onLoadProject={loaded => {
            loadProjectData(loaded);
            setShowPremadeMapsDialog(false);
            announce('Sample map loaded');
          }}
        />
      )}
      {showCustomThemeDialog && viewMode === 'gm' && (
        <CustomThemeDialog
          customThemes={customThemes}
          activeThemeId={themeId}
          onSave={saveCustomTheme}
          onDelete={deleteCustomTheme}
          onSetTheme={next => handleSetTheme(next, preserveOnThemeSwitch)}
          onClose={() => setShowCustomThemeDialog(false)}
        />
      )}
      {showShortcutsHelp && (
        <ShortcutsHelp
          bindings={shortcutBindings}
          onClose={() => setShowShortcutsHelp(false)}
        />
      )}
      {showExportDialog && (
        <ExportDialog
          map={map}
          themeId={themeId}
          customThemes={customThemes}
          printMode={printMode}
          viewMode={viewMode}
          onClose={() => setShowExportDialog(false)}
          feetPerCell={measureFeetPerCell}
        />
      )}
      <IconPicker
        open={showIconPicker}
        onSelect={handleIconSelected}
        onCancel={handleIconPickerCancel}
      />
    </div>
    </ActionContext.Provider>
    </ViewContext.Provider>
    </MapContext.Provider>
    </ToolContext.Provider>
  );
}

export default App;
