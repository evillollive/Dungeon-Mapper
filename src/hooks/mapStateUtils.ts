import type {
  AnnotationStroke,
  BackgroundImage,
  DungeonMap,
  DungeonProject,
  EdgeBlendSettings,
  HandDrawnSettings,
  LightSource,
  LightingAtmosphereSettings,
  MapMeta,
  MapNote,
  PaperTextureSettings,
  PathSegment,
  PlacedStamp,
  River,
  RoomShape,
  ShapeMarker,
  Tile,
  Token,
  WallSegment,
  ArtStylePresetId,
} from '../types/map';
import { createEmptyGrid, createFogGrid, resizeFogGrid } from '../utils/mapUtils';

export const DEFAULT_WIDTH = 32;
export const DEFAULT_HEIGHT = 32;
export const DEFAULT_TILE_SIZE = 20;
export const MAX_HISTORY_SIZE = 50;

export interface HistorySnapshot {
  /** Full meta snapshot so undo/redo restores dimensions plus name/theme. */
  meta: MapMeta;
  tiles: Tile[][];
  fog: boolean[][];
  fogEnabled: boolean;
  dynamicFogEnabled?: boolean;
  explored?: boolean[][];
  notes: MapNote[];
  tokens: Token[];
  annotations: AnnotationStroke[];
  markers: ShapeMarker[];
  initiative: number[];
  lightSources: LightSource[];
  stamps: PlacedStamp[];
  wallSegments: WallSegment[];
  pathSegments: PathSegment[];
  rivers: River[];
  roomShapes: RoomShape[];
  backgroundImage?: BackgroundImage;
  paperTexture?: PaperTextureSettings;
  edgeBlend?: EdgeBlendSettings;
  handDrawn?: HandDrawnSettings;
  lightingAtmosphere?: LightingAtmosphereSettings;
  artStylePreset?: ArtStylePresetId;
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
    wallSegments: [],
    pathSegments: [],
    rivers: [],
    roomShapes: [],
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
    wallSegments: map.wallSegments ?? [],
    pathSegments: map.pathSegments ?? [],
    rivers: map.rivers ?? [],
    roomShapes: map.roomShapes ?? [],
  };
}

export function createHistorySnapshot(map: DungeonMap): HistorySnapshot {
  return {
    meta: { ...map.meta },
    tiles: map.tiles,
    fog: map.fog ?? createFogGrid(map.meta.width, map.meta.height, false),
    fogEnabled: map.fogEnabled ?? true,
    dynamicFogEnabled: map.dynamicFogEnabled,
    explored: map.explored,
    notes: map.notes,
    tokens: map.tokens ?? [],
    annotations: map.annotations ?? [],
    markers: map.markers ?? [],
    initiative: map.initiative ?? [],
    lightSources: map.lightSources ?? [],
    stamps: map.stamps ?? [],
    wallSegments: map.wallSegments ?? [],
    pathSegments: map.pathSegments ?? [],
    rivers: map.rivers ?? [],
    roomShapes: map.roomShapes ?? [],
    backgroundImage: map.backgroundImage,
    paperTexture: map.paperTexture,
    edgeBlend: map.edgeBlend,
    handDrawn: map.handDrawn,
    lightingAtmosphere: map.lightingAtmosphere,
    artStylePreset: map.artStylePreset,
  };
}

export function restoreHistorySnapshot(map: DungeonMap, snap: HistorySnapshot): DungeonMap {
  return {
    ...map,
    meta: snap.meta,
    tiles: snap.tiles,
    fog: snap.fog,
    fogEnabled: snap.fogEnabled,
    dynamicFogEnabled: snap.dynamicFogEnabled,
    explored: snap.explored,
    notes: snap.notes,
    tokens: snap.tokens,
    annotations: snap.annotations,
    markers: snap.markers,
    initiative: snap.initiative,
    lightSources: snap.lightSources,
    stamps: snap.stamps,
    wallSegments: snap.wallSegments,
    pathSegments: snap.pathSegments,
    rivers: snap.rivers,
    roomShapes: snap.roomShapes,
    backgroundImage: snap.backgroundImage,
    paperTexture: snap.paperTexture,
    edgeBlend: snap.edgeBlend,
    handDrawn: snap.handDrawn,
    lightingAtmosphere: snap.lightingAtmosphere,
    artStylePreset: snap.artStylePreset,
  };
}

export function resizeMapContent(map: DungeonMap, width: number, height: number): DungeonMap {
  const tiles: Tile[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x): Tile => map.tiles[y]?.[x] ?? { type: 'empty' })
  );
  const tokens = (map.tokens ?? []).filter(token => {
    const size = Math.max(1, Math.floor(token.size ?? 1));
    return token.x >= 0 && token.y >= 0 && token.x + size <= width && token.y + size <= height;
  });
  return {
    ...map,
    meta: { ...map.meta, width, height },
    tiles,
    fog: resizeFogGrid(map.fog, width, height, true),
    explored: map.explored ? resizeFogGrid(map.explored, width, height, false) : undefined,
    tokens,
    initiative: (map.initiative ?? []).filter(id => tokens.some(token => token.id === id)),
    lightSources: (map.lightSources ?? []).filter(
      light => light.x >= 0 && light.x < width && light.y >= 0 && light.y < height,
    ),
    stamps: (map.stamps ?? []).filter(
      stamp => stamp.x >= 0 && stamp.x < width && stamp.y >= 0 && stamp.y < height,
    ),
  };
}

export function clearVisibleMapContent(map: DungeonMap): DungeonMap {
  const { width, height } = map.meta;
  return {
    ...map,
    tiles: createEmptyGrid(width, height),
    notes: [],
    fog: createFogGrid(width, height, true),
    explored: undefined,
    dynamicFogEnabled: false,
    tokens: [],
    annotations: [],
    initiative: [],
    lightSources: [],
    markers: [],
    stamps: [],
    wallSegments: [],
    pathSegments: [],
    rivers: [],
    roomShapes: [],
    backgroundImage: undefined,
  };
}

export function replaceGeneratedMapContent(
  map: DungeonMap,
  tiles: Tile[][],
  width: number,
  height: number,
  notes: MapNote[] = [],
  name?: string,
  roomShapes: RoomShape[] = [],
  rivers: River[] = [],
): DungeonMap {
  return {
    ...map,
    meta: { ...map.meta, width, height, ...(name ? { name } : {}) },
    tiles,
    notes,
    roomShapes,
    fog: createFogGrid(width, height, true),
    fogEnabled: map.fogEnabled ?? true,
    explored: undefined,
    dynamicFogEnabled: false,
    tokens: [],
    annotations: [],
    initiative: [],
    stamps: [],
    markers: [],
    lightSources: [],
    wallSegments: [],
    pathSegments: [],
    rivers,
    backgroundImage: undefined,
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
