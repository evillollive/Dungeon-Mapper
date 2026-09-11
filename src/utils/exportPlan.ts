export const MAX_EXPORT_SIDE = 8192;
export const MAX_EXPORT_PIXELS = 16_000_000;
export const MAX_TEXTURE_SIDE = 1024;

export function assertExportSurface(width: number, height: number): void {
  if (![width, height].every(value => Number.isInteger(value) && value > 0) ||
      width > MAX_EXPORT_SIDE || height > MAX_EXPORT_SIDE || width * height > MAX_EXPORT_PIXELS) {
    throw new Error('This image exceeds the 16 megapixel / 8192 pixel side limit. Choose tiled printing or lower pixels per cell.');
  }
}

export const PAGE_PRESETS = [
  { id: 'none', label: 'Single image', width: 0, height: 0 },
  { id: 'letter', label: 'US Letter (8.5 x 11 in)', width: 8.5, height: 11 },
  { id: 'a4', label: 'A4 (210 x 297 mm)', width: 210 / 25.4, height: 297 / 25.4 },
] as const;
export const DPI_OPTIONS = [72, 150, 300] as const;

export interface ExportPlanOptions {
  dpi: number;
  pagePresetId: string;
  inchesPerCell?: number;
  marginInches?: number;
  overlapInches?: number;
}

export function planExport(width: number, height: number, options: ExportPlanOptions) {
  const { dpi, pagePresetId, inchesPerCell = 1, marginInches = 0.5, overlapInches = 0.25 } = options;
  if (![width, height].every(n => Number.isInteger(n) && n > 0 && n <= 128) ||
      !Number.isFinite(dpi) || dpi < 1 || dpi > 600 ||
      !Number.isFinite(inchesPerCell) || inchesPerCell < 0.1 || inchesPerCell > 2 ||
      !Number.isFinite(marginInches) || marginInches < 0 ||
      !Number.isFinite(overlapInches) || overlapInches < 0) {
    throw new Error('Choose valid dimensions, resolution, physical scale, margins and overlap.');
  }
  const preset = PAGE_PRESETS.find(page => page.id === pagePresetId);
  if (!preset) throw new Error('Choose a supported page size.');
  const tileSize = dpi * inchesPerCell;
  const mapWidth = Math.round(width * tileSize);
  const mapHeight = Math.round(height * tileSize);
  const tiled = preset.id !== 'none';
  const pageWidth = tiled ? Math.round(preset.width * dpi) : mapWidth;
  const pageHeight = tiled ? Math.round(preset.height * dpi) : mapHeight;
  assertExportSurface(pageWidth, pageHeight);
  const margin = tiled ? Math.round(marginInches * dpi) : 0;
  const overlap = tiled ? Math.round(overlapInches * dpi) : 0;
  const contentWidth = pageWidth - 2 * margin;
  const contentHeight = pageHeight - 2 * margin;
  if (contentWidth <= overlap || contentHeight <= overlap) {
    throw new Error('Margins and overlap must leave a positive printable area.');
  }
  const stepX = contentWidth - overlap;
  const stepY = contentHeight - overlap;
  const columns = Math.max(1, Math.ceil((mapWidth - overlap) / stepX));
  const rows = Math.max(1, Math.ceil((mapHeight - overlap) / stepY));
  if (columns * rows > 1024) throw new Error('This plan exceeds 1024 pages. Reduce margins, overlap or grid scale.');
  return { tileSize, mapWidth, mapHeight, pageWidth, pageHeight, margin, overlap,
    contentWidth, contentHeight, stepX, stepY, columns, rows, pages: columns * rows };
}

export type ExportPlan = ReturnType<typeof planExport>;
