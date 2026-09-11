import { describe, expect, it } from 'vitest';
import { assertExportSurface, planExport } from '../exportPlan';
import { withPNGResolution } from '../pngResolution';

describe('bounded export planning', () => {
  it('plans a 128 cell, 300 DPI map without a full-map surface', () => {
    const plan = planExport(128, 128, { dpi: 300, pagePresetId: 'letter' });
    expect(plan).toMatchObject({ mapWidth: 38400, mapHeight: 38400, pageWidth: 2550, pageHeight: 3300,
      margin: 150, overlap: 75, contentWidth: 2250, contentHeight: 3000, stepX: 2175, stepY: 2925,
      columns: 18, rows: 14, pages: 252 });
    expect(() => assertExportSurface(plan.pageWidth, plan.pageHeight)).not.toThrow();
    expect(() => planExport(128, 128, { dpi: 300, pagePresetId: 'none' })).toThrow(/16 megapixel/);
  });
  it('preserves physical grid size and overlap coverage', () => {
    const plan = planExport(20, 16, { dpi: 150, inchesPerCell: 0.5, pagePresetId: 'a4', overlapInches: 0.5 });
    expect(plan.tileSize).toBe(75);
    expect(plan.mapWidth).toBe(1500);
    expect(plan.overlap).toBe(75);
    expect((plan.columns - 1) * plan.stepX + plan.contentWidth).toBeGreaterThanOrEqual(plan.mapWidth);
    expect((plan.rows - 1) * plan.stepY + plan.contentHeight).toBeGreaterThanOrEqual(plan.mapHeight);
    expect(plan.contentWidth - plan.stepX).toBe(plan.overlap);
  });
  it.each([
    { dpi: NaN }, { marginInches: 5 }, { overlapInches: 12 }, { inchesPerCell: 0 },
    { dpi: 1000 }, { pagePresetId: 'unknown' }, { marginInches: -1 },
  ])('rejects invalid options before allocation: %o', options => {
    expect(() => planExport(8, 8, { dpi: 150, pagePresetId: 'letter', ...options })).toThrow();
  });
  it('keeps exact-fit maps to one page and ignores margins for single images', () => {
    expect(planExport(8, 11, { dpi: 100, pagePresetId: 'letter', inchesPerCell: 1, marginInches: 0, overlapInches: 0 }).pages).toBe(1);
    expect(planExport(8, 8, { dpi: 32, pagePresetId: 'none' })).toMatchObject({ pageWidth: 256, pageHeight: 256, pages: 1, margin: 0, overlap: 0 });
  });
  it('writes physical PNG resolution without duplicating pHYs chunks', async () => {
    const png = new Blob([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGZkAAAAASUVORK5CYII='), char => char.charCodeAt(0))]);
    const once = await withPNGResolution(png, 150);
    const twice = await withPNGResolution(once, 300);
    const bytes = new Uint8Array(await twice.arrayBuffer());
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(41)).toBe(11811);
    expect(view.getUint32(45)).toBe(11811);
    expect(bytes[49]).toBe(1);
    expect(twice.size).toBe(png.size + 21);
    await expect(withPNGResolution(new Blob(['broken']), 150)).rejects.toThrow(/invalid PNG/);
  });
});
