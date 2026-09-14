import type { TileDrawContext } from '../index';
import { isFloorMaterialId, type TileType } from '../../types/map';
import { folioShapes, folioVariant } from './art';
import { floorMaterialShapes } from './materials';
import { folioTheme } from './theme';

export const FOLIO_TILE_CACHE_MAX_ENTRIES = 12;
export const FOLIO_TILE_CACHE_MAX_PATHS = 56;

type Shape = ReturnType<typeof folioShapes>[number];
type Command = Extract<Shape, { kind: 'rect' }> |
  { kind: 'circle'; path: Path2D; fill: string } |
  { kind: 'line'; path: Path2D; stroke: string; width: number };

function compile(shape: Shape): Command {
  if (shape.kind === 'rect') return shape;
  const path = new Path2D();
  if (shape.kind === 'circle') {
    path.arc(shape.x, shape.y, shape.r, 0, Math.PI * 2);
    return { kind: 'circle', path, fill: shape.fill };
  }
  shape.points.forEach(([x, y], index) => index === 0 ? path.moveTo(x, y) : path.lineTo(x, y));
  return { kind: 'line', path, stroke: shape.stroke, width: shape.width };
}

/** Retain immutable floor paths, not pixels from a different raster backend. */
export class FolioTileCache {
  private entries = new Map<string, readonly Command[]>();
  private context: CanvasRenderingContext2D | null = null;
  private size = 0;
  private paths = 0;
  private hits = 0;
  private misses = 0;

  get stats() {
    return { entries: this.entries.size, paths: this.paths, hits: this.hits, misses: this.misses };
  }

  clear(): void {
    this.entries.clear();
    this.context = null;
    this.size = this.paths = this.hits = this.misses = 0;
  }

  prepare(ctx: CanvasRenderingContext2D, size: number): void {
    if (size !== this.size) this.clear();
    this.context = ctx;
    this.size = size;
  }

  draw(ctx: CanvasRenderingContext2D, type: TileType, x: number, y: number, size: number, context?: TileDrawContext): void {
    if (this.context !== ctx || size !== this.size || type !== 'floor') {
      folioTheme.drawTile(ctx, type, x, y, size, context);
      return;
    }
    const material = context?.getFloorMaterial?.(x, y);
    const key = `${folioVariant(x, y)}:${isFloorMaterialId(material) ? material : ''}`;
    let commands = this.entries.get(key);
    if (commands) {
      this.hits++;
    } else {
      const shapes = floorMaterialShapes(material, x, y, size) ?? folioShapes('floor', x, y, size, context);
      commands = shapes.map(compile);
      this.entries.set(key, commands);
      this.paths += commands.filter(command => command.kind !== 'rect').length;
      this.misses++;
    }

    // Preserve the versioned primitive order and destination rasterization.
    ctx.save();
    ctx.translate(x * size, y * size);
    ctx.scale(size / 32, size / 32);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    for (const command of commands) {
      if (command.kind === 'rect') {
        ctx.fillStyle = command.fill;
        ctx.fillRect(command.x, command.y, command.w, command.h);
      } else if (command.kind === 'circle') {
        ctx.fillStyle = command.fill;
        ctx.fill(command.path);
      } else {
        ctx.strokeStyle = command.stroke;
        ctx.lineWidth = command.width;
        ctx.stroke(command.path);
      }
    }
    ctx.restore();
  }
}
