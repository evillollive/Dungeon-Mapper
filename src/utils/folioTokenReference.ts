import { buildFolioFurnishingReference, buildFolioCatalogReference } from './folioFurnishingReference';
import { FOLIO_TOKEN_BY_ID } from '../assets/folio-tokens-v1/catalog';

export const FOLIO_TOKEN_REFERENCE_ID = 'folio-token-watch';
export const FOLIO_TOKEN_REFERENCE_NAME = 'The Lantern Watch';
export const FOLIO_TOKEN_CATALOG_ID = 'folio-crooked-company';
export const FOLIO_TOKEN_CATALOG_NAME = 'The Crooked Company';

export function buildFolioTokenReference() {
  const project = buildFolioFurnishingReference();
  project.name = FOLIO_TOKEN_REFERENCE_NAME;
  const map = project.levels[0];
  map.meta.name = FOLIO_TOKEN_REFERENCE_NAME;
  map.meta.publicName = FOLIO_TOKEN_REFERENCE_NAME;
  map.tokens = [
    { id: 1, x: 6, y: 11, kind: 'player', label: 'Vera the Warden', icon: 'folio-token-v1-warden' },
    { id: 2, x: 8, y: 5, kind: 'npc', label: 'The Wayfinder', icon: 'folio-token-v1-wayfinder' },
    { id: 3, x: 10, y: 8, kind: 'monster', label: 'Ember Drake', icon: 'folio-token-v1-drake' },
    { id: 4, x: 12, y: 4, kind: 'monster', label: 'Hidden lookout', icon: 'folio-token-v1-drake', hidden: true },
  ];
  map.initiative = [1, 2, 3, 4];
  return project;
}

export function buildFolioTokenCatalogReference() {
  const project = buildFolioCatalogReference();
  project.name = FOLIO_TOKEN_CATALOG_NAME;
  const map = project.levels[0];
  map.meta.name = FOLIO_TOKEN_CATALOG_NAME;
  map.meta.publicName = FOLIO_TOKEN_CATALOG_NAME;
  const placements = [
    ['warden', 10, 12], ['wayfinder', 8, 5], ['drake', 16, 8],
    ['ranger', 7, 16], ['duelist', 9, 10], ['arcanist', 12, 8],
    ['sunkeeper', 18, 8], ['brute', 16, 10], ['wolf', 14, 19],
    ['owl', 10, 4], ['spider', 4, 13], ['ooze', 19, 20],
  ] as const;
  map.tokens = placements.map(([key, x, y], index) => {
    const icon = FOLIO_TOKEN_BY_ID.get(`folio-token-v1-${key}`);
    if (!icon) throw new Error(`Unknown catalog token: ${key}`);
    return { id: index + 1, x, y, kind: icon.previewKind, label: icon.name.replace('Folio ', ''), icon: icon.id };
  });
  map.tokens.push({ id: 13, x: 20, y: 4, kind: 'monster', label: 'Hidden lookout',
    icon: 'folio-token-v1-drake', hidden: true });
  map.initiative = map.tokens.map(token => token.id);
  return project;
}
