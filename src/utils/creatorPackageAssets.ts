import type { DungeonMap, DungeonProject, StampDef, StampSvgPath } from '../types/map';
import { getStampDef } from './stampCatalog';
import { inspectCreatorImage, creatorLevelImagePixels, type CreatorImageAsset } from './creatorAssets';
import { inspectCreatorSvg } from './creatorSvg';
import { creatorSHA256, type CreatorPackageFile } from './creatorPackageFormat';
import { CREATOR_PACKAGE_LIMITS } from './creatorProject';

export interface CreatorPackagedImage extends CreatorImageAsset {
  path: string;
  sha256: string;
  dataUrl: string;
}
function xml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
export function inspectCreatorStampPaths(stamp: StampDef): void {
  const paths: StampSvgPath[] = [...(stamp.paths ?? []), ...(stamp.svgPath ? [{ path: stamp.svgPath }] : [])];
  if (!paths.length && !stamp.imageDataUrl) throw new Error('A custom sharing stamp has no supported image or vector paths.');
  const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${xml(stamp.viewBox)}">` +
    paths.map(path => `<path d="${xml(path.path)}"${path.fill ? ` fill="${xml(path.fill)}"` : ''}` +
      `${path.stroke ? ` stroke="${xml(path.stroke)}"` : ''}${path.strokeWidth === undefined ? '' : ` stroke-width="${path.strokeWidth}"`}/>`).join('') + '</svg>';
  inspectCreatorSvg(source);
}

export function creatorMapImageURLs(map: DungeonMap, project: DungeonProject): string[] {
  const urls = new Set<string>();
  if (map.backgroundImage) urls.add(map.backgroundImage.dataUrl);
  for (const stamp of map.stamps ?? []) {
    const definition = getStampDef(stamp.stampId, project.customStamps);
    if (!definition || definition.id !== stamp.stampId) throw new Error('A sharing stamp is no longer available.');
    if (definition.imageDataUrl) urls.add(definition.imageDataUrl);
  }
  const tileTypes = new Set(map.tiles.flatMap(row => row.map(tile => tile.type)));
  for (const room of map.roomShapes ?? []) {
    if (room.fillTile) tileTypes.add(room.fillTile);
    if (room.wallTile) tileTypes.add(room.wallTile);
    for (const door of room.doorHints ?? []) if (door.type) tileTypes.add(door.type);
  }
  for (const theme of project.customThemes ?? []) for (const tile of theme.customTiles) {
    if (tileTypes.has(tile.id) && tile.imageDataUrl) urls.add(tile.imageDataUrl);
  }
  return [...urls];
}

export async function externalizeCreatorImages(project: DungeonProject, signal: AbortSignal): Promise<{
  project: DungeonProject;
  files: CreatorPackageFile[];
  images: CreatorPackagedImage[];
}> {
  const copy = structuredClone(project), urls = new Set<string>();
  for (const map of project.levels) for (const url of creatorMapImageURLs(map, project)) urls.add(url);
  // Account for fixed files and one preview per level before native decoding.
  if (urls.size + project.levels.length + 5 > CREATOR_PACKAGE_LIMITS.members) {
    throw new Error('The sharing copy has too many image references for its file budget.');
  }
  const images: CreatorPackagedImage[] = [], byURL = new Map<string, CreatorPackagedImage>();
  let totalBytes = 0;
  for (const url of urls) {
    signal.throwIfAborted();
    const inspected = await inspectCreatorImage(url, signal);
    const sha256 = await creatorSHA256(inspected.bytes);
    const existing = images.find(image => image.sha256 === sha256);
    const image = existing ?? { ...inspected, sha256, path: `assets/${sha256}.${inspected.extension}`, dataUrl: url };
    if (!existing) {
      totalBytes += inspected.bytes.length;
      if (totalBytes > CREATOR_PACKAGE_LIMITS.expandedBytes) throw new Error('Sharing images exceed the expanded package byte budget.');
      images.push(image);
    }
    byURL.set(url, image);
  }
  for (const map of project.levels) creatorLevelImagePixels(creatorMapImageURLs(map, project).map(url => {
    const image = byURL.get(url);
    if (!image) throw new Error('A reviewed sharing image is missing.');
    return image;
  }));
  const reference = (url: string) => {
    const image = byURL.get(url);
    if (!image) throw new Error('An image is not part of the reviewed dependency closure.');
    return image.path;
  };
  for (const map of copy.levels) if (map.backgroundImage) map.backgroundImage.dataUrl = reference(map.backgroundImage.dataUrl);
  for (const theme of copy.customThemes ?? []) for (const tile of theme.customTiles) {
    if (tile.imageDataUrl) tile.imageDataUrl = reference(tile.imageDataUrl);
  }
  for (const stamp of copy.customStamps ?? []) {
    inspectCreatorStampPaths(stamp);
    if (stamp.imageDataUrl) stamp.imageDataUrl = reference(stamp.imageDataUrl);
  }
  return { project: copy, files: images.map(image => ({ path: image.path, bytes: image.bytes })), images };
}
