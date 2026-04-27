import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import MapCanvas, { type MapCanvasHandle } from './components/MapCanvas';
import Toolbar from './components/Toolbar';
import PlayerToolbar from './components/PlayerToolbar';
import NotesPanel from './components/NotesPanel';
import InitiativePanel from './components/InitiativePanel';
import MapHeader, { type MapHeaderHandle } from './components/MapHeader';
import GenerateMapDialog from './components/GenerateMapDialog';
import ShortcutsHelp from './components/ShortcutsHelp';
import type { GeneratedMap } from './utils/generators';
import { useMapState, getClipboard } from './hooks/useMapState';
import { useDrawingTool } from './hooks/useDrawingTool';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { exportMapSVG } from './utils/export';
import { isTokenFogged } from './utils/tokenVisibility';
import { getTheme, THEME_LIST } from './themes/index';
import { ALL_TILE_TYPES, type ViewMode, type MarkerShape } from './types/map';
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
    selectedNoteId,
    setSelectedNoteId,
    setTile,
    fillTiles,
    setTiles,
    setMapName,
    resizeMap,
    clearMap,
    newMap,
    loadMapData,
    generateMap,
    applyGeneratedRegion,
    addNote,
    updateNote,
    deleteNote,
    setTileSize,
    setTheme,
    undo,
    redo,
    canUndo,
    canRedo,
    setFogCells,
    fillAllFog,
    setFogEnabled,
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
  const [printMode, setPrintMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(loadInitialViewMode);
  const [uiScale, setUIScale] = useState<number>(loadInitialUIScale);
  const [preserveOnThemeSwitch, setPreserveOnThemeSwitch] = useState<boolean>(
    loadInitialPreserveOnThemeSwitch
  );
  const [gmShowFog, setGmShowFog] = useState<boolean>(loadInitialGmShowFog);
  const [showGenerateDialog, setShowGenerateDialog] = useState<boolean>(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState<boolean>(false);
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
  // Marker tool settings — shape, color, radius (in tiles).
  const [markerShape, setMarkerShape] = useState<MarkerShape>('circle');
  const [markerColor, setMarkerColor] = useState<string>('#dc2626');
  const [markerSize, setMarkerSize] = useState<number>(2);
  // Track clipboard state for the paste preview overlay on the canvas.
  // Updated after every copy/cut so the canvas knows whether a paste
  // preview should be rendered and how large the buffer is.
  const [clipboardInfo, setClipboardInfo] = useState<{ w: number; h: number } | null>(null);

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
      setActiveTool(next === 'player' ? 'pdraw' : 'paint');
      announce(next === 'player' ? 'Switched to Player view' : 'Switched to GM view');
      try {
        window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, next);
      } catch {
        // Ignore storage failures; the toggle still applies for the session.
      }
      return next;
    });
  }, [setActiveTool, announce]);

  const fogEnabled = map.fogEnabled ?? false;
  const handleToggleFogEnabled = useCallback(() => {
    setFogEnabled(!fogEnabled);
  }, [fogEnabled, setFogEnabled]);
  const handleResetFog = useCallback(() => fillAllFog(true), [fillAllFog]);
  const handleClearFog = useCallback(() => fillAllFog(false), [fillAllFog]);
  const handleClearPlayerDrawings = useCallback(() => clearAnnotations('player'), [clearAnnotations]);

  // When a token is placed from the player view, prompt for a name so the
  // new entry shows up in the Initiative panel with something meaningful
  // (and the player isn't stuck reading "P3" / "M7" auto-labels). The GM
  // skips the prompt — they place tokens during prep and rename later.
  const handleAddToken = useCallback(
    (kind: Parameters<typeof addToken>[0], x: number, y: number, _label?: string, size?: number) => {
      if (viewMode === 'player') {
        const defaultName = kind.charAt(0).toUpperCase() + kind.slice(1);
        const raw = window.prompt(`Name for this ${kind}?`, defaultName);
        // Cancel aborts placement entirely. Empty string falls back to the
        // hook's auto-label so we don't add a blank-named entry.
        if (raw === null) return;
        const trimmed = raw.trim();
        addToken(kind, x, y, trimmed.length > 0 ? trimmed : undefined, size);
      } else {
        addToken(kind, x, y, undefined, size);
      }
    },
    [addToken, viewMode]
  );

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
    const themeName = THEME_LIST.find(t => t.id === next)?.name ?? next;
    announce(`Theme switched to ${themeName}`);
  }, [setTheme, announce]);

  // Cycle the active theme by `direction` (+1 next, -1 previous), wrapping
  // around at the ends of the alphabetised theme list. Driven by the T /
  // Shift+T global shortcuts; preserves the current preserve-existing
  // setting so users who've opted in keep their hand-painted tiles.
  const cycleTheme = useCallback((direction: 1 | -1) => {
    const idx = THEME_LIST.findIndex(t => t.id === themeId);
    const start = idx >= 0 ? idx : 0;
    const len = THEME_LIST.length;
    const next = THEME_LIST[((start + direction) % len + len) % len];
    handleSetTheme(next.id, preserveOnThemeSwitch);
  }, [themeId, preserveOnThemeSwitch, handleSetTheme]);

  // Cycle the active palette tile by `direction`. Wraps around the
  // displayed palette (`ALL_TILE_TYPES`); used by the [/] shortcuts so
  // keyboard users can change paint targets without reaching for the
  // mouse.
  const cycleActiveTile = useCallback((direction: 1 | -1) => {
    const idx = ALL_TILE_TYPES.indexOf(activeTile);
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
    const theme = getTheme(themeId);
    exportMapSVG(map, theme, getTheme, { viewMode });
  }, [map, themeId, viewMode]);

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
    setActiveTool,
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
  });

  return (
    <div className="app">
      <a className="skip-link" href="#dm-canvas-area">Skip to map canvas</a>
      <MapHeader
        ref={headerRef}
        map={map}
        onSetName={setMapName}
        onResize={resizeMap}
        onSetTileSize={setTileSize}
        onClear={clearMap}
        onNew={newMap}
        onLoad={loadMapData}
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
      />
      <div className="app-body">
        {viewMode === 'gm' ? (
          <nav aria-label="GM tools">
            <Toolbar
              activeTool={activeTool}
              activeTile={activeTile}
              themeId={themeId}
              onSetTool={setActiveTool}
              onSetTile={setActiveTile}
              onSetTheme={handleSetTheme}
              preserveOnThemeSwitch={preserveOnThemeSwitch}
              onTogglePreserveOnThemeSwitch={() => setPreserveOnThemeSwitch(p => !p)}
              fogEnabled={fogEnabled}
              gmShowFog={gmShowFog}
              onToggleGmShowFog={handleToggleGmShowFogAnnounced}
              onOpenGenerateMap={handleOpenGenerateMap}
              markerShape={markerShape}
              markerColor={markerColor}
              markerSize={markerSize}
              onSetMarkerShape={setMarkerShape}
              onSetMarkerColor={setMarkerColor}
              onSetMarkerSize={setMarkerSize}
              onClearMarkers={clearMarkers}
            />
          </nav>
        ) : (
          <nav aria-label="Player tools">
            <PlayerToolbar
              activeTool={activeTool}
              onSetTool={setActiveTool}
              drawColor={drawColor}
              onSetDrawColor={setDrawColor}
              drawWidth={drawWidth}
              onSetDrawWidth={setDrawWidth}
              onClearPlayerDrawings={handleClearPlayerDrawings}
              fogEnabled={fogEnabled}
              onToggleFogEnabled={handleToggleFogEnabled}
              onResetFog={handleResetFog}
              onClearFog={handleClearFog}
            />
          </nav>
        )}
        <main id="dm-canvas-area" className="canvas-area" aria-label="Map canvas area">
          <MapCanvas
            ref={canvasRef}
            map={map}
            activeTool={activeTool}
            activeTile={activeTile}
            themeId={themeId}
            printMode={printMode}
            viewMode={viewMode}
            gmShowFog={gmShowFog}
            selectedNoteId={selectedNoteId}
            selectedTokenId={selectedTokenId}
            drawColor={drawColor}
            drawWidth={drawWidth}
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
          />
        </main>
        {viewMode === 'gm' && (
          <aside className="right-panel" aria-label="Initiative and notes">
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
              onActivateNoteTool={() => setActiveTool('note')}
            />
          </aside>
        )}
        {viewMode === 'player' && (
          <aside className="right-panel" aria-label="Initiative and notes">
            <InitiativePanel
              // Hide tokens whose footprint touches any fogged cell from
              // the player initiative list so the panel doesn't leak the
              // existence of hidden enemies (matching MapCanvas).
              tokens={
                fogEnabled
                  ? (map.tokens ?? []).filter(t => !isTokenFogged(t, map.fog))
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
                  ? map.notes.filter(n => !(map.fog?.[n.y]?.[n.x]))
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
      {showShortcutsHelp && (
        <ShortcutsHelp
          bindings={shortcutBindings}
          onClose={() => setShowShortcutsHelp(false)}
        />
      )}
    </div>
  );
}

export default App;
