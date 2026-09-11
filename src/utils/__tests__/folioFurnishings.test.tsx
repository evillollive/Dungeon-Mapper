import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { FOLIO_FURNISHINGS, getFolioFurnishing, isUnavailableFolioFurnishing, parseBundledFolioSvg } from '../../assets/folio-furnishings-v1/catalog';
import { FOLIO_FURNISHING_MANIFEST } from '../../assets/folio-furnishings-v1/manifest';
import { getStampDef } from '../stampCatalog';
import { clearFolioStampPathCache, drawFolioStampShadow, folioShadowPlacement, folioStampPathCacheSize, folioStampShadowSVG, stampPath, stampPaths } from '../folioFurnishingRender';
import { buildFolioFurnishingReference } from '../folioFurnishingReference';
import { buildFolioReference } from '../folioReference';
import { decodeProject, encodeProject } from '../projectSchema';
import { projectForAudience } from '../audienceProjection';
import { _drawStampShadows_test } from '../lightingAtmosphere';
import { useMapState } from '../../hooks/useMapState';
import StampPicker from '../../components/StampPicker';
import { FLOOR_MATERIAL_IDS, type StampDef } from '../../types/map';
import { folioShapes } from '../../themes/folio-v1/art';
import { floorMaterialShapes } from '../../themes/folio-v1/materials';
import { contrastRatio, parseHexColor } from '../accessibility';

beforeEach(() => {
  clearFolioStampPathCache();
  vi.stubGlobal('Path2D', class {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Folio furnishing kit', () => {
  it('has eight unique, fingerprinted original sources and monochrome companions', () => {
    expect(FOLIO_FURNISHINGS).toHaveLength(8);
    expect(new Set(FOLIO_FURNISHINGS.map(stamp => stamp.id)).size).toBe(8);
    for (const asset of FOLIO_FURNISHING_MANIFEST.assets) {
      const source = readFileSync(asset.source);
      expect(asset.sourceHash).toBe(`sha256:${createHash('sha256').update(source).digest('hex')}`);
      const stamp = getStampDef(asset.id)!;
      expect(parseBundledFolioSvg(source.toString())).toEqual(stamp.paths);
      expect(stamp.viewBox).toBe('0 0 64 64');
      expect(stampPaths(stamp, true)?.every(path =>
        (!path.fill || path.fill === '#ffffff') && path.stroke === '#202820')).toBe(true);
    }
  });

  it('rejects corrupt or executable source markup rather than admitting it as artwork', () => {
    const source = readFileSync(FOLIO_FURNISHINGS[0].sourceFile, 'utf8');
    for (const invalid of [
      source.replace('</svg>', '<script>alert(1)</script></svg>'),
      source.replace('<path ', '<path onclick="alert(1)" '),
      source.replace(FOLIO_FURNISHINGS[0].paths![0].fill!, 'url(https://example.test/a.svg)'),
      source.replace('stroke-width="1.4"', 'stroke-width="NaN"'),
      source.replace('viewBox="0 0 64 64"', 'viewBox="0 0 0 0"'),
    ]) expect(() => parseBundledFolioSvg(invalid)).toThrow();
  });

  it('keeps legacy and custom definitions intact and shows a future-version placeholder', () => {
    expect(getStampDef('table')?.viewBox).toBe('0 0 512 512');
    expect(buildFolioReference().levels[0].stamps?.every(stamp => !stamp.stampId.startsWith('folio-furnishings-'))).toBe(true);
    const override: StampDef = { ...FOLIO_FURNISHINGS[0], name: 'Custom replacement' };
    expect(getStampDef(override.id, [override])).toBe(override);
    expect(getFolioFurnishing(override)).toBeUndefined();
    const id = 'folio-furnishings-v9-table';
    expect(isUnavailableFolioFurnishing(id)).toBe(true);
    expect(getStampDef(id)?.name).toBe('Unavailable Folio furnishing');
    expect(getStampDef('unrelated-missing-id')).toBeUndefined();
    const project = buildFolioFurnishingReference();
    project.levels[0].stamps![0].stampId = id;
    expect(decodeProject(encodeProject(project)).levels[0].stamps![0].stampId).toBe(id);
  });

  it('keeps opaque furnishing outlines distinct from every Folio floor color variant', () => {
    const backgrounds = [
      ...Array.from({ length: 32 }, (_, x) => folioShapes('floor', x, 7, 32)[0]),
      ...FLOOR_MATERIAL_IDS.flatMap(id =>
        Array.from({ length: 32 }, (_, x) => floorMaterialShapes(id, x, 7, 32)![0])),
    ];
    for (const furnishing of FOLIO_FURNISHINGS) {
      const outline = parseHexColor(furnishing.paths![0].stroke!)!;
      for (const background of backgrounds) {
        if (background.kind !== 'rect') throw new Error('Expected a floor background rectangle.');
        expect(contrastRatio(outline, parseHexColor(background.fill)!)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('caches paths independently of object position, rotation, print colors and scale', () => {
    for (let pass = 0; pass < 5; pass++) {
      for (const def of FOLIO_FURNISHINGS) {
        for (const path of stampPaths(def, pass % 2 === 0)!) {
          expect(stampPath(def, path.path)).toBe(stampPath(def, path.path));
        }
      }
    }
    expect(folioStampPathCacheSize()).toBeLessThanOrEqual(64);
    expect(folioStampPathCacheSize()).toBeGreaterThan(40);
  });

  it('keeps shadows southeast in map space through rotation and flips, and suppresses them in print', () => {
    const stamp = buildFolioFurnishingReference().levels[0].stamps![4];
    const def = getStampDef(stamp.stampId)!;
    const initial = folioShadowPlacement(stamp, 32);
    for (const rotation of [0, 45, 90, 180, 270]) {
      expect(folioShadowPlacement({ ...stamp, rotation, flipX: true, flipY: true }, 32)).toEqual(initial);
    }
    expect(initial.x).toBeGreaterThan((stamp.x + 0.5) * 32);
    expect(initial.y).toBeGreaterThan((stamp.y + 0.5) * 32);
    const ctx = document.createElement('canvas').getContext('2d')!;
    const translate = vi.spyOn(ctx, 'translate');
    drawFolioStampShadow(ctx, def, stamp, 32, true);
    expect(translate).not.toHaveBeenCalled();
    drawFolioStampShadow(ctx, def, stamp, 32);
    expect(translate).toHaveBeenNthCalledWith(1, initial.x, initial.y);
    expect(folioStampShadowSVG(def, stamp, 32)).toContain(`translate(${initial.x},${initial.y})`);
  });

  it('does not double-shadow Folio objects when atmosphere is enabled, while respecting custom overrides', () => {
    const stamp = buildFolioFurnishingReference().levels[0].stamps![4];
    const ctx = document.createElement('canvas').getContext('2d')!;
    const gradient = vi.spyOn(ctx, 'createRadialGradient');
    _drawStampShadows_test(ctx, [stamp], 32, 0.4, 0.1);
    expect(gradient).not.toHaveBeenCalled();
    _drawStampShadows_test(ctx, [stamp], 32, 0.4, 0.1, [{ ...getStampDef(stamp.stampId)! }]);
    expect(gradient).toHaveBeenCalledOnce();
  });

  it('round-trips all eight types and excludes private or partly fogged transformed objects', () => {
    const project = decodeProject(encodeProject(buildFolioFurnishingReference()));
    const map = project.levels[0];
    expect(new Set(map.stamps!.map(stamp => stamp.stampId)).size).toBe(8);
    const safe = projectForAudience(map);
    expect(safe.map.stamps).toHaveLength(map.stamps!.length - 1);
    expect(JSON.stringify(safe)).not.toContain('missing ledger');
    const table = map.stamps!.find(stamp => stamp.stampId.endsWith('-table'))!;
    map.stamps = [{ ...table, rotation: 45, flipX: true }];
    map.fog![7][6] = true;
    expect(projectForAudience(map).map.stamps).toHaveLength(0);
  });

  it('uses authored default sizes without overwriting explicit scale or legacy defaults', () => {
    const { result } = renderHook(() => useMapState());
    act(() => { result.current.addStamp('folio-furnishings-v1-bed', 2, 2); });
    act(() => { result.current.addStamp('folio-furnishings-v1-bed', 4, 4, { scale: 0.75 }); });
    act(() => { result.current.addStamp('table', 6, 6); });
    expect(result.current.map.stamps?.map(stamp => stamp.scale)).toEqual([1.75, 0.75, 1]);
    act(() => result.current.undo());
    expect(result.current.map.stamps).toHaveLength(2);
    act(() => result.current.redo());
    expect(result.current.map.stamps).toHaveLength(3);
  });

  it('offers the eight named theme stamps and reports unavailable versions', () => {
    const select = vi.fn();
    const setTool = vi.fn();
    render(<StampPicker activeTool="paint" selectedStampId={null} themeId="dungeon-folio-v1"
      onSelectStamp={select} onSetTool={setTool} onClearStamps={vi.fn()} unavailableFolioFurnishings />);
    fireEvent.click(screen.getByRole('tab', { name: /Show.*Theme stamps/ }));
    expect(screen.getAllByRole('button', { name: /^Folio / })).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: 'Folio bed', exact: true }));
    expect(select).toHaveBeenCalledWith('folio-furnishings-v1-bed');
    expect(setTool).toHaveBeenCalledWith('stamp');
    expect(screen.getByText(/A saved Folio furnishing is unavailable/)).toBeVisible();
  });
});
