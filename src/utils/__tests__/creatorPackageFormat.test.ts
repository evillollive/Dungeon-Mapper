import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AsyncZipDeflate, unzipSync } from 'fflate';
import {
  assertCreatorMembers, assertCreatorMemberPath, canonicalCreatorJSON,
  creatorMemberIdentities, creatorSHA256, CREATOR_REQUIRED_FILES, type CreatorPackageFile,
} from '../creatorPackageFormat';
import { encodeCreatorZip } from '../creatorZip';
import { CREATOR_PACKAGE_LIMITS } from '../creatorProject';

// These exercise byte transport, not a complete licensed package or its importer.
function transportFiles(): CreatorPackageFile[] {
  return CREATOR_REQUIRED_FILES.map(path => ({ path, bytes: new TextEncoder().encode(`transport fixture: ${path}`) }));
}
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('creator member format', () => {
  it('canonicalizes object keys and absent fields without changing array order', () => {
    const input = { z: 3, a: { second: undefined, first: 'text' }, levels: [2, 1] };
    const bytes = canonicalCreatorJSON(input);
    expect(new TextDecoder().decode(bytes)).toBe('{"a":{"first":"text"},"levels":[2,1],"z":3}\n');
    expect(canonicalCreatorJSON({ levels: [2, 1], a: { first: 'text' }, z: 3 })).toEqual(bytes);
    expect(input.a).toHaveProperty('second', undefined);
  });

  it.each([NaN, Infinity, new Date(0), [undefined], Array(2), { value: () => 1 }])(
    'rejects values that JSON would silently lose or change', input => {
      expect(() => canonicalCreatorJSON(input)).toThrow();
    });

  it('rejects cycles, symbol keys and excessive nesting', () => {
    const cycle: { next?: unknown } = {};
    cycle.next = cycle;
    expect(() => canonicalCreatorJSON(cycle)).toThrow('cycles');
    expect(() => canonicalCreatorJSON({ [Symbol('hidden')]: true })).toThrow('string keys');
    let deep: unknown = 'value';
    for (let i = 0; i < 33; i++) deep = { value: deep };
    expect(() => canonicalCreatorJSON(deep)).toThrow('nesting');
  });

  it.each(['../map.json', '/map.json', 'assets/../../secret', 'assets\\secret.png',
    '.github/workflows/ci.yml', 'readme.md', 'preview-33.png', 'map.json\u0000', 'assets/not-a-hash.svg'])(
    'rejects unsafe or undeclared member paths: %s', path => {
      expect(() => assertCreatorMemberPath(path)).toThrow('path');
    });

  it('requires the complete member set, uniqueness and nonempty bytes', () => {
    const files = transportFiles();
    expect(assertCreatorMembers(files)).toBe(files.reduce((sum, file) => sum + file.bytes.length, 0));
    expect(() => assertCreatorMembers(files.slice(1))).toThrow('required');
    expect(() => assertCreatorMembers([...files, files[0]])).toThrow('duplicate');
    expect(() => assertCreatorMembers([{ ...files[0], bytes: new Uint8Array() }], false)).toThrow('contain bytes');
  });

  it.each([-1, 0, 1])('enforces map JSON byte limits at offset %i', offset => {
    const files = [{ path: 'map.json', bytes: new Uint8Array(CREATOR_PACKAGE_LIMITS.mapBytes + offset) }];
    if (offset <= 0) expect(assertCreatorMembers(files, false)).toBe(files[0].bytes.length);
    else expect(() => assertCreatorMembers(files, false)).toThrow('16 MiB');
  });

  it.each([255, 256, 257])('enforces the actual file count at %i members', count => {
    const files = Array.from({ length: count }, (_, i) => ({
      path: `assets/${i.toString(16).padStart(64, '0')}.png`, bytes: new Uint8Array([1]),
    }));
    if (count <= CREATOR_PACKAGE_LIMITS.members) expect(assertCreatorMembers(files, false)).toBe(count);
    else expect(() => assertCreatorMembers(files, false)).toThrow('256 files');
  });

  it.each([-1, 0, 1])('enforces the expanded-byte total at offset %i', offset => {
    const half = CREATOR_PACKAGE_LIMITS.expandedBytes / 2;
    const files = [
      { path: 'README.md', bytes: new Uint8Array(half) },
      { path: 'ATTRIBUTION.json', bytes: new Uint8Array(half + offset) },
    ];
    if (offset <= 0) expect(assertCreatorMembers(files, false)).toBe(CREATOR_PACKAGE_LIMITS.expandedBytes + offset);
    else expect(() => assertCreatorMembers(files, false)).toThrow('64 MiB');
  });

  it('hashes actual member bytes in stable path order and excludes the manifest itself', async () => {
    const files = transportFiles().filter(file => file.path !== 'manifest.json');
    const identities = await creatorMemberIdentities(files);
    expect(identities.map(file => file.path)).toEqual(files.map(file => file.path).sort());
    for (const identity of identities) {
      const source = files.find(file => file.path === identity.path)!;
      expect(identity.bytes).toBe(source.bytes.length);
      expect(identity.sha256).toBe(await creatorSHA256(source.bytes));
    }
    await expect(creatorMemberIdentities(transportFiles())).rejects.toThrow('own hash');
    vi.stubGlobal('crypto', {});
    await expect(creatorSHA256(new Uint8Array([1]))).rejects.toThrow('secure browser');
  });
});

describe('bounded creator ZIP encoding', () => {
  it('preserves every byte, sorts entries and fixes timestamps for repeatable output', async () => {
    const files = transportFiles();
    const original = structuredClone(files);
    const first = await encodeCreatorZip('fixture-map', files, new AbortController().signal);
    const second = await encodeCreatorZip('fixture-map', [...files].reverse(), new AbortController().signal);
    expect(first).toEqual(second);
    const expanded = unzipSync(first);
    expect(Object.keys(expanded)).toEqual(files.map(file => `maps/fixture-map/${file.path}`).sort());
    for (const file of files) expect([...expanded[`maps/fixture-map/${file.path}`]]).toEqual([...file.bytes]);
    expect(files).toEqual(original);
    expect(files.every(file => file.bytes.byteLength > 0)).toBe(true);
  });

  it('never starts a second compression operation before the previous one finishes', async () => {
    let active = 0, peak = 0;
    const push = AsyncZipDeflate.prototype.push;
    vi.spyOn(AsyncZipDeflate.prototype, 'push').mockImplementation(function (this: AsyncZipDeflate, chunk, final) {
      active++;
      peak = Math.max(peak, active);
      const handler = this.ondata;
      this.ondata = (error, data, done) => {
        if (error || done) active--;
        handler(error, data, done);
      };
      push.call(this, chunk, final);
    });
    await encodeCreatorZip('fixture-map', transportFiles(), new AbortController().signal);
    expect(peak).toBe(1);
    expect(active).toBe(0);
  });

  it('owns its buffers and does not follow later mutations of reviewed inputs', async () => {
    const files = transportFiles();
    const original = structuredClone(files);
    const pending = encodeCreatorZip('fixture-map', files, new AbortController().signal);
    for (const file of files) file.bytes.fill(90);
    const expanded = unzipSync(await pending);
    for (const file of original) expect([...expanded[`maps/fixture-map/${file.path}`]]).toEqual([...file.bytes]);
  });

  it('cancels compression without detaching original input and supports a fresh retry', async () => {
    const files = transportFiles();
    files[0].bytes = new Uint8Array(256 * 1024).fill(65);
    const controller = new AbortController();
    const pending = encodeCreatorZip('fixture-map', files, controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow();
    expect(files[0].bytes.byteLength).toBe(256 * 1024);
    expect(files[0].bytes[0]).toBe(65);
    const retry = await encodeCreatorZip('fixture-map', files, new AbortController().signal);
    expect(unzipSync(retry)['maps/fixture-map/manifest.json']).toEqual(files[0].bytes);
  });

  it('rejects unsafe roots, missing files and already cancelled requests before compression', () => {
    expect(() => encodeCreatorZip('../unsafe', transportFiles(), new AbortController().signal)).toThrow('package ID');
    expect(() => encodeCreatorZip('safe', [], new AbortController().signal)).toThrow('required');
    const controller = new AbortController();
    controller.abort();
    expect(() => encodeCreatorZip('safe', transportFiles(), controller.signal)).toThrow();
  });

  it('stops actual incompressible output at the ZIP byte ceiling', async () => {
    const files = transportFiles();
    const bytes = new Uint8Array(CREATOR_PACKAGE_LIMITS.zipBytes);
    let state = 0x12345678;
    for (let index = 0; index < bytes.length; index++) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      bytes[index] = state & 255;
    }
    files.find(file => file.path === 'README.md')!.bytes = bytes;
    await expect(encodeCreatorZip('fixture-map', files, new AbortController().signal)).rejects.toThrow('32 MiB');
    expect(bytes.byteLength).toBe(CREATOR_PACKAGE_LIMITS.zipBytes);
    expect(bytes[0]).toBe(165);
  });
});
