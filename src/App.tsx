import { useRef, useEffect, useCallback } from 'react';
import MapCanvas, { type MapCanvasHandle } from './components/MapCanvas';
import Toolbar from './components/Toolbar';
import NotesPanel from './components/NotesPanel';
import MapHeader from './components/MapHeader';
import { useMapState } from './hooks/useMapState';
import { useDrawingTool } from './hooks/useDrawingTool';
import './App.css';

function App() {
  const {
    map,
    selectedNoteId,
    setSelectedNoteId,
    setTile,
    fillTiles,
    setMapName,
    resizeMap,
    clearMap,
    newMap,
    loadMapData,
    addNote,
    updateNote,
    deleteNote,
    setTileSize,
  } = useMapState();

  const {
    activeTool,
    setActiveTool,
    activeTile,
    setActiveTile,
  } = useDrawingTool();

  const canvasRef = useRef<MapCanvasHandle>(null);

  const handlePickTile = useCallback((tileType: typeof activeTile) => {
    setActiveTile(tileType);
    setActiveTool('paint');
  }, [setActiveTile, setActiveTool]);

  // Listen for tile size changes from the header select
  useEffect(() => {
    const handler = (e: Event) => {
      const tileSize = (e as CustomEvent<number>).detail;
      setTileSize(tileSize);
    };
    window.addEventListener('tileSizeChange', handler);
    return () => window.removeEventListener('tileSizeChange', handler);
  }, [setTileSize]);

  return (
    <div className="app">
      <MapHeader
        map={map}
        onSetName={setMapName}
        onResize={resizeMap}
        onClear={clearMap}
        onNew={newMap}
        onLoad={loadMapData}
        getCanvas={() => canvasRef.current?.getCanvas() ?? null}
      />
      <div className="app-body">
        <Toolbar
          activeTool={activeTool}
          activeTile={activeTile}
          onSetTool={setActiveTool}
          onSetTile={setActiveTile}
        />
        <main className="canvas-area">
          <MapCanvas
            ref={canvasRef}
            map={map}
            activeTool={activeTool}
            activeTile={activeTile}
            selectedNoteId={selectedNoteId}
            onSetTile={setTile}
            onFillTile={fillTiles}
            onPickTile={handlePickTile}
            onAddNote={addNote}
            onSelectNote={setSelectedNoteId}
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
