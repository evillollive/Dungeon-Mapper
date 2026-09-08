import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DungeonProject, SceneTemplate } from '../../types/map';
import { GENERATOR_LIST } from '../generators';
import { PREMADE_MAP_SUMMARIES } from '../premadeMaps';
import { alignTraceImage, CREATION_LIMITS, createProjectCandidate, createProjectFromTemplate, readTraceImage, renderCreationPreviews } from '../projectCreation';
import { renderMapToCanvas } from '../renderMap';

vi.mock('../renderMap', () => ({ renderMapToCanvas: vi.fn() }));

const settings = { name: 'New adventure', width: 24, height: 18, themeId: 'dungeon' };
const image = { dataUrl: 'data:image/png;base64,aGVsbG8=', width: 800, height: 400 };
const source: DungeonProject = {
  name: 'Do not change',
  levels: [{ meta: { name: 'Existing level', width: 1, height: 1, tileSize: 32 }, tiles: [[{ type: 'treasure' }]], notes: [] }],
  activeLevelIndex: 0, stairLinks: [],
  customThemes: [{ id: 'custom-theme:test', name: 'Test theme', baseThemeId: 'wilderness', gridColor: '#ffffff', tileColors: {}, tileLabels: {}, customTiles: [] }],
  customStamps: [], sceneTemplates: [],
};

class TestImage {
  static instances: TestImage[] = [];
  static decode = true;
  naturalWidth = 800;
  naturalHeight = 400;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() { TestImage.instances.push(this); }
  set src(value: string) { if (value && TestImage.decode) queueMicrotask(() => this.onload?.()); }
}

beforeEach(() => {
  vi.clearAllMocks();
  TestImage.instances = [];
  TestImage.decode = true;
  vi.stubGlobal('Image', TestImage);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('isolated project candidates', () => {
  it('creates independent blank content and clones only reusable libraries', () => {
    const original = structuredClone(source);
    const first = createProjectCandidate({ ...settings, path: 'blank' }, source);
    const second = createProjectCandidate({ ...settings, path: 'blank' }, source);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.levels[0].tiles[0]).not.toBe(second.levels[0].tiles[0]);
    expect(first.levels[0].tiles.flat().every(tile => tile.type === 'empty')).toBe(true);
    expect(first.customThemes).toEqual(source.customThemes);
    expect(first.customThemes).not.toBe(source.customThemes);
    expect(first.customStamps).not.toBe(source.customStamps);
    expect(first.sceneTemplates).not.toBe(source.sceneTemplates);
    first.customThemes![0].name = 'Edited';
    expect(source).toEqual(original);
    expect(first).not.toHaveProperty('id');
    expect(first.name).toBe(settings.name);
  });

  it.each(GENERATOR_LIST.map(generator => [generator.id]))('is deterministic and independent for %s', algorithm => {
    const options = { ...settings, path: 'generator' as const, seed: 'repeatable seed', density: 1, algorithm };
    const first = createProjectCandidate(options, source);
    const second = createProjectCandidate(options, source);
    expect(first).toEqual(second);
    expect(first.levels[0].tiles).not.toBe(second.levels[0].tiles);
    expect(first.levels[0].tiles.flat().some(tile => tile.type !== 'empty')).toBe(true);
    expect(first.customThemes).toEqual(source.customThemes);
  });

  it('keeps an empty seed deterministic and uses the custom environment base', () => {
    const options = { ...settings, themeId: 'custom-theme:test', path: 'generator' as const, seed: '', density: 1 };
    const first = createProjectCandidate(options, source);
    const second = createProjectCandidate({ ...options, seed: 'first-adventure', algorithm: 'open-terrain' }, source);
    expect(first).toEqual(second);
    expect(first.levels[0].meta.theme).toBe('custom-theme:test');
  });

  it('uses authored samples with all levels without inheriting unrelated libraries', () => {
    const sample = PREMADE_MAP_SUMMARIES.find(item => item.levelCount > 1)!;
    const first = createProjectCandidate({ path: 'sample', sampleId: sample.id }, source);
    const second = createProjectCandidate({ path: 'sample', sampleId: sample.id }, source);
    expect(first).toEqual(second);
    expect(first.levels.length).toBe(sample.levelCount);
    expect(first.customThemes).toBeUndefined();
    first.levels[0].meta.name = 'Changed';
    expect(second.levels[0].meta.name).not.toBe('Changed');
  });

  it.each([NaN, Infinity, 0, 9, 101, 20.5])('rejects invalid dimensions: %s', width => {
    expect(() => createProjectCandidate({ ...settings, width, path: 'blank' })).toThrow('whole numbers');
  });

  it('validates names, themes, and complexity before generating', () => {
    expect(() => createProjectCandidate({ ...settings, name: ' ', path: 'blank' })).toThrow('name');
    expect(() => createProjectCandidate({ ...settings, themeId: 'missing', path: 'blank' })).toThrow('theme');
    expect(() => createProjectCandidate({ ...settings, path: 'generator', seed: '123', density: NaN })).toThrow('complexity');
  });

  it('fits trace references without stretching and carries the same background into the candidate', () => {
    const background = alignTraceImage(image, 40, 30, 32, 0.6);
    expect(background).toEqual({ dataUrl: image.dataUrl, scale: 1.6, offsetX: 0, offsetY: 5, opacity: 0.6 });
    const project = createProjectCandidate({ ...settings, width: 40, height: 30, path: 'trace', image, opacity: 0.6 }, source);
    expect(project.levels[0].backgroundImage).toEqual(background);
    expect(project.customStamps).toEqual(source.customStamps);
    expect(project.levels[0].tiles.flat().every(tile => tile.type === 'empty')).toBe(true);
    expect(() => alignTraceImage({ ...image, width: 0 }, 40, 30, 32, 0.5)).toThrow();
    expect(() => alignTraceImage(image, 40, 30, 32, NaN)).toThrow('Opacity');
  });
});

describe('new projects from existing scene templates', () => {
  const template: SceneTemplate = {
    id: 'template-room',
    name: 'The hidden room',
    width: 2, height: 1,
    tiles: [[
      { type: 'custom:test', theme: 'custom-theme:test', noteId: 17, paintExtension: { pressure: 0.8 } },
      { type: 'floor' },
    ]],
    notes: [{ id: 17, x: 0, y: 0, label: 'Clue', description: 'A hidden switch.', noteExtension: { tags: ['clue'] } }],
    stamps: [{ id: 23, stampId: 'custom-chest', x: 1.5, y: 0.5, rotation: 90, scale: 1, flipX: true, flipY: false, opacity: 0.8, locked: true, stampExtension: { variant: 'wood' } }],
    createdAt: '2026-09-01T00:00:00Z',
    templateExtension: { authoring: { version: 2 } },
  } as SceneTemplate;
  const templateSource = () => ({
    ...structuredClone(source),
    id: 'local-source-id',
    levels: [{
      ...structuredClone(source.levels[0]),
      meta: { ...source.levels[0].meta, theme: 'custom-theme:test', tileSize: 20 },
    }],
    customStamps: [{ id: 'custom-chest', name: 'Chest', category: 'custom' as const, viewBox: '0 0 24 24', svgPath: 'M0 0L24 24' }],
    sceneTemplates: [structuredClone(template), { ...structuredClone(template), id: 'another-template', name: 'Another room' }],
  });

  it('copies exactly the selected room into an independent map with all libraries and no local identity', () => {
    const input = templateSource();
    const original = structuredClone(input);
    const result = createProjectFromTemplate(input, template.id);
    expect(result.name).toBe(template.name);
    expect(result).not.toHaveProperty('id');
    expect(result.levels).toHaveLength(1);
    expect(result.activeLevelIndex).toBe(0);
    expect(result.stairLinks).toEqual([]);
    expect(result.levels[0].meta).toEqual({ name: template.name, width: 2, height: 1, tileSize: 20, theme: 'custom-theme:test' });
    expect(result.levels[0].tiles).toEqual(template.tiles);
    expect(result.levels[0].notes).toEqual(template.notes);
    expect(result.levels[0].stamps).toEqual(template.stamps);
    expect(result.levels[0].tokens).toEqual([]);
    expect(result.levels[0].fog).toEqual([[false, false]]);
    expect(result.customThemes).toEqual(input.customThemes);
    expect(result.customStamps).toEqual(input.customStamps);
    expect(result.sceneTemplates).toEqual(input.sceneTemplates);
    expect(result.sceneTemplates).not.toBe(input.sceneTemplates);
    expect(result.sceneTemplates![0]).toHaveProperty('templateExtension.authoring.version', 2);

    result.levels[0].notes[0].description = 'Changed';
    result.levels[0].tiles[0][0].type = 'wall';
    result.levels[0].stamps![0].rotation = 180;
    result.customStamps![0].name = 'Changed asset';
    result.customThemes![0].name = 'Changed theme';
    expect(result.sceneTemplates![0]).toEqual(template);
    expect(input).toEqual(original);
  });

  it('keeps entity links and nested extensions without sharing them across copies', () => {
    const input = templateSource();
    const first = createProjectFromTemplate(input, template.id);
    const second = createProjectFromTemplate(input, template.id);
    expect(first).toEqual(second);
    expect(first.levels[0].tiles[0][0].noteId).toBe(first.levels[0].notes[0].id);
    expect(first.levels[0].tiles[0][0]).toHaveProperty('paintExtension.pressure', 0.8);
    expect(first.levels[0].notes[0]).toHaveProperty('noteExtension.tags', ['clue']);
    expect(first.levels[0].stamps![0]).toHaveProperty('stampExtension.variant', 'wood');
    const copiedExtension = first.sceneTemplates![0] as SceneTemplate & { templateExtension: { authoring: { version: number } } };
    copiedExtension.templateExtension.authoring.version = 3;
    expect(second.sceneTemplates![0]).toHaveProperty('templateExtension.authoring.version', 2);
    expect(input.sceneTemplates[0]).toHaveProperty('templateExtension.authoring.version', 2);
  });

  it('rejects missing templates and inconsistent dimensions without changing the source', () => {
    const input = templateSource();
    expect(() => createProjectFromTemplate(input, 'missing')).toThrow('no longer available');
    const original = structuredClone(input);
    expect(() => createProjectFromTemplate({ ...input, sceneTemplates: [{ ...template, width: 0 }] }, template.id)).toThrow('dimensions');
    expect(() => createProjectFromTemplate({ ...input, sceneTemplates: [{ ...template, height: 2 }] }, template.id)).toThrow('dimensions');
    expect(input).toEqual(original);
  });
});

describe('local image reading', () => {
  it('reads and decodes a local raster image', async () => {
    const result = await readTraceImage(new File(['pixels'], 'map.png', { type: 'image/png' }), new AbortController().signal);
    expect(result).toMatchObject({ width: 800, height: 400 });
    expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('rejects unsupported, empty, and oversized files explicitly', async () => {
    const signal = new AbortController().signal;
    await expect(readTraceImage(new File(['svg'], 'map.svg', { type: 'image/svg+xml' }), signal)).rejects.toThrow('PNG');
    await expect(readTraceImage(new File([], 'empty.png', { type: 'image/png' }), signal)).rejects.toThrow('non-empty');
    const file = new File(['pixels'], 'large.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: CREATION_LIMITS.maxImageBytes + 1 });
    await expect(readTraceImage(file, signal)).rejects.toThrow('10 MB');
  });

  it('rejects corrupt images and too many decoded pixels', async () => {
    TestImage.decode = false;
    const signal = new AbortController().signal;
    const pending = readTraceImage(new File(['pixels'], 'bad.png', { type: 'image/png' }), signal);
    const result = expect(pending).rejects.toThrow('decoded');
    await vi.waitFor(() => expect(TestImage.instances).toHaveLength(1));
    TestImage.instances[0].onerror?.();
    await result;
    const oversized = readTraceImage(new File(['pixels'], 'large.png', { type: 'image/png' }), signal);
    const rejected = expect(oversized).rejects.toThrow('24 megapixels');
    await vi.waitFor(() => expect(TestImage.instances).toHaveLength(2));
    TestImage.instances[1].naturalWidth = 100_000;
    TestImage.instances[1].onload?.();
    await rejected;
  });

  it('aborts while reading a file and while waiting for image decode', async () => {
    const file = new File(['pixels'], 'map.png', { type: 'image/png' });
    const readController = new AbortController();
    const reading = readTraceImage(file, readController.signal);
    readController.abort();
    await expect(reading).rejects.toMatchObject({ name: 'AbortError' });
    TestImage.decode = false;
    const decodeController = new AbortController();
    const decoding = readTraceImage(file, decodeController.signal);
    await vi.waitFor(() => expect(TestImage.instances).toHaveLength(1));
    decodeController.abort();
    await expect(decoding).rejects.toMatchObject({ name: 'AbortError' });
    expect(TestImage.instances[0].onload).toBeNull();
  });
});

describe('full-map previews', () => {
  it('renders every sample level in GM view and keeps the entire map within the preview budget', async () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,preview');
    vi.mocked(renderMapToCanvas).mockReturnValue(canvas);
    const sample = PREMADE_MAP_SUMMARIES.find(item => item.levelCount > 1)!;
    const project = createProjectCandidate({ path: 'sample', sampleId: sample.id });
    const previews = await renderCreationPreviews(project, new AbortController().signal);
    expect(previews).toHaveLength(project.levels.length);
    expect(renderMapToCanvas).toHaveBeenCalledTimes(project.levels.length);
    for (const [map, options] of vi.mocked(renderMapToCanvas).mock.calls) {
      expect(options.viewMode).toBe('gm');
      expect(Math.max(map.meta.width, map.meta.height) * options.tileSize).toBeLessThanOrEqual(1200);
    }
  });

  it('composites trace alignment at preview scale and opacity without changing candidate data', async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const draw = vi.spyOn(ctx, 'drawImage');
    vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,preview');
    vi.mocked(renderMapToCanvas).mockReturnValue(canvas);
    const project = createProjectCandidate({ ...settings, width: 40, height: 30, path: 'trace', image, opacity: 0.6 });
    const original = structuredClone(project);
    await renderCreationPreviews(project, new AbortController().signal);
    expect(draw).toHaveBeenCalledWith(expect.any(TestImage), 0, 120, 960, 480);
    expect(project).toEqual(original);
    draw.mockRestore();
  });

  it('surfaces renderer and encoding failures and honors cancellation', async () => {
    const project = createProjectCandidate({ ...settings, path: 'blank' });
    vi.mocked(renderMapToCanvas).mockImplementation(() => { throw new Error('Canvas failed'); });
    await expect(renderCreationPreviews(project, new AbortController().signal)).rejects.toThrow('Canvas failed');
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:,');
    vi.mocked(renderMapToCanvas).mockReturnValue(canvas);
    await expect(renderCreationPreviews(project, new AbortController().signal)).rejects.toThrow('rendered');
    const controller = new AbortController();
    controller.abort();
    await expect(renderCreationPreviews(project, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});
