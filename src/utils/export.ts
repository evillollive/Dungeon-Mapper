import type { CustomThemeDefinition, DungeonMap, DungeonProject, StampDef, ViewMode } from '../types/map';
import { TOKEN_KIND_COLORS } from '../types/map';
import type { TileTheme } from '../themes/index';
import { getPaperTint } from '../themes/index';
import { ICON_BY_ID } from './iconLibrary';
import { getStampDef } from './stampCatalog';
import { folioStampShadowSVG } from './folioFurnishingRender';
import { getFolioFurnishing } from '../assets/folio-furnishings-v1/catalog';
import { renderMapToCanvas, renderPlayerProjection } from './renderMap';
import { generatePaperTexture } from './paperTexture';
import { drawEdgeBlending } from './edgeBlend';
import { drawHandDrawn } from './handDrawn';
import { drawLightingAtmosphere } from './lightingAtmosphere';
import { decodeProject, encodeProject } from './projectSchema';
import { isTokenFogged } from './tokenVisibility';
import { deriveRenderableTiles } from './derivedRenderMap';
import { getRiverBankColor, getRiverEndpointMarker } from './riverPolish';
import { projectForAudience } from './audienceProjection';
import { findCustomTile, getSemanticTileType, getThemeWithCustom } from './customThemes';
import { assertExportSurface, planExport, MAX_TEXTURE_SIDE, type ExportPlanOptions } from './exportPlan';
import { withPNGResolution } from './pngResolution';
import { loadExportAssets } from './exportAssets';
export { PAGE_PRESETS, DPI_OPTIONS } from './exportPlan';

const SVG_CUSTOM_TILE_FALLBACK_COLOR = '#777777';

export function exportProjectJSON(project: DungeonProject): void {
  const json = JSON.stringify(encodeProject(project), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/\s+/g, '_') || 'dungeon'}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Import a versioned envelope, an unversioned project, or a legacy bare map.
 */
export function importProjectJSON(file: File): Promise<DungeonProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(decodeProject(data));
      } catch (error) {
        reject(error instanceof SyntaxError
          ? new Error('Invalid JSON file. Choose a Dungeon Mapper JSON backup.')
          : error instanceof Error ? error : new Error('Could not import this project.'));
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
export function buildMapSVG(
  map: DungeonMap,
  theme: TileTheme,
  resolveTheme?: (id: string) => TileTheme,
  opts: { viewMode?: ViewMode; customThemes?: readonly CustomThemeDefinition[]; customStamps?: readonly StampDef[]; includeTexture?: boolean; includeEdgeBlend?: boolean; includeHandDrawn?: boolean; includeLighting?: boolean; images?: ReadonlyMap<string, HTMLImageElement> } = {}
): string {
  const viewMode: ViewMode = opts.viewMode ?? 'gm';
  if (viewMode === 'player') {
    const projection = projectForAudience(map, opts.customThemes, opts.customStamps);
    map = projection.map;
    theme = getThemeWithCustom(map.meta.theme ?? theme.id, projection.customThemes);
    resolveTheme = id => getThemeWithCustom(id, projection.customThemes);
    opts = { ...opts, customThemes: projection.customThemes, customStamps: projection.customStamps };
  }
  const includeTexture = opts.includeTexture ?? true;
  const includeEdgeBlend = opts.includeEdgeBlend ?? true;
  const includeHandDrawn = opts.includeHandDrawn ?? true;
  const includeLighting = opts.includeLighting ?? true;
  const isPlayerView = viewMode === 'player';
  const fogActive = (map.fogEnabled ?? false);
  const fog = map.fog;
  const dynamicFogActive = (map.dynamicFogEnabled ?? false) && fogActive;
  const { width, height, tileSize } = map.meta;
  const tiles = deriveRenderableTiles(map);
  const tileDrawContext = {
    getFloorMaterial: (x: number, y: number) => tiles[y]?.[x]?.floorMaterial,
    getTileBaseType: (x: number, y: number) => {
      const type = tiles[y]?.[x]?.type;
      return type ? getSemanticTileType(type, opts.customThemes) : undefined;
    },
  };
  const svgW = width * tileSize;
  const svgH = height * tileSize;
  assertExportSurface(svgW, svgH);

  const isFogged = (x: number, y: number) => fogActive && !!fog?.[y]?.[x];
  const isExplored = (x: number, y: number) => dynamicFogActive && !!map.explored?.[y]?.[x];

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
  svg += `<rect width="${svgW}" height="${svgH}" fill="${theme.tileColors['empty']}"/>`;

  // Background image layer (behind tiles).
  if (map.backgroundImage && (!opts.images || opts.images.has(map.backgroundImage.dataUrl)) &&
      /^data:image\/(?:png|jpe?g|webp|svg\+xml);base64,[a-z0-9+/]+=*$/i.test(map.backgroundImage.dataUrl)) {
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

  // Paper texture layer (behind tiles, after background image).
  if (includeTexture && map.paperTexture?.enabled) {
    const tint = map.paperTexture.tintOverride ?? getPaperTint(theme.id);
    const scale = Math.min(1, MAX_TEXTURE_SIDE / Math.max(svgW, svgH));
    const texCanvas = generatePaperTexture(Math.max(1, Math.round(svgW * scale)),
      Math.max(1, Math.round(svgH * scale)), map.paperTexture, tint);
    const texDataUrl = texCanvas.toDataURL('image/png');
    svg += `<image xlink:href="${escapeXML(texDataUrl)}" x="0" y="0" width="${svgW}" height="${svgH}" opacity="${map.paperTexture.opacity}"/>`;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = tiles[y]?.[x];
      if (!tile || tile.type === 'empty') continue;
      // Honor per-tile theme overrides (from "preserve tiles when switching
      // themes") so mixed-style maps export with each tile in its original
      // theme. Resolve built-in/custom overrides even without a caller resolver.
      const tileTheme = tile.theme
        ? (resolveTheme?.(tile.theme) ?? getThemeWithCustom(tile.theme, opts.customThemes)) : theme;
      const art = tileTheme.tileSVG?.(tile.type, x, y, tileSize, tileDrawContext);
      if (art !== undefined) {
        svg += art;
        continue;
      }
      const fill = sanitizeColor(tileTheme.tileColors[tile.type], SVG_CUSTOM_TILE_FALLBACK_COLOR);
      svg += `<rect x="${x * tileSize}" y="${y * tileSize}" width="${tileSize}" height="${tileSize}" fill="${fill}" stroke="#2d3561" stroke-width="0.5"/>`;
      const imageUrl = findCustomTile(tile.type, opts.customThemes)?.imageDataUrl;
      const href = imageUrl && (!opts.images || opts.images.has(imageUrl)) && sanitizeImageDataUrl(imageUrl);
      if (href) svg += `<image href="${href}" x="${x * tileSize}" y="${y * tileSize}" width="${tileSize}" height="${tileSize}"/>`;
    }
  }

  // River bank polish: theme-tinted insets on land tiles adjacent to river water.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = tiles[y]?.[x];
      if (!tile?.riverBank) continue;
      const inset = Math.max(1, tileSize * 0.14);
      const fill = sanitizeColor(getRiverBankColor(theme.id, tile.riverBank, tile.riverBankType), '#777777');
      svg += `<rect x="${x * tileSize + inset}" y="${y * tileSize + inset}" width="${tileSize - inset * 2}" height="${tileSize - inset * 2}" fill="${fill}" fill-opacity="0.55"/>`;
    }
  }

  // Edge blending layer — rasterized to an offscreen canvas and embedded
  // as an image, same approach as the paper texture.
  if (includeEdgeBlend && map.edgeBlend?.enabled) {
    const ebCanvas = document.createElement('canvas');
    ebCanvas.width = svgW;
    ebCanvas.height = svgH;
    const ebCtx = ebCanvas.getContext('2d')!;
    drawEdgeBlending(ebCtx, tiles, width, height, tileSize, map.edgeBlend, theme, []);
    const ebDataUrl = ebCanvas.toDataURL('image/png');
    svg += `<image xlink:href="${escapeXML(ebDataUrl)}" x="0" y="0" width="${svgW}" height="${svgH}"/>`;
  }

  svg += theme.tileSVG
    ? `<g stroke="${theme.gridColor}" stroke-width="${Math.max(0.5, tileSize * 0.02)}">`
    : '<g stroke="#2d3561" stroke-width="0.5" opacity="0.5">';
  for (let x = 0; x <= width; x++) svg += `<line x1="${x * tileSize}" y1="0" x2="${x * tileSize}" y2="${svgH}"/>`;
  for (let y = 0; y <= height; y++) svg += `<line x1="0" y1="${y * tileSize}" x2="${svgW}" y2="${y * tileSize}"/>`;
  svg += `</g>`;

  // Hand-drawn mode — rasterized to an offscreen canvas and embedded as
  // an image, same approach as edge blending.
  if (includeHandDrawn && map.handDrawn?.enabled) {
    const hdCanvas = document.createElement('canvas');
    hdCanvas.width = svgW;
    hdCanvas.height = svgH;
    const hdCtx = hdCanvas.getContext('2d')!;
    drawHandDrawn(hdCtx, tiles, width, height, tileSize, map.handDrawn, false, []);
    const hdDataUrl = hdCanvas.toDataURL('image/png');
    svg += `<image xlink:href="${escapeXML(hdDataUrl)}" x="0" y="0" width="${svgW}" height="${svgH}"/>`;
  }

  // Lighting & atmosphere — rasterized to an offscreen canvas and embedded
  // as an image, same approach as hand-drawn.
  if (includeLighting && map.lightingAtmosphere?.enabled) {
    const laCanvas = document.createElement('canvas');
    laCanvas.width = svgW;
    laCanvas.height = svgH;
    const laCtx = laCanvas.getContext('2d')!;
    drawLightingAtmosphere(laCtx, tiles, width, height, tileSize, map.lightingAtmosphere, map.stamps ?? [], opts.customThemes ?? [], opts.customStamps);
    const laDataUrl = laCanvas.toDataURL('image/png');
    svg += `<image xlink:href="${escapeXML(laDataUrl)}" x="0" y="0" width="${svgW}" height="${svgH}"/>`;
  }

  // Notes: hide notes under fog in player exports.
  map.notes.forEach(note => {
    if (isPlayerView && isFogged(note.x, note.y) && !isExplored(note.x, note.y)) return;
    const ncx = note.x * tileSize + tileSize / 2;
    const ncy = note.y * tileSize + tileSize / 2;
    const r = tileSize * 0.38;
    svg += `<circle cx="${ncx}" cy="${ncy}" r="${r}" fill="#f0c040" stroke="#8b6914" stroke-width="1"/>`;
    svg += `<text x="${ncx}" y="${ncy + 1}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.max(8, tileSize * 0.45)}" font-family="monospace" fill="#1a1a2e" font-weight="bold">${note.id}</text>`;
  });

  // Wall segments: rendered as solid polylines along grid edges.
  for (const seg of map.wallSegments ?? []) {
    if (seg.points.length === 0) continue;
    const w = Math.max(1, seg.thickness * tileSize);
    if (seg.points.length === 1) {
      const p = seg.points[0];
      svg += `<circle cx="${p.x * tileSize}" cy="${p.y * tileSize}" r="${w / 2}" fill="${sanitizeColor(seg.color, '#000000')}"/>`;
    } else {
      const d = seg.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x * tileSize} ${p.y * tileSize}`)
        .join(' ');
      svg += `<path d="${escapeXML(d)}" stroke="${sanitizeColor(seg.color, '#000000')}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    }
  }

  // Path segments: rendered as semi-transparent polylines for roads/paths.
  for (const seg of map.pathSegments ?? []) {
    if (seg.points.length === 0) continue;
    const w = Math.max(1, seg.width * tileSize);
    if (seg.points.length === 1) {
      const p = seg.points[0];
      svg += `<circle cx="${p.x * tileSize}" cy="${p.y * tileSize}" r="${w / 2}" fill="${sanitizeColor(seg.color, '#000000')}" fill-opacity="0.7"/>`;
    } else {
      const d = seg.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x * tileSize} ${p.y * tileSize}`)
        .join(' ');
      svg += `<path d="${escapeXML(d)}" stroke="${sanitizeColor(seg.color, '#000000')}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-opacity="0.7"/>`;
    }
  }

  // Rivers: flowing vector water paths over the rasterized water tiles.
  for (const river of map.rivers ?? []) {
    if (river.controlPoints.length === 0) continue;
    const w = Math.max(1, river.width * tileSize);
    const color = sanitizeColor(river.color, '#2563eb');
    if (river.controlPoints.length === 1) {
      const p = river.controlPoints[0];
      svg += `<circle cx="${p.x * tileSize}" cy="${p.y * tileSize}" r="${w / 2}" fill="${color}" fill-opacity="0.72"/>`;
    } else {
      const d = river.controlPoints
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x * tileSize} ${p.y * tileSize}`)
        .join(' ');
      svg += `<path d="${escapeXML(d)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-opacity="0.72"/>`;
    }
    const endpoints = [
      { point: river.controlPoints[0], marker: getRiverEndpointMarker(river, 'source'), source: true },
      { point: river.controlPoints[river.controlPoints.length - 1], marker: getRiverEndpointMarker(river, 'mouth'), source: false },
    ];
    for (const endpoint of endpoints) {
      const r = Math.max(4, tileSize * 0.22);
      const cx = endpoint.point.x * tileSize;
      const cy = endpoint.point.y * tileSize;
      const fill = endpoint.source ? '#ecfeff' : '#dbeafe';
      const stroke = endpoint.source ? '#0891b2' : '#1d4ed8';
      const label = endpoint.marker === 'lava-vent' ? 'V'
        : endpoint.marker === 'waterfall' ? 'W'
        : endpoint.marker === 'cave' ? 'C'
        : endpoint.marker === 'delta' ? 'M'
        : endpoint.marker === 'outflow' ? 'O'
        : 'S';
      if (endpoint.source) {
        svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${Math.max(1, tileSize * 0.06)}"/>`;
      } else {
        svg += `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="${fill}" stroke="${stroke}" stroke-width="${Math.max(1, tileSize * 0.06)}"/>`;
      }
      svg += `<text x="${cx}" y="${cy + 1}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.max(7, tileSize * 0.28)}" font-family="monospace" fill="#0f172a" font-weight="bold">${label}</text>`;
    }
  }

  // Annotations: GM strokes are excluded from player exports.
  for (const stroke of map.annotations ?? []) {
    if (isPlayerView && stroke.kind === 'gm') continue;
    if (stroke.points.length === 0) continue;
    const w = Math.max(1, stroke.width * tileSize);
    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      svg += `<circle cx="${p.x * tileSize}" cy="${p.y * tileSize}" r="${w / 2}" fill="${sanitizeColor(stroke.color, '#000000')}"/>`;
    } else {
      const d = stroke.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x * tileSize} ${p.y * tileSize}`)
        .join(' ');
      // GM strokes use a dashed pattern to visually distinguish them.
      const dashAttr = stroke.kind === 'gm'
        ? ` stroke-dasharray="${Math.max(4, w * 2.5)} ${Math.max(4, w * 2.5) * 0.6}"`
        : '';
      svg += `<path d="${escapeXML(d)}" stroke="${sanitizeColor(stroke.color, '#000000')}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"${dashAttr}/>`;
    }
  }

  // Shape markers: rendered with transparency like on-screen.
  for (const marker of map.markers ?? []) {
    const mcx = marker.x * tileSize + tileSize / 2;
    const mcy = marker.y * tileSize + tileSize / 2;
    const mr = marker.size * tileSize;
    const sw = Math.max(1, tileSize * 0.08);
    if (marker.shape === 'circle') {
      svg += `<circle cx="${mcx}" cy="${mcy}" r="${mr}" fill="${sanitizeColor(marker.color, '#000000')}" fill-opacity="0.25" stroke="${sanitizeColor(marker.color, '#000000')}" stroke-opacity="0.6" stroke-width="${sw}"/>`;
    } else if (marker.shape === 'square') {
      svg += `<rect x="${mcx - mr}" y="${mcy - mr}" width="${mr * 2}" height="${mr * 2}" fill="${sanitizeColor(marker.color, '#000000')}" fill-opacity="0.25" stroke="${sanitizeColor(marker.color, '#000000')}" stroke-opacity="0.6" stroke-width="${sw}"/>`;
    } else {
      // diamond
      const dp = `M${mcx} ${mcy - mr} L${mcx + mr} ${mcy} L${mcx} ${mcy + mr} L${mcx - mr} ${mcy} Z`;
      svg += `<path d="${escapeXML(dp)}" fill="${sanitizeColor(marker.color, '#000000')}" fill-opacity="0.25" stroke="${sanitizeColor(marker.color, '#000000')}" stroke-opacity="0.6" stroke-width="${sw}"/>`;
    }
  }

  // Stamps: rendered as SVG paths with transforms.
  for (const stamp of map.stamps ?? []) {
    const def = getStampDef(stamp.stampId, opts.customStamps ?? []);
    if (!def) {
      svg += `<rect x="${stamp.x * tileSize}" y="${stamp.y * tileSize}" width="${tileSize}" height="${tileSize}" fill="none" stroke="#777777"/>`;
      continue;
    }
    svg += folioStampShadowSVG(def, stamp, tileSize);
    const cx = (stamp.x + 0.5) * tileSize;
    const cy = (stamp.y + 0.5) * tileSize;
    const scale = stamp.scale || 1;
    const drawSize = tileSize * scale;
    const vb = def.viewBox.split(/\s+/).map(Number);
    const vbW = vb[2] || 512;
    const vbH = vb[3] || 512;
    const svgScale = drawSize / Math.max(vbW, vbH);
    const transforms: string[] = [];
    transforms.push(`translate(${cx},${cy})`);
    if (stamp.rotation) transforms.push(`rotate(${stamp.rotation})`);
    if (stamp.flipX) transforms.push(`scale(-1,1)`);
    if (stamp.flipY) transforms.push(`scale(1,-1)`);
    transforms.push(`translate(${-drawSize / 2},${-drawSize / 2})`);
    transforms.push(`scale(${svgScale})`);
    const opacity = (stamp.opacity ?? 1) < 1 ? ` opacity="${stamp.opacity}"` : '';
    const transformAttr = escapeXML(transforms.join(' '));
    if (def.imageDataUrl) {
      const href = (!opts.images || opts.images.has(def.imageDataUrl)) && sanitizeImageDataUrl(def.imageDataUrl);
      svg += href ? `<g transform="${transformAttr}"${opacity}><image href="${href}" width="${vbW}" height="${vbH}"/></g>`
        : `<g transform="${transformAttr}"${opacity}><rect width="${vbW}" height="${vbH}" fill="none" stroke="#777777" stroke-width="${2 / svgScale}"/></g>`;
    } else if (def.paths && def.paths.length > 0) {
      // Match Canvas opacity for each fill/stroke operation, including their overlap.
      const folio = getFolioFurnishing(def);
      svg += `<g transform="${transformAttr}"${folio ? '' : opacity}>`;
      for (const p of def.paths) {
        const fill = p.fill ? ` fill="${sanitizeColor(p.fill, '#4a4a4a')}"` : ' fill="none"';
        const stroke = p.stroke ? ` stroke="${sanitizeColor(p.stroke, '#1a1a1a')}" stroke-width="${p.strokeWidth ?? 1}"` : '';
        if (folio) {
          if (p.fill) svg += `<path d="${escapeXML(p.path)}"${fill}${opacity}/>`;
          if (p.stroke) svg += `<path d="${escapeXML(p.path)}" fill="none"${stroke}${opacity}/>`;
        } else {
          svg += `<path d="${escapeXML(p.path)}"${fill}${stroke}/>`;
        }
      }
      svg += `</g>`;
    } else if (def.svgPath) {
      svg += `<g transform="${transformAttr}"${opacity}><path d="${escapeXML(def.svgPath)}" fill="#4a4a4a" stroke="#1a1a1a" stroke-width="${Math.max(1, 2 / svgScale)}"/></g>`;
    }
  }

  // Tokens: hidden under fog in player exports (mirrors on-screen behavior).
  for (const token of map.tokens ?? []) {
    if (isPlayerView && isTokenFogged(token, fog, dynamicFogActive ? new Set<string>() : undefined, map.explored)) continue;
    const sz = Math.max(1, Math.floor(token.size ?? 1));
    const tcx = token.x * tileSize + (tileSize * sz) / 2;
    const tcy = token.y * tileSize + (tileSize * sz) / 2;
    const r = tileSize * sz * 0.42;
    const fill = sanitizeColor(token.color, TOKEN_KIND_COLORS[token.kind]);
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
    if (dynamicFogActive && map.explored) {
      const exploredFill = isPlayerView ? 'rgba(107,114,128,0.55)' : 'rgba(107,114,128,0.35)';
      let exploredPath = '';
      let hiddenPath = '';
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!fog[y]?.[x]) continue;
          const cellPath = `M${x * tileSize} ${y * tileSize}h${tileSize}v${tileSize}h${-tileSize}z`;
          if (map.explored[y]?.[x]) exploredPath += cellPath;
          else hiddenPath += cellPath;
        }
      }
      if (exploredPath) svg += `<path d="${exploredPath}" fill="${exploredFill}"/>`;
      if (hiddenPath) svg += `<path d="${hiddenPath}" fill="${fogFill}"/>`;
    } else {
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
  }

  svg += `</svg>`;

  return svg;
}

export function exportMapSVG(...args: Parameters<typeof buildMapSVG>): void {
  const svg = buildMapSVG(...args);
  const [map, , , opts] = args;
  const name = opts?.viewMode === 'player' ? map.meta.publicName?.trim() || 'Player map' : map.meta.name;
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${name.replace(/\s+/g, '_') || 'dungeon'}.svg`);
}

export function downloadBlob(blob: Blob, fileName: string, lifetime = 60_000): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), lifetime);
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

function sanitizeColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) return trimmed;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(trimmed)) {
    return escapeXML(trimmed);
  }
  return fallback;
}

function sanitizeImageDataUrl(value: string): string | null {
  const trimmed = value.trim();
  // Match the custom stamp upload limit so imported/exported SVGs cannot
  // embed unexpectedly large image payloads.
  if (trimmed.length > 2 * 1024 * 1024) return null;
  const match = /^data:image\/(?:png|jpe?g|webp|svg\+xml);base64,([a-z0-9+/]+={0,2})$/i.exec(trimmed);
  if (!match) return null;
  const base64 = match[1];
  if (base64.length % 4 !== 0) return null;
  if (!/^[A-Za-z0-9+/]*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) return null;
  try {
    atob(base64);
  } catch {
    return null;
  }
  return escapeXML(trimmed);
}

// ── Print-Optimized / High-DPI Export ──────────────────────────────

/**
 * Standard page sizes in inches.  Width and height are the printable
 * area (≈ 0.5″ margin on each side subtracted from the physical sheet).
 */
export interface HighResExportOptions extends ExportPlanOptions {
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
  customStamps?: readonly StampDef[];
  /** Whether to include paper texture in export. Defaults to true. */
  includeTexture?: boolean;
  /** Whether to include edge blending in export. Defaults to true. */
  includeEdgeBlend?: boolean;
  /** Whether to include lighting & atmosphere in export. Defaults to true. */
  includeLighting?: boolean;
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
  onWarnings?: (warnings: string[]) => void;
  /** Zero-based page selection. Omit to download every page. */
  pageIndex?: number;
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
  const plan = planExport(map.meta.width, map.meta.height, opts);
  if (opts.pageIndex !== undefined && (!Number.isInteger(opts.pageIndex) || opts.pageIndex < 0 || opts.pageIndex >= plan.pages)) {
    throw new Error('Choose a page within the export plan.');
  }
  opts.signal?.throwIfAborted();
  // Project once before loading assets or allocating any render surface.
  const projection = opts.viewMode === 'player' ? projectForAudience(map, opts.customThemes, opts.customStamps) : null;
  const source = projection?.map ?? map;
  const customThemes = projection?.customThemes ?? opts.customThemes;
  const customStamps = projection?.customStamps ?? opts.customStamps;
  const assets = await loadExportAssets(source, customThemes, customStamps, opts.signal);
  opts.onWarnings?.(assets.warnings);

  const name = opts.viewMode === 'player' ? map.meta.publicName?.trim() || 'Player map' : map.meta.name;
  const baseName = name.replace(/\s+/g, '_') || 'dungeon';

  const indices = opts.pageIndex === undefined ? Array.from({ length: plan.pages }, (_, i) => i) : [opts.pageIndex];
  opts.onProgress?.(0, indices.length);
  for (const [completed, index] of indices.entries()) {
    await new Promise(resolve => setTimeout(resolve, 0));
    opts.signal?.throwIfAborted();
    const row = Math.floor(index / plan.columns);
    const column = index % plan.columns;
    const region = { x: column * plan.stepX, y: row * plan.stepY, width: plan.contentWidth, height: plan.contentHeight };
    const renderOptions = { ...opts, customThemes, customStamps,
      themeId: source.meta.theme ?? opts.themeId, tileSize: plan.tileSize, region, images: assets.images };
    const rendered = projection ? renderPlayerProjection(projection, renderOptions) : renderMapToCanvas(source, renderOptions);
    const page = document.createElement('canvas');
    page.width = plan.pageWidth;
    page.height = plan.pageHeight;
    try {
      const ctx = page.getContext('2d');
      if (!ctx) throw new Error('Canvas rendering is unavailable.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, page.width, page.height);
      ctx.drawImage(rendered, plan.margin, plan.margin);
      rendered.width = rendered.height = 0;
      const suffix = plan.pages > 1 ? `_page_${row + 1}-${column + 1}` : '';
      await downloadCanvasAsPNG(page, `${baseName}_${opts.dpi}dpi${suffix}.png`, opts.dpi, opts.signal);
    } finally {
      rendered.width = rendered.height = page.width = page.height = 0;
    }
    opts.onProgress?.(completed + 1, indices.length);
  }
}

/** Convert a canvas to a PNG blob and trigger a download. */
async function downloadCanvasAsPNG(canvas: HTMLCanvasElement, fileName: string, dpi: number, signal?: AbortSignal): Promise<void> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('PNG rendering failed. Try a lower resolution; the project is unchanged.')); return; }
      resolve(blob);
    }, 'image/png');
  });
  const printable = await withPNGResolution(blob, dpi);
  signal?.throwIfAborted();
  downloadBlob(printable, fileName, 1000);
}
