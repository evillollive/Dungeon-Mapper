import type { BuiltInTileType } from '../../types/map';
import type { TileDrawContext } from '../index';
import { tileHash } from '../artUtils';

export const FOLIO_THEME_ID = 'dungeon-folio-v1';
export const FOLIO_CACHE_LIMIT = 256;

type Point = readonly [number, number];
type Shape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; fill: string }
  | { kind: 'line'; points: readonly Point[]; stroke: string; width: number }
  | { kind: 'circle'; x: number; y: number; r: number; fill: string };

export const FOLIO_COLORS: Record<BuiltInTileType, string> = {
  empty: '#171e21', background: '#303837', floor: '#a39e8a', wall: '#515956',
  water: '#547b7a', pillar: '#616863', 'door-h': '#8d7051', 'door-v': '#8d7051',
  'secret-door': '#515956', 'locked-door-h': '#8d7051', 'locked-door-v': '#8d7051',
  'trapped-door-h': '#8d7051', 'trapped-door-v': '#8d7051', portcullis: '#626e6b',
  archway: '#a39e8a', barricade: '#8d7051', 'stairs-up': '#a39e8a',
  'stairs-down': '#a39e8a', trap: '#a39e8a', treasure: '#a39e8a', start: '#a39e8a',
};

const FLOOR = ['#a39e8a', '#a6a18e', '#a09c89', '#a8a38f'];
const ROCK = ['#303837', '#323a39', '#343c3a', '#313938'];
const WATER = ['#547b7a', '#557d7b', '#527978', '#567c7a'];
const INK = '#293330';
const LIGHT = '#c8c5ac';
const cache = new Map<string, readonly Shape[]>();

export function folioCacheSize(): number { return cache.size; }
export function clearFolioCache(): void { cache.clear(); }

export function folioVariant(x: number, y: number): number {
  return Math.min(3, Math.floor(tileHash(x, y) * 4));
}

function adjacency(type: BuiltInTileType, x: number, y: number, context?: TileDrawContext): number {
  if (type !== 'wall' && type !== 'secret-door' && type !== 'water') return 0;
  const matches = (neighbor: BuiltInTileType | undefined) => type === 'water'
    ? neighbor === 'water'
    : neighbor === 'wall' || neighbor === 'secret-door';
  return [[0, -1], [1, 0], [0, 1], [-1, 0]].reduce(
    (mask, [dx, dy], index) => mask | (matches(context?.getTileBaseType(x + dx, y + dy)) ? 1 << index : 0), 0,
  );
}

/** Pack-local immutable geometry is shared by Canvas and SVG, never by game rules. */
export function folioShapes(
  type: BuiltInTileType, x: number, y: number, size: number, context?: TileDrawContext,
): readonly Shape[] {
  const variant = folioVariant(x, y);
  const neighbors = adjacency(type, x, y, context);
  const detail = size >= 16;
  const key = `${type}:${variant}:${neighbors}:${detail}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const shapes: Shape[] = [];
  const rect = (x: number, y: number, w: number, h: number, fill: string) =>
    shapes.push({ kind: 'rect', x, y, w, h, fill });
  const line = (points: readonly Point[], stroke = INK, width = 1.3) =>
    shapes.push({ kind: 'line', points, stroke, width });
  const circle = (x: number, y: number, r: number, fill: string) =>
    shapes.push({ kind: 'circle', x, y, r, fill });

  const wall = type === 'wall' || type === 'secret-door';
  rect(0, 0, 32, 32, wall ? FOLIO_COLORS.wall
    : type === 'water' ? WATER[variant]
      : type === 'background' ? ROCK[variant]
        : type === 'empty' ? FOLIO_COLORS.empty : FLOOR[variant]);

  if (wall || type === 'water') {
    // Only exposed edges get contours. Shared edges never become individual beads.
    const edges: readonly (readonly Point[])[] = [
      [[0, 1.5], [32, 1.5]], [[30.5, 0], [30.5, 32]],
      [[0, 30.5], [32, 30.5]], [[1.5, 0], [1.5, 32]],
    ];
    edges.forEach((points, index) => {
      if (!(neighbors & (1 << index))) {
        line(points, wall ? INK : '#899783', wall ? 3 : 3.5);
        if (wall && (index === 0 || index === 3)) line(points, '#879084', 1);
      }
    });
    if (type === 'water' && detail) {
      const offset = variant * 2;
      line([[6, 10 + offset], [12, 9 + offset], [19, 10 + offset]], '#739390', 0.8);
      line([[17, 23 - offset], [25, 22 - offset]], '#739390', 0.7);
    }
    if (type === 'secret-door') {
      line([[12, 11], [20, 11], [12, 21], [20, 21]], '#c5b48c', 1.5);
    }
  } else if (type === 'background') {
    if (detail) line([[3, 21], [9, 17], [13, 18]], '#424a44', 0.8);
  } else if (type !== 'empty') {
    if (detail) {
      line([[0, 16], [32, 16]], '#928f7e', 0.5);
      const seam = 8 + variant * 4;
      line([[seam, 0], [seam, 16], [seam + 8, 16], [seam + 8, 32]], '#928f7e', 0.5);
    }
    if (type.includes('door')) {
      const vertical = type.endsWith('-v');
      rect(vertical ? 11 : 0, vertical ? 0 : 11, vertical ? 10 : 32, vertical ? 32 : 10, INK);
      rect(vertical ? 13 : 2, vertical ? 2 : 13, vertical ? 6 : 28, vertical ? 28 : 6, '#997b55');
      for (const at of [7, 24]) rect(vertical ? 11 : at, vertical ? at : 11, vertical ? 10 : 2, vertical ? 2 : 10, '#47514d');
      if (type.startsWith('locked')) {
        rect(12, 12, 8, 8, '#d2bb7d');
        circle(16, 15, 1.7, INK);
        rect(15, 16, 2, 3, INK);
      }
      if (type.startsWith('trapped')) line([[11, 20], [16, 11], [21, 20], [11, 20]], '#813f35', 2);
    } else if (type === 'pillar') {
      circle(17, 18, 11, '#7c7f6e');
      circle(16, 15, 10, INK);
      circle(16, 15, 8, '#758075');
      line([[10, 15], [12, 10], [17, 9]], LIGHT, 1.5);
    } else if (type.startsWith('stairs')) {
      for (let i = 0; i < 5; i++) {
        const inset = type === 'stairs-down' ? i * 1.6 : (4 - i) * 1.6;
        rect(4 + inset, 4 + i * 5, 24 - inset * 2, 4, i % 2 ? '#858a7b' : '#747d72');
        line([[4 + inset, 4 + i * 5], [28 - inset, 4 + i * 5]], INK, 1);
      }
      const down = type === 'stairs-down';
      line([[16, down ? 5 : 27], [16, down ? 27 : 5]], LIGHT, 1.7);
      line(down ? [[12, 23], [16, 27], [20, 23]] : [[12, 9], [16, 5], [20, 9]], LIGHT, 1.7);
    } else if (type === 'archway') {
      rect(0, 8, 6, 16, INK); rect(26, 8, 6, 16, INK);
      rect(0, 9, 5, 13, '#758075'); rect(27, 9, 5, 13, '#758075');
    } else if (type === 'portcullis') {
      for (let at = 5; at < 32; at += 5) line([[at, 8], [at, 24]], INK, 2);
      line([[0, 12], [32, 12]], '#65736b', 3);
      line([[0, 20], [32, 20]], INK, 2);
    } else if (type === 'barricade') {
      line([[4, 5], [26, 27]], INK, 6); line([[4, 5], [26, 27]], '#997b55', 4);
      line([[27, 5], [5, 26]], INK, 6); line([[27, 5], [5, 26]], '#997b55', 4);
    } else if (type === 'treasure') {
      rect(6, 9, 20, 15, INK); rect(8, 11, 16, 11, '#9f8053');
      rect(10, 10, 2, 13, '#d2bb7d'); rect(20, 10, 2, 13, '#d2bb7d');
      rect(14, 14, 4, 4, '#d2bb7d');
    } else if (type === 'trap') {
      line([[16, 5], [28, 26], [4, 26], [16, 5]], '#813f35', 2);
      line([[16, 12], [16, 19]], INK, 2); circle(16, 23, 1, INK);
    } else if (type === 'start') {
      circle(16, 16, 11, '#526d5b');
      line([[10, 16], [22, 16]], '#ede4c5', 2);
      line([[17, 11], [22, 16], [17, 21]], '#ede4c5', 2);
    }
  }

  if (cache.size >= FOLIO_CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(key, shapes);
  return shapes;
}

export function drawFolioShapes(ctx: CanvasRenderingContext2D, shapes: readonly Shape[], x: number, y: number, size: number): void {
  ctx.save();
  ctx.translate(x * size, y * size);
  ctx.scale(size / 32, size / 32);
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  for (const shape of shapes) {
    if (shape.kind === 'rect') {
      ctx.fillStyle = shape.fill;
      ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
    } else if (shape.kind === 'circle') {
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.r, 0, Math.PI * 2);
      ctx.fillStyle = shape.fill;
      ctx.fill();
    } else {
      ctx.beginPath();
      shape.points.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
      ctx.strokeStyle = shape.stroke;
      ctx.lineWidth = shape.width;
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function folioShapesSVG(shapes: readonly Shape[], x: number, y: number, size: number): string {
  return `<g transform="translate(${x * size} ${y * size}) scale(${size / 32})" stroke-linejoin="round">` +
    shapes.map(shape => {
      if (shape.kind === 'rect') return `<rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}" fill="${shape.fill}"/>`;
      if (shape.kind === 'circle') return `<circle cx="${shape.x}" cy="${shape.y}" r="${shape.r}" fill="${shape.fill}"/>`;
      return `<polyline points="${shape.points.map(point => point.join(',')).join(' ')}" fill="none" stroke="${shape.stroke}" stroke-width="${shape.width}"/>`;
    }).join('') + '</g>';
}
