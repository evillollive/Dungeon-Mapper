export const CREATOR_PACKAGE_LIMITS = {
  zipBytes: 32 * 1024 * 1024,
  expandedBytes: 64 * 1024 * 1024,
  mapBytes: 16 * 1024 * 1024,
  levels: 32,
  cells: 262_144,
  members: 256,
  depth: 32,
  imageBytes: 10 * 1024 * 1024,
  imagePixels: 24_000_000,
  levelImagePixels: 24_000_000,
} as const;
export const CREATOR_PACKAGE_FORMAT = 'dungeon-mapper-creator-package';
export const CREATOR_MAP_FORMAT = 'dungeon-mapper-creator-map';
export const CREATOR_FORMAT_VERSION = 1;
export const CREATOR_CATALOG_VERSION = 'dungeon-mapper-builtins-2026-09-30';
export const CREATOR_REQUIRED_FILES = [
  'manifest.json', 'map.json', 'preview.png', 'README.md', 'LICENSE.txt', 'ATTRIBUTION.json',
] as const;

export function assertCreatorPackageId(value: string): void {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(value)) {
    throw new Error('A creator package ID must contain 1 to 64 lowercase letters, digits or hyphens, starting with a letter or digit.');
  }
}
export function isCreatorContentVersion(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 64 &&
    /^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?$/.test(value);
}
export function assertCreatorMemberPath(path: string): void {
  if (typeof path !== 'string' || (!CREATOR_REQUIRED_FILES.some(file => file === path) &&
      !/^preview-(?:0[2-9]|[12]\d|3[0-2])\.png$/.test(path) &&
      !/^assets\/[a-f0-9]{64}\.(?:png|jpg|webp|svg)$/.test(path))) {
    throw new Error('The creator package contains an unsupported or unsafe member path.');
  }
}
