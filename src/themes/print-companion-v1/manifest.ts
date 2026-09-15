import { ALL_TILE_TYPES, FLOOR_MATERIAL_IDS } from '../../types/map';

export const PRINT_COMPANION_MANIFEST = {
  packId: 'map-print-companion',
  version: '1.0.0',
  renderVersion: 1,
  author: 'Dungeon Mapper contributors',
  license: 'AGPL-3.0-or-later',
  attribution: 'Original procedural vector artwork for Dungeon Mapper, 2026.',
  source: 'src/themes/print-companion-v1/art.ts',
  sourceHash: 'sha256:5e40c19a72ca66431645d99662698b82bc1a6d07c870b9820dc254a765f32bac',
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
