/**
 * "Natural area" detection + theme palettes used by the cavern and
 * open-terrain generators to label their otherwise unlabeled organic
 * spaces. A cave system doesn't carve discrete rooms, but a player
 * party still benefits from named designated areas — "Grand Chamber",
 * "Side Gallery", "Underground Pool", "Bottleneck Passage", and the
 * outdoor analogues like "Clearing", "Grove", "Watering Hole".
 *
 * Detection works on a binary "is this an open / floor cell?" mask:
 *
 *  1. Compute the chebyshev distance from each open cell to the
 *     nearest non-open neighbor (wall, water, obstacle, empty).
 *  2. Every open cell with distance >= `minRadius` becomes a "chamber
 *     cell". Distance == 1 cells (touching a non-open neighbor) read as
 *     passages and are excluded.
 *  3. Connected components of chamber cells whose area >= `minArea`
 *     become labeled chambers. Smaller pockets stay unlabeled so the
 *     notes panel doesn't fill up with every two-cell nook.
 *
 * Each chamber yields a centroid (clamped back to a real chamber cell
 * so the anchor sits inside the area, not on a wall) and an area in
 * cells. Callers sort by area and pick a "large" palette entry for
 * the biggest one when the palette has one — same convention as the
 * rooms-and-corridors `assignRoomKinds` helper.
 */
/* ── Cavern palettes (per theme) ─────────────────────────────── */
const CAVERN_DEFAULT = [
    { label: 'Grand Chamber', size: 'large', weight: 1, bias: { treasure: 1.5 } },
    { label: 'Side Gallery', weight: 1.2 },
    { label: 'Antechamber', weight: 1 },
    { label: 'Stalagmite Forest', weight: 0.8, bias: { trap: 1.2 } },
    { label: 'Underground Pool', weight: 0.7, prefersTerrain: 'water', bias: { treasure: 0.5 } },
    { label: 'Crystal Hollow', weight: 0.6, bias: { treasure: 1.5 } },
    { label: 'Collapsed Cavern', weight: 0.7, bias: { trap: 1.5 } },
    { label: 'Echo Chamber', weight: 0.5 },
];
const CAVERN_DUNGEON = [
    { label: 'Grand Chamber', size: 'large', weight: 1, bias: { treasure: 1.5 } },
    { label: 'Side Gallery', weight: 1.2 },
    { label: 'Antechamber', weight: 1 },
    { label: 'Stalagmite Forest', weight: 0.8, bias: { trap: 1.2 } },
    { label: 'Underground Pool', weight: 0.7, prefersTerrain: 'water' },
    { label: 'Reliquary Hollow', weight: 0.6, bias: { treasure: 2 } },
    { label: 'Bone Pit', weight: 0.6, bias: { trap: 1.5 } },
    { label: 'Forgotten Shrine', weight: 0.5 },
];
const CAVERN_WILDERNESS = [
    { label: 'Grand Cavern', size: 'large', weight: 1 },
    { label: 'Side Gallery', weight: 1.2 },
    { label: 'Bear Den', weight: 0.8, bias: { trap: 1.2 } },
    { label: 'Stalactite Hall', weight: 0.8 },
    { label: 'Underground Spring', weight: 0.9, prefersTerrain: 'water' },
    { label: 'Crystal Hollow', weight: 0.6, bias: { treasure: 1.5 } },
    { label: 'Collapsed Tunnel', weight: 0.6, bias: { trap: 1.5 } },
];
const CAVERN_ANCIENT = [
    { label: 'Inner Sanctum', size: 'large', weight: 1, bias: { treasure: 2 } },
    { label: 'Antechamber', weight: 1 },
    { label: 'Tomb Hall', weight: 0.9, bias: { treasure: 1.5, trap: 1.2 } },
    { label: 'Ritual Pool', weight: 0.7, prefersTerrain: 'water' },
    { label: 'Pillar Hall', weight: 0.7 },
    { label: 'Cursed Hollow', weight: 0.6, bias: { trap: 2 } },
    { label: 'Reliquary', weight: 0.6, bias: { treasure: 2 } },
];
const CAVERN_STARSHIP = [
    { label: 'Breached Bay', size: 'large', weight: 1 },
    { label: 'Service Crawlspace', weight: 1.2 },
    { label: 'Coolant Pool', weight: 0.8, prefersTerrain: 'water' },
    { label: 'Cargo Pocket', weight: 0.8, bias: { treasure: 1.5 } },
    { label: 'Reactor Niche', weight: 0.6, bias: { trap: 1.5 } },
    { label: 'Collapsed Conduit', weight: 0.7, bias: { trap: 1.2 } },
];
const CAVERN_ALIEN = [
    { label: 'Hive Chamber', size: 'large', weight: 1 },
    { label: 'Spore Garden', weight: 0.9, bias: { trap: 1.5 } },
    { label: 'Resin Pool', weight: 0.8, prefersTerrain: 'water' },
    { label: 'Egg Cluster', weight: 0.8 },
    { label: 'Brood Pit', weight: 0.7, bias: { trap: 1.5 } },
    { label: 'Relic Hollow', weight: 0.5, bias: { treasure: 2 } },
];
const CAVERN_PIRATE = [
    { label: 'Smuggler\u2019s Hold', size: 'large', weight: 1, bias: { treasure: 2 } },
    { label: 'Tide Pool', weight: 0.9, prefersTerrain: 'water' },
    { label: 'Drift Cavern', weight: 1 },
    { label: 'Lookout Hollow', weight: 0.7 },
    { label: 'Sunken Stash', weight: 0.6, bias: { treasure: 2 } },
    { label: 'Collapsed Tunnel', weight: 0.7, bias: { trap: 1.5 } },
];
const CAVERN_DESERT = [
    { label: 'Hidden Chamber', size: 'large', weight: 1, bias: { treasure: 1.5 } },
    { label: 'Sand-choked Hall', weight: 1 },
    { label: 'Dry Cistern', weight: 0.7 },
    { label: 'Hidden Spring', weight: 0.6, prefersTerrain: 'water' },
    { label: 'Tomb Pocket', weight: 0.6, bias: { treasure: 1.5, trap: 1.2 } },
    { label: 'Collapsed Tunnel', weight: 0.7, bias: { trap: 1.5 } },
];
const CAVERN_POSTAPOCALYPSE = [
    { label: 'Salvage Hall', size: 'large', weight: 1, bias: { treasure: 1.5 } },
    { label: 'Side Gallery', weight: 1 },
    { label: 'Toxic Pool', weight: 0.7, prefersTerrain: 'water', bias: { trap: 1.2 } },
    { label: 'Scrap Pocket', weight: 0.8, bias: { treasure: 1.5 } },
    { label: 'Collapsed Section', weight: 0.7, bias: { trap: 1.5 } },
    { label: 'Bunker Niche', weight: 0.5 },
];
const CAVERN_CYBERPUNK = [
    { label: 'Service Vault', size: 'large', weight: 1 },
    { label: 'Maintenance Niche', weight: 1 },
    { label: 'Coolant Sump', weight: 0.8, prefersTerrain: 'water' },
    { label: 'Black Cache', weight: 0.7, bias: { treasure: 2 } },
    { label: 'Trapped Junction', weight: 0.6, bias: { trap: 1.5 } },
];
const CAVERN_OLDWEST = [
    { label: 'Main Drift', size: 'large', weight: 1 },
    { label: 'Side Drift', weight: 1.2 },
    { label: 'Sluice Pool', weight: 0.7, prefersTerrain: 'water' },
    { label: 'Ore Pocket', weight: 0.7, bias: { treasure: 2 } },
    { label: 'Collapsed Shaft', weight: 0.7, bias: { trap: 1.5 } },
];
const CAVERN_STEAMPUNK = [
    { label: 'Engine Cavern', size: 'large', weight: 1 },
    { label: 'Service Niche', weight: 1 },
    { label: 'Steam Pool', weight: 0.7, prefersTerrain: 'water', bias: { trap: 1.2 } },
    { label: 'Gear Cache', weight: 0.7, bias: { treasure: 2 } },
    { label: 'Boiler Hollow', weight: 0.6, bias: { trap: 1.5 } },
];
const CAVERN_CASTLE = [
    { label: 'Cellar Hall', size: 'large', weight: 1 },
    { label: 'Wine Cellar', weight: 0.8, bias: { treasure: 1.2 } },
    { label: 'Cistern', weight: 0.7, prefersTerrain: 'water' },
    { label: 'Hidden Vault', weight: 0.6, bias: { treasure: 2 } },
    { label: 'Oubliette', weight: 0.6, bias: { trap: 1.5 } },
    { label: 'Collapsed Tunnel', weight: 0.6, bias: { trap: 1.5 } },
];
const CAVERN_MODERNCITY = [
    { label: 'Maintenance Hall', size: 'large', weight: 1 },
    { label: 'Sewer Branch', weight: 1.2, prefersTerrain: 'water' },
    { label: 'Stash Pocket', weight: 0.7, bias: { treasure: 1.5 } },
    { label: 'Collapsed Section', weight: 0.7, bias: { trap: 1.5 } },
];
export const CAVERN_AREA_PALETTES = {
    dungeon: CAVERN_DUNGEON,
    wilderness: CAVERN_WILDERNESS,
    ancient: CAVERN_ANCIENT,
    starship: CAVERN_STARSHIP,
    alien: CAVERN_ALIEN,
    pirate: CAVERN_PIRATE,
    desert: CAVERN_DESERT,
    postapocalypse: CAVERN_POSTAPOCALYPSE,
    cyberpunk: CAVERN_CYBERPUNK,
    oldwest: CAVERN_OLDWEST,
    steampunk: CAVERN_STEAMPUNK,
    castle: CAVERN_CASTLE,
    moderncity: CAVERN_MODERNCITY,
};
export function getCavernAreaPalette(themeId) {
    if (!themeId)
        return CAVERN_DEFAULT;
    return CAVERN_AREA_PALETTES[themeId] ?? CAVERN_DEFAULT;
}
/* ── Open-terrain palettes (per theme) ───────────────────────── */
const OPEN_DEFAULT = [
    { label: 'Great Clearing', size: 'large', weight: 1 },
    { label: 'Clearing', weight: 1.2 },
    { label: 'Grove', weight: 0.9 },
    { label: 'Watering Hole', weight: 0.7, prefersTerrain: 'water' },
    { label: 'Rocky Outcrop', weight: 0.7 },
    { label: 'Hidden Glade', weight: 0.5, bias: { treasure: 1.5 } },
];
const OPEN_WILDERNESS = [
    { label: 'Great Clearing', size: 'large', weight: 1 },
    { label: 'Forest Clearing', weight: 1.5 },
    { label: 'Glade', weight: 1 },
    { label: 'Watering Hole', weight: 0.8, prefersTerrain: 'water' },
    { label: 'Hunter\u2019s Camp', weight: 0.6, bias: { treasure: 1.2 } },
    { label: 'Briar Tangle', weight: 0.7, bias: { trap: 1.5 } },
];
const OPEN_DESERT = [
    { label: 'Open Flats', size: 'large', weight: 1 },
    { label: 'Dry Wash', weight: 1.2 },
    { label: 'Dune Hollow', weight: 1 },
    { label: 'Oasis', weight: 0.7, prefersTerrain: 'water', bias: { treasure: 1.2 } },
    { label: 'Sandstone Outcrop', weight: 0.7 },
    { label: 'Quicksand Pit', weight: 0.5, bias: { trap: 2 } },
];
const OPEN_POSTAPOCALYPSE = [
    { label: 'Ruined Plaza', size: 'large', weight: 1 },
    { label: 'Scrap Field', weight: 1, bias: { treasure: 1.2 } },
    { label: 'Toxic Pool', weight: 0.7, prefersTerrain: 'water', bias: { trap: 1.5 } },
    { label: 'Rubble Hollow', weight: 0.8 },
    { label: 'Mine Field', weight: 0.5, bias: { trap: 2 } },
];
const OPEN_OLDWEST = [
    { label: 'Open Range', size: 'large', weight: 1 },
    { label: 'Dry Wash', weight: 1.2 },
    { label: 'Watering Hole', weight: 0.8, prefersTerrain: 'water' },
    { label: 'Cattle Drive', weight: 0.7 },
    { label: 'Bandit Camp', weight: 0.6, bias: { treasure: 1.2, trap: 1.2 } },
];
const OPEN_PIRATE = [
    { label: 'Open Beach', size: 'large', weight: 1 },
    { label: 'Tide Pool', weight: 0.9, prefersTerrain: 'water' },
    { label: 'Palm Grove', weight: 0.9 },
    { label: 'Hidden Cove', weight: 0.6, bias: { treasure: 2 } },
    { label: 'Rocky Spit', weight: 0.7 },
];
const OPEN_ALIEN = [
    { label: 'Spore Plain', size: 'large', weight: 1 },
    { label: 'Resin Field', weight: 1 },
    { label: 'Acid Pool', weight: 0.7, prefersTerrain: 'water', bias: { trap: 1.5 } },
    { label: 'Crystal Outcrop', weight: 0.7, bias: { treasure: 1.5 } },
    { label: 'Egg Cluster', weight: 0.6, bias: { trap: 1.2 } },
];
const OPEN_ANCIENT = [
    { label: 'Ritual Plaza', size: 'large', weight: 1 },
    { label: 'Crumbling Court', weight: 1 },
    { label: 'Reflecting Pool', weight: 0.7, prefersTerrain: 'water' },
    { label: 'Statue Garden', weight: 0.7 },
    { label: 'Cursed Ground', weight: 0.6, bias: { trap: 1.5 } },
];
export const OPEN_AREA_PALETTES = {
    wilderness: OPEN_WILDERNESS,
    desert: OPEN_DESERT,
    postapocalypse: OPEN_POSTAPOCALYPSE,
    oldwest: OPEN_OLDWEST,
    pirate: OPEN_PIRATE,
    alien: OPEN_ALIEN,
    ancient: OPEN_ANCIENT,
};
export function getOpenAreaPalette(themeId) {
    if (!themeId)
        return OPEN_DEFAULT;
    return OPEN_AREA_PALETTES[themeId] ?? OPEN_DEFAULT;
}
/**
 * Detect "chamber" / "open area" pockets in `grid`. A cell counts as
 * open when `isOpen(type)` returns true; passages (open cells touching
 * a non-open neighbor) are excluded so only the wider pockets get
 * labeled.
 *
 * @param minRadius Minimum chebyshev distance from a non-open neighbor
 *   for a cell to count as "interior". 2 means a cell needs at least
 *   one ring of open cells around it.
 * @param minArea Minimum number of interior cells for a connected
 *   component to be returned as a labeled area. Smaller pockets are
 *   discarded.
 */
export function detectAreas(grid, isOpen, minRadius, minArea) {
    const h = grid.length;
    const w = grid[0]?.length ?? 0;
    if (h === 0 || w === 0)
        return [];
    // Multi-source BFS to compute chebyshev distance to nearest non-open
    // cell for every open cell. We seed the queue with every non-open
    // cell at distance 0 and propagate outward through open cells using
    // 8-connectivity (chebyshev). Out-of-bounds neighbors are treated as
    // distance 0 so cells on the map border get distance 1.
    const dist = Array.from({ length: h }, () => new Array(w).fill(-1));
    const queue = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (!isOpen(grid[y][x])) {
                dist[y][x] = 0;
                queue.push([x, y]);
            }
        }
    }
    // Seed open cells touching the map edge with dist 1 too so border
    // pockets aren't accidentally treated as deep interior space.
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (!isOpen(grid[y][x]))
                continue;
            if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
                dist[y][x] = 1;
                queue.push([x, y]);
            }
        }
    }
    let head = 0;
    const dirs8 = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1],
    ];
    while (head < queue.length) {
        const [x, y] = queue[head++];
        const d = dist[y][x];
        for (const [dx, dy] of dirs8) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h)
                continue;
            if (!isOpen(grid[ny][nx]))
                continue;
            if (dist[ny][nx] !== -1 && dist[ny][nx] <= d + 1)
                continue;
            dist[ny][nx] = d + 1;
            queue.push([nx, ny]);
        }
    }
    // Mark interior cells: open cells with dist >= minRadius.
    const interior = Array.from({ length: h }, () => new Array(w).fill(false));
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (isOpen(grid[y][x]) && dist[y][x] >= minRadius)
                interior[y][x] = true;
        }
    }
    // 4-connected flood-fill of interior cells → connected components.
    const visited = Array.from({ length: h }, () => new Array(w).fill(false));
    const areas = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (!interior[y][x] || visited[y][x])
                continue;
            const cells = [];
            const stack = [[x, y]];
            visited[y][x] = true;
            while (stack.length > 0) {
                const [cx, cy] = stack.pop();
                cells.push({ x: cx, y: cy });
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx < 0 || nx >= w || ny < 0 || ny >= h)
                        continue;
                    if (visited[ny][nx] || !interior[ny][nx])
                        continue;
                    visited[ny][nx] = true;
                    stack.push([nx, ny]);
                }
            }
            if (cells.length < minArea)
                continue;
            // Pick the cell closest to the cluster's mean as the centroid;
            // that cell is by construction inside `cells` so map-note anchors
            // never land on a wall or empty tile.
            let sx = 0;
            let sy = 0;
            for (const c of cells) {
                sx += c.x;
                sy += c.y;
            }
            const mx = sx / cells.length;
            const my = sy / cells.length;
            let best = cells[0];
            let bestD = Infinity;
            for (const c of cells) {
                const dx2 = c.x - mx;
                const dy2 = c.y - my;
                const dd = dx2 * dx2 + dy2 * dy2;
                if (dd < bestD) {
                    bestD = dd;
                    best = c;
                }
            }
            areas.push({ cells, area: cells.length, centroid: best });
        }
    }
    return areas;
}
/** Sample a kind by weight. Returns `palette[0]` if all weights are 0. */
function pickKind(palette, rng, predicate) {
    const candidates = predicate ? palette.filter(predicate) : palette.slice();
    const pool = candidates.length > 0 ? candidates : palette.slice();
    const total = pool.reduce((acc, k) => acc + (k.weight ?? 1), 0);
    if (total <= 0)
        return pool[0];
    let r = rng.next() * total;
    for (const k of pool) {
        r -= k.weight ?? 1;
        if (r <= 0)
            return k;
    }
    return pool[pool.length - 1];
}
/**
 * Assign a `NaturalAreaKind` to each detected area. The single largest
 * area gets a `size: 'large'` archetype when one is available; areas
 * that contain a `prefersTerrain` tile are matched to the corresponding
 * archetype first; the rest sample the remaining palette by weight.
 */
export function assignAreaKinds(areas, palette, grid, rng) {
    const result = areas.map(() => undefined);
    if (areas.length === 0 || palette.length === 0)
        return result;
    // Largest first → claim a 'large' kind if the palette has one.
    const order = areas
        .map((a, i) => ({ i, area: a.area }))
        .sort((a, b) => b.area - a.area);
    const used = new Set();
    const usedKinds = new Set();
    const largeKinds = palette.filter(k => k.size === 'large');
    if (largeKinds.length > 0) {
        const big = order[0];
        const k = pickKind(largeKinds, rng);
        result[big.i] = k;
        used.add(big.i);
        usedKinds.add(k.label);
    }
    // Match `prefersTerrain` archetypes to areas containing that tile.
    // Each terrain-preferring kind is offered to at most one area (the
    // largest unmatched candidate), so we don't end up with three
    // "Underground Pool"s when the cave has water in three chambers.
    const terrainKinds = palette.filter(k => k.prefersTerrain && !usedKinds.has(k.label));
    for (const k of terrainKinds) {
        const tile = k.prefersTerrain;
        let bestI = -1;
        let bestArea = -1;
        for (const o of order) {
            if (used.has(o.i))
                continue;
            const a = areas[o.i];
            const has = a.cells.some(c => grid[c.y]?.[c.x] === tile);
            if (has && a.area > bestArea) {
                bestI = o.i;
                bestArea = a.area;
            }
        }
        if (bestI >= 0) {
            result[bestI] = k;
            used.add(bestI);
            usedKinds.add(k.label);
        }
    }
    // Remaining areas sample weighted from the rest of the palette,
    // skipping `large` kinds (the hero space already got one).
    for (const o of order) {
        if (used.has(o.i))
            continue;
        const k = pickKind(palette, rng, c => c.size !== 'large');
        result[o.i] = k;
    }
    return result;
}
