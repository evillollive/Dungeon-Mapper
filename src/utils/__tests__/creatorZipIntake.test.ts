import { describe, expect, it } from 'vitest';
import { zipSync } from 'fflate';
import { decodeCreatorZip } from '../creatorZipIntake';
import { encodeCreatorZip } from '../creatorZip';
import { CREATOR_REQUIRED_FILES } from '../creatorPackageFormat';
import { CREATOR_PACKAGE_LIMITS } from '../creatorProject';

const content = () => Object.fromEntries(CREATOR_REQUIRED_FILES.map(path =>
  [`maps/fixture/${path}`, new TextEncoder().encode(`envelope-only ${path}`)]));
function zip(level: 0 | 6 = 6): Uint8Array<ArrayBuffer> {
  return zipSync(content(), { level, mtime: new Date(1980, 0, 1) });
}
function locations(bytes: Uint8Array): { view: DataView; central: number; local: number; end: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  const central = view.getUint32(end + 16, true);
  return { view, central, local: view.getUint32(central + 42, true), end };
}
const signal = () => new AbortController().signal;

describe('strict creator ZIP envelope intake', () => {
  it.each([0, 6] as const)('reads ordinary stored/deflated members at level %i', async level => {
    const bytes = zip(level), original = bytes.slice();
    const result = await decodeCreatorZip(bytes, signal());
    expect(result.packageId).toBe('fixture');
    expect(result.files.map(file => file.path).sort()).toEqual([...CREATOR_REQUIRED_FILES].sort());
    for (const file of result.files) {
      expect([...file.bytes]).toEqual([...content()[`maps/fixture/${file.path}`]]);
    }
    expect(bytes).toEqual(original);
  });

  it('reads actual sequential worker output including signed data descriptors', async () => {
    const files = Object.entries(content()).map(([path, bytes]) => ({ path: path.slice('maps/fixture/'.length), bytes }));
    const encoded = await encodeCreatorZip('fixture', files, signal());
    const result = await decodeCreatorZip(encoded, signal());
    for (const file of result.files) expect([...file.bytes]).toEqual([...files.find(item => item.path === file.path)!.bytes]);
  });

  it.each([
    'maps/fixture/../map.json', '/maps/fixture/map.json', 'maps/fixture/assets\\secret.png',
    'maps/fixture/.github/workflows/ci.yml', 'maps/fixture/readme.md', 'maps/fixture/extra.json',
    'maps/other/README.md', 'other/fixture/map.json',
  ])('rejects unsafe, mixed or undeclared names: %s', async path => {
    const data = { ...content(), [path]: new Uint8Array([1]) };
    await expect(decodeCreatorZip(zipSync(data), signal())).rejects.toThrow();
  });

  it.each([
    ['symlink attributes', (v: DataView, c: number) => v.setUint32(c + 38, 0xa1ff << 16, true)],
    ['directory attributes', (v: DataView, c: number) => v.setUint32(c + 38, 0x10, true)],
    ['encryption', (v: DataView, c: number) => v.setUint16(c + 8, 1, true)],
    ['unsupported compression', (v: DataView, c: number) => v.setUint16(c + 10, 99, true)],
    ['expanded size', (v: DataView, c: number) => v.setUint32(c + 24, CREATOR_PACKAGE_LIMITS.expandedBytes + 1, true)],
    ['overlapping data', (v: DataView, c: number) => v.setUint32(c + 20, CREATOR_PACKAGE_LIMITS.zipBytes, true)],
    ['local offset', (v: DataView, c: number) => v.setUint32(c + 42, 0xffffffff, true)],
  ] as const)('rejects %s before decompression', async (_, mutate) => {
    const bytes = zip(), { view, central } = locations(bytes);
    mutate(view, central);
    await expect(decodeCreatorZip(bytes, signal())).rejects.toThrow();
  });

  it('rejects duplicated paths even when the ZIP central directory permits them', async () => {
    // Same-length distinct preview filename provides a duplicate entry without resizing the archive.
    const data = content();
    data['maps/fixture/preview-02.png'] = new Uint8Array([1]);
    data['maps/fixture/preview-03.png'] = new Uint8Array([2]);
    const duplicate = zipSync(data, { level: 0 });
    const from = new TextEncoder().encode('maps/fixture/preview-03.png');
    const to = new TextEncoder().encode('maps/fixture/preview-02.png');
    for (let i = 0; i <= duplicate.length - from.length; i++) {
      if (from.every((byte, j) => duplicate[i + j] === byte)) duplicate.set(to, i);
    }
    await expect(decodeCreatorZip(duplicate, signal())).rejects.toThrow('duplicate');
  });

  it('rejects changed local paths, false CRCs, trailing data and truncated streams', async () => {
    const changed = zip(), { view, central, local } = locations(changed);
    changed[local + 30] = 90;
    await expect(decodeCreatorZip(changed, signal())).rejects.toThrow('different path');
    const crc = zip(), crcLocations = locations(crc);
    crcLocations.view.setUint32(crcLocations.central + 16, 1, true);
    crcLocations.view.setUint32(crcLocations.local + 14, 1, true);
    await expect(decodeCreatorZip(crc, signal())).rejects.toThrow('CRC');
    expect(view.getUint32(central, true)).toBe(0x02014b50);
    await expect(decodeCreatorZip(new Uint8Array([...zip(), 0]), signal())).rejects.toThrow();
    await expect(decodeCreatorZip(zip().slice(0, -5), signal())).rejects.toThrow();
  });

  it('checks actual decompressed length even if both headers lie consistently', async () => {
    const bytes = zip(), { view, central, local } = locations(bytes);
    view.setUint32(central + 24, 1, true);
    view.setUint32(local + 22, 1, true);
    await expect(decodeCreatorZip(bytes, signal())).rejects.toThrow('actual expanded');
  });

  it('rejects unsupported extra fields and conflicting streamed descriptors', async () => {
    const withZip64 = zipSync({ ...content(),
      'maps/fixture/preview-02.png': [new Uint8Array([1]), { extra: { 1: new Uint8Array(16) } }],
    });
    await expect(decodeCreatorZip(withZip64, signal())).rejects.toThrow('ZIP64');
    const files = Object.entries(content()).map(([path, bytes]) => ({ path: path.slice('maps/fixture/'.length), bytes }));
    const bytes = await encodeCreatorZip('fixture', files, signal());
    const { view, central, local } = locations(bytes);
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const descriptor = start + view.getUint32(central + 20, true);
    expect(view.getUint32(descriptor, true)).toBe(0x08074b50);
    view.setUint32(descriptor + 8, 1, true);
    await expect(decodeCreatorZip(bytes, signal())).rejects.toThrow('descriptor');
  });

  it('enforces ZIP byte limits before copying and cancellation without returning partial files', async () => {
    await expect(decodeCreatorZip(new Uint8Array(CREATOR_PACKAGE_LIMITS.zipBytes + 1), signal())).rejects.toThrow('32 MiB');
    const controller = new AbortController();
    const bytes = zip(), original = bytes.slice();
    const pending = decodeCreatorZip(bytes, controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow();
    expect(bytes).toEqual(original);
    expect((await decodeCreatorZip(bytes, signal())).files).toHaveLength(6);
  });

  it('rejects a missing required member without pretending the envelope is complete', async () => {
    const data = content();
    delete data['maps/fixture/ATTRIBUTION.json'];
    await expect(decodeCreatorZip(zipSync(data), signal())).rejects.toThrow('required files');
  });
});
