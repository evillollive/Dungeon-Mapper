import { describe, it, expect } from 'vitest';
import {
  createDefaultMap,
  createDefaultProject,
  withDefaults,
  withProjectDefaults,
  nextIdAfter,
  updateActiveLevel,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_TILE_SIZE,
  MAX_HISTORY_SIZE,
} from '../mapStateUtils';
import type { DungeonMap, DungeonProject } from '../../types/map';

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
    expect(filled.lightSources).toEqual([]);
    expect(filled.annotations).toEqual([]);
    expect(filled.markers).toEqual([]);
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
