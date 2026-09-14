import type { DungeonMap, Token, TokenKind } from '../types/map';
import { FOLIO_TOKENS } from '../assets/folio-tokens-v1/catalog';
import { drawFolioToken, FOLIO_TOKEN_FRAMES } from '../utils/folioTokenRender';
import { buildFolioTokenReference } from '../utils/folioTokenReference';
import { renderMapToCanvas } from '../utils/renderMap';
import { buildMapSVG } from '../utils/export';
import { getTheme } from '../themes';

const kinds: TokenKind[] = ['player', 'npc', 'monster'];

function matrixMap(tileSize: number, size: number): DungeonMap {
  const map = buildFolioTokenReference().levels[0];
  return {
    ...map, meta: { ...map.meta, width: 9, height: 9, tileSize },
    tiles: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ({ type: 'floor' }))),
    notes: [], stamps: [], fogEnabled: false, initiative: [],
    tokens: FOLIO_TOKENS.flatMap((icon, row) => kinds.map((kind, column) => ({
      id: row * 3 + column, kind, label: icon.name, icon: icon.id, x: column * 3, y: row * 3, size,
    }))),
  };
}

async function svgCanvas(map: DungeonMap) {
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
  } finally { URL.revokeObjectURL(url); }
}

function delta(a: HTMLCanvasElement, b: HTMLCanvasElement, token: Token, tileSize: number) {
  const side = tileSize * (token.size ?? 1);
  const left = a.getContext('2d')!.getImageData(token.x * tileSize, token.y * tileSize, side, side).data;
  const right = b.getContext('2d')!.getImageData(token.x * tileSize, token.y * tileSize, side, side).data;
  let total = 0, maximum = 0;
  for (let i = 0; i < left.length; i++) {
    const difference = Math.abs(left[i] - right[i]);
    total += difference;
    maximum = Math.max(maximum, difference);
  }
  return { mean: total / left.length, maximum };
}

export async function compareTokens() {
  const results = [];
  for (const tileSize of [16, 24, 32, 64]) for (const size of [1, 2, 3]) {
    const map = matrixMap(tileSize, size);
    const options = { tileSize, themeId: map.meta.theme };
    const raster = renderMapToCanvas(map, options);
    const editor = renderMapToCanvas({ ...map, tokens: [] }, options);
    const print = renderMapToCanvas(map, { ...options, printMode: true });
    const editorPrint = renderMapToCanvas({ ...map, tokens: [] }, { ...options, printMode: true });
    const svg = await svgCanvas(map);
    for (const token of map.tokens!) {
      drawFolioToken(editor.getContext('2d')!, token, tileSize);
      drawFolioToken(editorPrint.getContext('2d')!, token, tileSize, true);
    }
    for (const token of map.tokens!) {
      results.push({ tileSize, size, icon: token.icon, kind: token.kind,
        editor: delta(raster, editor, token, tileSize), print: delta(print, editorPrint, token, tileSize),
        svg: delta(raster, svg, token, tileSize) });
    }
  }
  return results;
}

function tokenCanvas(icon: string, kind: TokenKind, side: number, printMode = false) {
  const canvas = document.createElement('canvas');
  canvas.width = side * 2; canvas.height = side * 2;
  canvas.style.width = `${side}px`; canvas.style.height = `${side}px`;
  drawFolioToken(canvas.getContext('2d')!, { id: 1, x: 0, y: 0, kind, label: '', icon }, side * 2, printMode);
  return canvas;
}

function captioned(title: string, canvas: HTMLCanvasElement) {
  const figure = document.createElement('figure');
  const caption = document.createElement('figcaption');
  caption.textContent = title;
  figure.append(caption, canvas);
  return figure;
}

export async function showTokenReview() {
  document.title = 'Dungeon Folio | Token reference';
  const style = document.createElement('style');
  style.textContent = `
    *{box-sizing:border-box}body{margin:0;padding:40px;background:#17232c;color:#fff4da;font:16px "Avenir Next",sans-serif}
    [hidden]{display:none!important}h1{font-size:48px;line-height:1.05;letter-spacing:-1.5px;margin:14px 0}
    h2{font-size:26px;margin:0 0 8px}p{color:#bfcad0;line-height:1.6;max-width:760px}
    .eyebrow{font-size:12px;letter-spacing:3px;color:#e6b781;font-weight:700}
    nav{display:flex;gap:8px;flex-wrap:wrap;margin:28px 0}
    button{font:inherit;background:transparent;border:1px solid #65757e;border-radius:6px;padding:10px 18px;color:#fff4da;cursor:pointer}
    button[aria-pressed=true]{background:#fff4da;color:#17232c}button:focus-visible{outline:3px solid #79bcf0;outline-offset:3px}
    .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.card{padding:24px;background:#22323e;border:1px solid #50616b;border-radius:12px}
    .hero{display:flex;justify-content:center;padding:12px 0 20px}.card p{font-size:14px;min-height:68px}
    .sizes{display:flex;gap:12px;align-items:center;margin-top:20px}.sizes span{font-size:12px;color:#bfcad0}
    .print{display:flex;align-items:center;justify-content:space-between;padding:12px;background:#fff;color:#17232c;border-radius:6px;margin-top:20px}
    figure{margin:0}figcaption{font-size:14px;margin:0 0 12px;color:#c9d5d9}.maps{display:grid;grid-template-columns:1fr 1fr;gap:24px}
    .maps canvas{width:100%;height:auto}.matrix{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
    .matrix figure{padding:20px;background:#22323e;border-radius:8px;text-align:center}
    .matrix .pair{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}.gray{filter:grayscale(1);background:#eee;border-radius:6px}
    .scales figure{margin:28px 0}.scales canvas{max-width:100%;height:auto}
    @media(max-width:700px){body{padding:22px}h1{font-size:36px}.cards,.maps,.matrix{grid-template-columns:1fr}.card p{min-height:0}}
  `;
  document.head.append(style);
  document.body.replaceChildren();
  const eyebrow = document.createElement('div');
  eyebrow.className = 'eyebrow'; eyebrow.textContent = 'DUNGEON FOLIO / TOKEN STUDY 01';
  const title = document.createElement('h1'); title.textContent = 'A face for every encounter.';
  const description = document.createElement('p');
  description.textContent = 'Three original silhouettes, cut in dark ink against warm ivory. Shape carries affiliation; color reinforces it. This is a visual reference for approval, not the full twelve-token kit.';
  const nav = document.createElement('nav'); nav.setAttribute('aria-label', 'Review sections');
  const sections = ['reference', 'affiliations', 'maps', 'scales'];
  for (const section of sections) {
    const button = document.createElement('button');
    button.textContent = section[0].toUpperCase() + section.slice(1);
    button.setAttribute('aria-pressed', String(section === 'reference'));
    button.onclick = () => {
      for (const id of sections) document.getElementById(id)!.hidden = id !== section;
      for (const sibling of nav.children) sibling.setAttribute('aria-pressed', String(sibling === button));
    };
    nav.append(button);
  }
  document.body.append(eyebrow, title, description, nav);
  const reference = document.createElement('section'); reference.id = 'reference'; reference.className = 'cards';
  const stories = [
    'A split visor and broad shield. Solid, upright proportions keep the defender readable in a crowded room.',
    'An open hood, traveling cloak and hooked staff. A quiet human figure for guides, travelers and spellcasters.',
    'Swept horns, a hooked jaw and a serrated neck. An asymmetric creature profile, not another humanoid badge.',
  ];
  FOLIO_TOKENS.forEach((icon, index) => {
    const card = document.createElement('article'); card.className = 'card';
    const hero = document.createElement('div'); hero.className = 'hero'; hero.append(tokenCanvas(icon.id, kinds[index], 160));
    const heading = document.createElement('h2'); heading.textContent = icon.name.replace('Folio ', '');
    const story = document.createElement('p'); story.textContent = stories[index];
    const sizes = document.createElement('div'); sizes.className = 'sizes';
    const label = document.createElement('span'); label.textContent = '32 / 24 / 16 px';
    sizes.append(tokenCanvas(icon.id, kinds[index], 32), tokenCanvas(icon.id, kinds[index], 24), tokenCanvas(icon.id, kinds[index], 16), label);
    const print = document.createElement('div'); print.className = 'print';
    print.append('Print companion', tokenCanvas(icon.id, kinds[index], 56, true));
    card.append(hero, heading, story, sizes, print); reference.append(card);
  });
  const affiliations = document.createElement('section'); affiliations.id = 'affiliations'; affiliations.className = 'matrix'; affiliations.hidden = true;
  for (const icon of FOLIO_TOKENS) for (const kind of kinds) {
    const figure = document.createElement('figure');
    const caption = document.createElement('figcaption'); caption.textContent = `${icon.name.replace('Folio ', '')} / ${FOLIO_TOKEN_FRAMES[kind].label}`;
    const pair = document.createElement('div'); pair.className = 'pair';
    const gray = tokenCanvas(icon.id, kind, 96); gray.className = 'gray';
    pair.append(tokenCanvas(icon.id, kind, 96), gray, tokenCanvas(icon.id, kind, 96, true));
    figure.append(caption, pair); affiliations.append(figure);
  }
  const map = buildFolioTokenReference().levels[0];
  const options = { tileSize: 32, themeId: map.meta.theme };
  const maps = document.createElement('section'); maps.id = 'maps'; maps.className = 'maps'; maps.hidden = true;
  maps.append(
    captioned('The Lantern Watch / DM', renderMapToCanvas(map, options)),
    captioned('Player / hidden lookout excluded', renderMapToCanvas(map, { ...options, viewMode: 'player' })),
    captioned('Print / player-safe monochrome', renderMapToCanvas(map, { ...options, printMode: true, viewMode: 'player' })),
    captioned('SVG / player output', await svgCanvas(map)),
  );
  const scales = document.createElement('section'); scales.id = 'scales'; scales.className = 'scales'; scales.hidden = true;
  for (const tileSize of [16, 24, 32, 64]) scales.append(captioned(`${tileSize}px per cell / ${Math.round(tileSize / 32 * 100)}%`,
    renderMapToCanvas(map, { ...options, tileSize, viewMode: 'player' })));
  document.body.append(reference, affiliations, maps, scales);
}
