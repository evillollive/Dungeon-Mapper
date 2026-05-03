import { createContext, useContext } from 'react';
import type { DungeonMap, DungeonProject, CustomThemeDefinition, StampDef } from '../types/map';

export interface MapContextValue {
  map: DungeonMap;
  project: DungeonProject;
  activeLevelIndex: number;
  themeId: string;
  customThemes: readonly CustomThemeDefinition[];
  customStamps: readonly StampDef[];
}

export const MapContext = createContext<MapContextValue | null>(null);

export function useMapContext(): MapContextValue {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMapContext must be used within a MapContext.Provider');
  return ctx;
}
