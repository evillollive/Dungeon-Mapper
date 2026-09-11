import { FOLIO_FURNISHINGS } from './catalog';

const SOURCE_HASHES: Record<string, string> = {
  'table.svg': '46b6fd38f9642192a2c65081cc0ef600e167ae731cc6f4598536765ae0697dd7',
  'chair.svg': '0f95e0fc18e45930f2d460279e6f3aae2b25c44ca452a49288821889c4c1371c',
  'bed.svg': 'a5fe1a9e29f5482ebfc9b5df7186e36f58d2c18be6c0ac05f783345c9231e3b0',
  'shelf.svg': '49d68a30e161b1f0a42167eb3234a90df215829824e3353a79b44763c56620ec',
  'crate.svg': 'c7186dc48ce140884fc956f469a5d1d7c04fc9fe3c35e31f5da999ef7b8d50ba',
  'barrel.svg': '5243557ecd9a3168a1cd25d77d8c6eeb3c23ce199ed9fbe3c34e751f61360b3c',
  'altar.svg': 'e883417ef08220a558c07ac3f119e1417d0baedf8ead7e31e2093b63d0b89d22',
  'rubble.svg': '2fcaa1c1bc0d651fb13a4214ac3380c13c5120f1290f3f07025bd4be5f5d0f09',
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
