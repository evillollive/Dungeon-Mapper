import type { RoomShape, Tile, TileType } from '../types/map';

/**
 * Rasterize an array of `RoomShape` objects onto a **copy** of the given
 * tile grid. For each shape:
 *
 * 1. Interior cells are filled with `fillTile` (default `'floor'`).
 * 2. Perimeter cells (the one-tile-thick boundary) are set to `wallTile`
 *    (default `'wall'`).
 * 3. Any `doorHints` override the perimeter cell at the specified offset
 *    with the hint's tile type (defaulting to `'door-h'` for north/south
 *    edges and `'door-v'` for east/west edges).
 *
 * Shapes are applied in array order — later shapes can overwrite earlier
 * ones. Cells outside the grid bounds are silently ignored.
 *
 * **Coexistence:** The returned grid is a fresh copy; the caller can
 * composite it with manually-painted tiles as needed.
 */
export function rasterizeRoomShapes(
  baseTiles: Tile[][],
  roomShapes: RoomShape[],
  width: number,
  height: number,
): Tile[][] {
  // Deep-copy the base grid so callers keep the original intact.
  const tiles: Tile[][] = baseTiles.map(row => row.map(t => ({ ...t })));

  for (const shape of roomShapes) {
    rasterizeOneShape(tiles, shape, width, height);
  }

  return tiles;
}

/**
 * Rasterize a single room shape onto a mutable tile grid.
 */
function rasterizeOneShape(
  tiles: Tile[][],
  shape: RoomShape,
  gridWidth: number,
  gridHeight: number,
): void {
  const { x, y, width: sw, height: sh } = shape;
  const fillTile: TileType = shape.fillTile ?? 'floor';
  const wallTile: TileType = shape.wallTile ?? 'wall';

  // Clamp iteration bounds to grid.
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(gridWidth, x + sw);
  const y1 = Math.min(gridHeight, y + sh);

  // Pass 1: fill interior + perimeter.
  for (let cy = y0; cy < y1; cy++) {
    for (let cx = x0; cx < x1; cx++) {
      const isPerimeter =
        cx === x || cx === x + sw - 1 || cy === y || cy === y + sh - 1;
      tiles[cy][cx] = { type: isPerimeter ? wallTile : fillTile };
    }
  }

  // Pass 2: apply door hints on perimeter cells.
  if (shape.doorHints) {
    for (const hint of shape.doorHints) {
      const pos = doorHintToCell(shape, hint);
      if (!pos) continue;
      const [dx, dy] = pos;
      if (dx < 0 || dy < 0 || dx >= gridWidth || dy >= gridHeight) continue;
      const doorType = hint.type ?? defaultDoorType(hint.edge);
      tiles[dy][dx] = { type: doorType };
    }
  }
}

/**
 * Convert a door hint (edge + offset) to absolute grid coordinates.
 * Returns `null` if the offset is out of range for the edge.
 */
function doorHintToCell(
  shape: RoomShape,
  hint: { edge: 'n' | 's' | 'e' | 'w'; offset: number },
): [number, number] | null {
  const { x, y, width: sw, height: sh } = shape;
  switch (hint.edge) {
    case 'n': {
      if (hint.offset < 0 || hint.offset >= sw) return null;
      return [x + hint.offset, y];
    }
    case 's': {
      if (hint.offset < 0 || hint.offset >= sw) return null;
      return [x + hint.offset, y + sh - 1];
    }
    case 'w': {
      if (hint.offset < 0 || hint.offset >= sh) return null;
      return [x, y + hint.offset];
    }
    case 'e': {
      if (hint.offset < 0 || hint.offset >= sh) return null;
      return [x + sw - 1, y + hint.offset];
    }
  }
}

/**
 * Default door tile type based on the edge direction. North/south edges
 * get horizontal doors; east/west edges get vertical doors.
 */
function defaultDoorType(edge: 'n' | 's' | 'e' | 'w'): TileType {
  return edge === 'n' || edge === 's' ? 'door-h' : 'door-v';
}
