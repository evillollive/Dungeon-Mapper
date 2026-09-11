import type { BuiltInTileType, CustomThemeDefinition, DungeonMap, StampDef, Tile, TileType } from '../types/map';
import { deriveRenderableTiles } from './derivedRenderMap';
import { computePlayerFOV } from './dynamicFog';
import { computeLightVisible } from './lightSources';
import { getSemanticTileType } from './customThemes';
import { isTokenFogged } from './tokenVisibility';
import { BUILT_IN_TILE_TYPES } from '../types/map';
import { isSecretDiscovered } from './secretDiscovery';

export const SECRET_APPEARANCE: Partial<Record<BuiltInTileType, BuiltInTileType>> = {
  'secret-door': 'wall', trap: 'floor', 'trapped-door-h': 'door-h', 'trapped-door-v': 'door-v',
};

/** Serializable, current-level-only payload. No project, authoring libraries or callbacks. */
export interface PlayerProjection {
  audience: 'player';
  version: 1;
  map: DungeonMap;
  customThemes: CustomThemeDefinition[];
  customStamps: StampDef[];
}

/**
 * Project from an allowlist, never by spreading authoring objects. Fogged geometry
 * is removed before serialization, so removing an SVG fog rectangle reveals nothing.
 */
export function projectForAudience(
  source: DungeonMap,
  customThemes: readonly CustomThemeDefinition[] = [],
  customStamps: readonly StampDef[] = [],
): PlayerProjection {
  const { width, height, tileSize } = source.meta;
  const tiles = deriveRenderableTiles(source);
  const dynamic = !!source.fogEnabled && !!source.dynamicFogEnabled;
  const players = dynamic ? computePlayerFOV(tiles, (source.tokens ?? []).filter(t => !t.hidden), customThemes) : null;
  const lights = dynamic ? computeLightVisible(tiles, source.lightSources, customThemes) : null;
  const current = (x: number, y: number) => !source.fogEnabled || source.fog?.[y]?.[x] === false ||
    (dynamic && (!!players?.has(`${x},${y}`) || !!lights?.has(`${x},${y}`)));
  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;
  const known = (x: number, y: number) => inBounds(x, y) &&
    (current(x, y) || (dynamic && source.explored?.[y]?.[x] === true));
  const fog = tiles.map((row, y) => row.map((_, x) => !known(x, y)));
  const explored = tiles.map((row, y) => row.map((_, x) => known(x, y) && !current(x, y)));
  const fullyKnown = fog.every(row => row.every(cell => !cell));
  const boxKnown = (left: number, top: number, right: number, bottom: number) => {
    // Clip only to the map, not to fog. Reject objects completely outside it.
    if (right <= 0 || bottom <= 0 || left >= width || top >= height) return false;
    for (let y = Math.max(0, Math.floor(top)); y < Math.min(height, Math.ceil(bottom)); y++) {
      for (let x = Math.max(0, Math.floor(left)); x < Math.min(width, Math.ceil(right)); x++) {
        if (!known(x, y)) return false;
      }
    }
    return true;
  };
  const pointsKnown = (points: { x: number; y: number }[], padding: number) => points.length > 0 &&
    boxKnown(Math.min(...points.map(p => p.x)) - padding, Math.min(...points.map(p => p.y)) - padding,
      Math.max(...points.map(p => p.x)) + padding, Math.max(...points.map(p => p.y)) + padding);
  const notes = source.notes.filter(n => n.published === true && known(n.x, n.y)).map(n => ({
    id: n.id, x: n.x, y: n.y, label: n.publicLabel?.trim() || 'Note',
    description: n.publicDescription ?? '',
  }));
  const noteIds = new Set(notes.map(n => n.id));
  const tokens = (source.tokens ?? []).filter(t => !t.hidden &&
    inBounds(t.x, t.y) && inBounds(t.x + (t.size ?? 1) - 1, t.y + (t.size ?? 1) - 1) &&
    !isTokenFogged(t, fog)).map(t => ({
    id: t.id, x: t.x, y: t.y, kind: t.kind, label: t.label,
    color: t.color, icon: t.icon, size: t.size,
  }));
  const initiativeIds = new Set((source.tokens ?? []).filter(t => !t.hideFromInitiative).map(t => t.id));
  const tokenIds = new Set(tokens.map(t => t.id));
  const themeIds = new Set<string>();
  const tileIds = new Set<TileType>();
  if (source.meta.theme) themeIds.add(source.meta.theme);
  const safeTiles: Tile[][] = tiles.map((row, y) => row.map((tile, x) => {
    if (!known(x, y)) return { type: 'empty' };
    const baseType = getSemanticTileType(tile.type, customThemes);
    const discovered = isSecretDiscovered(source.tiles[y][x], tile);
    const type = !discovered && SECRET_APPEARANCE[baseType] ? SECRET_APPEARANCE[baseType]! : tile.type;
    tileIds.add(type);
    if (tile.theme) themeIds.add(tile.theme);
    return {
      type, theme: tile.theme, noteId: tile.noteId !== undefined && noteIds.has(tile.noteId) ? tile.noteId : undefined,
      flowDirection: tile.flowDirection, riverType: tile.riverType,
      riverBank: tile.riverBank, riverBankType: tile.riverBankType,
    };
  }));
  const stamps = (source.stamps ?? []).filter(s => {
    const radius = s.scale * Math.SQRT2 / 2;
    return !s.hidden && boxKnown(s.x + 0.5 - radius, s.y + 0.5 - radius, s.x + 0.5 + radius, s.y + 0.5 + radius);
  }).map(s => ({
    id: s.id, stampId: s.stampId, x: s.x, y: s.y, rotation: s.rotation, scale: s.scale,
    flipX: s.flipX, flipY: s.flipY, opacity: s.opacity, locked: true,
  }));
  const stampIds = new Set(stamps.map(s => s.stampId));
  const p = source.paperTexture;
  const e = source.edgeBlend;
  const h = source.handDrawn;
  const a = source.lightingAtmosphere;
  return {
    audience: 'player', version: 1,
    map: {
      meta: { name: source.meta.publicName?.trim() || 'Player map', width, height, tileSize, theme: source.meta.theme },
      tiles: safeTiles, notes, tokens,
      initiative: (source.initiative ?? []).filter(id => tokenIds.has(id) && initiativeIds.has(id)),
      fogEnabled: true, fog: tiles.map((row, y) => row.map((_, x) => !current(x, y))), dynamicFogEnabled: dynamic, explored,
      // Geometry is flattened above. Never send room shapes or a complete river
      // path that can reconstruct the geography behind fog.
      stamps,
      annotations: (source.annotations ?? []).filter(s => s.kind === 'player' && pointsKnown(s.points, s.width / 2)).map(s => ({
        id: s.id, kind: 'player', points: s.points.map(p => ({ x: p.x, y: p.y })), color: s.color, width: s.width,
      })),
      markers: (source.markers ?? []).filter(m => boxKnown(m.x - m.size, m.y - m.size, m.x + m.size + 1, m.y + m.size + 1)).map(m => ({
        id: m.id, x: m.x, y: m.y, shape: m.shape, color: m.color, size: m.size,
      })),
      wallSegments: (source.wallSegments ?? []).filter(s => pointsKnown(s.points, s.thickness / 2)).map(s => ({
        id: s.id, points: s.points.map(p => ({ x: p.x, y: p.y })), color: s.color, thickness: s.thickness,
      })),
      pathSegments: (source.pathSegments ?? []).filter(s => pointsKnown(s.points, s.width / 2)).map(s => ({
        id: s.id, points: s.points.map(p => ({ x: p.x, y: p.y })), color: s.color, width: s.width,
      })),
      lightSources: (source.lightSources ?? []).filter(l => known(l.x, l.y)).map(l => ({
        id: l.id, x: l.x, y: l.y, radius: l.radius, color: l.color, label: 'Light',
      })),
      // A raw background embeds the entire image. Omit it until all geography
      // is known, even though a visual fog overlay could conceal its pixels.
      backgroundImage: fullyKnown && source.backgroundImage ? {
        dataUrl: source.backgroundImage.dataUrl, offsetX: source.backgroundImage.offsetX,
        offsetY: source.backgroundImage.offsetY, scale: source.backgroundImage.scale, opacity: source.backgroundImage.opacity,
      } : undefined,
      paperTexture: p ? { enabled: p.enabled, pattern: p.pattern, opacity: p.opacity, grain: p.grain, vignette: p.vignette, tintOverride: p.tintOverride } : undefined,
      edgeBlend: e ? { enabled: e.enabled, style: e.style, intensity: e.intensity, opacity: e.opacity } : undefined,
      handDrawn: h ? { enabled: h.enabled, style: h.style, wobble: h.wobble, crossHatch: h.crossHatch, opacity: h.opacity } : undefined,
      lightingAtmosphere: a ? {
        enabled: a.enabled, aoIntensity: a.aoIntensity, aoRadius: a.aoRadius, stampShadowOpacity: a.stampShadowOpacity,
        stampShadowOffset: a.stampShadowOffset, colorGrading: a.colorGrading, colorGradingIntensity: a.colorGradingIntensity, opacity: a.opacity,
      } : undefined,
    },
    customThemes: customThemes.filter(t => themeIds.has(t.id)).map(t => ({
      id: t.id, name: 'Map theme', baseThemeId: t.baseThemeId, gridColor: t.gridColor,
      tileColors: Object.fromEntries(BUILT_IN_TILE_TYPES.filter(type => t.tileColors[type] !== undefined)
        .map(type => [type, t.tileColors[type]])), tileLabels: {},
      customTiles: t.customTiles.filter(tile => tileIds.has(tile.id)).map(tile => ({
        id: tile.id, label: 'Map tile', color: tile.color, baseType: tile.baseType, imageDataUrl: tile.imageDataUrl,
      })),
    })),
    customStamps: customStamps.filter(s => stampIds.has(s.id)).map(s => ({
      id: s.id, name: 'Map object', category: s.category, viewBox: s.viewBox, svgPath: s.svgPath,
      imageDataUrl: s.imageDataUrl,
      paths: s.paths?.map(p => ({ path: p.path, fill: p.fill, stroke: p.stroke, strokeWidth: p.strokeWidth })),
    })),
  };
}
