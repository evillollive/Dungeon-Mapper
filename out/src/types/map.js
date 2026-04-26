export const TOKEN_KIND_COLORS = {
    player: '#3b82f6',
    npc: '#22c55e',
    monster: '#dc2626',
};
export const TOKEN_KIND_LABELS = {
    player: 'Player',
    npc: 'NPC',
    monster: 'Monster',
};
export const TILE_LABELS = {
    empty: 'Empty',
    floor: 'Floor',
    wall: 'Wall',
    'door-h': 'Door (H)',
    'door-v': 'Door (V)',
    'secret-door': 'Secret Door',
    'stairs-up': 'Stairs Up',
    'stairs-down': 'Stairs Down',
    water: 'Water',
    pillar: 'Pillar',
    trap: 'Trap',
    treasure: 'Treasure',
    start: 'Start',
};
// Tile types shown in the toolbar palette. The 'empty' tile is intentionally
// omitted: it represents an unpainted / cleared cell (the graph-paper
// background shows through it in screen mode, and SVG/print export treat it
// as background), so a "paint empty" button would appear to do nothing on
// the map. Use the Erase tool to clear a tile back to empty.
export const ALL_TILE_TYPES = [
    'floor', 'wall', 'door-h', 'door-v', 'secret-door',
    'stairs-up', 'stairs-down', 'water', 'pillar',
    'trap', 'treasure', 'start',
];
