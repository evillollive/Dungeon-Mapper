import type { RoomShape, Tile, TileType, RoomEdge, EdgeMergeMode } from '../types/map';

/**
 * Rasterize an array of `RoomShape` objects onto a **copy** of the given
 * tile grid with **visual merging**. For each shape:
 *
 * 1. Interior cells are filled with `fillTile` (default `'floor'`).
 * 2. Perimeter cells (the one-tile-thick boundary) are set to `wallTile`
 *    (default `'wall'`).
 * 3. Any `doorHints` override the perimeter cell at the specified offset
 *    with the hint's tile type (defaulting to `'door-h'` for north/south
 *    edges and `'door-v'` for east/west edges).
 *
 * **Visual merging (Phase 10.3):**
 * After all shapes are individually rasterized, a merge pass dissolves
 * shared interior walls. A perimeter cell of shape A is dissolved to
 * floor if it falls inside another shape B (interior or shared boundary).
 *
 * Per-edge merge overrides (`edgeMergeOverrides`) let individual edges
 * keep walls (`'wall'`), place doors (`'door'`), or place archways
 * (`'arch'`) instead of the default `'auto'` dissolve.
 *
 * **Subtractive shapes (Phase 10.5):**
 * Shapes with `mode === 'subtractive'` carve out overlapping additive
 * geometry — interior cells become `'empty'` and perimeter cells become
 * `'wall'` only where they border additive geometry.
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

  // Separate additive and subtractive shapes.
  const additive = roomShapes.filter(s => (s.mode ?? 'additive') === 'additive');
  const subtractive = roomShapes.filter(s => s.mode === 'subtractive');

  // Pass 1: rasterize each additive shape individually.
  for (const shape of additive) {
    rasterizeOneShape(tiles, shape, width, height);
  }

  // Pass 2: visual merge — dissolve shared walls between overlapping/touching additive rooms.
  if (additive.length > 1) {
    mergeSharedWalls(tiles, additive, width, height);
  }

  // Pass 3: re-apply door hints after merge (so explicit doors survive merge).
  for (const shape of additive) {
    applyDoorHints(tiles, shape, width, height);
  }

  // Pass 4: apply subtractive shapes — carve overlapping additive geometry.
  for (const shape of subtractive) {
    applySubtractiveShape(tiles, shape, additive, width, height);
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

  // Fill interior + perimeter.
  for (let cy = y0; cy < y1; cy++) {
    for (let cx = x0; cx < x1; cx++) {
      const isPerimeter =
        cx === x || cx === x + sw - 1 || cy === y || cy === y + sh - 1;
      tiles[cy][cx] = { type: isPerimeter ? wallTile : fillTile };
    }
  }
}

/**
 * Apply door hints for a single shape. Called after the merge pass so
 * explicit door placements are not overwritten by merge logic.
 */
function applyDoorHints(
  tiles: Tile[][],
  shape: RoomShape,
  gridWidth: number,
  gridHeight: number,
): void {
  if (!shape.doorHints) return;
  for (const hint of shape.doorHints) {
    const pos = doorHintToCell(shape, hint);
    if (!pos) continue;
    const [dx, dy] = pos;
    if (dx < 0 || dy < 0 || dx >= gridWidth || dy >= gridHeight) continue;
    const doorType = hint.type ?? defaultDoorType(hint.edge);
    tiles[dy][dx] = { type: doorType };
  }
}

/**
 * Dissolve shared walls between overlapping or touching room shapes.
 *
 * For each perimeter cell of each shape, we check whether it also falls
 * inside (or on the perimeter of) another shape. If so, the merge mode
 * on the relevant edge determines what happens:
 * - `'auto'` (default): dissolve to fill tile
 * - `'wall'`: keep the wall
 * - `'door'`: place a door tile (horizontal or vertical based on edge)
 * - `'arch'`: place an archway tile
 */
function mergeSharedWalls(
  tiles: Tile[][],
  roomShapes: RoomShape[],
  gridWidth: number,
  gridHeight: number,
): void {
  for (let i = 0; i < roomShapes.length; i++) {
    const shapeA = roomShapes[i];
    const fillA: TileType = shapeA.fillTile ?? 'floor';

    // Iterate over perimeter cells of shapeA.
    const perimeterCells = getPerimeterCells(shapeA, gridWidth, gridHeight);

    for (const { cx, cy, edge } of perimeterCells) {
      // Check if this perimeter cell falls inside any other shape.
      for (let j = 0; j < roomShapes.length; j++) {
        if (i === j) continue;
        const shapeB = roomShapes[j];

        if (!cellInsideShape(cx, cy, shapeB)) continue;

        // This cell is shared — determine merge mode.
        const mode = getEdgeMergeMode(shapeA, edge);
        // Also check the other shape's merge mode for its relevant edge.
        const edgeB = getOpposingEdge(cx, cy, shapeB);
        const modeB = edgeB ? getEdgeMergeMode(shapeB, edgeB) : 'auto';

        // If either side forces 'wall', keep wall.
        if (mode === 'wall' || modeB === 'wall') break;

        if (mode === 'door' || modeB === 'door') {
          // Place a door tile based on edge direction.
          const doorTile = defaultDoorType(edge);
          tiles[cy][cx] = { type: doorTile };
        } else if (mode === 'arch' || modeB === 'arch') {
          tiles[cy][cx] = { type: 'archway' };
        } else {
          // 'auto' — dissolve to fill tile.
          // Use fillA if the cell is perimeter of A and interior of B,
          // otherwise use the fill of whichever shape claims interior.
          const isInteriorB = cellInteriorShape(cx, cy, shapeB);
          const fillB: TileType = shapeB.fillTile ?? 'floor';
          tiles[cy][cx] = { type: isInteriorB ? fillB : fillA };
        }
        break; // Only need one other shape to trigger merge.
      }
    }
  }
}

/**
 * Get all perimeter cells of a shape, clamped to grid bounds, with their
 * edge direction.
 */
function getPerimeterCells(
  shape: RoomShape,
  gridWidth: number,
  gridHeight: number,
): { cx: number; cy: number; edge: RoomEdge }[] {
  const { x, y, width: sw, height: sh } = shape;
  const cells: { cx: number; cy: number; edge: RoomEdge }[] = [];

  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(gridWidth, x + sw);
  const y1 = Math.min(gridHeight, y + sh);

  for (let cy = y0; cy < y1; cy++) {
    for (let cx = x0; cx < x1; cx++) {
      const onN = cy === y;
      const onS = cy === y + sh - 1;
      const onW = cx === x;
      const onE = cx === x + sw - 1;

      if (!onN && !onS && !onW && !onE) continue; // interior

      // Determine the primary edge for this cell. Corners get the
      // north/south edge (arbitrary but consistent).
      let edge: RoomEdge;
      if (onN) edge = 'n';
      else if (onS) edge = 's';
      else if (onW) edge = 'w';
      else edge = 'e';

      cells.push({ cx, cy, edge });
    }
  }

  return cells;
}

/**
 * Check if a cell (cx, cy) is inside a shape (including perimeter).
 */
function cellInsideShape(cx: number, cy: number, shape: RoomShape): boolean {
  return (
    cx >= shape.x &&
    cx < shape.x + shape.width &&
    cy >= shape.y &&
    cy < shape.y + shape.height
  );
}

/**
 * Check if a cell (cx, cy) is strictly interior to a shape (not perimeter).
 */
function cellInteriorShape(cx: number, cy: number, shape: RoomShape): boolean {
  return (
    cx > shape.x &&
    cx < shape.x + shape.width - 1 &&
    cy > shape.y &&
    cy < shape.y + shape.height - 1
  );
}

/**
 * Get the edge of a shape that a cell touches. Returns the primary edge
 * if the cell is on the perimeter of the shape, or `null` if interior.
 */
function getOpposingEdge(cx: number, cy: number, shape: RoomShape): RoomEdge | null {
  const onN = cy === shape.y;
  const onS = cy === shape.y + shape.height - 1;
  const onW = cx === shape.x;
  const onE = cx === shape.x + shape.width - 1;

  if (!onN && !onS && !onW && !onE) return null; // interior

  if (onN) return 'n';
  if (onS) return 's';
  if (onW) return 'w';
  return 'e';
}

/**
 * Get the merge mode for a specific edge of a shape.
 */
function getEdgeMergeMode(shape: RoomShape, edge: RoomEdge): EdgeMergeMode {
  if (!shape.edgeMergeOverrides) return 'auto';
  const override = shape.edgeMergeOverrides.find(o => o.edge === edge);
  return override?.mode ?? 'auto';
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

/**
 * Apply a subtractive shape — carve out overlapping additive geometry.
 *
 * Interior cells of the subtractive shape that overlap any additive shape
 * are set to `'empty'`. Perimeter cells of the subtractive shape that
 * border additive geometry become walls (to seal the cut). Perimeter cells
 * that don't border any additive shape are left untouched.
 */
function applySubtractiveShape(
  tiles: Tile[][],
  shape: RoomShape,
  additiveShapes: RoomShape[],
  gridWidth: number,
  gridHeight: number,
): void {
  const { x, y, width: sw, height: sh } = shape;
  const wallTile: TileType = shape.wallTile ?? 'wall';

  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(gridWidth, x + sw);
  const y1 = Math.min(gridHeight, y + sh);

  for (let cy = y0; cy < y1; cy++) {
    for (let cx = x0; cx < x1; cx++) {
      const isPerimeter =
        cx === x || cx === x + sw - 1 || cy === y || cy === y + sh - 1;

      // Check if this cell overlaps any additive shape.
      const overlapsAdditive = additiveShapes.some(a => cellInsideShape(cx, cy, a));

      if (!overlapsAdditive) continue; // Only carve where additive geometry exists.

      if (isPerimeter) {
        // Seal the cut with a wall at the boundary.
        tiles[cy][cx] = { type: wallTile };
      } else {
        // Carve interior to empty.
        tiles[cy][cx] = { type: 'empty' };
      }
    }
  }
}
