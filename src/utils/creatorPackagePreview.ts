import type { DungeonProject } from '../types/map';
import { creatorMapImageURLs, type CreatorPackagedImage } from './creatorPackageAssets';
import { creatorLevelImagePixels } from './creatorAssets';
import { loadImage } from './projectCreation';
import { renderMapToCanvas } from './renderMap';
import type { CreatorPackageFile } from './creatorPackageFormat';

export async function renderCreatorPreviews(project: DungeonProject, assets: readonly CreatorPackagedImage[],
  signal: AbortSignal): Promise<CreatorPackageFile[]> {
  const files: CreatorPackageFile[] = [];
  const byPath = new Map(assets.map(image => [image.path, image]));
  for (const [index, source] of project.levels.entries()) {
    signal.throwIfAborted();
    const paths = creatorMapImageURLs(source, project);
    const required = paths.map(path => {
      const asset = byPath.get(path);
      if (!asset) throw new Error('A preview asset is missing from the reviewed package.');
      return asset;
    });
    creatorLevelImagePixels(required);
    const images = new Map<string, HTMLImageElement>();
    let canvas: HTMLCanvasElement | undefined;
    try {
      for (const asset of required) {
        signal.throwIfAborted();
        images.set(asset.path, await loadImage(asset.dataUrl, signal));
      }
      signal.throwIfAborted();
      const map = { ...source, fogEnabled: false, dynamicFogEnabled: false };
      canvas = renderMapToCanvas(map, {
        tileSize: Math.min(24, 1024 / Math.max(map.meta.width, map.meta.height)),
        themeId: map.meta.theme ?? 'dungeon', viewMode: 'gm',
        customThemes: project.customThemes, customStamps: project.customStamps, images,
      });
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas!.toBlob(result => result ? resolve(result) : reject(new Error('The creator preview could not be encoded.')), 'image/png');
      });
      signal.throwIfAborted();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      files.push({ path: index === 0 ? 'preview.png' : `preview-${String(index + 1).padStart(2, '0')}.png`, bytes });
    } finally {
      if (canvas) { canvas.width = 0; canvas.height = 0; }
      for (const image of images.values()) image.src = '';
    }
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  signal.throwIfAborted();
  return files;
}
