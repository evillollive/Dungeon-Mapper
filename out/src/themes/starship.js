// Starship theme: the interior of a deep-space vessel — riveted bulkheads,
// metal deck plating, neon blast doors, and humming data cores. This carries
// the classic ship-corridor feel that the original "Sci-Fi" theme depicted.
export const starshipTheme = {
    id: 'starship',
    name: 'Starship',
    tiles: [
        { id: 'empty', label: 'Void' }, { id: 'floor', label: 'Deck' }, { id: 'wall', label: 'Bulkhead' },
        { id: 'door-h', label: 'Blast Door (H)' }, { id: 'door-v', label: 'Blast Door (V)' },
        { id: 'secret-door', label: 'Hidden Hatch' },
        { id: 'stairs-up', label: 'Ladder Up' }, { id: 'stairs-down', label: 'Ladder Down' },
        { id: 'water', label: 'Coolant' }, { id: 'pillar', label: 'Support' },
        { id: 'trap', label: 'Laser Grid' }, { id: 'treasure', label: 'Data Core' }, { id: 'start', label: 'Airlock' },
    ],
    emptyTileId: 'empty',
    cssVars: {},
    tileColors: {
        empty: '#050a0f', floor: '#1a2b3c', wall: '#0d2233',
        'door-h': '#00c8ff', 'door-v': '#00c8ff',
        'secret-door': '#0d2233',
        'stairs-up': '#00ff9f', 'stairs-down': '#00cc7a',
        water: '#0066aa', pillar: '#334466', trap: '#ff0066',
        treasure: '#ff9900', start: '#00ffcc',
    },
    drawTile(ctx, type, x, y, size) {
        const px = x * size;
        const py = y * size;
        ctx.fillStyle = this.tileColors[type];
        ctx.fillRect(px, py, size, size);
        ctx.strokeStyle = '#2d3561';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, size, size);
        const cx = px + size / 2;
        const cy = py + size / 2;
        const s = size;
        switch (type) {
            case 'empty':
                break;
            case 'floor': {
                ctx.strokeStyle = '#2a4060';
                ctx.lineWidth = 0.5;
                const step = Math.max(4, Math.floor(s / 4));
                for (let i = 1; i < 4; i++) {
                    ctx.beginPath();
                    ctx.moveTo(px + i * step, py);
                    ctx.lineTo(px + i * step, py + s);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(px, py + i * step);
                    ctx.lineTo(px + s, py + i * step);
                    ctx.stroke();
                }
                break;
            }
            case 'wall': {
                ctx.strokeStyle = '#00c8ff';
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
                ctx.fillStyle = '#0a1520';
                ctx.fillRect(px + 3, py + 3, s - 6, s - 6);
                break;
            }
            case 'secret-door': {
                // Bulkhead with a subtle 'S' marker.
                ctx.strokeStyle = '#00c8ff';
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
                ctx.fillStyle = '#0a1520';
                ctx.fillRect(px + 3, py + 3, s - 6, s - 6);
                const fontSize = Math.max(7, Math.floor(s * 0.6));
                ctx.font = `bold ${fontSize}px "Courier New", monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#00c8ff';
                ctx.fillText('S', cx, cy + 1);
                break;
            }
            case 'door-h': {
                ctx.fillStyle = '#003050';
                ctx.fillRect(px + 2, cy - 3, (s - 4) / 2 - 2, 6);
                ctx.fillRect(cx + 2, cy - 3, (s - 4) / 2 - 2, 6);
                ctx.strokeStyle = '#00c8ff';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(px + 2, cy - 3, (s - 4) / 2 - 2, 6);
                ctx.strokeRect(cx + 2, cy - 3, (s - 4) / 2 - 2, 6);
                break;
            }
            case 'door-v': {
                ctx.fillStyle = '#003050';
                ctx.fillRect(cx - 3, py + 2, 6, (s - 4) / 2 - 2);
                ctx.fillRect(cx - 3, cy + 2, 6, (s - 4) / 2 - 2);
                ctx.strokeStyle = '#00c8ff';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(cx - 3, py + 2, 6, (s - 4) / 2 - 2);
                ctx.strokeRect(cx - 3, cy + 2, 6, (s - 4) / 2 - 2);
                break;
            }
            case 'stairs-up': {
                ctx.strokeStyle = '#00ff9f';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx, py + 3);
                ctx.lineTo(cx, py + s - 3);
                ctx.moveTo(cx - 3, py + 6);
                ctx.lineTo(cx, py + 3);
                ctx.lineTo(cx + 3, py + 6);
                ctx.stroke();
                break;
            }
            case 'stairs-down': {
                ctx.strokeStyle = '#00cc7a';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx, py + 3);
                ctx.lineTo(cx, py + s - 3);
                ctx.moveTo(cx - 3, py + s - 6);
                ctx.lineTo(cx, py + s - 3);
                ctx.lineTo(cx + 3, py + s - 6);
                ctx.stroke();
                break;
            }
            case 'water': {
                ctx.strokeStyle = '#00e0ff';
                ctx.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                    const wy = py + 4 + i * (s / 3.5);
                    ctx.beginPath();
                    ctx.moveTo(px + 2, wy);
                    for (let wx = 0; wx < s - 4; wx += 4) {
                        ctx.quadraticCurveTo(px + 2 + wx + 1, wy - 2, px + 2 + wx + 2, wy);
                        ctx.quadraticCurveTo(px + 2 + wx + 3, wy + 2, px + 2 + wx + 4, wy);
                    }
                    ctx.stroke();
                }
                break;
            }
            case 'pillar': {
                ctx.strokeStyle = '#00c8ff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(cx, cy, s / 4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#0a1530';
                ctx.beginPath();
                ctx.arc(cx, cy, s / 4 - 1, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'trap': {
                ctx.strokeStyle = '#ff0066';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(px + 3, py + 3);
                ctx.lineTo(px + s - 3, py + s - 3);
                ctx.moveTo(px + s - 3, py + 3);
                ctx.lineTo(px + 3, py + s - 3);
                ctx.stroke();
                ctx.strokeStyle = '#ff006688';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(px + 3, py + 3);
                ctx.lineTo(px + s - 3, py + s - 3);
                ctx.moveTo(px + s - 3, py + 3);
                ctx.lineTo(px + 3, py + s - 3);
                ctx.stroke();
                break;
            }
            case 'treasure': {
                ctx.strokeStyle = '#ff9900';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#ff990044';
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ff9900';
                ctx.fillRect(cx - 1, cy - 1, 2, 2);
                break;
            }
            case 'start': {
                ctx.strokeStyle = '#00ffcc';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#00ffcc';
                ctx.beginPath();
                ctx.moveTo(cx - 2, cy - 3);
                ctx.lineTo(cx + 4, cy);
                ctx.lineTo(cx - 2, cy + 3);
                ctx.closePath();
                ctx.fill();
                break;
            }
        }
    },
};
