export const cyberpunkTheme = {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    tiles: [
        { id: 'empty', label: 'Dead Zone' }, { id: 'floor', label: 'Street' }, { id: 'wall', label: 'Barrier' },
        { id: 'door-h', label: 'Shutter (H)' }, { id: 'door-v', label: 'Shutter (V)' },
        { id: 'secret-door', label: 'Cloaked Panel' },
        { id: 'stairs-up', label: 'Ramp Up' }, { id: 'stairs-down', label: 'Ramp Down' },
        { id: 'water', label: 'Acid Pool' }, { id: 'pillar', label: 'Terminal' },
        { id: 'trap', label: 'Turret' }, { id: 'treasure', label: 'Chip Cache' }, { id: 'start', label: 'Spawn' },
    ],
    emptyTileId: 'empty',
    cssVars: {},
    tileColors: {
        empty: '#000005', floor: '#0a0a1a', wall: '#0d0d1e',
        'door-h': '#ff00ff', 'door-v': '#ff00ff',
        'secret-door': '#0d0d1e',
        'stairs-up': '#00ffff', 'stairs-down': '#00cccc',
        water: '#002244', pillar: '#1a001a', trap: '#ff0000',
        treasure: '#ffff00', start: '#00ff00',
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
                ctx.strokeStyle = '#1a1a40';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(px + 3, py + 3);
                ctx.lineTo(px + s - 3, py + 3);
                ctx.moveTo(px + 3, py + 3);
                ctx.lineTo(px + 3, py + s - 3);
                ctx.stroke();
                break;
            }
            case 'wall': {
                ctx.strokeStyle = '#ff00ff';
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
                ctx.strokeStyle = '#ff00ff44';
                ctx.lineWidth = 3;
                ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
                break;
            }
            case 'secret-door': {
                // Same neon barrier outline, with a faint 'S' overlay.
                ctx.strokeStyle = '#ff00ff';
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
                ctx.strokeStyle = '#ff00ff44';
                ctx.lineWidth = 3;
                ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
                const fontSize = Math.max(7, Math.floor(s * 0.6));
                ctx.font = `bold ${fontSize}px "Courier New", monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ff00ff';
                ctx.fillText('S', cx, cy + 1);
                break;
            }
            case 'door-h': {
                ctx.strokeStyle = '#ff00ff';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(px + 2, cy - 3, (s - 4) / 2 - 1, 6);
                ctx.strokeRect(cx + 1, cy - 3, (s - 4) / 2 - 1, 6);
                ctx.fillStyle = '#ff00ff22';
                ctx.fillRect(px + 2, cy - 3, (s - 4) / 2 - 1, 6);
                ctx.fillRect(cx + 1, cy - 3, (s - 4) / 2 - 1, 6);
                break;
            }
            case 'door-v': {
                ctx.strokeStyle = '#ff00ff';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(cx - 3, py + 2, 6, (s - 4) / 2 - 1);
                ctx.strokeRect(cx - 3, cy + 1, 6, (s - 4) / 2 - 1);
                ctx.fillStyle = '#ff00ff22';
                ctx.fillRect(cx - 3, py + 2, 6, (s - 4) / 2 - 1);
                ctx.fillRect(cx - 3, cy + 1, 6, (s - 4) / 2 - 1);
                break;
            }
            case 'stairs-up': {
                ctx.strokeStyle = '#00ffff';
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
                ctx.strokeStyle = '#00cccc';
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
                ctx.strokeStyle = '#0088ff';
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
                ctx.strokeStyle = '#ff00ff';
                ctx.lineWidth = 1;
                ctx.strokeRect(cx - s * 0.2, py + 2, s * 0.4, s - 4);
                ctx.fillStyle = '#2a002a';
                ctx.fillRect(cx - s * 0.2 + 1, py + 3, s * 0.4 - 2, s - 6);
                ctx.fillStyle = '#ff00ff';
                ctx.fillRect(cx - 1, cy - 1, 2, 2);
                break;
            }
            case 'trap': {
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.25, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#ff000033';
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.25, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(cx - 1, cy - 1, 2, 2);
                break;
            }
            case 'treasure': {
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(cx - s * 0.25, cy - s * 0.2, s * 0.5, s * 0.4);
                ctx.fillStyle = '#ffff0022';
                ctx.fillRect(cx - s * 0.25, cy - s * 0.2, s * 0.5, s * 0.4);
                ctx.fillStyle = '#ffff00';
                ctx.fillRect(cx - 1, cy - 1, 2, 2);
                break;
            }
            case 'start': {
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#00ff0033';
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#00ff00';
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
