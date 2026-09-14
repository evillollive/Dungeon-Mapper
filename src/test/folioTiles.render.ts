import { ALL_TILE_TYPES, type DungeonMap, type Tile } from '../types/map';
import { folioTheme } from '../themes/folio-v1/theme';
import { FolioTileCache, FOLIO_TILE_CACHE_MAX_BYTES, FOLIO_TILE_CACHE_MAX_ENTRIES } from '../themes/folio-v1/tileCache';
import { deriveRenderableTiles, deriveRenderableTilesFromBase } from '../utils/derivedRenderMap';
import { getSemanticTileType } from '../utils/customThemes';
export { diagnoseFolioTileRasterization } from './folioTiles.diagnostics';

function checkBudget(cache: FolioTileCache): void {
  if (cache.stats.rasterBytes > FOLIO_TILE_CACHE_MAX_BYTES || cache.stats.entries > FOLIO_TILE_CACHE_MAX_ENTRIES) {
    throw new Error('Folio tile cache exceeded its budget');
  }
}

export function compareFolioTilePixels() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const cache = new FolioTileCache();
  const width = 12, height = 8;
  const original: Tile[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      type: ALL_TILE_TYPES[(x + y * width) % ALL_TILE_TYPES.length],
      floorMaterial: x % 3 === 0 ? 'folio-worn-wood-v1' : x % 3 === 1 ? 'folio-earth-v1' : undefined,
    })));
  const results = [];
  try {
    for (const size of [8, 32, 64]) {
      for (const dpr of [1, 1.25, 1.5, 2, 3]) {
        for (const background of ['transparent', '#f4f1e4']) {
          cache.clear();
          let tiles = original;
          const render = (cached: boolean) => {
            canvas.width = width * size * dpr;
            canvas.height = height * size * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.fillStyle = background;
            ctx.fillRect(0, 0, width * size, height * size);
            const context = {
              getTileBaseType: (x: number, y: number) => {
                const type = tiles[y]?.[x]?.type;
                return type ? getSemanticTileType(type, []) : undefined;
              },
              getFloorMaterial: (x: number, y: number) => tiles[y]?.[x]?.floorMaterial,
            };
            if (cached) cache.prepare(ctx, size);
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const type = tiles[y][x].type;
                if (type === 'empty') continue;
                if (cached) cache.draw(ctx, type, x, y, size, context);
                else folioTheme.drawTile(ctx, type, x, y, size, context);
              }
            }
            return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          };
          for (const phase of ['cold', 'warm', 'paint', 'undo', 'materials', 'geometry', 'floors']) {
            if (phase === 'paint') tiles = original.map(row => row.map(tile =>
              tile.type === 'wall' || tile.type === 'secret-door' ? { ...tile, type: 'water' } : tile));
            if (phase === 'undo') tiles = original;
            if (phase === 'materials') tiles = original.map(row => row.map(tile => ({ ...tile,
              floorMaterial: tile.floorMaterial === 'folio-worn-wood-v1' ? 'folio-earth-v1' : 'folio-worn-wood-v1',
            })));
            if (phase === 'geometry') tiles = deriveRenderableTilesFromBase(original,
              [{ id: 1, x: 2, y: 1, width: 5, height: 5, fillTile: 'floor', shapeType: 'circle' }],
              [{ id: 1, controlPoints: [{ x: 1, y: 6 }, { x: 10, y: 1 }], width: 1, type: 'water', flowDirection: 0 }],
              width, height);
            if (phase === 'floors') tiles = original.map(row => row.map(tile => ({ ...tile, type: 'floor' })));
            const direct = render(false);
            const cached = render(true);
            let maxDelta = 0, totalDelta = 0, worstIndex = 0, alphaDelta = 0;
            const differences: Record<string, number> = {};
            for (let i = 0; i < direct.length; i++) {
              const delta = Math.abs(direct[i] - cached[i]);
              if (delta > maxDelta) { maxDelta = delta; worstIndex = i; }
              totalDelta += delta;
              if (i % 4 === 3) alphaDelta = Math.max(alphaDelta, delta);
              if (delta > 0) {
                const px = Math.floor(i / 4) % canvas.width, py = Math.floor(Math.floor(i / 4) / canvas.width);
                const type = tiles[Math.floor(py / (size * dpr))][Math.floor(px / (size * dpr))].type;
                differences[type] = Math.max(differences[type] ?? 0, delta);
              }
            }
            checkBudget(cache);
            const px = Math.floor(worstIndex / 4) % canvas.width, py = Math.floor(Math.floor(worstIndex / 4) / canvas.width);
            const tx = Math.floor(px / (size * dpr)), ty = Math.floor(py / (size * dpr));
            results.push({ size, dpr, background, phase, maxDelta, alphaDelta, meanDelta: totalDelta / direct.length, differences,
              worst: { px, py, tx, ty, tile: tiles[ty][tx], direct: direct[worstIndex], cached: cached[worstIndex] },
              ...cache.stats });
          }
        }
      }
    }
    return results;
  } finally {
    cache.clear();
    canvas.width = canvas.height = 0;
  }
}

export function verifyFolioTileCopyState() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const cache = new FolioTileCache();
  let checks = 0;
  try {
    for (const dpr of [1, 1.25, 1.5, 2]) {
      for (const offset of [-7, 10]) {
        canvas.width = 256;
        ctx.setTransform(dpr, 0, 0, dpr, offset, 3);
        const clip = new Path2D();
        clip.rect(0, 0, 256, 80);
        ctx.clip(clip);
        ctx.beginPath();
        ctx.rect(1, 2, 3, 4);
        ctx.fillStyle = '#abcdef';
        ctx.strokeStyle = '#fedcba';
        ctx.lineWidth = 3;
        ctx.imageSmoothingEnabled = false;
        const state = () => JSON.stringify({
          transform: Array.from(ctx.getTransform().toFloat64Array()),
          fill: ctx.fillStyle, stroke: ctx.strokeStyle, width: ctx.lineWidth,
          smoothing: ctx.imageSmoothingEnabled,
          path: ctx.isPointInPath(offset + 2 * dpr, 3 + 3 * dpr),
        });
        const before = state();
        const context = { getTileBaseType: () => 'floor' as const, getFloorMaterial: () => 'folio-worn-wood-v1' };
        cache.clear();
        cache.prepare(ctx, 32);
        cache.draw(ctx, 'floor', 2, 2, 32, context);
        cache.draw(ctx, 'floor', 2, 2, 32, context);
        if (state() !== before) throw new Error('Sprite copy changed the caller drawing state or path');
        if (cache.stats.hits !== 1 || cache.stats.misses !== 1) throw new Error('State scenario did not exercise cold and warm copies');
        const pixels = ctx.getImageData(0, 0, 256, 256).data;
        let visible = 0;
        for (let y = 0; y < 256; y++) {
          for (let x = 0; x < 256; x++) {
            const alpha = pixels[(y * 256 + x) * 4 + 3];
            if (alpha && y >= Math.ceil(80 * dpr + 3)) throw new Error('Sprite escaped the caller clip');
            if (alpha) visible++;
          }
        }
        if (!visible) throw new Error('Clip scenario drew no visible pixels');
        checks++;
      }
    }
    return checks;
  } finally {
    cache.clear();
    canvas.width = canvas.height = 0;
  }
}

export function measureDenseFolioTileCache(map: DungeonMap) {
  const tiles = deriveRenderableTiles(map);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const cache = new FolioTileCache();
  const results = [];
  const context = {
    getTileBaseType: (x: number, y: number) => {
      const type = tiles[y]?.[x]?.type;
      return type ? getSemanticTileType(type, []) : undefined;
    },
    getFloorMaterial: (x: number, y: number) => tiles[y]?.[x]?.floorMaterial,
  };
  try {
    for (const dpr of [1, 2, 3]) {
      cache.clear();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cache.prepare(ctx, map.meta.tileSize);
      const traverse = () => {
        for (let y = 0; y < map.meta.height; y++) {
          for (let x = 0; x < map.meta.width; x++) {
            cache.draw(ctx, tiles[y][x].type, x, y, map.meta.tileSize, context);
          }

        }
        checkBudget(cache);
        return cache.stats;
      };
      const cold = traverse(), warm = traverse();
      if (cold.misses !== warm.misses || cold.entries !== warm.entries || cold.rasterBytes !== warm.rasterBytes) {
        throw new Error('Unchanged traversal allocated new tile sprites');
      }
      if (warm.hits <= cold.hits) throw new Error('Unchanged traversal did not reuse tile sprites');
      results.push({ dpr, cold, warm });
    }
    return results;
  } finally {
    cache.clear();
    canvas.width = canvas.height = 0;
  }
}
