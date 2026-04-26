// Alien World theme: a strange, biological landscape — spongy spore beds,
// fungal walls, glowing acid pools, towering crystal spires, and pulsing
// bioluminescent membranes that ooze where doors would be on a starship.
export const alienTheme = {
    id: 'alien',
    name: 'Alien World',
    tiles: [
        { id: 'empty', label: 'Sky' }, { id: 'floor', label: 'Spore Bed' }, { id: 'wall', label: 'Fungal Wall' },
        { id: 'door-h', label: 'Membrane (H)' }, { id: 'door-v', label: 'Membrane (V)' },
        { id: 'secret-door', label: 'Hidden Burrow' },
        { id: 'stairs-up', label: 'Tendril Up' }, { id: 'stairs-down', label: 'Tendril Down' },
        { id: 'water', label: 'Acid Pool' }, { id: 'pillar', label: 'Crystal Spire' },
        { id: 'trap', label: 'Spore Burst' }, { id: 'treasure', label: 'Crystal Cluster' }, { id: 'start', label: 'Landing Site' },
    ],
    emptyTileId: 'empty',
    cssVars: {},
    tileColors: {
        empty: '#0a0418', floor: '#3a1f4a', wall: '#5a2a6a',
        'door-h': '#c040ff', 'door-v': '#c040ff',
        'secret-door': '#5a2a6a',
        'stairs-up': '#9affc8', 'stairs-down': '#5acc8a',
        water: '#7aff3a', pillar: '#d8a0ff',
        trap: '#ffe040', treasure: '#ff60d0', start: '#40ffe0',
    },
    drawTile(ctx, type, x, y, size) {
        const px = x * size;
        const py = y * size;
        ctx.fillStyle = this.tileColors[type];
        ctx.fillRect(px, py, size, size);
        ctx.strokeStyle = '#2d1a3a';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, size, size);
        const cx = px + size / 2;
        const cy = py + size / 2;
        const s = size;
        switch (type) {
            case 'empty':
                break;
            case 'floor': {
                // Speckled spore bed: a few biolume dots scattered across the tile.
                ctx.fillStyle = '#7a3aaa';
                const dots = [
                    [0.25, 0.3], [0.7, 0.25], [0.4, 0.65], [0.75, 0.75], [0.2, 0.8],
                ];
                for (const [fx, fy] of dots) {
                    ctx.beginPath();
                    ctx.arc(px + fx * s, py + fy * s, Math.max(0.6, s * 0.05), 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }
            case 'wall': {
                // Fungal wall: bumpy organic mound rather than a clean rectangle.
                ctx.fillStyle = '#3a1850';
                ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
                ctx.fillStyle = '#7a3aaa';
                ctx.beginPath();
                ctx.arc(px + s * 0.3, py + s * 0.35, s * 0.18, 0, Math.PI * 2);
                ctx.arc(px + s * 0.7, py + s * 0.4, s * 0.16, 0, Math.PI * 2);
                ctx.arc(px + s * 0.5, py + s * 0.7, s * 0.2, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'secret-door': {
                // Render as fungal wall with a faint 'S' overlay.
                ctx.fillStyle = '#3a1850';
                ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
                ctx.fillStyle = '#7a3aaa';
                ctx.beginPath();
                ctx.arc(px + s * 0.3, py + s * 0.35, s * 0.18, 0, Math.PI * 2);
                ctx.arc(px + s * 0.7, py + s * 0.4, s * 0.16, 0, Math.PI * 2);
                ctx.arc(px + s * 0.5, py + s * 0.7, s * 0.2, 0, Math.PI * 2);
                ctx.fill();
                const fontSize = Math.max(7, Math.floor(s * 0.6));
                ctx.font = `bold ${fontSize}px "Courier New", monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ff60d0';
                ctx.fillText('S', cx, cy + 1);
                break;
            }
            case 'door-h': {
                // Pulsing membrane stretched across a horizontal opening.
                ctx.fillStyle = '#c040ff';
                ctx.beginPath();
                ctx.ellipse(cx, cy, (s - 4) / 2, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ff80ff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(cx, cy, (s - 4) / 2, 4, 0, 0, Math.PI * 2);
                ctx.stroke();
                break;
            }
            case 'door-v': {
                // Pulsing membrane stretched across a vertical opening.
                ctx.fillStyle = '#c040ff';
                ctx.beginPath();
                ctx.ellipse(cx, cy, 4, (s - 4) / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ff80ff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(cx, cy, 4, (s - 4) / 2, 0, 0, Math.PI * 2);
                ctx.stroke();
                break;
            }
            case 'stairs-up': {
                // Climbing tendril: a curved vine with an arrow tip pointing up.
                ctx.strokeStyle = '#9affc8';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx - 3, py + s - 3);
                ctx.quadraticCurveTo(cx + 3, cy, cx, py + 3);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(cx - 3, py + 6);
                ctx.lineTo(cx, py + 3);
                ctx.lineTo(cx + 3, py + 6);
                ctx.stroke();
                break;
            }
            case 'stairs-down': {
                // Descending tendril: curved vine with arrow tip pointing down.
                ctx.strokeStyle = '#5acc8a';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx - 3, py + 3);
                ctx.quadraticCurveTo(cx + 3, cy, cx, py + s - 3);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(cx - 3, py + s - 6);
                ctx.lineTo(cx, py + s - 3);
                ctx.lineTo(cx + 3, py + s - 6);
                ctx.stroke();
                break;
            }
            case 'water': {
                // Bubbling acid pool: a few rising bubbles over a green surface.
                ctx.strokeStyle = '#c8ff60';
                ctx.lineWidth = 1;
                const bubbles = [
                    [0.3, 0.65, 0.08], [0.55, 0.45, 0.1], [0.75, 0.7, 0.07], [0.4, 0.3, 0.06],
                ];
                for (const [bx, by, br] of bubbles) {
                    ctx.beginPath();
                    ctx.arc(px + bx * s, py + by * s, s * br, 0, Math.PI * 2);
                    ctx.stroke();
                }
                break;
            }
            case 'pillar': {
                // Crystal spire: a faceted diamond shape with a highlight.
                ctx.fillStyle = '#a070d0';
                ctx.beginPath();
                ctx.moveTo(cx, py + 3);
                ctx.lineTo(cx + s / 4, cy);
                ctx.lineTo(cx, py + s - 3);
                ctx.lineTo(cx - s / 4, cy);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#e0b8ff';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(cx, py + 3);
                ctx.lineTo(cx, py + s - 3);
                ctx.stroke();
                break;
            }
            case 'trap': {
                // Spore burst: radiating spikes from a central pod.
                ctx.strokeStyle = '#ffe040';
                ctx.lineWidth = 1.5;
                const spikes = 8;
                for (let i = 0; i < spikes; i++) {
                    const a = (i / spikes) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(a) * (s * 0.12), cy + Math.sin(a) * (s * 0.12));
                    ctx.lineTo(cx + Math.cos(a) * (s * 0.4), cy + Math.sin(a) * (s * 0.4));
                    ctx.stroke();
                }
                ctx.fillStyle = '#ffe040';
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.1, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'treasure': {
                // Crystal cluster: three jutting shards.
                ctx.fillStyle = '#ff60d0';
                ctx.strokeStyle = '#ffd0ff';
                ctx.lineWidth = 0.5;
                const shards = [
                    [cx - s * 0.2, cy + s * 0.25, cx - s * 0.05, cy - s * 0.25],
                    [cx, cy + s * 0.3, cx, cy - s * 0.3],
                    [cx + s * 0.2, cy + s * 0.25, cx + s * 0.08, cy - s * 0.2],
                ];
                for (const [bx, by, tx, ty] of shards) {
                    ctx.beginPath();
                    ctx.moveTo(bx - 2, by);
                    ctx.lineTo(tx, ty);
                    ctx.lineTo(bx + 2, by);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
                break;
            }
            case 'start': {
                // Landing site: concentric ring beacon.
                ctx.strokeStyle = '#40ffe0';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.25, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#40ffe0';
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.1, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
        }
    },
};
