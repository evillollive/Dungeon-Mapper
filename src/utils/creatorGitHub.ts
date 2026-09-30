import { assertCreatorMemberPath, assertCreatorMembers, assertCreatorPackageId, type CreatorPackageFile } from './creatorPackageFormat';
import { CREATOR_PACKAGE_LIMITS } from './creatorProject';

const API = 'https://api.github.com';
const JSON_LIMIT = 2 * 1024 * 1024;
const OPERATION_MS = 120_000;
const API_VERSION = '2026-03-10';
const shaPattern = /^[a-f0-9]{40}$/;

export interface CreatorGitHubLink { owner: string; repo: string; ref: string; packageId: string; path: string }
export interface CreatorGitHubSource {
  repositoryId: number;
  fullName: string;
  commit: string;
  path: string;
  url: string;
}
export function parseCreatorGitHubLink(input: string): CreatorGitHubLink {
  if (typeof input !== 'string' || input.length > 2048 || input !== input.trim() ||
      /[%\\]|(?:^|\/)\.{1,2}(?:\/|$)/.test(input) || !URL.canParse(input)) throw new Error('Provide a plain GitHub package-folder or manifest link without encoded or parent paths.');
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password ||
      url.search || url.hash || /%|\\/.test(url.pathname)) throw new Error('Use a plain HTTPS github.com link without encoded paths, query parameters or credentials.');
  const parts = url.pathname.replace(/\/$/, '').split('/').slice(1);
  const [owner, repo, kind] = parts;
  if (!owner || !repo || !/^[a-zA-Z0-9-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(repo) ||
      ['.', '..'].includes(repo) || !['tree', 'blob'].includes(kind)) throw new Error('Link to a GitHub package folder or its manifest.json, not a repository root.');
  const mapIndex = parts.lastIndexOf('maps');
  const expectedLength = kind === 'blob' ? mapIndex + 3 : mapIndex + 2;
  if (mapIndex < 4 || parts.length !== expectedLength || (kind === 'blob' && parts.at(-1) !== 'manifest.json')) {
    throw new Error('Creator GitHub links must identify maps/<package-id> or its manifest.json.');
  }
  const ref = parts.slice(3, mapIndex).join('/');
  if (!ref || ref.length > 256 || /[\s~^:?*[\]\\]/.test(ref) || ref.includes('..') || ref.includes('@{') ||
      ref.startsWith('.') || ref.endsWith('.') || ref.endsWith('.lock') || ref.split('/').some(part => !part || part.startsWith('.'))) {
    throw new Error('The GitHub branch, tag or commit reference is unsupported.');
  }
  const packageId = parts[mapIndex + 1];
  assertCreatorPackageId(packageId);
  return { owner, repo, ref, packageId, path: `maps/${packageId}` };
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`GitHub returned invalid ${label} metadata.`);
  return value as Record<string, unknown>;
}
function sha(value: unknown): string {
  if (typeof value !== 'string' || !shaPattern.test(value)) throw new Error('GitHub returned an invalid immutable object identity.');
  return value;
}
interface TreeEntry { path: string; mode: string; type: string; sha: string; size?: number }

/** Unauthenticated read-only transport. Call package inspection before showing or importing its contents. */
export async function fetchCreatorGitHubPackage(link: string, signal: AbortSignal): Promise<{
  source: CreatorGitHubSource; files: CreatorPackageFile[];
}> {
  signal.throwIfAborted();
  if (!globalThis.crypto?.subtle) throw new Error('Public GitHub package verification requires a secure browser context.');
  const location = parseCreatorGitHubLink(link);
  const controller = new AbortController();
  const cancel = () => controller.abort(signal.reason);
  signal.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => controller.abort(new Error('The GitHub package read timed out. Retry explicitly; no project was changed.')), OPERATION_MS);
  const prefix = `/repos/${encodeURIComponent(location.owner)}/${encodeURIComponent(location.repo)}`;
  let requests = 0;
  async function request(path: string, limit: number, raw = false): Promise<Uint8Array<ArrayBuffer>> {
    controller.signal.throwIfAborted();
    if (++requests > CREATOR_PACKAGE_LIMITS.members + 6) throw new Error('The GitHub package exceeded the bounded request count.');
    const response = await fetch(API + path, {
      method: 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-store',
      headers: { Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'X-GitHub-Api-Version': API_VERSION },
      signal: controller.signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 403 || response.status === 429) throw new Error('GitHub denied or rate-limited this public read. Wait and retry explicitly; no project was changed.');
      if (response.status === 404) throw new Error('This public GitHub package or revision is unavailable. Private repositories are not supported.');
      throw new Error(`GitHub package read failed with HTTP ${response.status}. No project was changed.`);
    }
    if (response.redirected || (response.url && !response.url.startsWith(API + '/'))) {
      await response.body?.cancel();
      throw new Error('A GitHub response redirected away from the approved API origin.');
    }
    const declared = response.headers.get('content-length');
    if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > limit)) {
      await response.body?.cancel();
      throw new Error('The GitHub response exceeds the supported byte limit.');
    }
    if (!response.body) throw new Error('GitHub returned an empty response body.');
    const reader = response.body.getReader(), chunks: Uint8Array<ArrayBuffer>[] = [];
    let count = 0;
    try {
      while (true) {
        controller.signal.throwIfAborted();
        const { done, value } = await reader.read();
        if (done) break;
        if (value.byteLength > limit - count) {
          await reader.cancel();
          throw new Error('The actual GitHub response exceeds the supported byte limit.');
        }
        count += value.byteLength;
        chunks.push(new Uint8Array(value));
      }
    } finally { reader.releaseLock(); }
    controller.signal.throwIfAborted();
    const bytes = new Uint8Array(count);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  }
  async function metadata(path: string): Promise<Record<string, unknown>> {
    const bytes = await request(path, JSON_LIMIT);
    try { return object(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), 'response'); }
    catch (error) {
      if (!(error instanceof SyntaxError || error instanceof TypeError)) throw error;
      throw new Error('GitHub returned malformed JSON metadata.', { cause: error });
    }
  }
  async function tree(identity: string): Promise<TreeEntry[]> {
    const data = await metadata(`${prefix}/git/trees/${identity}`);
    if (data.sha !== identity || data.truncated !== false || !Array.isArray(data.tree)) throw new Error('GitHub returned an incomplete or mismatched tree.');
    const seen = new Set<string>();
    return data.tree.map(value => {
      const entry = object(value, 'tree entry');
      if (typeof entry.path !== 'string' || entry.path.includes('/') || seen.has(entry.path.toLowerCase()) ||
          typeof entry.type !== 'string' || typeof entry.mode !== 'string') throw new Error('GitHub returned ambiguous tree paths.');
      seen.add(entry.path.toLowerCase());
      if (entry.size !== undefined && (typeof entry.size !== 'number' || !Number.isSafeInteger(entry.size) || entry.size < 0)) throw new Error('GitHub returned invalid object sizes.');
      return { path: entry.path, type: entry.type, mode: entry.mode, sha: sha(entry.sha), ...(entry.size === undefined ? {} : { size: entry.size as number }) };
    });
  }
  try {
    const repository = await metadata(prefix);
    if (repository.private !== false || typeof repository.id !== 'number' || !Number.isSafeInteger(repository.id) || repository.id <= 0 ||
        typeof repository.full_name !== 'string' || repository.full_name.toLowerCase() !== `${location.owner}/${location.repo}`.toLowerCase()) {
      throw new Error('Only the explicitly selected public repository may be read.');
    }
    const resolved = await metadata(`${prefix}/commits/${encodeURIComponent(location.ref)}`);
    const commit = sha(resolved.sha);
    if (shaPattern.test(location.ref) && location.ref !== commit) throw new Error('The requested commit identity changed.');
    let identity = sha(object(object(resolved.commit, 'commit').tree, 'commit tree').sha);
    for (const segment of ['maps', location.packageId]) {
      const entry = (await tree(identity)).find(entry => entry.path === segment);
      if (!entry || entry.type !== 'tree' || entry.mode !== '040000') throw new Error('The selected creator package folder is missing or is not a regular Git tree.');
      identity = entry.sha;
    }
    const entries = await tree(identity), filesToRead: TreeEntry[] = [];
    for (const entry of entries) {
      if (entry.path === 'assets' && entry.type === 'tree' && entry.mode === '040000') {
        for (const asset of await tree(entry.sha)) filesToRead.push({ ...asset, path: `assets/${asset.path}` });
      } else filesToRead.push(entry);
    }
    if (filesToRead.length > CREATOR_PACKAGE_LIMITS.members) throw new Error('The GitHub package exceeds 256 files.');
    let total = 0;
    for (const entry of filesToRead) {
      assertCreatorMemberPath(entry.path);
      if (entry.type !== 'blob' || entry.mode !== '100644' || entry.size === undefined || entry.size <= 0) {
        throw new Error('GitHub packages may contain only ordinary non-executable files, not symlinks or submodules.');
      }
      if (entry.size > CREATOR_PACKAGE_LIMITS.expandedBytes - total ||
          (entry.path === 'map.json' && entry.size > CREATOR_PACKAGE_LIMITS.mapBytes)) throw new Error('The GitHub package exceeds its expanded byte budget.');
      total += entry.size;
    }
    const files: CreatorPackageFile[] = [];
    for (const entry of filesToRead) {
      const bytes = await request(`${prefix}/git/blobs/${entry.sha}`, entry.size!, true);
      if (bytes.length !== entry.size) throw new Error('GitHub blob bytes disagree with their pinned tree size.');
      // Verify Git's object identity as well as the package's later SHA-256 manifest.
      const header = new TextEncoder().encode(`blob ${bytes.length}\0`);
      const objectBytes = new Uint8Array(header.length + bytes.length);
      objectBytes.set(header); objectBytes.set(bytes, header.length);
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', objectBytes));
      const actual = Array.from(digest, value => value.toString(16).padStart(2, '0')).join('');
      if (actual !== entry.sha) throw new Error('GitHub blob bytes disagree with their immutable Git identity.');
      files.push({ path: entry.path, bytes });
    }
    controller.signal.throwIfAborted();
    assertCreatorMembers(files);
    return {
      source: {
        repositoryId: repository.id, fullName: repository.full_name, commit, path: location.path,
        url: `https://github.com/${repository.full_name}/tree/${commit}/${location.path}`,
      },
      files,
    };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
    controller.abort();
  }
}
