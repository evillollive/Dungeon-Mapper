import { ALL_TILE_TYPES, FLOOR_MATERIAL_IDS } from '../../types/map';

export const PRINT_COMPANION_MANIFEST = {
  packId: 'map-print-companion',
  version: '1.0.0',
  renderVersion: 1,
  author: 'Dungeon Mapper contributors',
  license: 'AGPL-3.0-or-later',
  attribution: 'Original procedural vector artwork for Dungeon Mapper, 2026.',
  source: 'src/themes/print-companion-v1/art.ts',
  sourceHash: 'sha256:3c91d96d2de1759c1ff5135516c4c50c436bfeb91f85ef8c15e1257785610ade',
  delivery: 'bundled-procedural-vector',
  previewSampleIds: ['launch-lantern-crypt', 'launch-alder-crossing', 'launch-kestrel-bay'],
  assets: ['empty', ...ALL_TILE_TYPES, ...FLOOR_MATERIAL_IDS].map(id => ({
    id: `map-print-companion:v1:${id}`,
    category: 'print-tile',
    viewBox: '0 0 32 32',
    footprint: [1, 1],
    anchor: [0, 0],
    fallbackTile: FLOOR_MATERIAL_IDS.some(material => material === id) ? 'floor' : id,
  })),
  tokenFrames: 'src/utils/folioTokenRender.ts',
  legacyTokens: 'src/utils/printTokenRender.ts',
  legacyTokenSourceHash: 'sha256:5950aca9bf17c696eae80fed7ed5392229abe2f2b075d693af79f03f02079fff',
  sampleSource: 'src/utils/launchSamples.ts',
  sampleSourceHash: 'sha256:5a01942bfae19efc34ffc030680f8e0de820786066e04d0f2582e5e3e339ec0e',
} as const;
