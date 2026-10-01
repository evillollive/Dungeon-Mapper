import type { DungeonProject } from '../types/map';
import { decodeProject } from './projectSchema';
import { CREATOR_PACKAGE_LIMITS, prepareCreatorProject, type CreatorProjectOptions } from './creatorProject';
import {
  assertCreatorMembers, assertCreatorMemberPath, assertCreatorPackageId, canonicalCreatorJSON, creatorSHA256,
  CREATOR_MAP_FORMAT, CREATOR_PACKAGE_FORMAT, type CreatorPackageFile,
} from './creatorPackageFormat';
import { CREATOR_CATALOG_VERSION, creatorBuiltinAttribution, type CreatorPackageManifest } from './creatorPackage';
import { normalizeCreatorCredit, mergeCreatorSources, type CreatorAssetCredit, type CreatorCredit, type CreatorLicense } from './creatorProvenance';
import { inspectCreatorImage, creatorLevelImagePixels } from './creatorAssets';
import { creatorMapImageURLs, inspectCreatorStampPaths } from './creatorPackageAssets';
import { decodeCreatorZip } from './creatorZipIntake';
import { createCreatorPackageOrigin } from './creatorPackageOrigin';
import { isCreatorContentVersion } from './creatorPackageContract';

export interface ImportedCreatorPackage {
  manifest: CreatorPackageManifest;
  project: DungeonProject;
  previews: CreatorPackageFile[];
  sourceNotices: CreatorCredit[];
  imageMetadataWarning: string;
}
function record(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !keys.includes(key))) throw new Error(`Invalid ${label} fields in creator package.`);
  return value as Record<string, unknown>;
}
function string(value: unknown, label: string, empty = false): string {
  if (typeof value !== 'string' || value.length > 65_536 || (!empty && !value.trim())) throw new Error(`Invalid ${label} in creator package.`);
  return value;
}
function json(bytes: Uint8Array): unknown {
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch (error) { if (!(error instanceof TypeError)) throw error; throw new Error('Creator JSON must be UTF-8.', { cause: error }); }
  // Bound nesting before parsing, respecting strings and escapes.
  let depth = 0, quoted = false, escaped = false;
  for (const character of text) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === '[' || character === '{') {
      if (++depth > CREATOR_PACKAGE_LIMITS.depth) throw new Error('Creator JSON exceeds the nesting limit.');
    } else if (character === ']' || character === '}') depth--;
  }
  try { return JSON.parse(text); }
  catch (error) { if (!(error instanceof SyntaxError)) throw error; throw new Error('Creator package contains invalid JSON.', { cause: error }); }
}
function same(left: unknown, right: unknown): boolean {
  const a = canonicalCreatorJSON(left), b = canonicalCreatorJSON(right);
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}
function imageURL(file: CreatorPackageFile): string {
  const extension = file.path.split('.').at(-1);
  const mime = extension === 'jpg' ? 'image/jpeg' : extension === 'svg' ? 'image/svg+xml'
    : extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : undefined;
  if (!mime) throw new Error('Unsupported creator image member.');
  const pieces: string[] = [];
  for (let offset = 0; offset < file.bytes.length; offset += 8192) {
    pieces.push(String.fromCharCode(...file.bytes.subarray(offset, offset + 8192)));
  }
  return `data:${mime};base64,${btoa(pieces.join(''))}`;
}

/** Validate every member before any rendering or Library write. Native image decoding is bounded. */
export async function inspectCreatorPackage(input: readonly CreatorPackageFile[], signal: AbortSignal,
  expectedPackageId?: string): Promise<ImportedCreatorPackage> {
  signal.throwIfAborted();
  assertCreatorMembers(input);
  const files = new Map(input.map(file => [file.path, { path: file.path, bytes: new Uint8Array(file.bytes) }]));
  const get = (path: string) => {
    const file = files.get(path);
    if (!file) throw new Error('A required creator package member is missing.');
    return file;
  };
  const raw = record(json(get('manifest.json').bytes), [
    'format', 'version', 'packageId', 'contentVersion', 'catalog', 'profile', 'title',
    'author', 'description', 'license', 'levelNames', 'members',
  ], 'manifest');
  if (raw.format !== CREATOR_PACKAGE_FORMAT || raw.version !== 1) throw new Error('Unsupported creator package version. Keep the file and update Dungeon Mapper.');
  if (raw.catalog !== CREATOR_CATALOG_VERSION) throw new Error('This creator package requires a different built-in artwork catalog.');
  const packageId = string(raw.packageId, 'package ID');
  assertCreatorPackageId(packageId);
  if (expectedPackageId !== undefined && packageId !== expectedPackageId) throw new Error('The archive folder and manifest identify different packages.');
  const contentVersion = string(raw.contentVersion, 'content version');
  if (!isCreatorContentVersion(contentVersion)) throw new Error('Invalid package content version.');
  if (raw.profile !== 'layout' && raw.profile !== 'encounter') throw new Error('Invalid creator package audience profile.');
  if (!['CC-BY-4.0', 'CC-BY-SA-4.0', 'AGPL-3.0-or-later'].includes(string(raw.license, 'license'))) throw new Error('Unsupported contribution license.');
  const license = raw.license as CreatorLicense;
  if (!Array.isArray(raw.levelNames) || raw.levelNames.length === 0 || raw.levelNames.length > CREATOR_PACKAGE_LIMITS.levels) throw new Error('Invalid creator level list.');
  const levelNames = raw.levelNames.map(name => string(name, 'level name'));
  if (!Array.isArray(raw.members) || raw.members.length !== files.size - 1) throw new Error('The creator member manifest is incomplete.');
  const seen = new Set<string>();
  const members: CreatorPackageManifest['members'] = [];
  for (const value of raw.members) {
    signal.throwIfAborted();
    const member = record(value, ['path', 'bytes', 'sha256'], 'member');
    const path = string(member.path, 'member path');
    if (path === 'manifest.json' || seen.has(path)) throw new Error('Duplicate or self-referencing creator member identity.');
    seen.add(path);
    const file = get(path);
    if (member.bytes !== file.bytes.length || !/^[a-f0-9]{64}$/.test(string(member.sha256, 'member hash')) ||
        await creatorSHA256(file.bytes) !== member.sha256) throw new Error('Creator member bytes do not match their recorded identity.');
    members.push({ path, bytes: file.bytes.length, sha256: member.sha256 });
  }
  const manifest: CreatorPackageManifest = {
    format: CREATOR_PACKAGE_FORMAT, version: 1, packageId, contentVersion, catalog: CREATOR_CATALOG_VERSION,
    profile: raw.profile, title: string(raw.title, 'title'), author: string(raw.author, 'author'),
    description: string(raw.description, 'description', true), license, levelNames, members,
  };
  const attribution = record(json(get('ATTRIBUTION.json').bytes),
    ['version', 'contribution', 'mapSources', 'assetCredits', 'builtins'], 'attribution');
  if (attribution.version !== 1 || !Array.isArray(attribution.mapSources) || attribution.mapSources.length > 256 ||
      !Array.isArray(attribution.assetCredits) || attribution.assetCredits.length > 256) throw new Error('Invalid creator attribution version or source lists.');
  const contribution = normalizeCreatorCredit(attribution.contribution);
  if (contribution.title !== manifest.title || contribution.author !== manifest.author || contribution.license !== manifest.license) {
    throw new Error('Manifest and contribution attribution disagree.');
  }
  const sources = attribution.mapSources.map(value => normalizeCreatorCredit(value));
  const credits: CreatorAssetCredit[] = attribution.assetCredits.map(value => normalizeCreatorCredit(value, true));
  const builtin = record(attribution.builtins, ['catalog', 'license', 'source', 'notices'], 'built-in attribution');
  if (builtin.catalog !== CREATOR_CATALOG_VERSION || builtin.license !== 'AGPL-3.0-or-later' ||
      builtin.source !== 'https://github.com/evillollive/Dungeon-Mapper' ||
      !Array.isArray(builtin.notices) || builtin.notices.length !== 4 ||
      builtin.notices.some(notice => typeof notice !== 'string' || notice.length > 65_536)) throw new Error('Unsupported or missing built-in notices.');
  if (!same(builtin, creatorBuiltinAttribution())) throw new Error('Built-in source notices must be retained unchanged for this catalog.');
  const envelope = record(json(get('map.json').bytes), ['format', 'version', 'project'], 'map envelope');
  if (envelope.format !== CREATOR_MAP_FORMAT || envelope.version !== 1) throw new Error('Unsupported creator map format.');
  const projectObject = record(envelope.project,
    ['name', 'levels', 'activeLevelIndex', 'stairLinks', 'customThemes', 'customStamps'], 'project');
  if (!Array.isArray(projectObject.levels) || projectObject.levels.length !== levelNames.length) throw new Error('Manifest and map levels disagree.');
  let cells = 0;
  for (const level of projectObject.levels) {
    if (!level || typeof level !== 'object' || !('meta' in level) || !level.meta || typeof level.meta !== 'object' ||
        !('width' in level.meta) || !('height' in level.meta)) throw new Error('Missing creator map dimensions.');
    const { width, height } = level.meta;
    if (typeof width !== 'number' || typeof height !== 'number' || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
        width <= 0 || height <= 0 || width * height > CREATOR_PACKAGE_LIMITS.cells - cells) throw new Error('Creator package exceeds the aggregate tile-cell budget.');
    cells += width * height;
  }
  const project = decodeProject(projectObject);
  const options: CreatorProjectOptions = {
    profile: manifest.profile, title: manifest.title, author: manifest.author, description: manifest.description,
    license, sources,
    levels: project.levels.map((level, index) => ({
      index, name: levelNames[index], background: !!level.backgroundImage,
      ...(manifest.profile === 'encounter' ? {
        notes: level.notes.map(note => note.id), tokens: level.tokens?.map(token => token.id),
        hiddenStamps: level.stamps?.filter(stamp => stamp.hidden).map(stamp => stamp.id),
        annotations: level.annotations?.map(stroke => stroke.id), markers: level.markers?.map(marker => marker.id),
        lightLabels: level.lightSources?.map(light => light.id),
      } : {}),
    })),
  };
  const reviewed = prepareCreatorProject(project, options);
  if (!same(reviewed.project, projectObject)) throw new Error('The creator map contains fields or state outside its declared sharing profile.');
  const keys = new Set(reviewed.assetsRequiringReview.map(asset => asset.key));
  if (credits.length !== keys.size || new Set(credits.map(credit => credit.key)).size !== keys.size ||
      credits.some(credit => !keys.has(credit.key))) throw new Error('Creator asset attribution does not match the included assets.');
  const images = new Map<string, { url: string; sha256: string; width: number; height: number }>();
  for (const file of files.values()) {
    if (!file.path.startsWith('assets/')) continue;
    signal.throwIfAborted();
    const sha256 = await creatorSHA256(file.bytes);
    if (file.path.slice(7, 71) !== sha256) throw new Error('An asset filename does not match its byte identity.');
    const url = imageURL(file), image = await inspectCreatorImage(url, signal);
    if (file.path !== `assets/${sha256}.${image.extension}`) throw new Error('An image type disagrees with its package filename.');
    images.set(file.path, { url, sha256, width: image.width, height: image.height });
  }
  const used = new Set<string>();
  for (const map of project.levels) {
    creatorLevelImagePixels(creatorMapImageURLs(map, project).map(path => {
      const image = images.get(path);
      if (!image) throw new Error('A creator asset is missing or refers outside this package.');
      used.add(path);
      return image;
    }));
  }
  if (used.size !== images.size) throw new Error('The creator package contains unrelated image assets.');
  const resolve = (path: string) => {
    const image = images.get(path);
    if (!image) throw new Error('A creator image reference is outside the reviewed package.');
    return image.url;
  };
  for (const map of project.levels) if (map.backgroundImage) map.backgroundImage.dataUrl = resolve(map.backgroundImage.dataUrl);
  for (const theme of project.customThemes ?? []) for (const tile of theme.customTiles) if (tile.imageDataUrl) tile.imageDataUrl = resolve(tile.imageDataUrl);
  for (const stamp of project.customStamps ?? []) {
    inspectCreatorStampPaths(stamp);
    if (stamp.imageDataUrl) stamp.imageDataUrl = resolve(stamp.imageDataUrl);
  }
  const previews: CreatorPackageFile[] = [];
  for (let index = 0; index < levelNames.length; index++) {
    const path = index === 0 ? 'preview.png' : `preview-${String(index + 1).padStart(2, '0')}.png`;
    const file = get(path);
    await inspectCreatorImage(imageURL(file), signal);
    previews.push(file);
  }
  if ([...files.keys()].filter(path => /^preview(?:-\d+)?\.png$/.test(path)).length !== previews.length) throw new Error('Unexpected preview levels in package.');
  const provenance = { version: 1, mapSources: mergeCreatorSources(sources, [contribution]),
    assetCredits: credits.filter(credit => !credit.key.startsWith('level:')) };
  // Conservatively preserve all package obligations when levels are reused separately.
  for (const [index, map] of project.levels.entries()) {
    map.creatorProvenance = structuredClone({
      ...provenance,
      assetCredits: [...provenance.assetCredits, ...credits.filter(credit => credit.key === `level:${index}:background`)
        .map(credit => ({ ...credit, key: 'background' }))],
    });
  }
  project.creatorProvenance = structuredClone(provenance);
  project.creatorPackageOrigin = await createCreatorPackageOrigin(manifest, get('manifest.json').bytes);
  signal.throwIfAborted();
  return { manifest, project, previews, sourceNotices: provenance.mapSources,
    imageMetadataWarning: 'Original images can retain author notices, embedded text and private metadata. Package hashes do not prove ownership or safety.' };
}

export async function inspectCreatorZip(bytes: Uint8Array, signal: AbortSignal): Promise<ImportedCreatorPackage> {
  const envelope = await decodeCreatorZip(bytes, signal);
  return inspectCreatorPackage(envelope.files, signal, envelope.packageId);
}

export async function inspectCreatorDirectory(input: readonly File[], signal: AbortSignal): Promise<ImportedCreatorPackage> {
  signal.throwIfAborted();
  if (input.length > CREATOR_PACKAGE_LIMITS.members) throw new Error('A creator folder cannot contain more than 256 files.');
  const manifests = input.filter(file => file.webkitRelativePath.endsWith('/manifest.json'));
  if (manifests.length !== 1) throw new Error('Choose one extracted creator map folder containing its manifest.json.');
  const root = manifests[0].webkitRelativePath.slice(0, -'manifest.json'.length);
  const packageId = root.split('/').filter(Boolean).at(-1)!;
  assertCreatorPackageId(packageId);
  let total = 0;
  const paths = new Set<string>();
  const plan = input.map(file => {
    if (!file.webkitRelativePath.startsWith(root)) throw new Error('Choose a single creator package folder, without unrelated files.');
    const path = file.webkitRelativePath.slice(root.length);
    assertCreatorMemberPath(path);
    if (paths.has(path)) throw new Error('Duplicate creator folder paths.');
    paths.add(path);
    if (file.size <= 0 || file.size > CREATOR_PACKAGE_LIMITS.expandedBytes - total) throw new Error('The creator folder exceeds 64 MiB or contains an empty file.');
    total += file.size;
    if (path === 'map.json' && file.size > CREATOR_PACKAGE_LIMITS.mapBytes) throw new Error('Creator map JSON exceeds 16 MiB.');
    return { file, path };
  });
  const files: CreatorPackageFile[] = [];
  for (const { file, path } of plan) {
    signal.throwIfAborted();
    files.push({ path, bytes: new Uint8Array(await file.arrayBuffer()) });
  }
  signal.throwIfAborted();
  return inspectCreatorPackage(files, signal, packageId);
}
