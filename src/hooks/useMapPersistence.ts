import { useCallback, useEffect } from 'react';
import type { DungeonMap, DungeonProject } from '../types/map';
import { loadProject as loadProjectFromStorage, migrateFromLocalStorage } from '../utils/storage';
import { wrapMapAsProject } from '../utils/storage';
import type { LevelHistory } from './mapStateUtils';
import { createDefaultProject, withDefaults, withProjectDefaults } from './mapStateUtils';

export function useMapPersistence(
  setProject: React.Dispatch<React.SetStateAction<DungeonProject>>,
  setActiveLevelIndex: React.Dispatch<React.SetStateAction<number>>,
  debouncedSave: (proj: DungeonProject) => void,
  historyRef: React.MutableRefObject<Map<number, LevelHistory>>,
  setCanUndo: React.Dispatch<React.SetStateAction<boolean>>,
  setCanRedo: React.Dispatch<React.SetStateAction<boolean>>,
  syncIdsToLevel: (level: DungeonMap) => void,
  resetIds: () => void,
  setSelectedNoteId: React.Dispatch<React.SetStateAction<number | null>>,
) {
  useEffect(() => {
    migrateFromLocalStorage().catch(() => {});
    loadProjectFromStorage().then(loaded => {
      if (loaded) {
        const ready = withProjectDefaults(loaded);
        setProject(ready);
        const idx = Math.min(ready.activeLevelIndex, ready.levels.length - 1);
        setActiveLevelIndex(idx);
        syncIdsToLevel(ready.levels[idx]);
      }
    }).catch(() => {});

  }, []);

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

  const newMap = useCallback(() => {
    const fresh = createDefaultProject();
    historyRef.current = new Map();
    setCanUndo(false);
    setCanRedo(false);
    setProject(fresh);
    setActiveLevelIndex(0);
    debouncedSave(fresh);
    resetIds();
    setSelectedNoteId(null);
  }, [debouncedSave]);

  return { loadMapData, loadProjectData, newMap };
}
