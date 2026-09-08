import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { DungeonProject } from '../types/map';
import type { SaveCoordinator } from '../utils/saveCoordinator';

/** Async import callbacks belong to the editor generation that started them. */
export function useProjectDispatch(coordinator: SaveCoordinator, dispatch: Dispatch<SetStateAction<DungeonProject>>) {
  const generation = coordinator.getGeneration();
  const setProject = useCallback<Dispatch<SetStateAction<DungeonProject>>>(action => {
    let warned = false;
    const isCurrent = () => {
      if (generation === coordinator.getGeneration()) return true;
      if (!warned) {
        warned = true;
        window.alert('The project changed while this action was pending. Nothing was applied to the new project. Select the file or repeat the action in the intended project.');
      }
      return false;
    };
    if (!isCurrent()) return;
    dispatch(previous => isCurrent() ? typeof action === 'function' ? action(previous) : action : previous);
  }, [coordinator, dispatch, generation]);
  const debouncedSave = useCallback((project: DungeonProject) => {
    if (generation !== coordinator.getGeneration()) {
      window.alert('This edit belongs to a project that is no longer open. Repeat the action in the intended project.');
      return;
    }
    coordinator.schedule(project);
  }, [coordinator, generation]);
  return { setProject, debouncedSave };
}
