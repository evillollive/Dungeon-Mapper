/**
 * Shape masks for non-rectangular dungeon generation.
 *
 * A shape mask is a `boolean[][]` grid where `true` means a tile is within the
 * playable area and `false` means it's outside the dungeon boundary. Room
 * placement checks the mask to ensure every cell of a proposed room falls
 * inside the shape.
 *
 * Each shape function inscribes its figure with a 1-cell margin so that
 * `outlineWalls` has room to draw the outer wall ring without clipping.
 */

// ---------------------------------------------------------------------------
// Shape registry
// ---------------------------------------------------------------------------

export interface DungeonShape {
  id: string;
  name: string;
  /** Short description shown below the dropdown. */
  description: string;
  /** Build the boolean mask for the given map dimensions. */
  mask(width: number, height: number): boolean[][];
}

/** Helper: allocate a `height × width` mask filled with `fill`. */
function makeMask(width: number, height: number, fill: boolean): boolean[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
}

// ---------------------------------------------------------------------------
// Individual shapes
// ---------------------------------------------------------------------------

function rectangleMask(width: number, height: number): boolean[][] {
  const m = makeMask(width, height, false);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) m[y][x] = true;
  }
  return m;
}

function circleMask(width: number, height: number): boolean[][] {
  const m = makeMask(width, height, false);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  // Radius inscribed with 1-cell margin.
  const rx = (width - 2) / 2;
  const ry = (height - 2) / 2;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) m[y][x] = true;
    }
  }
  return m;
}

function diamondMask(width: number, height: number): boolean[][] {
  const m = makeMask(width, height, false);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const rx = (width - 2) / 2;
  const ry = (height - 2) / 2;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (Math.abs(x - cx) / rx + Math.abs(y - cy) / ry <= 1) m[y][x] = true;
    }
  }
  return m;
}

function crossMask(width: number, height: number): boolean[][] {
  const m = makeMask(width, height, false);
  // Horizontal bar: middle third of height, full width (with margin).
  // Vertical bar: middle third of width, full height (with margin).
  const thirdW = Math.max(3, Math.floor(width / 3));
  const thirdH = Math.max(3, Math.floor(height / 3));
  const hStart = Math.floor((width - thirdW) / 2);
  const vStart = Math.floor((height - thirdH) / 2);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const inHBar = y >= vStart && y < vStart + thirdH;
      const inVBar = x >= hStart && x < hStart + thirdW;
      if (inHBar || inVBar) m[y][x] = true;
    }
  }
  return m;
}

function lShapeMask(width: number, height: number): boolean[][] {
  const m = makeMask(width, height, false);
  const halfW = Math.floor(width / 2);
  const halfH = Math.floor(height / 2);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      // Bottom half (full width) + left half (full height).
      if (y >= halfH || x < halfW) m[y][x] = true;
    }
  }
  return m;
}

function tShapeMask(width: number, height: number): boolean[][] {
  const m = makeMask(width, height, false);
  const halfH = Math.floor(height / 2);
  const thirdW = Math.max(3, Math.floor(width / 3));
  const stemStart = Math.floor((width - thirdW) / 2);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      // Top half: full width. Bottom half: center stem only.
      if (y < halfH || (x >= stemStart && x < stemStart + thirdW)) m[y][x] = true;
    }
  }
  return m;
}

function hexagonMask(width: number, height: number): boolean[][] {
  const m = makeMask(width, height, false);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const rx = (width - 2) / 2;
  const ry = (height - 2) / 2;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      // Hexagon approximation using Chebyshev/Manhattan hybrid.
      const dx = Math.abs(x - cx) / rx;
      const dy = Math.abs(y - cy) / ry;
      // Approximate hexagon: max(|dx|, |dy|, |dx+dy|) ≤ 1 scaled.
      if (dx <= 1 && dy <= 1 && dx + dy <= 1.33) m[y][x] = true;
    }
  }
  return m;
}

function octagonMask(width: number, height: number): boolean[][] {
  const m = makeMask(width, height, false);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const rx = (width - 2) / 2;
  const ry = (height - 2) / 2;
  // Cut factor: how much of the corners to cut.
  const cut = 0.41;  // Yields a regular-ish octagon.
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const dx = Math.abs(x - cx) / rx;
      const dy = Math.abs(y - cy) / ry;
      // Rectangle with clipped corners.
      if (dx <= 1 && dy <= 1 && dx + dy <= 1 + cut) m[y][x] = true;
    }
  }
  return m;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const SHAPES: DungeonShape[] = [
  {
    id: 'rectangle',
    name: 'Rectangle',
    description: 'Standard rectangular dungeon (default).',
    mask: rectangleMask,
  },
  {
    id: 'circle',
    name: 'Circle',
    description: 'Circular dungeon inscribed within the map bounds.',
    mask: circleMask,
  },
  {
    id: 'diamond',
    name: 'Diamond',
    description: 'Diamond (rotated square) dungeon.',
    mask: diamondMask,
  },
  {
    id: 'cross',
    name: 'Cross',
    description: 'Cross-shaped dungeon with intersecting corridors.',
    mask: crossMask,
  },
  {
    id: 'l-shape',
    name: 'L-Shape',
    description: 'L-shaped dungeon filling two quadrants.',
    mask: lShapeMask,
  },
  {
    id: 't-shape',
    name: 'T-Shape',
    description: 'T-shaped dungeon with a wide top and narrow stem.',
    mask: tShapeMask,
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    description: 'Hexagonal dungeon with six sides.',
    mask: hexagonMask,
  },
  {
    id: 'octagon',
    name: 'Octagon',
    description: 'Octagonal dungeon with clipped corners.',
    mask: octagonMask,
  },
];

const SHAPE_MAP = new Map(SHAPES.map(s => [s.id, s]));

/** Default shape id (rectangle). */
export const DEFAULT_DUNGEON_SHAPE = 'rectangle';

/** Ordered list of all available shapes for the UI dropdown. */
export const DUNGEON_SHAPE_LIST: readonly DungeonShape[] = SHAPES;

/** Look up a shape by id. Falls back to rectangle for unknown ids. */
export function getDungeonShape(id: string | undefined): DungeonShape {
  return SHAPE_MAP.get(id ?? DEFAULT_DUNGEON_SHAPE) ?? SHAPES[0];
}

/**
 * Check whether every cell of a rectangle falls inside the mask.
 * Used by room placement to reject rooms that extend outside the shape.
 */
export function rectFitsMask(
  mask: boolean[][],
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  for (let row = y; row < y + h; row++) {
    const mr = mask[row];
    if (!mr) return false;
    for (let col = x; col < x + w; col++) {
      if (!mr[col]) return false;
    }
  }
  return true;
}
