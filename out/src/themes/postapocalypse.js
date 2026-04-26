export const postapocalypseTheme = {
    id: 'postapocalypse',
    name: 'Post-Apocalypse',
    tiles: [
        { id: 'empty', label: 'Wasteland' }, { id: 'floor', label: 'Rubble' }, { id: 'wall', label: 'Ruins' },
        { id: 'door-h', label: 'Barricade (H)' }, { id: 'door-v', label: 'Barricade (V)' },
        { id: 'secret-door', label: 'Hidden Stash' },
        { id: 'stairs-up', label: 'Debris Up' }, { id: 'stairs-down', label: 'Debris Down' },
        { id: 'water', label: 'Toxic Pool' }, { id: 'pillar', label: 'Rubble Pile' },
        { id: 'trap', label: 'Landmine' }, { id: 'treasure', label: 'Supplies' }, { id: 'start', label: 'Shelter' },
    ],
    emptyTileId: 'empty',
    cssVars: {},
    tileColors: {
        empty: '#1a1208', floor: '#6b5a3a', wall: '#4a3a28',
        'door-h': '#8b6020', 'door-v': '#8b6020',
        'secret-door': '#4a3a28',
        'stairs-up': '#7a6a4a', 'stairs-down': '#5a4a3a',
        water: '#2a4a1a', pillar: '#5a4a38', trap: '#8e3e1e',
        treasure: '#c09820', start: '#4a7a2a',
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
                ctx.fillStyle = '#2a2010';
                for (let i = 0; i < 3; i++) {
                    const dx = px + 2 + (i * 29) % (s - 4);
                    const dy = py + 2 + (i * 19) % (s - 4);
                    ctx.fillRect(dx, dy, 2, 1);
                }
                break;
            }
            case 'floor': {
                ctx.strokeStyle = '#4a3a20';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(px + 3, py + 5);
                ctx.lineTo(px + 7, py + 3);
                ctx.moveTo(px + s - 5, py + s - 3);
                ctx.lineTo(px + s - 3, py + s - 7);
                ctx.stroke();
                for (let i = 0; i < 3; i++) {
                    const dx = px + 2 + (i * 23) % (s - 4);
                    const dy = py + 2 + (i * 31) % (s - 4);
                    ctx.fillStyle = '#3a2a18';
                    ctx.fillRect(dx, dy, 1, 1);
                }
                break;
            }
            case 'wall': {
                ctx.strokeStyle = '#6a5030';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(px + 2, py + s / 3);
                ctx.lineTo(px + s - 2, py + s / 3);
                ctx.moveTo(px + 3, py + 2 * s / 3);
                ctx.lineTo(px + s - 3, py + 2 * s / 3);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(px + 3, py + 3);
                ctx.lineTo(px + s - 3, py + s - 3);
                ctx.stroke();
                break;
            }
            case 'secret-door': {
                // Render as ruined wall with a faint 'S' overlay.
                ctx.strokeStyle = '#6a5030';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(px + 2, py + s / 3);
                ctx.lineTo(px + s - 2, py + s / 3);
                ctx.moveTo(px + 3, py + 2 * s / 3);
                ctx.lineTo(px + s - 3, py + 2 * s / 3);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(px + 3, py + 3);
                ctx.lineTo(px + s - 3, py + s - 3);
                ctx.stroke();
                const fontSize = Math.max(7, Math.floor(s * 0.55));
                ctx.font = `bold ${fontSize}px "Courier New", monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#c09820';
                ctx.fillText('S', cx, cy + 1);
                break;
            }
            case 'door-h': {
                ctx.fillStyle = '#5a3a10';
                ctx.fillRect(px + 2, cy - 3, s - 4, 6);
                ctx.strokeStyle = '#c08030';
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 2, cy - 3, s - 4, 6);
                ctx.beginPath();
                ctx.moveTo(px + 4, cy - 1);
                ctx.lineTo(px + s - 4, cy - 1);
                ctx.stroke();
                break;
            }
            case 'door-v': {
                ctx.fillStyle = '#5a3a10';
                ctx.fillRect(cx - 3, py + 2, 6, s - 4);
                ctx.strokeStyle = '#c08030';
                ctx.lineWidth = 1;
                ctx.strokeRect(cx - 3, py + 2, 6, s - 4);
                break;
            }
            case 'stairs-up': {
                ctx.strokeStyle = '#8a7a50';
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
                ctx.strokeStyle = '#8a7a50';
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
                ctx.strokeStyle = '#50a030';
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
                ctx.fillStyle = '#7a6a48';
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#3a2a18';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(px + 3, py + 3);
                ctx.lineTo(px + s - 3, py + s - 3);
                ctx.stroke();
                break;
            }
            case 'trap': {
                ctx.strokeStyle = '#cc4422';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#cc442233';
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#cc4422';
                ctx.fillRect(cx - 1, cy - 1, 2, 2);
                break;
            }
            case 'treasure': {
                ctx.fillStyle = '#704a10';
                ctx.fillRect(cx - s * 0.25, cy - s * 0.15, s * 0.5, s * 0.3);
                ctx.fillStyle = '#c09820';
                ctx.fillRect(cx - s * 0.25, cy - s * 0.22, s * 0.5, s * 0.12);
                ctx.strokeStyle = '#e0c040';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(cx - s * 0.25, cy - s * 0.22, s * 0.5, s * 0.37);
                break;
            }
            case 'start': {
                ctx.strokeStyle = '#5a9a3a';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(px + 3, py + 3, s - 6, s - 6);
                ctx.fillStyle = '#5a9a3a';
                ctx.fillRect(cx - 1, cy - s * 0.2, 2, s * 0.4);
                ctx.fillRect(cx - s * 0.2, cy - 1, s * 0.4, 2);
                break;
            }
        }
    },
};
