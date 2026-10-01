import type { CreatorPackageManifest } from './creatorPackage';
import {
  assertCreatorMemberPath, assertCreatorPackageId, creatorSHA256, CREATOR_REQUIRED_FILES,
  type CreatorMemberIdentity,
} from './creatorPackageFormat';
import { CREATOR_PACKAGE_LIMITS } from './creatorProject';

export interface CreatorPackageOrigin {
  version: 1;
  packageId: string;
  contentVersion: string;
  title: string;
  author: string;
  license: string;
  profile: 'layout' | 'encounter';
  catalog: string;
  files: CreatorMemberIdentity[];
}
export interface CreatorPackageComparison {
  original: CreatorPackageOrigin;
  incoming: CreatorPackageOrigin;
  samePackageId: boolean;
  sameBytes: boolean;
  sameVersionLabel: boolean;
  authorChanged: boolean;
  licenseChanged: boolean;
  profileChanged: boolean;
  catalogChanged: boolean;
  files: {
    path: string;
    change: 'added' | 'removed' | 'changed' | 'unchanged';
    before?: CreatorMemberIdentity;
    after?: CreatorMemberIdentity;
  }[];
}

function invalid(): never {
  throw new Error('The saved creator-package receipt is unsupported or damaged. Keep the private backup; import the original creator package as a separate project to establish a comparison baseline.');
}
function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !keys.includes(key))) invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 65_536) invalid();
  return value;
}

/** Private backups retain opaque future receipts; comparison interprets only this version. */
export function readCreatorPackageOrigin(value: unknown): CreatorPackageOrigin | undefined {
  if (value === undefined) return undefined;
  const raw = record(value, ['version', 'packageId', 'contentVersion', 'title', 'author', 'license', 'profile', 'catalog', 'files']);
  if (raw.version !== 1) invalid();
  const packageId = text(raw.packageId), contentVersion = text(raw.contentVersion);
  assertCreatorPackageId(packageId);
  if (contentVersion.length > 64 || !/^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?$/.test(contentVersion) ||
      (raw.profile !== 'layout' && raw.profile !== 'encounter')) invalid();
  if (!Array.isArray(raw.files) || raw.files.length > CREATOR_PACKAGE_LIMITS.members) invalid();
  const seen = new Set<string>();
  let total = 0;
  const files = raw.files.map(value => {
    const file = record(value, ['path', 'bytes', 'sha256']);
    const path = text(file.path), sha256 = text(file.sha256);
    assertCreatorMemberPath(path);
    if (seen.has(path) || typeof file.bytes !== 'number' || !Number.isSafeInteger(file.bytes) ||
        file.bytes <= 0 || file.bytes > CREATOR_PACKAGE_LIMITS.expandedBytes - total ||
        (path === 'map.json' && file.bytes > CREATOR_PACKAGE_LIMITS.mapBytes) || !/^[a-f0-9]{64}$/.test(sha256)) invalid();
    seen.add(path);
    total += file.bytes;
    return { path, bytes: file.bytes, sha256 };
  });
  if (CREATOR_REQUIRED_FILES.some(path => !seen.has(path))) invalid();
  return {
    version: 1, packageId, contentVersion,
    title: text(raw.title), author: text(raw.author), license: text(raw.license),
    profile: raw.profile, catalog: text(raw.catalog),
    files: files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
  };
}

/** Called only after the importer has verified all package members and declarations. */
export async function createCreatorPackageOrigin(manifest: CreatorPackageManifest,
  manifestBytes: Uint8Array<ArrayBuffer>): Promise<CreatorPackageOrigin> {
  const files = manifest.members.map(file => ({ path: file.path, bytes: file.bytes, sha256: file.sha256 }));
  files.push({ path: 'manifest.json', bytes: manifestBytes.length, sha256: await creatorSHA256(manifestBytes) });
  const origin = readCreatorPackageOrigin({
    version: 1, packageId: manifest.packageId, contentVersion: manifest.contentVersion,
    title: manifest.title, author: manifest.author, license: manifest.license,
    profile: manifest.profile, catalog: manifest.catalog, files,
  });
  if (!origin) invalid();
  return origin;
}

/** Compare original imported members, never local map edits or a claimed publisher identity. */
export function compareCreatorPackageOrigins(before: unknown, after: unknown): CreatorPackageComparison {
  const original = readCreatorPackageOrigin(before), incoming = readCreatorPackageOrigin(after);
  if (!original || !incoming) throw new Error('This map has no saved original creator-package receipt. Import the original ZIP as a separate project before comparing versions.');
  const oldFiles = new Map(original.files.map(file => [file.path, file]));
  const newFiles = new Map(incoming.files.map(file => [file.path, file]));
  const files: CreatorPackageComparison['files'] = [...new Set([...oldFiles.keys(), ...newFiles.keys()])].sort().map(path => {
    const before = oldFiles.get(path), after = newFiles.get(path);
    const change = !before ? 'added' : !after ? 'removed'
      : before.sha256 === after.sha256 && before.bytes === after.bytes ? 'unchanged' : 'changed';
    return { path, change, ...(before ? { before } : {}), ...(after ? { after } : {}) };
  });
  const sameBytes = files.every(file => file.change === 'unchanged');
  if (oldFiles.get('manifest.json')?.sha256 === newFiles.get('manifest.json')?.sha256 &&
      (!sameBytes || (['packageId', 'contentVersion', 'title', 'author', 'license', 'profile', 'catalog'] as const)
        .some(key => original[key] !== incoming[key]))) invalid();
  return {
    original, incoming, files,
    samePackageId: original.packageId === incoming.packageId,
    sameBytes,
    sameVersionLabel: original.contentVersion === incoming.contentVersion,
    authorChanged: original.author !== incoming.author,
    licenseChanged: original.license !== incoming.license,
    profileChanged: original.profile !== incoming.profile,
    catalogChanged: original.catalog !== incoming.catalog,
  };
}
