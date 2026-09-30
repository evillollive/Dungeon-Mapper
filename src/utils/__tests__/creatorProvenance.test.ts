import { describe, expect, it } from 'vitest';
import {
  combineCreatorProvenance, creatorLicenseChoices, normalizeCreatorCredit,
  readCreatorProvenance, type CreatorProvenance,
} from '../creatorProvenance';
import { createProjectCandidate, createProjectFromTemplate } from '../projectCreation';
import { buildPremadeProject } from '../premadeMaps';
import { decodeProject, encodeProject } from '../projectSchema';
import { prepareCreatorProject } from '../creatorProject';
import { creatorPackageFixture, creatorPackageOptions } from '../../test/creatorPackageFixture';

const credit = { title: 'Prior map', author: 'Prior creator', license: 'AGPL-3.0-or-later',
  url: 'https://example.org/maps/original', notice: 'Retain this source notice.' };
const inherited: CreatorProvenance = { version: 1, mapSources: [credit], assetCredits: [] };

describe('creator source rights', () => {
  it('offers CC choices for original work and retains inherited share-alike obligations', () => {
    expect(creatorLicenseChoices([])).toEqual(['CC-BY-4.0', 'CC-BY-SA-4.0']);
    expect(creatorLicenseChoices([credit])).toEqual(['AGPL-3.0-or-later']);
    expect(creatorLicenseChoices([{ ...credit, license: 'CC-BY-SA-4.0' }])).toEqual(['CC-BY-SA-4.0']);
    expect(() => creatorLicenseChoices([credit, { ...credit, license: 'CC-BY-SA-4.0' }])).toThrow('compatibility review');
    expect(() => creatorLicenseChoices([{ ...credit, license: 'custom-license' }])).toThrow('compatibility review');
  });

  it('does not treat missing provenance as evidence of authorship or assign it a license', () => {
    expect(readCreatorProvenance(undefined)).toEqual({ version: 1, mapSources: [], assetCredits: [] });
    const options = creatorPackageOptions();
    Object.assign(options, { license: undefined });
    expect(() => prepareCreatorProject(creatorPackageFixture(), options)).toThrow('explicit');
    options.license = 'AGPL-3.0-or-later';
    expect(() => prepareCreatorProject(creatorPackageFixture(), options)).toThrow('compatible');
    options.sources = [credit];
    expect(prepareCreatorProject(creatorPackageFixture(), options).provenance.mapSources).toEqual([credit]);
  });

  it('attaches existing AGPL notices to new launch sample copies and never relabels them CC', () => {
    const source = buildPremadeProject('launch-lantern-crypt');
    const before = encodeProject(source);
    const options = { ...creatorPackageOptions(), levels: [{ index: 0, name: 'Crypt remix' }] };
    expect(() => prepareCreatorProject(source, options)).toThrow('compatible');
    options.license = 'AGPL-3.0-or-later';
    const result = prepareCreatorProject(source, options);
    expect(result.provenance.mapSources[0]).toMatchObject({
      title: 'The Lantern Crypt', author: 'Dungeon Mapper contributors', license: 'AGPL-3.0-or-later',
    });
    expect(result.project.levels[0].creatorProvenance).toBeUndefined();
    expect(encodeProject(source)).toEqual(before);
    expect(decodeProject(before)).toEqual(source);
  });

  it('uses only selected-level notices but retains project-wide obligations', () => {
    const source = creatorPackageFixture();
    source.levels[1].creatorProvenance = inherited;
    expect(prepareCreatorProject(source, creatorPackageOptions()).license).toBe('CC-BY-4.0');
    source.creatorProvenance = inherited;
    expect(() => prepareCreatorProject(source, creatorPackageOptions())).toThrow('compatible');
  });

  it('preserves future source records in private copies and fails closed at the publication boundary', () => {
    const unknown = { version: 99, retained: { future: ['notice'] } };
    const source = creatorPackageFixture();
    source.creatorProvenance = unknown;
    expect(decodeProject(encodeProject(source)).creatorProvenance).toEqual(unknown);
    const copy = createProjectCandidate({ path: 'blank', name: 'New', width: 24, height: 24, themeId: 'dungeon' }, source);
    expect(copy.creatorProvenance).toEqual(unknown);
    expect(copy.creatorProvenance).not.toBe(unknown);
    expect(() => readCreatorProvenance(copy.creatorProvenance)).toThrow('unsupported');
    const merged = combineCreatorProvenance(inherited, unknown);
    expect(merged).toEqual({ version: 'unresolved', inherited: [inherited, unknown] });
    expect(() => readCreatorProvenance(merged)).toThrow('unsupported');
  });

  it('does not transfer unrelated old-map obligations to a blank map but keeps reusable template notices', () => {
    const source = creatorPackageFixture();
    source.creatorProvenance = inherited;
    const copy = createProjectCandidate({ path: 'blank', name: 'New', width: 24, height: 24, themeId: 'dungeon' }, source);
    expect(readCreatorProvenance(copy.creatorProvenance).mapSources).toEqual([]);
    expect(copy.sceneTemplates?.[0].creatorProvenance).toEqual(inherited);
    const fromTemplate = createProjectFromTemplate(copy, copy.sceneTemplates![0].id);
    expect(fromTemplate.levels[0].creatorProvenance).toEqual(inherited);
    expect(source.sceneTemplates?.[0].creatorProvenance).toBeUndefined();
  });

  it('merges notices without duplicates or shared mutable references', () => {
    const merged = combineCreatorProvenance(inherited, inherited);
    expect(readCreatorProvenance(merged)).toEqual(inherited);
    expect(merged).not.toBe(inherited);
    expect(readCreatorProvenance(merged).mapSources[0]).not.toBe(credit);
  });

  it.each([
    { ...credit, url: 'javascript:alert(1)' },
    { ...credit, url: 'https://user:secret@example.org/map' },
    { ...credit, url: 'https://example.org/map?token=private' },
    { ...credit, url: 'invalid URL' },
    { ...credit, author: '' },
    { ...credit, license: 'NOASSERTION' },
    { ...credit, unsupported: 'unknown' },
  ])('rejects incomplete or unsafe attribution at publication', value => {
    expect(() => normalizeCreatorCredit(value)).toThrow();
  });
});
