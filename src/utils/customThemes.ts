import type { BuiltInTileType, CustomThemeDefinition, TileType } from '../types/map';
import { isBuiltInTileType } from '../types/map';
import type { TileTheme } from '../themes';
import { getTheme, THEME_LIST } from '../themes';

const customImageCache = new Map<string, HTMLImageElement>();

function safeColor(value: string | undefined, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(value ?? '') ? value! : fallback;
}

function getCustomImage(dataUrl: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  const cached = customImageCache.get(dataUrl);
  if (cached) return cached;
  const img = new Image();
  img.src = dataUrl;
  customImageCache.set(dataUrl, img);
  return img;
}

function customTileFallbackLabel(): string {
  return 'CUST';
}

export function findCustomTheme(
  id: string,
  customThemes: readonly CustomThemeDefinition[] = [],
): CustomThemeDefinition | undefined {
  return customThemes.find(theme => theme.id === id);
}

export function findCustomTile(
  type: TileType,
  customThemes: readonly CustomThemeDefinition[] = [],
): CustomThemeDefinition['customTiles'][number] | undefined {
  if (isBuiltInTileType(type)) return undefined;
  for (const theme of customThemes) {
    const tile = theme.customTiles.find(t => t.id === type);
    if (tile) return tile;
  }
  return undefined;
}

export function getSemanticTileType(
  type: TileType,
  customThemes: readonly CustomThemeDefinition[] = [],
): BuiltInTileType {
  if (isBuiltInTileType(type)) return type;
  return findCustomTile(type, customThemes)?.baseType ?? 'floor';
}

export function getCustomTileLabel(
  type: TileType,
  customThemes: readonly CustomThemeDefinition[] = [],
): string | undefined {
  return findCustomTile(type, customThemes)?.label;
}

export function buildThemeList(customThemes: readonly CustomThemeDefinition[] = []): TileTheme[] {
  return [...THEME_LIST, ...customThemes.map(theme => createCustomTileTheme(theme, customThemes))]
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getThemeWithCustom(
  id: string,
  customThemes: readonly CustomThemeDefinition[] = [],
): TileTheme {
  const custom = findCustomTheme(id, customThemes);
  return custom ? createCustomTileTheme(custom, customThemes) : getTheme(id);
}

export function preloadCustomThemeImages(
  customThemes: readonly CustomThemeDefinition[] = [],
  onReady?: () => void,
): void {
  for (const theme of customThemes) {
    for (const tile of theme.customTiles) {
      if (!tile.imageDataUrl) continue;
      const img = getCustomImage(tile.imageDataUrl);
      if (img && !img.complete && onReady) {
        img.addEventListener('load', onReady, { once: true });
        img.addEventListener('error', onReady, { once: true });
      }
    }
  }
}

export function createCustomTileTheme(
  definition: CustomThemeDefinition,
  customThemes: readonly CustomThemeDefinition[] = [],
): TileTheme {
  const base = getTheme(definition.baseThemeId);
  const tileColors: TileTheme['tileColors'] = { ...base.tileColors };
  for (const type of Object.keys(definition.tileColors) as BuiltInTileType[]) {
    tileColors[type] = safeColor(definition.tileColors[type], base.tileColors[type]);
  }
  const customTiles = definition.customTiles.filter(t => t.id.startsWith('custom:'));
  for (const tile of customTiles) {
    tileColors[tile.id] = safeColor(tile.color, tileColors[tile.baseType] ?? tileColors.floor);
  }

  return {
    id: definition.id,
    name: definition.name.trim() || 'Custom Theme',
    emptyTileId: base.emptyTileId,
    cssVars: { ...base.cssVars },
    gridColor: safeColor(definition.gridColor, base.gridColor),
    tileColors,
    tiles: [
      ...base.tiles.map(tile => ({
        id: tile.id,
        label: isBuiltInTileType(tile.id) ? (definition.tileLabels[tile.id] || tile.label) : tile.label,
      })),
      ...customTiles.map(tile => ({ id: tile.id, label: tile.label || customTileFallbackLabel() })),
    ],
    drawTile(ctx: CanvasRenderingContext2D, type: TileType, x: number, y: number, size: number) {
      if (isBuiltInTileType(type)) {
        ctx.fillStyle = tileColors[type];
        ctx.fillRect(x * size, y * size, size, size);
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x * size, y * size, size, size);
        return;
      }

      const tile = customTiles.find(t => t.id === type) ?? findCustomTile(type, customThemes);
      const px = x * size;
      const py = y * size;
      const color = safeColor(tile?.color, tileColors.floor);
      ctx.fillStyle = color;
      ctx.fillRect(px, py, size, size);

      if (tile?.imageDataUrl) {
        const img = getCustomImage(tile.imageDataUrl);
        if (img?.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, px, py, size, size);
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = `bold ${Math.max(8, size * 0.38)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(customTileFallbackLabel(), px + size / 2, py + size / 2);
      }

      ctx.strokeStyle = this.gridColor;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px, py, size, size);
    },
  };
}
