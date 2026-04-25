import { useState, useCallback, useEffect, useRef } from 'react';
import type { DungeonMap, MapNote, Tile, TileType, Token, TokenKind, AnnotationStroke } from '../types/map';
import { createEmptyGrid, createFogGrid, floodFill, resizeFogGrid } from '../utils/mapUtils';
import { saveMap, loadMap, migrateFromLocalStorage } from '../utils/storage';

const DEFAULT_WIDTH = 32;
const DEFAULT_HEIGHT = 32;
const DEFAULT_TILE_SIZE = 20;

function createDefaultMap(): DungeonMap {
  return {
    meta: { name: 'New Dungeon', width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, tileSize: DEFAULT_TILE_SIZE },
    tiles: createEmptyGrid(DEFAULT_WIDTH, DEFAULT_HEIGHT),
    notes: [],
    // Maps start fully fogged with fog-of-war enabled. Players see a fully
    // hidden map until the GM uses the Reveal tool to expose explored areas.
    fog: createFogGrid(DEFAULT_WIDTH, DEFAULT_HEIGHT, true),
    fogEnabled: true,
    tokens: [],
    annotations: [],
  };
}

/**
 * Backfill optional fields on maps loaded from older saves so the rest of
 * the app can rely on them being present. Mirrors the defaults from
 * createDefaultMap and is applied on every load path (IndexedDB autosave
 * and JSON import). Fog-of-war defaults to *on* with a fully-fogged grid
 * so the player view always starts safe regardless of when the map was
 * saved.
 */
function withDefaults(map: DungeonMap): DungeonMap {
  return {
    ...map,
    fog: map.fog ?? createFogGrid(map.meta.width, map.meta.height, true),
    fogEnabled: map.fogEnabled ?? true,
    tokens: map.tokens ?? [],
    annotations: map.annotations ?? [],
  };
}

/**
 * Compute the next id to assign for a list of items keyed by `id`. Returns
 * one greater than the largest existing id, or 1 if the list is empty/absent.
 */
function nextIdAfter(items: { id: number }[] | undefined): number {
  if (!items || items.length === 0) return 1;
  return Math.max(...items.map(i => i.id)) + 1;
}

interface HistorySnapshot {
  tiles: Tile[][];
  fog: boolean[][];
}

export function useMapState() {
  const [map, setMap] = useState<DungeonMap>(createDefaultMap);
  const [nextNoteId, setNextNoteId] = useState(1);
  const nextTokenIdRef = useRef(1);
  const nextStrokeIdRef = useRef(1);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pastRef = useRef<HistorySnapshot[]>([]);
  const futureRef = useRef<HistorySnapshot[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from IndexedDB on mount
  useEffect(() => {
    migrateFromLocalStorage().catch(() => {});
    loadMap().then(loaded => {
      if (loaded) {
        const ready = withDefaults(loaded);
        setMap(ready);
        setNextNoteId(nextIdAfter(ready.notes));
        nextTokenIdRef.current = nextIdAfter(ready.tokens);
        nextStrokeIdRef.current = nextIdAfter(ready.annotations);
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

  function pushHistory(currentTiles: Tile[][], currentFog: boolean[][] | undefined) {
    const snap: HistorySnapshot = {
      tiles: currentTiles,
      fog: currentFog ?? createFogGrid(
        currentTiles[0]?.length ?? 0,
        currentTiles.length,
        false
      ),
    };
    pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY_SIZE - 1)), snap];
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }

  const setTile = useCallback((x: number, y: number, type: TileType) => {
    setMap(prev => {
      pushHistory(prev.tiles, prev.fog);
      const newTiles = prev.tiles.map(row => row.map(t => ({ ...t })));
      if (y >= 0 && y < prev.meta.height && x >= 0 && x < prev.meta.width) {
        // Painting/erasing clears any per-tile theme override so the tile
        // follows the current map theme. This is what makes "preserve on
        // theme switch" non-destructive but still let new edits adopt the
        // newly selected theme.
        const next = { ...newTiles[y][x], type };
        delete next.theme;
        newTiles[y][x] = next;
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
      pushHistory(prev.tiles, prev.fog);
      const newTiles = floodFill(prev.tiles, x, y, targetType, fillType);
      const updated = { ...prev, tiles: newTiles };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const setTiles = useCallback((updates: { x: number; y: number; type: TileType }[]) => {
    setMap(prev => {
      pushHistory(prev.tiles, prev.fog);
      const newTiles = prev.tiles.map(row => row.map(t => ({ ...t })));
      for (const { x, y, type } of updates) {
        if (y >= 0 && y < prev.meta.height && x >= 0 && x < prev.meta.width) {
          // Same rationale as setTile: clear any per-tile theme override so
          // the new edit follows the current map theme.
          const next = { ...newTiles[y][x], type };
          delete next.theme;
          newTiles[y][x] = next;
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
      // Newly-added cells from a grow-resize default to fogged so unexplored
      // area added to the map stays hidden until the GM reveals it.
      const newFog = resizeFogGrid(prev.fog, width, height, true);
      // Drop tokens whose footprint no longer fits on the resized map.
      const newTokens = (prev.tokens ?? []).filter(t => {
        const sz = Math.max(1, Math.floor(t.size ?? 1));
        return t.x >= 0 && t.y >= 0 && t.x + sz <= width && t.y + sz <= height;
      });
      const updated = {
        ...prev,
        meta: { ...prev.meta, width, height },
        tiles: newTiles,
        fog: newFog,
        tokens: newTokens,
      };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const clearMap = useCallback(() => {
    setMap(prev => {
      pushHistory(prev.tiles, prev.fog);
      const updated = {
        ...prev,
        tiles: createEmptyGrid(prev.meta.width, prev.meta.height),
        notes: [],
        // Clearing the map resets to a fully-fogged state, matching the
        // behavior of a fresh map.
        fog: createFogGrid(prev.meta.width, prev.meta.height, true),
        tokens: [],
        annotations: [],
      };
      debouncedSave(updated);
      return updated;
    });
    setNextNoteId(1);
    nextTokenIdRef.current = 1;
    nextStrokeIdRef.current = 1;
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
    nextTokenIdRef.current = 1;
    nextStrokeIdRef.current = 1;
    setSelectedNoteId(null);
  }, [debouncedSave]);

  /**
   * Replace the map with procedurally-generated tiles. The previous tiles
   * and fog grid are pushed onto the undo stack so the user can revert a
   * generation; notes/tokens/annotations are reset (and not undoable, since
   * the existing history only tracks tiles+fog), matching the behavior of
   * `clearMap`. The current theme and tile size are preserved so the
   * generated map renders in whatever style the user already picked.
   */
  const generateMap = useCallback((
    tiles: Tile[][],
    width: number,
    height: number,
    notes: MapNote[] = [],
    name?: string
  ) => {
    setMap(prev => {
      pushHistory(prev.tiles, prev.fog);
      const updated: DungeonMap = {
        ...prev,
        meta: { ...prev.meta, width, height, ...(name ? { name } : {}) },
        tiles,
        notes,
        // Generated maps start fully fogged so a GM can reveal as players
        // explore — same default as `createDefaultMap`.
        fog: createFogGrid(width, height, true),
        fogEnabled: prev.fogEnabled ?? true,
        tokens: [],
        annotations: [],
      };
      debouncedSave(updated);
      return updated;
    });
    setNextNoteId(nextIdAfter(notes));
    nextTokenIdRef.current = 1;
    nextStrokeIdRef.current = 1;
    setSelectedNoteId(null);
  }, [debouncedSave]);

  const loadMapData = useCallback((loaded: DungeonMap) => {
    const ready = withDefaults(loaded);
    pastRef.current = [];
    futureRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    setMap(ready);
    debouncedSave(ready);
    setNextNoteId(nextIdAfter(ready.notes));
    nextTokenIdRef.current = nextIdAfter(ready.tokens);
    nextStrokeIdRef.current = nextIdAfter(ready.annotations);
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

  const setTheme = useCallback((theme: string, preserveExisting = false) => {
    setMap(prev => {
      const previousTheme = prev.meta.theme ?? 'dungeon';
      // Bail out if nothing would change so we don't push spurious history.
      if (theme === previousTheme) return prev;

      let newTiles = prev.tiles;
      if (preserveExisting) {
        // Stamp the *outgoing* theme onto every non-empty tile that does not
        // already carry an explicit per-tile theme. This freezes the visual
        // style of the user's existing work so it survives the switch, while
        // tiles painted afterward (which clear `theme`) follow the new map
        // theme. Empty tiles are skipped because they don't render and
        // tagging them would just bloat saved files.
        let mutated = false;
        const stamped = prev.tiles.map(row =>
          row.map(t => {
            if (t.type === 'empty' || t.theme) return t;
            mutated = true;
            return { ...t, theme: previousTheme };
          })
        );
        if (mutated) {
          pushHistory(prev.tiles, prev.fog);
          newTiles = stamped;
        }
      }

      const updated = {
        ...prev,
        tiles: newTiles,
        meta: { ...prev.meta, theme },
      };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    setMap(prev => {
      const previous = pastRef.current[pastRef.current.length - 1];
      pastRef.current = pastRef.current.slice(0, -1);
      futureRef.current = [
        ...futureRef.current,
        {
          tiles: prev.tiles,
          fog: prev.fog ?? createFogGrid(prev.meta.width, prev.meta.height, false),
        },
      ];
      const updated = { ...prev, tiles: previous.tiles, fog: previous.fog };
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
      pastRef.current = [
        ...pastRef.current,
        {
          tiles: prev.tiles,
          fog: prev.fog ?? createFogGrid(prev.meta.width, prev.meta.height, false),
        },
      ];
      const updated = { ...prev, tiles: next.tiles, fog: next.fog };
      debouncedSave(updated);
      setCanUndo(true);
      setCanRedo(futureRef.current.length > 0);
      return updated;
    });
  }, [debouncedSave]);

  // ── Fog of war ────────────────────────────────────────────────────────
  // All fog mutations share the tile/fog history stack so reveal/hide drag
  // operations can be undone alongside tile edits.

  const setFogCells = useCallback((cells: { x: number; y: number }[], hidden: boolean) => {
    setMap(prev => {
      const w = prev.meta.width;
      const h = prev.meta.height;
      const current = prev.fog ?? createFogGrid(w, h, false);
      // Skip the snapshot if nothing would change to avoid empty undo steps.
      let mutated = false;
      const newFog = current.map(row => row.slice());
      for (const { x, y } of cells) {
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        if (newFog[y][x] !== hidden) {
          newFog[y][x] = hidden;
          mutated = true;
        }
      }
      if (!mutated) return prev;
      pushHistory(prev.tiles, current);
      const updated = { ...prev, fog: newFog };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const fillAllFog = useCallback((hidden: boolean) => {
    setMap(prev => {
      const w = prev.meta.width;
      const h = prev.meta.height;
      const current = prev.fog ?? createFogGrid(w, h, false);
      pushHistory(prev.tiles, current);
      const updated = { ...prev, fog: createFogGrid(w, h, hidden) };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const setFogEnabled = useCallback((enabled: boolean) => {
    setMap(prev => {
      if ((prev.fogEnabled ?? false) === enabled) return prev;
      const updated = { ...prev, fogEnabled: enabled };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  // ── Tokens ────────────────────────────────────────────────────────────
  // Tokens are not part of the tile/fog undo stack — they're treated as
  // lightweight overlays that can be added/moved/removed freely.

  const addToken = useCallback((kind: TokenKind, x: number, y: number, label?: string, size?: number) => {
    const newId = nextTokenIdRef.current;
    nextTokenIdRef.current = newId + 1;
    setMap(prev => {
      const w = prev.meta.width;
      const h = prev.meta.height;
      const sz = Math.max(1, Math.floor(size ?? 1));
      // Reject placement if the footprint wouldn't fit on the map.
      if (x < 0 || y < 0 || x + sz > w || y + sz > h) return prev;
      const token: Token = {
        id: newId,
        x, y,
        kind,
        label: label ?? `${kind[0].toUpperCase()}${newId}`,
        ...(sz > 1 ? { size: sz } : {}),
      };
      const updated = { ...prev, tokens: [...(prev.tokens ?? []), token] };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const moveToken = useCallback((id: number, x: number, y: number) => {
    setMap(prev => {
      const w = prev.meta.width;
      const h = prev.meta.height;
      const existing = (prev.tokens ?? []).find(t => t.id === id);
      if (!existing) return prev;
      const sz = Math.max(1, Math.floor(existing.size ?? 1));
      // Refuse the move if the map is too small to fit the footprint;
      // otherwise the clamp below would force the token to (0,0) with
      // its footprint extending off the map.
      if (sz > w || sz > h) return prev;
      // Clamp the top-left so the full footprint stays on the map.
      const cx = Math.min(Math.max(0, x), w - sz);
      const cy = Math.min(Math.max(0, y), h - sz);
      if (cx === existing.x && cy === existing.y) return prev;
      const tokens = (prev.tokens ?? []).map(t =>
        t.id === id ? { ...t, x: cx, y: cy } : t
      );
      const updated = { ...prev, tokens };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const removeToken = useCallback((id: number) => {
    setMap(prev => {
      const tokens = (prev.tokens ?? []).filter(t => t.id !== id);
      const updated = { ...prev, tokens };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const updateToken = useCallback((id: number, patch: Partial<Omit<Token, 'id'>>) => {
    setMap(prev => {
      const tokens = (prev.tokens ?? []).map(t =>
        t.id === id ? { ...t, ...patch } : t
      );
      const updated = { ...prev, tokens };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  // ── Annotations (free-form pen) ───────────────────────────────────────

  const addAnnotation = useCallback((stroke: Omit<AnnotationStroke, 'id'>) => {
    const newId = nextStrokeIdRef.current;
    nextStrokeIdRef.current = newId + 1;
    setMap(prev => {
      const updated = {
        ...prev,
        annotations: [...(prev.annotations ?? []), { ...stroke, id: newId }],
      };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const removeAnnotation = useCallback((id: number) => {
    setMap(prev => {
      const annotations = (prev.annotations ?? []).filter(a => a.id !== id);
      const updated = { ...prev, annotations };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const clearAnnotations = useCallback((kind?: 'player' | 'gm') => {
    setMap(prev => {
      const annotations = kind
        ? (prev.annotations ?? []).filter(a => a.kind !== kind)
        : [];
      const updated = { ...prev, annotations };
      debouncedSave(updated);
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
    generateMap,
    addNote,
    updateNote,
    deleteNote,
    setTileSize,
    setTheme,
    undo,
    redo,
    canUndo,
    canRedo,
    // Fog of war
    setFogCells,
    fillAllFog,
    setFogEnabled,
    // Tokens
    addToken,
    moveToken,
    removeToken,
    updateToken,
    // Annotations
    addAnnotation,
    removeAnnotation,
    clearAnnotations,
  };
}
