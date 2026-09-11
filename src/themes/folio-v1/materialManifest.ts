import { FLOOR_MATERIAL_IDS } from '../../types/map';
import { FLOOR_MATERIAL_LABELS } from './materials';

export const FLOOR_MATERIAL_MANIFEST = {
  schemaVersion: 1,
  packId: 'dungeon-folio-floors',
  version: '1.0.0',
  renderVersion: 1,
  author: 'Dungeon Mapper contributors',
  attribution: 'Original procedural floor artwork for Dungeon Mapper, 2026.',
  license: 'AGPL-3.0-or-later',
  source: 'src/themes/folio-v1/materials.ts',
  sourceHash: 'sha256:397448c2410d233c88a19045f379706ae8cd60c46bcbc913120e741e8e965dac',
  previewSampleId: 'folio-materials',
  delivery: 'bundled-procedural-vector',
  assets: FLOOR_MATERIAL_IDS.map(id => ({
    id,
    name: FLOOR_MATERIAL_LABELS[id],
    category: 'floor-material',
    viewBox: '0 0 32 32',
    footprint: [1, 1],
    anchor: [0, 0],
    variants: 4,
    fallback: 'floor',
  })),
} as const;
