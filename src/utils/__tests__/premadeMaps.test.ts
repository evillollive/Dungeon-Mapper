import { describe, expect, it } from 'vitest';
import { deriveRenderableTiles } from '../derivedRenderMap';
import { buildPremadeProject } from '../premadeMaps';

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
});
