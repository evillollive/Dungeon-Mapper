import type { DungeonMap, DungeonProject, MapNote, PlacedStamp, Tile } from '../types/map';
import { createEmptyGrid, createFogGrid } from '../utils/mapUtils';

export const DEFAULT_WIDTH = 32;
export const DEFAULT_HEIGHT = 32;
export const DEFAULT_TILE_SIZE = 20;
export const MAX_HISTORY_SIZE = 50;

export interface HistorySnapshot {
  tiles: Tile[][];
  fog: boolean[][];
  notes: MapNote[];
  stamps: PlacedStamp[];
  width: number;
  height: number;
}

export interface LevelHistory {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
}

export interface ClipboardBuffer {
  tiles: Tile[][];
  notes: MapNote[];
  stamps: PlacedStamp[];
  width: number;
  height: number;
}

export function createDefaultMap(name = 'Level 1'): DungeonMap {
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
    stamps: [],
  };
}

export function createDefaultProject(): DungeonProject {
  return {
    name: 'New Dungeon',
    levels: [createDefaultMap()],
    activeLevelIndex: 0,
    stairLinks: [],
    customThemes: [],
    customStamps: [],
    sceneTemplates: [],
  };
}

export function withDefaults(map: DungeonMap): DungeonMap {
  return {
    ...map,
    fog: map.fog ?? createFogGrid(map.meta.width, map.meta.height, true),
    fogEnabled: map.fogEnabled ?? true,
    tokens: map.tokens ?? [],
    annotations: map.annotations ?? [],
    markers: map.markers ?? [],
    initiative: map.initiative ?? [],
    lightSources: map.lightSources ?? [],
    stamps: map.stamps ?? [],
  };
}

export function withProjectDefaults(project: DungeonProject): DungeonProject {
  return {
    ...project,
    levels: project.levels.map(withDefaults),
    stairLinks: project.stairLinks ?? [],
    customThemes: project.customThemes ?? [],
    customStamps: project.customStamps ?? [],
    sceneTemplates: project.sceneTemplates ?? [],
  };
}

export function nextIdAfter(items: { id: number }[] | undefined): number {
  if (!items || items.length === 0) return 1;
  return Math.max(...items.map(i => i.id)) + 1;
}

export function updateActiveLevel(
  proj: DungeonProject,
  levelIdx: number,
  updater: (prev: DungeonMap) => DungeonMap,
): DungeonProject {
  const newLevels = proj.levels.map((lvl, i) =>
    i === levelIdx ? updater(lvl) : lvl,
  );
  return { ...proj, levels: newLevels, activeLevelIndex: levelIdx };
}
