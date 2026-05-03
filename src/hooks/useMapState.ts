import { useState, useCallback, useRef } from 'react';
import type { CustomThemeDefinition, DungeonMap, DungeonProject, MapNote, SceneTemplate, StampDef, Tile, TileType, Token, TokenKind, AnnotationStroke, ShapeMarker, MarkerShape, BackgroundImage, LightSource, PlacedStamp, StampPlacementOptions } from '../types/map';
import { createEmptyGrid, createFogGrid, floodFill, resizeFogGrid } from '../utils/mapUtils';
import { saveProject } from '../utils/storage';
import { reThemeNotes } from '../utils/reThemeNotes';
import { createDefaultProject, nextIdAfter, updateActiveLevel } from './mapStateUtils';
import { useMapHistory } from './useMapHistory';
import { useMapClipboard } from './useMapClipboard';
import { useLevelManagement } from './useLevelManagement';
import { useMapPersistence } from './useMapPersistence';

export { getClipboard } from './useMapClipboard';

export function useMapState() {
  const [project, setProject] = useState<DungeonProject>(createDefaultProject);
  const [activeLevelIndex, setActiveLevelIndex] = useState(0);
  const [nextNoteId, setNextNoteId] = useState(1);
  const nextTokenIdRef = useRef(1);
  const nextStrokeIdRef = useRef(1);
  const nextMarkerIdRef = useRef(1);
  const nextLightIdRef = useRef(1);
  const nextStampIdRef = useRef(1);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const map = project.levels[activeLevelIndex] ?? project.levels[0];

  function syncIdsToLevel(level: DungeonMap) {
    setNextNoteId(nextIdAfter(level.notes));
    nextTokenIdRef.current = nextIdAfter(level.tokens);
    nextStrokeIdRef.current = nextIdAfter(level.annotations);
    nextMarkerIdRef.current = nextIdAfter(level.markers);
    nextLightIdRef.current = nextIdAfter(level.lightSources);
    nextStampIdRef.current = nextIdAfter(level.stamps);
  }

  function resetIds() {
    setNextNoteId(1);
    nextTokenIdRef.current = 1;
    nextStrokeIdRef.current = 1;
    nextLightIdRef.current = 1;
    nextMarkerIdRef.current = 1;
    nextStampIdRef.current = 1;
    setSelectedNoteId(null);
  }

  const debouncedSave = useCallback((proj: DungeonProject) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveProject(proj).catch(() => {});
    }, 500);
  }, []);

  // ── Sub-hooks ─────────────────────────────────────────────────────────

  const history = useMapHistory(setProject, debouncedSave, activeLevelIndex);
  const { pushHistory, undo, redo, canUndo, canRedo } = history;

  const persistence = useMapPersistence(
    setProject, setActiveLevelIndex, debouncedSave,
    history.historyRef, history.setCanUndo, history.setCanRedo,
    syncIdsToLevel, resetIds, setSelectedNoteId,
  );
  const { loadMapData, loadProjectData, newMap } = persistence;

  const clipboardHook = useMapClipboard(
    map, setProject, debouncedSave, activeLevelIndex,
    pushHistory, setNextNoteId,
  );
  const { copySelection, cutSelection, pasteClipboard } = clipboardHook;

  const levelMgmt = useLevelManagement(
    setProject, debouncedSave, activeLevelIndex, setActiveLevelIndex,
    history.historyRef, history.getHistory,
    history.setCanUndo, history.setCanRedo,
    syncIdsToLevel, setSelectedNoteId,
  );
  const {
    switchLevel, addLevel, renameLevel, deleteLevel,
    duplicateLevel, reorderLevels, setProjectName,
    addStairLink, removeStairLink,
  } = levelMgmt;

  // ── Tile operations ───────────────────────────────────────────────────

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
          stamps: (m.stamps ?? []).filter(
            stamp => stamp.x >= 0 && stamp.x < width && stamp.y >= 0 && stamp.y < height,
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
        stamps: [],
      }));
      debouncedSave(updated);
      return updated;
    });
    resetIds();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  const generateMap = useCallback((tiles: Tile[][], width: number, height: number, notes: MapNote[] = [], name?: string) => {
    setProject(prev => {
      pushHistory(prev.levels[activeLevelIndex], activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m,
        meta: { ...m.meta, width, height, ...(name ? { name } : {}) },
        tiles, notes,
        fog: createFogGrid(width, height, true),
        fogEnabled: m.fogEnabled ?? true,
        tokens: [], annotations: [], initiative: [], stamps: [],
      }));
      debouncedSave(updated);
      return updated;
    });
    setNextNoteId(nextIdAfter(notes));
    nextTokenIdRef.current = 1;
    nextStrokeIdRef.current = 1;
    nextStampIdRef.current = 1;
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

  // ── Notes ─────────────────────────────────────────────────────────────

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

  // ── Theme ─────────────────────────────────────────────────────────────

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

  const saveCustomTheme = useCallback((theme: CustomThemeDefinition) => {
    setProject(prev => {
      const existing = prev.customThemes ?? [];
      const updated: DungeonProject = {
        ...prev,
        customThemes: existing.some(t => t.id === theme.id)
          ? existing.map(t => t.id === theme.id ? theme : t)
          : [...existing, theme],
      };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const deleteCustomTheme = useCallback((themeId: string) => {
    setProject(prev => {
      const existing = prev.customThemes ?? [];
      if (!existing.some(t => t.id === themeId)) return prev;
      const updated: DungeonProject = {
        ...prev,
        customThemes: existing.filter(t => t.id !== themeId),
        levels: prev.levels.map(level => (
          level.meta.theme === themeId
            ? { ...level, meta: { ...level.meta, theme: 'dungeon' } }
            : level
        )),
      };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

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

  // ── Annotations ───────────────────────────────────────────────────────

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

  // ── Markers ───────────────────────────────────────────────────────────

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

  // ── Light sources ─────────────────────────────────────────────────────

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

  // ── Stamps ────────────────────────────────────────────────────────────

  const addStamp = useCallback((stampId: string, x: number, y: number, options: StampPlacementOptions = {}): number | null => {
    const trimmedStampId = stampId.trim();
    if (!trimmedStampId) return null;
    const newId = nextStampIdRef.current;
    let placed = false;
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      if (x < 0 || y < 0 || x >= prevMap.meta.width || y >= prevMap.meta.height) return prev;
      pushHistory(prevMap, activeLevelIndex);
      placed = true;
      const stamp: PlacedStamp = {
        id: newId,
        stampId: trimmedStampId,
        x,
        y,
        rotation: options.rotation ?? 0,
        scale: Math.max(0.01, options.scale ?? 1),
        flipX: options.flipX ?? false,
        flipY: options.flipY ?? false,
        opacity: Math.min(1, Math.max(0, options.opacity ?? 1)),
        locked: options.locked ?? false,
      };
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m,
        stamps: [...(m.stamps ?? []), stamp],
      }));
      debouncedSave(updated);
      return updated;
    });
    if (placed) {
      nextStampIdRef.current = newId + 1;
      return newId;
    }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  const moveStamp = useCallback((id: number, x: number, y: number) => {
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      const existing = (prevMap.stamps ?? []).find(stamp => stamp.id === id);
      if (!existing || existing.locked) return prev;
      const cx = Math.min(Math.max(0, x), prevMap.meta.width - 1);
      const cy = Math.min(Math.max(0, y), prevMap.meta.height - 1);
      if (cx === existing.x && cy === existing.y) return prev;
      pushHistory(prevMap, activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m,
        stamps: (m.stamps ?? []).map(stamp => stamp.id === id ? { ...stamp, x: cx, y: cy } : stamp),
      }));
      debouncedSave(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  const removeStamp = useCallback((id: number) => {
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      if (!(prevMap.stamps ?? []).some(stamp => stamp.id === id)) return prev;
      pushHistory(prevMap, activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m,
        stamps: (m.stamps ?? []).filter(stamp => stamp.id !== id),
      }));
      debouncedSave(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  const clearStamps = useCallback(() => {
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      if ((prevMap.stamps ?? []).length === 0) return prev;
      pushHistory(prevMap, activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({ ...m, stamps: [] }));
      debouncedSave(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  /** Update arbitrary properties on a placed stamp. */
  const updateStamp = useCallback((id: number, patch: Partial<Omit<PlacedStamp, 'id' | 'stampId'>>) => {
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      const existing = (prevMap.stamps ?? []).find(s => s.id === id);
      if (!existing) return prev;
      pushHistory(prevMap, activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({
        ...m,
        stamps: (m.stamps ?? []).map(s => s.id === id ? { ...s, ...patch } : s),
      }));
      debouncedSave(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  /** Move stamp to front (end of array = rendered last = visually on top). */
  const bringStampToFront = useCallback((id: number) => {
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      const stamps = prevMap.stamps ?? [];
      const idx = stamps.findIndex(s => s.id === id);
      if (idx < 0 || idx === stamps.length - 1) return prev;
      pushHistory(prevMap, activeLevelIndex);
      const reordered = [...stamps.filter(s => s.id !== id), stamps[idx]];
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({ ...m, stamps: reordered }));
      debouncedSave(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  /** Move stamp to back (start of array = rendered first = visually behind). */
  const sendStampToBack = useCallback((id: number) => {
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      const stamps = prevMap.stamps ?? [];
      const idx = stamps.findIndex(s => s.id === id);
      if (idx <= 0) return prev;
      pushHistory(prevMap, activeLevelIndex);
      const reordered = [stamps[idx], ...stamps.filter(s => s.id !== id)];
      const updated = updateActiveLevel(prev, activeLevelIndex, m => ({ ...m, stamps: reordered }));
      debouncedSave(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  // ── Background image ──────────────────────────────────────────────────

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

  // ── Custom stamps ─────────────────────────────────────────────────────

  const saveCustomStamp = useCallback((stamp: StampDef) => {
    setProject(prev => {
      const existing = prev.customStamps ?? [];
      const idx = existing.findIndex(s => s.id === stamp.id);
      const updated: DungeonProject = {
        ...prev,
        customStamps: idx >= 0
          ? existing.map(s => s.id === stamp.id ? stamp : s)
          : [...existing, stamp],
      };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const deleteCustomStamp = useCallback((stampId: string) => {
    setProject(prev => {
      const existing = prev.customStamps ?? [];
      if (!existing.some(s => s.id === stampId)) return prev;
      const updated: DungeonProject = {
        ...prev,
        customStamps: existing.filter(s => s.id !== stampId),
      };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  // ── Scene templates ───────────────────────────────────────────────────

  const saveSceneTemplate = useCallback((name: string, sel: { x: number; y: number; w: number; h: number }) => {
    const { tiles: mapTiles, notes: mapNotes, stamps: mapStamps, meta } = map;
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
    const bufNotes = mapNotes
      .filter(n => n.x >= sel.x && n.x < sel.x + sel.w && n.y >= sel.y && n.y < sel.y + sel.h)
      .map(n => ({ ...n, x: n.x - sel.x, y: n.y - sel.y }));
    const bufStamps = (mapStamps ?? [])
      .filter(s => s.x >= sel.x && s.x < sel.x + sel.w && s.y >= sel.y && s.y < sel.y + sel.h)
      .map(s => ({ ...s, x: s.x - sel.x, y: s.y - sel.y }));

    const template: SceneTemplate = {
      id: `template-${Date.now()}`,
      name,
      tiles: bufTiles,
      notes: bufNotes,
      stamps: bufStamps,
      width: sel.w,
      height: sel.h,
      createdAt: new Date().toISOString(),
    };

    setProject(prev => {
      const existing = prev.sceneTemplates ?? [];
      const updated: DungeonProject = {
        ...prev,
        sceneTemplates: [...existing, template],
      };
      debouncedSave(updated);
      return updated;
    });
  }, [map, debouncedSave]);

  const deleteSceneTemplate = useCallback((templateId: string) => {
    setProject(prev => {
      const existing = prev.sceneTemplates ?? [];
      if (!existing.some(t => t.id === templateId)) return prev;
      const updated: DungeonProject = {
        ...prev,
        sceneTemplates: existing.filter(t => t.id !== templateId),
      };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const renameSceneTemplate = useCallback((templateId: string, newName: string) => {
    setProject(prev => {
      const existing = prev.sceneTemplates ?? [];
      const updated: DungeonProject = {
        ...prev,
        sceneTemplates: existing.map(t => t.id === templateId ? { ...t, name: newName } : t),
      };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const applySceneTemplate = useCallback((templateId: string, ox: number, oy: number) => {
    setProject(prev => {
      const templates = prev.sceneTemplates ?? [];
      const template = templates.find(t => t.id === templateId);
      if (!template) return prev;

      pushHistory(prev.levels[activeLevelIndex], activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => {
        const newTiles = m.tiles.map(row => row.map(t => ({ ...t })));
        const noteIdOffset = nextIdAfter(m.notes) - 1;
        const noteIdMap = new Map<number, number>();
        for (const n of template.notes) noteIdMap.set(n.id, n.id + noteIdOffset);

        for (let dy = 0; dy < template.height; dy++) {
          const ty = oy + dy;
          if (ty < 0 || ty >= m.meta.height) continue;
          for (let dx = 0; dx < template.width; dx++) {
            const tx = ox + dx;
            if (tx < 0 || tx >= m.meta.width) continue;
            const src = template.tiles[dy][dx];
            const next: Tile = { type: src.type };
            if (src.theme) next.theme = src.theme;
            if (src.noteId !== undefined) {
              const remapped = noteIdMap.get(src.noteId);
              if (remapped !== undefined) next.noteId = remapped;
            }
            newTiles[ty][tx] = next;
          }
        }

        const remappedNotes = template.notes.map(n => ({
          ...n, id: n.id + noteIdOffset, x: n.x + ox, y: n.y + oy,
        }));
        const validNotes = remappedNotes.filter(
          n => n.x >= 0 && n.x < m.meta.width && n.y >= 0 && n.y < m.meta.height
        );

        const stampIdOffset = nextIdAfter(m.stamps) - 1;
        const remappedStamps = template.stamps.map(s => ({
          ...s, id: s.id + stampIdOffset, x: s.x + ox, y: s.y + oy,
        }));
        const validStamps = remappedStamps.filter(
          s => s.x >= 0 && s.x < m.meta.width && s.y >= 0 && s.y < m.meta.height
        );

        return {
          ...m,
          tiles: newTiles,
          notes: [...m.notes, ...validNotes],
          stamps: [...(m.stamps ?? []), ...validStamps],
        };
      });
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex, pushHistory]);

  return {
    map, project, activeLevelIndex,
    selectedNoteId, setSelectedNoteId,
    setTile, fillTiles, setTiles, getTileType,
    setMapName, resizeMap, clearMap, newMap,
    loadMapData, loadProjectData,
    generateMap, applyGeneratedRegion,
    addNote, updateNote, deleteNote,
    setTileSize, setTheme, saveCustomTheme, deleteCustomTheme,
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
    addStamp, moveStamp, removeStamp, clearStamps, updateStamp, bringStampToFront, sendStampToBack,
    saveCustomStamp, deleteCustomStamp,
    saveSceneTemplate, deleteSceneTemplate, renameSceneTemplate, applySceneTemplate,
    switchLevel, addLevel, renameLevel, deleteLevel,
    duplicateLevel, reorderLevels, setProjectName,
    addStairLink, removeStairLink,
  };
}
