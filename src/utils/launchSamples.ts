import type { DungeonMap, DungeonProject, Tile, Token } from '../types/map';
import type { PremadeMapSummary } from './premadeMaps';
import { FOLIO_THEME_ID } from '../themes/folio-v1/art';
import { furnishingPlacer } from './folioFurnishingReference';
import { createFogGrid } from './mapUtils';

export const LAUNCH_SAMPLES: readonly PremadeMapSummary[] = [
  {
    id: 'launch-lantern-crypt', name: 'The Lantern Crypt', themeId: FOLIO_THEME_ID,
    themeLabel: 'Dungeon Folio v1', archetype: 'Launch encounter / Crypt',
    sizeLabel: '24 x 24', levelCount: 1,
    description: 'Follow the lantern stair to a flooded memorial, a keeper study and a sealed burial chamber. Includes a public arrival and private encounter notes.',
  },
  {
    id: 'launch-alder-crossing', name: 'Alder Crossing', themeId: 'wilderness',
    themeLabel: 'Wilderness', archetype: 'Launch encounter / Woodland crossing',
    sizeLabel: '24 x 24', levelCount: 1,
    description: 'A timber bridge spans a woodland stream between a sheltered camp and a rocky lookout. Clear approaches leave room for an encounter.',
  },
  {
    id: 'launch-kestrel-bay', name: 'Kestrel Docking Bay', themeId: 'starship',
    themeLabel: 'Starship', archetype: 'Launch encounter / Ship compartment',
    sizeLabel: '24 x 24', levelCount: 1,
    description: 'Board through the aft airlock, cross the cargo deck and reach the coolant core. Crew quarters and a maintenance route offer alternate approaches.',
  },
];

function scene(summary: PremadeMapSummary) {
  const map: DungeonMap = {
    meta: { name: summary.name, publicName: summary.name, width: 24, height: 24, tileSize: 32, theme: summary.themeId },
    tiles: Array.from({ length: 24 }, () => Array.from({ length: 24 }, (): Tile => ({ type: 'background' }))),
    notes: [], stamps: [], tokens: [], fog: createFogGrid(24, 24), fogEnabled: false,
    artStylePreset: 'minimal', annotations: [], markers: [], initiative: [],
    wallSegments: [], pathSegments: [], rivers: [], roomShapes: [], lightSources: [],
  };
  const fill = (x: number, y: number, w: number, h: number, tile: Tile) => {
    for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) {
      map.tiles[row][col] = { ...tile };
    }
  };
  const room = (x: number, y: number, w: number, h: number, floorMaterial?: string) => {
    fill(x, y, w, h, { type: 'wall' });
    fill(x + 1, y + 1, w - 2, h - 2, { type: 'floor', ...(floorMaterial ? { floorMaterial } : {}) });
  };
  const note = (x: number, y: number, label: string, description: string,
    publicLabel?: string, publicDescription?: string) => {
    map.notes.push({ id: map.notes.length + 1, x, y, label, description,
      ...(publicLabel ? { published: true, publicLabel, publicDescription } : {}) });
  };
  const token = (x: number, y: number, kind: Token['kind'], label: string, icon: string, hidden = false) => {
    map.tokens!.push({ id: map.tokens!.length + 1, x, y, kind, label, icon, ...(hidden ? { hidden } : {}) });
  };
  return { map, fill, room, note, token, place: furnishingPlacer(map.stamps!) };
}

function crypt(summary: PremadeMapSummary): DungeonMap {
  const { map, fill, room, note, token, place } = scene(summary);
  room(8, 3, 9, 18);
  room(2, 6, 7, 8, 'folio-worn-wood-v1');
  room(16, 5, 6, 9);
  room(2, 15, 7, 6, 'folio-earth-v1');
  fill(8, 10, 1, 1, { type: 'door-v' });
  fill(16, 10, 1, 1, { type: 'locked-door-v' });
  fill(8, 17, 1, 1, { type: 'archway' });
  fill(11, 8, 3, 4, { type: 'water' });
  fill(12, 20, 1, 1, { type: 'door-h' });
  fill(12, 21, 1, 2, { type: 'stairs-up' });
  fill(2, 10, 1, 1, { type: 'secret-door' });
  fill(1, 10, 1, 1, { type: 'treasure' });
  map.fogEnabled = true;
  map.fog![10][1] = true;
  fill(20, 7, 1, 1, { type: 'stairs-down' });
  fill(19, 11, 1, 1, { type: 'trap' });
  for (const x of [10, 14]) for (const y of [5, 14]) fill(x, y, 1, 1, { type: 'pillar' });
  place('sarcophagus', 12, 5.5);
  place('brazier', 10, 17); place('brazier', 14, 17);
  place('desk', 4, 8); place('stool', 4, 9.2);
  place('shelf', 6, 7); place('bed', 6, 11);
  place('rubble', 4, 18, { rotation: 25 }); place('sacks', 6, 16);
  place('sarcophagus', 18, 7); place('barrel', 20, 9);
  note(12, 18, 'Lantern stair', 'The stair is safe. The watch will negotiate if the memorial is left untouched.',
    'Lantern stair', 'Two low braziers frame a worn stair. Still water glints farther inside.');
  note(12, 12, 'Memorial basin', 'The basin is knee-deep. A brass key is fixed beneath the north lip.',
    'Still basin', 'Clear water fills a long stone basin beneath the memorial.');
  note(5, 10, 'Keeper ledger', 'The ledger names the burial watch. A concealed panel in the west wall opens toward the cache.');
  note(18, 12, 'Burial watch', 'The watch stays hidden until the locked door opens. The south flagstone rings an alarm.');
  token(11, 19, 'player', 'Vera', 'folio-token-v1-warden');
  token(13, 19, 'player', 'Nix', 'folio-token-v1-wayfinder');
  token(18, 10, 'monster', 'Burial watch', 'folio-token-v1-brute', true);
  map.initiative = [1, 2, 3];
  return map;
}

function crossing(summary: PremadeMapSummary): DungeonMap {
  const { map, fill, note, token, place } = scene(summary);
  for (let y = 1; y < 23; y++) for (let x = 1; x < 23; x++) {
    const left = ((x - 6) / 6) ** 2 + ((y - 12) / 9) ** 2 < 1;
    const right = ((x - 18) / 6) ** 2 + ((y - 12) / 8) ** 2 < 1;
    if (left || right) map.tiles[y][x] = { type: 'floor' };
  }
  fill(0, 11, 24, 3, { type: 'floor' });
  for (let y = 0; y < 24; y++) {
    const bend = y < 7 ? 1 : y > 17 ? -1 : 0;
    fill(11 + bend, y, 3, 1, { type: 'water' });
  }
  fill(9, 11, 7, 3, { type: 'floor', theme: FOLIO_THEME_ID, floorMaterial: 'folio-worn-wood-v1' });
  for (const [x, y] of [[3, 6], [6, 4], [8, 6], [2, 16], [5, 20], [8, 19],
    [17, 6], [20, 5], [22, 8], [17, 19], [21, 18], [22, 16]]) {
    fill(x, y, 1, 1, { type: 'wall' });
  }
  fill(1, 12, 1, 1, { type: 'start' });
  fill(22, 12, 1, 1, { type: 'archway' });
  fill(19, 8, 1, 1, { type: 'pillar' });
  place('tent', 5, 8); place('bedroll', 4, 10, { rotation: 20 });
  place('campfire', 6, 10); place('sacks', 3, 8);
  place('boulder', 18, 8); place('boulder', 20, 9, { scale: 1.5, rotation: 35 });
  place('fern', 8, 8); place('fern', 15, 16, { flipX: true });
  place('shrub', 3, 18); place('shrub', 20, 16); place('rubble', 18, 17);
  note(4, 13, 'Western approach', 'The camp belongs to the bridge keeper. The party can rest here safely.',
    'Old trail', 'A broad trail reaches a timber bridge. A small camp sits beneath the alders.');
  note(12, 12, 'Bridge toll', 'The keeper asks for news, not coin. The bridge is sound and three people can cross abreast.',
    'Timber crossing', 'Three planks wide, the bridge stands above a fast, shallow stream.');
  note(18, 10, 'Rocky lookout', 'A wolf waits behind the rocks. Food or a calm approach avoids a fight.');
  token(3, 12, 'player', 'Vera', 'folio-token-v1-ranger');
  token(4, 12, 'player', 'Nix', 'folio-token-v1-wayfinder');
  token(16, 12, 'npc', 'Bridge keeper', 'folio-token-v1-warden');
  token(19, 10, 'monster', 'Lookout wolf', 'folio-token-v1-wolf', true);
  map.initiative = [1, 2, 3, 4];
  return map;
}

function ship(summary: PremadeMapSummary): DungeonMap {
  const { map, fill, room, note, token, place } = scene(summary);
  room(3, 3, 18, 18);
  fill(8, 4, 1, 16, { type: 'wall' });
  fill(15, 4, 1, 16, { type: 'wall' });
  fill(4, 10, 4, 1, { type: 'wall' });
  fill(16, 10, 4, 1, { type: 'wall' });
  fill(9, 8, 6, 1, { type: 'wall' });
  fill(11, 8, 2, 1, { type: 'archway' });
  fill(8, 7, 1, 1, { type: 'door-v' }); fill(15, 7, 1, 1, { type: 'door-v' });
  fill(8, 15, 1, 1, { type: 'door-v' }); fill(15, 15, 1, 1, { type: 'door-v' });
  fill(6, 10, 1, 1, { type: 'door-h' }); fill(18, 10, 1, 1, { type: 'locked-door-h' });
  fill(11, 20, 2, 1, { type: 'door-h' });
  fill(11, 21, 2, 2, { type: 'floor' }); fill(11, 22, 1, 1, { type: 'start' });
  fill(10, 5, 1, 2, { type: 'water' }); fill(13, 5, 1, 2, { type: 'water' });
  fill(11, 5, 2, 1, { type: 'treasure' });
  fill(19, 5, 1, 1, { type: 'stairs-up' });
  fill(3, 6, 1, 1, { type: 'secret-door' }); fill(2, 6, 1, 1, { type: 'floor' });
  map.fogEnabled = true;
  map.fog![6][2] = true;
  place('crate', 5, 13); place('crate', 6, 13, { rotation: 90 });
  place('crate', 5, 17); place('barrel', 6, 18);
  place('bed', 17, 13); place('bed', 19, 13);
  place('table', 18, 17); place('stool', 18, 18.2);
  place('desk', 5.5, 5); place('chair', 5.5, 6.3);
  place('crate', 17, 5);
  note(12, 18, 'Aft airlock', 'The bay has pressure and breathable air. The cargo deck is clear enough to stage a rescue.',
    'Docking airlock', 'The airlock opens onto a long cargo deck. Doors lead to port and starboard compartments.');
  note(12, 7, 'Coolant core', 'The core is stable for now. The console in port control can shut it down safely.',
    'Coolant core', 'Two coolant channels surround a raised data core at the bow.');
  note(5, 8, 'Port control', 'The western service hatch bypasses the airlock. The control console disables the security unit.');
  note(18, 8, 'Security unit', 'The unit waits behind the locked maintenance door. Crew credentials keep it passive.');
  token(10, 18, 'player', 'Vera', 'warrior');
  token(13, 18, 'player', 'Nix', 'rogue');
  token(18, 16, 'npc', 'Flight engineer', 'lightning');
  token(18, 6, 'monster', 'Security unit', 'eye', true);
  map.initiative = [1, 2, 3, 4];
  return map;
}

export function buildLaunchSample(id: string): DungeonProject {
  const summary = LAUNCH_SAMPLES.find(sample => sample.id === id);
  if (!summary) throw new Error(`Unknown launch sample: ${id}`);
  const map = id === 'launch-lantern-crypt' ? crypt(summary)
    : id === 'launch-alder-crossing' ? crossing(summary) : ship(summary);
  return { name: summary.name, activeLevelIndex: 0, stairLinks: [], levels: [map] };
}
