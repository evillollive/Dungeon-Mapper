import { DIRS_4, getCell } from './common';
/** Tile types a door's passage-axis neighbor must be one of. */
function isDoorPassageNeighbor(t) {
    return (t === 'floor' ||
        t === 'start' ||
        t === 'stairs-up' ||
        t === 'stairs-down' ||
        t === 'treasure' ||
        t === 'trap');
}
/** Tile types passable for end-to-end connectivity (includes doors). */
function isConnectivityPassable(t) {
    return (isDoorPassageNeighbor(t) ||
        t === 'door-h' ||
        t === 'door-v' ||
        t === 'secret-door');
}
/** Strict validity contract for a placed door. */
function doorIsValid(grid, x, y, type) {
    if (type === 'door-h') {
        return (isDoorPassageNeighbor(getCell(grid, x, y - 1)) &&
            isDoorPassageNeighbor(getCell(grid, x, y + 1)) &&
            getCell(grid, x - 1, y) === 'wall' &&
            getCell(grid, x + 1, y) === 'wall');
    }
    return (isDoorPassageNeighbor(getCell(grid, x - 1, y)) &&
        isDoorPassageNeighbor(getCell(grid, x + 1, y)) &&
        getCell(grid, x, y - 1) === 'wall' &&
        getCell(grid, x, y + 1) === 'wall');
}
/** Same contract relaxed for `secret-door`: any one passage axis is enough. */
function secretDoorIsValid(grid, x, y) {
    const vertical = isDoorPassageNeighbor(getCell(grid, x, y - 1)) &&
        isDoorPassageNeighbor(getCell(grid, x, y + 1)) &&
        getCell(grid, x - 1, y) === 'wall' &&
        getCell(grid, x + 1, y) === 'wall';
    const horizontal = isDoorPassageNeighbor(getCell(grid, x - 1, y)) &&
        isDoorPassageNeighbor(getCell(grid, x + 1, y)) &&
        getCell(grid, x, y - 1) === 'wall' &&
        getCell(grid, x, y + 1) === 'wall';
    return vertical || horizontal;
}
/* ------------------------------------------------------------------ */
/* Step A                                                              */
/* ------------------------------------------------------------------ */
function clearStrayDoors(grid) {
    const h = grid.length;
    const w = grid[0]?.length ?? 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const t = grid[y][x];
            if (t === 'door-h' || t === 'door-v' || t === 'secret-door') {
                grid[y][x] = 'floor';
            }
        }
    }
}
function perimeterCells(room, side) {
    const out = [];
    if (side === 'n') {
        const py = room.y - 1;
        for (let x = room.x; x < room.x + room.w; x++)
            out.push({ x, y: py });
    }
    else if (side === 's') {
        const py = room.y + room.h;
        for (let x = room.x; x < room.x + room.w; x++)
            out.push({ x, y: py });
    }
    else if (side === 'w') {
        const px = room.x - 1;
        for (let y = room.y; y < room.y + room.h; y++)
            out.push({ x: px, y });
    }
    else {
        const px = room.x + room.w;
        for (let y = room.y; y < room.y + room.h; y++)
            out.push({ x: px, y });
    }
    return out;
}
const SIDE_SPECS = {
    n: { doorType: 'door-h', odx: 0, ody: -1, sdx: 1, sdy: 0 },
    s: { doorType: 'door-h', odx: 0, ody: 1, sdx: 1, sdy: 0 },
    w: { doorType: 'door-v', odx: -1, ody: 0, sdx: 0, sdy: 1 },
    e: { doorType: 'door-v', odx: 1, ody: 0, sdx: 0, sdy: 1 },
};
function analyzeRoomPerimeter(grid, room, roomIndex) {
    const result = { doors: [], seals: [], hasOpening: false };
    for (const sideName of ['n', 's', 'w', 'e']) {
        const spec = SIDE_SPECS[sideName];
        const cells = perimeterCells(room, sideName);
        let runStart = -1;
        const finishRun = (end) => {
            // Identify whether the run contains any non-wall, non-floor tile (POI,
            // pre-existing door from an outer pass, etc.). If so, the opening is
            // already preserved by that tile and we leave the entire run alone.
            let hasNonFloorOpening = false;
            let hasFloor = false;
            for (let i = runStart; i <= end; i++) {
                const c = cells[i];
                const t = getCell(grid, c.x, c.y);
                if (t === 'floor')
                    hasFloor = true;
                else if (t !== 'wall' && t !== 'empty')
                    hasNonFloorOpening = true;
            }
            if (hasNonFloorOpening) {
                result.hasOpening = true;
                return;
            }
            if (!hasFloor)
                return;
            // Pick the best `floor` cell in the run for a door:
            //   * inside neighbor must be passable (the room interior)
            //   * outside neighbor must be passable (a corridor tile)
            //   * perpendicular-axis neighbors should be wall (clean frame)
            //   * prefer cells closer to the middle of the run
            const middle = (runStart + end) / 2;
            let bestIdx = -1;
            let bestScore = -Infinity;
            for (let i = runStart; i <= end; i++) {
                const c = cells[i];
                if (getCell(grid, c.x, c.y) !== 'floor')
                    continue;
                const inside = getCell(grid, c.x - spec.odx, c.y - spec.ody);
                if (!isDoorPassageNeighbor(inside))
                    continue;
                const outside = getCell(grid, c.x + spec.odx, c.y + spec.ody);
                if (!isDoorPassageNeighbor(outside))
                    continue;
                const wallA = getCell(grid, c.x + spec.sdx, c.y + spec.sdy);
                const wallB = getCell(grid, c.x - spec.sdx, c.y - spec.sdy);
                let score = 100;
                if (wallA === 'wall')
                    score += 25;
                if (wallB === 'wall')
                    score += 25;
                score -= Math.abs(i - middle);
                if (score > bestScore) {
                    bestScore = score;
                    bestIdx = i;
                }
            }
            if (bestIdx >= 0) {
                const best = cells[bestIdx];
                result.doors.push({ x: best.x, y: best.y, type: spec.doorType, roomIndex });
                result.hasOpening = true;
                // Seal every other floor cell in the run.
                for (let i = runStart; i <= end; i++) {
                    if (i === bestIdx)
                        continue;
                    const c = cells[i];
                    if (getCell(grid, c.x, c.y) === 'floor')
                        result.seals.push({ x: c.x, y: c.y });
                }
            }
            else {
                // No valid frame anywhere in the run: this is the "door into a wall"
                // case the current bug stems from. Seal the entire run; connectivity
                // step E will carve a remediation door if the room becomes
                // unreachable.
                for (let i = runStart; i <= end; i++) {
                    const c = cells[i];
                    if (getCell(grid, c.x, c.y) === 'floor')
                        result.seals.push({ x: c.x, y: c.y });
                }
            }
        };
        for (let i = 0; i < cells.length; i++) {
            const c = cells[i];
            const t = getCell(grid, c.x, c.y);
            const isOpening = t !== 'wall' && t !== 'empty';
            if (isOpening) {
                if (runStart < 0)
                    runStart = i;
            }
            else if (runStart >= 0) {
                finishRun(i - 1);
                runStart = -1;
            }
        }
        if (runStart >= 0)
            finishRun(cells.length - 1);
    }
    return result;
}
function buildRoomMembershipGrid(rooms, w, h) {
    const grid = new Int8Array(w * h);
    for (const r of rooms) {
        const x0 = Math.max(0, r.x);
        const x1 = Math.min(w, r.x + r.w);
        const y0 = Math.max(0, r.y);
        const y1 = Math.min(h, r.y + r.h);
        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++)
                grid[y * w + x] = 1;
        }
    }
    return grid;
}
function gatherCorridorCandidates(grid, rooms) {
    const h = grid.length;
    const w = grid[0]?.length ?? 0;
    const inRoom = buildRoomMembershipGrid(rooms, w, h);
    const candidates = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (grid[y][x] !== 'wall')
                continue;
            // Skip wall cells whose 4-neighborhood intersects a room interior;
            // those belong to step B's perimeter analysis.
            let nearRoom = false;
            for (const [dx, dy] of DIRS_4) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && ny >= 0 && nx < w && ny < h && inRoom[ny * w + nx]) {
                    nearRoom = true;
                    break;
                }
            }
            if (nearRoom)
                continue;
            const n = getCell(grid, x, y - 1);
            const s = getCell(grid, x, y + 1);
            const e = getCell(grid, x + 1, y);
            const wTile = getCell(grid, x - 1, y);
            const horizontal = isDoorPassageNeighbor(n) && isDoorPassageNeighbor(s) && e === 'wall' && wTile === 'wall';
            const vertical = isDoorPassageNeighbor(e) && isDoorPassageNeighbor(wTile) && n === 'wall' && s === 'wall';
            if (horizontal)
                candidates.push({ x, y, type: 'door-h' });
            else if (vertical)
                candidates.push({ x, y, type: 'door-v' });
        }
    }
    return reduceConsecutiveDoors(candidates);
}
/**
 * Group door candidates into contiguous runs along the wall direction
 * and keep only the middle candidate from each run. Prevents long parallel
 * corridors from producing a continuous "wall of doors".
 */
function reduceConsecutiveDoors(candidates) {
    const key = (x, y, t) => `${x},${y},${t}`;
    const remaining = new Set(candidates.map(c => key(c.x, c.y, c.type)));
    const index = new Map();
    for (const c of candidates)
        index.set(key(c.x, c.y, c.type), c);
    const result = [];
    for (const c of candidates) {
        const k = key(c.x, c.y, c.type);
        if (!remaining.has(k))
            continue;
        const run = [c];
        remaining.delete(k);
        const dx = c.type === 'door-h' ? 1 : 0;
        const dy = c.type === 'door-v' ? 1 : 0;
        for (let nx = c.x + dx, ny = c.y + dy;; nx += dx, ny += dy) {
            const nk = key(nx, ny, c.type);
            if (!remaining.has(nk))
                break;
            run.push(index.get(nk));
            remaining.delete(nk);
        }
        for (let nx = c.x - dx, ny = c.y - dy;; nx -= dx, ny -= dy) {
            const nk = key(nx, ny, c.type);
            if (!remaining.has(nk))
                break;
            run.unshift(index.get(nk));
            remaining.delete(nk);
        }
        result.push(run[Math.floor(run.length / 2)]);
    }
    return result;
}
/* ------------------------------------------------------------------ */
/* Step D + connectivity helpers                                       */
/* ------------------------------------------------------------------ */
function findStartCell(grid, rooms, startRoomIndex) {
    // Prefer the literal `start` tile if present, fall back to the start
    // room's center.
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] === 'start')
                return { x, y };
        }
    }
    const r = rooms[startRoomIndex];
    if (!r)
        return undefined;
    return { x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) };
}
function bfsConnectivity(grid, sx, sy) {
    const h = grid.length;
    const w = grid[0]?.length ?? 0;
    const visited = new Uint8Array(w * h);
    if (sx < 0 || sy < 0 || sx >= w || sy >= h)
        return visited;
    if (!isConnectivityPassable(grid[sy][sx]))
        return visited;
    const queue = [sy * w + sx];
    visited[sy * w + sx] = 1;
    let head = 0;
    while (head < queue.length) {
        const idx = queue[head++];
        const x = idx % w;
        const y = (idx - x) / w;
        for (const [dx, dy] of DIRS_4) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h)
                continue;
            const ni = ny * w + nx;
            if (visited[ni])
                continue;
            if (!isConnectivityPassable(grid[ny][nx]))
                continue;
            visited[ni] = 1;
            queue.push(ni);
        }
    }
    return visited;
}
function roomIsReachable(visited, room, w, h) {
    const x0 = Math.max(0, room.x);
    const x1 = Math.min(w, room.x + room.w);
    const y0 = Math.max(0, room.y);
    const y1 = Math.min(h, room.y + room.h);
    for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
            if (visited[y * w + x])
                return true;
        }
    }
    return false;
}
/* ------------------------------------------------------------------ */
/* Step E: connectivity remediation                                    */
/* ------------------------------------------------------------------ */
/**
 * Try to connect a stranded room to the rest of the dungeon by carving
 * exactly one door (and at most one perpendicular wall rewrite to form a
 * clean frame) on its perimeter. Walks each perimeter cell looking for a
 * wall whose outward neighbor is reachable from the start.
 */
function carveRemediationDoor(grid, room, reachable, w, h) {
    const cands = [];
    for (const sideName of ['n', 's', 'w', 'e']) {
        const spec = SIDE_SPECS[sideName];
        const cells = perimeterCells(room, sideName);
        for (const c of cells) {
            if (c.x < 0 || c.y < 0 || c.x >= w || c.y >= h)
                continue;
            if (grid[c.y][c.x] !== 'wall')
                continue;
            const inside = getCell(grid, c.x - spec.odx, c.y - spec.ody);
            if (!isDoorPassageNeighbor(inside))
                continue;
            const outside = getCell(grid, c.x + spec.odx, c.y + spec.ody);
            if (!isDoorPassageNeighbor(outside))
                continue;
            const ox = c.x + spec.odx;
            const oy = c.y + spec.ody;
            const outsideReachable = ox >= 0 && oy >= 0 && ox < w && oy < h && reachable[oy * w + ox] === 1;
            const wa1Pos = { x: c.x + spec.sdx, y: c.y + spec.sdy };
            const wa2Pos = { x: c.x - spec.sdx, y: c.y - spec.sdy };
            const wa1 = getCell(grid, wa1Pos.x, wa1Pos.y);
            const wa2 = getCell(grid, wa2Pos.x, wa2Pos.y);
            let needsRewrite = null;
            if (wa1 !== 'wall' && wa2 !== 'wall')
                continue; // both sides open – not a viable frame
            if (wa1 !== 'wall')
                needsRewrite = wa1Pos;
            else if (wa2 !== 'wall')
                needsRewrite = wa2Pos;
            // Only allow rewriting `floor` (don't bury POIs).
            if (needsRewrite && getCell(grid, needsRewrite.x, needsRewrite.y) !== 'floor')
                continue;
            let score = 0;
            if (outsideReachable)
                score += 1000;
            if (!needsRewrite)
                score += 100;
            cands.push({ x: c.x, y: c.y, type: spec.doorType, needsRewrite, score });
        }
    }
    cands.sort((a, b) => b.score - a.score);
    for (const c of cands) {
        if (c.needsRewrite)
            grid[c.needsRewrite.y][c.needsRewrite.x] = 'wall';
        grid[c.y][c.x] = c.type;
        return true;
    }
    return false;
}
/* ------------------------------------------------------------------ */
/* Step F: safe slider thinning                                        */
/* ------------------------------------------------------------------ */
function shuffleArray(items, rng) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}
function thinDoorsSafely(grid, doorCells, rng, keepFraction, rooms, startRoomIndex) {
    if (keepFraction >= 1)
        return;
    const keep = Math.max(0, Math.min(1, keepFraction));
    const totalToRemove = Math.round(doorCells.length * (1 - keep));
    if (totalToRemove <= 0)
        return;
    const w = grid[0]?.length ?? 0;
    const h = grid.length;
    const start = findStartCell(grid, rooms, startRoomIndex);
    if (!start)
        return;
    let removed = 0;
    for (const d of shuffleArray(doorCells, rng)) {
        if (removed >= totalToRemove)
            break;
        const t = grid[d.y][d.x];
        if (t !== d.type)
            continue;
        grid[d.y][d.x] = 'wall';
        const reachable = bfsConnectivity(grid, start.x, start.y);
        let allReachable = true;
        for (let i = 0; i < rooms.length; i++) {
            if (i === startRoomIndex)
                continue;
            if (!roomIsReachable(reachable, rooms[i], w, h)) {
                allReachable = false;
                break;
            }
        }
        if (allReachable) {
            removed++;
        }
        else {
            grid[d.y][d.x] = t;
        }
    }
}
/* ------------------------------------------------------------------ */
/* Step G: secret door conversion                                      */
/* ------------------------------------------------------------------ */
function adjacentRoomsForDoor(rooms, x, y) {
    const out = new Set();
    for (const [dx, dy] of DIRS_4) {
        const nx = x + dx;
        const ny = y + dy;
        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            if (nx >= r.x && nx < r.x + r.w && ny >= r.y && ny < r.y + r.h)
                out.add(i);
        }
    }
    return [...out];
}
function convertSecretDoors(grid, rooms, rng, fraction, startRoomIndex) {
    if (!Number.isFinite(fraction) || fraction <= 0)
        return;
    const clampedFraction = Math.min(1, fraction);
    const h = grid.length;
    const w = grid[0]?.length ?? 0;
    const doors = [];
    const doorCountByRoom = new Map();
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const t = grid[y][x];
            if (t !== 'door-h' && t !== 'door-v')
                continue;
            const adj = adjacentRoomsForDoor(rooms, x, y);
            if (adj.length === 0)
                continue;
            if (adj.includes(startRoomIndex))
                continue;
            doors.push({ x, y, rooms: adj, preferred: false });
            for (const r of adj)
                doorCountByRoom.set(r, (doorCountByRoom.get(r) ?? 0) + 1);
        }
    }
    for (const c of doors) {
        c.preferred = c.rooms.length === 1 && (doorCountByRoom.get(c.rooms[0]) ?? 0) === 1;
    }
    if (doors.length === 0)
        return;
    const target = Math.min(doors.length, Math.round(doors.length * clampedFraction));
    if (target <= 0)
        return;
    const selected = [];
    const addFrom = (pool) => {
        for (const c of shuffleArray(pool, rng)) {
            if (selected.length >= target)
                break;
            selected.push(c);
        }
    };
    addFrom(doors.filter(c => c.preferred));
    if (selected.length < target)
        addFrom(doors.filter(c => !c.preferred));
    for (const c of selected) {
        grid[c.y][c.x] = 'secret-door';
    }
    // After conversion, drop any secret door whose geometry no longer holds
    // (defensive; shouldn't trigger because we operate on validated doors).
    for (const c of selected) {
        if (grid[c.y][c.x] === 'secret-door' && !secretDoorIsValid(grid, c.x, c.y)) {
            grid[c.y][c.x] = 'wall';
        }
    }
}
/* ------------------------------------------------------------------ */
/* Step H: dev-only assertion                                          */
/* ------------------------------------------------------------------ */
function assertDoorsValid(grid) {
    const h = grid.length;
    const w = grid[0]?.length ?? 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const t = grid[y][x];
            if (t === 'door-h' || t === 'door-v') {
                if (!doorIsValid(grid, x, y, t)) {
                    console.warn(`[doorEngine] invalid ${t} at (${x},${y})`);
                }
            }
            else if (t === 'secret-door') {
                if (!secretDoorIsValid(grid, x, y)) {
                    console.warn(`[doorEngine] invalid secret-door at (${x},${y})`);
                }
            }
        }
    }
}
/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */
export function applyDoors(grid, rooms, rng, opts = {}) {
    const startRoomIndex = opts.startRoomIndex ?? 0;
    const w = grid[0]?.length ?? 0;
    const h = grid.length;
    // Step A
    clearStrayDoors(grid);
    // Step B: per-room perimeter analysis (does not mutate yet — collects
    // door candidates and seal targets).
    const roomCandidates = [];
    const sealTargets = [];
    for (let i = 0; i < rooms.length; i++) {
        const a = analyzeRoomPerimeter(grid, rooms[i], i);
        roomCandidates.push(...a.doors);
        sealTargets.push(...a.seals);
    }
    // Apply seals first so the corridor scan in step C only sees the
    // structural walls, not the perimeter noise that step B intends to
    // clean up. Connectivity is verified after door commit + remediation.
    for (const s of sealTargets) {
        if (grid[s.y]?.[s.x] === 'floor')
            grid[s.y][s.x] = 'wall';
    }
    // Step C: corridor candidates (with consecutive-run reduction).
    const corridorCandidates = gatherCorridorCandidates(grid, rooms);
    // Step D: commit with strict validation.
    const committed = [];
    for (const c of roomCandidates) {
        // Re-validate against the post-seal grid.
        if (grid[c.y]?.[c.x] !== 'floor' && grid[c.y]?.[c.x] !== 'wall')
            continue;
        // Temporarily place to test validity.
        const original = grid[c.y][c.x];
        grid[c.y][c.x] = c.type;
        if (doorIsValid(grid, c.x, c.y, c.type)) {
            committed.push({ x: c.x, y: c.y, type: c.type });
        }
        else {
            grid[c.y][c.x] = original;
        }
    }
    for (const c of corridorCandidates) {
        if (grid[c.y]?.[c.x] !== 'wall')
            continue;
        grid[c.y][c.x] = c.type;
        if (doorIsValid(grid, c.x, c.y, c.type)) {
            committed.push({ x: c.x, y: c.y, type: c.type });
        }
        else {
            grid[c.y][c.x] = 'wall';
        }
    }
    // Step E: connectivity guarantee.
    const start = findStartCell(grid, rooms, startRoomIndex);
    if (start) {
        let reachable = bfsConnectivity(grid, start.x, start.y);
        for (let i = 0; i < rooms.length; i++) {
            if (i === startRoomIndex)
                continue;
            if (roomIsReachable(reachable, rooms[i], w, h))
                continue;
            const ok = carveRemediationDoor(grid, rooms[i], reachable, w, h);
            if (ok) {
                // Track the new door for the slider step below.
                for (const sideName of ['n', 's', 'w', 'e']) {
                    for (const c of perimeterCells(rooms[i], sideName)) {
                        const t = grid[c.y]?.[c.x];
                        if (t === 'door-h' || t === 'door-v') {
                            if (!committed.some(d => d.x === c.x && d.y === c.y)) {
                                committed.push({ x: c.x, y: c.y, type: t });
                            }
                        }
                    }
                }
                reachable = bfsConnectivity(grid, start.x, start.y);
            }
        }
    }
    // Step F: slider-driven thinning (preserves connectivity).
    if (opts.doorKeepFraction !== undefined) {
        thinDoorsSafely(grid, committed, rng, opts.doorKeepFraction, rooms, startRoomIndex);
    }
    // Step G: secret-door conversion.
    if (opts.secretDoorFraction && opts.secretDoorFraction > 0) {
        convertSecretDoors(grid, rooms, rng, opts.secretDoorFraction, startRoomIndex);
    }
    // Step H: dev-only assertion.
    if (import.meta.env?.DEV) {
        assertDoorsValid(grid);
    }
}
