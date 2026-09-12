import type { DungeonProject, PlacedStamp, Tile } from '../types/map';
import { FOLIO_FURNISHINGS } from '../assets/folio-furnishings-v1/catalog';
import { FOLIO_THEME_ID } from '../themes/folio-v1/art';
import { createFogGrid } from './mapUtils';

export const FOLIO_FURNISHING_REFERENCE_ID = 'folio-keepers-hall';
export const FOLIO_FURNISHING_REFERENCE_NAME = "The Keeper's Hall";
export const FOLIO_CATALOG_REFERENCE_ID = 'folio-wayfarers-refuge';
export const FOLIO_CATALOG_REFERENCE_NAME = "The Wayfarer's Refuge";

function furnishingPlacer(stamps: PlacedStamp[]) {
  return (key: string, x: number, y: number, options: Partial<PlacedStamp> = {}) => {
    const def = FOLIO_FURNISHINGS.find(stamp => stamp.id === `folio-furnishings-v1-${key}`);
    if (!def) throw new Error(`Unknown reference furnishing: ${key}`);
    stamps.push({
      id: stamps.length + 1, stampId: def.id, x, y,
      scale: def.defaultScale, rotation: 0, flipX: false, flipY: false,
      opacity: 1, locked: false, ...options,
    });
  };
}

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
  const place = furnishingPlacer(stamps);
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

export function buildFolioCatalogReference(): DungeonProject {
  const tiles: Tile[][] = Array.from({ length: 24 }, (_, y) =>
    Array.from({ length: 24 }, (_, x) => {
      if (x < 2 || x > 21 || y < 2 || y > 21) return { type: 'background' };
      if (y > 14) return { type: 'floor', floorMaterial: 'folio-earth-v1' };
      if (x === 2 || x === 21 || y === 2 || y === 14 ||
          (y === 8 && x < 10) || (x === 14 && y < 10)) return { type: 'wall' };
      return { type: 'floor', ...(x < 10 && y < 8 ? { floorMaterial: 'folio-worn-wood-v1' } : {}) };
    }));
  tiles[8][7] = { type: 'door-h' };
  tiles[7][14] = { type: 'archway' };
  tiles[14][11] = { type: 'door-h' };
  const stamps: PlacedStamp[] = [];
  const place = furnishingPlacer(stamps);
  place('bed', 3.7, 4);
  place('bed', 5.7, 4, { flipX: true });
  place('wardrobe', 8, 3.5);
  place('chest', 3.7, 6);
  place('desk', 8, 6);
  place('stool', 8, 7);
  place('shelf', 11.5, 3);
  place('round-table', 11, 6);
  place('chair', 11, 4.9);
  place('chair', 12.2, 6, { rotation: 90 });
  place('altar', 17.5, 3.3);
  place('sarcophagus', 17.5, 6);
  place('brazier', 15.5, 4);
  place('brazier', 19.5, 4);
  place('table', 6, 11);
  place('bench', 6, 9.9);
  place('bench', 6, 12.1, { flipY: true });
  place('weapon-rack', 12, 10, { rotation: 90 });
  place('crate', 19, 10);
  place('crate', 20, 10, { rotation: 90, scale: 0.85 });
  place('barrel', 19, 11);
  place('sacks', 20, 12, { rotation: -20 });
  place('rubble', 16, 12, { rotation: 35, flipY: true });
  place('tent', 5, 18);
  place('campfire', 11, 18);
  place('bedroll', 8.5, 18, { rotation: 15 });
  place('bedroll', 13.5, 18, { rotation: -15, flipX: true });
  place('sacks', 4, 20);
  place('boulder', 19, 18, { rotation: 25 });
  place('fern', 18, 17, { flipX: true });
  place('shrub', 20, 16, { rotation: 45 });
  place('shrub', 3, 16, { flipY: true });
  place('fern', 17, 20, { rotation: -40 });
  place('chest', 20, 6, { hidden: true });
  return {
    name: FOLIO_CATALOG_REFERENCE_NAME, activeLevelIndex: 0, stairLinks: [],
    levels: [{
      meta: { name: FOLIO_CATALOG_REFERENCE_NAME, publicName: FOLIO_CATALOG_REFERENCE_NAME,
        width: 24, height: 24, tileSize: 32, theme: FOLIO_THEME_ID },
      tiles, stamps, fog: createFogGrid(24, 24), fogEnabled: true, artStylePreset: 'minimal',
      notes: [
        { id: 1, x: 10, y: 12, label: 'Refuge', description: 'A roadside refuge with a communal hall, bunks and a forgotten chapel.',
          published: true, publicLabel: 'Roadside refuge',
          publicDescription: 'Rest in the hall or camp outside. The chapel beyond the eastern arch is quiet.' },
        { id: 2, x: 20, y: 7, label: 'Hidden ledger', description: 'The private chapel chest holds a sealed route ledger.' },
      ],
      tokens: [
        { id: 1, x: 10, y: 20, kind: 'player', label: 'Vera', icon: 'warrior' },
        { id: 2, x: 11, y: 20, kind: 'player', label: 'Nix', icon: 'rogue' },
      ],
      initiative: [1, 2], annotations: [], markers: [], lightSources: [],
      wallSegments: [], pathSegments: [], rivers: [], roomShapes: [],
    }],
  };
}
