import { describe, it, expect } from 'vitest';
import { generateRoomsCorridors } from '../generators/roomsCorridors';
import { generateVillage } from '../generators/village';
import { generateCavern } from '../generators/cavern';
import { generateOpenTerrain } from '../generators/openTerrain';
import type { GenerateContext } from '../generators/types';

// ── Helpers ──────────────────────────────────────────────────────────────

/** Minimal context with sane defaults for a small map. */
function ctx(overrides: Partial<GenerateContext> = {}): GenerateContext {
  return {
    width: 32,
    height: 32,
    seed: 42,
    density: 1,
    ...overrides,
  };
}

// ── Rooms & Corridors ────────────────────────────────────────────────────

describe('generateRoomsCorridors — roomShapes', () => {
  it('emits a non-empty roomShapes array', () => {
    const result = generateRoomsCorridors(ctx());
    expect(result.roomShapes).toBeDefined();
    expect(result.roomShapes!.length).toBeGreaterThan(0);
  });

  it('each roomShape has valid id, position, and dimensions', () => {
    const result = generateRoomsCorridors(ctx());
    for (const shape of result.roomShapes!) {
      expect(shape.id).toBeGreaterThan(0);
      expect(shape.x).toBeGreaterThanOrEqual(0);
      expect(shape.y).toBeGreaterThanOrEqual(0);
      expect(shape.width).toBeGreaterThanOrEqual(1);
      expect(shape.height).toBeGreaterThanOrEqual(1);
    }
  });

  it('roomShape ids are unique and sequential starting at 1', () => {
    const result = generateRoomsCorridors(ctx());
    const ids = result.roomShapes!.map(s => s.id);
    for (let i = 0; i < ids.length; i++) {
      expect(ids[i]).toBe(i + 1);
    }
  });

  it('roomShapes stay within grid bounds', () => {
    const result = generateRoomsCorridors(ctx({ width: 24, height: 24 }));
    for (const shape of result.roomShapes!) {
      expect(shape.x + shape.width).toBeLessThanOrEqual(24);
      expect(shape.y + shape.height).toBeLessThanOrEqual(24);
    }
  });

  it('roomShape count varies with density', () => {
    const low = generateRoomsCorridors(ctx({ density: 0.3, seed: 100 }));
    const high = generateRoomsCorridors(ctx({ density: 2, seed: 100 }));
    // High density should attempt more rooms.
    expect(high.roomShapes!.length).toBeGreaterThanOrEqual(low.roomShapes!.length);
  });

  it('does not include fillTile or wallTile overrides by default', () => {
    const result = generateRoomsCorridors(ctx());
    for (const shape of result.roomShapes!) {
      expect(shape.fillTile).toBeUndefined();
      expect(shape.wallTile).toBeUndefined();
    }
  });

  it('produces different shapes for different seeds', () => {
    const a = generateRoomsCorridors(ctx({ seed: 1 }));
    const b = generateRoomsCorridors(ctx({ seed: 999 }));
    // At least position or count should differ (extremely unlikely to match).
    const posA = a.roomShapes!.map(s => `${s.x},${s.y}`).join(';');
    const posB = b.roomShapes!.map(s => `${s.x},${s.y}`).join(';');
    expect(posA).not.toBe(posB);
  });
});

// ── Village (BSP) ────────────────────────────────────────────────────────

describe('generateVillage — roomShapes', () => {
  it('emits a non-empty roomShapes array', () => {
    const result = generateVillage(ctx());
    expect(result.roomShapes).toBeDefined();
    expect(result.roomShapes!.length).toBeGreaterThan(0);
  });

  it('each roomShape has valid id, position, and dimensions', () => {
    const result = generateVillage(ctx());
    for (const shape of result.roomShapes!) {
      expect(shape.id).toBeGreaterThan(0);
      expect(shape.x).toBeGreaterThanOrEqual(0);
      expect(shape.y).toBeGreaterThanOrEqual(0);
      expect(shape.width).toBeGreaterThanOrEqual(1);
      expect(shape.height).toBeGreaterThanOrEqual(1);
    }
  });

  it('roomShape ids are unique and sequential starting at 1', () => {
    const result = generateVillage(ctx());
    const ids = result.roomShapes!.map(s => s.id);
    for (let i = 0; i < ids.length; i++) {
      expect(ids[i]).toBe(i + 1);
    }
  });

  it('roomShapes stay within grid bounds', () => {
    const result = generateVillage(ctx({ width: 24, height: 24 }));
    for (const shape of result.roomShapes!) {
      expect(shape.x + shape.width).toBeLessThanOrEqual(24);
      expect(shape.y + shape.height).toBeLessThanOrEqual(24);
    }
  });
});

// ── Cavern — no discrete rooms ───────────────────────────────────────────

describe('generateCavern — roomShapes', () => {
  it('does not emit roomShapes (no discrete rooms)', () => {
    const result = generateCavern(ctx());
    expect(result.roomShapes).toBeUndefined();
  });
});

// ── Open Terrain — no discrete rooms ─────────────────────────────────────

describe('generateOpenTerrain — roomShapes', () => {
  it('does not emit roomShapes (no discrete rooms)', () => {
    const result = generateOpenTerrain(ctx());
    expect(result.roomShapes).toBeUndefined();
  });
});

// ── Rivers ────────────────────────────────────────────────────────────────

describe('generator river integration', () => {
  const riverOptions = {
    enabled: true,
    count: 1,
    width: 2,
    meander: 0.5,
    sourceEdge: 'north' as const,
  };

  it('open terrain emits editable river vectors and carved water tiles', () => {
    const result = generateOpenTerrain(ctx({ rivers: riverOptions, themeId: 'wilderness' }));

    expect(result.rivers).toHaveLength(1);
    expect(result.rivers![0].type).toBe('water');
    expect(result.tiles.flat().some(t => t.type === 'water')).toBe(true);
  });

  it('cavern emits underground streams', () => {
    const result = generateCavern(ctx({ rivers: riverOptions, themeId: 'dungeon' }));

    expect(result.rivers).toHaveLength(1);
    expect(result.rivers![0].type).toBe('underground-stream');
    expect(result.tiles.flat().some(t => t.type === 'water')).toBe(true);
  });

  it('village inserts bridge archways where streets cross generated rivers', () => {
    const result = generateVillage(ctx({
      width: 48,
      height: 48,
      seed: 9,
      rivers: { ...riverOptions, width: 4, meander: 0 },
      themeId: 'wilderness',
      tileMix: { walls: 0 },
    }));

    expect(result.rivers).toHaveLength(1);
    expect(result.tiles.flat().some(t => t.type === 'archway')).toBe(true);
  });

  it('does not emit rivers unless requested', () => {
    const result = generateOpenTerrain(ctx());

    expect(result.rivers).toEqual([]);
  });

  it('skips river emission on maps too small for generated rivers', () => {
    const result = generateOpenTerrain(ctx({ width: 3, height: 3, rivers: riverOptions }));

    expect(result.rivers).toEqual([]);
  });
});
