import type { DungeonMap, PlacedStamp } from '../types/map';
import { FOLIO_FURNISHINGS } from '../assets/folio-furnishings-v1/catalog';
import { drawPlacedStamp } from '../components/canvasStamps';
import { getTheme } from '../themes';
import { buildMapSVG } from '../utils/export';
import { buildFolioCatalogReference } from '../utils/folioFurnishingReference';
import { clearFolioStampPathCache, folioStampPathCacheSize, stampPath } from '../utils/folioFurnishingRender';
import { renderMapToCanvas } from '../utils/renderMap';

function catalogMap(tileSize: number, transform: Partial<PlacedStamp> = {}): DungeonMap {
  const map = buildFolioCatalogReference().levels[0];
  return {
    ...map, meta: { ...map.meta, width: 24, height: 16, tileSize },
    tiles: Array.from({ length: 16 }, () => Array.from({ length: 24 }, () => ({ type: 'floor' }))),
    fogEnabled: false, tokens: [], notes: [], initiative: [],
    stamps: FOLIO_FURNISHINGS.map((def, index) => ({
      id: index + 1, stampId: def.id, x: index % 6 * 4 + 1.5, y: Math.floor(index / 6) * 4 + 1.5,
      scale: def.defaultScale, rotation: 0, flipX: false, flipY: false, opacity: 1, locked: false,
      ...transform,
    })),
  };
}

async function svgCanvas(map: DungeonMap): Promise<HTMLCanvasElement> {
  const svg = buildMapSVG(map, getTheme(map.meta.theme), undefined, { viewMode: 'player' });
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = map.meta.width * map.meta.tileSize;
    canvas.height = map.meta.height * map.meta.tileSize;
    canvas.getContext('2d')!.drawImage(image, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function pixelDelta(a: HTMLCanvasElement, b: HTMLCanvasElement, x = 0, y = 0, width = a.width, height = a.height) {
  const left = a.getContext('2d')!.getImageData(x, y, width, height).data;
  const right = b.getContext('2d')!.getImageData(x, y, width, height).data;
  let total = 0;
  let maximum = 0;
  let changedChannels = 0;
  for (let i = 0; i < left.length; i++) {
    const difference = Math.abs(left[i] - right[i]);
    total += difference;
    maximum = Math.max(maximum, difference);
    if (difference > 0) changedChannels++;
  }
  return { mean: total / left.length, maximum, changedChannels };
}

export async function compareFurnishings() {
  clearFolioStampPathCache();
  const recording = recordFurnishingCommands();
  const results = [];
  try {
    for (const tileSize of [8, 16, 32, 64]) {
      for (const transform of [
        {}, { rotation: 90, flipX: true }, { rotation: 45, flipY: true },
        { rotation: -30, flipX: true, flipY: true, opacity: 0.65 },
      ]) {
        const map = catalogMap(tileSize, transform);
        const options = { tileSize, themeId: map.meta.theme };
        const canvas = renderMapToCanvas(map, options);
        const editor = renderMapToCanvas({ ...map, stamps: [] }, options);
        const print = renderMapToCanvas(map, { ...options, printMode: true });
        const editorPrint = renderMapToCanvas({ ...map, stamps: [] }, { ...options, printMode: true });
        for (const stamp of map.stamps!) {
          drawPlacedStamp(editor.getContext('2d')!, stamp, tileSize);
          drawPlacedStamp(editorPrint.getContext('2d')!, stamp, tileSize, false, undefined, undefined, true);
        }
        const svg = await svgCanvas(map);
        results.push({
          tileSize, transform, editorDelta: pixelDelta(canvas, editor), printDelta: pixelDelta(print, editorPrint),
          editorCommandsEqual: recording.trace(canvas) === recording.trace(editor),
          printCommandsEqual: recording.trace(print) === recording.trace(editorPrint),
          paintOperations: recording.count(canvas),
          repeatDelta: pixelDelta(canvas, renderMapToCanvas(map, options)),
          printRepeatDelta: pixelDelta(print, renderMapToCanvas(map, { ...options, printMode: true })),
          svgAssets: FOLIO_FURNISHINGS.map((def, index) => ({
            id: def.id,
            meanDelta: pixelDelta(canvas, svg, index % 6 * 4 * tileSize, Math.floor(index / 6) * 4 * tileSize, tileSize * 4, tileSize * 4).mean,
          })),
        });
      }
    }
    return { cases: results.length, assets: FOLIO_FURNISHINGS.length, cacheEntries: folioStampPathCacheSize(), results };
  } finally {
    recording.stop();
  }
}

function recordFurnishingCommands() {
  const geometry = new Map(FOLIO_FURNISHINGS.flatMap(def =>
    def.paths!.map(path => [stampPath(def, path.path), path.path] as const)));
  const records = new WeakMap<HTMLCanvasElement, string[]>();
  const prototype = CanvasRenderingContext2D.prototype;
  const { fill, stroke } = prototype;
  const capture = (ctx: CanvasRenderingContext2D, args: unknown[], operation: 'fill' | 'stroke') => {
    if (!(args[0] instanceof Path2D) || !geometry.has(args[0])) return;
    const commands = records.get(ctx.canvas) ?? [];
    commands.push(JSON.stringify({
      operation, path: geometry.get(args[0]), transform: Array.from(ctx.getTransform().toFloat64Array()),
      alpha: ctx.globalAlpha, paint: operation === 'fill' ? ctx.fillStyle : ctx.strokeStyle,
      ...(operation === 'stroke' ? { width: ctx.lineWidth, cap: ctx.lineCap, join: ctx.lineJoin,
        miter: ctx.miterLimit, dash: ctx.getLineDash(), dashOffset: ctx.lineDashOffset } : {}),
    }));
    records.set(ctx.canvas, commands);
  };
  prototype.fill = new Proxy(fill, { apply(target, ctx, args) {
    capture(ctx, args, 'fill'); return Reflect.apply(target, ctx, args);
  } });
  prototype.stroke = new Proxy(stroke, { apply(target, ctx, args) {
    capture(ctx, args, 'stroke'); return Reflect.apply(target, ctx, args);
  } });
  return {
    trace: (canvas: HTMLCanvasElement) => JSON.stringify(records.get(canvas)),
    count: (canvas: HTMLCanvasElement) => records.get(canvas)?.length ?? 0,
    stop: () => { prototype.fill = fill; prototype.stroke = stroke; },
  };
}

function captioned(title: string, canvas: HTMLCanvasElement): HTMLElement {
  const figure = document.createElement('figure');
  const caption = document.createElement('figcaption');
  caption.textContent = title;
  figure.append(caption, canvas);
  return figure;
}

export async function showFurnishingReview() {
  const style = document.createElement('style');
  style.textContent = `
    body{margin:0;padding:32px;background:#171e21;color:#f3ecd7;font:16px "Avenir Next",sans-serif}
    [hidden]{display:none!important}
    h1{font-size:38px;margin:6px 0 10px;letter-spacing:-1px}
    h2{font-size:22px;margin:24px 0 14px}
    p{color:#c4c7bb;margin:0 0 24px;max-width:900px}
    .kicker{color:#efb679;letter-spacing:3px;font-size:12px;font-weight:700}
    .catalog{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
    .card{border-top:1px solid #596258;padding-top:12px}
    .card header{font-weight:600;font-size:16px}
    .card small{color:#b8bcaf;display:block;margin:4px 0 12px}
    .pair{display:flex;gap:8px}.pair canvas{width:128px;height:128px}
    figure{margin:0}figcaption{margin:0 0 10px;color:#c4c7bb}
    .maps{display:grid;grid-template-columns:1fr 1fr;gap:24px}
    .maps canvas{width:100%;height:auto;display:block}
    #zooms figure{margin:20px 0}#zooms canvas{display:block}
  `;
  document.head.append(style);
  document.body.replaceChildren();
  const kicker = document.createElement('div');
  kicker.className = 'kicker'; kicker.textContent = 'DUNGEON FOLIO / FURNISHINGS 1.1';
  const title = document.createElement('h1'); title.textContent = 'A place to stay.';
  const introduction = document.createElement('p');
  introduction.textContent = 'Sixteen additions for lived-in halls, quiet chapels and roadside camps. Warm timber, blue canvas, green leaves and cool stone. New artwork awaiting owner review.';
  document.body.append(kicker, title, introduction);
  const catalog = document.createElement('section'); catalog.id = 'catalog';
  for (const [label, defs] of [
    ['16 new furnishings / color and print', FOLIO_FURNISHINGS.slice(8)],
    ['8 approved originals / unchanged', FOLIO_FURNISHINGS.slice(0, 8)],
  ] as const) {
    const heading = document.createElement('h2'); heading.textContent = label;
    const grid = document.createElement('div'); grid.className = 'catalog';
    for (const def of defs) {
      const card = document.createElement('article'); card.className = 'card';
      const heading = document.createElement('header'); heading.textContent = def.name.replace('Folio ', '');
      const detail = document.createElement('small'); detail.textContent = `${def.category} / scale ${def.defaultScale}`;
      const pair = document.createElement('div'); pair.className = 'pair';
      const map = catalogMap(32);
      map.meta = { ...map.meta, width: 4, height: 4 };
      map.tiles = map.tiles.slice(0, 4).map(row => row.slice(0, 4));
      map.stamps = [{ ...map.stamps!.find(stamp => stamp.stampId === def.id)!, x: 1.5, y: 1.5 }];
      for (const printMode of [false, true]) {
        pair.append(renderMapToCanvas(map, { tileSize: 32, themeId: map.meta.theme, printMode }));
      }
      card.append(heading, detail, pair); grid.append(card);
    }
    catalog.append(heading, grid);
  }
  const map = buildFolioCatalogReference().levels[0];
  const options = { tileSize: 32, themeId: map.meta.theme };
  const maps = document.createElement('section'); maps.id = 'maps'; maps.className = 'maps'; maps.hidden = true;
  maps.append(
    captioned("The Wayfarer's Refuge / DM", renderMapToCanvas(map, options)),
    captioned('Player / private chest and note excluded', renderMapToCanvas(map, { ...options, viewMode: 'player' })),
    captioned('Print / monochrome companion', renderMapToCanvas(map, { ...options, printMode: true, viewMode: 'player' })),
    captioned('SVG / player output', await svgCanvas(map)),
  );
  const zooms = document.createElement('section'); zooms.id = 'zooms'; zooms.hidden = true;
  for (const tileSize of [8, 16, 32, 64]) {
    zooms.append(captioned(`${tileSize / 32 * 100}% / ${tileSize} pixels per cell`,
      renderMapToCanvas(map, { ...options, tileSize, viewMode: 'player' })));
  }
  document.body.append(catalog, maps, zooms);
}
