import { drawEdgeBlending, EdgeBlendCache } from '../utils/edgeBlend';
import { getTheme } from '../themes';
import { deriveRenderableTilesFromBase } from '../utils/derivedRenderMap';
import type { EdgeBlendSettings, Tile } from '../types/map';
import type { compareEdgeBlendPixels } from './edgeBlend.render';

type Sample = ReturnType<typeof compareEdgeBlendPixels>['results'][number];
type Rect = [number, number, number, number];
type Command = { rect: Rect; alpha: number };
type VectorEdge = { color: string; commands: Command[] };
type Edge = { x: number; y: number; direction: string; color: string };
type Blit = {
  edge: Edge; source: HTMLCanvasElement; from: Rect; to: Rect;
  state: ReturnType<typeof contextState>;
};

function surface(width: number, height = width) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Diagnostic canvas unavailable');
  return ctx;
}

function contextState(ctx: CanvasRenderingContext2D) {
  const { a, b, c, d, e, f } = ctx.getTransform();
  return {
    width: ctx.canvas.width, height: ctx.canvas.height,
    attributes: ctx.getContextAttributes?.() ?? null,
    transform: { a, b, c, d, e, f },
    alpha: ctx.globalAlpha, composite: ctx.globalCompositeOperation,
    smoothing: ctx.imageSmoothingEnabled, smoothingQuality: ctx.imageSmoothingQuality,
    filter: ctx.filter ?? null, shadow: [ctx.shadowColor, ctx.shadowBlur, ctx.shadowOffsetX, ctx.shadowOffsetY],
  };
}

function pixels(ctx: CanvasRenderingContext2D, rect: Rect = [0, 0, ctx.canvas.width, ctx.canvas.height]) {
  return ctx.getImageData(...rect).data;
}

function difference(expected: Uint8ClampedArray, actual: Uint8ClampedArray, width: number) {
  if (expected.length !== actual.length) throw new Error('Diagnostic pixel dimensions differ');
  let maxDelta = 0, maxAlphaDelta = 0, maxPremultipliedDelta = 0, total = 0, changedChannels = 0, worst = 0;
  for (let i = 0; i < expected.length; i++) {
    const delta = Math.abs(expected[i] - actual[i]);
    if (delta > maxDelta) { maxDelta = delta; worst = i; }
    if (delta) changedChannels++;
    total += delta;
    const alpha = i - i % 4 + 3;
    if (i % 4 === 3) maxAlphaDelta = Math.max(maxAlphaDelta, delta);
    else maxPremultipliedDelta = Math.max(maxPremultipliedDelta,
      Math.abs(expected[i] * expected[alpha] - actual[i] * actual[alpha]) / 255);
  }
  const offset = worst - worst % 4;
  return {
    maxDelta, meanDelta: total / expected.length, changedChannels, maxAlphaDelta, maxPremultipliedDelta,
    worst: { x: offset / 4 % width, y: Math.floor(offset / 4 / width), channel: worst % 4,
      expected: Array.from(expected.slice(offset, offset + 4)), actual: Array.from(actual.slice(offset, offset + 4)) },
  };
}

function crop(data: Uint8ClampedArray, side: number, x: number, y: number) {
  const rows = [];
  for (let py = Math.max(0, y - 1); py <= Math.min(side - 1, y + 1); py++) {
    const row = [];
    for (let px = Math.max(0, x - 1); px <= Math.min(side - 1, x + 1); px++) {
      const offset = (py * side + px) * 4;
      row.push({ x: px, y: py, rgba: Array.from(data.slice(offset, offset + 4)) });
    }
    rows.push(row);
  }
  return rows;
}

// This pass has its own canvases/cache. It never adds readbacks to the original
// 192 measurements. Two small-map DPRs and one matching 32px control are enough.
export function diagnoseEdgeBlendPixels(samples: Sample[]) {
  const started = performance.now();
  const small = samples.filter(sample => sample.tileSize === 8)
    .sort((a, b) => b.isolatedDelta - a.isolatedDelta || b.maxDelta - a.maxDelta);
  const first = small[0];
  if (!first) throw new Error('Missing small-map diagnostic sample');
  const second = small.find(sample => sample.dpr !== first.dpr);
  const control = samples.find(sample => sample.tileSize === 32 && sample.dpr === first.dpr &&
    sample.phase === first.phase && sample.background === first.background);
  if (!second || !control) throw new Error('Diagnostic sample selection failed');
  const cases = [first, second, control].map(diagnoseSample);
  return {
    userAgent: navigator.userAgent, devicePixelRatio: window.devicePixelRatio,
    durationMs: performance.now() - started,
    units: 'RGBA8 channels /255; premultiplied deltas computed from readback RGBA, not native backing bytes',
    interpretation: {
      atlasVsMap: 'Source pixels before blit; inspect alpha/premultiplied deltas, not low-alpha RGB alone.',
      packedVsMap: 'Identical vector commands and surface dimensions, different integer translation.',
      atlasVsPacked: 'Actual shared atlas versus an otherwise empty surface at the same slot.',
      originVsMap: 'Same commands and surface dimensions, strip relocated to physical origin.',
      croppedMapVsWholeMap: 'Same source pixels; only drawImage source rectangle changes.',
      atlasVsWholeMap: 'Actual atlas crop versus full-map per-edge oracle on the same opaque background.',
    },
    cases,
  };
}

function diagnoseSample(sample: Sample) {
  const { tileSize, dpr, background } = sample;
  const side = 8 * tileSize * dpr;
  const context = surface(side);
  const edgeContext = surface(side);
  const allocated = [context, edgeContext];
  const vectors: VectorEdge[] = [];
  const blits: Blit[] = [];
  let recording = false;
  let activeEdge: Edge | undefined;
  class RecordingCache extends EdgeBlendCache {
    override draw(...args: Parameters<EdgeBlendCache['draw']>) {
      if (recording && !args[8]) activeEdge = { x: args[6], y: args[7], direction: args[2], color: args[3] };
      return super.draw(...args);
    }
  }
  const cache = new RecordingCache();
  const directContext = new Proxy(context, {
    get(target, key) {
      if (key === 'fillRect') return (...rect: Rect) => {
        if (recording) vectors.at(-1)!.commands.push({ rect, alpha: target.globalAlpha });
        target.fillRect(...rect);
      };
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, key, value) {
      if (recording && key === 'fillStyle') vectors.push({ color: value, commands: [] });
      return Reflect.set(target, key, value, target);
    },
  });
  const cachedContext = new Proxy(context, {
    get(target, key) {
      if (key === 'drawImage') return (source: HTMLCanvasElement, ...rects: [...Rect, ...Rect]) => {
        if (recording) {
          if (!activeEdge) throw new Error('Missing diagnostic edge identity');
          blits.push({ edge: activeEdge, source, from: rects.slice(0, 4) as Rect,
            to: rects.slice(4) as Rect, state: contextState(target) });
        }
        target.drawImage(source, ...rects);
      };
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set: (target, key, value) => Reflect.set(target, key, value, target),
  });
  const original: Tile[][] = Array.from({ length: 8 }, (_, y) =>
    Array.from({ length: 8 }, (_, x) => ({
      type: (['floor', 'wall', 'water', 'empty'] as const)[(x + y * 3) % 4],
    })));
  let tiles = original;
  let theme = getTheme('dungeon-folio-v1');
  const settings: EdgeBlendSettings = { enabled: true, style: 'dither', intensity: 0.35, opacity: 0.6 };
  const render = (mode: 'direct' | 'cached' | 'isolated') => {
    context.canvas.width = context.canvas.height = side;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = background;
    context.fillRect(0, 0, 8 * tileSize, 8 * tileSize);
    if (mode === 'isolated') {
      edgeContext.canvas.width = edgeContext.canvas.height = side;
      edgeContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      const flush = () => {
        context.save();
        context.resetTransform();
        context.drawImage(edgeContext.canvas, 0, 0);
        context.restore();
        edgeContext.save();
        edgeContext.resetTransform();
        edgeContext.clearRect(0, 0, side, side);
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
      drawEdgeBlending(isolated, tiles, 8, 8, tileSize, settings, theme, []);
      flush();
    } else {
      drawEdgeBlending(mode === 'direct' ? directContext : cachedContext, tiles, 8, 8, tileSize,
        settings, theme, [], mode === 'cached' ? cache : undefined);
    }
    return pixels(context);
  };
  try {
    // Preserve cache history, phase inputs, render order and readback order.
    for (const phase of ['cold', 'warm', 'paint', 'undo', 'geometry', 'theme', 'opacity', 'intensity'] as const) {
      if (phase === 'paint') tiles = original.map(row => row.map(tile => tile.type === 'wall' ? { type: 'water' } : tile));
      if (phase === 'undo') tiles = original;
      if (phase === 'geometry') tiles = deriveRenderableTilesFromBase(original,
        [{ id: 1, x: 1, y: 1, width: 4, height: 4, fillTile: 'floor', shapeType: 'circle' }],
        [{ id: 1, controlPoints: [{ x: 1, y: 6 }, { x: 6, y: 1 }], width: 1, type: 'water', flowDirection: 0 }], 8, 8);
      if (phase === 'theme') theme = getTheme('wilderness');
      if (phase === 'opacity') settings.opacity = 0.9;
      if (phase === 'intensity') settings.intensity = 0.8;
      recording = phase === sample.phase;
      const direct = render('direct'), cached = render('cached'), isolated = render('isolated');
      if (!recording) continue;
      if (vectors.length !== blits.length) throw new Error('Diagnostic vector/blit edge correspondence failed');
      const isolatedDelta = difference(isolated, cached, side);
      const { x, y } = isolatedDelta.worst;
      const candidates = blits.map((blit, index) => ({ blit, index })).filter(({ blit: { to } }) =>
        x >= to[0] && y >= to[1] && x < to[0] + to[2] && y < to[1] + to[3]);
      // Include all contributors when possible. On a zero-delta control or an
      // uncovered pixel, fall back to one edge per direction to exercise probes.
      const selected = candidates.length ? candidates.slice(0, 4) : blits.map((blit, index) => ({ blit, index }))
        .filter(({ blit }, index, all) => all.findIndex(item => item.blit.edge.direction === blit.edge.direction) === index);
      const make = () => { const ctx = surface(side); allocated.push(ctx); return ctx; };
      const probes = selected.map(({ blit, index }) => {
        const [dx, dy, width, height] = blit.to;
        const [sx, sy] = blit.from;
        const vector = vectors[index];
        const replay = (tx: number, ty: number) => {
          const ctx = make();
          ctx.setTransform(dpr, 0, 0, dpr, tx, ty);
          ctx.fillStyle = vector.color;
          for (const command of vector.commands) { ctx.globalAlpha = command.alpha; ctx.fillRect(...command.rect); }
          return ctx;
        };
        const map = replay(0, 0), packed = replay(sx - dx, sy - dy), origin = replay(-dx, -dy);
        const composite = (source: HTMLCanvasElement, from?: Rect) => {
          const ctx = make();
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, side, side);
          if (from) ctx.drawImage(source, ...from, ...blit.to);
          else ctx.drawImage(source, 0, 0);
          return ctx;
        };
        // Finish every source consumer before any diagnostic source readback.
        return { blit, vector, index, map, packed, origin,
          wholeMap: composite(map.canvas), croppedMap: composite(map.canvas, blit.to),
          atlas: composite(blit.source, blit.from), packedImage: composite(packed.canvas, blit.from),
          originImage: composite(origin.canvas, [0, 0, width, height]) };
      });
      const details = probes.map(probe => {
        const { blit, map, packed, origin } = probe;
        const [dx, dy, width, height] = blit.to;
        const source = blit.source.getContext('2d')!;
        const visible = (data: Uint8ClampedArray) => {
          for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
            if (dx + px < 0 || dy + py < 0 || dx + px >= side || dy + py >= side) {
              data.fill(0, (py * width + px) * 4, (py * width + px + 1) * 4);
            }
          }
          return data;
        };
        const rawMap = visible(pixels(map, blit.to)), rawAtlas = visible(pixels(source, blit.from));
        const rawPacked = visible(pixels(packed, blit.from)), rawOrigin = visible(pixels(origin, [0, 0, width, height]));
        const wholeMap = pixels(probe.wholeMap), atlas = pixels(probe.atlas);
        const atCaseWorst = (data: Uint8ClampedArray, px: number, py: number, rowWidth: number) => {
          if (px < 0 || py < 0 || px >= rowWidth || py >= data.length / 4 / rowWidth) return null;
          const offset = (py * rowWidth + px) * 4;
          return Array.from(data.slice(offset, offset + 4));
        };
        return {
          edgeIndex: probe.index, edge: blit.edge, from: blit.from, to: blit.to, commands: probe.vector,
          contexts: { blit: blit.state, sourceAfterPopulation: contextState(source),
            map: contextState(map), packed: contextState(packed), origin: contextState(origin) },
          rawVisibleStrip: {
            atlasVsMap: difference(rawMap, rawAtlas, width), packedVsMap: difference(rawMap, rawPacked, width),
            atlasVsPacked: difference(rawPacked, rawAtlas, width), originVsMap: difference(rawMap, rawOrigin, width),
          },
          atCaseWorstPixel: {
            x, y, stripX: x - dx, stripY: y - dy,
            rawAtlas: atCaseWorst(rawAtlas, x - dx, y - dy, width),
            rawMap: atCaseWorst(rawMap, x - dx, y - dy, width),
            rawPacked: atCaseWorst(rawPacked, x - dx, y - dy, width),
            rawOrigin: atCaseWorst(rawOrigin, x - dx, y - dy, width),
            opaqueAtlas: atCaseWorst(atlas, x, y, side),
            opaqueWholeMap: atCaseWorst(wholeMap, x, y, side),
          },
          opaqueComposite: {
            atlasVsWholeMap: difference(wholeMap, atlas, side),
            croppedMapVsWholeMap: difference(wholeMap, pixels(probe.croppedMap), side),
            packedVsAtlas: difference(atlas, pixels(probe.packedImage), side),
            originVsWholeMap: difference(wholeMap, pixels(probe.originImage), side),
          },
        };
      });
      return {
        originalSample: sample, settings, cache: cache.stats,
        replay: { isolated: isolatedDelta, direct: difference(direct, cached, side) },
        worstCrop: { direct: crop(direct, side, x, y), cached: crop(cached, side, x, y), isolated: crop(isolated, side, x, y) },
        edgeCount: blits.length, worstPixelContributors: candidates.length, inspectedEdges: details,
      };
    }
    throw new Error('Unknown diagnostic phase');
  } finally {
    cache.clear();
    for (const ctx of allocated) ctx.canvas.width = ctx.canvas.height = 0;
  }
}
