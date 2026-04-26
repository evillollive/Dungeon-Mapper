export const oldwestTheme = {
    id: 'oldwest',
    name: 'Old West',
    tiles: [
        { id: 'empty', label: 'Dust' }, { id: 'floor', label: 'Dirt' }, { id: 'wall', label: 'Plank Wall' },
        { id: 'door-h', label: 'Saloon Door (H)' }, { id: 'door-v', label: 'Saloon Door (V)' },
        { id: 'secret-door', label: 'Hidden Passage' },
        { id: 'stairs-up', label: 'Stairs Up' }, { id: 'stairs-down', label: 'Stairs Down' },
        { id: 'water', label: 'Water Trough' }, { id: 'pillar', label: 'Post' },
        { id: 'trap', label: 'Bear Trap' }, { id: 'treasure', label: 'Gold' }, { id: 'start', label: 'Entrance' },
    ],
    emptyTileId: 'empty',
    cssVars: {},
    tileColors: {
        empty: '#2b1a0a', floor: '#c8a878', wall: '#6b3d1e',
        'door-h': '#8b5a2b', 'door-v': '#8b5a2b',
        'secret-door': '#6b3d1e',
        'stairs-up': '#a0956a', 'stairs-down': '#857a55',
        water: '#3a7a9e', pillar: '#8b6914', trap: '#8b0000',
        treasure: '#d4af37', start: '#4a7a2a',
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
            case 'empty': {
                ctx.fillStyle = '#3a2510';
                for (let i = 0; i < 3; i++) {
                    const dx = px + 3 + i * (s / 3);
                    const dy = py + 3 + i * (s / 4);
                    ctx.fillRect(dx, dy, 1, 1);
                }
                break;
            }
            case 'floor': {
                ctx.fillStyle = '#b09060';
                for (let i = 0; i < 5; i++) {
                    const dx = px + 2 + (i * 37) % (s - 4);
                    const dy = py + 2 + (i * 23) % (s - 4);
                    ctx.fillRect(dx, dy, 1, 1);
                }
                break;
            }
            case 'wall': {
                ctx.strokeStyle = '#4a2a10';
                ctx.lineWidth = 1;
                const planks = 3;
                for (let i = 1; i < planks; i++) {
                    const wy = py + i * (s / planks);
                    ctx.beginPath();
                    ctx.moveTo(px + 1, wy);
                    ctx.lineTo(px + s - 1, wy);
                    ctx.stroke();
                }
                break;
            }
            case 'secret-door': {
                // Plank wall with a faint 'S' for the mapper.
                ctx.strokeStyle = '#4a2a10';
                ctx.lineWidth = 1;
                const planks = 3;
                for (let i = 1; i < planks; i++) {
                    const wy = py + i * (s / planks);
                    ctx.beginPath();
                    ctx.moveTo(px + 1, wy);
                    ctx.lineTo(px + s - 1, wy);
                    ctx.stroke();
                }
                const fontSize = Math.max(7, Math.floor(s * 0.6));
                ctx.font = `bold ${fontSize}px "Courier New", monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#c8a84b';
                ctx.fillText('S', cx, cy + 1);
                break;
            }
            case 'door-h': {
                ctx.fillStyle = '#6b3d1e';
                ctx.fillRect(px + 2, py + 2, (s - 4) / 2 - 1, s - 4);
                ctx.fillRect(cx + 1, py + 2, (s - 4) / 2 - 1, s - 4);
                ctx.strokeStyle = '#c8a84b';
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 2, py + 2, (s - 4) / 2 - 1, s - 4);
                ctx.strokeRect(cx + 1, py + 2, (s - 4) / 2 - 1, s - 4);
                break;
            }
            case 'door-v': {
                ctx.fillStyle = '#6b3d1e';
                ctx.fillRect(px + 2, py + 2, s - 4, (s - 4) / 2 - 1);
                ctx.fillRect(px + 2, cy + 1, s - 4, (s - 4) / 2 - 1);
                ctx.strokeStyle = '#c8a84b';
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 2, py + 2, s - 4, (s - 4) / 2 - 1);
                ctx.strokeRect(px + 2, cy + 1, s - 4, (s - 4) / 2 - 1);
                break;
            }
            case 'stairs-up': {
                ctx.strokeStyle = '#5a4020';
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
                break;
            }
            case 'stairs-down': {
                ctx.strokeStyle = '#5a4020';
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
                break;
            }
            case 'water': {
                ctx.strokeStyle = '#7ac8e8';
                ctx.lineWidth = 1;
                for (let i = 0; i < 2; i++) {
                    const wy = py + 5 + i * (s / 2.5);
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
                ctx.fillStyle = '#6b4010';
                ctx.fillRect(cx - s * 0.15, py + 2, s * 0.3, s - 4);
                ctx.strokeStyle = '#c8a84b';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(cx - s * 0.15, py + 2, s * 0.3, s - 4);
                break;
            }
            case 'trap': {
                ctx.strokeStyle = '#cc2222';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(cx - s * 0.2, cy);
                ctx.lineTo(cx + s * 0.2, cy);
                ctx.stroke();
                break;
            }
            case 'treasure': {
                ctx.fillStyle = '#8b5a14';
                ctx.fillRect(cx - s * 0.25, cy - s * 0.15, s * 0.5, s * 0.3);
                ctx.fillStyle = '#d4af37';
                ctx.fillRect(cx - s * 0.25, cy - s * 0.22, s * 0.5, s * 0.15);
                ctx.strokeStyle = '#ffe080';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(cx - s * 0.25, cy - s * 0.22, s * 0.5, s * 0.37);
                break;
            }
            case 'start': {
                ctx.strokeStyle = '#6abf6a';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx, py + 3);
                ctx.lineTo(cx, py + s - 3);
                ctx.stroke();
                ctx.fillStyle = '#6abf6a';
                ctx.beginPath();
                ctx.moveTo(cx - 3, py + 6);
                ctx.lineTo(cx, py + 3);
                ctx.lineTo(cx + 3, py + 6);
                ctx.fill();
                break;
            }
        }
    },
};
