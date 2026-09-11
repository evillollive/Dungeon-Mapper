import type { CustomThemeDefinition, DungeonMap, StampDef } from '../types/map';
import { getStampDef } from './stampCatalog';

export interface ExportAssets {
  images: ReadonlyMap<string, HTMLImageElement>;
  warnings: string[];
}

export async function loadExportAssets(map: DungeonMap, customThemes: readonly CustomThemeDefinition[] = [],
  customStamps: readonly StampDef[] = [], signal?: AbortSignal): Promise<ExportAssets> {
  const images = new Map<string, HTMLImageElement>();
  const warnings: string[] = [];
  const urls = new Set<string>();
  if (map.backgroundImage) urls.add(map.backgroundImage.dataUrl);
  for (const stamp of map.stamps ?? []) {
    const def = getStampDef(stamp.stampId, customStamps);
    if (!def) warnings.push(`Missing stamp "${stamp.stampId}": a placeholder will be used.`);
    else if (def.imageDataUrl) urls.add(def.imageDataUrl);
  }
  const tileIds = new Set(map.tiles.flat().map(tile => tile.type));
  for (const theme of customThemes) for (const tile of theme.customTiles ?? []) {
    if (tileIds.has(tile.id) && tile.imageDataUrl) urls.add(tile.imageDataUrl);
  }
  for (const url of urls) {
    signal?.throwIfAborted();
    if (!/^data:image\/(?:png|jpeg|jpg|webp|svg\+xml)[;,]/i.test(url)) {
      warnings.push('External artwork is not fetched. Reimport it as an embedded image; a fallback is used.');
      continue;
    }
    const image = new Image();
    const loaded = await new Promise<boolean>((resolve, reject) => {
      const finish = (ok: boolean) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        image.onload = null;
        image.onerror = null;
        resolve(ok);
      };
      const abort = () => { finish(false); reject(signal?.reason); };
      const timer = setTimeout(() => finish(false), 5000);
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      signal?.addEventListener('abort', abort, { once: true });
      image.src = url;
    });
    signal?.throwIfAborted();
    if (loaded) images.set(url, image);
    else warnings.push('An embedded image could not be decoded. Its base color or placeholder is used.');
  }
  return { images, warnings: [...new Set(warnings)] };
}
