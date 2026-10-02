import { describe, expect, it } from 'vitest';
import { deriveRenderableTiles } from '../derivedRenderMap';
import { buildPremadeProject, PREMADE_MAP_SUMMARIES } from '../premadeMaps';
import { SAMPLE_GUIDES, sampleGuide, sampleGuideText } from '../sampleGuides';
import { decodeProject, encodeProject } from '../projectSchema';
import { projectForAudience } from '../audienceProjection';

describe('premade map river polish', () => {
  it('defines a role-specific purpose and usage for every bundled sample, with no orphan guides', () => {
    expect(PREMADE_MAP_SUMMARIES).toHaveLength(35);
    expect(Object.keys(SAMPLE_GUIDES).sort()).toEqual(PREMADE_MAP_SUMMARIES.map(sample => sample.id).sort());
    const roles = PREMADE_MAP_SUMMARIES.map(sample => sample.guide.role);
    expect(roles.filter(role => role === 'Generated example')).toHaveLength(26);
    expect(roles.filter(role => role === 'Art reference')).toHaveLength(6);
    expect(roles.filter(role => role === 'Launch encounter')).toHaveLength(3);
    for (const sample of PREMADE_MAP_SUMMARIES) {
      expect(sample.guide).toEqual(sampleGuide(sample.id));
      expect(sample.guide.purpose.trim().length).toBeGreaterThan(30);
      expect(sample.guide.use.trim().length).toBeGreaterThan(60);
    }
    for (const missing of ['missing', '__proto__', 'constructor']) expect(() => sampleGuide(missing)).toThrow('Missing purpose');
  });

  it('retains private guidance on every level through JSON without publishing it or mutating other copies', () => {
    for (const sample of PREMADE_MAP_SUMMARIES) {
      const project = buildPremadeProject(sample.id);
      const guide = sampleGuideText(project.name, sample.guide);
      const decoded = decodeProject(encodeProject(project));
      expect(decoded.levels.map(level => level.notes)).toEqual(project.levels.map(level => level.notes));
      for (const level of decoded.levels) {
        expect(level.notes[0].description.startsWith(`${guide}\n\n`), sample.id).toBe(true);
        expect(level.notes[0].description.slice(guide.length + 2).trim().length).toBeGreaterThan(0);
        expect(level.notes[0].description.match(/Sample guide:/g)).toHaveLength(1);
        expect(JSON.stringify(projectForAudience(level))).not.toContain('Sample guide:');
      }
      project.levels[0].notes[0].description = 'Changed independently';
      expect(buildPremadeProject(sample.id).levels[0].notes[0].description.startsWith(guide)).toBe(true);
    }
  }, 20000);

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
