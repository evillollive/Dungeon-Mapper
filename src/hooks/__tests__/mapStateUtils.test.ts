import { describe, it, expect } from 'vitest';
import {
  createDefaultMap,
  createDefaultProject,
  createHistorySnapshot,
  clearVisibleMapContent,
  replaceGeneratedMapContent,
  restoreHistorySnapshot,
  withDefaults,
  nextIdAfter,
  updateActiveLevel,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_TILE_SIZE,
  MAX_HISTORY_SIZE,
} from '../mapStateUtils';
import type { DungeonMap } from '../../types/map';

describe('createDefaultMap', () => {
  it('creates a map with default dimensions', () => {
    const map = createDefaultMap();
    expect(map.meta.width).toBe(DEFAULT_WIDTH);
    expect(map.meta.height).toBe(DEFAULT_HEIGHT);
    expect(map.meta.tileSize).toBe(DEFAULT_TILE_SIZE);
  });

  it('uses provided name', () => {
    const map = createDefaultMap('Test Level');
    expect(map.meta.name).toBe('Test Level');
  });

  it('defaults name to Level 1', () => {
    const map = createDefaultMap();
    expect(map.meta.name).toBe('Level 1');
  });

  it('initializes all arrays', () => {
    const map = createDefaultMap();
    expect(map.notes).toEqual([]);
    expect(map.tokens).toEqual([]);
    expect(map.stamps).toEqual([]);
    expect(map.wallSegments).toEqual([]);
    expect(map.pathSegments).toEqual([]);
    expect(map.rivers).toEqual([]);
    expect(map.roomShapes).toEqual([]);
    expect(map.lightSources).toEqual([]);
    expect(map.annotations).toEqual([]);
    expect(map.markers).toEqual([]);
    expect(map.initiative).toEqual([]);
  });

  it('creates tile grid of correct size', () => {
    const map = createDefaultMap();
    expect(map.tiles.length).toBe(DEFAULT_HEIGHT);
    expect(map.tiles[0].length).toBe(DEFAULT_WIDTH);
  });

  it('creates fog grid of correct size', () => {
    const map = createDefaultMap();
    expect(map.fog.length).toBe(DEFAULT_HEIGHT);
    expect(map.fog[0].length).toBe(DEFAULT_WIDTH);
  });

  it('fog is enabled by default', () => {
    const map = createDefaultMap();
    expect(map.fogEnabled).toBe(true);
  });
});

describe('createDefaultProject', () => {
  it('has one level', () => {
    const proj = createDefaultProject();
    expect(proj.levels).toHaveLength(1);
  });

  it('defaults to active level 0', () => {
    const proj = createDefaultProject();
    expect(proj.activeLevelIndex).toBe(0);
  });

  it('has empty stair links', () => {
    const proj = createDefaultProject();
    expect(proj.stairLinks).toEqual([]);
  });

  it('has empty custom themes / stamps / templates', () => {
    const proj = createDefaultProject();
    expect(proj.customThemes).toEqual([]);
    expect(proj.customStamps).toEqual([]);
    expect(proj.sceneTemplates).toEqual([]);
  });
});

describe('withDefaults', () => {
  it('fills in missing optional fields', () => {
    const partial = {
      meta: { name: 'Test', width: 4, height: 4, tileSize: 20 },
      tiles: Array.from({ length: 4 }, () =>
        Array.from({ length: 4 }, () => ({ type: 'empty' as const }))
      ),
      notes: [],
    } as unknown as DungeonMap;
    const filled = withDefaults(partial);
    expect(filled.fog).toBeDefined();
    expect(filled.tokens).toEqual([]);
    expect(filled.stamps).toEqual([]);
    expect(filled.wallSegments).toEqual([]);
    expect(filled.pathSegments).toEqual([]);
    expect(filled.rivers).toEqual([]);
    expect(filled.roomShapes).toEqual([]);
    expect(filled.lightSources).toEqual([]);
    expect(filled.annotations).toEqual([]);
    expect(filled.markers).toEqual([]);
  });
});

describe('map content reset helpers', () => {
  it('clearVisibleMapContent removes all visible layers while preserving settings', () => {
    const map = createDefaultMap();
    map.tiles[0][0] = { type: 'floor' };
    map.notes = [{ id: 1, x: 0, y: 0, label: 'A', description: '' }];
    map.tokens = [{ id: 1, kind: 'player', x: 0, y: 0, label: 'Hero' }];
    map.annotations = [{ id: 1, kind: 'gm', points: [{ x: 0, y: 0 }], color: '#000000', width: 0.1 }];
    map.markers = [{ id: 1, x: 0, y: 0, shape: 'circle', color: '#ff0000', size: 1 }];
    map.initiative = [1];
    map.lightSources = [{ id: 1, x: 0, y: 0, radius: 3, color: '#ffffff', label: 'Light' }];
    map.stamps = [{ id: 1, stampId: 'table', x: 0, y: 0, rotation: 0, scale: 1, flipX: false, flipY: false, opacity: 1, locked: false }];
    map.wallSegments = [{ id: 1, points: [{ x: 0, y: 0 }], color: '#000000', thickness: 0.1 }];
    map.pathSegments = [{ id: 1, points: [{ x: 0, y: 0 }], color: '#000000', width: 0.3 }];
    map.rivers = [{ id: 1, controlPoints: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: '#2563eb', width: 1, type: 'water', flowDirection: 45 }];
    map.roomShapes = [{ id: 1, x: 0, y: 0, width: 3, height: 3 }];
    map.backgroundImage = { dataUrl: 'data:image/png;base64,AAAA', offsetX: 0, offsetY: 0, scale: 1, opacity: 1 };
    map.paperTexture = { enabled: true, pattern: 'linen', opacity: 0.5, grain: 0.2, vignette: 0.2 };

    const cleared = clearVisibleMapContent(map);

    expect(cleared.tiles.every(row => row.every(tile => tile.type === 'empty'))).toBe(true);
    expect(cleared.notes).toEqual([]);
    expect(cleared.tokens).toEqual([]);
    expect(cleared.annotations).toEqual([]);
    expect(cleared.markers).toEqual([]);
    expect(cleared.initiative).toEqual([]);
    expect(cleared.lightSources).toEqual([]);
    expect(cleared.stamps).toEqual([]);
    expect(cleared.wallSegments).toEqual([]);
    expect(cleared.pathSegments).toEqual([]);
    expect(cleared.rivers).toEqual([]);
    expect(cleared.roomShapes).toEqual([]);
    expect(cleared.backgroundImage).toBeUndefined();
    expect(cleared.paperTexture).toEqual(map.paperTexture);
  });

  it('replaceGeneratedMapContent clears stale overlays and installs generated shapes', () => {
    const map = createDefaultMap();
    map.markers = [{ id: 1, x: 0, y: 0, shape: 'circle', color: '#ff0000', size: 1 }];
    map.lightSources = [{ id: 1, x: 0, y: 0, radius: 3, color: '#ffffff', label: 'Light' }];
    map.wallSegments = [{ id: 1, points: [{ x: 0, y: 0 }], color: '#000000', thickness: 0.1 }];
    map.pathSegments = [{ id: 1, points: [{ x: 0, y: 0 }], color: '#000000', width: 0.3 }];
    map.rivers = [{ id: 1, controlPoints: [{ x: 0, y: 0 }], color: '#2563eb', width: 1, type: 'water', flowDirection: 0 }];
    map.backgroundImage = { dataUrl: 'data:image/png;base64,AAAA', offsetX: 0, offsetY: 0, scale: 1, opacity: 1 };
    const tiles = Array.from({ length: 2 }, () =>
      Array.from({ length: 2 }, () => ({ type: 'floor' as const }))
    );

    const generated = replaceGeneratedMapContent(
      map,
      tiles,
      2,
      2,
      [{ id: 1, x: 1, y: 1, label: 'Room', description: '' }],
      'Generated',
      [{ id: 7, x: 0, y: 0, width: 2, height: 2 }],
      [{ id: 3, controlPoints: [{ x: 0.5, y: 0.5 }, { x: 1.5, y: 1.5 }], width: 1, type: 'water', flowDirection: 45 }],
    );

    expect(generated.meta.name).toBe('Generated');
    expect(generated.tiles).toBe(tiles);
    expect(generated.roomShapes).toEqual([{ id: 7, x: 0, y: 0, width: 2, height: 2 }]);
    expect(generated.rivers).toEqual([{ id: 3, controlPoints: [{ x: 0.5, y: 0.5 }, { x: 1.5, y: 1.5 }], width: 1, type: 'water', flowDirection: 45 }]);
    expect(generated.markers).toEqual([]);
    expect(generated.lightSources).toEqual([]);
    expect(generated.wallSegments).toEqual([]);
    expect(generated.pathSegments).toEqual([]);
    expect(generated.backgroundImage).toBeUndefined();
  });

  it('history snapshots restore modern map layers', () => {
    const map = createDefaultMap();
    map.tokens = [{ id: 1, kind: 'player', x: 0, y: 0, label: 'Hero' }];
    map.markers = [{ id: 1, x: 0, y: 0, shape: 'circle', color: '#ff0000', size: 1 }];
    map.lightSources = [{ id: 1, x: 0, y: 0, radius: 3, color: '#ffffff', label: 'Light' }];
    map.backgroundImage = { dataUrl: 'data:image/png;base64,AAAA', offsetX: 0, offsetY: 0, scale: 1, opacity: 1 };

    const snap = createHistorySnapshot(map);
    const changed = { ...map, tokens: [], markers: [], lightSources: [], backgroundImage: undefined };
    const restored = restoreHistorySnapshot(changed, snap);

    expect(restored.tokens).toEqual(map.tokens);
    expect(restored.markers).toEqual(map.markers);
    expect(restored.lightSources).toEqual(map.lightSources);
    expect(restored.backgroundImage).toEqual(map.backgroundImage);
  });
});

describe('nextIdAfter', () => {
  it('returns 1 for empty array', () => {
    expect(nextIdAfter([])).toBe(1);
  });

  it('returns 1 for undefined', () => {
    expect(nextIdAfter(undefined)).toBe(1);
  });

  it('returns max id + 1', () => {
    expect(nextIdAfter([{ id: 3 }, { id: 7 }, { id: 5 }])).toBe(8);
  });
});

describe('updateActiveLevel', () => {
  it('updates only the specified level', () => {
    const proj = createDefaultProject();
    const updated = updateActiveLevel(proj, 0, (lvl) => ({
      ...lvl,
      meta: { ...lvl.meta, name: 'Updated' },
    }));
    expect(updated.levels[0].meta.name).toBe('Updated');
    expect(updated.activeLevelIndex).toBe(0);
  });
});

describe('constants', () => {
  it('MAX_HISTORY_SIZE is reasonable', () => {
    expect(MAX_HISTORY_SIZE).toBeGreaterThan(0);
    expect(MAX_HISTORY_SIZE).toBeLessThanOrEqual(100);
  });
});
