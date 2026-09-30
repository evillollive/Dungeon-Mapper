import type { DungeonMap, DungeonProject, StairLink, TileType } from '../types/map';
import { isBuiltInTileType, isFloorMaterialId } from '../types/map';
import { findTheme } from '../themes';
import { getStampDef } from './stampCatalog';
import { decodeProject } from './projectSchema';
import { copyCreatorFields, creatorProjectFields, type CreatorOmission } from './creatorPackageFields';
import {
  creatorLicenseChoices, mergeCreatorSources, readCreatorProvenance,
  type CreatorCredit, type CreatorLicense, type CreatorProvenance,
} from './creatorProvenance';

export { CREATOR_LICENSES, ORIGINAL_CREATOR_LICENSES, type CreatorLicense } from './creatorProvenance';
export const CREATOR_PACKAGE_LIMITS = {
  zipBytes: 32 * 1024 * 1024,
  expandedBytes: 64 * 1024 * 1024,
  mapBytes: 16 * 1024 * 1024,
  levels: 32,
  cells: 262_144,
  members: 256,
  depth: 32,
  imageBytes: 10 * 1024 * 1024,
  imagePixels: 24_000_000,
  levelImagePixels: 24_000_000,
} as const;

export interface CreatorLevelSelection {
  index: number;
  name: string;
  notes?: number[];
  tokens?: number[];
  hiddenStamps?: number[];
  annotations?: number[];
  markers?: number[];
  lightLabels?: number[];
  background?: boolean;
}
export interface CreatorProjectOptions {
  profile: 'layout' | 'encounter';
  title: string;
  author: string;
  description: string;
  license: CreatorLicense;
  levels: CreatorLevelSelection[];
  omitCrossLevelLinks?: boolean;
  sources?: CreatorCredit[];
}
export interface CreatorAssetReference {
  key: string;
  kind: 'background' | 'custom-stamp' | 'custom-theme';
}
export interface CreatorProjectDraft {
  project: DungeonProject;
  profile: CreatorProjectOptions['profile'];
  author: string;
  description: string;
  license: CreatorLicense;
  omissions: CreatorOmission[];
  assetsRequiringReview: CreatorAssetReference[];
  provenance: CreatorProvenance;
}

function publicationText(value: string, label: string, required = true): string {
  if (typeof value !== 'string' || (required && !value.trim()) ||
      [...value].some(character => character.charCodeAt(0) < 32 && !'\t\n\r'.includes(character))) {
    throw new Error(`Provide ${label} explicitly for the sharing copy.`);
  }
  return value.trim();
}

function uniqueIds(items: readonly { id: number }[], path: string): void {
  const ids = new Set<number>();
  for (const item of items) {
    if (!Number.isSafeInteger(item.id) || item.id < 0 || ids.has(item.id)) {
      throw new Error(`Ambiguous or invalid entity IDs at ${path}. Keep the original project and resolve them before sharing.`);
    }
    ids.add(item.id);
  }
}

function selectItems<T extends { id: number }>(items: T[], requested: readonly number[] | undefined,
  path: string, omissions: CreatorOmission[]): T[] {
  const ids = new Set(requested ?? []);
  if (ids.size !== (requested?.length ?? 0) ||
      [...ids].some(id => !Number.isSafeInteger(id) || !items.some(item => item.id === id))) {
    throw new Error(`The sharing selection at ${path} is no longer valid. Review the content again.`);
  }
  return items.filter((item, index) => {
    if (ids.has(item.id)) return true;
    omissions.push({ path: `${path}[${index}]`, reason: 'private-or-unselected' });
    return false;
  });
}

function mapReferences(map: DungeonMap, path: string): void {
  for (const key of ['notes', 'tokens', 'stamps', 'annotations', 'markers', 'lightSources',
    'wallSegments', 'pathSegments', 'rivers', 'roomShapes'] as const) uniqueIds(map[key] ?? [], `${path}.${key}`);
  const notes = new Set(map.notes.map(note => note.id));
  const rivers = new Set((map.rivers ?? []).map(river => river.id));
  for (const row of map.tiles) for (const tile of row) {
    if (tile.noteId !== undefined && !notes.has(tile.noteId)) throw new Error(`Missing note reference at ${path}.tiles.`);
    if ((tile.riverId !== undefined && !rivers.has(tile.riverId)) ||
        (tile.riverBankRiverId !== undefined && !rivers.has(tile.riverBankRiverId))) {
      throw new Error(`Missing river reference at ${path}.tiles.`);
    }
    if (tile.floorMaterial !== undefined && !isFloorMaterialId(tile.floorMaterial)) {
      throw new Error(`Unsupported floor material at ${path}.tiles. Keep the original project.`);
    }
  }
  for (const river of map.rivers ?? []) {
    const targets = [...(river.tributaryIds ?? []), ...(river.parentRiverId === undefined ? [] : [river.parentRiverId])];
    if (new Set(targets).size !== targets.length || targets.some(id => id === river.id || !rivers.has(id))) {
      throw new Error(`Invalid river relationship at ${path}.rivers.`);
    }
  }
}

function libraries(project: DungeonProject, source: DungeonProject, omissions: CreatorOmission[]): CreatorAssetReference[] {
  const neededThemes = new Set<string>();
  const neededTiles = new Set<TileType>();
  const neededStamps = new Set<string>();
  const assets: CreatorAssetReference[] = [];
  for (const [index, map] of project.levels.entries()) {
    neededThemes.add(map.meta.theme ?? 'dungeon');
    for (const row of map.tiles) for (const tile of row) {
      neededTiles.add(tile.type);
      if (tile.theme) neededThemes.add(tile.theme);
    }
    for (const room of map.roomShapes ?? []) {
      if (room.fillTile) neededTiles.add(room.fillTile);
      if (room.wallTile) neededTiles.add(room.wallTile);
      for (const door of room.doorHints ?? []) if (door.type) neededTiles.add(door.type);
    }
    for (const stamp of map.stamps ?? []) neededStamps.add(stamp.stampId);
    if (map.backgroundImage) assets.push({ key: `level:${index}:background`, kind: 'background' });
  }
  const allThemes = source.customThemes ?? [];
  const allStamps = source.customStamps ?? [];
  for (const tile of neededTiles) {
    if (isBuiltInTileType(tile)) continue;
    const owners = allThemes.filter(theme => theme.customTiles.some(item => item.id === tile));
    if (owners.length !== 1 || owners[0].customTiles.filter(item => item.id === tile).length !== 1) {
      throw new Error('A referenced custom tile is missing or ambiguous. Review its source library before sharing.');
    }
    neededThemes.add(owners[0].id);
  }
  project.customStamps = [...neededStamps].flatMap(id => {
    const custom = allStamps.filter(stamp => stamp.id === id);
    const definition = getStampDef(id, allStamps);
    if (custom.length > 1 || !definition || definition.id !== id) {
      throw new Error('A referenced stamp is missing or ambiguous. Review its source library before sharing.');
    }
    if (!custom.length) return [];
    if (custom[0].themeId) neededThemes.add(custom[0].themeId);
    assets.push({ key: `stamp:${id}`, kind: 'custom-stamp' });
    return custom;
  });
  project.customThemes = [...neededThemes].flatMap(id => {
    const custom = allThemes.filter(theme => theme.id === id);
    if (custom.length > 1 || (!custom.length && !findTheme(id))) {
      throw new Error('A referenced theme is missing or ambiguous. Review its source library before sharing.');
    }
    if (!custom.length) return [];
    const theme = custom[0];
    if (!findTheme(theme.baseThemeId)) {
      throw new Error('A custom theme uses an unsupported base theme. Keep the original project.');
    }
    assets.push({ key: `theme:${id}`, kind: 'custom-theme' });
    return [{ ...theme, customTiles: theme.customTiles.filter(tile => neededTiles.has(tile.id)) }];
  });
  for (const [index, theme] of allThemes.entries()) {
    if (!neededThemes.has(theme.id)) omissions.push({ path: `project.customThemes[${index}]`, reason: 'private-or-unselected' });
    else for (const [tileIndex, tile] of theme.customTiles.entries()) {
      if (!neededTiles.has(tile.id)) omissions.push({ path: `project.customThemes[${index}].customTiles[${tileIndex}]`, reason: 'private-or-unselected' });
    }
  }
  for (const [index, stamp] of allStamps.entries()) if (!neededStamps.has(stamp.id)) {
    omissions.push({ path: `project.customStamps[${index}]`, reason: 'private-or-unselected' });
  }
  if (!project.customThemes.length) delete project.customThemes;
  if (!project.customStamps.length) delete project.customStamps;
  return assets;
}

/** Produces a trusted review draft, not a licensed or downloadable package. */
export function prepareCreatorProject(source: DungeonProject, options: CreatorProjectOptions): CreatorProjectDraft {
  if (options.profile !== 'layout' && options.profile !== 'encounter') throw new Error('Choose a creator-sharing profile.');
  const title = publicationText(options.title, 'a publication title');
  const author = publicationText(options.author, 'a creator credit');
  const description = publicationText(options.description, 'a publication description', false);
  if (!Array.isArray(options.levels) || !options.levels.length || options.levels.length > CREATOR_PACKAGE_LIMITS.levels) {
    throw new Error(`Choose between 1 and ${CREATOR_PACKAGE_LIMITS.levels} levels for the sharing copy.`);
  }
  const indices = options.levels.map(selection => selection.index);
  if (new Set(indices).size !== indices.length ||
      indices.some(index => !Number.isSafeInteger(index) || index < 0 || index >= source.levels.length)) {
    throw new Error('The selected levels are missing or duplicated. Review the sharing copy again.');
  }
  const selections = [...options.levels].sort((a, b) => a.index - b.index);
  const provenance = readCreatorProvenance(source.creatorProvenance);
  for (const [outputIndex, selection] of selections.entries()) {
    const levelProvenance = readCreatorProvenance(source.levels[selection.index].creatorProvenance);
    provenance.mapSources = mergeCreatorSources(provenance.mapSources, levelProvenance.mapSources);
    provenance.assetCredits.push(...levelProvenance.assetCredits.map(credit =>
      credit.key === 'background' ? { ...credit, key: `level:${outputIndex}:background` } : credit));
  }
  provenance.assetCredits = [...new Map(provenance.assetCredits.map(credit => [JSON.stringify(credit), credit])).values()];
  provenance.mapSources = mergeCreatorSources(provenance.mapSources, options.sources ?? []);
  if (!creatorLicenseChoices(provenance.mapSources).some(license => license === options.license)) {
    throw new Error('Choose an explicit creator license compatible with the inherited map license.');
  }
  let cells = 0;
  for (const selection of selections) {
    const map = source.levels[selection.index];
    const count = map.meta.width * map.meta.height;
    if (!Number.isSafeInteger(count) || count <= 0 || count > CREATOR_PACKAGE_LIMITS.cells - cells) {
      throw new Error(`The sharing copy exceeds ${CREATOR_PACKAGE_LIMITS.cells} tile cells. Choose fewer levels; the original is unchanged.`);
    }
    cells += count;
  }
  const omissions: CreatorOmission[] = [];
  const sanitized = copyCreatorFields({
    ...source, levels: [], stairLinks: [], customThemes: undefined, customStamps: undefined,
  }, creatorProjectFields, 'project', omissions);
  const clean = decodeProject({
    ...(typeof sanitized === 'object' && sanitized !== null ? sanitized : {}),
    name: title,
    activeLevelIndex: 0,
    levels: selections.map(selection => {
      const map = source.levels[selection.index];
      const fields = copyCreatorFields(map, creatorProjectFields.levels[0], `project.levels[${selection.index}]`, omissions);
      return { ...(typeof fields === 'object' && fields !== null ? fields : {}),
        meta: { width: map.meta.width, height: map.meta.height, tileSize: map.meta.tileSize,
          theme: map.meta.theme, name: publicationText(selection.name, 'a publication name for each level') } };
    }),
    stairLinks: [],
  });
  const indexMap = new Map(selections.map((selection, index) => [selection.index, index]));
  for (const [index, link] of source.stairLinks.entries()) {
    if ([link.fromLevel, link.toLevel].some(level => !Number.isSafeInteger(level) || level < 0 || level >= source.levels.length)) {
      throw new Error('A stair link references a missing level. Resolve the link before sharing.');
    }
    const from = indexMap.get(link.fromLevel), to = indexMap.get(link.toLevel);
    if (from === undefined && to === undefined) continue;
    if (from === undefined || to === undefined) {
      if (!options.omitCrossLevelLinks) throw new Error('A stair link reaches an unselected level. Include that level or explicitly omit the link.');
      omissions.push({ path: `project.stairLinks[${index}]`, reason: 'excluded-reference' });
      continue;
    }
    const copied: StairLink = { fromLevel: from, toLevel: to,
      fromCell: { x: link.fromCell.x, y: link.fromCell.y }, toCell: { x: link.toCell.x, y: link.toCell.y } };
    clean.stairLinks.push(copied);
  }
  for (let index = 0; index < source.levels.length; index++) if (!indexMap.has(index)) {
    omissions.push({ path: `project.levels[${index}]`, reason: 'private-or-unselected' });
  }
  for (const [index, map] of clean.levels.entries()) {
    const selection = selections[index];
    const path = `project.levels[${selection.index}]`;
    mapReferences(map, path);
    if (options.profile === 'layout' && [selection.notes, selection.tokens, selection.hiddenStamps,
      selection.annotations, selection.markers, selection.lightLabels].some(ids => ids?.length)) {
      throw new Error('Map layout does not include encounter selections. Choose the DM encounter profile explicitly.');
    }
    map.notes = selectItems(map.notes, selection.notes, `${path}.notes`, omissions);
    map.tokens = selectItems(map.tokens ?? [], selection.tokens, `${path}.tokens`, omissions);
    map.annotations = selectItems(map.annotations ?? [], selection.annotations, `${path}.annotations`, omissions);
    map.markers = selectItems(map.markers ?? [], selection.markers, `${path}.markers`, omissions);
    const hidden = selectItems((map.stamps ?? []).filter(stamp => stamp.hidden), selection.hiddenStamps, `${path}.stamps`, []);
    const hiddenIds = new Set(hidden.map(stamp => stamp.id));
    map.stamps = (map.stamps ?? []).filter((stamp, stampIndex) => {
      if (!stamp.hidden || hiddenIds.has(stamp.id)) return true;
      omissions.push({ path: `${path}.stamps[${stampIndex}]`, reason: 'private-or-unselected' });
      return false;
    });
    const labelled = selectItems(map.lightSources ?? [], selection.lightLabels, `${path}.lightSources`, []);
    const labelIds = new Set(labelled.map(light => light.id));
    for (const [lightIndex, light] of (map.lightSources ?? []).entries()) if (!labelIds.has(light.id)) {
      light.label = 'Light';
      omissions.push({ path: `${path}.lightSources[${lightIndex}].label`, reason: 'private-or-unselected' });
    }
    const notes = new Set(map.notes.map(note => note.id));
    for (const [y, row] of map.tiles.entries()) for (const [x, tile] of row.entries()) {
      if (tile.noteId !== undefined && !notes.has(tile.noteId)) {
        delete tile.noteId;
        omissions.push({ path: `${path}.tiles[${y}][${x}].noteId`, reason: 'excluded-reference' });
      }
    }
    if (map.backgroundImage && !selection.background) {
      delete map.backgroundImage;
      omissions.push({ path: `${path}.backgroundImage`, reason: 'private-or-unselected' });
    }
    map.fogEnabled = true;
    map.dynamicFogEnabled = false;
    map.fog = map.tiles.map(row => row.map(() => true));
    map.explored = map.tiles.map(row => row.map(() => false));
    map.initiative = [];
  }
  const assetsRequiringReview = libraries(clean, source, omissions);
  const project = decodeProject({
    ...clean,
    customThemes: copyCreatorFields(clean.customThemes, creatorProjectFields.customThemes, 'project.customThemes', omissions),
    customStamps: copyCreatorFields(clean.customStamps, creatorProjectFields.customStamps, 'project.customStamps', omissions),
  });
  return { project, profile: options.profile, author, description, license: options.license,
    omissions, assetsRequiringReview, provenance };
}
