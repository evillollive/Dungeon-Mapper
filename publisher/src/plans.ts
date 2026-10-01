import { randomBytes } from 'node:crypto';
import { CREATOR_PACKAGE_LIMITS, assertCreatorPackageId, isCreatorContentVersion } from '../../src/utils/creatorPackageContract.ts';
import type { PublisherRepositorySnapshot } from './provider.ts';
import { RequestError } from './errors.ts';

export interface PublicationMetadata {
  packageId: string;
  contentVersion: string;
  packageSha256: string;
  zipBytes: number;
  expandedBytes: number;
  memberCount: number;
}
export interface PlanRequest { repositoryId: number; package: PublicationMetadata }
export interface PublicationPlan {
  id: string;
  mode: 'local-prototype';
  status: 'metadata-only';
  expiresAt: number;
  package: PublicationMetadata;
  repository: PublisherRepositorySnapshot;
  branch: string;
  packageReceived: false;
  writesPerformed: false;
}
export const PLAN_TTL_MS = 10 * 60_000;
export function validRepositoryName(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?\/[a-zA-Z0-9_.-]{1,100}$/.test(value) &&
    !['.', '..'].includes(value.split('/')[1]);
}

function invalid(): never {
  throw new RequestError(400, 'invalid_plan_metadata', 'Supply only the selected repository ID and bounded package identity/size metadata. Package contents and credentials are not accepted.');
}
function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !keys.includes(key))) invalid();
  return value as Record<string, unknown>;
}
function positive(value: unknown, maximum: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0 || value > maximum) invalid();
  return value;
}
export function publicationMetadata(value: unknown): PlanRequest {
  const input = record(value, ['repositoryId', 'package']);
  const metadata = record(input.package, ['packageId', 'contentVersion', 'packageSha256', 'zipBytes', 'expandedBytes', 'memberCount']);
  if (typeof metadata.packageId !== 'string') invalid();
  try { assertCreatorPackageId(metadata.packageId); }
  catch { invalid(); }
  if (!isCreatorContentVersion(metadata.contentVersion) || typeof metadata.packageSha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(metadata.packageSha256)) invalid();
  const memberCount = positive(metadata.memberCount, CREATOR_PACKAGE_LIMITS.members);
  if (memberCount < 6) invalid();
  return {
    repositoryId: positive(input.repositoryId, Number.MAX_SAFE_INTEGER),
    package: {
      packageId: metadata.packageId, contentVersion: metadata.contentVersion, packageSha256: metadata.packageSha256,
      zipBytes: positive(metadata.zipBytes, CREATOR_PACKAGE_LIMITS.zipBytes),
      expandedBytes: positive(metadata.expandedBytes, CREATOR_PACKAGE_LIMITS.expandedBytes), memberCount,
    },
  };
}
export function reviewedRepository(value: PublisherRepositorySnapshot, requestedId: number): PublisherRepositorySnapshot {
  if (!value || value.id !== requestedId || !Number.isSafeInteger(value.installationId) || value.installationId <= 0 ||
      !validRepositoryName(value.fullName) ||
      typeof value.private !== 'boolean' || typeof value.canWrite !== 'boolean' || typeof value.defaultBranch !== 'string' ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,200}$/.test(value.defaultBranch) ||
      value.defaultBranch.includes('..') || value.defaultBranch.endsWith('.') || value.defaultBranch.endsWith('/') ||
      value.defaultBranch.split('/').some(part => !part || part.startsWith('.') || part.endsWith('.lock'))) {
    throw new RequestError(502, 'invalid_repository', 'The simulated provider returned invalid repository identity or branch metadata.');
  }
  if (!value.canWrite) throw new RequestError(403, 'repository_denied', 'The selected simulated repository does not permit this account to publish.');
  if (value.headSha === null) throw new RequestError(409, 'uninitialized_repository', 'Initialize the destination outside this publisher before planning. Repository creation is not supported.');
  if (typeof value.headSha !== 'string' || !/^[a-f0-9]{40}$/.test(value.headSha)) throw new RequestError(502, 'invalid_repository', 'The simulated provider returned an invalid base commit.');
  return { id: value.id, installationId: value.installationId, fullName: value.fullName, private: value.private,
    canWrite: value.canWrite, defaultBranch: value.defaultBranch, headSha: value.headSha };
}
export function createPublicationPlan(request: PlanRequest, repository: PublisherRepositorySnapshot,
  now: number, sessionExpiry: number): PublicationPlan {
  const id = randomBytes(32).toString('base64url');
  return {
    id, mode: 'local-prototype', status: 'metadata-only', expiresAt: Math.min(now + PLAN_TTL_MS, sessionExpiry),
    package: { ...request.package }, repository: { ...repository },
    branch: `dm-maps/${request.package.packageId}-${id.slice(0, 12)}`,
    packageReceived: false, writesPerformed: false,
  };
}
export function sameRepository(before: PublisherRepositorySnapshot, after: PublisherRepositorySnapshot): boolean {
  return (['id', 'installationId', 'fullName', 'private', 'canWrite', 'defaultBranch', 'headSha'] as const)
    .every(key => before[key] === after[key]);
}
