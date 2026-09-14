import type { TileDrawContext } from '../index';
import { isFloorMaterialId, type TileType } from '../../types/map';
import { folioVariant } from './art';
import { folioTheme } from './theme';

export const FOLIO_TILE_CACHE_MAX_BYTES = 1024 * 1024;
export const FOLIO_TILE_CACHE_MAX_ENTRIES = 12;
export const FOLIO_TILE_CACHE_MAX_PIXELS = 128;
const MIN_BACKING_SIZE = FOLIO_TILE_CACHE_MAX_PIXELS + 4;

type Sprite = { canvas: HTMLCanvasElement; clip: Path2D };

/** Four variants of three immutable floor materials, not map contents or fog. */
export class FolioTileCache {
  private entries = new Map<string, Sprite>();
  private context: CanvasRenderingContext2D | null = null;
  private size = 0;
  private scale = 0;
  private offsetX = 0;
  private offsetY = 0;
  private rasterBytes = 0;
  private hits = 0;
  private misses = 0;
  private overflow = 0;

  get stats() {
    return { entries: this.entries.size, rasterBytes: this.rasterBytes,
      hits: this.hits, misses: this.misses, overflow: this.overflow };
  }

  clear(): void {
    for (const { canvas } of this.entries.values()) canvas.width = canvas.height = 0;
    this.entries.clear();
    this.context = null;
    this.size = this.scale = this.rasterBytes = this.hits = this.misses = this.overflow = 0;
  }

  prepare(ctx: CanvasRenderingContext2D, size: number): void {
    const { a, b, c, d, e, f } = ctx.getTransform();
    if (size !== this.size || a !== this.scale) this.clear();
    this.context = null;
    // Fractional device-pixel placement and compositing effects need vector drawing.
    // Larger curves also lose pixel fidelity when translated to small surfaces.
    if (a <= 0 || a !== d || b !== 0 || c !== 0 || !Number.isInteger(size * a) ||
        !Number.isInteger(e) || !Number.isInteger(f) || size <= 0 || size * a > FOLIO_TILE_CACHE_MAX_PIXELS ||
        ctx.globalAlpha !== 1 || ctx.globalCompositeOperation !== 'source-over' ||
        ctx.getLineDash().length !== 0 || ('filter' in ctx && ctx.filter !== 'none') ||
        !['rgba(0, 0, 0, 0)', 'rgba(0,0,0,0)'].includes(ctx.shadowColor)) return;
    this.context = ctx;
    this.size = size;
    this.scale = a;
    this.offsetX = e;
    this.offsetY = f;
  }

  draw(ctx: CanvasRenderingContext2D, type: TileType, x: number, y: number, size: number, context?: TileDrawContext): void {
    if (this.context !== ctx || size !== this.size || type !== 'floor' || !Number.isInteger(x) || !Number.isInteger(y)) {
      folioTheme.drawTile(ctx, type, x, y, size, context);
      return;
    }
    const material = context?.getFloorMaterial?.(x, y);
    const key = `${folioVariant(x, y)}:${isFloorMaterialId(material) ? material : ''}`;
    const pixels = size * this.scale;
    // The wood plank joint slightly overhangs its tile. Keep its antialias fringe.
    const padding = Math.ceil(pixels / 128) + 1;
    let sprite = this.entries.get(key);
    if (sprite) {
      this.hits++;
    } else {
      const extent = pixels + 2 * padding;
      // Small backing surfaces use a different raster path in Linux WebKit.
      const backingSize = Math.max(MIN_BACKING_SIZE, extent);
      const bytes = backingSize * backingSize * 4;
      if (this.entries.size >= FOLIO_TILE_CACHE_MAX_ENTRIES || this.rasterBytes + bytes > FOLIO_TILE_CACHE_MAX_BYTES) {
        this.overflow++;
        folioTheme.drawTile(ctx, type, x, y, size, context);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = backingSize;
      const target = canvas.getContext('2d');
      if (!target) {
        canvas.width = canvas.height = 0;
        this.context = null;
        folioTheme.drawTile(ctx, type, x, y, size, context);
        return;
      }
      target.setTransform(this.scale, 0, 0, this.scale, padding - x * pixels, padding - y * pixels);
      folioTheme.drawTile(target, type, x, y, size, context);
      const clip = new Path2D();
      clip.rect(0, 0, extent, extent);
      sprite = { canvas, clip };
      this.entries.set(key, sprite);
      this.rasterBytes += bytes;
      this.misses++;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, x * pixels + this.offsetX - padding, y * pixels + this.offsetY - padding);
    ctx.clip(sprite.clip);
    ctx.drawImage(sprite.canvas, 0, 0);
    ctx.restore();
  }
}
