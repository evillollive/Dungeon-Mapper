import type { CustomThemeDefinition, DungeonMap, DungeonProject, ViewMode } from '../types/map';
import { TOKEN_KIND_COLORS, isDungeonProject } from '../types/map';
import type { TileTheme } from '../themes/index';
import { ICON_BY_ID } from './iconLibrary';
import { renderMapToCanvas } from './renderMap';
import { wrapMapAsProject } from './storage';

const CUSTOM_TILE_SVG_FALLBACK_COLOR = '#777777';

export function exportProjectJSON(project: DungeonProject): void {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/\s+/g, '_') || 'dungeon'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMapJSON(map: DungeonMap): void {
  // For backward-compat, single-level export still uses the project wrapper.
  exportProjectJSON(wrapMapAsProject(map));
}

/**
 * Import a JSON file that may be either a bare `DungeonMap` (legacy) or a
 * `DungeonProject` (multi-level). Returns a `DungeonProject` in both cases.
 */
export function importProjectJSON(file: File): Promise<DungeonProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (isDungeonProject(data)) {
          resolve(data as DungeonProject);
        } else {
          // Legacy bare DungeonMap — wrap it.
          resolve(wrapMapAsProject(data as DungeonMap));
        }
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function importMapJSON(file: File): Promise<DungeonMap> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (isDungeonProject(data)) {
          // Multi-level project — return the active level as a bare map.
          const proj = data as DungeonProject;
          resolve(proj.levels[proj.activeLevelIndex] ?? proj.levels[0]);
        } else {
          resolve(data as DungeonMap);
        }
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function exportMapPNG(canvas: HTMLCanvasElement, name: string, printFriendly = false): void {
  if (printFriendly) {
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    ctx.drawImage(canvas, 0, 0);
    const url = offscreen.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_') || 'dungeon'}.png`;
    a.click();
    return;
  }
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/\s+/g, '_') || 'dungeon'}.png`;
  a.click();
}

/**
 * Render the map to an SVG file. The optional `opts.viewMode` controls
 * whether GM-only content (notes/tokens under fog, GM annotations) is
 * included. In `'player'` mode, fogged cells are painted solid black so
 * the export doubles as a "player handout". Defaults to GM rendering.
 */
export function exportMapSVG(
  map: DungeonMap,
  theme: TileTheme,
  resolveTheme?: (id: string) => TileTheme,
  opts: { viewMode?: ViewMode } = {}
): void {
  const viewMode: ViewMode = opts.viewMode ?? 'gm';
  const isPlayerView = viewMode === 'player';
  const fogActive = (map.fogEnabled ?? false);
  const fog = map.fog;
  const { width, height, tileSize, name } = map.meta;
  const svgW = width * tileSize;
  const svgH = height * tileSize;

  const isFogged = (x: number, y: number) => fogActive && !!fog?.[y]?.[x];

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
  svg += `<rect width="${svgW}" height="${svgH}" fill="${theme.tileColors['empty']}"/>`;

  // Background image layer (behind tiles).
  if (map.backgroundImage) {
    const bg = map.backgroundImage;
    const imgX = bg.offsetX * tileSize;
    const imgY = bg.offsetY * tileSize;
    // Escape the data URL for safe XML embedding (quotes and angle
    // brackets could break the SVG structure).
    const safeHref = escapeXML(bg.dataUrl);
    // Use a group transform so scale applies relative to the image's
    // own origin rather than (0,0), which would shift the position.
    svg += `<g transform="translate(${imgX},${imgY}) scale(${bg.scale})" opacity="${bg.opacity}"><image xlink:href="${safeHref}" x="0" y="0" style="image-rendering:auto"/></g>`;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = map.tiles[y]?.[x];
      if (!tile || tile.type === 'empty') continue;
      // Honor per-tile theme overrides (from "preserve tiles when switching
      // themes") so mixed-style maps export with each tile in its original
      // theme color. Falls back to the map theme when no override / resolver.
      const tileTheme = tile.theme && resolveTheme ? resolveTheme(tile.theme) : theme;
      const fill = tileTheme.tileColors[tile.type] ?? CUSTOM_TILE_SVG_FALLBACK_COLOR;
      svg += `<rect x="${x * tileSize}" y="${y * tileSize}" width="${tileSize}" height="${tileSize}" fill="${fill}" stroke="#2d3561" stroke-width="0.5"/>`;
    }
  }

  svg += `<g stroke="#2d3561" stroke-width="0.5" opacity="0.5">`;
  for (let x = 0; x <= width; x++) svg += `<line x1="${x * tileSize}" y1="0" x2="${x * tileSize}" y2="${svgH}"/>`;
  for (let y = 0; y <= height; y++) svg += `<line x1="0" y1="${y * tileSize}" x2="${svgW}" y2="${y * tileSize}"/>`;
  svg += `</g>`;

  // Notes: hide notes under fog in player exports.
  map.notes.forEach(note => {
    if (isPlayerView && isFogged(note.x, note.y)) return;
    const ncx = note.x * tileSize + tileSize / 2;
    const ncy = note.y * tileSize + tileSize / 2;
    const r = tileSize * 0.38;
    svg += `<circle cx="${ncx}" cy="${ncy}" r="${r}" fill="#f0c040" stroke="#8b6914" stroke-width="1"/>`;
    svg += `<text x="${ncx}" y="${ncy + 1}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.max(8, tileSize * 0.45)}" font-family="monospace" fill="#1a1a2e" font-weight="bold">${note.id}</text>`;
  });

  // Annotations: GM strokes are excluded from player exports.
  for (const stroke of map.annotations ?? []) {
    if (isPlayerView && stroke.kind === 'gm') continue;
    if (stroke.points.length === 0) continue;
    const w = Math.max(1, stroke.width * tileSize);
    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      svg += `<circle cx="${p.x * tileSize}" cy="${p.y * tileSize}" r="${w / 2}" fill="${stroke.color}"/>`;
    } else {
      const d = stroke.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x * tileSize} ${p.y * tileSize}`)
        .join(' ');
      svg += `<path d="${d}" stroke="${stroke.color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    }
  }

  // Shape markers: rendered with transparency like on-screen.
  for (const marker of map.markers ?? []) {
    const mcx = marker.x * tileSize + tileSize / 2;
    const mcy = marker.y * tileSize + tileSize / 2;
    const mr = marker.size * tileSize;
    const sw = Math.max(1, tileSize * 0.08);
    if (marker.shape === 'circle') {
      svg += `<circle cx="${mcx}" cy="${mcy}" r="${mr}" fill="${marker.color}" fill-opacity="0.25" stroke="${marker.color}" stroke-opacity="0.6" stroke-width="${sw}"/>`;
    } else if (marker.shape === 'square') {
      svg += `<rect x="${mcx - mr}" y="${mcy - mr}" width="${mr * 2}" height="${mr * 2}" fill="${marker.color}" fill-opacity="0.25" stroke="${marker.color}" stroke-opacity="0.6" stroke-width="${sw}"/>`;
    } else {
      // diamond
      const dp = `M${mcx} ${mcy - mr} L${mcx + mr} ${mcy} L${mcx} ${mcy + mr} L${mcx - mr} ${mcy} Z`;
      svg += `<path d="${dp}" fill="${marker.color}" fill-opacity="0.25" stroke="${marker.color}" stroke-opacity="0.6" stroke-width="${sw}"/>`;
    }
  }

  // Tokens: hidden under fog in player exports (mirrors on-screen behavior).
  for (const token of map.tokens ?? []) {
    if (isPlayerView && isFogged(token.x, token.y)) continue;
    const sz = Math.max(1, Math.floor(token.size ?? 1));
    const tcx = token.x * tileSize + (tileSize * sz) / 2;
    const tcy = token.y * tileSize + (tileSize * sz) / 2;
    const r = tileSize * sz * 0.42;
    const fill = token.color ?? TOKEN_KIND_COLORS[token.kind];
    svg += `<circle cx="${tcx}" cy="${tcy}" r="${r}" fill="${fill}" stroke="#1a1a2e" stroke-width="${Math.max(1, tileSize * sz * 0.08)}"/>`;
    // If the token has a library icon, render the SVG path; otherwise fall
    // back to a text glyph.
    const iconDef = token.icon ? ICON_BY_ID.get(token.icon) : undefined;
    if (iconDef) {
      const iconSize = r * 1.5;
      const scale = iconSize / 512;
      const ox = tcx - iconSize / 2;
      const oy = tcy - iconSize / 2;
      svg += `<g transform="translate(${ox},${oy}) scale(${scale})"><path d="${iconDef.path}" fill="#ffffff"/></g>`;
    } else {
      const glyph = token.icon ?? (token.label?.[0] ?? token.kind[0] ?? '?').toUpperCase();
      svg += `<text x="${tcx}" y="${tcy + 1}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.max(8, tileSize * sz * 0.5)}" font-family="monospace" fill="#ffffff" font-weight="bold">${escapeXML(glyph)}</text>`;
    }
  }

  // Fog overlay. Player exports paint opaque grey so hidden content is
  // genuinely hidden; GM exports paint a translucent grey wash so the GM
  // still sees the underlying tiles. (GM-side on-screen rendering omits
  // fog entirely by default and only shows it when the GM opts in to the
  // "Show Fog" preview, but exports always include it for GM reference.)
  if (fogActive && fog) {
    const fogFill = isPlayerView ? '#6b7280' : 'rgba(107,114,128,0.55)';
    let fogPath = '';
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (fog[y]?.[x]) {
          fogPath += `M${x * tileSize} ${y * tileSize}h${tileSize}v${tileSize}h${-tileSize}z`;
        }
      }
    }
    if (fogPath) {
      svg += `<path d="${fogPath}" fill="${fogFill}"/>`;
    }
  }

  svg += `</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/\s+/g, '_') || 'dungeon'}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Escape characters that have special meaning inside an SVG/XML text node. */
function escapeXML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── Print-Optimized / High-DPI Export ──────────────────────────────

/**
 * Standard page sizes in inches.  Width and height are the printable
 * area (≈ 0.5″ margin on each side subtracted from the physical sheet).
 */
export interface PagePreset {
  id: string;
  label: string;
  /** Printable width in inches. */
  width: number;
  /** Printable height in inches. */
  height: number;
}

export const PAGE_PRESETS: PagePreset[] = [
  { id: 'none',   label: 'Full Map (no tiling)', width: 0, height: 0 },
  { id: 'letter', label: 'US Letter (7.5 × 10″)', width: 7.5, height: 10 },
  { id: 'a4',     label: 'A4 (7.27 × 10.69″)',    width: 7.27, height: 10.69 },
];

export const DPI_OPTIONS = [72, 150, 300] as const;

export interface HighResExportOptions {
  /** Dots per inch — each tile = 1 inch, so dpi also = tile size in px. */
  dpi: number;
  /** Page preset id.  'none' = single full-map image. */
  pagePresetId: string;
  /** Theme id for rendering. */
  themeId: string;
  /** Use print / B&W mode. */
  printMode: boolean;
  /** View mode (gm / player). */
  viewMode: ViewMode;
  /** Feet per cell for scale bar. 0 = no scale bar. */
  feetPerCell?: number;
  customThemes?: readonly CustomThemeDefinition[];
}

/**
 * Export the map as one or more high-resolution PNGs.
 *
 * When `pagePresetId` is `'none'`, a single PNG covering the whole map is
 * downloaded.  Otherwise the map is sliced into page-sized tiles and each
 * tile is downloaded as a separate file named `<map>_page_R-C.png`.
 */
export async function exportHighResPNG(
  map: DungeonMap,
  opts: HighResExportOptions,
): Promise<void> {
  const tileSize = opts.dpi;            // 1 cell = 1 inch at this dpi
  const fullCanvas = renderMapToCanvas(map, {
    tileSize,
    themeId: opts.themeId,
    printMode: opts.printMode,
    viewMode: opts.viewMode,
    feetPerCell: opts.feetPerCell,
    customThemes: opts.customThemes,
  });

  const baseName = map.meta.name.replace(/\s+/g, '_') || 'dungeon';

  const preset = PAGE_PRESETS.find(p => p.id === opts.pagePresetId) ?? PAGE_PRESETS[0];

  if (preset.id === 'none' || preset.width === 0) {
    // Single full-map download.
    await downloadCanvasAsPNG(fullCanvas, `${baseName}_${opts.dpi}dpi.png`);
    return;
  }

  // Tiled page export.
  const pageW = Math.round(preset.width * opts.dpi);
  const pageH = Math.round(preset.height * opts.dpi);
  const cols = Math.ceil(fullCanvas.width / pageW);
  const rows = Math.ceil(fullCanvas.height / pageH);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = c * pageW;
      const sy = r * pageH;
      const sw = Math.min(pageW, fullCanvas.width - sx);
      const sh = Math.min(pageH, fullCanvas.height - sy);
      const page = document.createElement('canvas');
      page.width = pageW;
      page.height = pageH;
      const pctx = page.getContext('2d')!;
      // Fill with white so partial pages have a clean background (paper is white).
      pctx.fillStyle = '#ffffff';
      pctx.fillRect(0, 0, pageW, pageH);
      pctx.drawImage(fullCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
      const fileName = rows === 1 && cols === 1
        ? `${baseName}_${opts.dpi}dpi.png`
        : `${baseName}_${opts.dpi}dpi_page_${r + 1}-${c + 1}.png`;
      await downloadCanvasAsPNG(page, fileName);
      // Small delay between downloads so the browser doesn't block them.
      if (rows * cols > 1) await new Promise(res => setTimeout(res, 250));
    }
  }
}

/** Convert a canvas to a PNG blob and trigger a download. */
function downloadCanvasAsPNG(canvas: HTMLCanvasElement, fileName: string): Promise<void> {
  return new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { resolve(); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}
