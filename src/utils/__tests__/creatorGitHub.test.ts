import { createHash, webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCreatorGitHubPackage, parseCreatorGitHubLink } from '../creatorGitHub';
import { CREATOR_REQUIRED_FILES } from '../creatorPackageFormat';

const prefix = 'https://api.github.com/repos/fixture/maps';
const link = 'https://github.com/fixture/maps/tree/main/maps/vault';
const commit = 'a'.repeat(40), root = 'b'.repeat(40), maps = 'c'.repeat(40), folder = 'd'.repeat(40);
const signal = () => new AbortController().signal;
const encode = (value: string) => new TextEncoder().encode(value);
type JSONValue = Record<string, unknown>;
const json = (value: JSONValue) => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
function fixture() {
  const blobs = new Map<string, Uint8Array<ArrayBuffer>>();
  const entries = CREATOR_REQUIRED_FILES.map(path => {
    const bytes = encode(`transport fixture only: ${path}`);
    const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    blobs.set(sha, bytes);
    return { path, sha, type: 'blob', mode: '100644', size: bytes.length };
  });
  const metadata = new Map<string, JSONValue>([
    [prefix, { id: 42, private: false, full_name: 'fixture/maps' }],
    [`${prefix}/commits/main`, { sha: commit, commit: { tree: { sha: root } } }],
    [`${prefix}/git/trees/${root}`, { sha: root, truncated: false, tree: [{ path: 'maps', sha: maps, mode: '040000', type: 'tree' }] }],
    [`${prefix}/git/trees/${maps}`, { sha: maps, truncated: false, tree: [{ path: 'vault', sha: folder, mode: '040000', type: 'tree' }] }],
    [`${prefix}/git/trees/${folder}`, { sha: folder, truncated: false, tree: entries }],
  ]);
  const fetcher = vi.fn<(input: string | URL | Request, options?: RequestInit) => Promise<Response>>(async input => {
    const url = String(input);
    if (metadata.has(url)) return json(metadata.get(url)!);
    const sha = url.slice(`${prefix}/git/blobs/`.length);
    if (url.startsWith(`${prefix}/git/blobs/`) && blobs.has(sha)) return new Response(blobs.get(sha)!);
    throw new Error('Unexpected mocked GitHub request: ' + url);
  });
  vi.stubGlobal('fetch', fetcher);
  return { fetcher, metadata, blobs, entries };
}
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('explicit public package links', () => {
  it.each([
    ['https://github.com/fixture/maps/tree/main/maps/vault', 'main'],
    ['https://github.com/fixture/maps/blob/feature/map-pack/maps/vault/manifest.json', 'feature/map-pack'],
    [`https://github.com/fixture/maps/tree/${commit}/maps/vault/`, commit],
  ])('parses %s without treating slash-containing refs as paths', (url, ref) => {
    expect(parseCreatorGitHubLink(url)).toEqual({ owner: 'fixture', repo: 'maps', ref, packageId: 'vault', path: 'maps/vault' });
  });

  it.each([
    'http://github.com/fixture/maps/tree/main/maps/vault',
    'https://github.com.example.org/fixture/maps/tree/main/maps/vault',
    'https://user:token@github.com/fixture/maps/tree/main/maps/vault',
    link + '?token=secret', link + '#tracking',
    'https://github.com/fixture/maps',
    'https://github.com/fixture/maps/tree/main/maps/vault/extra',
    'https://github.com/fixture/maps/tree/main/../main/maps/vault',
    'https://github.com/fixture/maps/tree/main/%2e%2e/main/maps/vault',
    'https://github.com/fixture/maps/tree/branch%2Fname/maps/vault',
    'https://github.com/fixture/maps/tree/main/maps/.hidden',
    'https://github.com/fixture/maps/blob/main/maps/vault/README.md',
    ' ' + link,
  ])('rejects unsafe or ambiguous link %s', url => {
    expect(() => parseCreatorGitHubLink(url)).toThrow();
  });
});

describe('mocked immutable GitHub package transport', () => {
  it('resolves the branch once, verifies every Git blob and returns a pinned source without credentials', async () => {
    const { fetcher, blobs } = fixture();
    const result = await fetchCreatorGitHubPackage(link, signal());
    expect(result.source).toEqual({
      repositoryId: 42, fullName: 'fixture/maps', commit, path: 'maps/vault',
      url: `https://github.com/fixture/maps/tree/${commit}/maps/vault`,
    });
    expect(result.files).toHaveLength(6);
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes('/commits/'))).toHaveLength(1);
    for (const [url, options] of fetcher.mock.calls) {
      expect(String(url)).toMatch(/^https:\/\/api\.github\.com\/repos\/fixture\/maps/);
      expect(options).toMatchObject({ method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer' });
      expect(new Headers(options?.headers).has('authorization')).toBe(false);
      expect(new Headers(options?.headers).get('x-github-api-version')).toBe('2026-03-10');
    }
    for (const file of result.files) {
      const identity = createHash('sha1').update(`blob ${file.bytes.length}\0`).update(file.bytes).digest('hex');
      expect([...file.bytes]).toEqual([...blobs.get(identity)!]);
    }
  });

  it.each([403, 404, 429, 500])('surfaces HTTP %i without retry loops', async status => {
    const { fetcher } = fixture();
    fetcher.mockResolvedValueOnce(new Response('failure', { status }));
    await expect(fetchCreatorGitHubPackage(link, signal())).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each([
    { private: true, id: 42, full_name: 'fixture/maps' },
    { private: false, id: 0, full_name: 'fixture/maps' },
    { private: false, id: 42, full_name: 'different/repo' },
  ])('rejects private or mismatched repository identity', async repository => {
    const { metadata, fetcher } = fixture();
    metadata.set(prefix, repository);
    await expect(fetchCreatorGitHubPackage(link, signal())).rejects.toThrow('selected public repository');
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('rejects truncated or mismatched immutable trees', async () => {
    for (const changed of [{ sha: root, truncated: true, tree: [] }, { sha: folder, truncated: false, tree: [] }]) {
      const { metadata } = fixture();
      metadata.set(`${prefix}/git/trees/${root}`, changed);
      await expect(fetchCreatorGitHubPackage(link, signal())).rejects.toThrow('incomplete or mismatched tree');
    }
  });

  it.each([
    { mode: '120000' }, { mode: '100755' }, { type: 'commit', mode: '160000' },
    { path: '../map.json' }, { size: 65 * 1024 * 1024 }, { size: -1 },
  ])('rejects unsupported package entries before reading blobs', async patch => {
    const { metadata, entries, fetcher } = fixture();
    metadata.set(`${prefix}/git/trees/${folder}`, { sha: folder, truncated: false, tree: [{ ...entries[0], ...patch }, ...entries.slice(1)] });
    await expect(fetchCreatorGitHubPackage(link, signal())).rejects.toThrow();
    expect(fetcher.mock.calls.some(([url]) => String(url).includes('/git/blobs/'))).toBe(false);
  });

  it('rejects mismatched blob bytes even when the size matches', async () => {
    const { blobs, entries } = fixture();
    blobs.set(entries[0].sha, new Uint8Array(entries[0].size).fill(90));
    await expect(fetchCreatorGitHubPackage(link, signal())).rejects.toThrow('Git identity');
  });

  it('enforces response size against actual streamed bytes, not just headers', async () => {
    const { fetcher } = fixture();
    let cancelled = false;
    fetcher.mockResolvedValueOnce(new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(2 * 1024 * 1024 + 1)); },
      cancel() { cancelled = true; },
    })));
    await expect(fetchCreatorGitHubPackage(link, signal())).rejects.toThrow('actual GitHub response');
    expect(cancelled).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('rejects malformed metadata and redirected responses', async () => {
    const { fetcher } = fixture();
    fetcher.mockResolvedValueOnce(new Response('{broken'));
    await expect(fetchCreatorGitHubPackage(link, signal())).rejects.toThrow('malformed JSON');
    const redirected = json({ id: 42, private: false, full_name: 'fixture/maps' });
    Object.defineProperty(redirected, 'redirected', { value: true });
    fetcher.mockResolvedValueOnce(redirected);
    await expect(fetchCreatorGitHubPackage(link, signal())).rejects.toThrow('redirected');
  });

  it('cancels an in-flight operation and never returns partial member files', async () => {
    const { fetcher } = fixture();
    fetcher.mockImplementationOnce(async (_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(options.signal!.reason), { once: true });
    }));
    const controller = new AbortController();
    const pending = fetchCreatorGitHubPackage(link, controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('bounds the entire operation deadline rather than restarting a timer for each request', async () => {
    vi.useFakeTimers();
    const { fetcher } = fixture();
    fetcher.mockImplementationOnce(async (_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(options.signal!.reason), { once: true });
    }));
    const result = expect(fetchCreatorGitHubPackage(link, signal())).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(120_000);
    await result;
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
