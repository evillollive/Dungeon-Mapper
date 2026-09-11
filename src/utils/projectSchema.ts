import type { DungeonProject } from '../types/map';
import { BUILT_IN_TILE_TYPES } from '../types/map';

export const PROJECT_SCHEMA_VERSION = 1;

type RecordValue = Record<string, unknown>;
type Validator = (value: unknown, path: string) => void;

function invalid(path: string, expected: string): never {
  throw new Error(`Invalid project at ${path}: expected ${expected}. Keep the original file and correct this field before importing.`);
}

function record(value: unknown, path: string): RecordValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalid(path, 'an object');
  }
  return value as RecordValue;
}

const text: Validator = (value, path) => {
  if (typeof value !== 'string') invalid(path, 'a string');
};
const boolean: Validator = (value, path) => {
  if (typeof value !== 'boolean') invalid(path, 'a boolean');
};
const finite: Validator = (value, path) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) invalid(path, 'a finite number');
};

function number(min: number, max = Number.MAX_VALUE, integer = false): Validator {
  return (value, path) => {
    finite(value, path);
    if ((value as number) < min || (value as number) > max ||
        (integer && !Number.isSafeInteger(value))) {
      invalid(path, `${integer ? 'a safe integer' : 'a number'} between ${min} and ${max}`);
    }
  };
}

const integer = number(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, true);
const dimension = number(1, Number.MAX_SAFE_INTEGER, true);
const id = number(0, Number.MAX_SAFE_INTEGER - 1, true);
const positive: Validator = (value, path) => {
  finite(value, path);
  if ((value as number) <= 0) invalid(path, 'a positive number');
};
const unit = number(0, 1);

function oneOf(values: readonly string[]): Validator {
  return (value, path) => {
    if (typeof value !== 'string' || !values.includes(value)) {
      invalid(path, `one of ${values.join(', ')}`);
    }
  };
}

function prefix(start: string): Validator {
  return (value, path) => {
    text(value, path);
    if (!(value as string).startsWith(start)) invalid(path, `a string starting with "${start}"`);
  };
}

function array(item: Validator): Validator {
  return (value, path) => {
    if (!Array.isArray(value)) invalid(path, 'an array');
    for (let i = 0; i < value.length; i++) item(value[i], `${path}[${i}]`);
  };
}

function fields(required: Record<string, Validator>, optional: Record<string, Validator> = {}): Validator {
  return (value, path) => {
    const obj = record(value, path);
    for (const [key, check] of Object.entries(required)) check(obj[key], `${path}.${key}`);
    for (const [key, check] of Object.entries(optional)) {
      if (obj[key] !== undefined) check(obj[key], `${path}.${key}`);
    }
  };
}

const point = fields({ x: finite, y: finite });
const cell = fields({ x: integer, y: integer });
const builtin = oneOf(BUILT_IN_TILE_TYPES);
const tileType: Validator = (value, path) => {
  if (typeof value === 'string' && value.startsWith('custom:')) return;
  builtin(value, path);
};
const riverType = oneOf(['water', 'lava', 'underground-stream']);
const endpoint = oneOf(['spring', 'waterfall', 'cave', 'delta', 'lava-vent', 'outflow']);
const edge = oneOf(['n', 's', 'e', 'w']);
const tile = fields({ type: tileType }, {
  floorMaterial: text,
  discovered: boolean, discoveredType: tileType,
  noteId: id, theme: text, flowDirection: finite, riverId: id, riverType,
  riverBank: oneOf(['sand', 'dirt', 'rock', 'stone', 'scorched']),
  riverBankRiverId: id, riverBankType: riverType,
});
const note = fields({ id, x: integer, y: integer, label: text, description: text }, {
  published: boolean, publicLabel: text, publicDescription: text,
  kind: oneOf(['room', 'poi']),
});
const stamp = fields({
  id, stampId: text, x: finite, y: finite, rotation: finite, scale: positive,
  flipX: boolean, flipY: boolean, opacity: unit, locked: boolean,
}, { hidden: boolean });
const token = fields({
  id, x: integer, y: integer, kind: oneOf(['player', 'npc', 'monster']), label: text,
}, { color: text, icon: text, size: dimension, hidden: boolean, hideFromInitiative: boolean });
const strokeFields = { id, points: array(point), color: text };
const river = fields({
  id, controlPoints: array(point), width: positive, flowDirection: finite, type: riverType,
}, { color: text, sourceMarker: endpoint, mouthMarker: endpoint, parentRiverId: id, tributaryIds: array(id) });

const room: Validator = (value, path) => {
  fields({ id, x: integer, y: integer, width: dimension, height: dimension }, {
    shapeType: oneOf(['rect', 'circle', 'polygon']), mode: oneOf(['additive', 'subtractive']),
    vertices: array(point), fillTile: tileType, wallTile: tileType,
    doorHints: array(fields({ edge, offset: number(0, Number.MAX_SAFE_INTEGER, true) }, { type: tileType })),
    edgeMergeOverrides: array(fields({ edge, mode: oneOf(['auto', 'wall', 'door', 'arch']) })),
  })(value, path);
  const obj = record(value, path);
  if (obj.shapeType === 'polygon' && (!Array.isArray(obj.vertices) || obj.vertices.length < 3)) {
    invalid(`${path}.vertices`, 'at least three polygon vertices');
  }
  // Resize and room edits retain geometry and door hints outside the current
  // grid or room boundary. Validate their structure, not their visibility.
};

function grid(value: unknown, path: string, width: number, height: number, item: Validator): void {
  if (!Array.isArray(value) || value.length !== height) invalid(path, `${height} rows matching height`);
  for (let y = 0; y < value.length; y++) {
    const row = value[y];
    if (!Array.isArray(row) || row.length !== width) invalid(`${path}[${y}]`, `${width} cells matching width`);
    for (let x = 0; x < row.length; x++) item(row[x], `${path}[${y}][${x}]`);
  }
}

const map: Validator = (value, path) => {
  fields({
    meta: fields({ name: text, width: dimension, height: dimension, tileSize: positive }, { theme: text, publicName: text }),
    notes: array(note),
  }, {
    fogEnabled: boolean, dynamicFogEnabled: boolean,
    tokens: array(token), annotations: array(fields({ ...strokeFields, kind: oneOf(['player', 'gm']), width: positive })),
    markers: array(fields({ id, x: integer, y: integer, shape: oneOf(['circle', 'square', 'diamond']), color: text, size: dimension })),
    initiative: array(id),
    lightSources: array(fields({ id, x: integer, y: integer, radius: number(0), color: text, label: text })),
    stamps: array(stamp),
    wallSegments: array(fields({ ...strokeFields, thickness: positive })),
    pathSegments: array(fields({ ...strokeFields, width: positive })),
    rivers: array(river), roomShapes: array(room),
    backgroundImage: fields({ dataUrl: text, offsetX: finite, offsetY: finite, scale: positive, opacity: unit }),
    paperTexture: fields({
      enabled: boolean, pattern: oneOf(['parchment', 'linen', 'canvas', 'watercolor', 'marble']),
      opacity: unit, grain: unit, vignette: unit,
    }, { tintOverride: text }),
    edgeBlend: fields({ enabled: boolean, style: oneOf(['dither', 'smooth', 'stipple']), intensity: unit, opacity: unit }),
    handDrawn: fields({ enabled: boolean, style: oneOf(['sketchy', 'pencil', 'ink']), wobble: unit, crossHatch: unit, opacity: unit }),
    lightingAtmosphere: fields({
      enabled: boolean, aoIntensity: unit, aoRadius: unit, stampShadowOpacity: unit, stampShadowOffset: unit,
      colorGrading: oneOf(['day', 'night', 'dusk', 'none']), colorGradingIntensity: unit, opacity: unit,
    }),
    artStylePreset: oneOf(['classic', 'hand-drawn', 'painted', 'minimal', 'print', 'custom']),
  })(value, path);
  const obj = record(value, path);
  const meta = record(obj.meta, `${path}.meta`);
  const width = meta.width as number;
  const height = meta.height as number;
  grid(obj.tiles, `${path}.tiles`, width, height, tile);
  for (const key of ['fog', 'explored']) {
    if (obj[key] !== undefined) grid(obj[key], `${path}.${key}`, width, height, boolean);
  }
  // The editor accepts token footprints larger than the three toolbar presets,
  // provided the complete footprint fits inside the grid.
  (obj.tokens as RecordValue[] | undefined)?.forEach((entry, i) => {
    const size = (entry.size as number | undefined) ?? 1;
    if ((entry.x as number) < 0 || (entry.y as number) < 0 ||
        (entry.x as number) + size > width || (entry.y as number) + size > height) {
      invalid(`${path}.tokens[${i}]`, 'a token footprint inside the map dimensions');
    }
  });
};

const stringRecord: Validator = (value, path) => {
  for (const [key, entry] of Object.entries(record(value, path))) text(entry, `${path}.${key}`);
};
const customTheme = fields({
  id: prefix('custom-theme:'), name: text, baseThemeId: text, gridColor: text,
  tileColors: stringRecord, tileLabels: stringRecord,
  customTiles: array(fields({ id: prefix('custom:'), label: text, color: text, baseType: builtin }, { imageDataUrl: text })),
});
const stampDefinition = fields({
  id: text, name: text, category: oneOf(['furniture', 'dungeon-dressing', 'nature', 'structures', 'markers', 'custom']),
  viewBox: text,
}, {
  themeId: text, svgPath: text, imageDataUrl: text,
  paths: array(fields({ path: text }, { fill: text, stroke: text, strokeWidth: number(0) })),
});
const template: Validator = (value, path) => {
  fields({
    id: text, name: text, width: dimension, height: dimension, createdAt: text,
    notes: array(note), stamps: array(stamp),
  })(value, path);
  const obj = record(value, path);
  grid(obj.tiles, `${path}.tiles`, obj.width as number, obj.height as number, tile);
};

function validateProject(value: RecordValue): asserts value is RecordValue & DungeonProject {
  fields({
    name: text, levels: array(map), activeLevelIndex: number(0, Number.MAX_SAFE_INTEGER, true),
    stairLinks: array(fields({
      fromLevel: number(0, Number.MAX_SAFE_INTEGER, true), fromCell: cell,
      toLevel: number(0, Number.MAX_SAFE_INTEGER, true), toCell: cell,
    })),
  }, {
    customThemes: array(customTheme), customStamps: array(stampDefinition), sceneTemplates: array(template),
  })(value, 'project');
  const levels = value.levels as unknown[];
  if (levels.length === 0) invalid('project.levels', 'at least one level');
  if ((value.activeLevelIndex as number) >= levels.length) invalid('project.activeLevelIndex', 'an index of an existing level');
  (value.stairLinks as RecordValue[]).forEach((link, i) => {
    for (const key of ['fromLevel', 'toLevel']) {
      if ((link[key] as number) >= levels.length) invalid(`project.stairLinks[${i}].${key}`, 'an index of an existing level');
    }
    // Stair cells, like notes and room geometry, survive shrinking a level.
  });
}

/**
 * Clone portable data without JSON.stringify's silent conversion of NaN,
 * sparse arrays, dates, or unsupported extension values. Undefined object
 * properties are normal absent optional fields in editor state.
 */
function portableCopy(value: unknown, path: string, ancestors = new Set<object>()): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    finite(value, path);
    return value;
  }
  if (typeof value !== 'object') invalid(path, 'JSON-compatible data');
  if (ancestors.has(value)) invalid(path, 'non-circular JSON-compatible data');
  if (ancestors.size > 200) invalid(path, 'JSON-compatible data nested no more than 200 levels');
  const proto = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && proto !== Object.prototype && proto !== null) invalid(path, 'a plain JSON object');
  if (Object.getOwnPropertySymbols(value).length) invalid(path, 'JSON-compatible string keys');
  ancestors.add(value);
  let result: unknown;
  if (Array.isArray(value)) {
    result = Array.from(value, (entry, i) => portableCopy(entry, `${path}[${i}]`, ancestors));
  } else {
    result = Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key, entry === undefined ? undefined : portableCopy(entry, `${path}.${key}`, ancestors),
    ]));
  }
  ancestors.delete(value);
  return result;
}

function projectSource(data: unknown): { source: RecordValue; bareMap: boolean } {
  const root = record(data, 'file');
  let source = root;
  let bareMap = false;
  if (Object.hasOwn(root, 'schemaVersion')) {
    number(1, Number.MAX_SAFE_INTEGER, true)(root.schemaVersion, 'schemaVersion');
    if (root.schemaVersion !== PROJECT_SCHEMA_VERSION) {
      throw new Error(`This project uses schema version ${root.schemaVersion}; this app supports version ${PROJECT_SCHEMA_VERSION}. Update Dungeon Mapper to open it. Keep the original file; it has not been changed.`);
    }
    source = record(root.project, 'project');
  } else if (!Object.hasOwn(root, 'levels')) {
    bareMap = true;
  }
  return { source, bareMap };
}

/**
 * Read schema v1, an unversioned multi-level project, or a legacy bare map.
 * Unknown project/map/asset fields are retained. Envelope transport metadata
 * (for example a device's storage revision) is not part of the project.
 */
export function decodeProject(data: unknown): DungeonProject {
  const { source, bareMap } = projectSource(data);
  const copied = record(portableCopy(source, bareMap ? 'map' : 'project'), 'project');
  let project: RecordValue;
  if (bareMap) {
    map(copied, 'map');
    const meta = record(copied.meta, 'map.meta');
    project = {
      name: meta.name, levels: [copied], activeLevelIndex: 0, stairLinks: [],
      // Some legacy maps carry their asset libraries alongside the tile data.
      ...(copied.customThemes !== undefined ? { customThemes: copied.customThemes } : {}),
      ...(copied.customStamps !== undefined ? { customStamps: copied.customStamps } : {}),
      ...(copied.sceneTemplates !== undefined ? { sceneTemplates: copied.sceneTemplates } : {}),
    };
  } else {
    project = { ...copied, stairLinks: copied.stairLinks === undefined ? [] : copied.stairLinks };
  }
  validateProject(project);
  return project;
}

/** Validate and snapshot a project before persisting a portable v1 envelope. */
export function encodeProject(project: DungeonProject): object {
  // Wrap explicitly so an unknown project-level schemaVersion field remains
  // project data rather than being mistaken for envelope metadata.
  return { schemaVersion: PROJECT_SCHEMA_VERSION, project: decodeProject({ schemaVersion: PROJECT_SCHEMA_VERSION, project }) };
}

export interface FogRepairChange {
  levelIndex: number;
  levelName: string;
  layer: 'fog' | 'explored';
  fromWidth: number;
  fromHeight: number;
  toWidth: number;
  toHeight: number;
  addedCells: number;
  excludedCells: number;
}

export interface FogRepairPreview {
  project: DungeonProject;
  changes: FogRepairChange[];
}

/** Preview only. The caller must retain the untouched source before committing the repaired project. */
export function previewFogRepair(data: unknown): FogRepairPreview {
  const parsed: unknown = typeof data === 'string' ? JSON.parse(data) : data;
  // Reject unsupported versions before cloning or attempting any repair.
  projectSource(parsed);
  const copy = portableCopy(parsed, 'file');
  const { source, bareMap } = projectSource(copy);
  const levels = bareMap ? [source] : source.levels;
  if (!Array.isArray(levels)) invalid('project.levels', 'an array');
  const changes: FogRepairChange[] = [];
  levels.forEach((value, levelIndex) => {
    const path = `project.levels[${levelIndex}]`;
    const level = record(value, path);
    const meta = record(level.meta, `${path}.meta`);
    fields({ name: text, width: dimension, height: dimension })(meta, `${path}.meta`);
    const width = meta.width as number;
    const height = meta.height as number;
    // Never allocate a repaired grid based on dimensions unsupported by the actual tile data.
    grid(level.tiles, `${path}.tiles`, width, height, tile);
    for (const layer of ['fog', 'explored'] as const) {
      const original = level[layer];
      if (original === undefined) continue;
      array(array(boolean))(original, `${path}.${layer}`);
      const rows = original as boolean[][];
      const oldWidth = rows[0]?.length ?? 0;
      if (!rows.length || !oldWidth || rows.some(row => row.length !== oldWidth)) {
        invalid(`${path}.${layer}`, 'a non-empty rectangular boolean grid for dimension repair');
      }
      if (rows.length === height && oldWidth === width) continue;
      const retained = Math.min(rows.length, height) * Math.min(oldWidth, width);
      changes.push({
        levelIndex, levelName: meta.name as string, layer,
        fromWidth: oldWidth, fromHeight: rows.length, toWidth: width, toHeight: height,
        addedCells: width * height - retained,
        excludedCells: oldWidth * rows.length - retained,
      });
      level[layer] = Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => rows[y]?.[x] ?? (layer === 'fog')));
    }
  });
  if (!changes.length) throw new Error('No mismatched fog dimensions were found. No repair has been applied.');
  return { project: decodeProject(copy), changes };
}
