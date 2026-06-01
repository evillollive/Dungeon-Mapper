import type { RoomShape, RoomShapeType, Tile, TileType, RoomEdge, EdgeMergeMode } from '../types/map';

/* ── Helpers: shape type resolution ─────────────────────────────────────── */

function shapeTypeOf(shape: RoomShape): RoomShapeType {
  return shape.shapeType ?? 'rect';
}

const PRESERVE_UNDER_DEFAULT_ROOM_TILES: ReadonlySet<TileType> = new Set([
  'water',
  'pillar',
  'trap',
  'treasure',
  'start',
  'stairs-up',
  'stairs-down',
  'door-h',
  'door-v',
  'secret-door',
  'locked-door-h',
  'locked-door-v',
  'trapped-door-h',
  'trapped-door-v',
  'portcullis',
  'archway',
  'barricade',
]);

function shouldPreserveExistingTile(existing: Tile, nextType: TileType): boolean {
  if (nextType !== 'floor' && nextType !== 'wall') return false;
  return existing.noteId !== undefined || PRESERVE_UNDER_DEFAULT_ROOM_TILES.has(existing.type);
}

function writeRoomTile(tiles: Tile[][], x: number, y: number, nextType: TileType): void {
  const existing = tiles[y]?.[x];
  if (!existing || shouldPreserveExistingTile(existing, nextType)) return;
  tiles[y][x] = { type: nextType };
}

/* ── Helpers: ellipse math ──────────────────────────────────────────────── */

/** Centre and radii of the ellipse inscribed in a shape's bounding box. */
function ellipseParams(shape: RoomShape) {
  const cx = shape.x + shape.width / 2;
  const cy = shape.y + shape.height / 2;
  const rx = shape.width / 2;
  const ry = shape.height / 2;
  return { cx, cy, rx, ry };
}

/**
 * Check whether the **centre** of a grid cell (cx+0.5, cy+0.5) falls
 * inside or on the ellipse inscribed in the shape's bounding box.
 */
function cellInEllipse(cellX: number, cellY: number, shape: RoomShape): boolean {
  const { cx, cy, rx, ry } = ellipseParams(shape);
  if (rx <= 0 || ry <= 0) return false;
  const px = cellX + 0.5;
  const py = cellY + 0.5;
  const dx = px - cx;
  const dy = py - cy;
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}

/**
 * Strictly interior: the cell centre must be inside the ellipse shrunk
 * by ~1 tile (so the perimeter ring is excluded).
 */
function cellInteriorEllipse(cellX: number, cellY: number, shape: RoomShape): boolean {
  const { cx, cy, rx, ry } = ellipseParams(shape);
  const shrink = 1; // 1-tile perimeter
  const srx = rx - shrink;
  const sry = ry - shrink;
  if (srx <= 0 || sry <= 0) return false;
  const px = cellX + 0.5;
  const py = cellY + 0.5;
  const dx = px - cx;
  const dy = py - cy;
  return (dx * dx) / (srx * srx) + (dy * dy) / (sry * sry) < 1;
}

/* ── Helpers: polygon math ──────────────────────────────────────────────── */

/**
 * Point-in-polygon test using ray-casting (centre of cell).
 */
function cellInPolygon(cellX: number, cellY: number, vertices: { x: number; y: number }[]): boolean {
  const px = cellX + 0.5;
  const py = cellY + 0.5;
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Distance from a point to the nearest polygon edge.
 */
function distToPolygonEdge(px: number, py: number, vertices: { x: number; y: number }[]): number {
  let minDist = Infinity;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const ax = vertices[j].x, ay = vertices[j].y;
    const bx = vertices[i].x, by = vertices[i].y;
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cy = ay + t * dy;
    const d = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Strictly interior to polygon: cell centre is inside and at least 1 tile
 * from any edge.
 */
function cellInteriorPolygon(cellX: number, cellY: number, vertices: { x: number; y: number }[]): boolean {
  if (!cellInPolygon(cellX, cellY, vertices)) return false;
  const px = cellX + 0.5;
  const py = cellY + 0.5;
  return distToPolygonEdge(px, py, vertices) > 1;
}

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
 * Dispatches to geometry-specific logic based on `shapeType`.
 */
function rasterizeOneShape(
  tiles: Tile[][],
  shape: RoomShape,
  gridWidth: number,
  gridHeight: number,
): void {
  const st = shapeTypeOf(shape);
  if (st === 'circle') {
    rasterizeCircleShape(tiles, shape, gridWidth, gridHeight);
  } else if (st === 'polygon') {
    rasterizePolygonShape(tiles, shape, gridWidth, gridHeight);
  } else {
    rasterizeRectShape(tiles, shape, gridWidth, gridHeight);
  }
}

/** Rasterize an axis-aligned rectangle. */
function rasterizeRectShape(
  tiles: Tile[][],
  shape: RoomShape,
  gridWidth: number,
  gridHeight: number,
): void {
  const { x, y, width: sw, height: sh } = shape;
  const fillTile: TileType = shape.fillTile ?? 'floor';
  const wallTile: TileType = shape.wallTile ?? 'wall';

  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(gridWidth, x + sw);
  const y1 = Math.min(gridHeight, y + sh);

  for (let cy = y0; cy < y1; cy++) {
    for (let cx = x0; cx < x1; cx++) {
      const isPerimeter =
        cx === x || cx === x + sw - 1 || cy === y || cy === y + sh - 1;
      writeRoomTile(tiles, cx, cy, isPerimeter ? wallTile : fillTile);
    }
  }
}

/** Rasterize a circle/ellipse inscribed in the bounding box. */
function rasterizeCircleShape(
  tiles: Tile[][],
  shape: RoomShape,
  gridWidth: number,
  gridHeight: number,
): void {
  const fillTile: TileType = shape.fillTile ?? 'floor';
  const wallTile: TileType = shape.wallTile ?? 'wall';

  const x0 = Math.max(0, shape.x);
  const y0 = Math.max(0, shape.y);
  const x1 = Math.min(gridWidth, shape.x + shape.width);
  const y1 = Math.min(gridHeight, shape.y + shape.height);

  for (let cy = y0; cy < y1; cy++) {
    for (let cx = x0; cx < x1; cx++) {
      if (!cellInEllipse(cx, cy, shape)) continue;
      const interior = cellInteriorEllipse(cx, cy, shape);
      writeRoomTile(tiles, cx, cy, interior ? fillTile : wallTile);
    }
  }
}

/** Rasterize a polygon defined by vertices. */
function rasterizePolygonShape(
  tiles: Tile[][],
  shape: RoomShape,
  gridWidth: number,
  gridHeight: number,
): void {
  const verts = shape.vertices;
  if (!verts || verts.length < 3) return;

  const fillTile: TileType = shape.fillTile ?? 'floor';
  const wallTile: TileType = shape.wallTile ?? 'wall';

  const x0 = Math.max(0, shape.x);
  const y0 = Math.max(0, shape.y);
  const x1 = Math.min(gridWidth, shape.x + shape.width);
  const y1 = Math.min(gridHeight, shape.y + shape.height);

  for (let cy = y0; cy < y1; cy++) {
    for (let cx = x0; cx < x1; cx++) {
      if (!cellInPolygon(cx, cy, verts)) continue;
      const interior = cellInteriorPolygon(cx, cy, verts);
      writeRoomTile(tiles, cx, cy, interior ? fillTile : wallTile);
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
          writeRoomTile(tiles, cx, cy, isInteriorB ? fillB : fillA);
        }
        break; // Only need one other shape to trigger merge.
      }
    }
  }
}

/**
 * Get all perimeter cells of a shape, clamped to grid bounds, with their
 * edge direction. Dispatches on shape type.
 */
function getPerimeterCells(
  shape: RoomShape,
  gridWidth: number,
  gridHeight: number,
): { cx: number; cy: number; edge: RoomEdge }[] {
  const st = shapeTypeOf(shape);
  if (st === 'circle') return getPerimeterCellsEllipse(shape, gridWidth, gridHeight);
  if (st === 'polygon') return getPerimeterCellsPolygon(shape, gridWidth, gridHeight);
  return getPerimeterCellsRect(shape, gridWidth, gridHeight);
}

function getPerimeterCellsRect(
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
 * Perimeter cells for an ellipse: cells that are inside the outer ellipse
 * but not in the interior (shrunk) ellipse. Edge direction is determined
 * by the cell's position relative to the centre.
 */
function getPerimeterCellsEllipse(
  shape: RoomShape,
  gridWidth: number,
  gridHeight: number,
): { cx: number; cy: number; edge: RoomEdge }[] {
  const cells: { cx: number; cy: number; edge: RoomEdge }[] = [];
  const { cx: ecx, cy: ecy } = ellipseParams(shape);

  const x0 = Math.max(0, shape.x);
  const y0 = Math.max(0, shape.y);
  const x1 = Math.min(gridWidth, shape.x + shape.width);
  const y1 = Math.min(gridHeight, shape.y + shape.height);

  for (let cy = y0; cy < y1; cy++) {
    for (let cx = x0; cx < x1; cx++) {
      if (!cellInEllipse(cx, cy, shape)) continue;
      if (cellInteriorEllipse(cx, cy, shape)) continue;
      // This is a perimeter cell — determine edge from angle to centre.
      const edge = edgeFromAngle(cx + 0.5 - ecx, cy + 0.5 - ecy);
      cells.push({ cx, cy, edge });
    }
  }

  return cells;
}

/**
 * Perimeter cells for a polygon: cells inside the polygon but not strictly
 * interior. Edge direction is determined by the nearest polygon edge.
 */
function getPerimeterCellsPolygon(
  shape: RoomShape,
  gridWidth: number,
  gridHeight: number,
): { cx: number; cy: number; edge: RoomEdge }[] {
  const verts = shape.vertices;
  if (!verts || verts.length < 3) return [];
  const cells: { cx: number; cy: number; edge: RoomEdge }[] = [];

  const x0 = Math.max(0, shape.x);
  const y0 = Math.max(0, shape.y);
  const x1 = Math.min(gridWidth, shape.x + shape.width);
  const y1 = Math.min(gridHeight, shape.y + shape.height);

  for (let cy = y0; cy < y1; cy++) {
    for (let cx = x0; cx < x1; cx++) {
      if (!cellInPolygon(cx, cy, verts)) continue;
      if (cellInteriorPolygon(cx, cy, verts)) continue;
      // Determine edge from nearest polygon edge normal.
      const edge = nearestEdgeDirection(cx + 0.5, cy + 0.5, verts);
      cells.push({ cx, cy, edge });
    }
  }

  return cells;
}

/** Map an angle vector to the nearest cardinal edge direction. */
function edgeFromAngle(dx: number, dy: number): RoomEdge {
  if (Math.abs(dy) >= Math.abs(dx)) {
    return dy < 0 ? 'n' : 's';
  }
  return dx < 0 ? 'w' : 'e';
}

/**
 * Find the nearest polygon edge to a point and return its outward-facing
 * cardinal direction.
 */
function nearestEdgeDirection(px: number, py: number, vertices: { x: number; y: number }[]): RoomEdge {
  let minDist = Infinity;
  let bestNx = 0, bestNy = -1;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const ax = vertices[j].x, ay = vertices[j].y;
    const bx = vertices[i].x, by = vertices[i].y;
    const edx = bx - ax, edy = by - ay;
    const lenSq = edx * edx + edy * edy;
    let t = lenSq === 0 ? 0 : ((px - ax) * edx + (py - ay) * edy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * edx, cy = ay + t * edy;
    const d = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
    if (d < minDist) {
      minDist = d;
      // Outward normal of this edge (rotate edge vector 90° CCW).
      bestNx = -edy;
      bestNy = edx;
    }
  }
  return edgeFromAngle(bestNx, bestNy);
}

/**
 * Check if a cell (cx, cy) is inside a shape (including perimeter).
 * Dispatches on shape type.
 */
function cellInsideShape(cx: number, cy: number, shape: RoomShape): boolean {
  const st = shapeTypeOf(shape);
  if (st === 'circle') return cellInEllipse(cx, cy, shape);
  if (st === 'polygon') return (shape.vertices && shape.vertices.length >= 3) ? cellInPolygon(cx, cy, shape.vertices) : false;
  // rect
  return (
    cx >= shape.x &&
    cx < shape.x + shape.width &&
    cy >= shape.y &&
    cy < shape.y + shape.height
  );
}

/**
 * Check if a cell (cx, cy) is strictly interior to a shape (not perimeter).
 * Dispatches on shape type.
 */
function cellInteriorShape(cx: number, cy: number, shape: RoomShape): boolean {
  const st = shapeTypeOf(shape);
  if (st === 'circle') return cellInteriorEllipse(cx, cy, shape);
  if (st === 'polygon') return (shape.vertices && shape.vertices.length >= 3) ? cellInteriorPolygon(cx, cy, shape.vertices) : false;
  // rect
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
 * Dispatches on shape type.
 */
function getOpposingEdge(cx: number, cy: number, shape: RoomShape): RoomEdge | null {
  const st = shapeTypeOf(shape);

  if (st === 'circle') {
    if (!cellInEllipse(cx, cy, shape)) return null;
    if (cellInteriorEllipse(cx, cy, shape)) return null;
    const { cx: ecx, cy: ecy } = ellipseParams(shape);
    return edgeFromAngle(cx + 0.5 - ecx, cy + 0.5 - ecy);
  }

  if (st === 'polygon') {
    const verts = shape.vertices;
    if (!verts || verts.length < 3) return null;
    if (!cellInPolygon(cx, cy, verts)) return null;
    if (cellInteriorPolygon(cx, cy, verts)) return null;
    return nearestEdgeDirection(cx + 0.5, cy + 0.5, verts);
  }

  // rect
  const onN = cy === shape.y;
  const onS = cy === shape.y + shape.height - 1;
  const onW = cx === shape.x;
  const onE = cx === shape.x + shape.width - 1;

  if (!onN && !onS && !onW && !onE) return null;

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
 *
 * Dispatches on shape type for perimeter/interior classification.
 */
function applySubtractiveShape(
  tiles: Tile[][],
  shape: RoomShape,
  additiveShapes: RoomShape[],
  gridWidth: number,
  gridHeight: number,
): void {
  const wallTile: TileType = shape.wallTile ?? 'wall';

  const x0 = Math.max(0, shape.x);
  const y0 = Math.max(0, shape.y);
  const x1 = Math.min(gridWidth, shape.x + shape.width);
  const y1 = Math.min(gridHeight, shape.y + shape.height);

  for (let cy = y0; cy < y1; cy++) {
    for (let cx = x0; cx < x1; cx++) {
      // Check if cell is inside this subtractive shape.
      if (!cellInsideShape(cx, cy, shape)) continue;

      const isPerimeter = !cellInteriorShape(cx, cy, shape);

      // Check if this cell overlaps any additive shape.
      const overlapsAdditive = additiveShapes.some(a => cellInsideShape(cx, cy, a));

      if (!overlapsAdditive) continue; // Only carve where additive geometry exists.

      if (isPerimeter) {
        tiles[cy][cx] = { type: wallTile };
      } else {
        tiles[cy][cx] = { type: 'empty' };
      }
    }
  }
}

/* ── Exported utilities ─────────────────────────────────────────────────── */

/**
 * Compute the bounding box (x, y, width, height) from an array of polygon
 * vertices, snapping to integer tile coordinates.
 */
export function polygonBoundingBox(vertices: { x: number; y: number }[]): { x: number; y: number; width: number; height: number } {
  if (vertices.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of vertices) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  }
  const x = Math.floor(minX);
  const y = Math.floor(minY);
  return {
    x,
    y,
    width: Math.ceil(maxX) - x,
    height: Math.ceil(maxY) - y,
  };
}
