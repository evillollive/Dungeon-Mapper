import { createHash, webcrypto } from 'node:crypto';
import { crc32 } from 'node:zlib';
import sharp from 'sharp';
import { zipSync } from 'fflate';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { creatorPackageFixture, creatorPackageOptions } from '../../src/test/creatorPackageFixture';
import { prepareCreatorPackage } from '../../src/utils/creatorPackage';
import { renderCreatorPreviews } from '../../src/utils/creatorPackagePreview';
import { loadImage } from '../../src/utils/projectCreation';
import { CREATOR_PACKAGE_LIMITS } from '../../src/utils/creatorPackageContract';
import type { CreatorPackageFile } from '../../src/utils/creatorPackageFormat';
import { validatePackage, VALIDATION_LIMITS } from '../src/validation';

vi.mock('../../src/utils/creatorPackagePreview', () => ({ renderCreatorPreviews: vi.fn() }));
vi.mock('../../src/utils/projectCreation', () => ({ loadImage: vi.fn() }));
let png: Uint8Array<ArrayBuffer>;
let original: CreatorPackageFile[];
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const text = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
const parse = (file: CreatorPackageFile) => JSON.parse(new TextDecoder().decode(file.bytes));
const signal = () => new AbortController().signal;
const svg = (body = '<rect width="2" height="2" fill="#123456"/>') =>
  new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2" viewBox="0 0 2 2">${body}</svg>`);

function repack(files: CreatorPackageFile[]): Uint8Array {
  const manifest = files.find(file => file.path === 'manifest.json')!;
  manifest.bytes = text({ ...parse(manifest), members: files.filter(file => file !== manifest)
    .map(file => ({ path: file.path, bytes: file.bytes.length, sha256: hash(file.bytes) })) });
  return zipSync(Object.fromEntries(files.map(file => ['maps/shared-vault/' + file.path, file.bytes])),
    { level: 6, mtime: new Date(1980, 0, 1) });
}
function rewrite(path: string, update: (value: ReturnType<typeof parse>) => void): CreatorPackageFile[] {
  const files = structuredClone(original), file = files.find(file => file.path === path)!;
  const value = parse(file); update(value); file.bytes = text(value);
  return files;
}
async function fixture(image?: { bytes: Uint8Array; mime: string }, secondImage?: Uint8Array) {
  const project = creatorPackageFixture();
  const options = { ...creatorPackageOptions(), packageId: 'shared-vault', contentVersion: '1.0.0',
    rightsConfirmed: true, assetCredits: [] as { key: string; title: string; author: string; license: 'CC-BY-4.0' }[] };
  if (image) {
    project.levels[0].backgroundImage = {
      dataUrl: `data:${image.mime};base64,${Buffer.from(image.bytes).toString('base64')}`,
      offsetX: 0, offsetY: 0, scale: 1, opacity: 1,
    };
    options.levels[0].background = true;
    options.assetCredits = [{ key: 'level:0:background', title: 'Synthetic color swatch', author: 'Fixture creator', license: 'CC-BY-4.0' }];
  }
  if (secondImage) {
    project.customStamps = [{ id: 'second-swatch', name: 'Second swatch', category: 'custom', viewBox: '0 0 2 2',
      imageDataUrl: `data:image/png;base64,${Buffer.from(secondImage).toString('base64')}` }];
    project.levels[0].stamps![0].stampId = 'second-swatch';
    options.assetCredits.push({ key: 'stamp:second-swatch', title: 'Second synthetic swatch', author: 'Fixture creator', license: 'CC-BY-4.0' });
  }
  return (await prepareCreatorPackage(project, options, signal())).files;
}
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  vi.mocked(renderCreatorPreviews).mockImplementation(async project => project.levels.map((_, index) => ({
    path: index === 0 ? 'preview.png' : 'preview-02.png', bytes: png.slice(),
  })));
  vi.mocked(loadImage).mockImplementation(async () => {
    const image = new Image();
    Object.defineProperties(image, { naturalWidth: { value: 2 }, naturalHeight: { value: 2 } });
    return image;
  });
});
beforeAll(async () => {
  png = Uint8Array.from(await sharp({ create: { width: 2, height: 2, channels: 4, background: '#123456' } }).png().toBuffer());
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.resetAllMocks(); });

describe('independent native subprocess validation', () => {
  beforeEach(async () => { original = await fixture(); });

  it('rebuilds metadata from received bytes without browser receipts or content leakage', async () => {
    const files = rewrite('manifest.json', value => { value.description = 'PRIVATE_DIAGNOSTIC_SENTINEL'; });
    const bytes = repack(files), result = await validatePackage(bytes, signal());
    expect(result.package).toEqual({
      packageId: 'shared-vault', contentVersion: '1.0.0', packageSha256: hash(bytes), zipBytes: bytes.length,
      memberCount: files.length, expandedBytes: files.reduce((sum, file) => sum + file.bytes.length, 0),
    });
    expect(result.profile).toBe('layout');
    expect(JSON.stringify(result)).not.toContain('PRIVATE_DIAGNOSTIC_SENTINEL');
  });

  it.each(['png', 'jpeg', 'webp', 'svg'] as const)('fully decodes supported %s assets in Node', async format => {
    const bytes = format === 'svg' ? svg() : Uint8Array.from(await sharp(png).toFormat(format).toBuffer());
    const files = await fixture({ bytes, mime: format === 'svg' ? 'image/svg+xml' : `image/${format}` });
    await expect(validatePackage(repack(files), signal())).resolves.toMatchObject({ profile: 'layout' });
  });

  it.each([
    ['map.json', (value: ReturnType<typeof parse>) => { value.project.privateField = 'PRIVATE_DIAGNOSTIC_SENTINEL'; }],
    ['map.json', (value: ReturnType<typeof parse>) => { value.project.levels[0].fogEnabled = false; }],
    ['map.json', (value: ReturnType<typeof parse>) => { value.project.levels[0].meta.width = CREATOR_PACKAGE_LIMITS.cells + 1; }],
    ['map.json', (value: ReturnType<typeof parse>) => { value.project.levels = Array(33).fill(value.project.levels[0]); }],
    ['manifest.json', (value: ReturnType<typeof parse>) => { value.license = 'UNLICENSED'; }],
    ['manifest.json', (value: ReturnType<typeof parse>) => { value.profile = 'player'; }],
    ['manifest.json', (value: ReturnType<typeof parse>) => { value.catalog = 'future'; }],
    ['ATTRIBUTION.json', (value: ReturnType<typeof parse>) => { value.builtins.notices[0] = 'removed'; }],
    ['ATTRIBUTION.json', (value: ReturnType<typeof parse>) => { value.contribution.author = 'Contradiction'; }],
  ] as const)('rejects invalid %s declarations even after all public member hashes are recomputed', async (path, update) => {
    await expect(validatePackage(repack(rewrite(path, update)), signal())).rejects.toMatchObject({ status: 422 });
  });

  it('rejects a CRC mismatch instead of trusting ZIP directory declarations', async () => {
    const bytes = repack(original), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const directory = view.getUint32(bytes.length - 6, true);
    view.setUint32(14, 0, true); view.setUint32(directory + 16, 0, true);
    await expect(validatePackage(bytes, signal())).rejects.toMatchObject({ status: 422 });
  });

  it('rejects malformed pixel data with valid image headers, chunk CRC and member hashes', async () => {
    const bad = png.slice(), view = new DataView(bad.buffer);
    for (let offset = 8; offset < bad.length;) {
      const length = view.getUint32(offset);
      if (new TextDecoder().decode(bad.subarray(offset + 4, offset + 8)) === 'IDAT') {
        bad.fill(0, offset + 8, offset + 8 + length);
        view.setUint32(offset + 8 + length, crc32(bad.subarray(offset + 4, offset + 8 + length)));
        break;
      }
      offset += length + 12;
    }
    original.find(file => file.path === 'preview.png')!.bytes = bad;
    await expect(validatePackage(repack(original), signal())).rejects.toMatchObject({ status: 422 });
  });

  it.each([
    '<script>throw new Error("PRIVATE_DIAGNOSTIC_SENTINEL")</script>',
    '<image href="https://example.invalid/tracker"/>',
    '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">active</div></foreignObject>',
  ])('rejects active SVG data independently of browser preflight', async body => {
    const files = await fixture({ bytes: svg(), mime: 'image/svg+xml' });
    const asset = files.find(file => file.path.startsWith('assets/'))!, previous = asset.path;
    asset.bytes = svg(body); asset.path = `assets/${hash(asset.bytes)}.svg`;
    const map = files.find(file => file.path === 'map.json')!;
    map.bytes = new TextEncoder().encode(new TextDecoder().decode(map.bytes).replaceAll(previous, asset.path));
    await expect(validatePackage(repack(files), signal())).rejects.toMatchObject({ status: 422 });
  });

  it('bounds real ZIP bytes at 32 MiB before spawning and rejects invalid bytes at the boundary', async () => {
    expect(() => validatePackage(new Uint8Array(CREATOR_PACKAGE_LIMITS.zipBytes + 1), signal())).toThrow('32 MiB');
    await expect(validatePackage(new Uint8Array(CREATOR_PACKAGE_LIMITS.zipBytes), signal())).rejects.toMatchObject({ status: 422 });
  });

  it.each([3000, 3001])('enforces aggregate native pixels for two 4000 x %i images', async height => {
    const images = await Promise.all(['#123456', '#abcdef'].map(background =>
      sharp({ create: { width: 4000, height, channels: 4, background } }).png().toBuffer()));
    const files = await fixture({ bytes: images[0], mime: 'image/png' }, images[1]);
    const work = validatePackage(repack(files), signal());
    if (height === 3000) await expect(work).resolves.toMatchObject({ profile: 'layout' });
    else await expect(work).rejects.toMatchObject({ status: 422 });
  });

  it.each([0, 1])('enforces map JSON bytes at the 16 MiB boundary plus %i', async extra => {
    const file = original.find(file => file.path === 'map.json')!;
    const padded = new Uint8Array(CREATOR_PACKAGE_LIMITS.mapBytes + extra);
    padded.fill(32); padded.set(file.bytes); file.bytes = padded;
    const work = validatePackage(repack(original), signal());
    if (extra === 0) await expect(work).resolves.toMatchObject({ profile: 'layout' });
    else await expect(work).rejects.toMatchObject({ status: 422 });
  });

  it('rejects oversized image sources and declared native pixel allocations', async () => {
    const huge = png.slice();
    new DataView(huge.buffer).setUint32(16, CREATOR_PACKAGE_LIMITS.imagePixels + 1);
    original.find(file => file.path === 'preview.png')!.bytes = huge;
    await expect(validatePackage(repack(original), signal())).rejects.toMatchObject({ status: 422 });
    original.find(file => file.path === 'preview.png')!.bytes = new Uint8Array(CREATOR_PACKAGE_LIMITS.imageBytes + 1);
    await expect(validatePackage(repack(original), signal())).rejects.toMatchObject({ status: 422 });
  });

  it('rejects excessive expanded data, members, nesting and unsafe paths', async () => {
    const large = zipSync({ 'maps/shared-vault/README.md': new Uint8Array(CREATOR_PACKAGE_LIMITS.expandedBytes + 1) });
    await expect(validatePackage(large, signal())).rejects.toMatchObject({ status: 422 });
    const members = zipSync(Object.fromEntries(Array.from({ length: 257 }, (_, index) =>
      [`maps/shared-vault/assets/${index.toString(16).padStart(64, '0')}.png`, png])));
    await expect(validatePackage(members, signal())).rejects.toMatchObject({ status: 422 });
    const nested = structuredClone(original);
    nested.find(file => file.path === 'map.json')!.bytes = new TextEncoder().encode('['.repeat(33) + '0' + ']'.repeat(33));
    await expect(validatePackage(repack(nested), signal())).rejects.toMatchObject({ status: 422 });
    await expect(validatePackage(zipSync({ '../escape': png }), signal())).rejects.toMatchObject({ status: 422 });
  });

  it('settles cancellation only after terminating its native child', async () => {
    const controller = new AbortController(), work = validatePackage(repack(original), controller.signal);
    const reason = new Error('Test cancellation');
    const rejected = expect(work).rejects.toBe(reason);
    controller.abort(reason);
    await rejected;
    await expect(validatePackage(repack(original), signal())).resolves.toMatchObject({ profile: 'layout' });
  });

  it('kills the native child when the enforced parent deadline fires', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const work = validatePackage(repack(original), signal());
    const rejected = expect(work).rejects.toMatchObject({ status: 504, code: 'validation_timeout' });
    vi.advanceTimersByTime(VALIDATION_LIMITS.workerMs);
    vi.useRealTimers();
    await rejected;
    await expect(validatePackage(repack(original), signal())).resolves.toMatchObject({ profile: 'layout' });
  });
});
