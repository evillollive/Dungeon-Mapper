import type { DungeonProject, Tile, TileType } from '../types/map';
import { createFogGrid } from './mapUtils';
import { FOLIO_THEME_ID } from '../themes/folio-v1/art';

export const FOLIO_REFERENCE_ID = 'folio-cistern';
export const FOLIO_REFERENCE_NAME = 'The Quiet Cistern';

/** Hand-authored junctions and one-cell passages make this a repeatable art fixture. */
export function buildFolioReference(): DungeonProject {
  const tiles: Tile[][] = Array.from({ length: 32 }, () =>
    Array.from({ length: 32 }, () => ({ type: 'background' })));
  const fill = (x: number, y: number, w: number, h: number, type: TileType) => {
    for (let row = y; row < y + h; row++)
      for (let col = x; col < x + w; col++) tiles[row][col] = { type };
  };
  const room = (x: number, y: number, w: number, h: number) => {
    fill(x, y, w, h, 'wall');
    fill(x + 1, y + 1, w - 2, h - 2, 'floor');
  };
  const passage = (x: number, y: number, w: number, h: number) => {
    for (let row = y; row < y + h; row++)
      for (let col = x; col < x + w; col++)
        if (tiles[row][col].type === 'background') tiles[row][col] = { type: 'wall' };
  };
  room(10, 2, 13, 13);
  room(2, 6, 8, 11);
  room(24, 7, 6, 13);
  room(2, 21, 10, 8);
  room(12, 23, 11, 7);
  passage(8, 10, 18, 3);
  fill(8, 11, 18, 1, 'floor');
  passage(16, 13, 3, 13);
  fill(17, 13, 1, 13, 'floor');
  passage(9, 23, 9, 3);
  fill(9, 24, 9, 1, 'floor');
  fill(13, 5, 7, 4, 'water');
  fill(13, 9, 7, 1, 'floor');
  for (const [x, y] of [[12, 4], [20, 4], [12, 12], [20, 12]]) fill(x, y, 1, 1, 'pillar');
  fill(9, 11, 1, 1, 'door-v');
  fill(24, 11, 1, 1, 'locked-door-v');
  fill(17, 14, 1, 1, 'archway');
  fill(12, 24, 1, 1, 'door-v');
  fill(17, 23, 1, 1, 'door-h');
  fill(17, 28, 1, 1, 'stairs-up');
  fill(27, 17, 1, 1, 'stairs-down');
  fill(27, 15, 1, 1, 'trap');
  fill(28, 9, 1, 1, 'treasure');
  fill(2, 13, 1, 1, 'secret-door');
  fill(1, 13, 1, 1, 'floor');

  const fog = createFogGrid(32, 32);
  for (let y = 7; y < 20; y++)
    for (let x = 25; x < 30; x++) fog[y][x] = true;
  fog[13][1] = true;

  return {
    name: FOLIO_REFERENCE_NAME,
    activeLevelIndex: 0,
    stairLinks: [],
    levels: [{
      meta: { name: FOLIO_REFERENCE_NAME, publicName: 'The Cistern', width: 32, height: 32, tileSize: 32, theme: FOLIO_THEME_ID },
      tiles, fog, fogEnabled: true, dynamicFogEnabled: false,
      artStylePreset: 'minimal',
      notes: [
        { id: 1, x: 14, y: 26, label: 'Arrival', description: 'The stairs are the only known exit.',
          published: true, publicLabel: 'Old stair', publicDescription: 'Cool air rises from a quiet stone hall.' },
        { id: 2, x: 16, y: 4, label: 'Cistern', description: 'The basin is shallow. A key rests beneath the altar.',
          published: true, publicLabel: 'Still water', publicDescription: 'A shallow basin reflects the vaulted ceiling.' },
        { id: 3, x: 4, y: 8, label: 'Warden room', description: 'The secret door on the west wall leads to a cache.' },
        { id: 4, x: 26, y: 9, label: 'Sealed treasury', description: 'The locked room contains a trapped stair.' },
      ],
      tokens: [
        { id: 1, kind: 'player', x: 16, y: 26, label: 'Vera', icon: 'warrior' },
        { id: 2, kind: 'player', x: 18, y: 26, label: 'Nix', icon: 'rogue' },
        { id: 3, kind: 'monster', x: 27, y: 13, label: 'Cistern sentinel', icon: 'skeleton', hidden: true },
      ],
      stamps: [
        { id: 1, stampId: 'altar', x: 16, y: 3, rotation: 0, scale: 1.5, flipX: false, flipY: false, opacity: 0.85, locked: false },
        { id: 2, stampId: 'table', x: 5, y: 10, rotation: 90, scale: 1.5, flipX: false, flipY: false, opacity: 0.85, locked: false },
        { id: 3, stampId: 'barrel', x: 4, y: 25, rotation: 0, scale: 1, flipX: true, flipY: false, opacity: 0.85, locked: false },
        { id: 4, stampId: 'bookshelf', x: 7, y: 7, rotation: 0, scale: 1.5, flipX: false, flipY: false, opacity: 0.85, locked: false },
      ],
      initiative: [1, 2, 3], annotations: [], markers: [], lightSources: [],
      wallSegments: [], pathSegments: [], rivers: [], roomShapes: [],
    }],
  };
}
