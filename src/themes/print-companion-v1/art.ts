import type { BuiltInTileType } from '../../types/map';
import type { TileDrawContext } from '../index';
import type { folioShapes } from '../folio-v1/art';

type Shape = ReturnType<typeof folioShapes>[number];
type Point = readonly [number, number];
const INK = '#000000';
const PAPER = '#ffffff';

/** Original 32-unit pen drawings. Coordinates, not output pixels, set hatch spacing. */
export function printTileShapes(
  type: BuiltInTileType, x: number, y: number, context?: TileDrawContext,
): readonly Shape[] {
  const shapes: Shape[] = [];
  const rect = (x: number, y: number, w: number, h: number, fill = INK) =>
    shapes.push({ kind: 'rect', x, y, w, h, fill });
  const line = (points: readonly Point[], width = 1, stroke = INK) =>
    shapes.push({ kind: 'line', points, width, stroke });
  const dot = (x: number, y: number, r = 0.65, fill = INK) =>
    shapes.push({ kind: 'circle', x, y, r, fill });
  const box = (x: number, y: number, w: number, h: number, width = 1.5) =>
    line([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], width);
  const wall = type === 'wall' || type === 'secret-door';

  rect(0, 0, 32, 32, PAPER);
  if (type === 'empty') return shapes;

  if (wall || type === 'water') {
    const neighbors = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const edges: readonly (readonly Point[])[] = [
      [[0, 1], [32, 1]], [[31, 0], [31, 32]],
      [[0, 31], [32, 31]], [[1, 0], [1, 32]],
    ];
    if (wall) {
      // Orthogonal crosshatching stays aligned at cropped page boundaries.
      for (const at of [4, 12, 20, 28]) {
        rect(at - 0.35, 0, 0.7, 32);
        rect(0, at - 0.35, 32, 0.7);
      }
    } else {
      for (const at of [8, 16, 24]) {
        line([[3, at], [7, at - 1.5], [11, at], [15, at + 1.5],
          [19, at], [23, at - 1.5], [29, at]], 0.85);
      }
    }
    neighbors.forEach(([dx, dy], index) => {
      const next = context?.getTileBaseType(x + dx, y + dy);
      const joins = wall ? next === 'wall' || next === 'secret-door' : next === 'water';
      if (!joins) line(edges[index], wall ? 2 : 1.2);
    });
    if (type === 'secret-door') {
      rect(10, 7, 12, 18, PAPER);
      line([[21, 10], [12, 10], [12, 16], [20, 16], [20, 22], [11, 22]], 1.8);
    }
    return shapes;
  }
  if (type === 'background') {
    line([[3, 10], [7, 6], [11, 9]], 0.75);
    line([[18, 25], [22, 20], [28, 22]], 0.75);
    dot(21, 8); dot(7, 24);
    return shapes;
  }
  if (type === 'floor') {
    const material = context?.getFloorMaterial?.(x, y);
    if (material === 'folio-worn-wood-v1') {
      for (const at of [10.5, 21.5]) line([[at, 0], [at, 32]], 0.7);
      const joint = ((x + y) % 3 + 3) % 3;
      line([[joint * 10.5, 16], [(joint + 1) * 10.5, 16]], 0.7);
      line([[4, 4], [3, 10], [4, 14]], 0.65);
      line([[26, 19], [27, 25], [26, 29]], 0.65);
    } else if (material === 'folio-earth-v1') {
      for (const [px, py] of [[6, 7], [22, 5], [15, 16], [5, 25], [26, 24]]) dot(px, py);
      line([[19, 27], [22, 28]], 0.65);
    } else {
      const seam = (x + y) % 2 === 0 ? 10 : 22;
      line([[0, 16], [32, 16]], 0.65);
      line([[seam, 0], [seam, 16]], 0.65);
      line([[32 - seam, 16], [32 - seam, 32]], 0.65);
    }
    return shapes;
  }

  if (type.includes('door')) {
    const vertical = type.endsWith('-v');
    const point = (x: number, y: number): Point => vertical ? [y, x] : [x, y];
    line([point(0, 16), point(6, 16)], 4);
    line([point(26, 16), point(32, 16)], 4);
    if (type.startsWith('locked')) {
      line([[13, 15], [13, 11], [19, 11], [19, 15]], 1.5);
      box(11, 15, 10, 8);
      dot(16, 18.5, 1);
    } else if (type.startsWith('trapped')) {
      line([[16, 8], [23, 23], [9, 23], [16, 8]], 1.5);
      line([[16, 13], [16, 17]], 1.5); dot(16, 20, 0.9);
    } else {
      line([point(6, 12), point(26, 12), point(26, 20), point(6, 20), point(6, 12)], 1.7);
      rect(vertical ? 11 : 10, 8, vertical ? 10 : 12, 16, PAPER);
      if (vertical) {
        line([[12, 10], [16, 22], [20, 10]], 1.8);
      } else {
        line([[12, 10], [12, 22]], 1.8);
        line([[20, 10], [20, 22]], 1.8);
        line([[12, 16], [20, 16]], 1.8);
      }
    }
  } else if (type.startsWith('stairs')) {
    const down = type === 'stairs-down';
    for (let i = 0; i < 5; i++) {
      const inset = (down ? i : 4 - i) * 1.8;
      line([[4 + inset, 5 + i * 5.5], [28 - inset, 5 + i * 5.5]], 1.4);
    }
    line([[16, 4], [16, 28]], 4, PAPER);
    line([[16, 4], [16, 28]], 1.5);
    line(down ? [[12, 23], [16, 28], [20, 23]] : [[12, 9], [16, 4], [20, 9]], 1.8);
  } else if (type === 'pillar') {
    dot(16, 16, 10); dot(16, 16, 7.5, PAPER);
    line([[11, 16], [13, 12], [17, 11]], 1);
  } else if (type === 'archway') {
    rect(0, 10, 6, 12); rect(26, 10, 6, 12);
    line([[6, 13], [11, 13]], 1.3); line([[21, 13], [26, 13]], 1.3);
    line([[6, 19], [11, 19]], 1.3); line([[21, 19], [26, 19]], 1.3);
  } else if (type === 'portcullis') {
    for (const at of [6, 11, 16, 21, 26]) line([[at, 8], [at, 24]], 1.5);
    line([[2, 12], [30, 12]], 2); line([[2, 20], [30, 20]], 2);
  } else if (type === 'barricade') {
    line([[5, 5], [27, 27]], 5); line([[27, 5], [5, 27]], 5);
    line([[5, 5], [27, 27]], 2, PAPER); line([[27, 5], [5, 27]], 2, PAPER);
  } else if (type === 'trap') {
    line([[16, 5], [28, 27], [4, 27], [16, 5]], 1.8);
    line([[16, 12], [16, 20]], 2); dot(16, 24, 1);
  } else if (type === 'treasure') {
    box(5, 9, 22, 16, 1.8); line([[5, 15], [27, 15]], 1.2);
    line([[10, 9], [10, 25]], 1.2); line([[22, 9], [22, 25]], 1.2);
    rect(14, 13, 4, 6);
  } else if (type === 'start') {
    box(5, 5, 22, 22, 1.8);
    line([[9, 16], [23, 16]], 2);
    line([[17, 10], [23, 16], [17, 22]], 2);
  }
  return shapes;
}
