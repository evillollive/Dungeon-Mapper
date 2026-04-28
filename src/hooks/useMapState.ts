import { useState, useCallback, useEffect, useRef } from 'react';
import type { DungeonMap, MapNote, Tile, TileType, Token, TokenKind, AnnotationStroke, ShapeMarker, MarkerShape, BackgroundImage } from '../types/map';
import { createEmptyGrid, createFogGrid, floodFill, resizeFogGrid } from '../utils/mapUtils';
import { saveMap, loadMap, migrateFromLocalStorage } from '../utils/storage';
import { reThemeNotes } from '../utils/reThemeNotes';

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
    markers: [],
    initiative: [],
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
    markers: map.markers ?? [],
    // Default to an empty initiative list rather than auto-populating from
    // existing tokens on legacy saves — a freshly loaded map shouldn't
    // surprise the GM with a pre-filled turn order they didn't set.
    initiative: map.initiative ?? [],
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

/**
 * One revertible step in the undo/redo stack. Snapshots the parts of
 * `DungeonMap` that user-driven mutations actually change: the tile grid,
 * the fog grid, the notes list, and the map's logical dimensions. The
 * dimensions are part of the snapshot so undoing a generation that
 * resized the map (e.g. 32x32 → 60x40) restores `meta.width`/`meta.height`
 * alongside the smaller `tiles` array, instead of leaving `meta` out of
 * sync with `tiles`. Tokens and annotations are intentionally excluded
 * because they are treated as live GM tools (see the comment near the
 * fog/token mutations below).
 */
interface HistorySnapshot {
  tiles: Tile[][];
  fog: boolean[][];
  notes: MapNote[];
  width: number;
  height: number;
}

/**
 * Internal clipboard buffer for copy/paste operations within the map.
 * Stored in a module-level variable (not React state) so it persists
 * across renders but doesn't trigger unnecessary re-renders.
 */
interface ClipboardBuffer {
  tiles: Tile[][];
  notes: MapNote[];
  width: number;
  height: number;
}

let clipboard: ClipboardBuffer | null = null;

/** Returns the current clipboard buffer, if any. */
export function getClipboard(): ClipboardBuffer | null {
  return clipboard;
}

export function useMapState() {
  const [map, setMap] = useState<DungeonMap>(createDefaultMap);
  const [nextNoteId, setNextNoteId] = useState(1);
  const nextTokenIdRef = useRef(1);
  const nextStrokeIdRef = useRef(1);
  const nextMarkerIdRef = useRef(1);
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
        nextMarkerIdRef.current = nextIdAfter(ready.markers);
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

  function pushHistory(prev: DungeonMap) {
    const snap: HistorySnapshot = {
      tiles: prev.tiles,
      fog: prev.fog ?? createFogGrid(prev.meta.width, prev.meta.height, false),
      notes: prev.notes,
      width: prev.meta.width,
      height: prev.meta.height,
    };
    pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY_SIZE - 1)), snap];
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }

  const setTile = useCallback((x: number, y: number, type: TileType) => {
    setMap(prev => {
      pushHistory(prev);
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
      pushHistory(prev);
      const newTiles = floodFill(prev.tiles, x, y, targetType, fillType);
      const updated = { ...prev, tiles: newTiles };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const setTiles = useCallback((updates: { x: number; y: number; type: TileType }[]) => {
    setMap(prev => {
      pushHistory(prev);
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
      const keptIds = new Set(newTokens.map(t => t.id));
      const newInitiative = (prev.initiative ?? []).filter(id => keptIds.has(id));
      const updated = {
        ...prev,
        meta: { ...prev.meta, width, height },
        tiles: newTiles,
        fog: newFog,
        tokens: newTokens,
        initiative: newInitiative,
      };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const clearMap = useCallback(() => {
    setMap(prev => {
      pushHistory(prev);
      const updated = {
        ...prev,
        tiles: createEmptyGrid(prev.meta.width, prev.meta.height),
        notes: [],
        // Clearing the map resets to a fully-fogged state, matching the
        // behavior of a fresh map.
        fog: createFogGrid(prev.meta.width, prev.meta.height, true),
        tokens: [],
        annotations: [],
        initiative: [],
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
   * Replace the map with procedurally-generated tiles. The previous
   * tiles, fog grid, notes, and map dimensions are pushed onto the undo
   * stack so the user can fully revert a generation; tokens and
   * annotations are reset (and not undoable, since they're treated as
   * live GM tools), matching the behavior of `clearMap`. The current
   * theme and tile size are preserved so the generated map renders in
   * whatever style the user already picked.
   */
  const generateMap = useCallback((
    tiles: Tile[][],
    width: number,
    height: number,
    notes: MapNote[] = [],
    name?: string
  ) => {
    setMap(prev => {
      pushHistory(prev);
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
        initiative: [],
      };
      debouncedSave(updated);
      return updated;
    });
    setNextNoteId(nextIdAfter(notes));
    nextTokenIdRef.current = 1;
    nextStrokeIdRef.current = 1;
    setSelectedNoteId(null);
  }, [debouncedSave]);

  /**
   * Stamp a generated sub-map onto the existing map at `(ox, oy)` instead
   * of replacing the whole canvas. Cells inside the target rectangle are
   * overwritten by the generator's tiles (preserving any per-tile theme
   * overrides on tiles outside the rectangle); the previous tiles are
   * pushed onto the undo stack so the operation is fully revertible. Notes
   * produced by the generator are merged into the existing notes list with
   * fresh ids and their coordinates offset into the target region.
   * Tokens, fog, and annotations are left untouched — only the drawn
   * tiles and the notes list change.
   */
  const applyGeneratedRegion = useCallback((
    genTiles: Tile[][],
    ox: number,
    oy: number,
    genNotes: MapNote[] = []
  ) => {
    const regionH = genTiles.length;
    const regionW = genTiles[0]?.length ?? 0;
    setMap(prev => {
      pushHistory(prev);
      const newTiles = prev.tiles.map(row => row.map(t => ({ ...t })));
      // Map the generator's local note ids (1..N) onto fresh ids that
      // don't collide with existing notes on this map. `idOffset` is the
      // amount we shift each generator id by — generator id 1 becomes
      // `idOffset + 1`, generator id 2 becomes `idOffset + 2`, etc.
      const idOffset = nextIdAfter(prev.notes) - 1;
      const idMap = new Map<number, number>();
      for (const n of genNotes) idMap.set(n.id, n.id + idOffset);
      for (let y = 0; y < regionH; y++) {
        const ty = oy + y;
        if (ty < 0 || ty >= prev.meta.height) continue;
        for (let x = 0; x < regionW; x++) {
          const tx = ox + x;
          if (tx < 0 || tx >= prev.meta.width) continue;
          const src = genTiles[y][x];
          const next: Tile = { type: src.type };
          if (src.noteId !== undefined) {
            const remapped = idMap.get(src.noteId);
            if (remapped !== undefined) next.noteId = remapped;
          }
          newTiles[ty][tx] = next;
        }
      }
      const remappedNotes: MapNote[] = genNotes.map(n => ({
        ...n,
        id: n.id + idOffset,
        x: n.x + ox,
        y: n.y + oy,
      }));
      const updatedNotes = [...prev.notes, ...remappedNotes];
      const updated: DungeonMap = {
        ...prev,
        tiles: newTiles,
        notes: updatedNotes,
      };
      debouncedSave(updated);
      return updated;
    });
    // Bump the next-note allocator past the ids we just appended so the
    // user's subsequent manual notes don't collide with them. The highest
    // id in `genNotes` is `nextIdAfter(genNotes) - 1`, and we shifted
    // every id up by `nextNoteId - 1`, so the new floor is
    // `nextNoteId + (highest in genNotes)`.
    if (genNotes.length > 0) {
      const highestGen = nextIdAfter(genNotes) - 1;
      setNextNoteId(prev => prev + highestGen);
    }
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
    nextMarkerIdRef.current = nextIdAfter(ready.markers);
    setSelectedNoteId(null);
  }, [debouncedSave]);

  const addNote = useCallback((x: number, y: number) => {
    setMap(prev => {
      pushHistory(prev);
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
      const existing = prev.notes.find(n => n.id === id);
      // Bail out if nothing would change so editing a note's dialog and
      // confirming without changes doesn't push a spurious undo entry.
      if (!existing || (existing.label === label && existing.description === description)) {
        return prev;
      }
      pushHistory(prev);
      const notes = prev.notes.map(n => n.id === id ? { ...n, label, description } : n);
      const updated = { ...prev, notes };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const deleteNote = useCallback((id: number) => {
    setMap(prev => {
      if (!prev.notes.some(n => n.id === id)) return prev;
      pushHistory(prev);
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
      let newNotes = prev.notes;
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
          pushHistory(prev);
          newTiles = stamped;
        }
      } else {
        // When *not* preserving, re-label auto-generated notes (room labels
        // and POIs) to match the new theme. User-created notes (no `kind`)
        // are left unchanged. Room-archetype notes are removed only when the
        // new theme lacks a room palette; their stale `noteId` links on
        // tiles are cleared so the canvas doesn't reference dead notes.
        const { notes: themed, removedIds } = reThemeNotes(
          prev.notes,
          prev.tiles,
          theme,
        );
        newNotes = themed;
        if (removedIds.size > 0) {
          newTiles = prev.tiles.map(row =>
            row.map(t =>
              t.noteId !== undefined && removedIds.has(t.noteId)
                ? { ...t, noteId: undefined }
                : t,
            ),
          );
        }
      }

      const updated = {
        ...prev,
        tiles: newTiles,
        notes: newNotes,
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
          notes: prev.notes,
          width: prev.meta.width,
          height: prev.meta.height,
        },
      ];
      const updated: DungeonMap = {
        ...prev,
        meta: { ...prev.meta, width: previous.width, height: previous.height },
        tiles: previous.tiles,
        fog: previous.fog,
        notes: previous.notes,
      };
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
          notes: prev.notes,
          width: prev.meta.width,
          height: prev.meta.height,
        },
      ];
      const updated: DungeonMap = {
        ...prev,
        meta: { ...prev.meta, width: next.width, height: next.height },
        tiles: next.tiles,
        fog: next.fog,
        notes: next.notes,
      };
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
      pushHistory(prev);
      const updated = { ...prev, fog: newFog };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const fillAllFog = useCallback((hidden: boolean) => {
    setMap(prev => {
      const w = prev.meta.width;
      const h = prev.meta.height;
      pushHistory(prev);
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

  const setDynamicFogEnabled = useCallback((enabled: boolean) => {
    setMap(prev => {
      if ((prev.dynamicFogEnabled ?? false) === enabled) return prev;
      const patch: Partial<DungeonMap> = { dynamicFogEnabled: enabled };
      // When enabling dynamic fog, ensure the explored grid exists.
      if (enabled && !prev.explored) {
        patch.explored = createFogGrid(prev.meta.width, prev.meta.height, false);
      }
      const updated = { ...prev, ...patch };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  /** Replace the explored grid (called by App.tsx after mergeExplored). */
  const setExplored = useCallback((explored: boolean[][]) => {
    setMap(prev => {
      if (prev.explored === explored) return prev;
      const updated = { ...prev, explored };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  /** Reset the explored grid (re-fog everything for dynamic fog). */
  const resetExplored = useCallback(() => {
    setMap(prev => {
      const updated = {
        ...prev,
        explored: createFogGrid(prev.meta.width, prev.meta.height, false),
      };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  // ── Tokens ────────────────────────────────────────────────────────────
  // Tokens are not part of the tile/fog undo stack — they're treated as
  // lightweight overlays that can be added/moved/removed freely.

  /**
   * Place a token on the map. Returns the new token's id on success, or
   * `null` if placement was rejected (e.g. the footprint wouldn't fit on
   * the map). On success the token is also appended to the initiative
   * order so it shows up in the right-hand Initiative panel.
   */
  const addToken = useCallback((kind: TokenKind, x: number, y: number, label?: string, size?: number): number | null => {
    const newId = nextTokenIdRef.current;
    let placed = false;
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
      placed = true;
      const updated = {
        ...prev,
        tokens: [...(prev.tokens ?? []), token],
        // Append the new token to the initiative order so it shows up in
        // the Initiative panel in the order it was placed. The GM can
        // drag entries to reorder afterwards.
        initiative: [...(prev.initiative ?? []), newId],
      };
      debouncedSave(updated);
      return updated;
    });
    if (placed) {
      nextTokenIdRef.current = newId + 1;
      return newId;
    }
    return null;
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
      const initiative = (prev.initiative ?? []).filter(tid => tid !== id);
      const updated = { ...prev, tokens, initiative };
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

  // ── Initiative order ──────────────────────────────────────────────────
  // The initiative panel mirrors the GM-controlled turn order. Tokens are
  // appended on placement (see `addToken`) and removed on deletion (see
  // `removeToken`); these helpers let the GM drag entries to reorder and
  // wipe the list without removing the underlying tokens.

  const reorderInitiative = useCallback((fromIndex: number, toIndex: number) => {
    setMap(prev => {
      const init = [...(prev.initiative ?? [])];
      if (fromIndex < 0 || fromIndex >= init.length) return prev;
      const clampedTo = Math.max(0, Math.min(init.length - 1, toIndex));
      if (fromIndex === clampedTo) return prev;
      const [moved] = init.splice(fromIndex, 1);
      init.splice(clampedTo, 0, moved);
      const updated = { ...prev, initiative: init };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const clearInitiative = useCallback(() => {
    setMap(prev => {
      if ((prev.initiative ?? []).length === 0) return prev;
      const updated = { ...prev, initiative: [] };
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

  // ── Shape Markers ─────────────────────────────────────────────────────
  // Lightweight tactical overlays (spell AoE, hazard zones, etc.) rendered
  // with transparency so the map content underneath remains visible.

  const addMarker = useCallback((shape: MarkerShape, x: number, y: number, color: string, size: number): number | null => {
    const newId = nextMarkerIdRef.current;
    let placed = false;
    setMap(prev => {
      if (x < 0 || y < 0 || x >= prev.meta.width || y >= prev.meta.height) return prev;
      const marker: ShapeMarker = { id: newId, x, y, shape, color, size: Math.max(1, Math.floor(size)) };
      placed = true;
      const updated = { ...prev, markers: [...(prev.markers ?? []), marker] };
      debouncedSave(updated);
      return updated;
    });
    if (placed) {
      nextMarkerIdRef.current = newId + 1;
      return newId;
    }
    return null;
  }, [debouncedSave]);

  const removeMarker = useCallback((id: number) => {
    setMap(prev => {
      const markers = (prev.markers ?? []).filter(m => m.id !== id);
      const updated = { ...prev, markers };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const clearMarkers = useCallback(() => {
    setMap(prev => {
      if ((prev.markers ?? []).length === 0) return prev;
      const updated = { ...prev, markers: [] };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  // ---- Background image ----

  const setBackgroundImage = useCallback((bg: BackgroundImage) => {
    setMap(prev => {
      const updated = { ...prev, backgroundImage: bg };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const clearBackgroundImage = useCallback(() => {
    setMap(prev => {
      if (!prev.backgroundImage) return prev;
      const updated = { ...prev, backgroundImage: undefined };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const updateBackgroundImage = useCallback((patch: Partial<BackgroundImage>) => {
    setMap(prev => {
      if (!prev.backgroundImage) return prev;
      const updated = { ...prev, backgroundImage: { ...prev.backgroundImage, ...patch } };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  /**
   * Copy the contents of the given selection rectangle into the internal
   * clipboard buffer. Tiles and notes within the rectangle are captured
   * with their positions relative to the selection origin.
   */
  const copySelection = useCallback((sel: { x: number; y: number; w: number; h: number }) => {
    const { tiles: mapTiles, notes: mapNotes, meta } = map;
    const bufTiles: Tile[][] = [];
    for (let dy = 0; dy < sel.h; dy++) {
      const row: Tile[] = [];
      for (let dx = 0; dx < sel.w; dx++) {
        const ty = sel.y + dy;
        const tx = sel.x + dx;
        if (ty >= 0 && ty < meta.height && tx >= 0 && tx < meta.width) {
          row.push({ ...mapTiles[ty][tx] });
        } else {
          row.push({ type: 'empty' });
        }
      }
      bufTiles.push(row);
    }
    // Capture notes whose anchor falls inside the rectangle, with
    // positions rebased to the selection's top-left corner.
    const bufNotes: MapNote[] = mapNotes
      .filter(n =>
        n.x >= sel.x && n.x < sel.x + sel.w &&
        n.y >= sel.y && n.y < sel.y + sel.h
      )
      .map(n => ({ ...n, x: n.x - sel.x, y: n.y - sel.y }));
    clipboard = { tiles: bufTiles, notes: bufNotes, width: sel.w, height: sel.h };
  }, [map]);

  /**
   * Cut the selection: copy to clipboard then erase the selected region.
   */
  const cutSelection = useCallback((sel: { x: number; y: number; w: number; h: number }) => {
    // Copy first.
    copySelection(sel);
    // Then erase the region (including removing notes inside it).
    setMap(prev => {
      pushHistory(prev);
      const newTiles = prev.tiles.map(row => row.map(t => ({ ...t })));
      for (let dy = 0; dy < sel.h; dy++) {
        const ty = sel.y + dy;
        if (ty < 0 || ty >= prev.meta.height) continue;
        for (let dx = 0; dx < sel.w; dx++) {
          const tx = sel.x + dx;
          if (tx < 0 || tx >= prev.meta.width) continue;
          newTiles[ty][tx] = { type: 'empty' };
        }
      }
      const notesToRemove = new Set(
        prev.notes
          .filter(n =>
            n.x >= sel.x && n.x < sel.x + sel.w &&
            n.y >= sel.y && n.y < sel.y + sel.h
          )
          .map(n => n.id)
      );
      // Clear noteId references from tiles that pointed at removed notes.
      for (let y = 0; y < prev.meta.height; y++) {
        for (let x = 0; x < prev.meta.width; x++) {
          if (newTiles[y][x].noteId !== undefined && notesToRemove.has(newTiles[y][x].noteId!)) {
            const next = { ...newTiles[y][x] };
            delete next.noteId;
            newTiles[y][x] = next;
          }
        }
      }
      const updatedNotes = prev.notes.filter(n => !notesToRemove.has(n.id));
      const updated: DungeonMap = { ...prev, tiles: newTiles, notes: updatedNotes };
      debouncedSave(updated);
      return updated;
    });
  }, [copySelection, debouncedSave]);

  /**
   * Paste the clipboard buffer at the given position on the map. Notes
   * in the clipboard are remapped to fresh ids so they don't collide
   * with existing map notes. This is a single undoable step.
   */
  const pasteClipboard = useCallback((ox: number, oy: number) => {
    if (!clipboard) return;
    const buf = clipboard;
    setMap(prev => {
      pushHistory(prev);
      const newTiles = prev.tiles.map(row => row.map(t => ({ ...t })));
      // Build a fresh id mapping for pasted notes.
      const idOffset = nextIdAfter(prev.notes) - 1;
      const idMap = new Map<number, number>();
      for (const n of buf.notes) idMap.set(n.id, n.id + idOffset);
      for (let dy = 0; dy < buf.height; dy++) {
        const ty = oy + dy;
        if (ty < 0 || ty >= prev.meta.height) continue;
        for (let dx = 0; dx < buf.width; dx++) {
          const tx = ox + dx;
          if (tx < 0 || tx >= prev.meta.width) continue;
          const src = buf.tiles[dy][dx];
          const next: Tile = { type: src.type };
          // Preserve the per-tile theme override so a pasted tile keeps
          // its original visual style in mixed-theme maps.
          if (src.theme) next.theme = src.theme;
          if (src.noteId !== undefined) {
            const remapped = idMap.get(src.noteId);
            if (remapped !== undefined) next.noteId = remapped;
          }
          newTiles[ty][tx] = next;
        }
      }
      const remappedNotes: MapNote[] = buf.notes.map(n => ({
        ...n,
        id: n.id + idOffset,
        x: n.x + ox,
        y: n.y + oy,
      }));
      // Filter out pasted notes that fall outside the map boundaries.
      const validNotes = remappedNotes.filter(
        n => n.x >= 0 && n.x < prev.meta.width && n.y >= 0 && n.y < prev.meta.height
      );
      const updatedNotes = [...prev.notes, ...validNotes];
      const updated: DungeonMap = { ...prev, tiles: newTiles, notes: updatedNotes };
      debouncedSave(updated);
      return updated;
    });
    // Bump the note-id allocator past the ids we just assigned.
    if (buf.notes.length > 0) {
      const highestGen = nextIdAfter(buf.notes) - 1;
      setNextNoteId(prev => prev + highestGen);
    }
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
    // Fog of war
    setFogCells,
    fillAllFog,
    setFogEnabled,
    setDynamicFogEnabled,
    setExplored,
    resetExplored,
    // Tokens
    addToken,
    moveToken,
    removeToken,
    updateToken,
    // Initiative
    reorderInitiative,
    clearInitiative,
    // Annotations
    addAnnotation,
    removeAnnotation,
    clearAnnotations,
    // Clipboard
    copySelection,
    cutSelection,
    pasteClipboard,
    // Shape markers
    addMarker,
    removeMarker,
    clearMarkers,
    // Background image
    setBackgroundImage,
    clearBackgroundImage,
    updateBackgroundImage,
  };
}
