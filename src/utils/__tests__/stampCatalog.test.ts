import { describe, it, expect } from 'vitest';
import { BUILT_IN_STAMPS, STAMP_CATEGORY_LABELS, getStampDef } from '../stampCatalog';
import type { StampDef } from '../../types/map';

describe('BUILT_IN_STAMPS', () => {
  it('has stamps defined', () => {
    expect(BUILT_IN_STAMPS.length).toBeGreaterThan(0);
  });

  it('every stamp has required fields', () => {
    for (const stamp of BUILT_IN_STAMPS) {
      expect(stamp.id).toBeTruthy();
      expect(stamp.name).toBeTruthy();
      expect(stamp.category).toBeTruthy();
      expect(stamp.viewBox).toBeTruthy();
      expect(stamp.svgPath).toBeTruthy();
    }
  });

  it('all stamp ids are unique', () => {
    const ids = BUILT_IN_STAMPS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains expected categories', () => {
    const categories = new Set(BUILT_IN_STAMPS.map(s => s.category));
    expect(categories.has('furniture')).toBe(true);
    expect(categories.has('dungeon-dressing')).toBe(true);
    expect(categories.has('nature')).toBe(true);
    expect(categories.has('structures')).toBe(true);
    expect(categories.has('markers')).toBe(true);
  });
});

describe('STAMP_CATEGORY_LABELS', () => {
  it('has labels for standard categories', () => {
    expect(STAMP_CATEGORY_LABELS['all']).toBe('All');
    expect(STAMP_CATEGORY_LABELS['furniture']).toBe('Furniture');
    expect(STAMP_CATEGORY_LABELS['custom']).toBe('Custom');
  });
});

describe('getStampDef', () => {
  it('finds a built-in stamp by id', () => {
    const stamp = getStampDef('table');
    expect(stamp).toBeDefined();
    expect(stamp!.name).toBe('Table');
  });

  it('returns undefined for unknown id', () => {
    expect(getStampDef('nonexistent-stamp-xyz')).toBeUndefined();
  });

  it('custom stamps take priority over built-in', () => {
    const custom: StampDef[] = [
      {
        id: 'table',
        name: 'Custom Table',
        category: 'furniture',
        viewBox: '0 0 100 100',
        svgPath: 'M0 0 L100 100',
      },
    ];
    const result = getStampDef('table', custom);
    expect(result).toBeDefined();
    expect(result!.name).toBe('Custom Table');
  });

  it('falls back to built-in when custom has no match', () => {
    const custom: StampDef[] = [
      {
        id: 'custom-only',
        name: 'Custom Only',
        category: 'furniture',
        viewBox: '0 0 100 100',
        svgPath: 'M0 0',
      },
    ];
    const result = getStampDef('table', custom);
    expect(result).toBeDefined();
    expect(result!.name).toBe('Table');
  });

  it('finds custom-only stamps', () => {
    const custom: StampDef[] = [
      {
        id: 'my-custom',
        name: 'My Custom',
        category: 'custom',
        viewBox: '0 0 100 100',
        svgPath: 'M0 0',
      },
    ];
    const result = getStampDef('my-custom', custom);
    expect(result).toBeDefined();
    expect(result!.name).toBe('My Custom');
  });
});
