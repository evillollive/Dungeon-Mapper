import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_TILE_TYPES } from '../../types/map';
import { getTheme } from '../../themes';
import { clearFolioCache, FOLIO_CACHE_LIMIT, FOLIO_THEME_ID, folioCacheSize, folioShapes, folioShapesSVG, folioVariant } from '../../themes/folio-v1/art';
import { FOLIO_MANIFEST, isUnavailableFolio } from '../../themes/folio-v1/manifest';
import { buildFolioReference, FOLIO_REFERENCE_ID } from '../folioReference';
import { buildPremadeProject, PREMADE_MAP_SUMMARIES } from '../premadeMaps';
import { decodeProject, encodeProject } from '../projectSchema';
import { projectForAudience } from '../audienceProjection';
import { exportMapSVG } from '../export';
import { renderMapToCanvas } from '../renderMap';

describe('Dungeon Folio versioned art slice', () => {
  beforeEach(clearFolioCache);

  it('keeps the old theme and preset references unchanged and round-trips the opt-in version', () => {
    expect(getTheme('dungeon').id).toBe('dungeon');
    expect(getTheme('fantasy')).toBe(getTheme('dungeon'));
    const decoded = decodeProject(encodeProject(buildFolioReference()));
    expect(decoded.levels[0].meta.theme).toBe(FOLIO_THEME_ID);
    expect(decoded.levels[0].artStylePreset).toBe('minimal');
    expect(getTheme(FOLIO_THEME_ID).tileSVG).toBeTypeOf('function');
  });

  it('records original provenance and guards the source fingerprint and compressed kit budget', () => {
    const source = readFileSync('src/themes/folio-v1/art.ts');
    expect(FOLIO_MANIFEST.sourceHash).toBe(`sha256:${createHash('sha256').update(source).digest('hex')}`);
    expect(FOLIO_MANIFEST.license).toBe('AGPL-3.0-or-later');
    expect(FOLIO_MANIFEST.assets).toHaveLength(ALL_TILE_TYPES.length);
    expect(new Set(FOLIO_MANIFEST.assets.map(asset => asset.id)).size).toBe(ALL_TILE_TYPES.length);
    const kit = ['art.ts', 'theme.ts', 'manifest.ts'].map(file => readFileSync(`src/themes/folio-v1/${file}`));
    expect(gzipSync(Buffer.concat(kit)).length).toBeLessThan(2 * 1024 * 1024);
  });

  it('has four coordinate-stable variants and stable output after cache eviction', () => {
    expect(new Set(Array.from({ length: 64 }, (_, x) => folioVariant(x, 7))).size).toBe(4);
    const before = folioShapesSVG(folioShapes('water', 7, 9, 32), 7, 9, 32);
    for (const type of ALL_TILE_TYPES) {
      for (let x = 0; x < 64; x++) {
        folioShapes(type, x, 9, x % 2 ? 32 : 8, { getTileBaseType: (nx, ny) => (nx + ny) % 3 ? 'wall' : 'water' });
      }
    }
    expect(folioCacheSize()).toBeLessThanOrEqual(FOLIO_CACHE_LIMIT);
    expect(folioShapesSVG(folioShapes('water', 7, 9, 32), 7, 9, 32)).toBe(before);
    expect(folioShapes('floor', 7, 9, 32)).toBe(folioShapes('floor', 7, 9, 64));
  });

  it('removes internal wall and water seams without suppressing exposed contours', () => {
    for (const type of ['wall', 'water'] as const) {
      const isolated = folioShapes(type, 0, 0, 8);
      const interior = folioShapes(type, 0, 0, 8, { getTileBaseType: () => type });
      expect(interior).toHaveLength(1);
      expect(isolated.length).toBeGreaterThan(interior.length);
      const eastOnly = folioShapesSVG(folioShapes(type, 0, 0, 8, {
        getTileBaseType: (x, y) => x === 1 && y === 0 ? type : 'floor',
      }), 0, 0, 8);
      expect(eastOnly).not.toContain('30.5,0 30.5,32');
      expect(eastOnly).toContain('1.5,0 1.5,32');
    }
    expect(folioShapes('floor', 0, 0, 8).length).toBeLessThan(folioShapes('floor', 0, 0, 32).length);
  });

  it('uses the same normalized geometry for Canvas and native vector SVG', () => {
    const ctx = document.createElement('canvas').getContext('2d')!;
    const fill = vi.spyOn(ctx, 'fillRect');
    const theme = getTheme(FOLIO_THEME_ID);
    for (const type of ALL_TILE_TYPES) {
      fill.mockClear();
      theme.drawTile(ctx, type, 2, 3, 32);
      expect(fill).toHaveBeenCalledWith(0, 0, 32, 32);
      expect(theme.tileSVG?.(type, 2, 3, 32))
        .toBe(folioShapesSVG(folioShapes(type, 2, 3, 32), 2, 3, 32));
    }
    fill.mockRestore();
  });

  it('offers semantic fallback and detects unavailable pack versions without rewriting their IDs', () => {
    expect(isUnavailableFolio('dungeon-folio-v2')).toBe(true);
    expect(isUnavailableFolio(FOLIO_THEME_ID)).toBe(false);
    expect(getTheme('dungeon-folio-v2')).toBe(getTheme('dungeon'));
    const project = buildFolioReference();
    project.levels[0].meta.theme = 'dungeon-folio-v2';
    expect(decodeProject(encodeProject(project)).levels[0].meta.theme).toBe('dungeon-folio-v2');
  });

  it('opens fresh independent reference copies through the existing sample entry point', () => {
    expect(PREMADE_MAP_SUMMARIES.find(sample => sample.id === FOLIO_REFERENCE_ID)?.sizeLabel).toBe('32 x 32');
    const first = buildPremadeProject(FOLIO_REFERENCE_ID);
    const second = buildPremadeProject(FOLIO_REFERENCE_ID);
    expect(first).toEqual(second);
    expect(first.levels[0].tiles).toHaveLength(32);
    expect(first.levels[0].tiles.every(row => row.length === 32)).toBe(true);
    first.levels[0].tiles[0][0].type = 'water';
    expect(second.levels[0].tiles[0][0].type).toBe('background');
  });

  it('connects the reference rooms to the entry through traversable passages', () => {
    const map = buildFolioReference().levels[0];
    const pending = [[17, 28]];
    const visited = new Set<string>();
    while (pending.length) {
      const [x, y] = pending.pop()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      const type = map.tiles[y]?.[x]?.type;
      if (!type || ['background', 'wall', 'pillar', 'water'].includes(type)) continue;
      visited.add(key);
      pending.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    for (const note of map.notes) expect(visited.has(`${note.x},${note.y}`)).toBe(true);
  });

  it('projects secrets before selecting artwork and preserves public pack identity', async () => {
    const map = buildFolioReference().levels[0];
    const projection = projectForAudience(map);
    expect(projection.map.meta.theme).toBe(FOLIO_THEME_ID);
    expect(projection.map.tiles[13][2].type).toBe('wall');
    expect(projection.map.tiles[15][27].type).toBe('empty');
    expect(JSON.stringify(projection)).not.toContain('Cistern sentinel');
    expect(JSON.stringify(projection)).not.toContain('A key rests');
    const blobs: Blob[] = [];
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL(blob: Blob) { blobs.push(blob); return 'blob:folio-test'; }
      static revokeObjectURL() {}
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      exportMapSVG(map, getTheme(FOLIO_THEME_ID), undefined, { viewMode: 'player' });
      const svg = await blobs[0].text();
      expect(svg).toContain('<polyline');
      expect(svg).not.toContain('Cistern sentinel');
      expect(svg).not.toContain('<image');
      const context = { getTileBaseType: (x: number, y: number) => projection.map.tiles[y]?.[x]?.type === 'wall' ? 'wall' as const : 'floor' as const };
      expect(svg).toContain(getTheme(FOLIO_THEME_ID).tileSVG?.('wall', 2, 13, 32, context));
    } finally {
      click.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it('leaves monochrome printing on the semantic renderer without synthesizing art', () => {
    const map = buildFolioReference().levels[0];
    vi.stubGlobal('Path2D', class {});
    try {
      const canvas = renderMapToCanvas(map, { tileSize: 16, themeId: FOLIO_THEME_ID, printMode: true });
      expect(canvas.width).toBe(512);
      expect(folioCacheSize()).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
