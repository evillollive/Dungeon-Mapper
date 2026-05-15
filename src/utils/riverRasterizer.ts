import type { River, RiverBankType, Tile } from '../types/map';

// Parametric t increment per Catmull-Rom sample; smaller values produce
// smoother curves at the cost of more rasterization work.
const CURVE_SAMPLE_STEP = 0.08;
// Spatial sample spacing, in tile units, for straight two-point rivers.
const LINEAR_SAMPLE_DISTANCE = 0.08;
// Cap linear two-point interpolation so very long straight rivers don't
// allocate an unbounded number of intermediate samples.
const MAX_LINEAR_SEGMENT_SAMPLES = 512;

function cloneGrid(baseTiles: Tile[][]): Tile[][] {
  return baseTiles.map(row => row.map(tile => ({ ...tile })));
}

function catmullRom(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number,
) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * (
      2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    ),
    y: 0.5 * (
      2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    ),
  };
}

export function sampleRiverCurve(river: Pick<River, 'controlPoints'>): { x: number; y: number }[] {
  const points = river.controlPoints;
  if (points.length <= 1) return [...points];
  if (points.length === 2) {
    const [a, b] = points;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.min(MAX_LINEAR_SEGMENT_SAMPLES, Math.ceil(dist / LINEAR_SAMPLE_DISTANCE)));
    return Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      };
    });
  }

  const samples: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let t = 0; t < 1; t += CURVE_SAMPLE_STEP) {
      samples.push(catmullRom(p0, p1, p2, p3, t));
    }
  }
  samples.push(points[points.length - 1]);
  return samples;
}

function directionBetween(a: { x: number; y: number }, b: { x: number; y: number }, fallback: number): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return fallback;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

const BANK_NEIGHBORS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0],           [1, 0],
  [-1, 1],  [0, 1],  [1, 1],
] as const;

function bankTypeForRiver(river: River): RiverBankType {
  if (river.type === 'lava') return 'scorched';
  if (river.type === 'underground-stream') return 'rock';
  if (river.width >= 4) return 'sand';
  if (river.width >= 2) return 'dirt';
  return 'stone';
}

function applyRiverBanks(out: Tile[][], riversById: Map<number, River>, width: number, height: number): void {
  const bankUpdates: { x: number; y: number; river: River }[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = out[y][x];
      if (tile.type === 'water' || tile.type === 'archway') continue;
      let nearestRiver: River | undefined;
      for (const [dx, dy] of BANK_NEIGHBORS) {
        const neighbor = out[y + dy]?.[x + dx];
        if (neighbor?.type !== 'water' || neighbor.riverId === undefined) continue;
        nearestRiver = riversById.get(neighbor.riverId);
        if (nearestRiver) break;
      }
      if (nearestRiver) bankUpdates.push({ x, y, river: nearestRiver });
    }
  }

  for (const update of bankUpdates) {
    out[update.y][update.x] = {
      ...out[update.y][update.x],
      riverBank: bankTypeForRiver(update.river),
      riverBankRiverId: update.river.id,
      riverBankType: update.river.type,
    };
  }
}

export function rasterizeRivers(
  baseTiles: Tile[][],
  rivers: readonly River[],
  width: number,
  height: number,
): Tile[][] {
  if (rivers.length === 0) return baseTiles;
  const out = cloneGrid(baseTiles);
  const riversById = new Map(rivers.map(river => [river.id, river]));

  for (const river of rivers) {
    const samples = sampleRiverCurve(river);
    if (samples.length === 0) continue;
    const radius = Math.max(0.5, river.width / 2);

    for (let i = 0; i < samples.length; i++) {
      const p = samples[i];
      const dir = directionBetween(samples[i], samples[Math.min(samples.length - 1, i + 1)], river.flowDirection);
      const minX = Math.max(0, Math.floor(p.x - radius));
      const maxX = Math.min(width - 1, Math.ceil(p.x + radius));
      const minY = Math.max(0, Math.floor(p.y - radius));
      const maxY = Math.min(height - 1, Math.ceil(p.y + radius));

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const cx = x + 0.5;
          const cy = y + 0.5;
          if (out[y][x].type !== 'archway' && Math.hypot(cx - p.x, cy - p.y) <= radius) {
            out[y][x] = {
              ...out[y][x],
              type: 'water',
              riverId: river.id,
              riverType: river.type,
              flowDirection: dir,
            };
          }
        }
      }
    }
  }

  applyRiverBanks(out, riversById, width, height);

  return out;
}
