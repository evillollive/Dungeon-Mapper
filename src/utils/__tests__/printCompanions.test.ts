import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { ALL_TILE_TYPES, FLOOR_MATERIAL_IDS } from '../../types/map';
import { printTileShapes } from '../../themes/print-companion-v1/art';
import { PRINT_COMPANION_MANIFEST } from '../../themes/print-companion-v1/manifest';
import { drawPrintTile, printTileSVG } from '../../themes/printMode';
import { drawPrintToken } from '../printTokenRender';
import { buildLaunchSample } from '../launchSamples';
import { projectForAudience } from '../audienceProjection';
import { planExport } from '../exportPlan';

describe('ART-08 print companion', () => {
  it('pins original sources and covers every semantic tile and floor material', () => {
    const manifest = PRINT_COMPANION_MANIFEST;
    for (const [source, fingerprint] of [[manifest.source, manifest.sourceHash],
      [manifest.legacyTokens, manifest.legacyTokenSourceHash], [manifest.sampleSource, manifest.sampleSourceHash]]) {
      expect(`sha256:${createHash('sha256').update(readFileSync(source)).digest('hex')}`).toBe(fingerprint);
    }
    expect(manifest.assets).toHaveLength(1 + ALL_TILE_TYPES.length + FLOOR_MATERIAL_IDS.length);
    expect(new Set(manifest.assets.map(asset => asset.id)).size).toBe(manifest.assets.length);
  });

  it('uses only black/white bounded geometry with no font-dependent tile symbols', () => {
    for (const type of ALL_TILE_TYPES) {
      for (const shape of printTileShapes(type, 0, 0)) {
        if (shape.kind === 'line') {
          expect(shape.stroke).toMatch(/^#(000000|ffffff)$/);
          for (const point of shape.points) for (const value of point) {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(32);
          }
        } else {
          expect(shape.fill).toMatch(/^#(000000|ffffff)$/);
        }
      }
    }
    const ctx = document.createElement('canvas').getContext('2d')!;
    const text = vi.spyOn(ctx, 'fillText');
    for (const type of ALL_TILE_TYPES) drawPrintTile(ctx, type, 0, 0, 75);
    expect(text).not.toHaveBeenCalled();
    text.mockRestore();
  });

  it('keeps four exposed contours but removes shared walls, including secret walls', () => {
    const contours = (shapes: ReturnType<typeof printTileShapes>) =>
      shapes.filter(shape => shape.kind === 'line' && shape.width === 2);
    expect(contours(printTileShapes('wall', 0, 0))).toHaveLength(4);
    expect(contours(printTileShapes('wall', 0, 0, { getTileBaseType: () => 'secret-door' }))).toHaveLength(0);
    expect(contours(printTileShapes('wall', 0, 0, {
      getTileBaseType: (x, y) => x === 1 && y === 0 ? 'wall' : 'floor',
    }))).toHaveLength(3);
  });

  it('distinguishes all five surfaces and keeps page-independent material marks', () => {
    const floors = [undefined, ...FLOOR_MATERIAL_IDS].map(material =>
      printTileShapes('floor', 7, 9, { getTileBaseType: () => 'floor', getFloorMaterial: () => material }));
    const materials = [...floors, printTileShapes('water', 7, 9), printTileShapes('background', 7, 9)];
    expect(new Set(materials.map(shapes => JSON.stringify(shapes))).size).toBe(5);
    expect(printTileShapes('floor', 7, 9, {
      getTileBaseType: () => 'floor', getFloorMaterial: () => 'unavailable-v2',
    })).toEqual(floors[0]);
    expect(printTileShapes('floor', 7, 9)).toEqual(printTileShapes('floor', 7, 9));
    expect(printTileSVG('floor', 7, 9, 75, {
      getTileBaseType: () => 'floor', getFloorMaterial: () => FLOOR_MATERIAL_IDS[0],
    })).toContain('translate(525 675) scale(2.34375)');
  });

  it('keeps doors, locks, alarms and stair directions distinct without font-dependent glyphs', () => {
    const types = ['door-h', 'door-v', 'locked-door-h', 'locked-door-v',
      'trapped-door-h', 'trapped-door-v', 'stairs-up', 'stairs-down', 'archway'] as const;
    expect(new Set(types.map(type => JSON.stringify(printTileShapes(type, 0, 0)))).size).toBe(types.length);
  });

  it('overlays vector H/V on plain doors without center lines and keeps only posts behind lock/trap symbols', () => {
    for (const vertical of [false, true]) {
      const point = (x: number, y: number) => vertical ? [y, x] : [x, y];
      const orientation = vertical ? 'v' : 'h';
      const frame = [point(6, 12), point(26, 12), point(26, 20), point(6, 20), point(6, 12)];
      const center = [point(8, 16), point(24, 16)];
      const plain = printTileShapes(`door-${orientation}`, 0, 0);
      expect(plain).toContainEqual({ kind: 'line', points: frame, width: 1.7, stroke: '#000000' });
      expect(plain.some(shape => shape.kind === 'line' && JSON.stringify(shape.points) === JSON.stringify(center))).toBe(false);
      expect(plain).toContainEqual({ kind: 'line', width: 1.8, stroke: '#000000',
        points: vertical ? [[12, 10], [16, 22], [20, 10]] : [[12, 16], [20, 16]] });
      for (const prefix of ['locked', 'trapped'] as const) {
        const special = printTileShapes(`${prefix}-door-${orientation}`, 0, 0);
        expect(special.some(shape => shape.kind === 'line' && JSON.stringify(shape.points) === JSON.stringify(frame))).toBe(false);
        expect(special).toContainEqual({ kind: 'line', points: [point(0, 16), point(6, 16)], width: 4, stroke: '#000000' });
        expect(special).toContainEqual({ kind: 'line', points: [point(26, 16), point(32, 16)], width: 4, stroke: '#000000' });
      }
    }
  });

  it('projects secrets before print geometry and retains trap floor materials', () => {
    const map = buildLaunchSample('launch-lantern-crypt').levels[0];
    const safe = projectForAudience(map).map;
    expect(safe.tiles[10][2].type).toBe('wall');
    expect(safe.tiles[10][1].type).toBe('empty');
    expect(safe.tiles[11][19].type).toBe('floor');
    expect(safe.tokens).toHaveLength(2);
    expect(safe.notes).toHaveLength(2);
    expect(JSON.stringify(safe)).not.toContain('brass key');
    expect(printTileShapes('wall', 2, 10)).not.toEqual(printTileShapes('secret-door', 2, 10));
  });

  it('gives both sides of H the same minimum ink clearance as V', () => {
    const horizontal = printTileShapes('door-h', 0, 0);
    const vertical = printTileShapes('door-v', 0, 0);
    const hMask = horizontal.filter(shape => shape.kind === 'rect').find(shape => shape.w < 32)!;
    const vMask = vertical.filter(shape => shape.kind === 'rect').find(shape => shape.w < 32)!;
    const hGlyph = horizontal.filter(shape => shape.kind === 'line').filter(shape => shape.width === 1.8);
    const vGlyph = vertical.filter(shape => shape.kind === 'line').find(shape => shape.width === 1.8)!;
    const hLeft = Math.min(...hGlyph.flatMap(shape => shape.points.map(([x]) => x))) - hGlyph[0].width / 2;
    const hRight = Math.max(...hGlyph.flatMap(shape => shape.points.map(([x]) => x))) + hGlyph[0].width / 2;
    const vBottom = Math.max(...vGlyph.points.map(([, y]) => y)) + vGlyph.width / 2;
    const vGap = vMask.y + vMask.h - vBottom;
    expect(vGap).toBeCloseTo(1.1);
    expect(hLeft - hMask.x).toBeCloseTo(vGap);
    expect(hMask.x + hMask.w - hRight).toBeCloseTo(vGap);
  });

  it('renders monochrome legacy affiliations and substitutes a label initial for emoji', () => {
    const paths: string[] = [];
    vi.stubGlobal('Path2D', class { constructor(path: string) { paths.push(path); } });
    const ctx = document.createElement('canvas').getContext('2d')!;
    const text = vi.spyOn(ctx, 'fillText');
    try {
      for (const kind of ['player', 'npc', 'monster'] as const) {
        drawPrintToken(ctx, { id: 1, x: 0, y: 0, kind, label: 'Vera', icon: '\u{1f9d9}', color: '#ff0000' }, 75);
      }
      expect(text.mock.calls.every(call => call[0] === 'V')).toBe(true);
      expect(new Set([paths[0], paths[2], paths[4]]).size).toBe(3);
    } finally { text.mockRestore(); vi.unstubAllGlobals(); }
  });

  it.each(['a4', 'letter'])('fits a 24-cell reference on %s at quarter-inch scale and retains inch-grid tiling', pagePresetId => {
    const fit = planExport(24, 24, { dpi: 300, pagePresetId, inchesPerCell: 0.25 });
    expect(fit.pages).toBe(1);
    expect(fit.tileSize).toBe(75);
    const tactical = planExport(24, 24, { dpi: 300, pagePresetId, inchesPerCell: 1 });
    expect(tactical.pages).toBeGreaterThan(1);
    expect(tactical.tileSize).toBe(300);
    expect(tactical.overlap).toBe(75);
  });
});
