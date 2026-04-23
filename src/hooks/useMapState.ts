import { useState, useCallback, useEffect, useRef } from 'react';
import type { DungeonMap, MapNote, Tile, TileType } from '../types/map';
import { createEmptyGrid, floodFill } from '../utils/mapUtils';
import { saveMap, loadMap, migrateFromLocalStorage } from '../utils/storage';

const DEFAULT_WIDTH = 32;
const DEFAULT_HEIGHT = 32;
const DEFAULT_TILE_SIZE = 20;

function createDefaultMap(): DungeonMap {
  return {
    meta: { name: 'New Dungeon', width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, tileSize: DEFAULT_TILE_SIZE },
    tiles: createEmptyGrid(DEFAULT_WIDTH, DEFAULT_HEIGHT),
    notes: [],
  };
}

export function useMapState() {
  const [map, setMap] = useState<DungeonMap>(createDefaultMap);
  const [nextNoteId, setNextNoteId] = useState(1);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pastRef = useRef<Tile[][][]>([]);
  const futureRef = useRef<Tile[][][]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from IndexedDB on mount
  useEffect(() => {
    migrateFromLocalStorage().catch(() => {});
    loadMap().then(loaded => {
      if (loaded) {
        setMap(loaded);
        const maxId = loaded.notes.length > 0 ? Math.max(...loaded.notes.map(n => n.id)) + 1 : 1;
        setNextNoteId(maxId);
      }
    }).catch(() => {});
  }, []);

  const debouncedSave = useCallback((mapToSave: DungeonMap) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveMap(mapToSave).catch(() => {});
    }, 500);
  }, []);

  const MAX_HISTORY_SIZE = 50;

  function pushHistory(currentTiles: Tile[][]) {
    pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY_SIZE - 1)), currentTiles];
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }

  const setTile = useCallback((x: number, y: number, type: TileType) => {
    setMap(prev => {
      pushHistory(prev.tiles);
      const newTiles = prev.tiles.map(row => row.map(t => ({ ...t })));
      if (y >= 0 && y < prev.meta.height && x >= 0 && x < prev.meta.width) {
        newTiles[y][x] = { ...newTiles[y][x], type };
      }
      const updated = { ...prev, tiles: newTiles };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const fillTiles = useCallback((x: number, y: number, fillType: TileType) => {
    setMap(prev => {
      const targetType = prev.tiles[y]?.[x]?.type;
      if (!targetType) return prev;
      pushHistory(prev.tiles);
      const newTiles = floodFill(prev.tiles, x, y, targetType, fillType);
      const updated = { ...prev, tiles: newTiles };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const setTiles = useCallback((updates: { x: number; y: number; type: TileType }[]) => {
    setMap(prev => {
      pushHistory(prev.tiles);
      const newTiles = prev.tiles.map(row => row.map(t => ({ ...t })));
      for (const { x, y, type } of updates) {
        if (y >= 0 && y < prev.meta.height && x >= 0 && x < prev.meta.width) {
          newTiles[y][x] = { ...newTiles[y][x], type };
        }
      }
      const updated = { ...prev, tiles: newTiles };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const getTileType = useCallback((x: number, y: number): TileType | null => {
    return map.tiles[y]?.[x]?.type ?? null;
  }, [map.tiles]);

  const setMapName = useCallback((name: string) => {
    setMap(prev => {
      const updated = { ...prev, meta: { ...prev.meta, name } };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const resizeMap = useCallback((width: number, height: number) => {
    setMap(prev => {
      const newTiles: Tile[][] = Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) =>
          prev.tiles[y]?.[x] ?? { type: 'empty' as TileType }
        )
      );
      const updated = { ...prev, meta: { ...prev.meta, width, height }, tiles: newTiles };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const clearMap = useCallback(() => {
    setMap(prev => {
      pushHistory(prev.tiles);
      const updated = {
        ...prev,
        tiles: createEmptyGrid(prev.meta.width, prev.meta.height),
        notes: [],
      };
      debouncedSave(updated);
      return updated;
    });
    setNextNoteId(1);
    setSelectedNoteId(null);
  }, [debouncedSave]);

  const newMap = useCallback(() => {
    const fresh = createDefaultMap();
    pastRef.current = [];
    futureRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    setMap(fresh);
    debouncedSave(fresh);
    setNextNoteId(1);
    setSelectedNoteId(null);
  }, [debouncedSave]);

  const loadMapData = useCallback((loaded: DungeonMap) => {
    pastRef.current = [];
    futureRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    setMap(loaded);
    debouncedSave(loaded);
    const maxId = loaded.notes.length > 0 ? Math.max(...loaded.notes.map(n => n.id)) + 1 : 1;
    setNextNoteId(maxId);
    setSelectedNoteId(null);
  }, [debouncedSave]);

  const addNote = useCallback((x: number, y: number) => {
    setMap(prev => {
      const newNote: MapNote = {
        id: nextNoteId,
        x, y,
        label: `Room ${nextNoteId}`,
        description: '',
      };
      const newTiles = prev.tiles.map(row => row.map(t => ({ ...t })));
      if (newTiles[y]?.[x]) {
        newTiles[y][x] = { ...newTiles[y][x], noteId: nextNoteId };
      }
      const updated = { ...prev, tiles: newTiles, notes: [...prev.notes, newNote] };
      debouncedSave(updated);
      return updated;
    });
    setNextNoteId(id => id + 1);
  }, [nextNoteId, debouncedSave]);

  const updateNote = useCallback((id: number, label: string, description: string) => {
    setMap(prev => {
      const notes = prev.notes.map(n => n.id === id ? { ...n, label, description } : n);
      const updated = { ...prev, notes };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const deleteNote = useCallback((id: number) => {
    setMap(prev => {
      const notes = prev.notes.filter(n => n.id !== id);
      const newTiles = prev.tiles.map(row =>
        row.map(t => t.noteId === id ? { ...t, noteId: undefined } : t)
      );
      const updated = { ...prev, tiles: newTiles, notes };
      debouncedSave(updated);
      return updated;
    });
    setSelectedNoteId(sel => sel === id ? null : sel);
  }, [debouncedSave]);

  const setTileSize = useCallback((tileSize: number) => {
    setMap(prev => {
      const updated = { ...prev, meta: { ...prev.meta, tileSize } };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const setTheme = useCallback((theme: string) => {
    setMap(prev => {
      const updated = { ...prev, meta: { ...prev.meta, theme } };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    setMap(prev => {
      const previous = pastRef.current[pastRef.current.length - 1];
      pastRef.current = pastRef.current.slice(0, -1);
      futureRef.current = [...futureRef.current, prev.tiles];
      const updated = { ...prev, tiles: previous };
      debouncedSave(updated);
      setCanUndo(pastRef.current.length > 0);
      setCanRedo(true);
      return updated;
    });
  }, [debouncedSave]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    setMap(prev => {
      const next = futureRef.current[futureRef.current.length - 1];
      futureRef.current = futureRef.current.slice(0, -1);
      pastRef.current = [...pastRef.current, prev.tiles];
      const updated = { ...prev, tiles: next };
      debouncedSave(updated);
      setCanUndo(true);
      setCanRedo(futureRef.current.length > 0);
      return updated;
    });
  }, [debouncedSave]);

  return {
    map,
    selectedNoteId,
    setSelectedNoteId,
    setTile,
    fillTiles,
    setTiles,
    getTileType,
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
  };
}
