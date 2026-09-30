import type {
  CustomThemeDefinition, DungeonMap, DungeonProject, MapNote, StampDef, Token,
} from '../types/map';

type FieldPolicy<T> = NonNullable<T> extends (infer Item)[]
  ? false | [FieldPolicy<Item>]
  : NonNullable<T> extends object
    ? false | { [Key in keyof NonNullable<T>]-?: FieldPolicy<NonNullable<T>[Key]> }
    : boolean;

type Policy = boolean | { [key: string]: Policy } | [Policy];
export interface CreatorOmission {
  path: string;
  reason: 'private-or-unselected' | 'unknown-field' | 'excluded-reference';
}

const point = { x: true, y: true };
export const creatorNoteFields = {
  id: true, x: true, y: true, label: true, description: true,
  published: true, publicLabel: true, publicDescription: true, kind: true,
} satisfies FieldPolicy<MapNote>;
export const creatorTokenFields = {
  id: true, hidden: true, hideFromInitiative: true, x: true, y: true, kind: true,
  label: true, color: true, icon: true, size: true,
} satisfies FieldPolicy<Token>;

export const creatorMapFields = {
  creatorProvenance: false,
  meta: { name: false, publicName: false, width: true, height: true, tileSize: true, theme: true },
  tiles: [[{
    type: true, floorMaterial: true, discovered: false, discoveredType: false,
    noteId: true, flowDirection: true, riverId: true, riverType: true,
    riverBank: true, riverBankRiverId: true, riverBankType: true, theme: true,
  }]],
  notes: [creatorNoteFields],
  fog: false, fogEnabled: false, dynamicFogEnabled: false, explored: false,
  tokens: [creatorTokenFields],
  annotations: [{ id: true, kind: true, points: [point], color: true, width: true }],
  markers: [{ id: true, x: true, y: true, shape: true, color: true, size: true }],
  initiative: false,
  backgroundImage: { dataUrl: true, offsetX: true, offsetY: true, scale: true, opacity: true },
  lightSources: [{ id: true, x: true, y: true, radius: true, color: true, label: true }],
  stamps: [{
    id: true, hidden: true, stampId: true, x: true, y: true, rotation: true,
    scale: true, flipX: true, flipY: true, opacity: true, locked: true,
  }],
  wallSegments: [{ id: true, points: [point], color: true, thickness: true }],
  pathSegments: [{ id: true, points: [point], color: true, width: true }],
  rivers: [{
    id: true, controlPoints: [point], width: true, flowDirection: true, type: true,
    color: true, sourceMarker: true, mouthMarker: true, parentRiverId: true,
    tributaryIds: [true],
  }],
  paperTexture: { enabled: true, pattern: true, opacity: true, grain: true, vignette: true, tintOverride: true },
  edgeBlend: { enabled: true, style: true, intensity: true, opacity: true },
  handDrawn: { enabled: true, style: true, wobble: true, crossHatch: true, opacity: true },
  lightingAtmosphere: {
    enabled: true, aoIntensity: true, aoRadius: true, stampShadowOpacity: true,
    stampShadowOffset: true, colorGrading: true, colorGradingIntensity: true, opacity: true,
  },
  artStylePreset: true,
  roomShapes: [{
    id: true, shapeType: true, x: true, y: true, width: true, height: true,
    vertices: [point], mode: true, fillTile: true, wallTile: true,
    doorHints: [{ edge: true, offset: true, type: true }],
    edgeMergeOverrides: [{ edge: true, mode: true }],
  }],
} satisfies FieldPolicy<DungeonMap>;

const tileStyleFields = {
  empty: true, floor: true, wall: true, 'door-h': true, 'door-v': true, 'secret-door': true,
  'locked-door-h': true, 'locked-door-v': true, 'trapped-door-h': true, 'trapped-door-v': true,
  portcullis: true, archway: true, barricade: true, 'stairs-up': true, 'stairs-down': true,
  water: true, pillar: true, trap: true, treasure: true, start: true, background: true,
} satisfies FieldPolicy<CustomThemeDefinition['tileColors']>;
export const creatorThemeFields = {
  id: true, name: true, baseThemeId: true, gridColor: true,
  tileColors: tileStyleFields, tileLabels: tileStyleFields,
  customTiles: [{ id: true, label: true, color: true, imageDataUrl: true, baseType: true }],
} satisfies FieldPolicy<CustomThemeDefinition>;
export const creatorStampFields = {
  id: true, name: true, category: true, themeId: true, viewBox: true,
  svgPath: true, paths: [{ path: true, fill: true, stroke: true, strokeWidth: true }],
  imageDataUrl: true,
} satisfies FieldPolicy<StampDef>;
export const creatorProjectFields = {
  name: false, levels: [creatorMapFields], activeLevelIndex: false,
  stairLinks: [{ fromLevel: true, fromCell: point, toLevel: true, toCell: point }],
  customThemes: [creatorThemeFields], customStamps: [creatorStampFields],
  sceneTemplates: false,
  creatorProvenance: false,
} satisfies FieldPolicy<DungeonProject>;

/** This report stays in the trusted review UI, never in a public package. */
export function copyCreatorFields(value: unknown, policy: Policy, path: string,
  omissions: CreatorOmission[], depth = 0): unknown {
  if (value === undefined) return undefined;
  if (policy === false) {
    omissions.push({ path, reason: 'private-or-unselected' });
    return undefined;
  }
  if (depth > 32) throw new Error(`Creator content is nested too deeply at ${path}. Keep the original project.`);
  if (policy === true) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value))) return value;
    throw new Error(`Invalid creator field at ${path}: expected a finite scalar value.`);
  }
  if (Array.isArray(policy)) {
    if (!Array.isArray(value)) throw new Error(`Invalid creator field at ${path}: expected an array.`);
    return value.map((entry, index) => copyCreatorFields(entry, policy[0], `${path}[${index}]`, omissions, depth + 1));
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid creator field at ${path}: expected an object.`);
  }
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
    const fieldPath = `${path}.${key}`;
    if (!Object.hasOwn(policy, key)) {
      omissions.push({ path: fieldPath, reason: 'unknown-field' });
      return [];
    }
    const copied = copyCreatorFields(entry, policy[key], fieldPath, omissions, depth + 1);
    return copied === undefined ? [] : [[key, copied]];
  }));
}
