/**
 * Lighting & Atmosphere renderer — draws ambient occlusion in wall corners,
 * soft shadows under stamps, and day/night/dusk color grading.
 *
 * All effects are composited onto the existing canvas context as overlays
 * (darken / color tint) so they blend naturally with the tile art beneath.
 * Disabled in print mode by default.
 */

import type { CustomThemeDefinition, LightingAtmosphereSettings, PlacedStamp, Tile } from '../types/map';
import { getSemanticTileType } from './customThemes';

// ── Ambient Occlusion ────────────────────────────────────────────────────

/** Wall-type tile check (wall, pillar, or any custom wall-semantic tile). */
function isWallLike(type: string, customThemes: readonly CustomThemeDefinition[]): boolean {
  const sem = getSemanticTileType(type, customThemes);
  return sem === 'wall' || sem === 'pillar';
}

/**
 * Draws ambient-occlusion darkening in the inner corners of wall tiles.
 * For each non-wall tile, checks its 4 diagonal neighbours; where two
 * adjacent walls form a corner, a radial shadow gradient is drawn into
 * the non-wall tile to simulate light fall-off.
 */
function drawAmbientOcclusion(
  ctx: CanvasRenderingContext2D,
  tiles: Tile[][],
  width: number,
  height: number,
  tileSize: number,
  intensity: number,
  radius: number,
  customThemes: readonly CustomThemeDefinition[],
): void {
  if (intensity <= 0) return;

  const r = Math.max(1, radius * tileSize);
  const alpha = Math.min(1, intensity);

  ctx.save();

  const isWall = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const t = tiles[y]?.[x];
    return t ? isWallLike(t.type, customThemes) : false;
  };

  // Corner direction offsets: [dx wall, dy wall, dx diag wall, dy diag wall, gradient cx offset, gradient cy offset]
  const corners: [number, number, number, number, number, number][] = [
    [-1, 0, -1, -1, 0, 0],     // top-left corner
    [0, -1, 1, -1, 1, 0],      // top-right corner
    [1, 0, 1, 1, 1, 1],        // bottom-right corner
    [0, 1, -1, 1, 0, 1],       // bottom-left corner
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = tiles[y]?.[x];
      if (!tile || isWallLike(tile.type, customThemes)) continue;
      if (tile.type === 'empty') continue;

      const px = x * tileSize;
      const py = y * tileSize;

      for (const [adjX, adjY, diagX, diagY, cxOff, cyOff] of corners) {
        // Need at least one adjacent wall and the diagonal wall to form a corner
        const hasAdj = isWall(x + adjX, y + adjY);
        const hasDiag = isWall(x + diagX, y + diagY);
        // Also check the other adjacent wall that forms the L-shape
        const otherAdjX = diagX - adjX;
        const otherAdjY = diagY - adjY;
        const hasOtherAdj = isWall(x + otherAdjX, y + otherAdjY);

        if ((hasAdj && hasOtherAdj) || (hasAdj && hasDiag) || (hasOtherAdj && hasDiag)) {
          const cx = px + cxOff * tileSize;
          const cy = py + cyOff * tileSize;

          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          grad.addColorStop(0, `rgba(0,0,0,${alpha * 0.6})`);
          grad.addColorStop(0.5, `rgba(0,0,0,${alpha * 0.2})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.fillStyle = grad;
          ctx.fillRect(px, py, tileSize, tileSize);
        }
      }
    }
  }

  ctx.restore();
}

// ── Stamp Shadows ────────────────────────────────────────────────────────

/**
 * Draws soft drop-shadow blobs beneath each placed stamp. The shadow is
 * offset slightly down-right to simulate a top-left light source.
 */
function drawStampShadows(
  ctx: CanvasRenderingContext2D,
  stamps: readonly PlacedStamp[],
  tileSize: number,
  shadowOpacity: number,
  shadowOffset: number,
): void {
  if (shadowOpacity <= 0 || stamps.length === 0) return;

  const offset = shadowOffset * tileSize;

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';

  for (const stamp of stamps) {
    const scale = stamp.scale || 1;
    const drawSize = tileSize * scale;
    const cx = (stamp.x + 0.5) * tileSize + offset;
    const cy = (stamp.y + 0.5) * tileSize + offset;
    const r = drawSize * 0.45;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(0,0,0,${shadowOpacity * 0.7})`);
    grad.addColorStop(0.6, `rgba(0,0,0,${shadowOpacity * 0.25})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ── Color Grading ────────────────────────────────────────────────────────

/** RGBA tint colors for each color grading mode. */
const COLOR_GRADING_TINTS: Record<string, [number, number, number]> = {
  day:   [255, 248, 220],   // warm golden
  night: [20,  30,  80],    // deep blue
  dusk:  [180, 100, 60],    // warm orange-red
};

/**
 * Applies a full-canvas color grading tint overlay. Uses a semi-transparent
 * fill with the mode's tint color to shift the overall mood.
 */
function drawColorGrading(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  mode: string,
  intensity: number,
): void {
  if (mode === 'none' || intensity <= 0) return;

  const tint = COLOR_GRADING_TINTS[mode];
  if (!tint) return;

  ctx.save();
  // Use 'multiply' for night (darkening) and 'overlay' for day/dusk
  ctx.globalCompositeOperation = mode === 'night' ? 'multiply' : 'overlay';
  ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${Math.min(1, intensity)})`;
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.restore();
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Draw the full lighting & atmosphere stack onto the given canvas context.
 *
 * Rendering order:
 * 1. Ambient occlusion (wall corners)
 * 2. Stamp shadows (under placed stamps)
 * 3. Color grading (scene-wide tint)
 *
 * The caller is responsible for setting `ctx.globalAlpha` to the overall
 * opacity before calling (or wrapping in save/restore).
 */
export function drawLightingAtmosphere(
  ctx: CanvasRenderingContext2D,
  tiles: Tile[][],
  width: number,
  height: number,
  tileSize: number,
  settings: LightingAtmosphereSettings,
  stamps: readonly PlacedStamp[],
  customThemes: readonly CustomThemeDefinition[],
): void {
  if (!settings.enabled) return;

  ctx.save();
  ctx.globalAlpha = settings.opacity;

  // 1. Ambient occlusion
  drawAmbientOcclusion(
    ctx, tiles, width, height, tileSize,
    settings.aoIntensity, settings.aoRadius,
    customThemes,
  );

  // 2. Stamp shadows
  drawStampShadows(
    ctx, stamps, tileSize,
    settings.stampShadowOpacity, settings.stampShadowOffset,
  );

  // 3. Color grading
  drawColorGrading(
    ctx, width * tileSize, height * tileSize,
    settings.colorGrading, settings.colorGradingIntensity,
  );

  ctx.restore();
}

// Re-export for testing
export { isWallLike as _isWallLike_test };
export { drawAmbientOcclusion as _drawAO_test };
export { drawStampShadows as _drawStampShadows_test };
export { drawColorGrading as _drawColorGrading_test };
export { COLOR_GRADING_TINTS };
