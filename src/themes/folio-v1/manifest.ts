import { ALL_TILE_TYPES } from '../../types/map';
import { FOLIO_THEME_ID } from './art';
import { FLOOR_MATERIAL_MANIFEST } from './materialManifest';
import { FOLIO_FURNISHING_MANIFEST } from '../../assets/folio-furnishings-v1/manifest';

export const FOLIO_MANIFEST = {
  schemaVersion: 1,
  packId: 'dungeon-folio',
  version: '1.0.0',
  renderVersion: 1,
  themeId: FOLIO_THEME_ID,
  name: 'Dungeon Folio',
  author: 'Dungeon Mapper contributors',
  source: 'src/themes/folio-v1/art.ts',
  sourceHash: 'sha256:263c8b1e69bc1e05e300c47904acff431259e150e06f8b958adbfe178978b8e3',
  license: 'AGPL-3.0-or-later',
  attribution: 'Original procedural vector artwork for Dungeon Mapper, 2026.',
  fallbackThemeId: 'dungeon',
  delivery: 'bundled-procedural-vector',
  previewSampleId: 'folio-cistern',
  supplements: [FLOOR_MATERIAL_MANIFEST, FOLIO_FURNISHING_MANIFEST],
  assets: ALL_TILE_TYPES.map(type => ({
    id: `dungeon-folio:v1:${type}`,
    category: 'tile',
    tags: ['dungeon', type],
    viewBox: '0 0 32 32',
    footprint: [1, 1],
    anchor: [0, 0],
    variants: type === 'wall' || type === 'secret-door' || type === 'empty' ? 1 : 4,
    previewTile: type,
    fallbackTile: type,
  })),
} as const;

export function isUnavailableFolio(themeId: string): boolean {
  return themeId.startsWith('dungeon-folio-') && themeId !== FOLIO_THEME_ID;
}
