import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../../hooks/mapStateUtils';
import { decodeProject, previewFogRepair } from '../projectSchema';

function staleProject() {
  const project = createDefaultProject();
  const map = project.levels[0];
  map.fog = Array.from({ length: 16 }, () => Array<boolean>(40).fill(false));
  map.explored = Array.from({ length: 40 }, () => Array<boolean>(24).fill(true));
  map.notes = [{ id: 1, x: 1, y: 1, label: 'Private note', description: 'Do not rewrite' }];
  Object.assign(map, { extension: { untouched: true } });
  return project;
}

describe('explicit fog dimension repair preview', () => {
  it('previews mixed padding/cropping without changing original data or other content', () => {
    const original = staleProject();
    const before = JSON.stringify(original);
    const preview = previewFogRepair(original);
    expect(JSON.stringify(original)).toBe(before);
    expect(preview.changes).toEqual([
      { levelIndex: 0, levelName: 'Level 1', layer: 'fog', fromWidth: 40, fromHeight: 16,
        toWidth: 32, toHeight: 32, addedCells: 512, excludedCells: 128 },
      { levelIndex: 0, levelName: 'Level 1', layer: 'explored', fromWidth: 24, fromHeight: 40,
        toWidth: 32, toHeight: 32, addedCells: 256, excludedCells: 192 },
    ]);
    const repaired = preview.project.levels[0];
    expect(repaired.fog?.[0][0]).toBe(false);
    expect(repaired.fog?.[31][31]).toBe(true);
    expect(repaired.explored?.[0][0]).toBe(true);
    expect(repaired.explored?.[0][31]).toBe(false);
    expect(repaired.notes).toEqual(original.levels[0].notes);
    expect(repaired).toHaveProperty('extension', { untouched: true });
    expect(decodeProject(preview.project)).toEqual(preview.project);
  });

  it('supports legacy text, bare maps, schema v1, and multiple levels', () => {
    const original = staleProject();
    original.levels.push({ ...staleProject().levels[0], meta: { ...original.levels[0].meta, name: 'Upper floor' } });
    for (const data of [original, JSON.stringify(original), { schemaVersion: 1, project: original }]) {
      expect(previewFogRepair(data).changes).toHaveLength(4);
    }
    expect(previewFogRepair(original.levels[0]).project.levels[0].notes).toEqual(original.levels[0].notes);
  });

  it('does not silently repair during normal decoding or repeat an already-applied repair', () => {
    expect(() => decodeProject(staleProject())).toThrow(/fog/);
    const { project } = previewFogRepair(staleProject());
    expect(() => previewFogRepair(project)).toThrow('No mismatched fog dimensions');
  });

  it('rejects future versions without interpreting their project content', () => {
    const future = { schemaVersion: 999, project: staleProject() };
    const before = JSON.stringify(future);
    expect(() => previewFogRepair(future)).toThrow(/version 999/);
    expect(JSON.stringify(future)).toBe(before);
  });

  it.each([
    ['ragged fog', (p: ReturnType<typeof staleProject>) => { p.levels[0].fog![0].pop(); }],
    ['non-boolean fog', (p: ReturnType<typeof staleProject>) => { Object.assign(p.levels[0].fog![0], { 0: 'false' }); }],
    ['empty grid', (p: ReturnType<typeof staleProject>) => { p.levels[0].fog = []; }],
    ['broken tiles', (p: ReturnType<typeof staleProject>) => { p.levels[0].tiles.pop(); }],
    ['unrelated invalid note', (p: ReturnType<typeof staleProject>) => { Object.assign(p.levels[0].notes[0], { label: null }); }],
  ])('rejects %s without modifying the original', (_label, mutate) => {
    const original = staleProject();
    mutate(original);
    const before = JSON.stringify(original);
    expect(() => previewFogRepair(original)).toThrow();
    expect(JSON.stringify(original)).toBe(before);
  });
});
