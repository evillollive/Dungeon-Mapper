import { useRef, useCallback, useEffect } from 'react';
import MapCanvas, { type MapCanvasHandle } from './components/MapCanvas';
import Toolbar from './components/Toolbar';
import NotesPanel from './components/NotesPanel';
import MapHeader from './components/MapHeader';
import { useMapState } from './hooks/useMapState';
import { useDrawingTool } from './hooks/useDrawingTool';
import { exportMapSVG } from './utils/export';
import { getTheme } from './themes/index';
import './App.css';

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
  } = useMapState();

  const {
    activeTool,
    setActiveTool,
    activeTile,
    setActiveTile,
  } = useDrawingTool();

  const canvasRef = useRef<MapCanvasHandle>(null);
  const themeId = map.meta.theme ?? 'fantasy';

  const handlePickTile = useCallback((tileType: typeof activeTile) => {
    setActiveTile(tileType);
    setActiveTool('paint');
  }, [setActiveTile, setActiveTool]);

  const handleEraseTiles = useCallback((tiles: { x: number; y: number }[]) => {
    setTiles(tiles.map(t => ({ ...t, type: 'empty' as const })));
  }, [setTiles]);

  const handleExportSVG = useCallback(() => {
    const theme = getTheme(themeId);
    exportMapSVG(map, theme);
  }, [map, themeId]);

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
        onSetTheme={setTheme}
        onClear={clearMap}
        onNew={newMap}
        onLoad={loadMapData}
        onExportSVG={handleExportSVG}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        getCanvas={() => canvasRef.current?.getCanvas() ?? null}
      />
      <div className="app-body">
        <Toolbar
          activeTool={activeTool}
          activeTile={activeTile}
          themeId={themeId}
          onSetTool={setActiveTool}
          onSetTile={setActiveTile}
        />
        <main className="canvas-area">
          <MapCanvas
            ref={canvasRef}
            map={map}
            activeTool={activeTool}
            activeTile={activeTile}
            themeId={themeId}
            selectedNoteId={selectedNoteId}
            onSetTile={setTile}
            onSetTiles={setTiles}
            onFillTile={fillTiles}
            onPickTile={handlePickTile}
            onAddNote={addNote}
            onSelectNote={setSelectedNoteId}
            onEraseTiles={handleEraseTiles}
          />
        </main>
        <NotesPanel
          notes={map.notes}
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
          onActivateNoteTool={() => setActiveTool('note')}
        />
      </div>
    </div>
  );
}

export default App;
