import { inspectCreatorZip } from '../../src/utils/creatorPackageImport.ts';
import { creatorSHA256 } from '../../src/utils/creatorPackageFormat.ts';
import { readCreatorPackageOrigin } from '../../src/utils/creatorPackageOrigin.ts';
import { CREATOR_PACKAGE_LIMITS } from '../../src/utils/creatorPackageContract.ts';

export async function inspectLocalPackage(file, signal) {
  signal.throwIfAborted();
  if (!file.size || file.size > CREATOR_PACKAGE_LIMITS.zipBytes) throw new Error('Choose a nonempty creator ZIP no larger than 32 MiB, not a private project backup.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  signal.throwIfAborted();
  const inspected = await inspectCreatorZip(bytes, signal);
  const origin = readCreatorPackageOrigin(inspected.project.creatorPackageOrigin);
  if (!origin) throw new Error('The selected package did not produce a validated member receipt.');
  const packageSha256 = await creatorSHA256(bytes);
  signal.throwIfAborted();
  return {
    bytes,
    manifest: inspected.manifest,
    previews: inspected.previews,
    notices: inspected.sourceNotices,
    metadataWarning: inspected.imageMetadataWarning,
    metadata: {
      packageId: inspected.manifest.packageId, contentVersion: inspected.manifest.contentVersion,
      packageSha256, zipBytes: bytes.length, expandedBytes: origin.files.reduce((sum, file) => sum + file.bytes, 0),
      memberCount: origin.files.length,
    },
  };
}
