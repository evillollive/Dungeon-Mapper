import { CREATOR_PACKAGE_LIMITS } from './creatorProject';

type RasterMime = 'image/png' | 'image/jpeg' | 'image/webp';
export interface CreatorImageDimensions { width: number; height: number }

function invalid(): never {
  throw new Error('The sharing image has an invalid, truncated or unsupported static image header.');
}
function bounded(width: number, height: number): CreatorImageDimensions {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 ||
      width * height > CREATOR_PACKAGE_LIMITS.imagePixels) {
    throw new Error('A sharing image exceeds the 24-million-pixel decoded limit.');
  }
  return { width, height };
}

/** Read declared dimensions before invoking a native decoder. Animation is not admitted. */
export function creatorImageDimensions(bytes: Uint8Array, mime: RasterMime): CreatorImageDimensions {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (offset: number, length: number) => String.fromCharCode(...bytes.subarray(offset, offset + length));
  if (mime === 'image/png') {
    if (bytes.length < 33 || view.getUint32(8) !== 13 || text(12, 4) !== 'IHDR') invalid();
    const dimensions = bounded(view.getUint32(16), view.getUint32(20));
    let offset = 8, headers = 0, data = false;
    while (offset + 12 <= bytes.length) {
      const size = view.getUint32(offset), kind = text(offset + 4, 4);
      if (size > bytes.length - offset - 12) invalid();
      if (kind === 'IHDR' && ++headers > 1) invalid();
      if (['acTL', 'fcTL', 'fdAT'].includes(kind)) throw new Error('Animated PNG files are not supported in creator packages. Keep the original and choose a static image.');
      if (kind === 'IDAT') data = true;
      offset += size + 12;
      if (kind === 'IEND') {
        if (size !== 0 || offset !== bytes.length || !data) invalid();
        return dimensions;
      }
    }
    invalid();
  }
  if (mime === 'image/webp') {
    if (bytes.length < 20 || view.getUint32(4, true) + 8 !== bytes.length) invalid();
    let offset = 12, canvas: CreatorImageDimensions | undefined, frame: CreatorImageDimensions | undefined;
    const uint24 = (start: number) => bytes[start] | bytes[start + 1] << 8 | bytes[start + 2] << 16;
    while (offset + 8 <= bytes.length) {
      const kind = text(offset, 4), size = view.getUint32(offset + 4, true), start = offset + 8;
      if (size > bytes.length - start) invalid();
      if (kind === 'ANIM' || kind === 'ANMF') throw new Error('Animated WebP files are not supported in creator packages. Keep the original and choose a static image.');
      if (kind === 'VP8X') {
        if (canvas || size !== 10 || (bytes[start] & 2)) invalid();
        canvas = bounded(uint24(start + 4) + 1, uint24(start + 7) + 1);
      }
      if (kind === 'VP8 ') {
        if (frame || size < 10 || (bytes[start] & 1) || text(start + 3, 3) !== '\x9d\x01\x2a') invalid();
        frame = bounded(view.getUint16(start + 6, true) & 0x3fff, view.getUint16(start + 8, true) & 0x3fff);
      }
      if (kind === 'VP8L') {
        if (frame || size < 5 || bytes[start] !== 0x2f || (bytes[start + 4] >> 5)) invalid();
        frame = bounded(1 + (bytes[start + 1] | (bytes[start + 2] & 63) << 8),
          1 + ((bytes[start + 2] >> 6) | bytes[start + 3] << 2 | (bytes[start + 4] & 15) << 10));
      }
      offset = start + size + size % 2;
    }
    if (offset !== bytes.length || !frame ||
        (canvas && (canvas.width !== frame.width || canvas.height !== frame.height))) invalid();
    return frame;
  }
  let offset = 2, scanning = false, frame: CreatorImageDimensions | undefined;
  while (offset < bytes.length) {
    if (scanning) {
      while (offset < bytes.length && bytes[offset] !== 0xff) offset++;
    }
    if (offset >= bytes.length || bytes[offset++] !== 0xff) invalid();
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) invalid();
    const marker = bytes[offset++];
    if (scanning && (marker === 0 || (marker >= 0xd0 && marker <= 0xd7))) continue;
    scanning = false;
    if (marker === 0xd9) {
      if (!frame || offset !== bytes.length) invalid();
      return frame;
    }
    if (offset + 2 > bytes.length) invalid();
    const length = view.getUint16(offset);
    if (length < 2 || length > bytes.length - offset) invalid();
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (frame || length < 8) invalid();
      frame = bounded(view.getUint16(offset + 5), view.getUint16(offset + 3));
    } else if (marker === 0xda) {
      if (!frame) invalid();
      scanning = true;
    } else if (![0xc4, 0xdb, 0xdd, 0xfe].includes(marker) && !(marker >= 0xe0 && marker <= 0xef)) {
      invalid();
    }
    offset += length;
  }
  invalid();
}
