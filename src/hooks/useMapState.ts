import { useState, useCallback, useEffect, useRef } from 'react';
import type { DungeonMap, DungeonProject, MapNote, Tile, TileType, Token, TokenKind, AnnotationStroke, ShapeMarker, MarkerShape, BackgroundImage, LightSource } from '../types/map';
import { createEmptyGrid, createFogGrid, floodFill, resizeFogGrid } from '../utils/mapUtils';
import { saveProject, loadProject, migrateFromLocalStorage } from '../utils/storage';
import { wrapMapAsProject } from '../utils/storage';
import { reThemeNotes } from '../utils/reThemeNotes';

const DEFAULT_WIDTH = 32;
const DEFAULT_HEIGHT = 32;
const DEFAULT_TILE_SIZE = 20;

function createDefaultMap(name = 'Level 1'): DungeonMap {
  return {
    meta: { name, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, tileSize: DEFAULT_TILE_SIZE },
    tiles: createEmptyGrid(DEFAULT_WIDTH, DEFAULT_HEIGHT),
    notes: [],
    fog: createFogGrid(DEFAULT_WIDTH, DEFAULT_HEIGHT, true),
    fogEnabled: true,
    tokens: [],
    annotations: [],
    markers: [],
    initiative: [],
    lightSources: [],
  };
}

function createDefaultProject(): DungeonProject {
  return {
    name: 'New Dungeon',
    levels: [createDefaultMap()],
    activeLevelIndex: 0,
    stairLinks: [],
  };
}

function withDefaults(map: DungeonMap): DungeonMap {
  return {
    ...map,
    fog: map.fog ?? createFogGrid(map.meta.width, map.meta.height, true),
    fogEnabled: map.fogEnabled ?? true,
    tokens: map.tokens ?? [],
    annotations: map.annotations ?? [],
    markers: map.markers ?? [],
    initiative: map.initiative ?? [],
    lightSources: map.lightSources ?? [],
  };
}

function withProjectDefaults(project: DungeonProject): DungeonProject {
  return {
    ...project,
    levels: project.levels.map(withDefaults),
    stairLinks: project.stairLinks ?? [],
  };
}

function nextIdAfter(items: { id: number }[] | undefined): number {
  if (!items || items.length === 0) return 1;
  return Math.max(...items.map(i => i.id)) + 1;
}

interface HistorySnapshot {
  tiles: Tile[][];
  fog: boolean[][];
  notes: MapNote[];
  width: number;
  height: number;
}

interface LevelHistory {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
}

interface ClipboardBuffer {
  tiles: Tile[][];
  notes: MapNote[];
  width: number;
  height: number;
}

let clipboard: ClipboardBuffer | null = null;

export function getClipboard(): ClipboardBuffer | null {
  return clipboard;
}

export function useMapState() {
  const [project, setProject] = useState<DungeonProject>(createDefaultProject);
  const [activeLevelIndex, setActiveLevelIndex] = useState(0);
  const [nextNoteId, setNextNoteId] = useState(1);
  const nextTokenIdRef = useRef(1);
  const nextStrokeIdRef = useRef(1);
  const nextMarkerIdRef = useRef(1);
  const nextLightIdRef = useRef(1);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const historyRef = useRef<Map<number, LevelHistory>>(new Map());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function getHistory(levelIdx: number): LevelHistory {
    let h = historyRef.current.get(levelIdx);
    if (!h) {
      h = { past: [], future: [] };
      historyRef.current.set(levelIdx, h);
    }
    return h;
  }

  const map = project.levels[activeLevelIndex] ?? project.levels[0];

  function syncIdsToLevel(level: DungeonMap) {
    setNextNoteId(nextIdAfter(level.notes));
    nextTokenIdRef.current = nextIdAfter(level.tokens);
    nextStrokeIdRef.current = nextIdAfter(level.annotations);
    nextMarkerIdRef.current = nextIdAfter(level.markers);
    nextLightIdRef.current = nextIdAfter(level.lightSources);
  }

  useEffect(() => {
    migrateFromLocalStorage().catch(() => {});
    loadProject().then(loaded => {
      if (loaded) {
        const ready = withProjectDefaults(loaded);
        setProject(ready);
        const idx = Math.min(ready.activeLevelIndex, ready.levels.length - 1);
        setActiveLevelIndex(idx);
        syncIdsToLevel(ready.levels[idx]);
      }
    }).catch(() => {});

  }, []);

  const debouncedSave = useCallback((proj: DungeonProject) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveProject(proj).catch(() => {});
    }, 500);
  }, []);

  const MAX_HISTORY_SIZE = 50;

  function pushHistory(prev: DungeonMap, levelIdx: number) {
    const snap: HistorySnapshot = {
      tiles: prev.tiles,
      fog: prev.fog ?? createFogGrid(prev.meta.width, prev.meta.height, false),
      notes: prev.notes,
      width: prev.meta.width,
      height: prev.meta.height,
    };
    const h = getHistory(levelIdx);
    h.past = [...h.past.slice(-(MAX_HISTORY_SIZE - 1)), snap];
    h.future = [];
    setCanUndo(true);
    setCanRedo(false);
  }

  function updateActiveLevel(
    proj: DungeonProject,
    levelIdx: number,
    updater: (prev: DungeonMap) => DungeonMap,
  ): DungeonProject {
    const newLevels = proj.levels.map((lvl, i) =>
      i === levelIdx ? updater(lvl) : lvl,
    );
    return { ...proj, levels: newLevels, activeLevelIndex: levelIdx };
  }

  const setTile = useCallback((x: number, y: number, type: TileType) => {
    setProject(prev => {
      pushHistory(prev.levels[activeLevelIndex], activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => {
        const newTiles = m.tiles.map(row => row.map(t => ({ ...t })));
        if (y >= 0 && y < m.meta.height && x >= 0 && x < m.meta.width) {
          const next = { ...newTiles[y][x], type };
          delete next.theme;
          newTiles[y][x] = next;
        }
        return { ...m, tiles: newTiles };
      });
      debouncedSave(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  const fillTiles = useCallback((x: number, y: number, fillType: TileType) => {
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      const targetType = prevMap.tiles[y]?.[x]?.type;
      if (!targetType) return prev;
      pushHistory(prevMap, activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, tiles: floodFill(m.tiles, x, y, targetType, fillType),
      }));
      debouncedSave(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  const setTiles = useCallback((updates: { x: number; y: number; type: TileType }[]) => {
    setProject(prev => {
      pushHistory(prev.levels[activeLevelIndex], activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => {
        const newTiles = m.tiles.map(row => row.map(t => ({ ...t })));
        for (const { x, y, type } of updates) {
          if (y >= 0 && y < m.meta.height && x >= 0 && x < m.meta.width) {
            const next = { ...newTiles[y][x], type };
            delete next.theme;
            newTiles[y][x] = next;
          }
        }
        return { ...m, tiles: newTiles };
      });
      debouncedSave(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  const getTileType = useCallback((x: number, y: number): TileType | null => {
    return map.tiles[y]?.[x]?.type ?? null;
  }, [map.tiles]);

  const setMapName = useCallback((name: string) => {
    setProject(prev => {
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, meta: { ...m.meta, name },
      }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const resizeMap = useCallback((width: number, height: number) => {
    setProject(prev => {
      const updated = updateActiveLevel(prev, activeLevelIndex, m => {
        const newTiles: Tile[][] = Array.from({ length: height }, (_, y) =>
          Array.from({ length: width }, (_, x) =>
            m.tiles[y]?.[x] ?? { type: 'empty' as TileType }
          )
        );
        return {
          ...m,
          meta: { ...m.meta, width, height },
          tiles: newTiles,
          fog: resizeFogGrid(m.fog, width, height, true),
          tokens: (m.tokens ?? []).filter(t => {
            const sz = Math.max(1, Math.floor(t.size ?? 1));
            return t.x >= 0 && t.y >= 0 && t.x + sz <= width && t.y + sz <= height;
          }),
          initiative: (m.initiative ?? []).filter(id =>
            (m.tokens ?? []).some(t => {
              const sz = Math.max(1, Math.floor(t.size ?? 1));
              return t.id === id && t.x >= 0 && t.y >= 0 && t.x + sz <= width && t.y + sz <= height;
            })
          ),
          lightSources: (m.lightSources ?? []).filter(
            ls => ls.x >= 0 && ls.x < width && ls.y >= 0 && ls.y < height,
          ),
        };
      });
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const clearMap = useCallback(() => {
    setProject(prev => {
      pushHistory(prev.levels[activeLevelIndex], activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m,
        tiles: createEmptyGrid(m.meta.width, m.meta.height),
        notes: [],
        fog: createFogGrid(m.meta.width, m.meta.height, true),
        explored: undefined,
        dynamicFogEnabled: false,
        tokens: [],
        annotations: [],
        initiative: [],
        lightSources: [],
        markers: [],
      }));
      debouncedSave(updated);
      return updated;
    });
    setNextNoteId(1);
    nextTokenIdRef.current = 1;
    nextStrokeIdRef.current = 1;
    nextLightIdRef.current = 1;
    nextMarkerIdRef.current = 1;
    setSelectedNoteId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  const newMap = useCallback(() => {
    const fresh = createDefaultProject();
    historyRef.current = new Map();
    setCanUndo(false);
    setCanRedo(false);
    setProject(fresh);
    setActiveLevelIndex(0);
    debouncedSave(fresh);
    setNextNoteId(1);
    nextTokenIdRef.current = 1;
    nextStrokeIdRef.current = 1;
    nextLightIdRef.current = 1;
    nextMarkerIdRef.current = 1;
    setSelectedNoteId(null);
  }, [debouncedSave]);

  const generateMap = useCallback((tiles: Tile[][], width: number, height: number, notes: MapNote[] = [], name?: string) => {
    setProject(prev => {
      pushHistory(prev.levels[activeLevelIndex], activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m,
        meta: { ...m.meta, width, height, ...(name ? { name } : {}) },
        tiles, notes,
        fog: createFogGrid(width, height, true),
        fogEnabled: m.fogEnabled ?? true,
        tokens: [], annotations: [], initiative: [],
      }));
      debouncedSave(updated);
      return updated;
    });
    setNextNoteId(nextIdAfter(notes));
    nextTokenIdRef.current = 1;
    nextStrokeIdRef.current = 1;
    setSelectedNoteId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  const applyGeneratedRegion = useCallback((genTiles: Tile[][], ox: number, oy: number, genNotes: MapNote[] = []) => {
    const regionH = genTiles.length;
    const regionW = genTiles[0]?.length ?? 0;
    setProject(prev => {
      pushHistory(prev.levels[activeLevelIndex], activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => {
        const newTiles = m.tiles.map(row => row.map(t => ({ ...t })));
        const idOffset = nextIdAfter(m.notes) - 1;
        const idMap = new Map<number, number>();
        for (const n of genNotes) idMap.set(n.id, n.id + idOffset);
        for (let y = 0; y < regionH; y++) {
          const ty = oy + y;
          if (ty < 0 || ty >= m.meta.height) continue;
          for (let x = 0; x < regionW; x++) {
            const tx = ox + x;
            if (tx < 0 || tx >= m.meta.width) continue;
            const src = genTiles[y][x];
            const next: Tile = { type: src.type };
            if (src.noteId !== undefined) {
              const remapped = idMap.get(src.noteId);
              if (remapped !== undefined) next.noteId = remapped;
            }
            newTiles[ty][tx] = next;
          }
        }
        const remappedNotes: MapNote[] = genNotes.map(n => ({ ...n, id: n.id + idOffset, x: n.x + ox, y: n.y + oy }));
        return { ...m, tiles: newTiles, notes: [...m.notes, ...remappedNotes] };
      });
      debouncedSave(updated);
      return updated;
    });
    if (genNotes.length > 0) {
      const highestGen = nextIdAfter(genNotes) - 1;
      setNextNoteId(prev => prev + highestGen);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  const loadMapData = useCallback((loaded: DungeonMap) => {
    const proj = withProjectDefaults(wrapMapAsProject(withDefaults(loaded)));
    historyRef.current = new Map();
    setCanUndo(false);
    setCanRedo(false);
    setProject(proj);
    setActiveLevelIndex(0);
    debouncedSave(proj);
    syncIdsToLevel(proj.levels[0]);
    setSelectedNoteId(null);

  }, [debouncedSave]);

  const loadProjectData = useCallback((loaded: DungeonProject) => {
    const proj = withProjectDefaults(loaded);
    historyRef.current = new Map();
    setCanUndo(false);
    setCanRedo(false);
    const idx = Math.min(proj.activeLevelIndex, proj.levels.length - 1);
    setProject(proj);
    setActiveLevelIndex(idx);
    debouncedSave(proj);
    syncIdsToLevel(proj.levels[idx]);
    setSelectedNoteId(null);

  }, [debouncedSave]);

  const addNote = useCallback((x: number, y: number) => {
    setProject(prev => {
      pushHistory(prev.levels[activeLevelIndex], activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => {
        const newNote: MapNote = { id: nextNoteId, x, y, label: `Room ${nextNoteId}`, description: '' };
        const newTiles = m.tiles.map(row => row.map(t => ({ ...t })));
        if (newTiles[y]?.[x]) newTiles[y][x] = { ...newTiles[y][x], noteId: nextNoteId };
        return { ...m, tiles: newTiles, notes: [...m.notes, newNote] };
      });
      debouncedSave(updated);
      return updated;
    });
    setNextNoteId(id => id + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextNoteId, debouncedSave, activeLevelIndex]);

  const updateNote = useCallback((id: number, label: string, description: string) => {
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      const existing = prevMap.notes.find(n => n.id === id);
      if (!existing || (existing.label === label && existing.description === description)) return prev;
      pushHistory(prevMap, activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, notes: m.notes.map(n => n.id === id ? { ...n, label, description } : n),
      }));
      debouncedSave(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  const deleteNote = useCallback((id: number) => {
    setProject(prev => {
      if (!prev.levels[activeLevelIndex].notes.some(n => n.id === id)) return prev;
      pushHistory(prev.levels[activeLevelIndex], activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => {
        const notes = m.notes.filter(n => n.id !== id);
        const newTiles = m.tiles.map(row => row.map(t => t.noteId === id ? { ...t, noteId: undefined } : t));
        return { ...m, tiles: newTiles, notes };
      });
      debouncedSave(updated);
      return updated;
    });
    setSelectedNoteId(sel => sel === id ? null : sel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  const setTileSize = useCallback((tileSize: number) => {
    setProject(prev => {
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({ ...m, meta: { ...m.meta, tileSize } }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const setTheme = useCallback((theme: string, preserveExisting = false) => {
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      const previousTheme = prevMap.meta.theme ?? 'dungeon';
      if (theme === previousTheme) return prev;
      const updated = updateActiveLevel(prev, activeLevelIndex, m => {
        let newTiles = m.tiles;
        let newNotes = m.notes;
        if (preserveExisting) {
          let mutated = false;
          const stamped = m.tiles.map(row => row.map(t => {
            if (t.type === 'empty' || t.theme) return t;
            mutated = true;
            return { ...t, theme: previousTheme };
          }));
          if (mutated) { pushHistory(m, activeLevelIndex); newTiles = stamped; }
        } else {
          const { notes: themed, removedIds } = reThemeNotes(m.notes, m.tiles, theme);
          newNotes = themed;
          if (removedIds.size > 0) {
            newTiles = m.tiles.map(row => row.map(t =>
              t.noteId !== undefined && removedIds.has(t.noteId) ? { ...t, noteId: undefined } : t,
            ));
          }
        }
        return { ...m, tiles: newTiles, notes: newNotes, meta: { ...m.meta, theme } };
      });
      debouncedSave(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  const undo = useCallback(() => {
    const h = getHistory(activeLevelIndex);
    if (h.past.length === 0) return;
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      const previous = h.past[h.past.length - 1];
      h.past = h.past.slice(0, -1);
      h.future = [...h.future, {
        tiles: prevMap.tiles,
        fog: prevMap.fog ?? createFogGrid(prevMap.meta.width, prevMap.meta.height, false),
        notes: prevMap.notes, width: prevMap.meta.width, height: prevMap.meta.height,
      }];
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, meta: { ...m.meta, width: previous.width, height: previous.height },
        tiles: previous.tiles, fog: previous.fog, notes: previous.notes,
      }));
      debouncedSave(updated);
      setCanUndo(h.past.length > 0);
      setCanRedo(true);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const redo = useCallback(() => {
    const h = getHistory(activeLevelIndex);
    if (h.future.length === 0) return;
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      const next = h.future[h.future.length - 1];
      h.future = h.future.slice(0, -1);
      h.past = [...h.past, {
        tiles: prevMap.tiles,
        fog: prevMap.fog ?? createFogGrid(prevMap.meta.width, prevMap.meta.height, false),
        notes: prevMap.notes, width: prevMap.meta.width, height: prevMap.meta.height,
      }];
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, meta: { ...m.meta, width: next.width, height: next.height },
        tiles: next.tiles, fog: next.fog, notes: next.notes,
      }));
      debouncedSave(updated);
      setCanUndo(true);
      setCanRedo(h.future.length > 0);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  // ── Fog of war ────────────────────────────────────────────────────────

  const setFogCells = useCallback((cells: { x: number; y: number }[], hidden: boolean) => {
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      const w = prevMap.meta.width; const ht = prevMap.meta.height;
      const current = prevMap.fog ?? createFogGrid(w, ht, false);
      let mutated = false;
      const newFog = current.map(row => row.slice());
      for (const { x, y } of cells) {
        if (x < 0 || x >= w || y < 0 || y >= ht) continue;
        if (newFog[y][x] !== hidden) { newFog[y][x] = hidden; mutated = true; }
      }
      if (!mutated) return prev;
      pushHistory(prevMap, activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({ ...m, fog: newFog }));
      debouncedSave(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  const fillAllFog = useCallback((hidden: boolean) => {
    setProject(prev => {
      pushHistory(prev.levels[activeLevelIndex], activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, fog: createFogGrid(m.meta.width, m.meta.height, hidden),
      }));
      debouncedSave(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  const setFogEnabled = useCallback((enabled: boolean) => {
    setProject(prev => {
      if ((prev.levels[activeLevelIndex].fogEnabled ?? false) === enabled) return prev;
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({ ...m, fogEnabled: enabled }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const setDynamicFogEnabled = useCallback((enabled: boolean) => {
    setProject(prev => {
      if ((prev.levels[activeLevelIndex].dynamicFogEnabled ?? false) === enabled) return prev;
      const updated = updateActiveLevel(prev, activeLevelIndex, m => {
        const patch: Partial<DungeonMap> = { dynamicFogEnabled: enabled };
        if (enabled && !m.explored) patch.explored = createFogGrid(m.meta.width, m.meta.height, false);
        return { ...m, ...patch };
      });
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const setExplored = useCallback((explored: boolean[][]) => {
    setProject(prev => {
      if (prev.levels[activeLevelIndex].explored === explored) return prev;
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({ ...m, explored }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const resetExplored = useCallback(() => {
    setProject(prev => {
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, explored: createFogGrid(m.meta.width, m.meta.height, false),
      }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  // ── Tokens ────────────────────────────────────────────────────────────

  const addToken = useCallback((kind: TokenKind, x: number, y: number, label?: string, size?: number): number | null => {
    const newId = nextTokenIdRef.current;
    let placed = false;
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      const sz = Math.max(1, Math.floor(size ?? 1));
      if (x < 0 || y < 0 || x + sz > prevMap.meta.width || y + sz > prevMap.meta.height) return prev;
      placed = true;
      const token: Token = { id: newId, x, y, kind, label: label ?? `${kind[0].toUpperCase()}${newId}`, ...(sz > 1 ? { size: sz } : {}) };
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, tokens: [...(m.tokens ?? []), token], initiative: [...(m.initiative ?? []), newId],
      }));
      debouncedSave(updated);
      return updated;
    });
    if (placed) { nextTokenIdRef.current = newId + 1; return newId; }
    return null;
  }, [debouncedSave, activeLevelIndex]);

  const moveToken = useCallback((id: number, x: number, y: number) => {
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      const existing = (prevMap.tokens ?? []).find(t => t.id === id);
      if (!existing) return prev;
      const sz = Math.max(1, Math.floor(existing.size ?? 1));
      const w = prevMap.meta.width; const h = prevMap.meta.height;
      if (sz > w || sz > h) return prev;
      const cx = Math.min(Math.max(0, x), w - sz);
      const cy = Math.min(Math.max(0, y), h - sz);
      if (cx === existing.x && cy === existing.y) return prev;
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, tokens: (m.tokens ?? []).map(t => t.id === id ? { ...t, x: cx, y: cy } : t),
      }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const removeToken = useCallback((id: number) => {
    setProject(prev => {
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, tokens: (m.tokens ?? []).filter(t => t.id !== id), initiative: (m.initiative ?? []).filter(tid => tid !== id),
      }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const updateToken = useCallback((id: number, patch: Partial<Omit<Token, 'id'>>) => {
    setProject(prev => {
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, tokens: (m.tokens ?? []).map(t => t.id === id ? { ...t, ...patch } : t),
      }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const reorderInitiative = useCallback((fromIndex: number, toIndex: number) => {
    setProject(prev => {
      const init = [...(prev.levels[activeLevelIndex].initiative ?? [])];
      if (fromIndex < 0 || fromIndex >= init.length) return prev;
      const clampedTo = Math.max(0, Math.min(init.length - 1, toIndex));
      if (fromIndex === clampedTo) return prev;
      const [moved] = init.splice(fromIndex, 1);
      init.splice(clampedTo, 0, moved);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({ ...m, initiative: init }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const clearInitiative = useCallback(() => {
    setProject(prev => {
      if ((prev.levels[activeLevelIndex].initiative ?? []).length === 0) return prev;
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({ ...m, initiative: [] }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const addAnnotation = useCallback((stroke: Omit<AnnotationStroke, 'id'>) => {
    const newId = nextStrokeIdRef.current;
    nextStrokeIdRef.current = newId + 1;
    setProject(prev => {
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, annotations: [...(m.annotations ?? []), { ...stroke, id: newId }],
      }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const removeAnnotation = useCallback((id: number) => {
    setProject(prev => {
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, annotations: (m.annotations ?? []).filter(a => a.id !== id),
      }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const clearAnnotations = useCallback((kind?: 'player' | 'gm') => {
    setProject(prev => {
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, annotations: kind ? (m.annotations ?? []).filter(a => a.kind !== kind) : [],
      }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const addMarker = useCallback((shape: MarkerShape, x: number, y: number, color: string, size: number): number | null => {
    const newId = nextMarkerIdRef.current;
    let placed = false;
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      if (x < 0 || y < 0 || x >= prevMap.meta.width || y >= prevMap.meta.height) return prev;
      placed = true;
      const marker: ShapeMarker = { id: newId, x, y, shape, color, size: Math.max(1, Math.floor(size)) };
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, markers: [...(m.markers ?? []), marker],
      }));
      debouncedSave(updated);
      return updated;
    });
    if (placed) { nextMarkerIdRef.current = newId + 1; return newId; }
    return null;
  }, [debouncedSave, activeLevelIndex]);

  const removeMarker = useCallback((id: number) => {
    setProject(prev => {
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, markers: (m.markers ?? []).filter(mk => mk.id !== id),
      }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const clearMarkers = useCallback(() => {
    setProject(prev => {
      if ((prev.levels[activeLevelIndex].markers ?? []).length === 0) return prev;
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({ ...m, markers: [] }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const addLightSource = useCallback((x: number, y: number, radius: number, color: string, label: string): number | null => {
    const newId = nextLightIdRef.current;
    let placed = false;
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      if (x < 0 || y < 0 || x >= prevMap.meta.width || y >= prevMap.meta.height) return prev;
      placed = true;
      const ls: LightSource = { id: newId, x, y, radius, color, label };
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, lightSources: [...(m.lightSources ?? []), ls],
      }));
      debouncedSave(updated);
      return updated;
    });
    if (placed) { nextLightIdRef.current = newId + 1; return newId; }
    return null;
  }, [debouncedSave, activeLevelIndex]);

  const removeLightSource = useCallback((id: number) => {
    setProject(prev => {
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, lightSources: (m.lightSources ?? []).filter(ls => ls.id !== id),
      }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const clearLightSources = useCallback(() => {
    setProject(prev => {
      if ((prev.levels[activeLevelIndex].lightSources ?? []).length === 0) return prev;
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({ ...m, lightSources: [] }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const setBackgroundImage = useCallback((bg: BackgroundImage) => {
    setProject(prev => {
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({ ...m, backgroundImage: bg }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const clearBackgroundImage = useCallback(() => {
    setProject(prev => {
      if (!prev.levels[activeLevelIndex].backgroundImage) return prev;
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({ ...m, backgroundImage: undefined }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const updateBackgroundImage = useCallback((patch: Partial<BackgroundImage>) => {
    setProject(prev => {
      if (!prev.levels[activeLevelIndex].backgroundImage) return prev;
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m, backgroundImage: { ...m.backgroundImage!, ...patch },
      }));
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  // ── Clipboard ─────────────────────────────────────────────────────────

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
    const bufNotes: MapNote[] = mapNotes
      .filter(n => n.x >= sel.x && n.x < sel.x + sel.w && n.y >= sel.y && n.y < sel.y + sel.h)
      .map(n => ({ ...n, x: n.x - sel.x, y: n.y - sel.y }));
    clipboard = { tiles: bufTiles, notes: bufNotes, width: sel.w, height: sel.h };
  }, [map]);

  const cutSelection = useCallback((sel: { x: number; y: number; w: number; h: number }) => {
    copySelection(sel);
    setProject(prev => {
      pushHistory(prev.levels[activeLevelIndex], activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => {
        const newTiles = m.tiles.map(row => row.map(t => ({ ...t })));
        for (let dy = 0; dy < sel.h; dy++) {
          const ty = sel.y + dy;
          if (ty < 0 || ty >= m.meta.height) continue;
          for (let dx = 0; dx < sel.w; dx++) {
            const tx = sel.x + dx;
            if (tx < 0 || tx >= m.meta.width) continue;
            newTiles[ty][tx] = { type: 'empty' };
          }
        }
        const notesToRemove = new Set(
          m.notes
            .filter(n => n.x >= sel.x && n.x < sel.x + sel.w && n.y >= sel.y && n.y < sel.y + sel.h)
            .map(n => n.id)
        );
        for (let y = 0; y < m.meta.height; y++) {
          for (let x = 0; x < m.meta.width; x++) {
            if (newTiles[y][x].noteId !== undefined && notesToRemove.has(newTiles[y][x].noteId!)) {
              const next = { ...newTiles[y][x] };
              delete next.noteId;
              newTiles[y][x] = next;
            }
          }
        }
        return { ...m, tiles: newTiles, notes: m.notes.filter(n => !notesToRemove.has(n.id)) };
      });
      debouncedSave(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copySelection, debouncedSave, activeLevelIndex]);

  const pasteClipboard = useCallback((ox: number, oy: number) => {
    if (!clipboard) return;
    const buf = clipboard;
    setProject(prev => {
      pushHistory(prev.levels[activeLevelIndex], activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => {
        const newTiles = m.tiles.map(row => row.map(t => ({ ...t })));
        const idOffset = nextIdAfter(m.notes) - 1;
        const idMap = new Map<number, number>();
        for (const n of buf.notes) idMap.set(n.id, n.id + idOffset);
        for (let dy = 0; dy < buf.height; dy++) {
          const ty = oy + dy;
          if (ty < 0 || ty >= m.meta.height) continue;
          for (let dx = 0; dx < buf.width; dx++) {
            const tx = ox + dx;
            if (tx < 0 || tx >= m.meta.width) continue;
            const src = buf.tiles[dy][dx];
            const next: Tile = { type: src.type };
            if (src.theme) next.theme = src.theme;
            if (src.noteId !== undefined) {
              const remapped = idMap.get(src.noteId);
              if (remapped !== undefined) next.noteId = remapped;
            }
            newTiles[ty][tx] = next;
          }
        }
        const remappedNotes: MapNote[] = buf.notes.map(n => ({
          ...n, id: n.id + idOffset, x: n.x + ox, y: n.y + oy,
        }));
        const validNotes = remappedNotes.filter(
          n => n.x >= 0 && n.x < m.meta.width && n.y >= 0 && n.y < m.meta.height
        );
        return { ...m, tiles: newTiles, notes: [...m.notes, ...validNotes] };
      });
      debouncedSave(updated);
      return updated;
    });
    if (buf.notes.length > 0) {
      const highestGen = nextIdAfter(buf.notes) - 1;
      setNextNoteId(prev => prev + highestGen);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  // ── Level management ──────────────────────────────────────────────────

  const switchLevel = useCallback((idx: number) => {
    setProject(prev => {
      if (idx < 0 || idx >= prev.levels.length || idx === activeLevelIndex) return prev;
      const updated = { ...prev, activeLevelIndex: idx };
      debouncedSave(updated);
      return updated;
    });
    setActiveLevelIndex(idx);
    setProject(prev => {
      const level = prev.levels[idx];
      if (level) {
        syncIdsToLevel(level);
        const h = getHistory(idx);
        setCanUndo(h.past.length > 0);
        setCanRedo(h.future.length > 0);
      }
      setSelectedNoteId(null);
      return prev;
    });

  }, [debouncedSave, activeLevelIndex]);

  const addLevel = useCallback((name?: string) => {
    setProject(prev => {
      const idx = prev.levels.length;
      const fresh = createDefaultMap(name ?? `Level ${idx + 1}`);
      const updated: DungeonProject = {
        ...prev, levels: [...prev.levels, fresh], activeLevelIndex: idx,
      };
      debouncedSave(updated);
      setActiveLevelIndex(idx);
      syncIdsToLevel(fresh);
      setCanUndo(false);
      setCanRedo(false);
      setSelectedNoteId(null);
      return updated;
    });

  }, [debouncedSave]);

  const renameLevel = useCallback((idx: number, name: string) => {
    setProject(prev => {
      if (idx < 0 || idx >= prev.levels.length) return prev;
      const newLevels = prev.levels.map((lvl, i) =>
        i === idx ? { ...lvl, meta: { ...lvl.meta, name } } : lvl,
      );
      const updated = { ...prev, levels: newLevels };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const deleteLevel = useCallback((idx: number) => {
    setProject(prev => {
      if (prev.levels.length <= 1 || idx < 0 || idx >= prev.levels.length) return prev;
      const newLevels = prev.levels.filter((_, i) => i !== idx);
      const newLinks = prev.stairLinks
        .filter(l => l.fromLevel !== idx && l.toLevel !== idx)
        .map(l => ({
          ...l,
          fromLevel: l.fromLevel > idx ? l.fromLevel - 1 : l.fromLevel,
          toLevel: l.toLevel > idx ? l.toLevel - 1 : l.toLevel,
        }));
      let newActive = activeLevelIndex;
      if (idx === activeLevelIndex) newActive = Math.min(idx, newLevels.length - 1);
      else if (idx < activeLevelIndex) newActive = activeLevelIndex - 1;
      const newHistoryMap = new Map<number, LevelHistory>();
      for (const [key, val] of historyRef.current.entries()) {
        if (key === idx) continue;
        newHistoryMap.set(key > idx ? key - 1 : key, val);
      }
      historyRef.current = newHistoryMap;
      const updated: DungeonProject = {
        ...prev, levels: newLevels, stairLinks: newLinks, activeLevelIndex: newActive,
      };
      debouncedSave(updated);
      setActiveLevelIndex(newActive);
      syncIdsToLevel(newLevels[newActive]);
      const h = getHistory(newActive);
      setCanUndo(h.past.length > 0);
      setCanRedo(h.future.length > 0);
      setSelectedNoteId(null);
      return updated;
    });

  }, [debouncedSave, activeLevelIndex]);

  const duplicateLevel = useCallback((idx: number) => {
    setProject(prev => {
      if (idx < 0 || idx >= prev.levels.length) return prev;
      const source = prev.levels[idx];
      const copy: DungeonMap = JSON.parse(JSON.stringify(source));
      copy.meta = { ...copy.meta, name: `${source.meta.name} (copy)` };
      const newIdx = idx + 1;
      const newLevels = [...prev.levels.slice(0, newIdx), copy, ...prev.levels.slice(newIdx)];
      const newLinks = prev.stairLinks.map(l => ({
        ...l,
        fromLevel: l.fromLevel >= newIdx ? l.fromLevel + 1 : l.fromLevel,
        toLevel: l.toLevel >= newIdx ? l.toLevel + 1 : l.toLevel,
      }));
      const newHistoryMap = new Map<number, LevelHistory>();
      for (const [key, val] of historyRef.current.entries()) {
        newHistoryMap.set(key >= newIdx ? key + 1 : key, val);
      }
      historyRef.current = newHistoryMap;
      const updated: DungeonProject = {
        ...prev, levels: newLevels, stairLinks: newLinks, activeLevelIndex: newIdx,
      };
      debouncedSave(updated);
      setActiveLevelIndex(newIdx);
      syncIdsToLevel(copy);
      setCanUndo(false);
      setCanRedo(false);
      setSelectedNoteId(null);
      return updated;
    });

  }, [debouncedSave]);

  const reorderLevels = useCallback((fromIdx: number, toIdx: number) => {
    setProject(prev => {
      if (fromIdx === toIdx || fromIdx < 0 || fromIdx >= prev.levels.length) return prev;
      const clamped = Math.max(0, Math.min(prev.levels.length - 1, toIdx));
      if (fromIdx === clamped) return prev;
      const newLevels = [...prev.levels];
      const [moved] = newLevels.splice(fromIdx, 1);
      newLevels.splice(clamped, 0, moved);
      const ordered = [...prev.levels.keys()];
      const reordered = [...ordered];
      const [movedIdx] = reordered.splice(fromIdx, 1);
      reordered.splice(clamped, 0, movedIdx);
      const indexMap = new Map<number, number>();
      for (let i = 0; i < reordered.length; i++) indexMap.set(reordered[i], i);
      const newLinks = prev.stairLinks.map(l => ({
        ...l,
        fromLevel: indexMap.get(l.fromLevel) ?? l.fromLevel,
        toLevel: indexMap.get(l.toLevel) ?? l.toLevel,
      }));
      const newHistoryMap = new Map<number, LevelHistory>();
      for (const [key, val] of historyRef.current.entries()) {
        newHistoryMap.set(indexMap.get(key) ?? key, val);
      }
      historyRef.current = newHistoryMap;
      const newActive = indexMap.get(activeLevelIndex) ?? activeLevelIndex;
      const updated: DungeonProject = {
        ...prev, levels: newLevels, stairLinks: newLinks, activeLevelIndex: newActive,
      };
      debouncedSave(updated);
      setActiveLevelIndex(newActive);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const setProjectName = useCallback((name: string) => {
    setProject(prev => {
      const updated = { ...prev, name };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const addStairLink = useCallback((link: import('../types/map').StairLink) => {
    setProject(prev => {
      const filtered = prev.stairLinks.filter(
        l => !(l.fromLevel === link.fromLevel && l.fromCell.x === link.fromCell.x && l.fromCell.y === link.fromCell.y)
      );
      const updated: DungeonProject = { ...prev, stairLinks: [...filtered, link] };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const removeStairLink = useCallback((fromLevel: number, fromX: number, fromY: number) => {
    setProject(prev => {
      const filtered = prev.stairLinks.filter(
        l => !(
          (l.fromLevel === fromLevel && l.fromCell.x === fromX && l.fromCell.y === fromY) ||
          (l.toLevel === fromLevel && l.toCell.x === fromX && l.toCell.y === fromY)
        )
      );
      const updated: DungeonProject = { ...prev, stairLinks: filtered };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  return {
    map, project, activeLevelIndex,
    selectedNoteId, setSelectedNoteId,
    setTile, fillTiles, setTiles, getTileType,
    setMapName, resizeMap, clearMap, newMap,
    loadMapData, loadProjectData,
    generateMap, applyGeneratedRegion,
    addNote, updateNote, deleteNote,
    setTileSize, setTheme,
    undo, redo, canUndo, canRedo,
    setFogCells, fillAllFog, setFogEnabled,
    setDynamicFogEnabled, setExplored, resetExplored,
    addToken, moveToken, removeToken, updateToken,
    reorderInitiative, clearInitiative,
    addAnnotation, removeAnnotation, clearAnnotations,
    copySelection, cutSelection, pasteClipboard,
    addMarker, removeMarker, clearMarkers,
    setBackgroundImage, clearBackgroundImage, updateBackgroundImage,
    addLightSource, removeLightSource, clearLightSources,
    switchLevel, addLevel, renameLevel, deleteLevel,
    duplicateLevel, reorderLevels, setProjectName,
    addStairLink, removeStairLink,
  };
}
