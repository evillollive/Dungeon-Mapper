export const ORIGINAL_CREATOR_LICENSES = ['CC-BY-4.0', 'CC-BY-SA-4.0'] as const;
export const CREATOR_LICENSES = [...ORIGINAL_CREATOR_LICENSES, 'AGPL-3.0-or-later'] as const;
export type CreatorLicense = typeof CREATOR_LICENSES[number];

export interface CreatorCredit {
  title: string;
  author: string;
  license: string;
  url?: string;
  notice?: string;
}
export interface CreatorAssetCredit extends CreatorCredit { key: string }
export interface CreatorProvenance {
  version: 1;
  mapSources: CreatorCredit[];
  assetCredits: CreatorAssetCredit[];
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
function knownKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every(key => keys.includes(key));
}
function creditShape(value: unknown, asset: boolean): value is Record<string, unknown> {
  return record(value) && knownKeys(value, ['title', 'author', 'license', 'url', 'notice', ...(asset ? ['key'] : [])]) &&
    ['title', 'author', 'license', ...(asset ? ['key'] : [])].every(key => typeof value[key] === 'string') &&
    ['url', 'notice'].every(key => value[key] === undefined || typeof value[key] === 'string');
}
function provenanceShape(value: unknown): value is Record<string, unknown> & {
  version: 1; mapSources: Record<string, unknown>[]; assetCredits: Record<string, unknown>[];
} {
  return record(value) && value.version === 1 && knownKeys(value, ['version', 'mapSources', 'assetCredits']) &&
    Array.isArray(value.mapSources) && value.mapSources.every(item => creditShape(item, false)) &&
    Array.isArray(value.assetCredits) && value.assetCredits.every(item => creditShape(item, true));
}

function text(value: unknown, field: string, required = true): string {
  if (typeof value !== 'string' || value.length > 65_536 || (required && !value.trim())) {
    throw new Error(`Creator attribution needs a nonempty ${field} within the text limit.`);
  }
  return value.trim();
}

export function normalizeCreatorCredit(value: unknown, asset: true): CreatorAssetCredit;
export function normalizeCreatorCredit(value: unknown, asset?: false): CreatorCredit;
export function normalizeCreatorCredit(value: unknown, asset = false): CreatorCredit | CreatorAssetCredit {
  if (!creditShape(value, asset)) throw new Error('Creator attribution contains unsupported fields. Keep the original source notices.');
  const result: CreatorCredit = {
    title: text(value.title, 'title'), author: text(value.author, 'author'), license: text(value.license, 'license'),
  };
  if (['UNKNOWN', 'NOASSERTION', 'NONE', 'UNLICENSED'].includes(result.license.toUpperCase())) {
    throw new Error('Resolve the source license before preparing a creator package.');
  }
  if (value.url !== undefined && text(value.url, 'source URL', false)) {
    const address = text(value.url, 'source URL');
    if (!URL.canParse(address)) throw new Error('Provide a valid source URL for creator attribution.');
    const url = new URL(address);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search) {
      throw new Error('Creator source links must be HTTP(S) URLs without credentials or query parameters.');
    }
    result.url = url.href;
  }
  if (value.notice !== undefined) result.notice = text(value.notice, 'notice', false);
  return asset ? { ...result, key: text(value.key, 'asset key') } : result;
}

export function readCreatorProvenance(value: unknown): CreatorProvenance {
  if (value === undefined) return { version: 1, mapSources: [], assetCredits: [] };
  if (!provenanceShape(value) || value.mapSources.length > 256 || value.assetCredits.length > 256) {
    throw new Error('This project has unsupported creator provenance. Keep its private backup and resolve attribution before sharing.');
  }
  return {
    version: 1,
    mapSources: value.mapSources.map(item => normalizeCreatorCredit(item)),
    assetCredits: value.assetCredits.map(item => normalizeCreatorCredit(item, true)),
  };
}

/** Ordinary creation preserves opaque future provenance instead of interpreting or dropping it. */
export function creatorLibraryProvenance(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (!provenanceShape(value)) return structuredClone(value);
  return { ...structuredClone(value), mapSources: [] };
}

export function combineCreatorProvenance(left: unknown, right: unknown): unknown {
  if (left === undefined) return structuredClone(right);
  if (right === undefined) return structuredClone(left);
  if (!provenanceShape(left) || !provenanceShape(right)) {
    return { version: 'unresolved', inherited: [structuredClone(left), structuredClone(right)] };
  }
  const unique = (values: Record<string, unknown>[]) =>
    [...new Map(values.map(value => [JSON.stringify(value), structuredClone(value)])).values()];
  return {
    version: 1,
    mapSources: unique([...left.mapSources, ...right.mapSources]),
    assetCredits: unique([...left.assetCredits, ...right.assetCredits]),
  };
}

export function mergeCreatorSources(...groups: readonly CreatorCredit[][]): CreatorCredit[] {
  const result = new Map<string, CreatorCredit>();
  for (const group of groups) for (const raw of group) {
    const credit = normalizeCreatorCredit(raw);
    result.set(JSON.stringify(credit), credit);
    if (result.size > 256) throw new Error('The creator source history exceeds the supported attribution limit.');
  }
  return [...result.values()];
}

export function creatorLicenseChoices(sources: readonly CreatorCredit[]): readonly CreatorLicense[] {
  const licenses = new Set(sources.map(source => source.license));
  if ([...licenses].some(license => !CREATOR_LICENSES.some(known => known === license))) {
    throw new Error('This inherited map license needs a separate compatibility review before creator sharing.');
  }
  if (licenses.has('AGPL-3.0-or-later')) {
    if (licenses.has('CC-BY-SA-4.0')) throw new Error('These inherited share-alike licenses need a separate compatibility review.');
    return ['AGPL-3.0-or-later'];
  }
  return licenses.has('CC-BY-SA-4.0') ? ['CC-BY-SA-4.0'] : ORIGINAL_CREATOR_LICENSES;
}
