import { ALL_TILE_TYPES, isBuiltInTileType } from '../types/map';
import type { BuiltInTileType } from '../types/map';
import { drawPrintToken } from '../utils/printTokenRender';
import { LAUNCH_SAMPLES, buildLaunchSample } from '../utils/launchSamples';
import { renderMapToCanvas } from '../utils/renderMap';
import { renderCreationPreviews } from '../utils/projectCreation';
import { projectForAudience } from '../utils/audienceProjection';
import { planExport } from '../utils/exportPlan';
import { drawPrintTile, printTileSVG } from '../themes/printMode';

const printTypes: BuiltInTileType[] = ['empty', ...ALL_TILE_TYPES];

function pixels(canvas: HTMLCanvasElement) {
  return canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
}

function difference(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  if (a.length !== b.length) throw new Error('Mismatched raster dimensions.');
  let total = 0, maximum = 0;
  for (let i = 0; i < a.length; i++) {
    const delta = Math.abs(a[i] - b[i]);
    total += delta; maximum = Math.max(maximum, delta);
  }
  return { maximum, mean: total / a.length };
}

async function decodeImage(url: string) {
  const image = new Image(); image.src = url; await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  canvas.getContext('2d')!.drawImage(image, 0, 0);
  return canvas;
}

export async function compareLaunchArt() {
  const previews = [];
  const overlaps = [];
  const geometry = [];
  for (const summary of LAUNCH_SAMPLES) {
    const project = buildLaunchSample(summary.id), map = project.levels[0];
    const url = (await renderCreationPreviews(project, new AbortController().signal, 'player'))[0];
    const expected = renderMapToCanvas(map, { tileSize: 24, themeId: summary.themeId, viewMode: 'player' });
    previews.push({ id: summary.id, ...difference(pixels(await decodeImage(url)), pixels(expected)) });
    for (const pagePresetId of ['a4', 'letter']) for (const inchesPerCell of [0.25, 1]) {
      const plan = planExport(24, 24, { dpi: 300, pagePresetId, inchesPerCell });
      // A crossing of two page windows, including a non-cell-aligned boundary.
      const x = Math.min(plan.stepX, 8 * plan.tileSize + 17);
      const options = { tileSize: plan.tileSize, themeId: summary.themeId, printMode: true, viewMode: 'player' as const };
      const first = renderMapToCanvas(map, { ...options, region: { x: x - 100, y: 10 * plan.tileSize, width: 175, height: 600 } });
      const second = renderMapToCanvas(map, { ...options, region: { x, y: 10 * plan.tileSize, width: 175, height: 600 } });
      const left = first.getContext('2d')!.getImageData(100, 0, 75, 600).data;
      const right = second.getContext('2d')!.getImageData(0, 0, 75, 600).data;
      overlaps.push({ id: summary.id, pagePresetId, inchesPerCell, pages: plan.pages, ...difference(left, right) });
      first.width = second.width = 0;
    }
    const print = renderMapToCanvas(map, { tileSize: 32, themeId: summary.themeId, printMode: true, viewMode: 'player' });
    const data = pixels(print);
    let coloredPixels = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] !== data[i + 1] || data[i + 1] !== data[i + 2]) coloredPixels++;
    geometry.push({ id: summary.id, coloredPixels });
  }
  const map = buildLaunchSample('launch-lantern-crypt').levels[0];
  const safe = projectForAudience(map).map;
  const tileContext = {
    getTileBaseType: (x: number, y: number) => {
      const type = safe.tiles[y]?.[x]?.type;
      return type && isBuiltInTileType(type) ? type : undefined;
    },
    getFloorMaterial: (x: number, y: number) => safe.tiles[y]?.[x]?.floorMaterial,
  };
  const shapes = [];
  for (const size of [16, 32, 75, 300]) {
    for (const type of printTypes) {
      const direct = document.createElement('canvas');
      direct.width = direct.height = size;
      drawPrintTile(direct.getContext('2d')!, type, 0, 0, size, tileContext);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
        printTileSVG(type, 0, 0, size, tileContext) + '</svg>';
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      try {
        shapes.push({ type, size, ...difference(pixels(direct), pixels(await decodeImage(url))) });
      } finally { URL.revokeObjectURL(url); }
    }
  }
  return { previews, overlaps, geometry, shapes };
}

function section(id: string, title: string, detail: string) {
  const node = document.createElement('section'); node.id = id;
  const heading = document.createElement('h2'); heading.textContent = title;
  const description = document.createElement('p'); description.textContent = detail;
  node.append(heading, description); document.body.append(node);
  return node;
}

function figure(title: string, canvas: HTMLCanvasElement) {
  const node = document.createElement('figure');
  const label = document.createElement('figcaption'); label.textContent = title;
  const image = new Image(); image.src = canvas.toDataURL(); image.alt = title;
  node.append(image, label);
  canvas.width = canvas.height = 0;
  return node;
}

export function showLaunchArt() {
  document.title = 'Launch atlas | Print companions and encounters';
  document.head.insertAdjacentHTML('beforeend', `<style>
    *{box-sizing:border-box}body{margin:0;padding:48px;background:#e9e5dc;color:#202824;font:16px "Avenir Next",sans-serif}
    h1,h2{font-family:Georgia,serif;font-weight:400}h1{font-size:62px;letter-spacing:-2px;margin:12px 0}
    h2{font-size:36px;margin:0 0 12px}p{max-width:820px;line-height:1.6;color:#47534b}
    .eyebrow{font-size:12px;letter-spacing:3px;font-weight:700}nav{display:flex;gap:24px;margin:30px 0}
    a{color:#204d42}section{border-top:2px solid #263e34;padding-top:32px;margin-top:52px}
    .tiles{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}.tile{background:white;padding:18px;text-align:center}
    .tile svg{display:block;width:72px;height:72px;margin:0 auto 14px}.tile span{font-size:12px;display:block}
    .map-pair,.paper-pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}
    figure{margin:0}figure img{display:block;width:100%;height:auto;background:white}
    figcaption{font-size:13px;line-height:1.5;padding:12px 0 24px}
    .tokens{display:flex;flex-wrap:wrap;gap:24px}.tokens figure{width:110px}
    .paper-pair img{border:1px solid #aaa}.note{border-left:3px solid #637b68;padding-left:20px}
    @media(max-width:700px){body{padding:22px}h1{font-size:40px}.tiles{grid-template-columns:repeat(3,1fr)}.map-pair,.paper-pair{grid-template-columns:1fr}}
    @media print{body{background:white;padding:0}nav{display:none}section{break-before:page}}
  </style>`);
  document.body.innerHTML = `<div class="eyebrow">DUNGEON MAPPER / LAUNCH ATLAS / 01</div>
    <h1>Three places. One printed language.</h1>
    <p>Original monochrome map companions and three editable encounters. Clear approaches,
    open encounter spaces and quieter detail let the important marks carry the map.</p>
    <p class="note">Artwork for review, not a record of owner or physical-printer approval.
    Player views omit private notes and hidden actors. Print at actual size, never fit to page.</p>
    <nav><a href="#companions">Print key</a><a href="#launch-lantern-crypt">Crypt</a>
    <a href="#launch-alder-crossing">Crossing</a><a href="#launch-kestrel-bay">Ship</a><a href="#paper">Paper scale</a></nav>`;
  const key = section('companions', 'A pen-and-ink map key.', 'Stone, wood, earth, rock and water remain distinct without color. Shared walls lose their internal contours. Doors, locks and stairs use drawn symbols, not fonts.');
  const tiles = document.createElement('div'); tiles.className = 'tiles';
  const items = printTypes.map(type => ({ type, label: type.replaceAll('-', ' '), material: undefined as string | undefined }));
  items.push({ type: 'floor', label: 'worn wood', material: 'folio-worn-wood-v1' },
    { type: 'floor', label: 'earth', material: 'folio-earth-v1' });
  for (const item of items) {
    const card = document.createElement('div'); card.className = 'tile';
    const art = printTileSVG(item.type, 0, 0, 32, { getTileBaseType: () => undefined, getFloorMaterial: () => item.material });
    card.innerHTML = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">${art}</svg><span>${item.label}</span>`;
    tiles.append(card);
  }
  key.append(tiles);
  const tokens = document.createElement('div'); tokens.className = 'tokens';
  for (const icon of ['folio-token-v1-warden', 'warrior']) for (const kind of ['player', 'npc', 'monster'] as const) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 160;
    drawPrintToken(canvas.getContext('2d')!, { id: 1, x: 0, y: 0, label: '', kind, icon }, 160);
    tokens.append(figure(`${icon === 'warrior' ? 'Legacy' : 'Folio'} / ${kind}`, canvas));
  }
  key.append(tokens);
  for (const summary of LAUNCH_SAMPLES) {
    const map = buildLaunchSample(summary.id).levels[0];
    const node = section(summary.id, summary.name, summary.description);
    const pair = document.createElement('div'); pair.className = 'map-pair';
    pair.append(figure('Player / fit-to-map color', renderMapToCanvas(map, { tileSize: 32, themeId: summary.themeId, viewMode: 'player' })),
      figure('Player / monochrome print companion', renderMapToCanvas(map, { tileSize: 75, themeId: summary.themeId, printMode: true, viewMode: 'player' })));
    node.append(pair);
  }
  const paper = section('paper', 'Same map. Real paper sizes.', 'A4 and US Letter at 300 DPI, 0.25 inch per cell, half-inch margins. The whole 24-cell map measures 6 x 6 inches. For miniatures, use 1 inch per cell and the existing overlapping page downloads.');
  const pair = document.createElement('div'); pair.className = 'paper-pair';
  const map = buildLaunchSample('launch-lantern-crypt').levels[0];
  for (const pagePresetId of ['a4', 'letter']) {
    const plan = planExport(24, 24, { dpi: 300, pagePresetId, inchesPerCell: 0.25 });
    const canvas = document.createElement('canvas'); canvas.width = plan.pageWidth; canvas.height = plan.pageHeight;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const mapCanvas = renderMapToCanvas(map, { tileSize: plan.tileSize, themeId: map.meta.theme!, printMode: true, viewMode: 'player' });
    ctx.drawImage(mapCanvas, plan.margin, plan.margin); mapCanvas.width = 0;
    pair.append(figure(`${pagePresetId.toUpperCase()} / ${plan.pageWidth} x ${plan.pageHeight} px / 300 DPI`, canvas));
  }
  paper.append(pair);
  const tactical = section('tactical', 'The table-scale detail.', 'One-inch cells at 300 DPI. A cropped view of the crypt doorway, wall junction and basin.');
  const crop = renderMapToCanvas(map, { tileSize: 300, themeId: map.meta.theme!, printMode: true, viewMode: 'player',
    region: { x: 7 * 300, y: 9 * 300, width: 2100, height: 1200 } });
  tactical.append(figure('7 x 4 cells / intended output 7 x 4 inches', crop));
}
