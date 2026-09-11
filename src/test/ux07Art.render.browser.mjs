// Development-only render contact sheet. Run with a Page on the Vite base path.
// Production workflow coverage is in ux07Art.browser.mjs.
export default async function runArtRenderReview(page, { materials = false } = {}) {
  const mediaPath = materials ? 'docs/media/ux07-materials' : 'docs/media/ux07';
  const context = await page.context().browser().newContext({ viewport: { width: 1120, height: 1320 } });
  try {
    const tab = await context.newPage();
    await tab.goto(`${page.url().split('/Dungeon-Mapper/')[0]}/Dungeon-Mapper/`);
    await tab.waitForLoadState('networkidle');
    const measurements = await tab.evaluate(async materials => {
      const { buildFolioReference, buildFolioMaterialsReference } = await import('/Dungeon-Mapper/src/utils/folioReference.ts');
      const { renderMapToCanvas } = await import('/Dungeon-Mapper/src/utils/renderMap.ts');
      const { exportMapSVG } = await import('/Dungeon-Mapper/src/utils/export.ts');
      const { getTheme } = await import('/Dungeon-Mapper/src/themes/index.ts');
      const { folioCacheSize, clearFolioCache } = await import('/Dungeon-Mapper/src/themes/folio-v1/art.ts');
      const { floorMaterialCacheSize, clearFloorMaterialCache } = await import('/Dungeon-Mapper/src/themes/folio-v1/materials.ts');
      const map = (materials ? buildFolioMaterialsReference() : buildFolioReference()).levels[0];
      const theme = getTheme(map.meta.theme);
      const images = [];
      const render = (name, source, opts = {}) => {
        const canvas = renderMapToCanvas(source, { themeId: source.meta.theme, tileSize: 16, ...opts });
        images.push({ name, url: canvas.toDataURL() });
      };
      if (materials) {
        render('Before / approved flagstone', { ...map, tiles: map.tiles.map(row => row.map(tile => ({ ...tile, floorMaterial: undefined }))) });
      } else {
        render('Before / original Dungeon', { ...map, meta: { ...map.meta, theme: 'dungeon' } });
      }
      render(materials ? 'After / wood, earth and flagstone' : 'After / Dungeon Folio v1', map);
      render('Player / projected geography', map, { viewMode: 'player' });
      render('Print / semantic monochrome', map, { printMode: true });
      const nativeCreate = URL.createObjectURL;
      const nativeClick = HTMLAnchorElement.prototype.click;
      let svgBlob;
      try {
        URL.createObjectURL = blob => { svgBlob = blob; return nativeCreate(blob); };
        HTMLAnchorElement.prototype.click = () => {};
        exportMapSVG(map, theme, undefined, { viewMode: 'player' });
      } finally {
        URL.createObjectURL = nativeCreate;
        HTMLAnchorElement.prototype.click = nativeClick;
      }
      const svg = await svgBlob.text();
      if (svg.includes('Cistern sentinel') || svg.includes('A key rests')) throw new Error('Private SVG content');
      const image = new Image();
      image.src = nativeCreate(svgBlob);
      await image.decode();
      const exported = document.createElement('canvas');
      exported.width = 512; exported.height = 512;
      exported.getContext('2d').drawImage(image, 0, 0, 512, 512);
      URL.revokeObjectURL(image.src);
      images.push({ name: 'SVG / native vectors, player output', url: exported.toDataURL() });

      const zooms = [];
      for (const tileSize of [8, 16, 32, 64]) {
        const canvas = renderMapToCanvas(map, { themeId: theme.id, tileSize });
        zooms.push({ zoom: `${tileSize / 32 * 100}%`, url: canvas.toDataURL() });
      }

      const large = { ...map, meta: { ...map.meta, width: 128, height: 128 }, fogEnabled: false,
        tiles: Array.from({ length: 128 }, (_, y) => Array.from({ length: 128 }, (_, x) =>
          ({ type: x % 9 === 0 ? 'wall' : y % 11 === 0 ? 'water' : 'floor',
            floorMaterial: materials ? (x % 2 ? 'folio-worn-wood-v1' : 'folio-earth-v1') : undefined }))) };
      clearFolioCache();
      clearFloorMaterialCache();
      const timings = [];
      for (let i = 0; i < 11; i++) {
        const start = performance.now();
        renderMapToCanvas(large, { themeId: theme.id, tileSize: 16 });
        timings.push(performance.now() - start);
      }
      const cold = timings.shift();
      timings.sort((a, b) => a - b);
      const style = document.createElement('style');
      style.textContent = 'html,body{height:auto!important;overflow:visible!important}body{margin:0;background:#171e21;color:#eee7ce;font:16px sans-serif;padding:24px}h1{margin:0 0 8px}p{margin:0 0 20px;color:#b6baa9}.sheets{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0}figcaption{margin:0 0 8px}img{width:100%;display:block}#zooms{display:none}#zooms figure{margin:20px 0}#zooms img{width:auto;max-width:none}';
      document.head.append(style);
      document.body.replaceChildren();
      const title = document.createElement('h1'); title.textContent = materials ? "The Warden's Rest / floor materials v1" : 'The Quiet Cistern / Dungeon Folio v1';
      const subtitle = document.createElement('p'); subtitle.textContent = materials
        ? 'Worn boards, soft earth, quiet flagstone. Identical movement and sight rules. Material review pending.'
        : 'Same geometry. Quiet floors, continuous walls, explicit player publication. Art reference.';
      document.body.append(title, subtitle);
      const sheets = document.createElement('div'); sheets.className = 'sheets';
      const figure = ({ name, url }) => {
        const element = document.createElement('figure');
        const caption = document.createElement('figcaption'); caption.textContent = name;
        const img = document.createElement('img'); img.src = url;
        element.append(caption, img); return element;
      };
      images.forEach(item => sheets.append(figure(item)));
      document.body.append(sheets);
      const zoomSheet = document.createElement('div'); zoomSheet.id = 'zooms';
      zooms.forEach(({ zoom, url }) => zoomSheet.append(figure({ name: zoom, url })));
      document.body.append(zoomSheet);
      return { coldRenderMs: cold, warmMedianMs: timings[5], warmMaxMs: timings.at(-1), cacheEntries: folioCacheSize(), floorCacheEntries: floorMaterialCacheSize(), dimensions: '128 x 128', tileSize: 16 };
    }, materials);
    await tab.screenshot({ path: `${mediaPath}/contact-sheet.png`, fullPage: true });
    await tab.evaluate(() => {
      document.querySelector('.sheets').style.display = 'none';
      document.querySelector('#zooms').style.display = 'block';
    });
    await tab.screenshot({ path: `${mediaPath}/zoom-sheet.png`, fullPage: true });
    return { browser: context.browser().version(), ...measurements };
  } finally {
    await context.close();
  }
}
