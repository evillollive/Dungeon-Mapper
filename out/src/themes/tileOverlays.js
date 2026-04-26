/**
 * Tile-identification overlays for standard (non-print) mode.
 *
 * Draws print-mode-inspired glyphs on top of themed tiles so each tile type
 * is instantly recognisable regardless of the active theme.  The overlays use
 * a semi-transparent contrasting colour (white on dark backgrounds, black on
 * light ones) so the underlying theme artwork still shows through.
 *
 * Tiles that are already visually distinctive in every theme — empty, floor,
 * wall, water, pillar, and secret-door (which already has an "S") — are
 * intentionally skipped.
 */
/* -------------------------------------------------------------------------- */
/*  Colour helpers                                                            */
/* -------------------------------------------------------------------------- */
/** Luminance threshold: values above this get a dark overlay, below get light. */
const LUMINANCE_THRESHOLD = 0.45;
/** Return relative luminance (0 – 1) from a hex colour string (sRGB-aware). */
function getLuminance(hex) {
    const h = hex.replace('#', '');
    const linearize = (v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    const r = linearize(parseInt(h.slice(0, 2), 16) / 255);
    const g = linearize(parseInt(h.slice(2, 4), 16) / 255);
    const b = linearize(parseInt(h.slice(4, 6), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** Choose a semi-transparent foreground that contrasts with `bgHex`. */
function contrastFg(bgHex) {
    return getLuminance(bgHex) > LUMINANCE_THRESHOLD
        ? 'rgba(0,0,0,0.5)'
        : 'rgba(255,255,255,0.5)';
}
/* -------------------------------------------------------------------------- */
/*  Overlay drawing                                                           */
/* -------------------------------------------------------------------------- */
/**
 * Draw a small identifying glyph on top of a themed tile.
 *
 * Call this *after* the theme's `drawTile` so the glyph composites over the
 * themed artwork.  `bgColor` should be the theme's `tileColors[type]` value
 * so the contrast helper can pick a readable overlay colour.
 */
export function drawTileOverlay(ctx, type, x, y, size, bgColor) {
    // Skip tiles that don't need overlays.
    if (type === 'empty' ||
        type === 'floor' ||
        type === 'wall' ||
        type === 'secret-door' ||
        type === 'water' ||
        type === 'pillar') {
        return;
    }
    const px = x * size;
    const py = y * size;
    const cx = px + size / 2;
    const cy = py + size / 2;
    const s = size;
    const fg = contrastFg(bgColor);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    switch (type) {
        /* ---- Doors: "D" with a diagonal strikethrough ---- */
        case 'door-h':
        case 'door-v': {
            const fontSize = Math.max(6, Math.floor(s * 0.5));
            ctx.font = `bold ${fontSize}px "Courier New", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = fg;
            ctx.fillText('D', cx, cy + 1);
            // Diagonal strikethrough.
            ctx.strokeStyle = fg;
            ctx.lineWidth = Math.max(1, s * 0.08);
            ctx.beginPath();
            ctx.moveTo(px + s * 0.2, py + s * 0.8);
            ctx.lineTo(px + s * 0.8, py + s * 0.2);
            ctx.stroke();
            break;
        }
        /* ---- Stairs Up: upward-pointing triangle ---- */
        case 'stairs-up': {
            const fontSize = Math.max(6, Math.floor(s * 0.55));
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = fg;
            ctx.fillText('▲', cx, cy);
            break;
        }
        /* ---- Stairs Down: downward-pointing triangle ---- */
        case 'stairs-down': {
            const fontSize = Math.max(6, Math.floor(s * 0.55));
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = fg;
            ctx.fillText('▼', cx, cy);
            break;
        }
        /* ---- Trap: "T" with a diagonal strikethrough ---- */
        case 'trap': {
            const fontSize = Math.max(6, Math.floor(s * 0.5));
            ctx.font = `bold ${fontSize}px "Courier New", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = fg;
            ctx.fillText('T', cx, cy + 1);
            ctx.strokeStyle = fg;
            ctx.lineWidth = Math.max(1, s * 0.08);
            ctx.beginPath();
            ctx.moveTo(px + s * 0.2, py + s * 0.8);
            ctx.lineTo(px + s * 0.8, py + s * 0.2);
            ctx.stroke();
            break;
        }
        /* ---- Treasure: "$" sign ---- */
        case 'treasure': {
            const fontSize = Math.max(6, Math.floor(s * 0.55));
            ctx.font = `bold ${fontSize}px "Courier New", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = fg;
            ctx.fillText('$', cx, cy + 1);
            break;
        }
        /* ---- Start: five-pointed star ---- */
        case 'start': {
            const r = s * 0.28;
            const r2 = r * 0.45;
            ctx.fillStyle = fg;
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const angle = -Math.PI / 2 + (i * Math.PI) / 5;
                const radius = i % 2 === 0 ? r : r2;
                const sx = cx + Math.cos(angle) * radius;
                const sy = cy + Math.sin(angle) * radius;
                if (i === 0)
                    ctx.moveTo(sx, sy);
                else
                    ctx.lineTo(sx, sy);
            }
            ctx.closePath();
            ctx.fill();
            break;
        }
    }
    ctx.restore();
}
