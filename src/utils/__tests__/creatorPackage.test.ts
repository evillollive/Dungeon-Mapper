import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { creatorPackageFixture, creatorPackageOptions, CREATOR_PRIVATE_SENTINEL, CREATOR_UNKNOWN_SENTINEL } from '../../test/creatorPackageFixture';
import { prepareCreatorPackage, type CreatorPackageOptions } from '../creatorPackage';
import { inspectCreatorPackage, inspectCreatorZip, inspectCreatorDirectory } from '../creatorPackageImport';
import { encodeCreatorZip } from '../creatorZip';
import { canonicalCreatorJSON, creatorMemberIdentities, creatorSHA256, type CreatorPackageFile } from '../creatorPackageFormat';
import { renderCreatorPreviews } from '../creatorPackagePreview';
import { loadImage } from '../projectCreation';
import { readCreatorProvenance } from '../creatorProvenance';
import { readCreatorPackageOrigin } from '../creatorPackageOrigin';
import { decodeProject, encodeProject } from '../projectSchema';

vi.mock('../creatorPackagePreview', () => ({ renderCreatorPreviews: vi.fn() }));
vi.mock('../projectCreation', () => ({ loadImage: vi.fn() }));
const png = Uint8Array.from(readFileSync('public/pwa-192x192.png'));
function options(): CreatorPackageOptions {
  return { ...creatorPackageOptions(), packageId: 'shared-vault', contentVersion: '1.0.0',
    assetCredits: [], rightsConfirmed: true };
}
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  vi.mocked(renderCreatorPreviews).mockImplementation(async project => project.levels.map((_, index) => ({
    path: index === 0 ? 'preview.png' : `preview-${String(index + 1).padStart(2, '0')}.png`, bytes: png.slice(),
  })));
  vi.mocked(loadImage).mockImplementation(async () => {
    const image = new Image();
    Object.defineProperties(image, { naturalWidth: { value: 192 }, naturalHeight: { value: 192 } });
    return image;
  });
});
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); });
const signal = () => new AbortController().signal;
async function rewrite(files: CreatorPackageFile[], path: string, change: (value: Record<string, unknown>) => unknown): Promise<CreatorPackageFile[]> {
  const result = files.map(file => ({ path: file.path, bytes: file.bytes.slice() }));
  const file = result.find(file => file.path === path)!;
  file.bytes = canonicalCreatorJSON(change(JSON.parse(new TextDecoder().decode(file.bytes))));
  if (path !== 'manifest.json') {
    const manifest = result.find(file => file.path === 'manifest.json')!;
    const content = JSON.parse(new TextDecoder().decode(manifest.bytes));
    content.members = await creatorMemberIdentities(result.filter(file => file.path !== 'manifest.json'));
    manifest.bytes = canonicalCreatorJSON(content);
  }
  return result;
}

describe('reviewable creator package assembly and inspection', () => {
  it.each(['layout', 'encounter'] as const)('roundtrips the %s profile without private source mutation', async profile => {
    const source = creatorPackageFixture(), before = encodeProject(source);
    const settings = { ...options(), profile };
    if (profile === 'encounter') settings.levels[0] = { ...settings.levels[0], notes: [2], tokens: [2], hiddenStamps: [2] };
    const result = await prepareCreatorPackage(source, settings, signal());
    expect(encodeProject(source)).toEqual(before);
    const actualPublicText = result.files.filter(file => !file.path.endsWith('.png')).map(file => new TextDecoder().decode(file.bytes)).join('\n');
    expect(actualPublicText).not.toContain(CREATOR_PRIVATE_SENTINEL);
    expect(actualPublicText).not.toContain(CREATOR_UNKNOWN_SENTINEL);
    expect(actualPublicText).not.toContain('futureProject');
    expect(result.files.some(file => file.path === 'preview-02.png')).toBe(true);
    const repeated = await prepareCreatorPackage(source, settings, signal());
    expect(repeated.files).toEqual(result.files);
    const bytes = await encodeCreatorZip(settings.packageId, result.files, signal());
    const imported = await inspectCreatorZip(bytes, signal());
    expect(imported.project.name).toBe(settings.title);
    expect(imported.manifest.profile).toBe(profile);
    expect(imported.project.levels[0].notes.map(note => note.id)).toEqual(profile === 'encounter' ? [2] : []);
    expect(readCreatorProvenance(imported.project.creatorProvenance).mapSources).toEqual([
      { title: settings.title, author: settings.author, license: settings.license },
    ]);
    expect(imported.project).not.toHaveProperty('localProjectId');
    expect(imported.project).not.toHaveProperty('storageRevision');
    const origin = readCreatorPackageOrigin(imported.project.creatorPackageOrigin)!;
    expect(origin).toMatchObject({ packageId: settings.packageId, contentVersion: settings.contentVersion, author: settings.author });
    for (const member of result.files) expect(origin.files.find(file => file.path === member.path)).toEqual({
      path: member.path, bytes: member.bytes.length, sha256: await creatorSHA256(member.bytes),
    });
    expect(decodeProject(encodeProject(imported.project)).creatorPackageOrigin).toEqual(origin);
    expect(imported.previews).toHaveLength(2);
    expect(encodeProject(source)).toEqual(before);
  });

  it('requires explicit rights confirmation before image processing or preview rendering', async () => {
    await expect(prepareCreatorPackage(creatorPackageFixture(), { ...options(), rightsConfirmed: false }, signal())).rejects.toThrow('Review ownership');
    expect(loadImage).not.toHaveBeenCalled();
    expect(renderCreatorPreviews).not.toHaveBeenCalled();
  });

  it('externalizes and deduplicates exact image bytes and retains their declared source credits', async () => {
    const source = creatorPackageFixture();
    const image = 'data:image/png;base64,' + Buffer.from(png).toString('base64');
    source.levels[0].backgroundImage = { dataUrl: image, offsetX: 0, offsetY: 0, scale: 1, opacity: 0.5 };
    source.customStamps = [{ id: 'custom-image', name: 'Original art', category: 'custom', viewBox: '0 0 192 192', imageDataUrl: image }];
    source.levels[0].stamps![0].stampId = 'custom-image';
    const settings = options();
    settings.levels[0].background = true;
    settings.assetCredits = ['level:0:background', 'stamp:custom-image'].map(key => ({
      key, title: 'Original image', author: 'Fixture artist', license: 'CC-BY-4.0',
    }));
    const result = await prepareCreatorPackage(source, settings, signal());
    const imageFiles = result.files.filter(file => file.path.startsWith('assets/'));
    expect(imageFiles).toHaveLength(1);
    expect(imageFiles[0].bytes).toEqual(png);
    const mapBytes = result.files.find(file => file.path === 'map.json')!.bytes;
    expect(new TextDecoder().decode(mapBytes)).not.toContain('data:image');
    const imported = await inspectCreatorPackage(result.files, signal());
    expect(imported.project.levels[0].backgroundImage?.dataUrl).toBe(image);
    expect(imported.project.customStamps?.[0].imageDataUrl).toBe(image);
    expect(readCreatorProvenance(imported.project.creatorProvenance).assetCredits).toEqual([settings.assetCredits[1]]);
    expect(readCreatorProvenance(imported.project.levels[0].creatorProvenance).assetCredits).toContainEqual({
      ...settings.assetCredits[0], key: 'background',
    });
    const reversed = structuredClone(imported.project);
    reversed.levels.reverse();
    reversed.stairLinks = [];
    const remixSettings = { ...settings, levels: [{ index: 1, name: 'Independent reused level', background: true }] };
    const remixed = await prepareCreatorPackage(reversed, remixSettings, signal());
    expect(remixed.manifest.levelNames).toEqual(['Independent reused level']);
    settings.assetCredits = [];
    await expect(prepareCreatorPackage(source, settings, signal())).rejects.toThrow('asset');
  });

  it('preserves inherited map licenses and notices rather than substituting a CC label', async () => {
    const source = creatorPackageFixture(), settings = options();
    const prior = { title: 'Source vault', author: 'Prior author', license: 'AGPL-3.0-or-later' };
    source.levels[0].creatorProvenance = { version: 1, mapSources: [prior], assetCredits: [] };
    await expect(prepareCreatorPackage(source, settings, signal())).rejects.toThrow('compatible');
    settings.license = 'AGPL-3.0-or-later';
    const result = await prepareCreatorPackage(source, settings, signal());
    const imported = await inspectCreatorPackage(result.files, signal());
    expect(readCreatorProvenance(imported.project.creatorProvenance).mapSources).toContainEqual(prior);
  });

  it.each([
    ['format', 'unknown'], ['version', 99], ['catalog', 'future-catalog'], ['packageId', '../escape'],
    ['license', 'UNLICENSED'], ['profile', 'player'], ['levelNames', []], ['members', []],
  ])('rejects manifest %s changes before native image decoding', async (key, value) => {
    const result = await prepareCreatorPackage(creatorPackageFixture(), options(), signal());
    vi.mocked(loadImage).mockClear();
    const modified = await rewrite(result.files, 'manifest.json', object => ({ ...object, [key]: value }));
    await expect(inspectCreatorPackage(modified, signal())).rejects.toThrow();
    expect(loadImage).not.toHaveBeenCalled();
  });

  it('rejects changed bytes, missing members and wrong package roots', async () => {
    const result = await prepareCreatorPackage(creatorPackageFixture(), options(), signal());
    const changed = result.files.map(file => ({ path: file.path, bytes: file.bytes.slice() }));
    changed.find(file => file.path === 'README.md')!.bytes[0] ^= 1;
    await expect(inspectCreatorPackage(changed, signal())).rejects.toThrow('identity');
    await expect(inspectCreatorPackage(result.files.slice(1), signal())).rejects.toThrow();
    await expect(inspectCreatorPackage(result.files, signal(), 'different')).rejects.toThrow('different packages');
  });

  it('rejects unauthorized fields and play progress even with recomputed public checksums', async () => {
    const result = await prepareCreatorPackage(creatorPackageFixture(), options(), signal());
    const modified = await rewrite(result.files, 'map.json', object => {
      const project = object.project as { levels: { fogEnabled: boolean; privateField?: string }[] };
      project.levels[0].fogEnabled = false;
      project.levels[0].privateField = 'secret';
      return object;
    });

    await expect(inspectCreatorPackage(modified, signal())).rejects.toThrow('outside its declared');
  });

  it('creates its own receipt and rejects a package trying to supply one', async () => {
    const result = await prepareCreatorPackage(creatorPackageFixture(), options(), signal());
    const modified = await rewrite(result.files, 'map.json', object => {
      const project = object.project as Record<string, unknown>;
      project.creatorPackageOrigin = { version: 1, author: 'Forged receipt' };
      return object;
    });
    await expect(inspectCreatorPackage(modified, signal())).rejects.toThrow('Invalid project fields');
  });

  it('excludes private comparison receipts from creator exports without changing the source', async () => {
    const source = creatorPackageFixture();
    source.creatorPackageOrigin = { version: 99, privateComparisonData: 'NEVER_EXPORT_COMPARISON_DATA' };
    const before = encodeProject(source);
    const result = await prepareCreatorPackage(source, options(), signal());
    const text = result.files.filter(file => !file.path.endsWith('.png'))
      .map(file => new TextDecoder().decode(file.bytes)).join('\n');
    expect(text).not.toContain('creatorPackageOrigin');
    expect(text).not.toContain('NEVER_EXPORT_COMPARISON_DATA');
    expect(encodeProject(source)).toEqual(before);
  });

  it('rejects stripped or conflicting attribution even with recomputed hashes', async () => {
    const result = await prepareCreatorPackage(creatorPackageFixture(), options(), signal());
    const modified = await rewrite(result.files, 'ATTRIBUTION.json', object => {
      const builtins = object.builtins as { notices: string[] };
      builtins.notices = ['', '', '', ''];
      return object;
    });
    await expect(inspectCreatorPackage(modified, signal())).rejects.toThrow('notices');
  });

  it('keeps raw README text inert in generated markdown and never imports HTML from it', async () => {
    const settings = { ...options(), description: '<script>bad()</script> ![track](https://example.invalid/image)' };
    const result = await prepareCreatorPackage(creatorPackageFixture(), settings, signal());
    const readme = new TextDecoder().decode(result.files.find(file => file.path === 'README.md')!.bytes);
    expect(readme).toContain('\\<script\\>');
    expect(readme).toContain('\\!\\[track\\]');
    const imported = await inspectCreatorPackage(result.files, signal());
    expect(imported.manifest.description).toBe(settings.description);
  });

  it('propagates cancellation and never returns a partial candidate', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(prepareCreatorPackage(creatorPackageFixture(), options(), controller.signal)).rejects.toThrow();
    await expect(inspectCreatorPackage([], controller.signal)).rejects.toThrow();
  });

  it('validates a selected directory identically to the ZIP route, without accepting unrelated files', async () => {
    const result = await prepareCreatorPackage(creatorPackageFixture(), options(), signal());
    const files = result.files.map(member => {
      const file = new File([member.bytes], member.path.split('/').at(-1)!);
      Object.defineProperty(file, 'webkitRelativePath', { value: `shared-vault/${member.path}` });
      return file;
    });
    const folder = await inspectCreatorDirectory(files, signal());
    const archive = await inspectCreatorZip(await encodeCreatorZip('shared-vault', result.files, signal()), signal());
    expect(folder.project).toEqual(archive.project);
    expect(folder.manifest).toEqual(archive.manifest);
    const foreign = new File(['private'], 'secret.txt');
    Object.defineProperty(foreign, 'webkitRelativePath', { value: 'unrelated/secret.txt' });
    await expect(inspectCreatorDirectory([...files, foreign], signal())).rejects.toThrow('unrelated files');
    await expect(inspectCreatorDirectory(files.filter(file => file.name !== 'manifest.json'), signal())).rejects.toThrow('manifest');
  });
});
