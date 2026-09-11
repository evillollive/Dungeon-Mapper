import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type { DungeonMap, DungeonProject, FloorMaterialId, TileType } from '../types/map';
import { applyTileUpdates, fillFloorMaterial } from '../utils/tileEditing';
import { deriveRenderableTiles } from '../utils/derivedRenderMap';
import { floodFill } from '../utils/mapUtils';
import { updateActiveLevel } from './mapStateUtils';
import { FOLIO_THEME_ID } from '../themes/folio-v1/art';
import { isConnectedFloorGround } from '../utils/floorMaterials';

export function useTileEditing(
  map: DungeonMap,
  setProject: Dispatch<SetStateAction<DungeonProject>>,
  debouncedSave: (project: DungeonProject) => void,
  activeLevelIndex: number,
  pushHistory: (map: DungeonMap, level: number) => void,
) {
  const [chosenMaterial, setActiveFloorMaterial] = useState<FloorMaterialId>();
  const activeFloorMaterial = map.meta.theme === FOLIO_THEME_ID ? chosenMaterial : undefined;

  const setTiles = useCallback((updates: { x: number; y: number; type: TileType }[]) => {
    setProject(prev => {
      const previous = prev.levels[activeLevelIndex];
      const tiles = applyTileUpdates(previous.tiles,
        updates.map(update => ({ ...update, floorMaterial: activeFloorMaterial })),
        previous.meta.width, previous.meta.height);
      if (!tiles) return prev;
      pushHistory(previous, activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, level => ({ ...level, tiles }));
      debouncedSave(updated);
      return updated;
    });
  }, [activeFloorMaterial, setProject, debouncedSave, activeLevelIndex, pushHistory]);

  const setTile = useCallback((x: number, y: number, type: TileType) => {
    setTiles([{ x, y, type }]);
  }, [setTiles]);

  const fillTiles = useCallback((x: number, y: number, fillType: TileType) => {
    setProject(prev => {
      const previous = prev.levels[activeLevelIndex];
      const target = previous.tiles[y]?.[x];
      if (!target) return prev;
      const rendered = previous.meta.theme === FOLIO_THEME_ID && fillType === 'floor'
        ? deriveRenderableTiles(previous) : undefined;
      const renderedTarget = rendered?.[y]?.[x];
      const tiles = rendered && renderedTarget && isConnectedFloorGround(renderedTarget.type)
        ? fillFloorMaterial(previous.tiles, rendered, x, y, activeFloorMaterial)
        : floodFill(previous.tiles, x, y, target.type, fillType, activeFloorMaterial);
      if (!tiles || tiles === previous.tiles) return prev;
      pushHistory(previous, activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, level => ({ ...level, tiles }));
      debouncedSave(updated);
      return updated;
    });
  }, [activeFloorMaterial, setProject, debouncedSave, activeLevelIndex, pushHistory]);

  const getTileType = useCallback((x: number, y: number): TileType | null =>
    map.tiles[y]?.[x]?.type ?? null, [map.tiles]);

  return { setTile, setTiles, fillTiles, getTileType, activeFloorMaterial, setActiveFloorMaterial };
}
