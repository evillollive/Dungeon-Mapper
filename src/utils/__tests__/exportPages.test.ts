import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportHighResPNG } from '../export';
import { createDefaultMap } from '../../hooks/mapStateUtils';
import { MAX_EXPORT_PIXELS } from '../exportPlan';
import { loadExportAssets } from '../exportAssets';
import { renderMapToCanvas } from '../renderMap';

const pixel = () => new Blob([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGZkAAAAASUVORK5CYII='), c => c.charCodeAt(0))]);
const opts = { dpi: 300, pagePresetId: 'letter', themeId: 'dungeon', printMode: true, viewMode: 'gm' as const };
function sizedMap(name: string, size: number) {
  const map = createDefaultMap(name);
  map.meta.width = map.meta.height = size;
  map.tiles = Array.from({ length: size }, () => Array.from({ length: size }, () => ({ type: 'floor' as const })));
  map.fog = Array.from({ length: size }, () => Array(size).fill(false));
  return map;
}

describe('page-at-a-time PNG export', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(pixel()));
  });
  afterEach(() => vi.restoreAllMocks());
  it('allocates only bounded pages for the largest map and writes a chosen last page', async () => {
    const map = sizedMap('Large', 128);
    const allocations: number[] = [];
    const width = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width')!;
    const height = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height')!;
    vi.spyOn(HTMLCanvasElement.prototype, 'width', 'set').mockImplementation(function (this: HTMLCanvasElement, value) {
      allocations.push(value * this.height);
      expect(value).toBeLessThanOrEqual(8192);
      width.set!.call(this, value);
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'height', 'set').mockImplementation(function (this: HTMLCanvasElement, value) {
      allocations.push(this.width * value);
      height.set!.call(this, value);
    });
    const progress = vi.fn();
    await exportHighResPNG(map, { ...opts, pageIndex: 251, onProgress: progress });
    expect(Math.max(...allocations)).toBeLessThanOrEqual(MAX_EXPORT_PIXELS);
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledTimes(1);
    expect(vi.mocked(HTMLAnchorElement.prototype.click).mock.instances[0].download).toContain('page_14-18');
    expect(progress.mock.calls).toEqual([[0, 1], [1, 1]]);
  });
  it('cancels between pages without mutating the source', async () => {
    const map = sizedMap('Cancel', 16);
    const source = JSON.stringify(map);
    const controller = new AbortController();
    await expect(exportHighResPNG(map, { ...opts, signal: controller.signal,
      onProgress: completed => { if (completed === 1) controller.abort(); } })).rejects.toThrow();
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(map)).toBe(source);
  });
  it('cancels during encoding before requesting any download', async () => {
    const controller = new AbortController();
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation(callback => { controller.abort(); callback(pixel()); });
    await expect(exportHighResPNG(sizedMap('Cancel', 8), { ...opts, signal: controller.signal })).rejects.toThrow();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });
  it('refuses oversized single images and invalid pages before encoding', async () => {
    await expect(exportHighResPNG(sizedMap('Large', 128), { ...opts, pagePresetId: 'none' })).rejects.toThrow(/16 megapixel/);
    await expect(exportHighResPNG(sizedMap('Page', 8), { ...opts, pageIndex: -1 })).rejects.toThrow(/Choose a page/);
    expect(HTMLCanvasElement.prototype.toBlob).not.toHaveBeenCalled();
  });
  it('explains absent or external artwork without fetching it', async () => {
    const map = createDefaultMap();
    map.backgroundImage = { dataUrl: 'https://example.invalid/private.png', offsetX: 0, offsetY: 0, scale: 1, opacity: 1 };
    map.stamps = [{ id: 1, stampId: 'missing-pack', x: 1, y: 1, scale: 1, rotation: 0, flipX: false, flipY: false, opacity: 1, locked: false }];
    const result = await loadExportAssets(map);
    expect(result.images.size).toBe(0);
    expect(result.warnings.join(' ')).toMatch(/Missing stamp/);
    expect(result.warnings.join(' ')).toMatch(/External artwork is not fetched/);
  });
  it('keeps published notes in downloaded player PNGs exactly as in the preview', async () => {
    const map = sizedMap('Audience', 8);
    map.notes = [{ id: 1, x: 1, y: 1, label: 'Private', description: '' },
      { id: 2, x: 2, y: 2, label: 'Published', description: '', published: true, publicLabel: 'Door' }];
    const ctx = document.createElement('canvas').getContext('2d')!;
    const text = vi.spyOn(ctx, 'fillText');
    renderMapToCanvas(map, { tileSize: 20, themeId: 'dungeon', viewMode: 'player' });
    const previewText = text.mock.calls.slice();
    text.mockClear();
    await exportHighResPNG(map, { ...opts, dpi: 20, pagePresetId: 'none', viewMode: 'player', printMode: false });
    expect(text.mock.calls).toEqual(previewText);
    expect(text.mock.calls.some(call => call[0] === '2')).toBe(true);
    expect(text.mock.calls.some(call => call[0] === '1')).toBe(false);
  });
  it('draws embedded backgrounds independently of paper texture', () => {
    const map = sizedMap('Background', 8);
    map.backgroundImage = { dataUrl: 'data:image/png;base64,image', offsetX: 1, offsetY: 2, scale: 1, opacity: 0.5 };
    map.paperTexture = undefined;
    const image = new Image();
    Object.defineProperties(image, { naturalWidth: { value: 40 }, naturalHeight: { value: 20 } });
    const ctx = document.createElement('canvas').getContext('2d')!;
    const draw = vi.spyOn(ctx, 'drawImage');
    renderMapToCanvas(map, { tileSize: map.meta.tileSize * 2, themeId: 'dungeon', images: new Map([[map.backgroundImage.dataUrl, image]]) });
    expect(draw).toHaveBeenCalledWith(image, map.meta.tileSize * 2, map.meta.tileSize * 4, 80, 40);
  });
});
