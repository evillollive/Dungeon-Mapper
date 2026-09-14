import type { Token, TokenKind } from '../types/map';
import { FOLIO_TOKEN_BY_ID } from '../assets/folio-tokens-v1/catalog';
import { sanitizeColor } from './svgColor';

export const FOLIO_TOKEN_INK = '#202b33';
export const FOLIO_TOKEN_PAPER = '#fff4da';
export const FOLIO_TOKEN_FRAMES = {
  player: {
    label: 'Party shield', color: '#397cbe',
    outline: 'M256 42L430 112L414 286Q394 394 256 468Q118 394 98 286L82 112Z',
    field: 'M256 76L396 134L382 282Q366 368 256 430Q146 368 130 282L116 134Z',
    mark: 'M256 58L272 78L256 98L240 78Z',
  },
  npc: {
    label: 'NPC round seal', color: '#39846f',
    outline: 'M256 44A212 212 0 1 1 256 468A212 212 0 1 1 256 44Z',
    field: 'M256 78A178 178 0 1 1 256 434A178 178 0 1 1 256 78Z',
    mark: 'M218 56H240V78H218ZM272 56H294V78H272Z',
  },
  monster: {
    label: 'Hostile hexagon', color: '#bc503d',
    outline: 'M256 42L438 150V362L256 470L74 362V150Z',
    field: 'M256 82L404 170V342L256 430L108 342V170Z',
    mark: 'M256 54L284 82L270 96L256 82L242 96L228 82Z',
  },
} satisfies Record<TokenKind, { label: string; color: string; outline: string; field: string; mark: string }>;

export interface TokenArtPath {
  path: string;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  transform?: { x: number; y: number; scale: number };
}

export function folioTokenPaths(token: Pick<Token, 'icon' | 'kind' | 'color'>, printMode = false): TokenArtPath[] | null {
  const icon = token.icon ? FOLIO_TOKEN_BY_ID.get(token.icon) : undefined;
  if (!icon) return null;
  const frame = FOLIO_TOKEN_FRAMES[token.kind];
  const ink = printMode ? '#000000' : FOLIO_TOKEN_INK;
  const paper = printMode ? '#ffffff' : FOLIO_TOKEN_PAPER;
  const scale = icon.glyphScale ?? 0.66;
  const inset = Math.round(256 * (1 - scale) * 100) / 100;
  return [
    { path: frame.outline, fill: printMode ? '#ffffff' : sanitizeColor(token.color, frame.color), stroke: ink, strokeWidth: 14 },
    { path: frame.field, fill: paper, stroke: ink, strokeWidth: 8 },
    { path: icon.path, fill: ink, transform: { x: inset, y: Math.round((inset + 5.12) * 100) / 100, scale } },
    { path: frame.mark, fill: ink },
  ];
}

// Only bundled paths are admitted, so the cache is bounded by the twelve
// silhouettes and nine frame paths, independent of token count and colors.
const compiledPaths = new Map<string, Path2D>();
function compiled(path: string): Path2D {
  let result = compiledPaths.get(path);
  if (!result) { result = new Path2D(path); compiledPaths.set(path, result); }
  return result;
}

export function drawFolioToken(ctx: CanvasRenderingContext2D, token: Token, tileSize: number, printMode = false): boolean {
  const paths = folioTokenPaths(token, printMode);
  if (!paths) return false;
  const size = Math.max(1, Math.floor(token.size ?? 1));
  ctx.save();
  ctx.translate(token.x * tileSize, token.y * tileSize);
  ctx.scale(tileSize * size / 512, tileSize * size / 512);
  ctx.lineJoin = 'round';
  for (const path of paths) {
    ctx.save();
    if (path.transform) {
      ctx.translate(path.transform.x, path.transform.y);
      ctx.scale(path.transform.scale, path.transform.scale);
    }
    ctx.fillStyle = path.fill;
    ctx.fill(compiled(path.path), 'evenodd');
    if (path.stroke) {
      ctx.strokeStyle = path.stroke;
      ctx.lineWidth = path.strokeWidth!;
      ctx.stroke(compiled(path.path));
    }
    ctx.restore();
  }
  ctx.restore();
  return true;
}

export function folioTokenSVG(token: Token): string | null {
  const paths = folioTokenPaths(token);
  if (!paths) return null;
  return paths.map(path => `<path d="${path.path}" fill="${path.fill}" fill-rule="evenodd"${path.stroke ? ` stroke="${path.stroke}" stroke-width="${path.strokeWidth}" stroke-linejoin="round"` : ''}${path.transform ? ` transform="translate(${path.transform.x} ${path.transform.y}) scale(${path.transform.scale})"` : ''}/>`).join('');
}
