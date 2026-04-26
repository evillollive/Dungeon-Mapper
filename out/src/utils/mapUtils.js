export function createEmptyGrid(width, height) {
    return Array.from({ length: height }, () => Array.from({ length: width }, () => ({ type: 'empty' })));
}
/**
 * Build a fresh fog grid sized to (width × height). The `filled` flag picks
 * between fully-fogged (true — useful for "Reset fog") and fully-revealed
 * (false — the default for new maps). Result is independent of any input
 * grid so callers can replace state outright.
 */
export function createFogGrid(width, height, filled = false) {
    return Array.from({ length: height }, () => Array.from({ length: width }, () => filled));
}
/**
 * Resize an existing fog grid to (width × height), preserving overlapping
 * cells and filling new cells with `fillNew` (defaults to revealed). Used
 * when the user resizes the map so the fog mask stays aligned with tiles.
 */
export function resizeFogGrid(fog, width, height, fillNew = false) {
    return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => fog?.[y]?.[x] ?? fillNew));
}
export function floodFill(tiles, startX, startY, targetType, fillType) {
    const height = tiles.length;
    const width = tiles[0]?.length ?? 0;
    if (targetType === fillType)
        return tiles;
    const newTiles = tiles.map(row => row.map(t => ({ ...t })));
    const stack = [[startX, startY]];
    const visited = new Set();
    while (stack.length > 0) {
        const [x, y] = stack.pop();
        const key = `${x},${y}`;
        if (visited.has(key))
            continue;
        if (x < 0 || x >= width || y < 0 || y >= height)
            continue;
        if (newTiles[y][x].type !== targetType)
            continue;
        visited.add(key);
        // Clear any per-tile theme override on filled cells so they adopt the
        // current map theme, matching the behavior of setTile/setTiles.
        const next = { ...newTiles[y][x], type: fillType };
        delete next.theme;
        newTiles[y][x] = next;
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return newTiles;
}
export const TILE_COLORS = {
    empty: '#1a1a2e',
    floor: '#c8b89a',
    wall: '#4a4a4a',
    'door-h': '#8b6914',
    'door-v': '#8b6914',
    'secret-door': '#4a4a4a',
    'stairs-up': '#7a9e7e',
    'stairs-down': '#5a7a5e',
    water: '#1e5f8e',
    pillar: '#6a6a6a',
    trap: '#8e1e1e',
    treasure: '#d4af37',
    start: '#2e8b57',
};
