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
  'round-table.svg': 'f0c22dff3de15f2ba9d9a1696eba4214bdb0bc6f9df10c6b5465ee3fc63d29e2',
  'bench.svg': '9ea4c24fc37b76e771e8af1bf1ea63cd93bfbaa6a5e91a7a99c2fb9019a6ccf9',
  'stool.svg': '48a6ef1837427b7b8f58c6d4a8f3782bf9da5cf402031a564fdef0593085917c',
  'desk.svg': 'f6e970d7e7ab6e3efaba05d7eeb3b26225fceaaccfa62b524fa401a57e3b8858',
  'chest.svg': 'deb31bca26e19b33ba6438092fd188e53f77c4f6c0ab7c2959931e11ac397652',
  'wardrobe.svg': '903a89cc38ae97b0c47767eb86bfb1066cc4807c6f978bca003c8a1e7e86b64a',
  'weapon-rack.svg': 'a90f4882703f3d425e0b7a1975c07c5c2bd1850dc03b9627d907fc500ae633a6',
  'brazier.svg': '6998b2ed40eaa2eaba83db2f2d92d25c062fefee563a7a876192837612d4b503',
  'sarcophagus.svg': 'ee1bee2f7a0f78c7199e440d127320a72bf4fc64b37d567b483f3c2003f99461',
  'sacks.svg': 'edc450130072362ee0f88c14f63595a94ccf64cde43fffb0dadec0f76312a689',
  'boulder.svg': 'cdcf3805984c7aa2e3f411abbacd57e717405cadaeb20570219aab17edc86c70',
  'fern.svg': '85d246c96abac70a1c8a47ca3628900d6c8b324c953c6dc762dbceef451db95a',
  'shrub.svg': '75b3214e1e1b793129e01f43d7b2d4f2473c8a7d5982411d070c7982a5784d6a',
  'campfire.svg': 'f9a79fd986994f90d729bf20a093e3a58f5a18fa8207c55800ef95fb01e552e7',
  'bedroll.svg': '0dabd3d0dfaec23f4ab787a30f5135a304ce46301cd9ee846bbe5246b16a32cb',
  'tent.svg': '33651bb668c61fb112d7910b3b38266f2876864a68233313a549d2e7a3cc145f',
};

export const FOLIO_FURNISHING_MANIFEST = {
  schemaVersion: 1,
  packId: 'dungeon-folio-furnishings',
  version: '1.1.0',
  renderVersion: 1,
  author: 'Dungeon Mapper contributors',
  attribution: 'Original top-down SVG artwork for Dungeon Mapper, 2026.',
  license: 'AGPL-3.0-or-later',
  delivery: 'bundled-vector',
  previewSampleId: 'folio-wayfarers-refuge',
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
