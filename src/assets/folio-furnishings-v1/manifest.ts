import { FOLIO_FURNISHINGS } from './catalog';

const SOURCE_HASHES: Record<string, string> = {
  'table.svg': 'd7e4c1b38ab2dc98415b62b7b53053b39bc7a0a36dd9bb0428a05cc2900de683',
  'chair.svg': '353ebed51aa8d496c72d9e927fb3b7465baa934c1787e034615b8ebeaec474e7',
  'bed.svg': '14afd55dc14d4d2f6588aa127f0755e59ed6e462fe77d93e9f279edc8afcc008',
  'shelf.svg': '1d6ce9bae4dfb71e621188dcd6c72bee9270c334b867be3ddec0bbcaf8eb250b',
  'crate.svg': '8ee833b9910d3c1da5b5aebbdc8ce71a8854be962ef009d57f830a652d9d1835',
  'barrel.svg': '46d07b45cfaf64da42db53c0af79b4c5e811e1c13e5b32b5e3994fdef4460b98',
  'altar.svg': 'b931e20be2c50e0d71295c66257b59323436fd871cb6ac3b260df0e74bc72956',
  'rubble.svg': '2933077e5e67c2e4c56b30355b707ff1df413dddaa7d64bd59fa32d66eb8915e',
};

export const FOLIO_FURNISHING_MANIFEST = {
  schemaVersion: 1,
  packId: 'dungeon-folio-furnishings',
  version: '1.0.0',
  renderVersion: 1,
  author: 'Dungeon Mapper contributors',
  attribution: 'Original top-down SVG artwork for Dungeon Mapper, 2026.',
  license: 'AGPL-3.0-or-later',
  delivery: 'bundled-vector',
  previewSampleId: 'folio-keepers-hall',
  shadow: { direction: 'southeast', frameOffset: [2 / 64, 3 / 64], opacity: 0.18 },
  assets: FOLIO_FURNISHINGS.map(stamp => {
    const hash = SOURCE_HASHES[stamp.sourceFile.split('/').at(-1)!];
    if (!hash) throw new Error(`Missing source fingerprint for ${stamp.id}`);
    return {
      id: stamp.id,
      name: stamp.name,
      category: stamp.category,
      tags: ['folio', 'top-down', stamp.category],
      viewBox: stamp.viewBox,
      frameCells: [1, 1],
      anchor: [32, 32],
      defaultScale: stamp.defaultScale,
      source: stamp.sourceFile,
      sourceHash: `sha256:${hash}`,
      preview: stamp.sourceFile,
      fallback: 'folio-furnishings-unavailable',
    };
  }),
} as const;
