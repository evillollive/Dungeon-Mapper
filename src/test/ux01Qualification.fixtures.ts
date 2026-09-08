import { readFileSync } from 'node:fs';
import { createDefaultMap } from '../hooks/mapStateUtils';
import {
  DEFAULT_EDGE_BLEND, DEFAULT_HAND_DRAWN, DEFAULT_LIGHTING_ATMOSPHERE, DEFAULT_PAPER_TEXTURE,
  type DungeonProject,
} from '../types/map';
import { encodeProject } from '../utils/projectSchema';
import { buildPremadeProject, PREMADE_MAP_SUMMARIES } from '../utils/premadeMaps';
import { BUILT_IN_STAMPS } from '../utils/stampCatalog';

export function qualificationFixture(width = 16, count = 2): DungeonProject {
  const image = `data:image/png;base64,${readFileSync('public/pwa-192x192.png').toString('base64')}`;
  const levels = Array.from({ length: count }, (_, index) => {
    const map = createDefaultMap(`Qualification floor ${index + 1}`);
    map.meta = { name: map.meta.name, width, height: width, tileSize: 20, theme: 'custom-theme:qa' };
    map.tiles = Array.from({ length: width }, (_, y) => Array.from({ length: width }, (_, x) => ({
      type: (x + y) % 7 === 0 ? 'wall' as const : 'floor' as const,
      theme: 'custom-theme:qa',
    })));
    map.fog = Array.from({ length: width }, (_, y) => Array.from({ length: width }, (_, x) => x > width / 2 && y > width / 2));
    map.explored = Array.from({ length: width }, () => Array<boolean>(width).fill(true));
    map.dynamicFogEnabled = false;
    map.notes = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1, x: i % width, y: 1, label: `Note ${i}`, description: `Private QA fixture description ${index}:${i}`, kind: 'room' as const,
    }));
    map.tokens = [{ id: 1, kind: 'monster', x: 2, y: 2, size: 2, label: 'Fixture monster', icon: 'M', color: '#123456' }];
    map.initiative = [1];
    map.markers = [{ id: 1, x: 3, y: 3, shape: 'diamond', color: '#123456', size: 1 }];
    map.lightSources = [{ id: 1, x: 2, y: 2, radius: 4, label: 'Fixture lamp', color: '#ffffff' }];
    map.stamps = [{ id: 1, stampId: 'qa-image', x: 4, y: 4, rotation: 45, scale: 0.5, opacity: 0.7, locked: true, flipX: true, flipY: false }];
    map.annotations = [{ id: 1, kind: 'gm', points: [{ x: 1, y: 1 }, { x: 3, y: 2 }], width: 0.2, color: '#333333' }];
    map.wallSegments = [{ id: 1, points: [{ x: 2, y: 3 }, { x: 5, y: 3 }], thickness: 0.1, color: '#333333' }];
    map.pathSegments = [{ id: 1, points: [{ x: 2, y: 4 }, { x: 5, y: 4 }], width: 0.5, color: '#333333' }];
    map.rivers = [{ id: 1, controlPoints: [{ x: 1, y: 6 }, { x: 8, y: 6 }], width: 2, flowDirection: 45, type: 'underground-stream', sourceMarker: 'cave', mouthMarker: 'outflow' }];
    map.roomShapes = [{ id: 1, x: 2, y: 2, width: 4, height: 4, shapeType: 'rect', mode: 'additive', fillTile: 'floor', wallTile: 'wall' }];
    map.backgroundImage = { dataUrl: image, offsetX: 0, offsetY: 0, scale: 0.5, opacity: 0.25 };
    map.paperTexture = DEFAULT_PAPER_TEXTURE;
    map.edgeBlend = DEFAULT_EDGE_BLEND;
    map.handDrawn = DEFAULT_HAND_DRAWN;
    map.lightingAtmosphere = DEFAULT_LIGHTING_ATMOSPHERE;
    map.artStylePreset = 'custom';
    Object.assign(map, { qualificationExtension: { index, values: ['retain', 42] } });
    return map;
  });
  const project: DungeonProject = {
    name: `Rich fixture ${count}x${width}`, levels, activeLevelIndex: 0,
    stairLinks: [{ fromLevel: 0, fromCell: { x: 3, y: 3 }, toLevel: 1, toCell: { x: 3, y: 3 } }],
    customThemes: [{
      id: 'custom-theme:qa', name: 'QA stone', baseThemeId: 'dungeon', gridColor: '#111111',
      tileColors: { floor: '#445566' }, tileLabels: { floor: 'QA stone' },
      customTiles: [{ id: 'custom:qa', label: 'QA moss', color: '#337744', baseType: 'floor', imageDataUrl: image }],
    }],
    customStamps: [
      { id: 'qa-image', name: 'QA image', category: 'custom', viewBox: '0 0 192 192', imageDataUrl: image },
      ...BUILT_IN_STAMPS,
    ],
    sceneTemplates: [{ id: 'qa-template', name: 'QA room', width, height: width, createdAt: '2026-09-07T00:00:00Z', tiles: levels[0].tiles, notes: levels[0].notes, stamps: levels[0].stamps ?? [] }],
  };
  Object.assign(project, { qualificationExtension: { retained: true } });
  encodeProject(project);
  return project;
}

export const fixtures = {
  rich: qualificationFixture(),
  medium: qualificationFixture(64, 6),
  large: qualificationFixture(128, 8),
  samples: PREMADE_MAP_SUMMARIES.map(sample => ({ id: sample.id, project: buildPremadeProject(sample.id) })),
};
