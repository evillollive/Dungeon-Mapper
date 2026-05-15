import type { River, RiverType, TileType } from '../../types/map';
import { sampleRiverCurve } from '../riverRasterizer';
import { setCell, type TypeGrid } from './common';
import type { Rng } from './random';
import type { RiverGenerationOptions, RiverSourceEdge } from './types';

const UNDERGROUND_THEMES = new Set(['dungeon', 'cavern', 'alien']);

export function supportsGeneratedRivers(generatorId: string, themeId?: string): boolean {
  return generatorId === 'open-terrain' ||
    generatorId === 'cavern' ||
    generatorId === 'village' ||
    themeId === 'dungeon' ||
    themeId === 'cavern';
}

export function getGeneratedRiverType(themeId?: string, forceUnderground = false): RiverType {
  return forceUnderground || (themeId !== undefined && UNDERGROUND_THEMES.has(themeId))
    ? 'underground-stream'
    : 'water';
}

function clampRiverOptions(options?: RiverGenerationOptions): RiverGenerationOptions | undefined {
  if (!options?.enabled) return undefined;
  return {
    enabled: true,
    count: Math.max(1, Math.min(4, Math.round(options.count))),
    width: Math.max(1, Math.min(5, options.width)),
    meander: Math.max(0, Math.min(1, options.meander)),
    sourceEdge: options.sourceEdge,
  };
}

function resolveSourceEdge(edge: RiverSourceEdge, rng: Rng): Exclude<RiverSourceEdge, 'random'> {
  if (edge !== 'random') return edge;
  return rng.pick(['north', 'south', 'east', 'west'] as const);
}

function oppositeEdge(edge: Exclude<RiverSourceEdge, 'random'>): Exclude<RiverSourceEdge, 'random'> {
  switch (edge) {
    case 'north': return 'south';
    case 'south': return 'north';
    case 'east': return 'west';
    case 'west': return 'east';
  }
}

function pointOnEdge(
  edge: Exclude<RiverSourceEdge, 'random'>,
  width: number,
  height: number,
  rng: Rng,
  offset = 0,
): { x: number; y: number } {
  const minX = Math.min(width - 0.5, Math.max(0.5, width * 0.18));
  const maxX = Math.max(minX, Math.min(width - 0.5, width * 0.82));
  const minY = Math.min(height - 0.5, Math.max(0.5, height * 0.18));
  const maxY = Math.max(minY, Math.min(height - 0.5, height * 0.82));
  const rollX = minX + rng.next() * (maxX - minX);
  const rollY = minY + rng.next() * (maxY - minY);
  switch (edge) {
    case 'north': return { x: rollX + offset, y: 0.5 };
    case 'south': return { x: rollX + offset, y: height - 0.5 };
    case 'west': return { x: 0.5, y: rollY + offset };
    case 'east': return { x: width - 0.5, y: rollY + offset };
  }
}

export function generateRiversForMap(
  width: number,
  height: number,
  rng: Rng,
  options: RiverGenerationOptions | undefined,
  type: RiverType,
): River[] {
  const opts = clampRiverOptions(options);
  if (!opts || width < 4 || height < 4) return [];

  const rivers: River[] = [];
  const diagonal = Math.hypot(width, height);
  const maxOffset = diagonal * 0.16 * opts.meander;
  for (let i = 0; i < opts.count; i++) {
    const source = resolveSourceEdge(opts.sourceEdge, rng);
    const mouth = oppositeEdge(source);
    const spread = opts.count > 1 ? (i - (opts.count - 1) / 2) * Math.min(width, height) * 0.12 : 0;
    const start = pointOnEdge(source, width, height, rng, spread);
    const end = pointOnEdge(mouth, width, height, rng, -spread);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const bendA = (rng.next() * 2 - 1) * maxOffset;
    const bendB = (rng.next() * 2 - 1) * maxOffset;
    const p1 = {
      x: Math.min(width - 0.5, Math.max(0.5, start.x + dx * 0.33 + nx * bendA)),
      y: Math.min(height - 0.5, Math.max(0.5, start.y + dy * 0.33 + ny * bendA)),
    };
    const p2 = {
      x: Math.min(width - 0.5, Math.max(0.5, start.x + dx * 0.66 + nx * bendB)),
      y: Math.min(height - 0.5, Math.max(0.5, start.y + dy * 0.66 + ny * bendB)),
    };
    rivers.push({
      id: i + 1,
      controlPoints: [start, p1, p2, end],
      width: opts.width,
      flowDirection: (Math.atan2(dy, dx) * 180) / Math.PI,
      type,
    });
  }
  return rivers;
}

export function rasterizeRiversToTypeGrid(
  grid: TypeGrid,
  rivers: readonly River[],
  tile: TileType = 'water',
  preserve: ReadonlySet<TileType> = new Set(),
): void {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  for (const river of rivers) {
    const samples = sampleRiverCurve(river);
    const radius = Math.max(0.5, river.width / 2);
    for (const p of samples) {
      const minX = Math.max(0, Math.floor(p.x - radius));
      const maxX = Math.min(width - 1, Math.ceil(p.x + radius));
      const minY = Math.max(0, Math.floor(p.y - radius));
      const maxY = Math.min(height - 1, Math.ceil(p.y + radius));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (preserve.has(grid[y][x])) continue;
          if (Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) <= radius) {
            setCell(grid, x, y, tile);
          }
        }
      }
    }
  }
}
