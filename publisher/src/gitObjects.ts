import { createHash } from 'node:crypto';
import type { PublisherRepositorySnapshot } from './provider.ts';

export interface GitEntry { path: string; mode: '100644' | '100755' | '120000' | '160000'; sha: string }
export interface GitCommit { tree: string; parent: string | null; message: string; timestamp: number }
export interface LocalGitProvider {
  readonly kind: 'local-test';
  repository(token: string, repositoryId: number, signal: AbortSignal): Promise<PublisherRepositorySnapshot>;
  commit(token: string, repositoryId: number, sha: string, signal: AbortSignal): Promise<GitCommit>;
  tree(token: string, repositoryId: number, sha: string, signal: AbortSignal): Promise<GitEntry[]>;
  blob(token: string, repositoryId: number, sha: string, signal: AbortSignal): Promise<Uint8Array>;
  branch(token: string, repositoryId: number, branch: string, signal: AbortSignal): Promise<string | null>;
  createBlob(token: string, repositoryId: number, bytes: Uint8Array, signal: AbortSignal): Promise<string>;
  createTree(token: string, repositoryId: number, entries: readonly GitEntry[], signal: AbortSignal): Promise<string>;
  createCommit(token: string, repositoryId: number, commit: GitCommit, signal: AbortSignal): Promise<string>;
  createBranch(token: string, repositoryId: number, branch: string, sha: string, signal: AbortSignal): Promise<void>;
}
export const GIT_TREE_LIMITS = { entries: 4096, pathBytes: 512, serializedBytes: 1024 * 1024 } as const;
export const sha256 = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
export function gitObject(type: 'blob' | 'tree' | 'commit', bytes: Uint8Array): string {
  return createHash('sha1').update(`${type} ${bytes.length}\0`).update(bytes).digest('hex');
}
export function assertGitSha(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/.test(value)) throw new Error('Invalid simulated Git identity.');
}
export function checkedEntries(entries: readonly GitEntry[]): GitEntry[] {
  if (!Array.isArray(entries) || entries.length > GIT_TREE_LIMITS.entries ||
      Buffer.byteLength(JSON.stringify(entries)) > GIT_TREE_LIMITS.serializedBytes) throw new Error('The simulated repository tree exceeds its local review limit.');
  const result: GitEntry[] = [];
  const paths = new Set<string>();
  for (const item of entries) {
    if (!item || typeof item.path !== 'string' || !item.path || Buffer.byteLength(item.path) > GIT_TREE_LIMITS.pathBytes ||
        [...item.path].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 || character === '\\') ||
        item.path.split('/').some((part: string) => !part || part === '.' || part === '..') ||
        paths.has(item.path) || !['100644', '100755', '120000', '160000'].includes(item.mode)) throw new Error('Invalid simulated repository tree.');
    assertGitSha(item.sha);
    paths.add(item.path);
    result.push({ path: item.path, mode: item.mode, sha: item.sha });
  }
  for (const { path } of result) {
    const parts = path.split('/');
    for (let index = 1; index < parts.length; index++) {
      if (paths.has(parts.slice(0, index).join('/'))) throw new Error('A repository file conflicts with a directory.');
    }
  }
  return result.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
}
export function gitTree(entries: readonly GitEntry[]): string {
  const checked = checkedEntries(entries);
  function directory(prefix: string): string {
    const children = new Map<string, { mode: string; sha: string; directory: boolean }>();
    for (const entry of checked) {
      if (!entry.path.startsWith(prefix)) continue;
      const relative = entry.path.slice(prefix.length), slash = relative.indexOf('/');
      if (slash === -1) children.set(relative, { mode: entry.mode, sha: entry.sha, directory: false });
      else {
        const name = relative.slice(0, slash);
        if (!children.has(name)) children.set(name, { mode: '40000', sha: directory(prefix + name + '/'), directory: true });
      }
    }
    const sorted = [...children.entries()].sort(([a, x], [b, y]) =>
      Buffer.compare(Buffer.from(a + (x.directory ? '/' : '')), Buffer.from(b + (y.directory ? '/' : ''))));
    return gitObject('tree', Buffer.concat(sorted.flatMap(([name, entry]) =>
      [Buffer.from(`${entry.mode} ${name}\0`), Buffer.from(entry.sha, 'hex')])));
  }
  return directory('');
}
export function gitCommit(value: GitCommit): string {
  assertGitSha(value.tree);
  if (value.parent !== null) assertGitSha(value.parent);
  if (!Number.isSafeInteger(value.timestamp) || value.timestamp < 0 || value.timestamp > 100_000_000_000 ||
      typeof value.message !== 'string' || value.message.includes('\0') || Buffer.byteLength(value.message) > 4096) {
    throw new Error('Invalid simulated commit.');
  }
  const identity = `Dungeon Mapper simulation <publisher@local.invalid> ${value.timestamp} +0000`;
  return gitObject('commit', Buffer.from(`tree ${value.tree}\n${value.parent ? `parent ${value.parent}\n` : ''}author ${identity}\ncommitter ${identity}\n\n${value.message}`));
}
