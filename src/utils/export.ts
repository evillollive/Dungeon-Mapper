import type { DungeonMap, ViewMode } from '../types/map';
import { TOKEN_KIND_COLORS } from '../types/map';
import type { TileTheme } from '../themes/index';
import { ICON_BY_ID } from './iconLibrary';

export function exportMapJSON(map: DungeonMap): void {
  const json = JSON.stringify(map, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${map.meta.name.replace(/\s+/g, '_') || 'dungeon'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importMapJSON(file: File): Promise<DungeonMap> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const map = JSON.parse(e.target?.result as string) as DungeonMap;
        resolve(map);
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

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
  svg += `<rect width="${svgW}" height="${svgH}" fill="${theme.tileColors['empty']}"/>`;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = map.tiles[y]?.[x];
      if (!tile || tile.type === 'empty') continue;
      // Honor per-tile theme overrides (from "preserve tiles when switching
      // themes") so mixed-style maps export with each tile in its original
      // theme color. Falls back to the map theme when no override / resolver.
      const tileTheme = tile.theme && resolveTheme ? resolveTheme(tile.theme) : theme;
      const fill = tileTheme.tileColors[tile.type];
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
