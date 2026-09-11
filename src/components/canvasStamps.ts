import type { PlacedStamp, StampDef } from '../types/map';
import { getStampDef } from '../utils/stampCatalog';
import { drawFolioStampShadow, stampPath, stampPaths } from '../utils/folioFurnishingRender';

export function drawPlacedStamp(
  ctx: CanvasRenderingContext2D,
  stamp: PlacedStamp,
  tileSize: number,
  isSelected = false,
  customStampImages?: Map<string, HTMLImageElement>,
  customStamps?: readonly StampDef[],
  printMode = false,
) {
  const def = getStampDef(stamp.stampId, customStamps);
  if (!def) return;
  const renderedPaths = stampPaths(def, printMode);
  drawFolioStampShadow(ctx, def, stamp, tileSize, printMode);
  const cx = (stamp.x + 0.5) * tileSize;
  const cy = (stamp.y + 0.5) * tileSize;
  const drawSize = tileSize * (stamp.scale || 1);

  ctx.save();
  ctx.globalAlpha = stamp.opacity ?? 1;
  ctx.translate(cx, cy);
  if (stamp.rotation) ctx.rotate(stamp.rotation * Math.PI / 180);
  if (stamp.flipX) ctx.scale(-1, 1);
  if (stamp.flipY) ctx.scale(1, -1);
  const vb = def.viewBox.split(/\s+/).map(Number);
  const vbW = vb[2] || 512;
  const vbH = vb[3] || 512;
  const svgScale = drawSize / Math.max(vbW, vbH);
  ctx.translate(-drawSize / 2, -drawSize / 2);
  ctx.scale(svgScale, svgScale);
  if (def.imageDataUrl) {
    const image = customStampImages?.get(stamp.stampId);
    if (image) ctx.drawImage(image, 0, 0, vbW, vbH);
  } else if (renderedPaths && renderedPaths.length > 0) {
    for (const path of renderedPaths) {
      const shape = stampPath(def, path.path);
      if (path.fill) { ctx.fillStyle = path.fill; ctx.fill(shape); }
      if (path.stroke) { ctx.strokeStyle = path.stroke; ctx.lineWidth = path.strokeWidth ?? 1; ctx.stroke(shape); }
    }
  } else if (def.svgPath) {
    const shape = new Path2D(def.svgPath);
    ctx.fillStyle = '#4a4a4a';
    ctx.fill(shape);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = Math.max(1, 2 / svgScale);
    ctx.stroke(shape);
  }
  ctx.restore();

  if (isSelected) {
    ctx.save();
    ctx.strokeStyle = '#ffd400';
    ctx.lineWidth = Math.max(2, tileSize * 0.08);
    ctx.setLineDash([4, 3]);
    const halfDraw = drawSize / 2 + 2;
    ctx.strokeRect(cx - halfDraw, cy - halfDraw, halfDraw * 2, halfDraw * 2);
    ctx.restore();
  }
  if (stamp.locked) {
    ctx.save();
    const badgeSize = Math.max(10, tileSize * 0.25);
    const bx = cx + drawSize / 2 - badgeSize * 0.4;
    const by = cy - drawSize / 2 - badgeSize * 0.1;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.arc(bx, by, badgeSize * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd400';
    ctx.font = `bold ${badgeSize * 0.7}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u{1f512}', bx, by);
    ctx.restore();
  }
}
