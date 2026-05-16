import { describe, expect, it } from 'vitest';
import { deriveRenderableTiles } from '../derivedRenderMap';
import { buildPremadeProject, PREMADE_MAP_SUMMARIES } from '../premadeMaps';

describe('premade map river polish', () => {
  it('adds editable river vectors to river-relevant premade archetypes', () => {
    for (const id of ['castle-grounds', 'verdant-crossing', 'port-havoc', 'forgotten-sun']) {
      const project = buildPremadeProject(id);
      expect(project.levels.some(level => (level.rivers ?? []).length > 0)).toBe(true);
    }
  });

  it('renders premade river banks from the vector layer', () => {
    const project = buildPremadeProject('verdant-crossing');
    const level = project.levels[0];
    const tiles = deriveRenderableTiles(level);

    expect(level.rivers.length).toBeGreaterThan(0);
    expect(tiles.flat().some(tile => tile.type === 'water' && tile.riverId !== undefined)).toBe(true);
    expect(tiles.flat().some(tile => tile.riverBank !== undefined)).toBe(true);
  });

  it('exposes archetype tags for every premade summary', () => {
    expect(PREMADE_MAP_SUMMARIES.length).toBeGreaterThan(0);
    for (const summary of PREMADE_MAP_SUMMARIES) {
      expect(summary.archetype.trim().length).toBeGreaterThan(0);
    }
  });

  it('fills all premade empty cells with background tiles', () => {
    for (const summary of PREMADE_MAP_SUMMARIES) {
      const project = buildPremadeProject(summary.id);
      for (const level of project.levels) {
        expect(level.tiles.flat().some(tile => tile.type === 'empty')).toBe(false);
      }
    }
  }, 20000);
});
