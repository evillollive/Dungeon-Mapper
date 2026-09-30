import { CREATOR_PACKAGE_LIMITS } from './creatorProject';
import { inspectCreatorSvg, type CreatorSvgInspection } from './creatorSvg';
import { loadImage } from './projectCreation';
import { creatorImageDimensions } from './creatorImageDimensions';

export interface CreatorImageAsset {
  bytes: Uint8Array<ArrayBuffer>;
  mime: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml';
  extension: 'png' | 'jpg' | 'webp' | 'svg';
  width: number;
  height: number;
  svg?: CreatorSvgInspection;
}

function matches(bytes: Uint8Array, expected: readonly number[], offset = 0): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

/** No fetches, metadata stripping or asset rewrites. The caller still owns rights review. */
export async function inspectCreatorImage(dataUrl: string, signal: AbortSignal): Promise<CreatorImageAsset> {
  signal.throwIfAborted();
  if (typeof dataUrl !== 'string' || dataUrl.length > Math.ceil(CREATOR_PACKAGE_LIMITS.imageBytes / 3) * 4 + 64) {
    throw new Error('A sharing image exceeds the 10 MiB encoded-source limit.');
  }
  const match = /^data:(image\/(?:png|jpeg|jpg|webp|svg\+xml));base64,([A-Za-z0-9+/]*={0,2})$/.exec(dataUrl);
  if (!match || !match[2] || match[2].length % 4) throw new Error('Sharing images must be embedded base64 PNG, JPEG, WebP or supported SVG files. External images are not fetched.');
  const binary = atob(match[2]);
  if (binary.length > CREATOR_PACKAGE_LIMITS.imageBytes) throw new Error('A sharing image exceeds the 10 MiB encoded-source limit.');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  let mime: CreatorImageAsset['mime'], extension: CreatorImageAsset['extension'];
  let svg: CreatorSvgInspection | undefined;
  if (match[1] === 'image/png') {
    if (!matches(bytes, [137, 80, 78, 71, 13, 10, 26, 10])) throw new Error('The sharing PNG signature does not match its declared type.');
    mime = 'image/png'; extension = 'png';
  } else if (match[1] === 'image/jpeg' || match[1] === 'image/jpg') {
    if (!matches(bytes, [255, 216, 255])) throw new Error('The sharing JPEG signature does not match its declared type.');
    mime = 'image/jpeg'; extension = 'jpg';
  } else if (match[1] === 'image/webp') {
    if (!matches(bytes, [82, 73, 70, 70]) || !matches(bytes, [87, 69, 66, 80], 8)) throw new Error('The sharing WebP signature does not match its declared type.');
    mime = 'image/webp'; extension = 'webp';
  } else {
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      throw new Error('The sharing SVG is not valid UTF-8. Keep the original file.', { cause: error });
    }
    svg = inspectCreatorSvg(text);
    mime = 'image/svg+xml'; extension = 'svg';
  }
  if (mime !== 'image/svg+xml') creatorImageDimensions(bytes, mime);
  signal.throwIfAborted();
  const image = await loadImage(dataUrl, signal);
  try {
    signal.throwIfAborted();
    const width = image.naturalWidth, height = image.naturalHeight;
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 ||
        width * height > CREATOR_PACKAGE_LIMITS.imagePixels) {
      throw new Error('A sharing image exceeds the 24-million-pixel decoded limit.');
    }
    return { bytes, mime, extension, width, height, ...(svg ? { svg } : {}) };
  } finally {
    image.src = '';
  }
}
