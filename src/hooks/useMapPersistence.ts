import { useCallback, useEffect, useRef, useState } from 'react';
import type { DungeonMap, DungeonProject } from '../types/map';
import { loadProject as loadProjectFromStorage, MAX_PROJECT_CHECKPOINTS, RestoreError, saveProject, type CheckpointReason } from '../utils/storage';
import type { LevelHistory } from './mapStateUtils';
import { createDefaultProject, withProjectDefaults } from './mapStateUtils';
import { decodeProject, PROJECT_SCHEMA_VERSION } from '../utils/projectSchema';
import type { SaveCoordinator } from '../utils/saveCoordinator';
import { checkpointCount, recoverLegacyProject } from '../utils/projectRepository';

export function useMapPersistence(
  setProject: React.Dispatch<React.SetStateAction<DungeonProject>>,
  setActiveLevelIndex: React.Dispatch<React.SetStateAction<number>>,
  historyRef: React.MutableRefObject<Map<number, LevelHistory>>,
  setCanUndo: React.Dispatch<React.SetStateAction<boolean>>,
  setCanRedo: React.Dispatch<React.SetStateAction<boolean>>,
  syncIdsToLevel: (level: DungeonMap) => void,
  resetIds: () => void,
  setSelectedNoteId: React.Dispatch<React.SetStateAction<number | null>>,
  coordinator: SaveCoordinator,
) {
  const generation = coordinator.getGeneration();
  const [original, setOriginal] = useState<unknown>();
  const restoreRevision = useRef<string | null | undefined>(undefined);
  const failedProjectId = useRef<string | undefined>(undefined);
  const restoreRef = useRef<ReturnType<typeof loadProjectFromStorage> | null>(null);
  useEffect(() => coordinator.subscribe(() => {
    const id = coordinator.getProjectId();
    if (id && coordinator.getSnapshot().phase === 'saved') {
      const url = new URL(window.location.href);
      url.searchParams.set('project', id);
      window.history.replaceState(null, '', url);
    }
  }), [coordinator]);
  useEffect(() => {
    let cancelled = false;
    restoreRef.current ??= loadProjectFromStorage(new URL(window.location.href).searchParams.get('project') ?? undefined);
    restoreRef.current.then(({ project: loaded, revision, projectId, checkpointCount }) => {
      if (cancelled) return;
      if (loaded !== null) {
        const ready = withProjectDefaults(loaded);
        setProject(ready);
        const idx = ready.activeLevelIndex;
        setActiveLevelIndex(idx);
        syncIdsToLevel(ready.levels[idx]);
      }
      coordinator.initialize(revision, loaded !== null, projectId, checkpointCount);
    }).catch((error: unknown) => {
      if (cancelled) return;
      if (error instanceof RestoreError) {
        setOriginal(() => error.original);
        restoreRevision.current = error.revision;
        failedProjectId.current = error.projectId;
      }
      coordinator.failRestore(error instanceof Error ? error.message : 'Could not restore device storage.', failedProjectId.current);
    });
    return () => { cancelled = true; coordinator.dispose(); };
  }, [coordinator, setActiveLevelIndex, setProject, syncIdsToLevel]);

  const recoverProjectData = useCallback(async (loaded: DungeonProject, reason: true | 'Fog repair' = true) => {
    if (generation !== coordinator.getGeneration()) throw new Error('The project changed after this recovery action started. Open Recovery copies in the intended project.');
    const ready = withProjectDefaults(decodeProject({ schemaVersion: PROJECT_SCHEMA_VERSION, project: loaded }));
    if (coordinator.getSnapshot().phase === 'restore-failed') {
      if (restoreRevision.current === undefined) throw new Error('Retry restoring device storage before importing a recovery file.');
      const id = failedProjectId.current;
      if (id) {
        const count = await checkpointCount(id);
        if (count >= MAX_PROJECT_CHECKPOINTS) throw new Error('Delete a checkpoint in Recovery copies before restoring this project.');
        const revision = await saveProject(ready, restoreRevision.current, reason, id);
        coordinator.initialize(revision, true, id, count + (restoreRevision.current !== null ? 1 : 0));
      } else {
        const migrated = await recoverLegacyProject(ready, restoreRevision.current);
        coordinator.initialize(migrated.revision, true, migrated.projectId, migrated.checkpointCount);
      }
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
  }, [coordinator, generation, setActiveLevelIndex, setProject, syncIdsToLevel, historyRef,
    setCanUndo, setCanRedo, setSelectedNoteId]);

  const prepareReplacement = useCallback((reason: true | CheckpointReason = true) => {
    if (generation !== coordinator.getGeneration()) {
      window.alert('The project changed while this action was pending. Repeat the action in the intended project.');
      return false;
    }
    const { phase } = coordinator.getSnapshot();
    if (phase !== 'saved' && phase !== 'unsaved') {
      window.alert('This action is paused until your current project is saved. Export a backup of your in-memory work before reloading if saving has failed.');
      return false;
    }
    if (reason !== true) {
      try { coordinator.assertCheckpointCapacity(); }
      catch (error) {
        window.alert(error instanceof Error ? error.message : 'Could not retain a checkpoint.');
        return false;
      }
      coordinator.retainReplacement(reason);
    }
    return true;
  }, [coordinator, generation]);

  const loadMapData = useCallback((loaded: DungeonMap) => {
    const proj = withProjectDefaults(decodeProject(loaded));
    if (!prepareReplacement()) return;
    historyRef.current = new Map();
    setCanUndo(false);
    setCanRedo(false);
    setProject(proj);
    setActiveLevelIndex(0);
    coordinator.startProject(proj);
    syncIdsToLevel(proj.levels[0]);
    setSelectedNoteId(null);

  }, [coordinator, prepareReplacement, historyRef, setActiveLevelIndex, setCanRedo,
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
    coordinator.startProject(proj);
    syncIdsToLevel(proj.levels[idx]);
    setSelectedNoteId(null);
    return true;

  }, [coordinator, prepareReplacement, historyRef, setActiveLevelIndex, setCanRedo,
    setCanUndo, setProject, setSelectedNoteId, syncIdsToLevel]);

  const newMap = useCallback(() => {
    if (!prepareReplacement()) return;
    const fresh = createDefaultProject();
    historyRef.current = new Map();
    setCanUndo(false);
    setCanRedo(false);
    setProject(fresh);
    setActiveLevelIndex(0);
    coordinator.startProject(fresh);
    resetIds();
    setSelectedNoteId(null);
  }, [coordinator, prepareReplacement, historyRef, resetIds, setActiveLevelIndex,
    setCanRedo, setCanUndo, setProject, setSelectedNoteId]);

  const switchProject = useCallback(async (id: string) => {
    const loaded = await coordinator.switchProject(id);
    if (!loaded.project) throw new Error('The selected project is missing.');
    const ready = withProjectDefaults(loaded.project);
    historyRef.current = new Map();
    setCanUndo(false);
    setCanRedo(false);
    setProject(ready);
    setActiveLevelIndex(ready.activeLevelIndex);
    syncIdsToLevel(ready.levels[ready.activeLevelIndex]);
    setSelectedNoteId(null);
    setOriginal(undefined);
    failedProjectId.current = undefined;
    restoreRevision.current = undefined;
  }, [coordinator, historyRef, setCanUndo, setCanRedo, setProject, setActiveLevelIndex, syncIdsToLevel, setSelectedNoteId]);

  return { loadMapData, loadProjectData, newMap, original, recoverProjectData, prepareReplacement, switchProject };
}
