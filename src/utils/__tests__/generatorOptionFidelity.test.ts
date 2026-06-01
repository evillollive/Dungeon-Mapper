import { describe, expect, it } from 'vitest';
import type { Tile, TileType } from '../../types/map';
import { deriveRenderableTilesFromBase } from '../derivedRenderMap';
import { generateCavern } from '../generators/cavern';
import { generateOpenTerrain } from '../generators/openTerrain';
import { generateRoomsCorridors } from '../generators/roomsCorridors';
import { generateVillage } from '../generators/village';
import { getGenerator, pickGeneratorForTheme } from '../generators';
import { getDungeonShape, rectFitsMask } from '../generators/shapeMask';
import type { GenerateContext } from '../generators/types';

function ctx(overrides: Partial<GenerateContext> = {}): GenerateContext {
  return {
    width: 48,
    height: 48,
    seed: 42,
    density: 1,
    ...overrides,
  };
}

function countTiles(tiles: Tile[][], types: TileType | readonly TileType[]): number {
  const wanted = new Set(Array.isArray(types) ? types : [types]);
  return tiles.flat().filter(tile => wanted.has(tile.type)).length;
}

function averageRoomShapeArea(roomShapes: NonNullable<ReturnType<typeof generateVillage>['roomShapes']>): number {
  if (roomShapes.length === 0) return 0;
  return roomShapes.reduce((sum, shape) => sum + shape.width * shape.height, 0) / roomShapes.length;
}

const RIVER_OPTIONS = {
  enabled: true,
  count: 1,
  width: 3,
  meander: 0,
  sourceEdge: 'north' as const,
};

const SPECIAL_TILE_TYPES: readonly TileType[] = [
  'start',
  'stairs-up',
  'stairs-down',
  'treasure',
  'trap',
  'door-h',
  'door-v',
  'secret-door',
  'locked-door-h',
  'locked-door-v',
  'trapped-door-h',
  'trapped-door-v',
  'portcullis',
  'archway',
  'barricade',
];

describe('generator registry fidelity', () => {
  it('selects expected default generators by theme', () => {
    expect(pickGeneratorForTheme('dungeon').id).toBe('rooms-and-corridors');
    expect(pickGeneratorForTheme('wilderness').id).toBe('open-terrain');
    expect(pickGeneratorForTheme('unknown-theme').id).toBe('rooms-and-corridors');
  });

  it('returns the requested generator or a safe fallback', () => {
    expect(getGenerator('village').id).toBe('village');
    expect(getGenerator('missing-generator').id).toBe('rooms-and-corridors');
  });
});

describe('rooms-and-corridors option fidelity', () => {
  it('does not alter seeded output when river options are disabled', () => {
    const base = generateRoomsCorridors(ctx({ themeId: 'dungeon' }));
    const disabled = generateRoomsCorridors(ctx({
      themeId: 'dungeon',
      rivers: { ...RIVER_OPTIONS, enabled: false },
    }));

    expect(disabled).toEqual(base);
  });

  it('adds visible underground rivers when requested for dungeon maps', () => {
    const result = generateRoomsCorridors(ctx({
      themeId: 'dungeon',
      rivers: RIVER_OPTIONS,
      tileMix: { treasure: 0.02, trap: 0.01 },
    }));

    expect(result.rivers).toHaveLength(1);
    expect(result.rivers![0].type).toBe('underground-stream');
    expect(result.rivers![0].controlPoints[0].y).toBeCloseTo(0.5);
    expect(result.rivers![0].controlPoints.at(-1)!.y).toBeCloseTo(result.height - 0.5);
    expect(countTiles(result.tiles, 'water')).toBeGreaterThan(0);

    const rendered = deriveRenderableTilesFromBase(
      result.tiles,
      result.roomShapes ?? [],
      result.rivers ?? [],
      result.width,
      result.height,
    );
    for (let y = 0; y < result.height; y++) {
      for (let x = 0; x < result.width; x++) {
        const baseType = result.tiles[y][x].type;
        if (SPECIAL_TILE_TYPES.includes(baseType)) {
          expect(rendered[y][x].type).toBe(baseType);
        }
      }
    }
  });

  it('keeps shaped dungeons inside the selected mask', () => {
    const result = generateRoomsCorridors(ctx({
      dungeonShape: 'circle',
      seed: 77,
      tileMix: { treasure: 0, trap: 0 },
    }));
    const mask = getDungeonShape('circle').mask(result.width, result.height);

    expect(result.roomShapes!.length).toBeGreaterThan(0);
    for (const shape of result.roomShapes!) {
      expect(rectFitsMask(mask, shape.x, shape.y, shape.width, shape.height)).toBe(true);
    }
  });

  it('emits room notes only when room labels are enabled', () => {
    const unlabeled = generateRoomsCorridors(ctx({
      themeId: 'dungeon',
      labelRooms: false,
      tileMix: { treasure: 0, trap: 0 },
    }));
    const labeled = generateRoomsCorridors(ctx({
      themeId: 'dungeon',
      labelRooms: true,
      tileMix: { treasure: 0, trap: 0 },
    }));
    const named = generateRoomsCorridors(ctx({
      themeId: 'dungeon',
      labelRooms: true,
      nameRooms: true,
      tileMix: { treasure: 0, trap: 0 },
    }));

    expect(unlabeled.notes.some(note => note.kind === 'room')).toBe(false);
    expect(labeled.notes.filter(note => note.kind === 'room').length).toBeGreaterThan(0);
    expect(named.notes.some(note => note.kind === 'room' && /\b(of|the)\b/.test(note.label))).toBe(true);
  });

  it('honors room size and door mix sliders', () => {
    const smallRooms = generateRoomsCorridors(ctx({
      seed: 15,
      tileMix: { roomSize: 0.5, treasure: 0, trap: 0 },
    }));
    const largeRooms = generateRoomsCorridors(ctx({
      seed: 15,
      tileMix: { roomSize: 1.5, treasure: 0, trap: 0 },
    }));
    const openDoors = generateRoomsCorridors(ctx({
      seed: 18,
      tileMix: { doors: 1, secretDoors: 0, treasure: 0, trap: 0 },
    }));
    const hiddenDoors = generateRoomsCorridors(ctx({
      seed: 18,
      tileMix: { doors: 1, secretDoors: 1, treasure: 0, trap: 0 },
    }));

    expect(averageRoomShapeArea(largeRooms.roomShapes!)).toBeGreaterThan(averageRoomShapeArea(smallRooms.roomShapes!));
    expect(countTiles(hiddenDoors.tiles, 'secret-door')).toBeGreaterThan(countTiles(openDoors.tiles, 'secret-door'));
  });
});

describe('open terrain option fidelity', () => {
  it('honors water, treasure, trap, and named-area sliders', () => {
    const dry = generateOpenTerrain(ctx({
      themeId: 'wilderness',
      tileMix: { wall: 0, water: 0, pillar: 0, treasure: 0, trap: 0, areas: 0 },
    }));
    const wet = generateOpenTerrain(ctx({
      themeId: 'wilderness',
      tileMix: { wall: 0, water: 0.2, pillar: 0, treasure: 0, trap: 0, areas: 0 },
    }));
    const populated = generateOpenTerrain(ctx({
      themeId: 'wilderness',
      tileMix: { wall: 0, water: 0, pillar: 0, treasure: 5, trap: 0.01, areas: 3 },
    }));

    expect(countTiles(wet.tiles, 'water')).toBeGreaterThan(countTiles(dry.tiles, 'water'));
    expect(countTiles(populated.tiles, 'treasure')).toBe(5);
    expect(countTiles(populated.tiles, 'trap')).toBe(Math.round(populated.width * populated.height * 0.01));
    expect(dry.notes.some(note => note.kind === 'room')).toBe(false);
    expect(populated.notes.some(note => note.kind === 'room')).toBe(true);
  });
});

describe('cavern option fidelity', () => {
  it('honors water and stairs-down sliders', () => {
    const dryNoStairs = generateCavern(ctx({
      themeId: 'cavern',
      tileMix: { water: 0, treasure: 0, trap: 0, areas: 0, stairsDown: 0 },
    }));
    const wetWithStairs = generateCavern(ctx({
      themeId: 'cavern',
      tileMix: { water: 0.12, treasure: 0, trap: 0, areas: 0, stairsDown: 1 },
    }));

    expect(countTiles(dryNoStairs.tiles, 'water')).toBe(0);
    expect(countTiles(dryNoStairs.tiles, 'stairs-down')).toBe(0);
    expect(countTiles(wetWithStairs.tiles, 'water')).toBeGreaterThan(0);
    expect(countTiles(wetWithStairs.tiles, 'stairs-down')).toBe(1);
  });
});

describe('village option fidelity', () => {
  it('honors town wall and building-size sliders', () => {
    const unwalled = generateVillage(ctx({
      seed: 99,
      themeId: 'castle',
      tileMix: { walls: 0, buildingSize: 1, treasure: 0, trap: 0 },
    }));
    const walled = generateVillage(ctx({
      seed: 99,
      themeId: 'castle',
      tileMix: { walls: 1, buildingSize: 1, treasure: 0, trap: 0 },
    }));
    const smallBuildings = generateVillage(ctx({
      seed: 99,
      themeId: 'castle',
      tileMix: { walls: 0, buildingSize: 0.5, treasure: 0, trap: 0 },
    }));
    const largeBuildings = generateVillage(ctx({
      seed: 99,
      themeId: 'castle',
      tileMix: { walls: 0, buildingSize: 1.5, treasure: 0, trap: 0 },
    }));

    expect(countTiles(walled.tiles[1] ? [walled.tiles[1]] : [], ['wall', 'door-h'])).toBeGreaterThan(
      countTiles(unwalled.tiles[1] ? [unwalled.tiles[1]] : [], ['wall', 'door-h']),
    );
    expect(averageRoomShapeArea(largeBuildings.roomShapes!)).toBeGreaterThan(averageRoomShapeArea(smallBuildings.roomShapes!));
  });
});
