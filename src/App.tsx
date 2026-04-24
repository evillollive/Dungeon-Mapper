import { useRef, useCallback, useEffect, useState } from 'react';
import MapCanvas, { type MapCanvasHandle } from './components/MapCanvas';
import Toolbar from './components/Toolbar';
import PlayerToolbar from './components/PlayerToolbar';
import NotesPanel from './components/NotesPanel';
import MapHeader from './components/MapHeader';
import { useMapState } from './hooks/useMapState';
import { useDrawingTool } from './hooks/useDrawingTool';
import { exportMapSVG } from './utils/export';
import { getTheme } from './themes/index';
import type { ViewMode } from './types/map';
import './App.css';

const UI_SCALE_STORAGE_KEY = 'dungeon-mapper:ui-scale';
const UI_SCALE_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5] as const;
const DEFAULT_UI_SCALE = 1;
const MIN_UI_SCALE = UI_SCALE_OPTIONS[0];
const MAX_UI_SCALE = UI_SCALE_OPTIONS[UI_SCALE_OPTIONS.length - 1];

const PRESERVE_THEME_STORAGE_KEY = 'dungeon-mapper:preserve-on-theme-switch';
const VIEW_MODE_STORAGE_KEY = 'dungeon-mapper:view-mode';

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
    addAnnotation,
    removeAnnotation,
    clearAnnotations,
  } = useMapState();

  const {
    activeTool,
    setActiveTool,
    activeTile,
    setActiveTile,
  } = useDrawingTool();

  const canvasRef = useRef<MapCanvasHandle>(null);
  const themeId = map.meta.theme ?? 'dungeon';
  const [printMode, setPrintMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(loadInitialViewMode);
  const [uiScale, setUIScale] = useState<number>(loadInitialUIScale);
  const [preserveOnThemeSwitch, setPreserveOnThemeSwitch] = useState<boolean>(
    loadInitialPreserveOnThemeSwitch
  );
  // Player drawing pen state — color and brush width are UI-only and not
  // persisted on the map; they're a per-session preference.
  const [drawColor, setDrawColor] = useState<string>('#dc2626');
  const [drawWidth, setDrawWidth] = useState<number>(0.25);

  // When switching view modes, snap the active tool to a sensible default
  // for that mode so the user isn't left holding a tool the new toolbar
  // doesn't expose.
  const switchViewMode = useCallback(() => {
    setViewMode(prev => {
      const next: ViewMode = prev === 'gm' ? 'player' : 'gm';
      setActiveTool(next === 'player' ? 'pdraw' : 'paint');
      try {
        window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, next);
      } catch {
        // Ignore storage failures; the toggle still applies for the session.
      }
      return next;
    });
  }, [setActiveTool]);

  const fogEnabled = map.fogEnabled ?? false;
  const handleToggleFogEnabled = useCallback(() => {
    setFogEnabled(!fogEnabled);
  }, [fogEnabled, setFogEnabled]);
  const handleResetFog = useCallback(() => fillAllFog(true), [fillAllFog]);
  const handleClearFog = useCallback(() => fillAllFog(false), [fillAllFog]);
  const handleClearPlayerDrawings = useCallback(() => clearAnnotations('player'), [clearAnnotations]);

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

  const handlePickTile = useCallback((tileType: typeof activeTile) => {
    setActiveTile(tileType);
    setActiveTool('paint');
  }, [setActiveTile, setActiveTool]);

  const handleEraseTiles = useCallback((tiles: { x: number; y: number }[]) => {
    setTiles(tiles.map(t => ({ ...t, type: 'empty' as const })));
  }, [setTiles]);

  const handleExportSVG = useCallback(() => {
    const theme = getTheme(themeId);
    exportMapSVG(map, theme, getTheme, { viewMode });
  }, [map, themeId, viewMode]);

  // Undo/Redo keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return (
    <div className="app">
      <MapHeader
        map={map}
        onSetName={setMapName}
        onResize={resizeMap}
        onSetTileSize={setTileSize}
        onClear={clearMap}
        onNew={newMap}
        onLoad={loadMapData}
        onExportSVG={handleExportSVG}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        printMode={printMode}
        onTogglePrintMode={() => setPrintMode(p => !p)}
        uiScale={uiScale}
        uiScaleOptions={UI_SCALE_OPTIONS}
        onSetUIScale={setUIScale}
        getCanvas={() => canvasRef.current?.getCanvas() ?? null}
        viewMode={viewMode}
        onToggleViewMode={switchViewMode}
      />
      <div className="app-body">
        {viewMode === 'gm' ? (
          <Toolbar
            activeTool={activeTool}
            activeTile={activeTile}
            themeId={themeId}
            onSetTool={setActiveTool}
            onSetTile={setActiveTile}
            onSetTheme={setTheme}
            preserveOnThemeSwitch={preserveOnThemeSwitch}
            onTogglePreserveOnThemeSwitch={() => setPreserveOnThemeSwitch(p => !p)}
            fogEnabled={fogEnabled}
            onToggleFogEnabled={handleToggleFogEnabled}
            onResetFog={handleResetFog}
            onClearFog={handleClearFog}
          />
        ) : (
          <PlayerToolbar
            activeTool={activeTool}
            onSetTool={setActiveTool}
            drawColor={drawColor}
            onSetDrawColor={setDrawColor}
            drawWidth={drawWidth}
            onSetDrawWidth={setDrawWidth}
            onClearPlayerDrawings={handleClearPlayerDrawings}
          />
        )}
        <main className="canvas-area">
          <MapCanvas
            ref={canvasRef}
            map={map}
            activeTool={activeTool}
            activeTile={activeTile}
            themeId={themeId}
            printMode={printMode}
            viewMode={viewMode}
            selectedNoteId={selectedNoteId}
            drawColor={drawColor}
            drawWidth={drawWidth}
            onSetTile={setTile}
            onSetTiles={setTiles}
            onFillTile={fillTiles}
            onPickTile={handlePickTile}
            onAddNote={addNote}
            onSelectNote={setSelectedNoteId}
            onEraseTiles={handleEraseTiles}
            onSetFogCells={setFogCells}
            onAddToken={addToken}
            onMoveToken={moveToken}
            onRemoveToken={removeToken}
            onAddAnnotation={addAnnotation}
            onRemoveAnnotation={removeAnnotation}
          />
        </main>
        {viewMode === 'gm' && (
          <NotesPanel
            notes={map.notes}
            selectedNoteId={selectedNoteId}
            onSelectNote={setSelectedNoteId}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
            onActivateNoteTool={() => setActiveTool('note')}
          />
        )}
        {viewMode === 'player' && (
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
            onSelectNote={setSelectedNoteId}
            onUpdateNote={() => { /* read-only in player view */ }}
            onDeleteNote={() => { /* read-only in player view */ }}
            onActivateNoteTool={() => { /* note tool is GM-only */ }}
          />
        )}
      </div>
    </div>
  );
}

export default App;
