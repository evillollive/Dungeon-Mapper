import type { Tile } from '../types/map';

export function isSecretDiscovered(base: Tile, rendered: Tile): boolean {
  return base.discovered === true && (base.discoveredType ?? base.type) === rendered.type;
}

/** A geometry edit invalidates location-bound discovery, not authored tiles. */
export function clearDerivedDiscovery(tiles: Tile[][]): Tile[][] {
  const rows = tiles.map(row => !row.some(tile => tile.discoveredType !== undefined) ? row : row.map(tile => {
    if (tile.discoveredType === undefined) return tile;
    const next = { ...tile };
    delete next.discoveredType;
    delete next.discovered;
    return next;
  }));
  return rows.some((row, y) => row !== tiles[y]) ? rows : tiles;
}
