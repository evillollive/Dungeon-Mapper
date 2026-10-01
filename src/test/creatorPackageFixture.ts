import type { DungeonProject } from '../types/map';
import { createDefaultProject } from '../hooks/mapStateUtils';
import type { CreatorProjectOptions } from '../utils/creatorProject';
import type { CreatorPackageOrigin } from '../utils/creatorPackageOrigin';
import { CREATOR_REQUIRED_FILES } from '../utils/creatorPackageFormat';
import { CREATOR_CATALOG_VERSION } from '../utils/creatorPackage';

export const CREATOR_PRIVATE_SENTINEL = 'CREATOR_PRIVATE_SOURCE';
export const CREATOR_UNKNOWN_SENTINEL = 'CREATOR_UNKNOWN_EXTENSION';

export function creatorPackageFixture(): DungeonProject {
  const project = createDefaultProject();
  project.name = CREATOR_PRIVATE_SENTINEL;
  const base = project.levels[0];
  base.meta = { name: CREATOR_PRIVATE_SENTINEL, publicName: CREATOR_PRIVATE_SENTINEL,
    width: 8, height: 8, tileSize: 32, theme: 'dungeon' };
  base.tiles = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ({ type: 'floor' as const })));
  base.fog = base.tiles.map(row => row.map(() => false));
  base.explored = base.tiles.map(row => row.map(() => true));
  base.notes = [
    { id: 1, x: 1, y: 1, label: CREATOR_PRIVATE_SENTINEL, description: CREATOR_PRIVATE_SENTINEL,
      published: true, publicLabel: 'Public sign', publicDescription: 'Approved public text' },
    { id: 2, x: 2, y: 2, label: 'Encounter objective', description: 'Rescue the cartographer.' },
  ];
  base.tiles[1][1] = { type: 'floor', noteId: 1 };
  base.tiles[2][2] = { type: 'secret-door', noteId: 2, discovered: true, discoveredType: 'secret-door' };
  base.tokens = [
    { id: 1, x: 1, y: 1, kind: 'player', label: CREATOR_PRIVATE_SENTINEL },
    { id: 2, x: 2, y: 2, kind: 'monster', label: 'Encounter guard', hidden: true },
  ];
  base.initiative = [1, 2];
  base.stamps = [
    { id: 1, stampId: 'folio-furnishings-v1-table', x: 3, y: 3, rotation: 0, scale: 1,
      flipX: false, flipY: false, opacity: 1, locked: false },
    { id: 2, stampId: 'folio-furnishings-v1-crate', x: 4, y: 4, rotation: 0, scale: 1,
      flipX: false, flipY: false, opacity: 1, locked: false, hidden: true },
  ];
  base.annotations = [
    { id: 1, kind: 'gm', points: [{ x: 1, y: 2 }, { x: 3, y: 4 }], color: '#123456', width: 0.2 },
    { id: 2, kind: 'player', points: [{ x: 2, y: 3 }, { x: 4, y: 5 }], color: '#654321', width: 0.2 },
  ];
  base.markers = [{ id: 1, x: 4, y: 4, shape: 'diamond', color: '#123456', size: 1 }];
  base.lightSources = [{ id: 1, x: 4, y: 4, radius: 3, label: CREATOR_PRIVATE_SENTINEL, color: '#ffffff' }];
  base.wallSegments = [{ id: 1, points: [{ x: 0, y: 0 }, { x: 0, y: 7 }], color: '#123456', thickness: 0.1 }];
  base.roomShapes = [{ id: 1, x: 1, y: 1, width: 3, height: 3, fillTile: 'floor', wallTile: 'wall' }];
  Object.assign(base.meta, { futureTitle: CREATOR_UNKNOWN_SENTINEL });
  Object.assign(base.tiles[0][0], { futureTile: { secret: CREATOR_UNKNOWN_SENTINEL } });
  Object.assign(base.tokens[1], { futureToken: CREATOR_UNKNOWN_SENTINEL });
  Object.assign(base.notes[1], { futureNote: CREATOR_UNKNOWN_SENTINEL });
  Object.assign(base.wallSegments[0].points[0], { futurePoint: CREATOR_UNKNOWN_SENTINEL });
  Object.assign(base.roomShapes[0], { futureRoom: CREATOR_UNKNOWN_SENTINEL });
  Object.assign(base, { futureMap: CREATOR_UNKNOWN_SENTINEL });
  project.levels = [base, structuredClone(base), structuredClone(base)];
  project.stairLinks = [
    { fromLevel: 0, fromCell: { x: 3, y: 3 }, toLevel: 1, toCell: { x: 3, y: 3 } },
    { fromLevel: 0, fromCell: { x: 4, y: 4 }, toLevel: 2, toCell: { x: 4, y: 4 } },
  ];
  project.sceneTemplates = [{
    id: CREATOR_PRIVATE_SENTINEL, name: CREATOR_PRIVATE_SENTINEL,
    width: 1, height: 1, tiles: [[{ type: 'floor' }]],
    notes: [], stamps: [], createdAt: '2026-09-30T00:00:00Z',
  }];
  Object.assign(project, { futureProject: { credential: CREATOR_UNKNOWN_SENTINEL } });
  return project;
}

export function creatorPackageOptions(): CreatorProjectOptions {
  return {
    profile: 'layout', title: 'Shared cartographer vault', author: 'Fixture creator',
    description: 'A reusable vault layout.', license: 'CC-BY-4.0',
    levels: [{ index: 0, name: 'Vault entrance' }, { index: 2, name: 'Lower vault' }],
    omitCrossLevelLinks: true,
  };
}

export function creatorOriginFixture(): CreatorPackageOrigin {
  return {
    version: 1, packageId: 'original-vault', contentVersion: '1.0.0',
    title: 'Original vault', author: 'Declared creator', license: 'CC-BY-4.0',
    profile: 'layout', catalog: CREATOR_CATALOG_VERSION,
    files: CREATOR_REQUIRED_FILES.map((path, index) => ({
      path, bytes: 20, sha256: index.toString(16).padStart(64, '0'),
    })),
  };
}
