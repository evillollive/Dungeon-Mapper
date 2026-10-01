import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { CREATOR_PACKAGE_LIMITS } from '../../src/utils/creatorPackageContract';
import { inspectCreatorZip } from '../../src/utils/creatorPackageImport';
import { readCreatorPackageOrigin } from '../../src/utils/creatorPackageOrigin';
import type { CreatorImageDecoder } from '../../src/utils/creatorAssets';

sharp.cache(false);
sharp.concurrency(1);

const decodeNativeImage: CreatorImageDecoder = async (dataUrl, signal) => {
  signal.throwIfAborted();
  const source = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  const image = sharp(source, { limitInputPixels: CREATOR_PACKAGE_LIMITS.imagePixels, failOn: 'warning',
    sequentialRead: true, density: 72 });
  const abort = () => { image.destroy(); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    const metadata = await image.metadata();
    if (!['png', 'jpeg', 'webp', 'svg'].includes(metadata.format) || (metadata.pages ?? 1) !== 1) {
      throw new Error('Unsupported native image format.');
    }
    // Force full decoding, not just a successful image header read.
    const result = await image.timeout({ seconds: 6 }).raw().toBuffer({ resolveWithObject: true });
    signal.throwIfAborted();
    return { width: result.info.width, height: result.info.height };
  } finally {
    signal.removeEventListener('abort', abort);
    image.destroy();
  }
};

export async function inspect(bytes: Uint8Array, signal: AbortSignal) {
  const result = await inspectCreatorZip(bytes, signal, decodeNativeImage);
  const origin = readCreatorPackageOrigin(result.project.creatorPackageOrigin);
  if (!origin) throw new Error('Missing validated package receipt.');
  return {
    package: {
      packageId: origin.packageId, contentVersion: origin.contentVersion,
      packageSha256: createHash('sha256').update(bytes).digest('hex'), zipBytes: bytes.length,
      expandedBytes: origin.files.reduce((sum, file) => sum + file.bytes, 0), memberCount: origin.files.length,
    },
    profile: result.manifest.profile, license: result.manifest.license,
  };
}
