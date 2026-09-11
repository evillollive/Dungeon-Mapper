import type { PlacedStamp, StampDef, StampSvgPath } from '../types/map';
import { getFolioFurnishing } from '../assets/folio-furnishings-v1/catalog';

export const FOLIO_STAMP_PATH_CACHE_LIMIT = 128;
const paths = new Map<string, Path2D>();
export function folioStampPathCacheSize(): number { return paths.size; }
export function clearFolioStampPathCache(): void { paths.clear(); }

export function stampPath(def: StampDef, path: string): Path2D {
  if (!getFolioFurnishing(def)) return new Path2D(path);
  const key = `${def.id}:${path}`;
  const cached = paths.get(key);
  if (cached) return cached;
  const compiled = new Path2D(path);
  if (paths.size >= FOLIO_STAMP_PATH_CACHE_LIMIT) paths.delete(paths.keys().next().value!);
  paths.set(key, compiled);
  return compiled;
}

export function stampPaths(def: StampDef, printMode = false): StampSvgPath[] | undefined {
  const furnishing = getFolioFurnishing(def);
  return printMode && furnishing ? furnishing.printPaths : def.paths;
}

export function folioShadowPlacement(stamp: PlacedStamp, tileSize: number) {
  const drawSize = tileSize * (stamp.scale || 1);
  return {
    x: (stamp.x + 0.5) * tileSize + drawSize * 2 / 64,
    y: (stamp.y + 0.5) * tileSize + drawSize * 3 / 64,
    drawSize,
    opacity: (stamp.opacity ?? 1) * 0.18,
  };
}

/** The offset is in map space, before object rotation/flip, so light stays northwest. */
export function drawFolioStampShadow(ctx: CanvasRenderingContext2D, def: StampDef, stamp: PlacedStamp, tileSize: number, printMode = false): void {
  const furnishing = getFolioFurnishing(def);
  if (!furnishing || printMode) return;
  const shadow = folioShadowPlacement(stamp, tileSize);
  ctx.save();
  ctx.globalAlpha *= shadow.opacity;
  ctx.translate(shadow.x, shadow.y);
  ctx.rotate(stamp.rotation * Math.PI / 180);
  ctx.scale(stamp.flipX ? -1 : 1, stamp.flipY ? -1 : 1);
  ctx.translate(-shadow.drawSize / 2, -shadow.drawSize / 2);
  ctx.scale(shadow.drawSize / 64, shadow.drawSize / 64);
  ctx.fillStyle = '#243027';
  ctx.fill(stampPath(def, furnishing.shadowPath));
  ctx.restore();
}

export function folioStampShadowSVG(def: StampDef, stamp: PlacedStamp, tileSize: number): string {
  const furnishing = getFolioFurnishing(def);
  if (!furnishing) return '';
  const s = folioShadowPlacement(stamp, tileSize);
  return `<g transform="translate(${s.x},${s.y}) rotate(${stamp.rotation}) scale(${stamp.flipX ? -1 : 1},${stamp.flipY ? -1 : 1}) translate(${-s.drawSize / 2},${-s.drawSize / 2}) scale(${s.drawSize / 64})" opacity="${s.opacity}"><path d="${furnishing.shadowPath}" fill="#243027"/></g>`;
}
