import { buildFolioFurnishingReference } from './folioFurnishingReference';

export const FOLIO_TOKEN_REFERENCE_ID = 'folio-token-watch';
export const FOLIO_TOKEN_REFERENCE_NAME = 'The Lantern Watch';

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
