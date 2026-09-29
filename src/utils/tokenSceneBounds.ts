import type { LightSource, StairLink } from '../types/map';
import { getFolioFurnishing } from '../assets/folio-furnishings-v1/catalog';
import { getStampDef } from './stampCatalog';
import { MAX_TOKEN_PAINT_BOXES, tokenPaintBounds, type PaintBox, type TokenPaintFrame } from './tokenRepaint';

interface SceneOptions {
  lightSources?: readonly LightSource[];
  stairLinks?: readonly StairLink[];
  activeLevelIndex: number;
  selectedPlacedStampId?: number | null;
  selection?: { x: number; y: number; w: number; h: number } | null;
}

/** Conservative logical-pixel extents for the admitted editor artwork, not collision bounds. */
export function tokenSceneBounds(ctx: CanvasRenderingContext2D, frame: TokenPaintFrame, options: SceneOptions): PaintBox[] | null {
  const map = frame.map, size = map.meta.tileSize;
  const boxes: PaintBox[] = [];
  let valid = true;
  const add = (box: PaintBox) => {
    if (!Object.values(box).every(Number.isFinite) || boxes.length >= MAX_TOKEN_PAINT_BOXES) valid = false;
    else boxes.push(box);
  };
  const circle = (x: number, y: number, radius: number) => {
    if (!Number.isFinite(radius) || radius < 0) { valid = false; return; }
    add({ left: x - radius, top: y - radius, right: x + radius, bottom: y + radius });
  };
  const text = (value: string, x: number, y: number, font: string) => {
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const metrics = ctx.measureText(value);
    add({ left: x - metrics.actualBoundingBoxLeft, top: y - metrics.actualBoundingBoxAscent,
      right: x + metrics.actualBoundingBoxRight, bottom: y + metrics.actualBoundingBoxDescent });
  };
  const line = (points: readonly { x: number; y: number }[], radius: number) => {
    if (!points.length) return;
    if (!Number.isFinite(radius) || radius < 0) { valid = false; return; }
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    for (const point of points) {
      left = Math.min(left, point.x * size); right = Math.max(right, point.x * size);
      top = Math.min(top, point.y * size); bottom = Math.max(bottom, point.y * size);
    }
    add({ left: left - radius, top: top - radius, right: right + radius, bottom: bottom + radius });
  };
  const count = map.notes.length + (map.tokens?.length ?? 0) + (map.stamps?.length ?? 0) +
    (map.annotations?.length ?? 0) + (map.markers?.length ?? 0) + (map.wallSegments?.length ?? 0) +
    (map.pathSegments?.length ?? 0) + (map.rivers?.length ?? 0) +
    (options.lightSources?.length ?? 0) + (options.stairLinks?.length ?? 0);
  if (count > MAX_TOKEN_PAINT_BOXES) return null;
  ctx.save();
  try {
    for (const token of map.tokens ?? []) {
      const bounds = tokenPaintBounds(token, frame);
      if (!bounds) return null;
      add(bounds);
    }
    for (const note of map.notes) {
      const x = (note.x + 0.5) * size, y = (note.y + 0.5) * size;
      circle(x, y, size * 0.38 + 1);
      text(String(note.id), x, y + 0.5, `bold ${Math.max(8, size * 0.45)}px "Courier New", monospace`);
    }
    for (const stamp of map.stamps ?? []) {
      const def = getFolioFurnishing(getStampDef(stamp.stampId));
      if (!def || !Number.isFinite(stamp.rotation)) return null;
      const drawSize = size * (stamp.scale || 1);
      if (!Number.isFinite(drawSize) || drawSize <= 0) return null;
      const x = (stamp.x + 0.5) * size, y = (stamp.y + 0.5) * size;
      const angle = stamp.rotation * Math.PI / 180;
      // Include the default miter limit as well as the map-space shadow offset.
      const stroke = Math.max(...def.paths!.map(path => path.strokeWidth ?? 1)) * drawSize / 128 * 10;
      const extent = drawSize / 2 * (Math.abs(Math.sin(angle)) + Math.abs(Math.cos(angle))) + stroke;
      add({ left: x - extent, top: y - extent, right: x + extent + drawSize * 2 / 64,
        bottom: y + extent + drawSize * 3 / 64 });
      if (stamp.id === options.selectedPlacedStampId) circle(x, y, drawSize / 2 + 2 + Math.max(2, size * 0.08) / 2);
      if (stamp.locked) {
        const badge = Math.max(10, size * 0.25);
        const bx = x + drawSize / 2 - badge * 0.4, by = y - drawSize / 2 - badge * 0.1;
        circle(bx, by, badge / 2);
        text('\u{1f512}', bx, by, `bold ${badge * 0.7}px sans-serif`);
      }
    }
    for (const segment of map.wallSegments ?? []) line(segment.points, Math.max(1, segment.thickness * size / 2));
    for (const segment of map.pathSegments ?? []) line(segment.points, Math.max(1, segment.width * size / 2));
    for (const stroke of map.annotations ?? []) line(stroke.points, Math.max(1, stroke.width * size / 2));
    for (const river of map.rivers ?? []) {
      if (!Number.isFinite(river.width) || river.width <= 0) return null;
      line(river.controlPoints, Math.max(12, river.width * size / 2 + size));
    }
    for (const marker of map.markers ?? []) {
      if (!Number.isFinite(marker.size) || marker.size <= 0) return null;
      circle((marker.x + 0.5) * size, (marker.y + 0.5) * size, marker.size * size + Math.max(1, size * 0.08));
    }
    for (const light of options.lightSources ?? []) {
      const x = (light.x + 0.5) * size, y = (light.y + 0.5) * size;
      circle(x, y, light.radius * size);
      text('\u{1f56f}', x, y, `${Math.max(10, size * 0.55)}px serif`);
    }
    for (const link of options.stairLinks ?? []) {
      const ends = [];
      if (link.fromLevel === options.activeLevelIndex) ends.push({ ...link.fromCell, level: link.toLevel });
      if (link.toLevel === options.activeLevelIndex) ends.push({ ...link.toCell, level: link.fromLevel });
      const radius = Math.max(6, size * 0.22);
      for (const end of ends) {
        const x = (end.x + 1) * size - radius - 1, y = end.y * size + radius + 1;
        circle(x, y, radius + 0.6);
        text(`L${end.level + 1}`, x, y, `bold ${Math.max(8, radius * 0.9)}px sans-serif`);
      }
    }
    if (options.selection) {
      const { x, y, w, h } = options.selection;
      add({ left: x * size - 0.75, top: y * size - 0.75, right: (x + w) * size + 0.75, bottom: (y + h) * size + 0.75 });
    }
  } finally { ctx.restore(); }
  return valid ? boxes : null;
}
