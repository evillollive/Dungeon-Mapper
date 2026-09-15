import type { Token } from '../types/map';
import { drawFolioToken, FOLIO_TOKEN_FRAMES } from './folioTokenRender';
import { ICON_BY_ID } from './iconLibrary';

/** Keep approved Folio glyphs; give older tokens the same non-color affiliations. */
export function drawPrintToken(ctx: CanvasRenderingContext2D, token: Token, tileSize: number): void {
  if (drawFolioToken(ctx, token, tileSize, true)) return;
  const frame = FOLIO_TOKEN_FRAMES[token.kind];
  const size = Math.max(1, Math.floor(token.size ?? 1));
  ctx.save();
  ctx.translate(token.x * tileSize, token.y * tileSize);
  ctx.scale(tileSize * size / 512, tileSize * size / 512);
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 14;
  const outline = new Path2D(frame.outline);
  ctx.fill(outline);
  ctx.stroke(outline);
  ctx.fillStyle = '#000000';
  ctx.fill(new Path2D(frame.mark));
  const icon = token.icon ? ICON_BY_ID.get(token.icon) : undefined;
  if (icon) {
    ctx.translate(102, 108);
    ctx.scale(0.6, 0.6);
    ctx.fill(new Path2D(icon.path));
  } else {
    // Color emoji fonts cannot promise monochrome ink. Keep a readable identifier.
    const initial = (token.icon?.match(/^[a-z0-9]$/i)?.[0] ??
      token.label.match(/[a-z0-9]/i)?.[0] ?? token.kind[0]).toUpperCase();
    ctx.font = 'bold 240px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, 256, 274);
  }
  ctx.restore();
}
