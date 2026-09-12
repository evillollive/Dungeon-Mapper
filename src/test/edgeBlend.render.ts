import { drawEdgeBlending, EdgeBlendCache, EDGE_BLEND_CACHE_MAX_BYTES, EDGE_BLEND_CACHE_MAX_ENTRIES } from '../utils/edgeBlend';
import { getTheme } from '../themes';
import { deriveRenderableTiles, deriveRenderableTilesFromBase } from '../utils/derivedRenderMap';
import type { CustomThemeDefinition, DungeonMap, EdgeBlendSettings, Tile } from '../types/map';

export { diagnoseEdgeBlendPixels } from './edgeBlend.diagnostics';

// Bundled only by the browser test, never exposed by the production application.
export function compareEdgeBlendPixels() {
  const cache = new EdgeBlendCache();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  const edgeLayer = document.createElement('canvas');
  const edgeContext = edgeLayer.getContext('2d');
  if (!edgeContext) throw new Error('Edge reference canvas unavailable');
  const original: Tile[][] = Array.from({ length: 8 }, (_, y) =>
    Array.from({ length: 8 }, (_, x) => ({
      type: (['floor', 'wall', 'water', 'empty'] as const)[(x + y * 3) % 4],
    })));
  const customThemes: CustomThemeDefinition[] = [];
  const results = [];
  let checks = 0;
  let maximumDelta = 0;
  let maximumIsolatedDelta = 0;
  const settings: EdgeBlendSettings = { enabled: true, style: 'dither', intensity: 0.35, opacity: 0.6 };

  for (const tileSize of [8, 32, 64]) {
    for (const dpr of [1, 1.25, 1.5, 2]) {
      for (const background of ['#f4f1e4', '#001122']) {
        cache.clear();
        let tiles = original;
        let theme = getTheme('dungeon-folio-v1');
        const render = (mode: 'direct' | 'cached' | 'isolated') => {
          canvas.width = 8 * tileSize * dpr;
          canvas.height = 8 * tileSize * dpr;
          context.setTransform(dpr, 0, 0, dpr, 0, 0);
          context.fillStyle = background;
          context.fillRect(0, 0, 8 * tileSize, 8 * tileSize);
          if (mode === 'isolated') {
            // Independent oracle: the unmodified vector drawer composites one
            // edge at a time through a full-size layer, without atlas packing.
            edgeLayer.width = canvas.width;
            edgeLayer.height = canvas.height;
            edgeContext.setTransform(dpr, 0, 0, dpr, 0, 0);
            const flush = () => {
              context.save();
              context.resetTransform();
              context.drawImage(edgeLayer, 0, 0);
              context.restore();
              edgeContext.save();
              edgeContext.resetTransform();
              edgeContext.clearRect(0, 0, edgeLayer.width, edgeLayer.height);
              edgeContext.restore();
            };
            const isolated = new Proxy(edgeContext, {
              get(target, key) {
                const value = Reflect.get(target, key, target);
                return typeof value === 'function' ? value.bind(target) : value;
              },
              set(target, key, value) {
                if (key === 'fillStyle') flush();
                return Reflect.set(target, key, value, target);
              },
            });
            drawEdgeBlending(isolated, tiles, 8, 8, tileSize, settings, theme, customThemes);
            flush();
          } else {
            drawEdgeBlending(context, tiles, 8, 8, tileSize, settings, theme, customThemes, mode === 'cached' ? cache : undefined);
          }
          return context.getImageData(0, 0, canvas.width, canvas.height).data;
        };
        for (const phase of ['cold', 'warm', 'paint', 'undo', 'geometry', 'theme', 'opacity', 'intensity'] as const) {
          if (phase === 'paint') tiles = original.map(row => row.map(tile => tile.type === 'wall' ? { type: 'water' } : tile));
          if (phase === 'undo') tiles = original;
          if (phase === 'geometry') tiles = deriveRenderableTilesFromBase(original,
            [{ id: 1, x: 1, y: 1, width: 4, height: 4, fillTile: 'floor', shapeType: 'circle' }],
            [{ id: 1, controlPoints: [{ x: 1, y: 6 }, { x: 6, y: 1 }], width: 1, type: 'water', flowDirection: 0 }], 8, 8);
          if (phase === 'theme') theme = getTheme('wilderness');
          if (phase === 'opacity') settings.opacity = 0.9;
          if (phase === 'intensity') settings.intensity = 0.8;
          const direct = render('direct');
          const cached = render('cached');
          const isolated = render('isolated');
          let maxDelta = 0;
          let isolatedDelta = 0;
          let totalDelta = 0;
          let changedChannels = 0;
          for (let i = 0; i < direct.length; i++) {
            const delta = Math.abs(direct[i] - cached[i]);
            maxDelta = Math.max(maxDelta, delta);
            totalDelta += delta;
            if (delta > 0) changedChannels++;
            isolatedDelta = Math.max(isolatedDelta, Math.abs(isolated[i] - cached[i]));
          }
          maximumDelta = Math.max(maximumDelta, maxDelta);
          maximumIsolatedDelta = Math.max(maximumIsolatedDelta, isolatedDelta);
          results.push({ phase, tileSize, dpr, background, maxDelta,
            isolatedDelta, meanDelta: totalDelta / direct.length, changedChannels, ...cache.stats });
          if (cache.stats.rasterBytes > EDGE_BLEND_CACHE_MAX_BYTES || cache.stats.entries > EDGE_BLEND_CACHE_MAX_ENTRIES) {
            throw new Error('Edge cache exceeded its budget');
          }
          checks++;
        }
        settings.opacity = 0.6;
        settings.intensity = 0.35;
      }
    }
  }
  cache.clear();
  canvas.width = canvas.height = 0;
  edgeLayer.width = edgeLayer.height = 0;
  return { checks, maximumDelta, maximumIsolatedDelta, results };
}

export function measureDenseEdgeCache(map: DungeonMap) {
  const settings = map.edgeBlend;
  if (!settings) throw new Error('Missing F05 edge settings');
  const cache = new EdgeBlendCache();
  const canvas = document.createElement('canvas');
  // Exercise every edge while keeping this allocation test's destination tiny.
  // The unchanged F05 interaction diagnostic uses the actual full-size editor.
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  const tiles = deriveRenderableTiles(map);
  const theme = getTheme(map.meta.theme ?? 'dungeon');
  const results = [];
  for (const dpr of [1, 2, 3]) {
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const draw = () => drawEdgeBlending(context, tiles, map.meta.width, map.meta.height,
      map.meta.tileSize, settings, theme, [], cache);
    draw();
    const cold = cache.stats;
    draw();
    const warm = cache.stats;
    if (cold.rasterBytes > EDGE_BLEND_CACHE_MAX_BYTES || cold.entries > EDGE_BLEND_CACHE_MAX_ENTRIES ||
      warm.misses !== cold.misses || warm.hits - cold.hits !== cold.entries || warm.pages !== cold.pages) {
      throw new Error('F05 cache admission or reuse failed');
    }
    if (dpr === 1 && (cold.bypasses !== 0 || cold.entries === 0)) throw new Error('F05 DPR 1 edges must fit within the budget');
    if (dpr > 1 && cold.bypasses === 0) throw new Error('Expected F05 high-DPR overflow to exercise direct drawing');
    results.push({ dpr, cold, warm });
  }
  cache.clear();
  canvas.width = canvas.height = 0;
  return results;
}
