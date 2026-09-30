import { CREATOR_PACKAGE_LIMITS } from './creatorProject';

export const CREATOR_PACKAGE_FORMAT = 'dungeon-mapper-creator-package';
export const CREATOR_MAP_FORMAT = 'dungeon-mapper-creator-map';
export const CREATOR_FORMAT_VERSION = 1;
export const CREATOR_REQUIRED_FILES = [
  'manifest.json', 'map.json', 'preview.png', 'README.md', 'LICENSE.txt', 'ATTRIBUTION.json',
] as const;

export interface CreatorPackageFile {
  path: string;
  bytes: Uint8Array<ArrayBuffer>;
}
export interface CreatorMemberIdentity {
  path: string;
  bytes: number;
  sha256: string;
}

export function assertCreatorPackageId(value: string): void {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(value)) {
    throw new Error('A creator package ID must contain 1 to 64 lowercase letters, digits or hyphens, starting with a letter or digit.');
  }
}

export function assertCreatorMemberPath(path: string): void {
  if (typeof path !== 'string' || (!CREATOR_REQUIRED_FILES.some(file => file === path) &&
      !/^preview-(?:0[2-9]|[12]\d|3[0-2])\.png$/.test(path) &&
      !/^assets\/[a-f0-9]{64}\.(?:png|jpg|webp|svg)$/.test(path))) {
    throw new Error('The creator package contains an unsupported or unsafe member path.');
  }
}

export function assertCreatorMembers(files: readonly CreatorPackageFile[], complete = true): number {
  if (files.length > CREATOR_PACKAGE_LIMITS.members) throw new Error('A creator package cannot contain more than 256 files.');
  const seen = new Set<string>();
  let total = 0;
  for (const file of files) {
    assertCreatorMemberPath(file.path);
    if (seen.has(file.path)) throw new Error('A creator package contains duplicate file paths.');
    seen.add(file.path);
    if (!ArrayBuffer.isView(file.bytes) || Object.prototype.toString.call(file.bytes) !== '[object Uint8Array]' ||
        file.bytes.byteLength === 0) throw new Error('Creator package files must contain bytes.');
    if (file.bytes.byteLength > CREATOR_PACKAGE_LIMITS.expandedBytes - total) throw new Error('The creator package exceeds 64 MiB of expanded files.');
    if (file.path === 'map.json' && file.bytes.byteLength > CREATOR_PACKAGE_LIMITS.mapBytes) throw new Error('The creator map JSON exceeds 16 MiB.');
    total += file.bytes.byteLength;
  }
  if (complete && CREATOR_REQUIRED_FILES.some(path => !seen.has(path))) throw new Error('The creator package is missing required files.');
  return total;
}

export function canonicalCreatorJSON(value: unknown): Uint8Array<ArrayBuffer> {
  const ancestors = new Set<object>();
  function normalize(input: unknown, depth: number): unknown {
    if (depth > CREATOR_PACKAGE_LIMITS.depth) throw new Error('Creator package metadata exceeds the nesting limit.');
    if (input === undefined || input === null || typeof input === 'string' || typeof input === 'boolean') return input;
    if (typeof input === 'number' && Number.isFinite(input)) return input;
    if (typeof input !== 'object') throw new Error('Creator package metadata must contain portable JSON values.');
    if (ancestors.has(input)) throw new Error('Creator package metadata must not contain cycles.');
    const prototype = Object.getPrototypeOf(input);
    if (!Array.isArray(input) && prototype !== Object.prototype && prototype !== null) {
      throw new Error('Creator package metadata must contain plain JSON objects.');
    }
    if (Object.getOwnPropertySymbols(input).length) throw new Error('Creator package metadata must use string keys.');
    ancestors.add(input);
    let output: unknown;
    if (Array.isArray(input)) {
      output = Array.from(input, item => {
        if (item === undefined) throw new Error('Creator package arrays must not contain missing values.');
        return normalize(item, depth + 1);
      });
    } else {
      output = Object.fromEntries(Object.entries(input).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, normalize(value, depth + 1)]));
    }
    ancestors.delete(input);
    return output;
  }
  const normalized = normalize(value, 0);
  if (normalized === undefined) throw new Error('Creator package metadata is missing.');
  return new TextEncoder().encode(JSON.stringify(normalized) + '\n');
}

export async function creatorSHA256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('Creator package hashing requires a secure browser context.');
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function creatorMemberIdentities(files: readonly CreatorPackageFile[]): Promise<CreatorMemberIdentity[]> {
  assertCreatorMembers(files, false);
  const identities: CreatorMemberIdentity[] = [];
  for (const file of [...files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)) {
    if (file.path === 'manifest.json') throw new Error('A creator manifest cannot include its own hash.');
    identities.push({ path: file.path, bytes: file.bytes.byteLength, sha256: await creatorSHA256(file.bytes) });
  }
  return identities;
}
