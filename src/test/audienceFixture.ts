import type { DungeonProject } from '../types/map';
import { createDefaultMap } from '../hooks/mapStateUtils';

export const PRIVATE_SENTINEL = 'PRIVATE_SENTINEL_UX05';

export function audienceFixture(): DungeonProject {
  const map = createDefaultMap(PRIVATE_SENTINEL);
  map.meta = { name: PRIVATE_SENTINEL, publicName: 'The Watchtower', width: 8, height: 8, tileSize: 20, theme: 'dungeon' };
  map.tiles = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ({ type: 'floor' })));
  map.fog = Array.from({ length: 8 }, (_, y) => Array.from({ length: 8 }, (_, x) => x >= 5 || y >= 5));
  map.tiles[1][1] = { type: 'secret-door', noteId: 1 };
  map.tiles[1][2] = { type: 'trap' };
  map.tiles[2][1] = { type: 'trapped-door-h' };
  map.tiles[2][2] = { type: 'trapped-door-v' };
  map.tiles[7][7] = { type: 'treasure', theme: PRIVATE_SENTINEL };
  map.notes = [
    { id: 1, x: 1, y: 1, label: PRIVATE_SENTINEL, description: PRIVATE_SENTINEL },
    { id: 2, x: 2, y: 2, label: PRIVATE_SENTINEL, description: PRIVATE_SENTINEL, published: true,
      publicLabel: 'A worn inscription', publicDescription: 'The stairs lead upward.' },
    { id: 3, x: 7, y: 7, label: PRIVATE_SENTINEL, description: PRIVATE_SENTINEL, published: true,
      publicLabel: PRIVATE_SENTINEL, publicDescription: PRIVATE_SENTINEL },
  ];
  map.tokens = [
    { id: 1, x: 0, y: 0, kind: 'player', label: 'Scout' },
    { id: 2, x: 1, y: 1, kind: 'monster', label: PRIVATE_SENTINEL, hidden: true },
    { id: 3, x: 4, y: 4, kind: 'monster', size: 2, label: PRIVATE_SENTINEL },
    { id: 4, x: 3, y: 3, kind: 'npc', label: 'Guide', hideFromInitiative: true },
  ];
  map.initiative = [2, 4, 3, 1];
  map.annotations = [{ id: 1, kind: 'gm', color: PRIVATE_SENTINEL, width: 0.1, points: [{ x: 1, y: 1 }] }];
  map.stamps = [{ id: 1, stampId: PRIVATE_SENTINEL, x: 1, y: 1, hidden: true, scale: 1, rotation: 0, flipX: false, flipY: false, opacity: 1, locked: false }];
  map.lightSources = [{ id: 1, x: 1, y: 1, label: PRIVATE_SENTINEL, radius: 2, color: '#ffffff' }];
  map.backgroundImage = { dataUrl: PRIVATE_SENTINEL, offsetX: 0, offsetY: 0, scale: 1, opacity: 1 };
  Object.assign(map, { privateExtension: PRIVATE_SENTINEL });
  Object.assign(map.tiles[0][0], { privateExtension: PRIVATE_SENTINEL });
  const secretLevel = createDefaultMap(PRIVATE_SENTINEL);
  return {
    name: PRIVATE_SENTINEL, levels: [map, secretLevel], activeLevelIndex: 0,
    stairLinks: [{ fromLevel: 0, fromCell: { x: 0, y: 0 }, toLevel: 1, toCell: { x: 0, y: 0 } }],
    customStamps: [{ id: PRIVATE_SENTINEL, name: PRIVATE_SENTINEL, category: 'custom', viewBox: '0 0 1 1', svgPath: PRIVATE_SENTINEL }],
  };
}
