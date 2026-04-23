import { useState, useCallback } from 'react';
import type { DungeonMap, MapNote, Tile, TileType } from '../types/map';
import { createEmptyGrid, floodFill } from '../utils/mapUtils';
import { saveMap, loadMap } from '../utils/storage';

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
  const [map, setMap] = useState<DungeonMap>(() => loadMap() ?? createDefaultMap());
  const [nextNoteId, setNextNoteId] = useState(() => {
    const loaded = loadMap();
    if (loaded && loaded.notes.length > 0) {
      return Math.max(...loaded.notes.map(n => n.id)) + 1;
    }
    return 1;
  });
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  const persist = useCallback((newMap: DungeonMap) => {
    setMap(newMap);
    saveMap(newMap);
  }, []);

  const setTile = useCallback((x: number, y: number, type: TileType) => {
    setMap(prev => {
      const newTiles = prev.tiles.map(row => row.map(t => ({ ...t })));
      if (y >= 0 && y < prev.meta.height && x >= 0 && x < prev.meta.width) {
        newTiles[y][x] = { ...newTiles[y][x], type };
      }
      const updated = { ...prev, tiles: newTiles };
      saveMap(updated);
      return updated;
    });
  }, []);

  const fillTiles = useCallback((x: number, y: number, fillType: TileType) => {
    setMap(prev => {
      const targetType = prev.tiles[y]?.[x]?.type;
      if (!targetType) return prev;
      const newTiles = floodFill(prev.tiles, x, y, targetType, fillType);
      const updated = { ...prev, tiles: newTiles };
      saveMap(updated);
      return updated;
    });
  }, []);

  const getTileType = useCallback((x: number, y: number): TileType | null => {
    return map.tiles[y]?.[x]?.type ?? null;
  }, [map.tiles]);

  const setMapName = useCallback((name: string) => {
    setMap(prev => {
      const updated = { ...prev, meta: { ...prev.meta, name } };
      saveMap(updated);
      return updated;
    });
  }, []);

  const resizeMap = useCallback((width: number, height: number) => {
    setMap(prev => {
      const newTiles: Tile[][] = Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) =>
          prev.tiles[y]?.[x] ?? { type: 'empty' as TileType }
        )
      );
      const updated = { ...prev, meta: { ...prev.meta, width, height }, tiles: newTiles };
      saveMap(updated);
      return updated;
    });
  }, []);

  const clearMap = useCallback(() => {
    setMap(prev => {
      const updated = {
        ...prev,
        tiles: createEmptyGrid(prev.meta.width, prev.meta.height),
        notes: [],
      };
      saveMap(updated);
      return updated;
    });
    setNextNoteId(1);
    setSelectedNoteId(null);
  }, []);

  const newMap = useCallback(() => {
    const fresh = createDefaultMap();
    persist(fresh);
    setNextNoteId(1);
    setSelectedNoteId(null);
  }, [persist]);

  const loadMapData = useCallback((loaded: DungeonMap) => {
    persist(loaded);
    const maxId = loaded.notes.length > 0 ? Math.max(...loaded.notes.map(n => n.id)) + 1 : 1;
    setNextNoteId(maxId);
    setSelectedNoteId(null);
  }, [persist]);

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
      saveMap(updated);
      return updated;
    });
    setNextNoteId(id => id + 1);
  }, [nextNoteId]);

  const updateNote = useCallback((id: number, label: string, description: string) => {
    setMap(prev => {
      const notes = prev.notes.map(n => n.id === id ? { ...n, label, description } : n);
      const updated = { ...prev, notes };
      saveMap(updated);
      return updated;
    });
  }, []);

  const deleteNote = useCallback((id: number) => {
    setMap(prev => {
      const notes = prev.notes.filter(n => n.id !== id);
      const newTiles = prev.tiles.map(row =>
        row.map(t => t.noteId === id ? { ...t, noteId: undefined } : t)
      );
      const updated = { ...prev, tiles: newTiles, notes };
      saveMap(updated);
      return updated;
    });
    setSelectedNoteId(sel => sel === id ? null : sel);
  }, []);

  const setTileSize = useCallback((tileSize: number) => {
    setMap(prev => {
      const updated = { ...prev, meta: { ...prev.meta, tileSize } };
      saveMap(updated);
      return updated;
    });
  }, []);

  return {
    map,
    selectedNoteId,
    setSelectedNoteId,
    setTile,
    fillTiles,
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
  };
}
