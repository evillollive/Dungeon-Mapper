import type { DungeonProject, PlacedStamp, Tile } from '../types/map';
import { FOLIO_FURNISHINGS } from '../assets/folio-furnishings-v1/catalog';
import { FOLIO_THEME_ID } from '../themes/folio-v1/art';
import { createFogGrid } from './mapUtils';

export const FOLIO_FURNISHING_REFERENCE_ID = 'folio-keepers-hall';
export const FOLIO_FURNISHING_REFERENCE_NAME = "The Keeper's Hall";

export function buildFolioFurnishingReference(): DungeonProject {
  const tiles: Tile[][] = Array.from({ length: 16 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) => {
      if (x < 2 || y < 2 || x > 13 || y > 13) return { type: 'background' };
      if (x === 2 || y === 2 || x === 13 || y === 13) return { type: 'wall' };
      return {
        type: 'floor',
        ...(x <= 6 && y <= 6 ? { floorMaterial: 'folio-worn-wood-v1' } : {}),
        ...(x >= 10 && y >= 9 ? { floorMaterial: 'folio-earth-v1' } : {}),
      };
    }));
  tiles[13][7] = { type: 'door-h' };
  tiles[14][7] = { type: 'stairs-up' };
  const stamps: PlacedStamp[] = [];
  const place = (key: string, x: number, y: number, options: Partial<PlacedStamp> = {}) => {
    const def = FOLIO_FURNISHINGS.find(stamp => stamp.id === `folio-furnishings-v1-${key}`);
    if (!def) throw new Error(`Unknown reference furnishing: ${key}`);
    stamps.push({
      id: stamps.length + 1, stampId: def.id, x, y,
      scale: def.defaultScale, rotation: 0, flipX: false, flipY: false,
      opacity: 1, locked: false, ...options,
    });
  };
  place('bed', 3.6, 4);
  place('bed', 5.6, 4, { flipX: true });
  place('shelf', 3, 7.5, { rotation: 90 });
  place('shelf', 10.5, 3);
  place('table', 7.5, 8);
  place('chair', 6.15, 8, { rotation: 270 });
  place('chair', 8.85, 8, { rotation: 90 });
  place('chair', 7.5, 6.8);
  place('chair', 7.5, 9.2, { rotation: 180 });
  place('altar', 9, 4);
  place('crate', 11, 10);
  place('crate', 12, 10, { scale: 0.85, rotation: 90 });
  place('barrel', 11, 11);
  place('barrel', 12, 11, { rotation: 90, flipX: true });
  place('rubble', 10.5, 12, { rotation: 35, flipY: true });
  place('crate', 12, 3, { hidden: true });
  return {
    name: FOLIO_FURNISHING_REFERENCE_NAME,
    activeLevelIndex: 0,
    stairLinks: [],
    levels: [{
      meta: { name: FOLIO_FURNISHING_REFERENCE_NAME, publicName: "The Keeper's Hall",
        width: 16, height: 16, tileSize: 32, theme: FOLIO_THEME_ID },
      tiles, stamps, fog: createFogGrid(16, 16), fogEnabled: true, artStylePreset: 'minimal',
      notes: [
        { id: 1, x: 7, y: 3, label: 'Hall', description: 'The keeper is away; the locked supply crate is private.',
          published: true, publicLabel: 'Keeper quarters', publicDescription: 'A quiet hall with bunks, a shared table and an old stone altar.' },
        { id: 2, x: 10, y: 11, label: 'Supply cache', description: 'The concealed crate on the north wall contains the missing ledger.' },
      ],
      tokens: [
        { id: 1, x: 6, y: 11, kind: 'player', label: 'Vera', icon: 'warrior' },
        { id: 2, x: 7, y: 11, kind: 'player', label: 'Nix', icon: 'rogue' },
      ],
      initiative: [1, 2], annotations: [], markers: [], lightSources: [],
      wallSegments: [], pathSegments: [], rivers: [], roomShapes: [],
    }],
  };
}
