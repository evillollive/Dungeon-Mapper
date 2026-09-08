import { describe, expect, it } from 'vitest';
import type { DungeonMap, DungeonProject } from '../../types/map';
import {
  DEFAULT_EDGE_BLEND, DEFAULT_HAND_DRAWN, DEFAULT_LIGHTING_ATMOSPHERE, DEFAULT_PAPER_TEXTURE,
} from '../../types/map';
import { createDefaultProject } from '../../hooks/mapStateUtils';
import { buildPremadeProject, PREMADE_MAP_SUMMARIES } from '../premadeMaps';
import { BUILT_IN_STAMPS } from '../stampCatalog';
import { decodeProject, encodeProject, PROJECT_SCHEMA_VERSION } from '../projectSchema';

function legacyMap(): DungeonMap {
  return {
    meta: { name: 'Legacy', width: 4, height: 4, tileSize: 20 },
    tiles: Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => ({ type: 'floor' }))),
    notes: [],
  };
}

function fullProject(): DungeonProject {
  const map = legacyMap();
  map.meta.theme = 'custom-theme:stone';
  map.tiles[0][0] = {
    type: 'custom:moss', theme: 'custom-theme:stone', noteId: 1,
    flowDirection: -45, riverId: 1, riverType: 'water', riverBank: 'sand',
    riverBankRiverId: 1, riverBankType: 'water',
  };
  map.notes = [{ id: 1, x: 40, y: -2, label: 'Outside resized grid', description: 'Keep me', kind: 'room' }];
  map.fog = Array.from({ length: 4 }, () => Array<boolean>(4).fill(true));
  map.explored = Array.from({ length: 4 }, () => Array<boolean>(4).fill(false));
  map.fogEnabled = true;
  map.dynamicFogEnabled = true;
  map.tokens = [{ id: 1, kind: 'monster', x: 0, y: 0, size: 4, label: 'Large footprint', icon: 'M', color: '#123456' }];
  map.initiative = [1];
  map.markers = [{ id: 1, x: -1, y: 12, shape: 'diamond', color: '#123456', size: 6 }];
  map.lightSources = [{ id: 1, x: 0, y: 1, radius: 8, label: 'Lamp', color: '#ffffff' }];
  map.stamps = [{ id: 1, stampId: 'image', x: 1.5, y: 1.5, rotation: 450, scale: 0.25, opacity: 0.5, locked: true, flipX: true, flipY: false }];
  map.annotations = [{ id: 1, kind: 'gm', points: [{ x: -2.5, y: 12.5 }], width: 0.2, color: '#333333' }];
  map.wallSegments = [{ id: 1, points: [{ x: -2, y: 12 }], thickness: 0.1, color: '#333333' }];
  map.pathSegments = [{ id: 1, points: [{ x: 12.5, y: -2 }], width: 0.5, color: '#333333' }];
  map.rivers = [{
    id: 1, controlPoints: [{ x: -3, y: 6.5 }, { x: 12, y: 4 }], width: 2, flowDirection: 720,
    type: 'underground-stream', sourceMarker: 'cave', mouthMarker: 'outflow', parentRiverId: 2, tributaryIds: [3],
  }];
  map.roomShapes = [{
    id: 1, x: -5, y: 10, width: 12, height: 6, shapeType: 'polygon',
    vertices: [{ x: -5, y: 10 }, { x: 7, y: 10 }, { x: 7, y: 16 }],
    mode: 'subtractive', fillTile: 'custom:moss', wallTile: 'wall',
    doorHints: [{ edge: 'n', offset: 15, type: 'archway' }],
    edgeMergeOverrides: [{ edge: 's', mode: 'door' }],
  }];
  map.backgroundImage = { dataUrl: 'data:image/png;base64,AAAA', offsetX: -2.5, offsetY: 10, scale: 0.5, opacity: 0.25 };
  map.paperTexture = DEFAULT_PAPER_TEXTURE;
  map.edgeBlend = DEFAULT_EDGE_BLEND;
  map.handDrawn = DEFAULT_HAND_DRAWN;
  map.lightingAtmosphere = DEFAULT_LIGHTING_ATMOSPHERE;
  map.artStylePreset = 'custom';
  const project: DungeonProject = {
    name: 'Full fidelity', levels: [map, legacyMap()], activeLevelIndex: 1,
    stairLinks: [{ fromLevel: 0, fromCell: { x: 40, y: 20 }, toLevel: 1, toCell: { x: 0, y: 0 } }],
    customThemes: [{
      id: 'custom-theme:stone', name: 'Stone', baseThemeId: 'dungeon', gridColor: '#111111',
      tileColors: { floor: '#222222' }, tileLabels: { floor: 'Stone floor' },
      customTiles: [{ id: 'custom:moss', label: 'Moss', color: '#333333', baseType: 'floor', imageDataUrl: 'data:image/png;base64,AAAA' }],
    }],
    customStamps: [
      { id: 'image', name: 'Image', category: 'custom', viewBox: '0 0 20 20', imageDataUrl: 'data:image/png;base64,AAAA' },
      { id: 'vector', name: 'Vector', category: 'furniture', themeId: 'dungeon', viewBox: '0 0 20 20', paths: [{ path: 'M0 0L20 20', fill: 'none', stroke: '#123456', strokeWidth: 0.5 }] },
      { id: 'shorthand', name: 'Shorthand', category: 'markers', viewBox: '0 0 20 20', svgPath: 'M0 0L20 20' },
    ],
    sceneTemplates: [{
      id: 'room', name: 'Saved room', width: 4, height: 4, createdAt: '2026-09-07T00:00:00Z',
      tiles: map.tiles, notes: [], stamps: map.stamps,
    }],
  };
  Object.assign(project, { extension: { authoring: ['keep', { enabled: true }] } });
  Object.assign(map, { extraLayer: [{ points: [1, 2] }] });
  Object.assign(map.tiles[0][0], { textureHint: 'wet' });
  Object.assign(project.customThemes![0].customTiles[0], { extraAsset: { caption: 'keep' } });
  Object.assign(project.sceneTemplates![0], { metadata: { version: 9 } });
  return project;
}

describe('project schema compatibility', () => {
  it('exposes schema v1 and wraps a legacy tiles map without losing data', () => {
    const map = legacyMap();
    expect(PROJECT_SCHEMA_VERSION).toBe(1);
    expect(decodeProject(map)).toEqual({ name: 'Legacy', levels: [map], activeLevelIndex: 0, stairLinks: [] });
    expect(map).not.toHaveProperty('levels');
  });

  it('retains the default project and every nested layer through portable JSON', () => {
    for (const project of [createDefaultProject(), fullProject()]) {
      const before = JSON.stringify(project);
      const envelope = encodeProject(project);
      expect(envelope).toEqual({ schemaVersion: 1, project });
      expect(decodeProject(JSON.parse(JSON.stringify(envelope)))).toEqual(project);
      expect(decodeProject(project)).toEqual(project);
      expect(JSON.stringify(project)).toBe(before);
    }
  });

  it('copies rather than mutating or retaining mutable input references', () => {
    const project = fullProject();
    const decoded = decodeProject(project);
    decoded.levels[0].notes[0].label = 'Changed';
    decoded.customThemes![0].customTiles[0].label = 'Changed';
    expect(project.levels[0].notes[0].label).toBe('Outside resized grid');
    expect(project.customThemes![0].customTiles[0].label).toBe('Moss');
  });

  it('allows absent legacy optional fields and defaults only missing stair links', () => {
    const old = { name: 'Old', levels: [legacyMap()], activeLevelIndex: 0 };
    expect(decodeProject(old)).toEqual({ ...old, stairLinks: [] });
    expect(decodeProject({ ...old, stairLinks: undefined }).stairLinks).toEqual([]);
    expect(() => decodeProject({ ...old, stairLinks: null })).toThrow('project.stairLinks');
  });

  it('retains legacy bare-map libraries at their original location and promotes them for use', () => {
    const project = fullProject();
    const map = { ...legacyMap(), customThemes: project.customThemes, customStamps: project.customStamps, sceneTemplates: project.sceneTemplates };
    const decoded = decodeProject(map);
    expect(decoded.levels[0]).toEqual(map);
    expect(decoded.customThemes).toEqual(project.customThemes);
    expect(decoded.customStamps).toEqual(project.customStamps);
    expect(decoded.sceneTemplates).toEqual(project.sceneTemplates);
  });

  it('supports all premade fixtures and built-in stamp definitions', () => {
    for (const summary of PREMADE_MAP_SUMMARIES) {
      const project = buildPremadeProject(summary.id);
      project.customStamps = [...BUILT_IN_STAMPS];
      expect(decodeProject(encodeProject(project))).toEqual(project);
    }
  }, 30000);

  it('does not impose toolbar-only dimension or token-size limits', () => {
    const map = legacyMap();
    map.meta.width = 129;
    map.meta.height = 1;
    map.meta.tileSize = 1.5;
    map.tiles = [Array.from({ length: 129 }, () => ({ type: 'empty' }))];
    expect(decodeProject(map).levels[0]).toEqual(map);
    expect(decodeProject(fullProject()).levels[0].tokens![0].size).toBe(4);
  });

  it('keeps unknown project schemaVersion fields and ignores envelope storage metadata', () => {
    const project = { ...fullProject(), schemaVersion: 'extension' };
    expect(decodeProject({ schemaVersion: 1, project, storageRevision: 'local-only' })).toEqual(project);
    expect(encodeProject(project)).toEqual({ schemaVersion: 1, project });
  });

  it('preserves ordinary unknown JSON keys without prototype pollution', () => {
    const project = JSON.parse(JSON.stringify(fullProject()));
    Object.defineProperty(project, '__proto__', { value: { custom: 'retained' }, enumerable: true });
    const decoded = decodeProject(project);
    expect(Object.hasOwn(decoded, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(decoded)).toBe(Object.prototype);
    expect(JSON.stringify(decoded)).toContain('"__proto__":{"custom":"retained"}');
  });
});

describe('actionable schema failures', () => {
  it.each([null, [], 'map', 42, {}])('rejects non-project input %j', data => {
    expect(() => decodeProject(data)).toThrow(/Invalid project at/);
  });

  it('rejects cells-only maps instead of mistaking them for tiles maps', () => {
    const { tiles, ...map } = legacyMap();
    expect(() => decodeProject({ ...map, cells: tiles })).toThrow('map.tiles');
  });

  it('keeps future-version failures actionable', () => {
    expect(() => decodeProject({ schemaVersion: 2, project: {} })).toThrow(/version 2.*supports version 1.*Update Dungeon Mapper/);
    for (const schemaVersion of [0, -1, 1.5, '1', null, Infinity]) {
      expect(() => decodeProject({ schemaVersion, project: fullProject() })).toThrow('schemaVersion');
    }
  });

  const cases: [string, (project: DungeonProject) => void, string][] = [
    ['empty levels', p => { p.levels = []; }, 'project.levels'],
    ['bad active index', p => { p.activeLevelIndex = 2; }, 'project.activeLevelIndex'],
    ['fractional active index', p => { p.activeLevelIndex = 0.5; }, 'project.activeLevelIndex'],
    ['zero width', p => { p.levels[0].meta.width = 0; }, 'meta.width'],
    ['fractional height', p => { p.levels[0].meta.height = 4.5; }, 'meta.height'],
    ['infinite tile size', p => { p.levels[0].meta.tileSize = Infinity; }, 'meta.tileSize'],
    ['missing rows', p => { p.levels[0].tiles.pop(); }, 'tiles'],
    ['ragged row', p => { p.levels[0].tiles[0].pop(); }, 'tiles[0]'],
    ['bad tile', p => { Object.assign(p.levels[0].tiles[0][0], { type: 'unsupported' }); }, 'tiles[0][0].type'],
    ['null notes', p => { Object.assign(p.levels[0], { notes: null }); }, 'notes'],
    ['non-string note', p => { Object.assign(p.levels[0].notes[0], { label: 5 }); }, 'notes[0].label'],
    ['fractional token', p => { p.levels[0].tokens![0].size = 1.5; }, 'tokens[0].size'],
    ['zero token', p => { p.levels[0].tokens![0].size = 0; }, 'tokens[0].size'],
    ['oversize token', p => { p.levels[0].tokens![0].size = 5; }, 'tokens[0]'],
    ['token outside grid', p => { p.levels[0].tokens![0].x = -1; }, 'tokens[0]'],
    ['bad fog cells', p => { Object.assign(p.levels[0].fog![0], { 0: 1 }); }, 'fog[0][0]'],
    ['bad explored width', p => { p.levels[0].explored![0].pop(); }, 'explored[0]'],
    ['bad boolean', p => { Object.assign(p.levels[0], { fogEnabled: 'true' }); }, 'fogEnabled'],
    ['non-finite vector', p => { p.levels[0].annotations![0].points[0].x = NaN; }, 'annotations[0].points[0].x'],
    ['invalid room geometry', p => { p.levels[0].roomShapes![0].width = -1; }, 'roomShapes[0].width'],
    ['invalid polygon', p => { p.levels[0].roomShapes![0].vertices = []; }, 'roomShapes[0].vertices'],
    ['invalid river points', p => { Object.assign(p.levels[0].rivers![0], { controlPoints: {} }); }, 'rivers[0].controlPoints'],
    ['bad river width', p => { p.levels[0].rivers![0].width = -1; }, 'rivers[0].width'],
    ['bad river enum', p => { Object.assign(p.levels[0].rivers![0], { sourceMarker: 'invalid' }); }, 'sourceMarker'],
    ['negative marker', p => { p.levels[0].markers![0].size = -1; }, 'markers[0].size'],
    ['negative radius', p => { p.levels[0].lightSources![0].radius = -1; }, 'lightSources[0].radius'],
    ['negative wall', p => { p.levels[0].wallSegments![0].thickness = -1; }, 'wallSegments[0].thickness'],
    ['invalid path', p => { p.levels[0].pathSegments![0].width = 0; }, 'pathSegments[0].width'],
    ['invalid stamp scale', p => { p.levels[0].stamps![0].scale = 0; }, 'stamps[0].scale'],
    ['invalid background', p => { p.levels[0].backgroundImage!.opacity = 2; }, 'backgroundImage.opacity'],
    ['invalid paper', p => { p.levels[0].paperTexture = { ...DEFAULT_PAPER_TEXTURE, grain: -1 }; }, 'paperTexture.grain'],
    ['invalid blend', p => { p.levels[0].edgeBlend = { ...DEFAULT_EDGE_BLEND, opacity: 2 }; }, 'edgeBlend.opacity'],
    ['invalid hand drawn', p => { p.levels[0].handDrawn = { ...DEFAULT_HAND_DRAWN, wobble: -1 }; }, 'handDrawn.wobble'],
    ['invalid lighting', p => { p.levels[0].lightingAtmosphere = { ...DEFAULT_LIGHTING_ATMOSPHERE, aoRadius: 2 }; }, 'lightingAtmosphere.aoRadius'],
    ['invalid stair level', p => { p.stairLinks[0].toLevel = 2; }, 'stairLinks[0].toLevel'],
    ['invalid stair cell', p => { p.stairLinks[0].toCell.x = 1.5; }, 'stairLinks[0].toCell.x'],
    ['invalid theme list', p => { Object.assign(p, { customThemes: {} }); }, 'customThemes'],
    ['invalid custom tile', p => { Object.assign(p.customThemes![0].customTiles[0], { baseType: 'unknown' }); }, 'customTiles[0].baseType'],
    ['invalid stamp path', p => { Object.assign(p.customStamps![1].paths![0], { path: null }); }, 'paths[0].path'],
    ['invalid template grid', p => { p.sceneTemplates![0].width = 3; }, 'sceneTemplates[0].tiles[0]'],
    ['invalid template note', p => { Object.assign(p.sceneTemplates![0], { notes: [null] }); }, 'sceneTemplates[0].notes[0]'],
    ['invalid template stamp', p => { Object.assign(p.sceneTemplates![0], { stamps: [null] }); }, 'sceneTemplates[0].stamps[0]'],
  ];

  it.each(cases)('rejects %s without repairing or mutating input', (_name, mutate, path) => {
    const project = fullProject();
    mutate(project);
    expect(() => decodeProject(project)).toThrow(path);
    expect(() => encodeProject(project)).toThrow(path);
  });

  it.each([Infinity, NaN, 1n, new Date(), new Map(), () => 1])('rejects nonportable extension values %s', extension => {
    expect(() => decodeProject({ ...fullProject(), extension })).toThrow('project.extension');
  });

  it('rejects cycles and sparse arrays instead of silently dropping data', () => {
    const project = fullProject();
    Object.assign(project, { circular: project });
    expect(() => decodeProject(project)).toThrow('non-circular');
    expect(() => decodeProject({ ...fullProject(), extension: Array(2) })).toThrow('project.extension[0]');
  });

  it('accepts explicit undefined optional fields produced by editor history', () => {
    const project = fullProject();
    project.levels[0].backgroundImage = undefined;
    expect(decodeProject(encodeProject(project))).toEqual(project);
  });
});
