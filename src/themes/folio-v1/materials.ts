import { isFloorMaterialId, type FloorMaterialId } from '../../types/map';
import { folioVariant } from './art';
import type { folioShapes } from './art';

type ArtShape = ReturnType<typeof folioShapes>[number];

export const FLOOR_MATERIAL_LABELS: Record<FloorMaterialId, string> = {
  'folio-worn-wood-v1': 'Worn wood',
  'folio-earth-v1': 'Earth',
};
export const FLOOR_MATERIAL_CACHE_LIMIT = 16;
const cache = new Map<string, readonly ArtShape[]>();
const WOOD = ['#a09277', '#a39479', '#9d9075', '#a5967b'];
const EARTH = ['#9d917b', '#9a8e77', '#a0947d', '#9b9079'];

export function floorMaterialCacheSize(): number { return cache.size; }
export function clearFloorMaterialCache(): void { cache.clear(); }

export function floorMaterialShapes(material: string | undefined, x: number, y: number, size: number): readonly ArtShape[] | undefined {
  if (!isFloorMaterialId(material)) return undefined;
  const variant = folioVariant(x, y);
  const detail = size >= 16;
  const key = `${material}:${variant}:${detail}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const shapes: ArtShape[] = [];
  const rect = (x: number, y: number, w: number, h: number, fill: string) =>
    shapes.push({ kind: 'rect', x, y, w, h, fill });
  const line = (points: readonly (readonly [number, number])[], stroke: string, width: number) =>
    shapes.push({ kind: 'line', points, stroke, width });
  const circle = (x: number, y: number, r: number, fill: string) =>
    shapes.push({ kind: 'circle', x, y, r, fill });

  if (material === 'folio-worn-wood-v1') {
    rect(0, 0, 32, 32, WOOD[variant]);
    // Planks continue at shared cell edges; only one staggered joint per cell.
    rect(0, 0, 10.5, 32, WOOD[(variant + 1) % 4]);
    rect(21.5, 0, 10.5, 32, WOOD[(variant + 3) % 4]);
    for (const at of [10.5, 21.5]) line([[at, 0], [at, 32]], '#81765f', 0.55);
    if (detail) {
      const plank = variant % 3;
      const joint = 7 + variant * 5;
      line([[plank * 10.67, joint], [(plank + 1) * 10.67, joint]], '#7e745f', 0.65);
      line([[4, 2], [3.5, 10 + variant], [5, 19], [4.5, 29]], '#8d8169', 0.45);
      line([[16, 4], [17, 11], [16, 23 + variant], [17, 31]], '#b1a285', 0.65);
      line([[27, 1], [26, 12], [27, 24]], '#8d8169', 0.45);
      circle(5, 14 + variant * 2, 0.75, '#81765f');
    }
  } else {
    rect(0, 0, 32, 32, EARTH[variant]);
    if (detail) {
      const offset = variant * 2;
      line([[4, 9 + offset], [8, 7 + offset], [13, 8 + offset]], '#aa9e86', 0.7);
      line([[17, 24 - offset], [21, 25 - offset], [26, 22 - offset]], '#8d826d', 0.55);
      circle(22 - variant, 8 + variant, 0.7, '#817764');
      circle(8 + variant, 23 - variant, 0.55, '#baad91');
      circle(15, 17 + variant, 0.4, '#8a7e67');
    }
  }
  // Two immutable IDs, four variants and two detail tiers: at most 16 entries.
  cache.set(key, shapes);
  return shapes;
}
