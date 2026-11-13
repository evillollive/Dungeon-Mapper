import type { MeasureShape, ShapeMarker } from '../types/map';
import { bresenhamLine, type GridPoint } from './canvasGeometry';

/**
 * Geometry for the private table tools in Run. Everything is in cell units so
 * the DM overlay can be an SVG over the map with a `0 0 width height` viewBox.
 * The shapes follow the editor's Measure tool: sizes count squares with a
 * diagonal step as one square, the cone is 90 degrees and the line is one
 * cell wide.
 */

export const key = (cell: GridPoint) => `${cell.x},${cell.y}`;

/** Extend a freehand stroke to `to`, filling cells skipped by a fast pointer. */
export function extendStroke(stroke: GridPoint[], to: GridPoint): GridPoint[] {
  const last = stroke[stroke.length - 1];
  if (!last) return [to];
  if (last.x === to.x && last.y === to.y) return stroke;
  const seen = new Set(stroke.map(key));
  return [...stroke, ...bresenhamLine(last.x, last.y, to.x, to.y).filter(cell => !seen.has(key(cell)))];
}

export function measureBetween(from: GridPoint, to: GridPoint, feetPerCell: number) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const squares = Math.max(Math.abs(dx), Math.abs(dy));
  return { straight: Math.hypot(dx, dy), squares, feet: squares * feetPerCell };
}

const n = (value: number) => Number(value.toFixed(3));

/** SVG path for a measure shape, drawn between cell centres. */
export function measurePath(shape: MeasureShape, from: GridPoint, to: GridPoint): string {
  const sx = from.x + 0.5, sy = from.y + 0.5, ex = to.x + 0.5, ey = to.y + 0.5;
  const radius = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  if (shape === 'circle') {
    if (radius === 0) return '';
    return `M${n(sx - radius)} ${sy}a${radius} ${radius} 0 1 0 ${radius * 2} 0a${radius} ${radius} 0 1 0 ${-radius * 2} 0Z`;
  }
  if (shape === 'cone') {
    if (radius === 0) return '';
    const a = angle - Math.PI / 4, b = angle + Math.PI / 4;
    return `M${sx} ${sy}L${n(sx + Math.cos(a) * radius)} ${n(sy + Math.sin(a) * radius)}` +
      `A${radius} ${radius} 0 0 1 ${n(sx + Math.cos(b) * radius)} ${n(sy + Math.sin(b) * radius)}Z`;
  }
  if (shape === 'line') {
    const px = Math.cos(angle + Math.PI / 2) / 2, py = Math.sin(angle + Math.PI / 2) / 2;
    return `M${n(sx + px)} ${n(sy + py)}L${n(ex + px)} ${n(ey + py)}L${n(ex - px)} ${n(ey - py)}L${n(sx - px)} ${n(sy - py)}Z`;
  }
  return `M${sx} ${sy}L${ex} ${ey}`;
}

/** One SVG path covering a set of cells, merging horizontal runs. */
export function cellsPath(cells: Iterable<string>, width: number, height: number): string {
  const set = cells instanceof Set ? cells as Set<string> : new Set(cells);
  let path = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!set.has(`${x},${y}`)) continue;
      let end = x;
      while (end + 1 < width && set.has(`${end + 1},${y}`)) end++;
      path += `M${x} ${y}h${end - x + 1}v1h${-(end - x + 1)}Z`;
      x = end;
    }
  }
  return path;
}

/** Top-most marker whose shape contains the centre of the cell. */
export function markerAtCell(markers: readonly ShapeMarker[] | undefined, cell: GridPoint): ShapeMarker | null {
  for (let i = (markers?.length ?? 0) - 1; i >= 0; i--) {
    const marker = markers![i];
    const dx = Math.abs(cell.x - marker.x), dy = Math.abs(cell.y - marker.y), r = marker.size;
    const inside = marker.shape === 'circle' ? dx * dx + dy * dy <= r * r
      : marker.shape === 'square' ? dx <= r && dy <= r
      : dx + dy <= r;
    if (inside) return marker;
  }
  return null;
}
