// Dungeon theme: a gritty subterranean crawl — damp stone walls, rough flagged
// floors, iron-bound timber doors, and torchlit gold accents. This carries the
// classic underground dungeon feel that the original "Fantasy" theme depicted.
export const dungeonTheme = {
    id: 'dungeon',
    name: 'Dungeon',
    tiles: [
        { id: 'empty', label: 'Void' }, { id: 'floor', label: 'Flagstone' }, { id: 'wall', label: 'Stone Wall' },
        { id: 'door-h', label: 'Iron Door (H)' }, { id: 'door-v', label: 'Iron Door (V)' },
        { id: 'secret-door', label: 'Secret Door' },
        { id: 'stairs-up', label: 'Stairs Up' }, { id: 'stairs-down', label: 'Stairs Down' },
        { id: 'water', label: 'Underground Pool' }, { id: 'pillar', label: 'Pillar' },
        { id: 'trap', label: 'Trap' }, { id: 'treasure', label: 'Treasure' }, { id: 'start', label: 'Entrance' },
    ],
    emptyTileId: 'empty',
    cssVars: {},
    tileColors: {
        empty: '#0f0f1c', floor: '#8a7a60', wall: '#3a3a3a',
        'door-h': '#6b4f1d', 'door-v': '#6b4f1d',
        'secret-door': '#3a3a3a',
        'stairs-up': '#7a9e7e', 'stairs-down': '#5a7a5e',
        water: '#1a4f7a', pillar: '#5a5a5a', trap: '#8e1e1e',
        treasure: '#d4af37', start: '#2e8b57',
    },
    drawTile(ctx, type, x, y, size) {
        const px = x * size;
        const py = y * size;
        const color = this.tileColors[type];
        ctx.fillStyle = color;
        ctx.fillRect(px, py, size, size);
        ctx.strokeStyle = '#2d3561';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, size, size);
        const cx = px + size / 2;
        const cy = py + size / 2;
        const s = size;
        ctx.lineWidth = 1.5;
        switch (type) {
            case 'empty':
                break;
            case 'floor': {
                // Subtle mortar fleck to suggest rough flagstones.
                ctx.fillStyle = '#2a2418';
                ctx.fillRect(cx - 1, cy - 1, 2, 2);
                break;
            }
            case 'wall': {
                ctx.fillStyle = '#262626';
                ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
                ctx.fillStyle = '#4a4a4a';
                ctx.fillRect(px + 2, py + 2, s - 4, 2);
                ctx.fillRect(px + 2, py + 2, 2, s - 4);
                break;
            }
            case 'secret-door': {
                // Render as a wall, with a faint 'S' overlay for the mapper.
                ctx.fillStyle = '#262626';
                ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
                ctx.fillStyle = '#4a4a4a';
                ctx.fillRect(px + 2, py + 2, s - 4, 2);
                ctx.fillRect(px + 2, py + 2, 2, s - 4);
                const fontSize = Math.max(7, Math.floor(s * 0.6));
                ctx.font = `bold ${fontSize}px "Courier New", monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#c8a84b';
                ctx.fillText('S', cx, cy + 1);
                break;
            }
            case 'door-h': {
                ctx.fillStyle = '#c8a84b';
                ctx.fillRect(px + 2, cy - 2, s - 4, 4);
                ctx.fillStyle = '#0f0f1c';
                ctx.fillRect(cx - 3, cy - 2, 6, 4);
                ctx.strokeStyle = '#c8a84b';
                ctx.beginPath();
                ctx.moveTo(px + 2, cy);
                ctx.lineTo(cx - 4, cy);
                ctx.moveTo(cx + 4, cy);
                ctx.lineTo(px + s - 2, cy);
                ctx.stroke();
                break;
            }
            case 'door-v': {
                ctx.fillStyle = '#c8a84b';
                ctx.fillRect(cx - 2, py + 2, 4, s - 4);
                ctx.fillStyle = '#0f0f1c';
                ctx.fillRect(cx - 2, cy - 3, 4, 6);
                ctx.strokeStyle = '#c8a84b';
                ctx.beginPath();
                ctx.moveTo(cx, py + 2);
                ctx.lineTo(cx, cy - 4);
                ctx.moveTo(cx, cy + 4);
                ctx.lineTo(cx, py + s - 2);
                ctx.stroke();
                break;
            }
            case 'stairs-up': {
                ctx.strokeStyle = '#e0d5c1';
                ctx.lineWidth = 1;
                const steps = 4;
                for (let i = 0; i < steps; i++) {
                    const sy = py + 2 + i * ((s - 4) / steps);
                    const ex = px + 2 + (i + 1) * ((s - 4) / steps);
                    ctx.beginPath();
                    ctx.moveTo(px + 2, sy);
                    ctx.lineTo(ex, sy);
                    ctx.lineTo(ex, sy + (s - 4) / steps);
                    ctx.stroke();
                }
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx + 2, cy - 3);
                ctx.lineTo(cx + 5, cy);
                ctx.lineTo(cx + 2, cy + 3);
                ctx.stroke();
                break;
            }
            case 'stairs-down': {
                ctx.strokeStyle = '#b0c8b0';
                ctx.lineWidth = 1;
                const steps = 4;
                for (let i = 0; i < steps; i++) {
                    const sy = py + s - 2 - i * ((s - 4) / steps);
                    const ex = px + 2 + (i + 1) * ((s - 4) / steps);
                    ctx.beginPath();
                    ctx.moveTo(px + 2, sy);
                    ctx.lineTo(ex, sy);
                    ctx.lineTo(ex, sy - (s - 4) / steps);
                    ctx.stroke();
                }
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx + 2, cy - 3);
                ctx.lineTo(cx + 5, cy);
                ctx.lineTo(cx + 2, cy + 3);
                ctx.stroke();
                break;
            }
            case 'water': {
                ctx.strokeStyle = '#4ab4e8';
                ctx.lineWidth = 1;
                for (let wy = 0; wy < 3; wy++) {
                    const waveY = py + 4 + wy * (s / 3.5);
                    ctx.beginPath();
                    ctx.moveTo(px + 2, waveY);
                    for (let wx = 0; wx < s - 4; wx += 4) {
                        ctx.quadraticCurveTo(px + 2 + wx + 1, waveY - 2, px + 2 + wx + 2, waveY);
                        ctx.quadraticCurveTo(px + 2 + wx + 3, waveY + 2, px + 2 + wx + 4, waveY);
                    }
                    ctx.stroke();
                }
                break;
            }
            case 'pillar': {
                ctx.fillStyle = '#777';
                ctx.beginPath();
                ctx.arc(cx, cy, s / 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#bbb';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(cx, cy, s / 4, 0, Math.PI * 2);
                ctx.stroke();
                break;
            }
            case 'trap': {
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(px + 3, py + 3);
                ctx.lineTo(px + s - 3, py + s - 3);
                ctx.moveTo(px + s - 3, py + 3);
                ctx.lineTo(px + 3, py + s - 3);
                ctx.stroke();
                break;
            }
            case 'treasure': {
                const tw = s * 0.5;
                const th = s * 0.35;
                const tx = cx - tw / 2;
                const ty = cy - th / 2;
                ctx.fillStyle = '#8b6914';
                ctx.fillRect(tx, ty + th * 0.4, tw, th * 0.6);
                ctx.fillStyle = '#d4af37';
                ctx.fillRect(tx, ty, tw, th * 0.5);
                ctx.beginPath();
                ctx.arc(cx, ty + th * 0.25, tw * 0.15, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fff8dc';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(tx, ty + th * 0.4, tw, th * 0.6);
                ctx.strokeRect(tx, ty, tw, th * 0.5);
                break;
            }
            case 'start': {
                ctx.fillStyle = '#50fa7b';
                ctx.beginPath();
                ctx.moveTo(cx, py + 3);
                ctx.lineTo(cx + 4, cy);
                ctx.lineTo(cx + 2, cy);
                ctx.lineTo(cx + 2, py + s - 3);
                ctx.lineTo(cx - 2, py + s - 3);
                ctx.lineTo(cx - 2, cy);
                ctx.lineTo(cx - 4, cy);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#2e8b57';
                ctx.lineWidth = 0.5;
                ctx.stroke();
                break;
            }
        }
    },
};
