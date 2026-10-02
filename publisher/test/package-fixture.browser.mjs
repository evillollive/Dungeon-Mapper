import { creatorPackageFixture, creatorPackageOptions } from '../../src/test/creatorPackageFixture.ts';
import { prepareCreatorPackage } from '../../src/utils/creatorPackage.ts';

export async function generate() {
  const project = creatorPackageFixture();
  project.levels[0].notes[1].description = 'PUBLISHER_LOCAL_DM_NOTE_DO_NOT_TRANSMIT';
  const options = { ...creatorPackageOptions(), profile: 'encounter',
    title: 'Publisher local review fixture', author: 'Synthetic fixture author',
    packageId: 'publisher-local-vault', contentVersion: '1.0.0', assetCredits: [], rightsConfirmed: true };
  options.levels[0].notes = [2];
  const signal = AbortSignal.timeout(10_000);
  const prepared = await prepareCreatorPackage(project, options, signal);
  return {
    packageId: options.packageId, contentVersion: options.contentVersion,
    files: prepared.files.map(file => ({ path: file.path, bytes: Array.from(file.bytes) })),
  };
}
