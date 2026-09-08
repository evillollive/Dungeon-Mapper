import { useCallback, useEffect, useRef, useState } from 'react';
import type { DungeonMap, DungeonProject } from '../types/map';
import { loadProject as loadProjectFromStorage, RestoreError, saveProject, type CheckpointReason } from '../utils/storage';
import type { LevelHistory } from './mapStateUtils';
import { createDefaultProject, withProjectDefaults } from './mapStateUtils';
import { decodeProject, PROJECT_SCHEMA_VERSION } from '../utils/projectSchema';
import type { SaveCoordinator } from '../utils/saveCoordinator';

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
  coordinator: SaveCoordinator,
) {
  const [original, setOriginal] = useState<unknown>();
  const restoreRevision = useRef<string | null | undefined>(undefined);
  const restoreRef = useRef<ReturnType<typeof loadProjectFromStorage> | null>(null);
  useEffect(() => {
    let cancelled = false;
    restoreRef.current ??= loadProjectFromStorage();
    restoreRef.current.then(({ project: loaded, revision }) => {
      if (cancelled) return;
      if (loaded !== null) {
        const ready = withProjectDefaults(loaded);
        setProject(ready);
        const idx = ready.activeLevelIndex;
        setActiveLevelIndex(idx);
        syncIdsToLevel(ready.levels[idx]);
      }
      coordinator.initialize(revision, loaded !== null);
    }).catch((error: unknown) => {
      if (cancelled) return;
      if (error instanceof RestoreError) {
        setOriginal(() => error.original);
        restoreRevision.current = error.revision;
      }
      coordinator.failRestore(error instanceof Error ? error.message : 'Could not restore device storage.');
    });
    return () => { cancelled = true; coordinator.dispose(); };
  }, [coordinator, setActiveLevelIndex, setProject, syncIdsToLevel]);

  const recoverProjectData = useCallback(async (loaded: DungeonProject, reason: true | 'Fog repair' = true) => {
    const ready = withProjectDefaults(decodeProject({ schemaVersion: PROJECT_SCHEMA_VERSION, project: loaded }));
    if (coordinator.getSnapshot().phase === 'restore-failed') {
      if (restoreRevision.current === undefined) throw new Error('Retry restoring device storage before importing a recovery file.');
      const revision = await saveProject(ready, restoreRevision.current, reason);
      coordinator.initialize(revision, true);
    } else {
      await coordinator.replace(ready, reason);
    }
    historyRef.current = new Map();
    setCanUndo(false);
    setCanRedo(false);
    setProject(ready);
    setActiveLevelIndex(ready.activeLevelIndex);
    syncIdsToLevel(ready.levels[ready.activeLevelIndex]);
    setSelectedNoteId(null);
    setOriginal(undefined);
  }, [coordinator, setActiveLevelIndex, setProject, syncIdsToLevel, historyRef,
    setCanUndo, setCanRedo, setSelectedNoteId]);

  const prepareReplacement = useCallback((reason: true | CheckpointReason = true) => {
    const { phase } = coordinator.getSnapshot();
    if (phase !== 'saved' && phase !== 'unsaved') {
      window.alert('This action is paused until your current project is saved. Export a backup of your in-memory work before reloading if saving has failed.');
      return false;
    }
    coordinator.retainReplacement(reason);
    return true;
  }, [coordinator]);

  const loadMapData = useCallback((loaded: DungeonMap) => {
    const proj = withProjectDefaults(decodeProject(loaded));
    if (!prepareReplacement()) return;
    historyRef.current = new Map();
    setCanUndo(false);
    setCanRedo(false);
    setProject(proj);
    setActiveLevelIndex(0);
    debouncedSave(proj);
    syncIdsToLevel(proj.levels[0]);
    setSelectedNoteId(null);

  }, [debouncedSave, prepareReplacement, historyRef, setActiveLevelIndex, setCanRedo,
    setCanUndo, setProject, setSelectedNoteId, syncIdsToLevel]);

  const loadProjectData = useCallback((loaded: DungeonProject, reason: true | CheckpointReason = true) => {
    const proj = withProjectDefaults(decodeProject({ schemaVersion: PROJECT_SCHEMA_VERSION, project: loaded }));
    if (!prepareReplacement(reason)) return false;
    historyRef.current = new Map();
    setCanUndo(false);
    setCanRedo(false);
    const idx = Math.min(proj.activeLevelIndex, proj.levels.length - 1);
    setProject(proj);
    setActiveLevelIndex(idx);
    debouncedSave(proj);
    syncIdsToLevel(proj.levels[idx]);
    setSelectedNoteId(null);
    return true;

  }, [debouncedSave, prepareReplacement, historyRef, setActiveLevelIndex, setCanRedo,
    setCanUndo, setProject, setSelectedNoteId, syncIdsToLevel]);

  const newMap = useCallback(() => {
    if (!prepareReplacement()) return;
    const fresh = createDefaultProject();
    historyRef.current = new Map();
    setCanUndo(false);
    setCanRedo(false);
    setProject(fresh);
    setActiveLevelIndex(0);
    debouncedSave(fresh);
    resetIds();
    setSelectedNoteId(null);
  }, [debouncedSave, prepareReplacement, historyRef, resetIds, setActiveLevelIndex,
    setCanRedo, setCanUndo, setProject, setSelectedNoteId]);

  return { loadMapData, loadProjectData, newMap, original, recoverProjectData, prepareReplacement };
}
