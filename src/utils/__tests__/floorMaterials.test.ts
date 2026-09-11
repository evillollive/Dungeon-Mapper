import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { FLOOR_MATERIAL_IDS, type Tile } from '../../types/map';
import { floorMaterialShapes, floorMaterialCacheSize, clearFloorMaterialCache, FLOOR_MATERIAL_CACHE_LIMIT } from '../../themes/folio-v1/materials';
import { FLOOR_MATERIAL_MANIFEST } from '../../themes/folio-v1/materialManifest';
import { folioTheme } from '../../themes/folio-v1/theme';
import { applyTileUpdates, fillFloorMaterial } from '../tileEditing';
import { buildFolioReference, buildFolioMaterialsReference } from '../folioReference';
import { deriveRenderableTiles } from '../derivedRenderMap';
import { decodeProject, encodeProject } from '../projectSchema';
import { projectForAudience } from '../audienceProjection';
import { computePlayerFOV } from '../dynamicFog';
import { floodFill } from '../mapUtils';
import { createDefaultMap } from '../../hooks/mapStateUtils';
import { renderMapToCanvas } from '../renderMap';
import { exportMapSVG } from '../export';

describe('versioned floor materials', () => {
  beforeEach(clearFloorMaterialCache);

  it('pins the source and gives both surfaces four deterministic variants in a finite cache', () => {
    const source = readFileSync(FLOOR_MATERIAL_MANIFEST.source);
    expect(FLOOR_MATERIAL_MANIFEST.sourceHash).toBe(`sha256:${createHash('sha256').update(source).digest('hex')}`);
    for (const material of FLOOR_MATERIAL_IDS) {
      const variants = new Set();
      for (let x = 0; x < 256; x++) {
        variants.add(JSON.stringify(floorMaterialShapes(material, x, 7, 32)));
        floorMaterialShapes(material, x, 7, 8);
      }
      expect(variants.size).toBe(4);
      expect(floorMaterialShapes(material, 1, 2, 32)).toBe(floorMaterialShapes(material, 1, 2, 64));
      expect(floorMaterialShapes(material, 1, 2, 8)!.length).toBeLessThan(floorMaterialShapes(material, 1, 2, 32)!.length);
    }
    expect(floorMaterialCacheSize()).toBe(FLOOR_MATERIAL_CACHE_LIMIT);
    const before = floorMaterialShapes(FLOOR_MATERIAL_IDS[0], 1, 2, 32);
    clearFloorMaterialCache();
    expect(floorMaterialShapes(FLOOR_MATERIAL_IDS[0], 1, 2, 32)).toEqual(before);
  });

  it('changes only the reference finishes, leaving the approved sample and sight geometry unchanged', () => {
    const original = buildFolioReference().levels[0];
    const finished = buildFolioMaterialsReference().levels[0];
    expect(original.tiles.flat().every(tile => tile.floorMaterial === undefined)).toBe(true);
    expect(finished.tiles.map(row => row.map(tile => tile.type))).toEqual(original.tiles.map(row => row.map(tile => tile.type)));
    expect(computePlayerFOV(finished.tiles, finished.tokens!)).toEqual(computePlayerFOV(original.tiles, original.tokens!));
    const decoded = decodeProject(encodeProject(buildFolioMaterialsReference()));
    expect(decoded.levels[0].tiles[8][4].floorMaterial).toBe('folio-worn-wood-v1');
    expect(decoded.levels[0].tiles[25][4].floorMaterial).toBe('folio-earth-v1');
  });

  it('retains unknown version references but renders ordinary floors and rejects corrupt values', () => {
    const project = buildFolioMaterialsReference();
    project.levels[0].tiles[8][4].floorMaterial = 'folio-worn-wood-v9';
    expect(decodeProject(encodeProject(project)).levels[0].tiles[8][4].floorMaterial).toBe('folio-worn-wood-v9');
    expect(floorMaterialShapes('folio-worn-wood-v9', 4, 8, 32)).toBeUndefined();
    const unknown = { getTileBaseType: () => 'floor' as const, getFloorMaterial: () => 'folio-worn-wood-v9' };
    expect(folioTheme.tileSVG?.('floor', 4, 8, 32, unknown)).toBe(folioTheme.tileSVG?.('floor', 4, 8, 32));
    expect(projectForAudience(project.levels[0]).map.tiles[8][4].floorMaterial).toBeUndefined();
    const invalid = { ...project, levels: [{
      ...project.levels[0],
      tiles: project.levels[0].tiles.map((row, y) => row.map((tile, x) =>
        x === 4 && y === 8 ? { ...tile, floorMaterial: 42 } : tile)),
    }] };
    expect(() => decodeProject(invalid)).toThrow(/floorMaterial/);
  });

  it('paints finishes with structural sharing and removes them on wall/water/erase, not floor symbols', () => {
    const tiles: Tile[][] = [[{ type: 'floor' }, { type: 'floor' }], [{ type: 'wall' }, { type: 'water' }]];
    const wood = applyTileUpdates(tiles, [{ x: 0, y: 0, type: 'floor', floorMaterial: 'folio-worn-wood-v1' }], 2, 2)!;
    expect(wood[1]).toBe(tiles[1]);
    expect(wood[0][1]).toBe(tiles[0][1]);
    expect(applyTileUpdates(wood, [{ x: 0, y: 0, type: 'floor', floorMaterial: 'folio-worn-wood-v1' }], 2, 2)).toBeNull();
    for (const type of ['wall', 'water', 'empty'] as const) {
      expect(applyTileUpdates(wood, [{ x: 0, y: 0, type }], 2, 2)![0][0].floorMaterial).toBeUndefined();
    }
    const trap = applyTileUpdates(wood, [{ x: 0, y: 0, type: 'trap' }], 2, 2)!;
    expect(trap[0][0]).toMatchObject({ type: 'trap', floorMaterial: 'folio-worn-wood-v1' });
    expect(floodFill(wood, 0, 0, 'floor', 'floor', 'folio-earth-v1')[0][1]).toEqual({ type: 'floor' });
  });

  it('finishes a derived room without flattening it, stops at walls and finishes beneath traps', () => {
    const map = createDefaultMap();
    map.roomShapes = [{ id: 1, x: 1, y: 1, width: 6, height: 6, fillTile: 'floor' }];
    const before = deriveRenderableTiles(map);
    const filled = fillFloorMaterial(map.tiles, before, 3, 3, 'folio-earth-v1')!;
    expect(filled.map(row => row.map(tile => tile.type))).toEqual(map.tiles.map(row => row.map(tile => tile.type)));
    const after = deriveRenderableTiles({ ...map, tiles: filled });
    expect(after[3][3]).toMatchObject({ type: 'floor', floorMaterial: 'folio-earth-v1' });
    expect(after[1][1].floorMaterial).toBeUndefined();
    expect(fillFloorMaterial(filled, after, 3, 3, 'folio-earth-v1')).toBeNull();
    const symbols: Tile[][] = [[{ type: 'floor' }, { type: 'trap' }, { type: 'floor' }, { type: 'door-v' }, { type: 'floor' }]];
    const decorated = fillFloorMaterial(symbols, symbols, 0, 0, 'folio-worn-wood-v1')!;
    expect(decorated[0][1]).toMatchObject({ type: 'trap', floorMaterial: 'folio-worn-wood-v1' });
    expect(decorated[0][2].floorMaterial).toBe('folio-worn-wood-v1');
    expect(decorated[0][4].floorMaterial).toBeUndefined();
  });

  it('keeps secret trap substrates indistinguishable from ordinary player floors', () => {
    const map = buildFolioMaterialsReference().levels[0];
    map.tiles[8][4] = { type: 'trap', floorMaterial: 'folio-worn-wood-v1' };
    const safe = projectForAudience(map).map;
    expect(safe.tiles[8][4]).toMatchObject({ type: 'floor', floorMaterial: 'folio-worn-wood-v1' });
    const context = { getTileBaseType: () => 'floor' as const, getFloorMaterial: () => safe.tiles[8][4].floorMaterial };
    expect(folioTheme.tileSVG?.(safe.tiles[8][4].type, 4, 8, 32, context)).toBe(folioTheme.tileSVG?.('floor', 4, 8, 32, context));
    map.fog![8][4] = true;
    expect(projectForAudience(map).map.tiles[8][4]).toEqual({ type: 'empty' });
  });

  it('replaces preserved theme overrides on explicit material fills, including matching finishes', () => {
    for (const floorMaterial of [undefined, 'folio-worn-wood-v1']) {
      const base: Tile[][] = [[{ type: 'floor', theme: 'dungeon', floorMaterial }]];
      const filled = fillFloorMaterial(base, base, 0, 0, 'folio-worn-wood-v1')!;
      expect(filled[0][0]).toEqual({ type: 'floor', floorMaterial: 'folio-worn-wood-v1' });
      expect(base[0][0].theme).toBe('dungeon');
      expect(fillFloorMaterial(filled, filled, 0, 0, 'folio-worn-wood-v1')).toBeNull();
    }
  });

  it('uses finish geometry in PNG/SVG outputs while print keeps semantic fallback', async () => {
    const map = buildFolioMaterialsReference().levels[0];
    vi.stubGlobal('Path2D', class {});
    const blobs: Blob[] = [];
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL(blob: Blob) { blobs.push(blob); return 'blob:floor-test'; }
      static revokeObjectURL() {}
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      renderMapToCanvas(map, { themeId: folioTheme.id, tileSize: 32 });
      expect(floorMaterialCacheSize()).toBeGreaterThan(0);
      exportMapSVG(map, folioTheme, undefined, { viewMode: 'player' });
      const svg = await blobs[0].text();
      const context = { getTileBaseType: () => 'floor' as const, getFloorMaterial: () => 'folio-worn-wood-v1' };
      expect(svg).toContain(folioTheme.tileSVG?.('floor', 4, 8, 32, context));
      expect(svg).not.toContain('Cistern sentinel');
      clearFloorMaterialCache();
      renderMapToCanvas(map, { themeId: folioTheme.id, tileSize: 32, printMode: true });
      expect(floorMaterialCacheSize()).toBe(0);
    } finally {
      click.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
