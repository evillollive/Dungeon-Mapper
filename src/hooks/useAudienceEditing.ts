import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { DungeonMap, DungeonProject } from '../types/map';
import { updateActiveLevel } from './mapStateUtils';
import { deriveRenderableTiles } from '../utils/derivedRenderMap';
import { getSemanticTileType } from '../utils/customThemes';
import { SECRET_APPEARANCE } from '../utils/audienceProjection';

export function useAudienceEditing(
  setProject: Dispatch<SetStateAction<DungeonProject>>,
  save: (project: DungeonProject) => void,
  levelIndex: number,
  pushHistory: (map: DungeonMap, levelIndex: number) => void,
) {
  const commit = useCallback((edit: (map: DungeonMap, project: DungeonProject) => DungeonMap) => {
    setProject(previous => {
      const map = previous.levels[levelIndex];
      const next = edit(map, previous);
      if (next === map) return previous;
      pushHistory(map, levelIndex);
      const updated = updateActiveLevel(previous, levelIndex, () => next);
      save(updated);
      return updated;
    });
  }, [setProject, save, levelIndex, pushHistory]);
  const setPublicName = useCallback((publicName: string) => commit(map =>
    map.meta.publicName === publicName ? map : { ...map, meta: { ...map.meta, publicName } }), [commit]);
  const setSecretDiscovered = useCallback((x: number, y: number, discovered: boolean) => commit((map, project) => {
    if (!Number.isInteger(x) || !Number.isInteger(y) || !map.tiles[y]?.[x]) {
      throw new Error('Choose a secret cell within the current level.');
    }
    const tile = deriveRenderableTiles(map)[y][x];
    if (!SECRET_APPEARANCE[getSemanticTileType(tile.type, project.customThemes ?? [])]) {
      throw new Error('This cell is no longer a secret. Select a secret door or trap.');
    }
    const tiles = map.tiles.slice();
    tiles[y] = tiles[y].slice();
    tiles[y][x] = { ...map.tiles[y][x], discovered,
      discoveredType: map.tiles[y][x].type === tile.type ? undefined : tile.type };
    return { ...map, tiles };
  }), [commit]);
  return { setPublicName, setSecretDiscovered };
}
