import assert from 'node:assert/strict';
import test from 'node:test';
import { CREATOR_PACKAGE_LIMITS } from '../../src/utils/creatorPackageContract.ts';
import { publicationMetadata, reviewedRepository, createPublicationPlan, PLAN_TTL_MS } from '../src/plans.ts';
import { TestProvider } from './provider.ts';

export const metadata = () => ({
  repositoryId: 2001,
  package: { packageId: 'reviewed-vault', contentVersion: '1.0.0', packageSha256: 'b'.repeat(64),
    zipBytes: 1000, expandedBytes: 2000, memberCount: 7 },
});

test('metadata contract shares the editor limits, including exact upper boundaries', () => {
  assert.deepEqual(publicationMetadata(metadata()), metadata());
  const value = metadata();
  Object.assign(value.package, {
    zipBytes: CREATOR_PACKAGE_LIMITS.zipBytes,
    expandedBytes: CREATOR_PACKAGE_LIMITS.expandedBytes, memberCount: CREATOR_PACKAGE_LIMITS.members,
  });
  assert.deepEqual(publicationMetadata(value), value);
  for (const [key, maximum] of Object.entries({
    zipBytes: CREATOR_PACKAGE_LIMITS.zipBytes, expandedBytes: CREATOR_PACKAGE_LIMITS.expandedBytes,
    memberCount: CREATOR_PACKAGE_LIMITS.members,
  })) for (const invalid of [0, -1, 0.5, maximum + 1, NaN, Infinity, '1', null, undefined]) {
    const value = metadata();
    Object.assign(value.package, { [key]: invalid });
    assert.throws(() => publicationMetadata(value), { status: 400 }, `${key}=${invalid}`);
  }
});

test('metadata excludes package contents and rejects ambiguous identifiers and missing fields', () => {
  for (const invalid of [null, [], 'ZIP', {}, { ...metadata(), accessToken: 'not-accepted' },
    { ...metadata(), package: { ...metadata().package, title: 'not-accepted' } },
    { ...metadata(), package: { ...metadata().package, bytes: [1, 2, 3] } }]) {
    assert.throws(() => publicationMetadata(invalid), { status: 400 });
  }
  for (const [key, invalid] of [
    ['packageId', '../vault'], ['packageId', ''], ['packageId', 'X'],
    ['contentVersion', 'v1 with spaces'], ['contentVersion', ''], ['contentVersion', 'a'.repeat(65)],
    ['packageSha256', 'B'.repeat(64)], ['packageSha256', 'b'.repeat(63)], ['memberCount', 5],
  ]) {
    const value = metadata();
    Object.assign(value.package, { [String(key)]: invalid });
    assert.throws(() => publicationMetadata(value), { status: 400 });
  }
  for (const repositoryId of [0, -1, 0.5, NaN, Infinity, '2001', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => publicationMetadata({ ...metadata(), repositoryId }), { status: 400 });
  }
  for (const key of Object.keys(metadata().package)) {
    const value = metadata();
    Reflect.deleteProperty(value.package, key);
    assert.throws(() => publicationMetadata(value), { status: 400 });
  }
});

test('repository snapshots require a writable, initialized, well-formed destination', () => {
  const snapshot = { ...new TestProvider().repositoryState, fullName: 'fixture-creator/synthetic-maps' };
  for (const [key, value, status] of [
    ['id', 9999, 502], ['installationId', 0, 502], ['fullName', '../map', 502],
    ['private', 'true', 502], ['canWrite', false, 403], ['headSha', null, 409],
    ['headSha', ['a'.repeat(40)], 502], ['headSha', 'invalid', 502],
    ...['.branch', 'a..b', 'a.lock/b', 'a//b', 'a.', 'a/', 'a b'].map(value => ['defaultBranch', value, 502]),
  ]) {
    const candidate = { ...snapshot };
    Object.assign(candidate, { [String(key)]: value });
    assert.throws(() => reviewedRepository(candidate, 2001), { status });
  }
  assert.deepEqual(reviewedRepository({ ...snapshot }, 2001), snapshot);
  const extra = { ...snapshot, token: 'must-not-leak' };
  assert(!('token' in reviewedRepository(extra, 2001)));
  const plan = createPublicationPlan(metadata(), snapshot, 1000, 2000);
  assert.equal(plan.expiresAt, 2000);
  assert.equal(createPublicationPlan(metadata(), snapshot, 1000, 1_000_000).expiresAt, 1000 + PLAN_TTL_MS);
  assert.match(plan.id, /^[A-Za-z0-9_-]{43}$/);
  assert.match(plan.branch, /^dm-maps\/reviewed-vault-[A-Za-z0-9_-]{12}$/);
  assert.equal(plan.status, 'metadata-only');
  assert.equal(plan.packageReceived, false);
  assert.equal(plan.writesPerformed, false);
});
