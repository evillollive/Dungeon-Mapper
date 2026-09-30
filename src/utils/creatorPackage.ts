import type { DungeonProject } from '../types/map';
import { prepareCreatorProject, type CreatorProjectOptions } from './creatorProject';
import type { CreatorOmission } from './creatorPackageFields';
import {
  normalizeCreatorCredit, type CreatorAssetCredit, type CreatorCredit, type CreatorLicense,
} from './creatorProvenance';
import {
  assertCreatorMembers, assertCreatorPackageId, canonicalCreatorJSON, creatorMemberIdentities,
  CREATOR_MAP_FORMAT, CREATOR_PACKAGE_FORMAT, CREATOR_FORMAT_VERSION,
  type CreatorMemberIdentity, type CreatorPackageFile,
} from './creatorPackageFormat';
import { externalizeCreatorImages } from './creatorPackageAssets';
import { renderCreatorPreviews } from './creatorPackagePreview';
import folioNotice from '../themes/folio-v1/NOTICE.txt?raw';
import furnishingNotice from '../assets/folio-furnishings-v1/NOTICE.txt?raw';
import tokenNotice from '../assets/folio-tokens-v1/NOTICE.txt?raw';
import printNotice from '../themes/print-companion-v1/NOTICE.txt?raw';

export const CREATOR_CATALOG_VERSION = 'dungeon-mapper-builtins-2026-09-30';
export interface CreatorPackageOptions extends CreatorProjectOptions {
  packageId: string;
  contentVersion: string;
  assetCredits: CreatorAssetCredit[];
  rightsConfirmed: boolean;
}
export interface CreatorPackageManifest {
  format: typeof CREATOR_PACKAGE_FORMAT;
  version: 1;
  packageId: string;
  contentVersion: string;
  catalog: typeof CREATOR_CATALOG_VERSION;
  profile: CreatorProjectOptions['profile'];
  title: string;
  author: string;
  description: string;
  license: CreatorLicense;
  levelNames: string[];
  members: CreatorMemberIdentity[];
}
export interface CreatorPackageAttribution {
  version: 1;
  contribution: CreatorCredit;
  mapSources: CreatorCredit[];
  assetCredits: CreatorAssetCredit[];
  builtins: { catalog: string; license: 'AGPL-3.0-or-later'; source: string; notices: string[] };
}
export interface PreparedCreatorPackage {
  manifest: CreatorPackageManifest;
  files: CreatorPackageFile[];
  omissions: CreatorOmission[];
  imageMetadata: { path: string; text: string[]; originalMetadataPreserved: true }[];
}

function plainMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()<>#!|]/g, character => '\\' + character);
}
const textFile = (path: string, content: string): CreatorPackageFile =>
  ({ path, bytes: new TextEncoder().encode(content) });
const licenseLink: Record<CreatorLicense, string> = {
  'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'AGPL-3.0-or-later': 'https://www.gnu.org/licenses/agpl-3.0.html',
};

export function creatorBuiltinAttribution(): CreatorPackageAttribution['builtins'] {
  return {
    catalog: CREATOR_CATALOG_VERSION, license: 'AGPL-3.0-or-later',
    source: 'https://github.com/evillollive/Dungeon-Mapper',
    notices: [folioNotice, furnishingNotice, tokenNotice, printNotice],
  };
}

export function creatorPackageRights(project: DungeonProject, options: CreatorPackageOptions) {
  if (options.rightsConfirmed !== true) throw new Error('Review ownership, inherited terms, source notices and image metadata before preparing a creator package.');
  assertCreatorPackageId(options.packageId);
  if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?$/.test(options.contentVersion) || options.contentVersion.length > 64) {
    throw new Error('Provide an explicit package content version, for example 1.0.0.');
  }
  const draft = prepareCreatorProject(project, options);
  const credits = options.assetCredits.map(credit => normalizeCreatorCredit(credit, true));
  if (new Set(credits.map(credit => credit.key)).size !== credits.length) throw new Error('Duplicate asset attribution keys need review.');
  const required = new Set(draft.assetsRequiringReview.map(asset => asset.key));
  if (credits.some(credit => !required.has(credit.key)) || [...required].some(key => !credits.some(credit => credit.key === key))) {
    throw new Error('Every included custom asset needs its own reviewed source/license record; do not include unrelated credits.');
  }
  for (const prior of draft.provenance.assetCredits) {
    if (!required.has(prior.key)) continue;
    const current = credits.find(credit => credit.key === prior.key);
    if (!current || JSON.stringify(current) !== JSON.stringify(normalizeCreatorCredit(prior, true))) {
      throw new Error('Existing asset source notices must be preserved rather than replaced.');
    }
  }
  const attribution: CreatorPackageAttribution = {
    version: 1,
    contribution: { title: draft.project.name, author: draft.author, license: draft.license },
    mapSources: draft.provenance.mapSources,
    assetCredits: credits,
    builtins: creatorBuiltinAttribution(),
  };
  return { draft, attribution };
}

/** Produces reviewable member bytes only. Download/publication is a separate explicit action. */
export async function prepareCreatorPackage(project: DungeonProject, options: CreatorPackageOptions,
  signal: AbortSignal): Promise<PreparedCreatorPackage> {
  signal.throwIfAborted();
  const selected = structuredClone(options);
  const { draft, attribution } = creatorPackageRights(project, selected);
  const external = await externalizeCreatorImages(draft.project, signal);
  signal.throwIfAborted();
  const map = canonicalCreatorJSON({ format: CREATOR_MAP_FORMAT, version: CREATOR_FORMAT_VERSION, project: external.project });
  const attributionBytes = canonicalCreatorJSON(attribution);
  const files: CreatorPackageFile[] = [
    { path: 'map.json', bytes: map }, { path: 'ATTRIBUTION.json', bytes: attributionBytes }, ...external.files,
    textFile('LICENSE.txt', [
      `${draft.license}: ${licenseLink[draft.license]}`,
      '',
      `Creator contribution: ${draft.project.name}`,
      `Credit: ${draft.author}`,
      'This choice applies to the creator contribution, not as a replacement for inherited map or component licenses.',
      'Existing sources and asset notices are retained in ATTRIBUTION.json.',
      'Built-in artwork and its preview rendering retain the source notices recorded there.',
      'Do not assume that public visibility, a checksum or this file proves ownership or compatibility.',
      '',
    ].join('\n')),
    textFile('README.md', [
      `# ${plainMarkdown(draft.project.name)}`, '',
      plainMarkdown(draft.description), '',
      `Creator: ${plainMarkdown(draft.author)}`,
      `Contribution license: ${draft.license}`,
      `Content version: ${selected.contentVersion}`, '',
      '**Creator-sharing copy, not a player-safe display or a private project backup.**',
      draft.profile === 'encounter' ? 'Contains explicitly selected DM encounter material and spoilers.'
        : 'Contains the full selected map layout, including secret passages and hazards.',
      '',
      'Inspect previews, LICENSE.txt and ATTRIBUTION.json before use or redistribution.',
      'Import into a compatible Dungeon Mapper version as a new local project.',
      'No local recovery history or separate live session is included.',
      '',
      'For GitHub, upload this map directory to a repository you control only after reviewing content, rights and visibility.',
      'Repository writes can trigger workflows. Obtain any required permission and Actions budget first.',
      'No authentication token or workflow is included in this package.',
      '',
    ].join('\n')),
  ];
  assertCreatorMembers(files, false);
  files.push(...await renderCreatorPreviews(external.project, external.images, signal));
  const manifest: CreatorPackageManifest = {
    format: CREATOR_PACKAGE_FORMAT, version: CREATOR_FORMAT_VERSION,
    packageId: selected.packageId, contentVersion: selected.contentVersion,
    catalog: CREATOR_CATALOG_VERSION, profile: draft.profile,
    title: draft.project.name, author: draft.author, description: draft.description, license: draft.license,
    levelNames: draft.project.levels.map(map => map.meta.name),
    members: await creatorMemberIdentities(files),
  };
  signal.throwIfAborted();
  files.push({ path: 'manifest.json', bytes: canonicalCreatorJSON(manifest) });
  assertCreatorMembers(files);
  return {
    manifest, files, omissions: draft.omissions,
    imageMetadata: external.images.map(image => ({
      path: image.path, text: image.svg?.metadata ?? [], originalMetadataPreserved: true,
    })),
  };
}
