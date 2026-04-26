/**
 * Returns `true` if any cell of the token's footprint is currently fogged.
 * Used to decide whether a token should be hidden from the player view —
 * a multi-cell monster must stay hidden if *any* of its cells is fogged so
 * a partially-revealed room doesn't leak its existence.
 */
export function isTokenFogged(token, fog) {
    if (!fog)
        return false;
    const sz = Math.max(1, Math.floor(token.size ?? 1));
    for (let dy = 0; dy < sz; dy++) {
        for (let dx = 0; dx < sz; dx++) {
            if (fog[token.y + dy]?.[token.x + dx])
                return true;
        }
    }
    return false;
}
