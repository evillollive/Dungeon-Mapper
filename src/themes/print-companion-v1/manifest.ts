import { ALL_TILE_TYPES, FLOOR_MATERIAL_IDS } from '../../types/map';

export const PRINT_COMPANION_MANIFEST = {
  packId: 'map-print-companion',
  version: '1.1.0',
  renderVersion: 2,
  author: 'Dungeon Mapper contributors',
  license: 'AGPL-3.0-or-later',
  attribution: 'Original procedural vector artwork for Dungeon Mapper, 2026.',
  source: 'src/themes/print-companion-v1/art.ts',
  sourceHash: 'sha256:513b9e1d3727f7873ec9b80c0cd01392e36510e9828258bae0aee696e60a6e02',
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
  sampleSourceHash: 'sha256:f36df90ef7a02d958f709cc204fe03aa6fbbdd6cd73b576fae4d889246000df8',
} as const;
