import { describe, expect, it } from 'vitest';
import { creatorPackageFixture, creatorPackageOptions, CREATOR_PRIVATE_SENTINEL,
  CREATOR_UNKNOWN_SENTINEL } from '../../test/creatorPackageFixture';
import { denseMapFixture } from '../../test/denseMapFixture.mjs';
import { CREATOR_PACKAGE_LIMITS, prepareCreatorProject } from '../creatorProject';
import { decodeProject, encodeProject } from '../projectSchema';
import { copyCreatorFields } from '../creatorPackageFields';
import { findTheme, getTheme } from '../../themes';

describe('creator project review draft', () => {
  it('preserves both private backups and the original source while stripping layout disclosures', () => {
    const source = creatorPackageFixture();
    const before = encodeProject(source);
    const draft = prepareCreatorProject(source, creatorPackageOptions());
    expect(encodeProject(source)).toEqual(before);
    expect(decodeProject(before)).toEqual(source);
    const content = JSON.stringify(draft.project);
    expect(content).not.toContain(CREATOR_PRIVATE_SENTINEL);
    expect(content).not.toContain(CREATOR_UNKNOWN_SENTINEL);
    expect(content).not.toContain('future');
    expect(draft.project.name).toBe('Shared cartographer vault');
    expect(draft.project.levels.map(map => map.meta.name)).toEqual(['Vault entrance', 'Lower vault']);
    expect(draft.project.levels[0].tiles[2][2]).toEqual({ type: 'secret-door' });
    expect(draft.project.stairLinks).toEqual([
      { fromLevel: 0, fromCell: { x: 4, y: 4 }, toLevel: 1, toCell: { x: 4, y: 4 } },
    ]);
    expect(draft.project.sceneTemplates).toBeUndefined();
    for (const map of draft.project.levels) {
      expect(map.notes).toEqual([]);
      expect(map.tokens).toEqual([]);
      expect(map.annotations).toEqual([]);
      expect(map.markers).toEqual([]);
      expect(map.stamps?.map(stamp => stamp.id)).toEqual([1]);
      expect(map.lightSources?.[0].label).toBe('Light');
      expect(map.fogEnabled).toBe(true);
      expect(map.dynamicFogEnabled).toBe(false);
      expect(map.fog?.flat().every(Boolean)).toBe(true);
      expect(map.explored?.flat().some(Boolean)).toBe(false);
      expect(map.initiative).toEqual([]);
    }
    expect(draft.omissions).toContainEqual({ path: 'project.futureProject', reason: 'unknown-field' });
    expect(draft.omissions).toContainEqual({ path: 'project.levels[0].notes[1].futureNote', reason: 'unknown-field' });
    expect(draft.omissions).toContainEqual({ path: 'project.stairLinks[0]', reason: 'excluded-reference' });
  });

  it('includes only explicitly selected encounter content, never unknown nested fields', () => {
    const source = creatorPackageFixture();
    const options = creatorPackageOptions();
    options.profile = 'encounter';
    options.license = 'CC-BY-SA-4.0';
    options.levels[0] = { ...options.levels[0], notes: [2], tokens: [2],
      hiddenStamps: [2], annotations: [1], markers: [1] };
    const draft = prepareCreatorProject(source, options);
    const map = draft.project.levels[0];
    expect(map.notes.map(note => note.id)).toEqual([2]);
    expect(map.tokens?.map(token => token.id)).toEqual([2]);
    expect(map.tokens?.[0].hidden).toBe(true);
    expect(map.stamps?.map(stamp => stamp.id)).toEqual([1, 2]);
    expect(map.annotations?.map(stroke => stroke.id)).toEqual([1]);
    expect(map.markers?.map(marker => marker.id)).toEqual([1]);
    expect(map.tiles[2][2]).toEqual({ type: 'secret-door', noteId: 2 });
    expect(JSON.stringify(draft.project)).not.toContain(CREATOR_PRIVATE_SENTINEL);
    expect(JSON.stringify(draft.project)).not.toContain(CREATOR_UNKNOWN_SENTINEL);
    expect(draft.license).toBe('CC-BY-SA-4.0');
    expect(draft.project.levels[1].notes).toEqual([]);
  });

  it('requires a deliberate choice for cross-level links and never changes the original', () => {
    const source = creatorPackageFixture();
    const options = creatorPackageOptions();
    options.omitCrossLevelLinks = false;
    const before = encodeProject(source);
    expect(() => prepareCreatorProject(source, options)).toThrow('unselected level');
    expect(encodeProject(source)).toEqual(before);
    options.levels.push({ index: 1, name: 'Middle vault' });
    expect(prepareCreatorProject(source, options).project.stairLinks).toEqual(source.stairLinks);
  });

  it('does not make the encounter profile itself a blanket content inclusion', () => {
    const options = creatorPackageOptions();
    options.profile = 'encounter';
    const result = prepareCreatorProject(creatorPackageFixture(), options);
    expect(result.project.levels.every(map => !map.notes.length && !map.tokens?.length)).toBe(true);
  });

  it.each(['notes', 'tokens', 'hiddenStamps', 'annotations', 'markers', 'lightLabels'] as const)(
    'rejects %s selections in the layout profile', key => {
      const options = creatorPackageOptions();
      options.levels[0][key] = [1];
      expect(() => prepareCreatorProject(creatorPackageFixture(), options)).toThrow('DM encounter profile');
    });

  it.each(['notes', 'tokens', 'hiddenStamps', 'annotations', 'markers', 'lightLabels'] as const)(
    'rejects stale or duplicated %s selections', key => {
      for (const ids of [[999], [1, 1]]) {
        const options = creatorPackageOptions();
        options.profile = 'encounter';
        options.levels[0][key] = ids;
        expect(() => prepareCreatorProject(creatorPackageFixture(), options)).toThrow('selection');
      }
    });

  it('requires explicit publication identity and license with no fallback', () => {
    for (const field of ['title', 'author'] as const) {
      const options = creatorPackageOptions();
      options[field] = '  ';
      expect(() => prepareCreatorProject(creatorPackageFixture(), options)).toThrow('explicitly');
    }
    const options = creatorPackageOptions();
    Object.assign(options, { license: undefined });
    expect(() => prepareCreatorProject(creatorPackageFixture(), options)).toThrow('license');
    options.license = 'CC-BY-4.0';
    options.levels[0].name = '';
    expect(() => prepareCreatorProject(creatorPackageFixture(), options)).toThrow('explicitly');
  });

  it('rejects ambiguous IDs, missing references, unsupported material and stale level selections', () => {
    const missingNote = creatorPackageFixture();
    missingNote.levels[0].tiles[0][0].noteId = 999;
    expect(() => prepareCreatorProject(missingNote, creatorPackageOptions())).toThrow('Missing note');
    const duplicate = creatorPackageFixture();
    duplicate.levels[0].tokens!.push({ ...duplicate.levels[0].tokens![0] });
    expect(() => prepareCreatorProject(duplicate, creatorPackageOptions())).toThrow('entity IDs');
    const material = creatorPackageFixture();
    material.levels[0].tiles[0][0].floorMaterial = 'future-material';
    expect(() => prepareCreatorProject(material, creatorPackageOptions())).toThrow('Unsupported floor');
    const options = creatorPackageOptions();
    options.levels.push({ index: 99, name: 'Missing' });
    expect(() => prepareCreatorProject(creatorPackageFixture(), options)).toThrow('selected levels');
  });

  it('includes exactly the custom-library dependency closure and marks it for rights review', () => {
    const source = creatorPackageFixture();
    source.customThemes = [{
      id: 'custom-theme:vault', name: 'Vault stone', baseThemeId: 'dungeon', gridColor: '#111111',
      tileColors: { floor: '#333333' }, tileLabels: { floor: 'Stone' },
      customTiles: [
        { id: 'custom:needed', label: 'Needed', color: '#123456', baseType: 'floor' },
        { id: 'custom:unused', label: CREATOR_PRIVATE_SENTINEL, color: '#123456', baseType: 'floor' },
      ],
    }];
    source.levels[0].roomShapes![0].fillTile = 'custom:needed';
    Object.assign(source.customThemes[0], { secret: CREATOR_UNKNOWN_SENTINEL });
    Object.assign(source.customThemes[0].tileColors, { secret: CREATOR_UNKNOWN_SENTINEL });
    source.customStamps = [
      { id: 'needed-stamp', name: 'Needed stamp', category: 'custom', viewBox: '0 0 1 1', svgPath: 'M0 0L1 1' },
      { id: 'unused-stamp', name: CREATOR_PRIVATE_SENTINEL, category: 'custom', viewBox: '0 0 1 1', svgPath: 'M0 0L1 1' },
    ];
    source.levels[0].stamps![0].stampId = 'needed-stamp';
    const before = encodeProject(source);
    const result = prepareCreatorProject(source, creatorPackageOptions());
    expect(result.project.customThemes?.[0].customTiles.map(tile => tile.id)).toEqual(['custom:needed']);
    expect(result.project.customStamps?.map(stamp => stamp.id)).toEqual(['needed-stamp']);
    expect(result.assetsRequiringReview).toEqual([
      { key: 'stamp:needed-stamp', kind: 'custom-stamp' },
      { key: 'theme:custom-theme:vault', kind: 'custom-theme' },
    ]);
    expect(JSON.stringify(result.project)).not.toContain(CREATOR_PRIVATE_SENTINEL);
    expect(JSON.stringify(result.project)).not.toContain(CREATOR_UNKNOWN_SENTINEL);
    expect(encodeProject(source)).toEqual(before);
  });

  it('bounds selected geometry before allocation without changing private backup support', () => {
    const source = creatorPackageFixture();
    const options = creatorPackageOptions();
    source.levels[0].meta.width = CREATOR_PACKAGE_LIMITS.cells + 1;
    expect(() => prepareCreatorProject(source, options)).toThrow('tile cells');
    const dense = decodeProject(denseMapFixture());
    const before = encodeProject(dense);
    const result = prepareCreatorProject(dense, { ...options, levels: [{ index: 0, name: 'Dense shared layout' }] });
    expect(result.project.levels[0].tiles).toHaveLength(128);
    expect(JSON.stringify(result.project)).not.toContain('F05_PRIVATE_SENTINEL');
    expect(encodeProject(dense)).toEqual(before);
  });

  it('preserves known legacy theme aliases but rejects unknown themes and unavailable art', () => {
    const source = creatorPackageFixture();
    source.levels[0].meta.theme = 'fantasy';
    expect(prepareCreatorProject(source, creatorPackageOptions()).project.levels[0].meta.theme).toBe('fantasy');
    expect(findTheme('fantasy')).toBe(getTheme('dungeon'));
    expect(findTheme('scifi')).toBe(getTheme('starship'));
    expect(findTheme('future-theme')).toBeUndefined();
    expect(getTheme('future-theme')).toBe(getTheme('dungeon'));
    source.levels[0].meta.theme = 'future-theme';
    expect(() => prepareCreatorProject(source, creatorPackageOptions())).toThrow('theme');
    source.levels[0].meta.theme = 'dungeon';
    source.levels[0].stamps![0].stampId = 'folio-furnishings-v99-missing';
    expect(() => prepareCreatorProject(source, creatorPackageOptions())).toThrow('stamp');
  });

  it('is deterministic and independent from later changes to source and review options', () => {
    const source = creatorPackageFixture(), options = creatorPackageOptions();
    const result = prepareCreatorProject(source, options);
    const before = JSON.stringify(result);
    expect(JSON.stringify(prepareCreatorProject(source, options))).toBe(before);
    source.levels[0].tiles[0][0].type = 'wall';
    options.levels[0].name = 'Changed';
    expect(JSON.stringify(result)).toBe(before);
  });

  it.each([31, 32, 33])('enforces the selected-level boundary at %i levels', count => {
    const source = creatorPackageFixture();
    source.levels = Array.from({ length: count }, () => structuredClone(source.levels[0]));
    source.stairLinks = [];
    const options = { ...creatorPackageOptions(),
      levels: source.levels.map((_, index) => ({ index, name: `Shared level ${index}` })) };
    if (count <= CREATOR_PACKAGE_LIMITS.levels) {
      expect(prepareCreatorProject(source, options).project.levels).toHaveLength(count);
    } else expect(() => prepareCreatorProject(source, options)).toThrow('between 1 and 32');
  });

  it.each([511, 512, 513])('enforces aggregate-cell limits at %i by 512', width => {
    const source = creatorPackageFixture();
    source.levels = [source.levels[0]];
    const map = source.levels[0];
    map.meta.width = width;
    map.meta.height = 512;
    map.tiles = Array.from({ length: 512 }, () => Array.from({ length: width }, () => ({ type: 'floor' as const })));
    source.stairLinks = [];
    const options = { ...creatorPackageOptions(), levels: [{ index: 0, name: 'Cell boundary' }] };
    if (width <= 512) expect(prepareCreatorProject(source, options).project.levels[0].tiles[0]).toHaveLength(width);
    else expect(() => prepareCreatorProject(source, options)).toThrow('tile cells');
  });

  it('ignores content in unselected levels, including unsupported future fields', () => {
    const source = creatorPackageFixture();
    Object.assign(source.levels[1], { futureGeometry: new Date(0) });
    expect(() => prepareCreatorProject(source, creatorPackageOptions())).not.toThrow();
    expect(source.levels[1]).toHaveProperty('futureGeometry', new Date(0));
    expect(() => encodeProject(source)).toThrow('plain JSON object');
  });

  it('rejects nested objects at scalar fields without copying their contents', () => {
    const source = creatorPackageFixture();
    Object.assign(source.levels[0].tokens![0], { label: { secret: CREATOR_PRIVATE_SENTINEL } });
    expect(() => prepareCreatorProject(source, creatorPackageOptions())).toThrow('finite scalar');
  });

  it('does not allow prototype property names as declared fields', () => {
    const omissions: Parameters<typeof copyCreatorFields>[3] = [];
    const source: unknown = JSON.parse('{"label":"Approved","__proto__":{"secret":true},"constructor":"private"}');
    expect(copyCreatorFields(source, { label: true }, 'value', omissions)).toEqual({ label: 'Approved' });
    expect(omissions).toEqual([
      { path: 'value.__proto__', reason: 'unknown-field' },
      { path: 'value.constructor', reason: 'unknown-field' },
    ]);
  });
});
