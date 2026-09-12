import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { FOLIO_FURNISHINGS, getFolioFurnishing, isUnavailableFolioFurnishing, parseBundledFolioSvg } from '../../assets/folio-furnishings-v1/catalog';
import { FOLIO_FURNISHING_MANIFEST } from '../../assets/folio-furnishings-v1/manifest';
import { getStampDef } from '../stampCatalog';
import { clearFolioStampPathCache, drawFolioStampShadow, FOLIO_STAMP_PATH_CACHE_LIMIT, folioShadowPlacement, folioStampPathCacheSize, folioStampShadowSVG, stampPath, stampPaths } from '../folioFurnishingRender';
import { buildFolioFurnishingReference, buildFolioCatalogReference, FOLIO_CATALOG_REFERENCE_ID } from '../folioFurnishingReference';
import { buildFolioReference } from '../folioReference';
import { buildPremadeProject, PREMADE_MAP_SUMMARIES } from '../premadeMaps';
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
  it('has 24 unique, fingerprinted original sources and monochrome companions', () => {
    expect(FOLIO_FURNISHINGS).toHaveLength(24);
    expect(new Set(FOLIO_FURNISHINGS.map(stamp => stamp.id)).size).toBe(24);
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

  it('keeps the complete vector kit below 8 KiB gzip and the existing path-cache capacity', () => {
    const sources = FOLIO_FURNISHINGS.map(stamp => readFileSync(stamp.sourceFile));
    expect(gzipSync(Buffer.concat(sources)).byteLength).toBeLessThan(8 * 1024);
    expect(FOLIO_FURNISHINGS.reduce((count, stamp) => count + stamp.paths!.length, 0))
      .toBeLessThanOrEqual(FOLIO_STAMP_PATH_CACHE_LIMIT);
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
    const compiled = FOLIO_FURNISHINGS.flatMap(def =>
      def.paths!.map(path => ({ def, path: path.path, compiled: stampPath(def, path.path) })));
    for (let pass = 0; pass < 5; pass++) {
      for (const entry of compiled) {
        expect(stampPath(entry.def, entry.path)).toBe(entry.compiled);
        for (const path of stampPaths(entry.def, pass % 2 === 0)!) stampPath(entry.def, path.path);
        stampPath(entry.def, entry.def.shadowPath);
      }
    }
    expect(folioStampPathCacheSize()).toBe(new Set(compiled.map(entry => entry.compiled)).size);
    expect(folioStampPathCacheSize()).toBeLessThanOrEqual(FOLIO_STAMP_PATH_CACHE_LIMIT);
  });

  it('evicts paths at the existing 128-entry ceiling', () => {
    const def = FOLIO_FURNISHINGS[0];
    const first = stampPath(def, 'M0 0H1');
    for (let i = 1; i <= FOLIO_STAMP_PATH_CACHE_LIMIT; i++) stampPath(def, `M${i} 0H1`);
    expect(folioStampPathCacheSize()).toBe(FOLIO_STAMP_PATH_CACHE_LIMIT);
    expect(stampPath(def, 'M0 0H1')).not.toBe(first);
    clearFolioStampPathCache();
    expect(folioStampPathCacheSize()).toBe(0);
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

  it('preserves the eight-piece reference and excludes private or partly fogged transformed objects', () => {
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

  it('offers a fresh, round-trippable 24-piece reference without changing the approved sample', () => {
    expect(PREMADE_MAP_SUMMARIES.find(sample => sample.id === FOLIO_CATALOG_REFERENCE_ID)?.sizeLabel).toBe('24 x 24');
    expect(FOLIO_FURNISHING_MANIFEST.previewSampleId).toBe(FOLIO_CATALOG_REFERENCE_ID);
    const project = buildPremadeProject(FOLIO_CATALOG_REFERENCE_ID);
    expect(decodeProject(encodeProject(project))).toMatchObject(project);
    const map = project.levels[0];
    expect(new Set(map.stamps!.map(stamp => stamp.stampId)))
      .toEqual(new Set(FOLIO_FURNISHINGS.map(def => def.id)));
    expect(map.stamps).toHaveLength(34);
    expect(map.lightSources).toEqual([]);
    expect(map.wallSegments).toEqual([]);
    expect(projectForAudience(map).map.stamps).toHaveLength(33);
    expect(JSON.stringify(projectForAudience(map))).not.toContain('sealed route ledger');
    map.stamps![0].x = 99;
    expect(buildFolioCatalogReference().levels[0].stamps![0].x).toBe(3.7);
    expect(buildFolioFurnishingReference().levels[0].stamps).toHaveLength(16);
  });

  it('preserves placement, transforms and hidden state for every catalog asset', async () => {
    const { result } = renderHook(() => useMapState());
    const originalTiles = result.current.map.tiles;
    for (const def of FOLIO_FURNISHINGS) {
      await act(async () => { result.current.addStamp(def.id, 4, 4, {
        rotation: 45, flipX: true, flipY: true, opacity: 0.65,
      }); });
      const id = result.current.map.stamps!.at(-1)!.id;
      await act(async () => { result.current.updateStamp(id, { hidden: true }); });
    }
    expect(result.current.map.tiles).toBe(originalTiles);
    expect(result.current.map.stamps?.map(stamp => stamp.scale)).toEqual(FOLIO_FURNISHINGS.map(def => def.defaultScale));
    const project = buildFolioCatalogReference();
    project.levels[0].stamps = result.current.map.stamps;
    expect(decodeProject(encodeProject(project)).levels[0].stamps).toEqual(result.current.map.stamps);
    expect(projectForAudience(project.levels[0]).map.stamps).toEqual([]);
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

  it('offers all 24 named theme stamps and reports unavailable versions', () => {
    const select = vi.fn();
    const setTool = vi.fn();
    render(<StampPicker activeTool="paint" selectedStampId={null} themeId="dungeon-folio-v1"
      onSelectStamp={select} onSetTool={setTool} onClearStamps={vi.fn()} unavailableFolioFurnishings />);
    fireEvent.click(screen.getByRole('tab', { name: /Show.*Theme stamps/ }));
    expect(screen.getAllByRole('button', { name: /^Folio / })).toHaveLength(24);
    fireEvent.click(screen.getByRole('button', { name: 'Folio bed', exact: true }));
    expect(select).toHaveBeenCalledWith('folio-furnishings-v1-bed');
    expect(setTool).toHaveBeenCalledWith('stamp');
    expect(screen.getByText(/A saved Folio furnishing is unavailable/)).toBeVisible();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search stamps' }), { target: { value: 'tent' } });
    expect(screen.getAllByRole('button', { name: /^Folio / })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Folio tent', exact: true }));
    expect(select).toHaveBeenLastCalledWith('folio-furnishings-v1-tent');
  });

  it('filters new nature and structure assets without leaking them into other themes', () => {
    const props = { activeTool: 'paint' as const, selectedStampId: null, themeId: 'dungeon-folio-v1',
      onSelectStamp: vi.fn(), onSetTool: vi.fn(), onClearStamps: vi.fn() };
    const { rerender } = render(<StampPicker {...props} />);
    fireEvent.click(screen.getByRole('tab', { name: /Show.*Nature stamps/ }));
    expect(screen.getAllByRole('button', { name: /^Folio / }).map(button => button.textContent))
      .toEqual(['Folio boulder', 'Folio fern', 'Folio shrub']);
    fireEvent.click(screen.getByRole('tab', { name: /Show.*Structures stamps/ }));
    expect(screen.getAllByRole('button', { name: /^Folio / })).toHaveLength(1);
    rerender(<StampPicker {...props} themeId="dungeon" />);
    expect(screen.queryByRole('button', { name: /^Folio / })).not.toBeInTheDocument();
  });
});
