import { webcrypto } from 'node:crypto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  compareCreatorPackageOrigins, createCreatorPackageOrigin, readCreatorPackageOrigin,
  type CreatorPackageOrigin,
} from '../creatorPackageOrigin';
import { creatorSHA256, canonicalCreatorJSON } from '../creatorPackageFormat';
import { CREATOR_CATALOG_VERSION, type CreatorPackageManifest } from '../creatorPackage';
import { CREATOR_PACKAGE_LIMITS } from '../creatorProject';
import { decodeProject, encodeProject } from '../projectSchema';
import { createProjectCandidate, createProjectFromTemplate } from '../projectCreation';
import { creatorPackageFixture, creatorOriginFixture as origin } from '../../test/creatorPackageFixture';
function revised(): CreatorPackageOrigin {
  const value = origin();
  value.contentVersion = '1.1.0';
  value.files.find(file => file.path === 'manifest.json')!.sha256 = 'a'.repeat(64);
  return value;
}
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => vi.unstubAllGlobals());

describe('private creator import receipts', () => {
  it('captures the actual manifest identity without changing or retaining mutable manifest objects', async () => {
    const baseline = origin();
    const manifest: CreatorPackageManifest = {
      format: 'dungeon-mapper-creator-package', version: 1,
      packageId: baseline.packageId, contentVersion: baseline.contentVersion,
      title: baseline.title, author: baseline.author, license: 'CC-BY-4.0',
      profile: baseline.profile, catalog: CREATOR_CATALOG_VERSION,
      description: 'Package description', levelNames: ['Level 1'],
      members: baseline.files.filter(file => file.path !== 'manifest.json'),
    };
    const bytes = canonicalCreatorJSON(manifest);
    const receipt = await createCreatorPackageOrigin(manifest, bytes);
    expect(receipt.files.find(file => file.path === 'manifest.json')).toEqual({
      path: 'manifest.json', bytes: bytes.length, sha256: await creatorSHA256(bytes),
    });
    manifest.members[0].sha256 = 'f'.repeat(64);
    expect(receipt.files.find(file => file.path === manifest.members[0].path)?.sha256).not.toBe('f'.repeat(64));
    expect(receipt).not.toHaveProperty('description');
  });

  it('preserves receipts, including unsupported future data, in ordinary private backups', () => {
    const source = creatorPackageFixture();
    const receipt = origin();
    source.creatorPackageOrigin = receipt;
    expect(decodeProject(encodeProject(source)).creatorPackageOrigin).toEqual(receipt);
    source.name = 'Locally renamed';
    source.levels[0].tiles[0][0].type = 'wall';
    expect(source.creatorPackageOrigin).toEqual(receipt);
    const future = { version: 99, futurePrivateData: 'retain exactly' };
    source.creatorPackageOrigin = future;
    expect(decodeProject(encodeProject(source)).creatorPackageOrigin).toEqual(future);
    expect(() => readCreatorPackageOrigin(future)).toThrow('unsupported or damaged');
  });

  it('does not infer an import receipt for older projects', () => {
    expect(readCreatorPackageOrigin(undefined)).toBeUndefined();
    expect(() => compareCreatorPackageOrigins(undefined, origin())).toThrow('original ZIP');
  });

  it('does not give newly created blank or template projects the parent package comparison identity', () => {
    const source = creatorPackageFixture();
    source.creatorPackageOrigin = origin();
    const blank = createProjectCandidate({ path: 'blank', name: 'Independent', width: 16, height: 16, themeId: 'dungeon' }, source);
    const template = createProjectFromTemplate(source, source.sceneTemplates![0].id);
    expect(blank.creatorPackageOrigin).toBeUndefined();
    expect(template.creatorPackageOrigin).toBeUndefined();
    expect(source.creatorPackageOrigin).toEqual(origin());
  });

  it.each([
    (value: CreatorPackageOrigin) => { Object.assign(value, { version: 99 }); },
    (value: CreatorPackageOrigin) => { value.packageId = '../private'; },
    (value: CreatorPackageOrigin) => { value.contentVersion = 'not-a-version'; },
    (value: CreatorPackageOrigin) => { value.files.pop(); },
    (value: CreatorPackageOrigin) => { value.files.push(value.files[0]); },
    (value: CreatorPackageOrigin) => { value.files[0].sha256 = 'invalid'; },
    (value: CreatorPackageOrigin) => { value.files[0].bytes = Infinity; },
    (value: CreatorPackageOrigin) => { value.files[0].bytes = 0; },
    (value: CreatorPackageOrigin) => { value.files[0].bytes = CREATOR_PACKAGE_LIMITS.expandedBytes; },
    (value: CreatorPackageOrigin) => { value.files.find(file => file.path === 'map.json')!.bytes = CREATOR_PACKAGE_LIMITS.mapBytes + 1; },
    (value: CreatorPackageOrigin) => { value.files[0].path = '.github/workflows/ci.yml'; },
    (value: CreatorPackageOrigin) => { Object.assign(value, { credential: 'not a recognized receipt field' }); },
  ])('rejects malformed receipts without silently inventing a comparison baseline', mutate => {
    const receipt = origin();
    mutate(receipt);
    expect(() => readCreatorPackageOrigin(receipt)).toThrow();
  });

  it('bounds the number of stored member identities', () => {
    const receipt = origin();
    receipt.files = Array.from({ length: 257 }, (_, index) => ({
      path: `assets/${index.toString(16).padStart(64, '0')}.png`, bytes: 1, sha256: 'a'.repeat(64),
    }));
    expect(() => readCreatorPackageOrigin(receipt)).toThrow();
  });
});

describe('offline comparison of original package members', () => {
  it('compares bytes independently of member ordering or current local edits', () => {
    const before = origin(), after = origin();
    after.files.reverse();
    const result = compareCreatorPackageOrigins(before, after);
    expect(result.sameBytes).toBe(true);
    expect(result.samePackageId).toBe(true);
    expect(result.sameVersionLabel).toBe(true);
    expect(result.files.every(file => file.change === 'unchanged')).toBe(true);
    before.files[0].sha256 = 'b'.repeat(64);
    expect(result.original.files.find(file => file.path === 'manifest.json')!.sha256).toBe('0'.repeat(64));
  });

  it('reports added, removed and changed files without applying them to either receipt', () => {
    const before = origin(), after = revised();
    const removed = `assets/${'c'.repeat(64)}.png`, added = `assets/${'d'.repeat(64)}.png`;
    before.files.push({ path: removed, bytes: 30, sha256: 'c'.repeat(64) });
    after.files.push({ path: added, bytes: 40, sha256: 'd'.repeat(64) });
    after.files.find(file => file.path === 'map.json')!.sha256 = 'e'.repeat(64);
    const snapshots = structuredClone({ before, after });
    const result = compareCreatorPackageOrigins(before, after);
    expect(result.sameBytes).toBe(false);
    expect(result.sameVersionLabel).toBe(false);
    expect(result.files.find(file => file.path === removed)?.change).toBe('removed');
    expect(result.files.find(file => file.path === added)?.change).toBe('added');
    expect(result.files.find(file => file.path === 'map.json')?.change).toBe('changed');
    expect({ before, after }).toEqual(snapshots);
  });

  it('does not mistake an unchanged version label for unchanged content', () => {
    const after = revised();
    after.contentVersion = '1.0.0';
    after.files.find(file => file.path === 'README.md')!.sha256 = 'e'.repeat(64);
    const result = compareCreatorPackageOrigins(origin(), after);
    expect(result.sameVersionLabel).toBe(true);
    expect(result.sameBytes).toBe(false);
  });

  it('flags changed declarations without authenticating a publisher or imposing version ordering', () => {
    const after = revised();
    after.contentVersion = '0.5.0';
    after.author = 'Different declared creator';
    after.license = 'AGPL-3.0-or-later';
    after.profile = 'encounter';
    after.catalog = 'a-later-catalog';
    const result = compareCreatorPackageOrigins(origin(), after);
    expect(result).toMatchObject({
      sameVersionLabel: false, authorChanged: true, licenseChanged: true, profileChanged: true, catalogChanged: true,
    });
    expect(result).not.toHaveProperty('newer');
    after.packageId = 'another-package';
    expect(compareCreatorPackageOrigins(origin(), after).samePackageId).toBe(false);
  });

  it('rejects contradictory private receipts sharing the same manifest identity', () => {
    const changedMetadata = origin();
    changedMetadata.author = 'Tampered private metadata';
    expect(() => compareCreatorPackageOrigins(origin(), changedMetadata)).toThrow('damaged');
    const changedFile = origin();
    changedFile.files.find(file => file.path === 'map.json')!.sha256 = 'f'.repeat(64);
    expect(() => compareCreatorPackageOrigins(origin(), changedFile)).toThrow('damaged');
  });
});
