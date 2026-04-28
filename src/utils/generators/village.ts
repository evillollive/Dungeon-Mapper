import type { Tile, TileType } from '../../types/map';
import {
  clampDensity,
  collectCells,
  DIRS_4,
  getCell,
  makeTypeGrid,
  outlineWalls,
  setCell,
  type TypeGrid,
  typeGridToTiles,
} from './common';
import { applyPoiNotes, type LabeledRegion, type PoiPlacement } from './poiNotesEngine';
import { makeRng, type Rng } from './random';
import type { GenerateContext, GeneratedMap } from './types';

/* ── BSP tree ─────────────────────────────────────────────────── */

interface BspNode {
  x: number;
  y: number;
  w: number;
  h: number;
  left?: BspNode;
  right?: BspNode;
  /** Building footprint carved inside this leaf (inset from the ward cell). */
  building?: { x: number; y: number; w: number; h: number };
  /** Ward / district label assigned after splitting. */
  wardLabel?: string;
}

/** Minimum leaf size for the BSP — smaller leaves produce tighter buildings. */
const MIN_LEAF = 5;

/**
 * Recursively partition the rectangle into a BSP tree. Each split is
 * randomised between horizontal and vertical, biased to cut the longer
 * axis. `depth` prevents over-splitting on large maps.
 */
function splitBsp(node: BspNode, rng: Rng, depth: number): void {
  if (depth <= 0) return;
  if (node.w < MIN_LEAF * 2 && node.h < MIN_LEAF * 2) return;

  // Decide split axis — prefer cutting the longer side.
  let horizontal: boolean;
  if (node.w < MIN_LEAF * 2) horizontal = true;
  else if (node.h < MIN_LEAF * 2) horizontal = false;
  else horizontal = node.h >= node.w ? true : rng.chance(0.4);

  if (horizontal) {
    const maxSplit = node.h - MIN_LEAF;
    if (maxSplit < MIN_LEAF) return;
    const split = rng.int(MIN_LEAF, maxSplit);
    node.left = { x: node.x, y: node.y, w: node.w, h: split };
    node.right = { x: node.x, y: node.y + split, w: node.w, h: node.h - split };
  } else {
    const maxSplit = node.w - MIN_LEAF;
    if (maxSplit < MIN_LEAF) return;
    const split = rng.int(MIN_LEAF, maxSplit);
    node.left = { x: node.x, y: node.y, w: split, h: node.h };
    node.right = { x: node.x + split, y: node.y, w: node.w - split, h: node.h };
  }

  splitBsp(node.left, rng, depth - 1);
  splitBsp(node.right, rng, depth - 1);
}

/** Collect all leaf nodes of the BSP tree. */
function bspLeaves(node: BspNode): BspNode[] {
  if (!node.left && !node.right) return [node];
  const out: BspNode[] = [];
  if (node.left) out.push(...bspLeaves(node.left));
  if (node.right) out.push(...bspLeaves(node.right));
  return out;
}

/* ── Building carving ─────────────────────────────────────────── */

/**
 * Carve a rectangular building inside a BSP leaf. The building is inset
 * from the leaf boundary by at least 1 cell on each side, leaving room
 * for streets / alleys. The inset range is randomised for variety.
 *
 * `buildingSizeMul` (default 1.0) scales the inset: < 1 = smaller
 * buildings with wider streets, > 1 = buildings that fill more of the
 * leaf.
 */
function carveBuilding(
  leaf: BspNode,
  grid: TypeGrid,
  rng: Rng,
  buildingSizeMul: number,
): void {
  // Inset range: 1..max, where max scales inversely with sizeMul.
  const maxInset = Math.max(1, Math.round(3 / Math.max(0.5, buildingSizeMul)));
  const pad = () => rng.int(1, maxInset);
  const px1 = pad();
  const px2 = pad();
  const py1 = pad();
  const py2 = pad();

  const bx = leaf.x + px1;
  const by = leaf.y + py1;
  const bw = leaf.w - px1 - px2;
  const bh = leaf.h - py1 - py2;

  if (bw < 2 || bh < 2) return; // too small to carve

  leaf.building = { x: bx, y: by, w: bw, h: bh };

  // Fill the building interior with floor.
  for (let dy = 0; dy < bh; dy++) {
    for (let dx = 0; dx < bw; dx++) {
      setCell(grid, bx + dx, by + dy, 'floor');
    }
  }

  // Outline the building with walls.
  for (let dx = 0; dx < bw; dx++) {
    setCell(grid, bx + dx, by, 'wall');
    setCell(grid, bx + dx, by + bh - 1, 'wall');
  }
  for (let dy = 0; dy < bh; dy++) {
    setCell(grid, bx, by + dy, 'wall');
    setCell(grid, bx + bw - 1, by + dy, 'wall');
  }

  // Punch a door on a random wall side.
  const sides: ('n' | 's' | 'e' | 'w')[] = [];
  if (bh > 2) sides.push('n', 's');
  if (bw > 2) sides.push('e', 'w');
  if (sides.length === 0) return;

  const side = rng.pick(sides);
  let doorX: number, doorY: number;
  let doorType: TileType;
  switch (side) {
    case 'n':
      doorX = bx + rng.int(1, bw - 2);
      doorY = by;
      doorType = 'door-h';
      break;
    case 's':
      doorX = bx + rng.int(1, bw - 2);
      doorY = by + bh - 1;
      doorType = 'door-h';
      break;
    case 'w':
      doorX = bx;
      doorY = by + rng.int(1, bh - 2);
      doorType = 'door-v';
      break;
    case 'e':
      doorX = bx + bw - 1;
      doorY = by + rng.int(1, bh - 2);
      doorType = 'door-v';
      break;
  }
  setCell(grid, doorX, doorY, doorType);
}

/* ── Street network ───────────────────────────────────────────── */

/**
 * Carve a straight corridor (street) between two points using an
 * L-shaped path. Only stamps onto cells that are currently `empty` so
 * buildings are not overwritten.
 */
function carveStreet(
  grid: TypeGrid,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  // Horizontal first, then vertical.
  const xMin = Math.min(x1, x2);
  const xMax = Math.max(x1, x2);
  const yMin = Math.min(y1, y2);
  const yMax = Math.max(y1, y2);

  for (let x = xMin; x <= xMax; x++) {
    const t = getCell(grid, x, y1);
    if (t === 'empty') setCell(grid, x, y1, 'floor');
  }
  for (let y = yMin; y <= yMax; y++) {
    const t = getCell(grid, x2, y);
    if (t === 'empty') setCell(grid, x2, y, 'floor');
  }
}

/**
 * Connect sibling BSP leaves by carving a street between their center
 * points. Recurse up the tree so every pair of siblings is linked.
 */
function connectBsp(node: BspNode, grid: TypeGrid): void {
  if (!node.left || !node.right) return;
  connectBsp(node.left, grid);
  connectBsp(node.right, grid);

  const lc = bspCenter(node.left);
  const rc = bspCenter(node.right);
  carveStreet(grid, lc.x, lc.y, rc.x, rc.y);
}

function bspCenter(node: BspNode): { x: number; y: number } {
  return {
    x: Math.floor(node.x + node.w / 2),
    y: Math.floor(node.y + node.h / 2),
  };
}

/* ── Town walls ───────────────────────────────────────────────── */

/**
 * Draw a rectangular perimeter wall around the town area with 1-cell
 * margin from the edge. Punch gates (doors) on each side.
 */
function drawTownWall(
  grid: TypeGrid,
  width: number,
  height: number,
): void {
  const margin = 1;
  const x0 = margin;
  const y0 = margin;
  const x1 = width - 1 - margin;
  const y1 = height - 1 - margin;

  // Draw wall perimeter.
  for (let x = x0; x <= x1; x++) {
    setCell(grid, x, y0, 'wall');
    setCell(grid, x, y1, 'wall');
  }
  for (let y = y0; y <= y1; y++) {
    setCell(grid, x0, y, 'wall');
    setCell(grid, x1, y, 'wall');
  }

  // Punch gates at the midpoint of each side.
  const midX = Math.floor((x0 + x1) / 2);
  const midY = Math.floor((y0 + y1) / 2);

  // North gate
  setCell(grid, midX, y0, 'door-h');
  // South gate
  setCell(grid, midX, y1, 'door-h');
  // West gate
  setCell(grid, x0, midY, 'door-v');
  // East gate
  setCell(grid, x1, midY, 'door-v');

  // Ensure floor in front of gates (inside and outside) so they're passable.
  for (const [gx, gy] of [[midX, y0], [midX, y1], [x0, midY], [x1, midY]]) {
    for (const [dx, dy] of DIRS_4) {
      const nx = gx + dx;
      const ny = gy + dy;
      const t = getCell(grid, nx, ny);
      if (t === 'empty' || t === 'wall') {
        // Only stamp if it's the perimeter wall or empty ground.
        // Don't overwrite building interiors.
        if (t === 'empty') setCell(grid, nx, ny, 'floor');
      }
    }
  }
}

/* ── Ward / district assignment ───────────────────────────────── */

/**
 * Per-theme ward palettes. Each entry describes a district archetype.
 * The largest leaf gets the `large` ward if one exists, smaller wards
 * are assigned by weighted random draw. Same pattern as `roomKinds.ts`.
 */
export interface WardKind {
  label: string;
  weight?: number;
  size?: 'large' | 'medium' | 'small';
  bias?: { treasure?: number; trap?: number };
}

const DEFAULT_WARD_PALETTE: WardKind[] = [
  { label: 'Town Square', size: 'large', weight: 1 },
  { label: 'Market', weight: 1.2, bias: { treasure: 1.5 } },
  { label: 'Temple', weight: 0.8 },
  { label: 'Barracks', weight: 1, bias: { trap: 1.2 } },
  { label: 'Residential', weight: 1.5 },
  { label: 'Tavern', weight: 1 },
  { label: 'Warehouse', weight: 0.8, bias: { treasure: 1.5 } },
  { label: 'Smithy', weight: 0.7 },
];

const WARD_PALETTES: Record<string, WardKind[]> = {
  castle: [
    { label: 'Keep', size: 'large', weight: 1 },
    { label: 'Outer Bailey', weight: 1 },
    { label: 'Barracks', weight: 1, bias: { trap: 1.2 } },
    { label: 'Chapel', weight: 0.8 },
    { label: 'Stables', weight: 0.8 },
    { label: 'Armory', weight: 0.7, bias: { treasure: 1.5 } },
    { label: 'Kitchen', weight: 0.8 },
    { label: 'Servants\u2019 Quarters', weight: 1 },
  ],
  dungeon: [
    { label: 'Town Square', size: 'large', weight: 1 },
    { label: 'Market', weight: 1.2, bias: { treasure: 1.5 } },
    { label: 'Temple', weight: 0.8 },
    { label: 'Guard Post', weight: 1, bias: { trap: 1.2 } },
    { label: 'Inn', weight: 1 },
    { label: 'Blacksmith', weight: 0.8 },
    { label: 'Residential', weight: 1.5 },
    { label: 'Guild Hall', weight: 0.7, bias: { treasure: 1 } },
  ],
  wilderness: [
    { label: 'Village Green', size: 'large', weight: 1 },
    { label: 'Farmstead', weight: 1.5 },
    { label: 'Mill', weight: 0.8 },
    { label: 'General Store', weight: 1, bias: { treasure: 1.2 } },
    { label: 'Chapel', weight: 0.7 },
    { label: 'Barn', weight: 1 },
    { label: 'Well', weight: 0.6 },
    { label: 'Cottage', weight: 1.5 },
  ],
  oldwest: [
    { label: 'Main Street', size: 'large', weight: 1 },
    { label: 'Saloon', weight: 1 },
    { label: 'General Store', weight: 1, bias: { treasure: 1.2 } },
    { label: 'Sheriff\u2019s Office', weight: 0.8, bias: { trap: 1 } },
    { label: 'Bank', weight: 0.7, bias: { treasure: 2 } },
    { label: 'Stables', weight: 0.8 },
    { label: 'Hotel', weight: 0.8 },
    { label: 'Undertaker', weight: 0.5 },
  ],
  pirate: [
    { label: 'Harbor', size: 'large', weight: 1, bias: { treasure: 1.2 } },
    { label: 'Tavern', weight: 1 },
    { label: 'Market', weight: 1, bias: { treasure: 1.5 } },
    { label: 'Warehouse', weight: 0.8, bias: { treasure: 1.5 } },
    { label: 'Shipwright', weight: 0.7 },
    { label: 'Customs House', weight: 0.6, bias: { trap: 1.2 } },
    { label: 'Boarding House', weight: 0.8 },
    { label: 'Lookout', weight: 0.5, size: 'small' },
  ],
  moderncity: [
    { label: 'Plaza', size: 'large', weight: 1 },
    { label: 'Apartment Block', weight: 1.5 },
    { label: 'Office Tower', weight: 1 },
    { label: 'Parking Garage', weight: 0.8 },
    { label: 'Corner Shop', weight: 1, bias: { treasure: 1 } },
    { label: 'Police Station', weight: 0.6, bias: { trap: 1 } },
    { label: 'Restaurant', weight: 0.8 },
    { label: 'Clinic', weight: 0.6 },
  ],
  cyberpunk: [
    { label: 'Neon Plaza', size: 'large', weight: 1 },
    { label: 'Hab Stack', weight: 1.5 },
    { label: 'Data Center', weight: 0.8, bias: { treasure: 1.5, trap: 1 } },
    { label: 'Black Market', weight: 1, bias: { treasure: 2 } },
    { label: 'Ripperdoc', weight: 0.7 },
    { label: 'Corp Office', weight: 0.8 },
    { label: 'Noodle Bar', weight: 0.7 },
    { label: 'Drone Bay', weight: 0.5, bias: { trap: 1.2 } },
  ],
  steampunk: [
    { label: 'Clocktower Square', size: 'large', weight: 1 },
    { label: 'Workshop', weight: 1, bias: { treasure: 1 } },
    { label: 'Foundry', weight: 0.8, bias: { trap: 1.2 } },
    { label: 'Airship Dock', weight: 0.7 },
    { label: 'Tea House', weight: 0.8 },
    { label: 'Emporium', weight: 1, bias: { treasure: 1.2 } },
    { label: 'Boarding House', weight: 0.8 },
    { label: 'Constabulary', weight: 0.5, bias: { trap: 1 } },
  ],
  starship: [
    { label: 'Promenade', size: 'large', weight: 1 },
    { label: 'Hab Module', weight: 1.5 },
    { label: 'Commissary', weight: 1, bias: { treasure: 1 } },
    { label: 'Medbay', weight: 0.7 },
    { label: 'Rec Deck', weight: 0.8 },
    { label: 'Cargo Bay', weight: 0.8, bias: { treasure: 1.5 } },
    { label: 'Security Post', weight: 0.6, bias: { trap: 1 } },
    { label: 'Docking Ring', weight: 0.6 },
  ],
  alien: [
    { label: 'Hive Core', size: 'large', weight: 1 },
    { label: 'Brood Chamber', weight: 1, bias: { trap: 1.2 } },
    { label: 'Feeding Pit', weight: 0.8, bias: { trap: 1.5 } },
    { label: 'Spore Garden', weight: 0.8 },
    { label: 'Relic Shrine', weight: 0.6, bias: { treasure: 2 } },
    { label: 'Resin Vats', weight: 0.7 },
    { label: 'Larval Pool', weight: 0.7 },
    { label: 'Watchtower', weight: 0.5, size: 'small' },
  ],
  desert: [
    { label: 'Oasis', size: 'large', weight: 1 },
    { label: 'Bazaar', weight: 1.2, bias: { treasure: 1.5 } },
    { label: 'Caravanserai', weight: 1 },
    { label: 'Well House', weight: 0.8 },
    { label: 'Mudbrick Home', weight: 1.5 },
    { label: 'Watchtower', weight: 0.5, size: 'small', bias: { trap: 1 } },
    { label: 'Shrine', weight: 0.7 },
    { label: 'Granary', weight: 0.7, bias: { treasure: 1 } },
  ],
  postapocalypse: [
    { label: 'Scrap Yard', size: 'large', weight: 1, bias: { treasure: 1 } },
    { label: 'Shelter', weight: 1.5 },
    { label: 'Trading Post', weight: 1, bias: { treasure: 1.5 } },
    { label: 'Water Purifier', weight: 0.7 },
    { label: 'Lookout Tower', weight: 0.6, size: 'small', bias: { trap: 1 } },
    { label: 'Mechanic', weight: 0.8 },
    { label: 'Barricade', weight: 0.7, bias: { trap: 1.5 } },
    { label: 'Clinic', weight: 0.6 },
  ],
  ancient: [
    { label: 'Central Plaza', size: 'large', weight: 1 },
    { label: 'Temple', weight: 1, bias: { treasure: 1.2, trap: 1 } },
    { label: 'Marketplace', weight: 1, bias: { treasure: 1.5 } },
    { label: 'Dwelling', weight: 1.5 },
    { label: 'Granary', weight: 0.8, bias: { treasure: 1 } },
    { label: 'Ceremonial Hall', weight: 0.7 },
    { label: 'Bathhouse', weight: 0.6 },
    { label: 'Guard Post', weight: 0.7, bias: { trap: 1.2 } },
  ],
};

function getWardPalette(themeId?: string): WardKind[] {
  if (!themeId) return DEFAULT_WARD_PALETTE;
  return WARD_PALETTES[themeId] ?? DEFAULT_WARD_PALETTE;
}

/**
 * Assign ward labels to BSP leaves using weighted random draw.
 * The largest leaf gets the `large` ward kind if one exists, mirroring
 * the rooms-and-corridors `assignRoomKinds` pattern.
 */
function assignWards(
  leaves: BspNode[],
  palette: WardKind[],
  rng: Rng,
): void {
  if (leaves.length === 0 || palette.length === 0) return;

  // Sort by area (desc) so the biggest leaf can claim the 'large' ward.
  const sorted = [...leaves].sort((a, b) => (b.w * b.h) - (a.w * a.h));

  const largeKind = palette.find(k => k.size === 'large');
  const usedLabels = new Set<string>();

  for (let i = 0; i < sorted.length; i++) {
    const leaf = sorted[i];

    // Give the largest building the 'large' ward kind.
    if (i === 0 && largeKind) {
      leaf.wardLabel = largeKind.label;
      usedLabels.add(largeKind.label);
      continue;
    }

    // Weighted random draw from remaining palette entries, allowing
    // duplicates once all unique options are exhausted.
    const candidates = palette.filter(k => k.size !== 'large');
    if (candidates.length === 0) {
      leaf.wardLabel = rng.pick(palette).label;
      continue;
    }

    // Prefer unused labels first.
    const unused = candidates.filter(k => !usedLabels.has(k.label));
    const pool = unused.length > 0 ? unused : candidates;

    const totalWeight = pool.reduce((s, k) => s + (k.weight ?? 1), 0);
    let roll = rng.next() * totalWeight;
    let chosen = pool[0];
    for (const k of pool) {
      roll -= (k.weight ?? 1);
      if (roll <= 0) { chosen = k; break; }
    }
    leaf.wardLabel = chosen.label;
    usedLabels.add(chosen.label);
  }
}

/* ── Main generator ───────────────────────────────────────────── */

/**
 * Per-theme flavor for the village generator, analogous to the
 * per-theme flavors in `poi.ts`. Controls treasure/trap density and
 * whether to draw town walls.
 */
interface VillageFlavor {
  treasureMultiplier: number;
  trapMultiplier: number;
  /** Default walls toggle. */
  defaultWalls: boolean;
}

const DEFAULT_FLAVOR: VillageFlavor = {
  treasureMultiplier: 1,
  trapMultiplier: 0.5,
  defaultWalls: true,
};

const VILLAGE_FLAVORS: Record<string, Partial<VillageFlavor>> = {
  castle: { defaultWalls: true, treasureMultiplier: 1.25 },
  dungeon: { defaultWalls: true },
  wilderness: { defaultWalls: false, trapMultiplier: 0.75 },
  desert: { defaultWalls: true, trapMultiplier: 0.75 },
  oldwest: { defaultWalls: false },
  pirate: { defaultWalls: false, treasureMultiplier: 1.5 },
  moderncity: { defaultWalls: false, trapMultiplier: 0.25 },
  cyberpunk: { defaultWalls: false, trapMultiplier: 0.75, treasureMultiplier: 1.25 },
  steampunk: { defaultWalls: true },
  starship: { defaultWalls: false },
  alien: { defaultWalls: true, trapMultiplier: 1.25 },
  postapocalypse: { defaultWalls: true, trapMultiplier: 1.25 },
  ancient: { defaultWalls: true, treasureMultiplier: 1.25, trapMultiplier: 1 },
};

export function getVillageFlavor(themeId?: string): VillageFlavor {
  if (!themeId) return DEFAULT_FLAVOR;
  const overrides = VILLAGE_FLAVORS[themeId];
  if (!overrides) return DEFAULT_FLAVOR;
  return { ...DEFAULT_FLAVOR, ...overrides };
}

/**
 * Generate a village / settlement map. The algorithm:
 *
 * 1. Start with an empty grid.
 * 2. Optionally draw a town wall with gates.
 * 3. BSP-partition the interior into wards/districts.
 * 4. Carve rectangular buildings inside each BSP leaf.
 * 5. Connect sibling BSP nodes with streets (floor corridors).
 * 6. Assign ward labels from the theme palette.
 * 7. Place POIs (start at a gate, treasure, traps).
 * 8. Outline remaining floor with walls.
 * 9. Hand off to POI/Notes engine.
 */
export function generateVillage(ctx: GenerateContext): GeneratedMap {
  const { width, height, seed, density, themeId, tileMix } = ctx;
  const flavor = getVillageFlavor(themeId);
  const rng = makeRng(seed);
  const d = clampDensity(density);
  const ov = tileMix ?? {};

  const grid = makeTypeGrid(width, height, 'empty');

  // ── Town walls ──
  const hasWalls = ov.walls !== undefined ? ov.walls >= 0.5 : flavor.defaultWalls;
  if (hasWalls) {
    drawTownWall(grid, width, height);
  }

  // ── BSP partition ──
  // Interior area where buildings go (inside walls if present).
  const interiorMargin = hasWalls ? 3 : 1;
  const ix = interiorMargin;
  const iy = interiorMargin;
  const iw = Math.max(MIN_LEAF, width - interiorMargin * 2);
  const ih = Math.max(MIN_LEAF, height - interiorMargin * 2);

  // BSP depth scales with density and map size.
  const bspDepth = Math.max(2, Math.min(8, Math.round(3 + d * 2 + Math.log2(Math.min(iw, ih)))));

  const root: BspNode = { x: ix, y: iy, w: iw, h: ih };
  splitBsp(root, rng, bspDepth);
  const leaves = bspLeaves(root);

  // Building size multiplier from tile mix.
  const buildingSizeMul = ov.buildingSize ?? 1;

  // ── Carve buildings ──
  for (const leaf of leaves) {
    carveBuilding(leaf, grid, rng, buildingSizeMul);
  }

  // ── Connect with streets ──
  connectBsp(root, grid);

  // ── Fill streets leading to gates (if walled) ──
  if (hasWalls) {
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    // Connect center to each gate.
    const margin = 1;
    const midX = Math.floor((margin + width - 1 - margin) / 2);
    const midY = Math.floor((margin + height - 1 - margin) / 2);
    carveStreet(grid, cx, cy, midX, margin + 1);     // to north gate
    carveStreet(grid, cx, cy, midX, height - 2 - margin); // to south gate
    carveStreet(grid, cx, cy, margin + 1, midY);      // to west gate
    carveStreet(grid, cx, cy, width - 2 - margin, midY); // to east gate
  }

  // ── Ward assignment ──
  const palette = getWardPalette(themeId);
  assignWards(leaves, palette, rng);

  // ── Place POIs ──
  const pois: PoiPlacement[] = [];

  // Start: place at the north gate or a corner cell.
  let startX: number, startY: number;
  if (hasWalls) {
    startX = Math.floor(width / 2);
    startY = 2;
  } else {
    startX = rng.int(1, Math.max(1, Math.floor(width / 4)));
    startY = rng.int(1, Math.max(1, Math.floor(height / 4)));
  }
  // Find nearest floor to the target start.
  let placedStart = false;
  for (let r = 0; r < 8 && !placedStart; r++) {
    for (let dy = -r; dy <= r && !placedStart; dy++) {
      for (let dx = -r; dx <= r && !placedStart; dx++) {
        const x = startX + dx;
        const y = startY + dy;
        if (getCell(grid, x, y) === 'floor') {
          setCell(grid, x, y, 'start');
          pois.push({ x, y, type: 'start' });
          placedStart = true;
        }
      }
    }
  }

  // Treasure: scatter in buildings.
  const floors = collectCells(grid, 'floor');
  const area = width * height;
  const defaultTreasureCount = Math.max(1, Math.round(
    (leaves.length / 3) * d * flavor.treasureMultiplier
  ));
  const treasureCount = Math.min(
    floors.length,
    ov.treasure !== undefined
      ? Math.max(0, Math.round(area * Math.max(0, ov.treasure)))
      : defaultTreasureCount,
  );
  for (let i = 0; i < treasureCount && floors.length > 0; i++) {
    const idx = rng.int(0, floors.length - 1);
    const c = floors.splice(idx, 1)[0];
    setCell(grid, c.x, c.y, 'treasure');
    pois.push({ x: c.x, y: c.y, type: 'treasure' });
  }

  // Traps: a few scattered hazards.
  const defaultTrapCount = Math.max(0, Math.round(
    (area / 600) * d * flavor.trapMultiplier
  ));
  const trapCount = Math.min(
    floors.length,
    ov.trap !== undefined
      ? Math.max(0, Math.round(area * Math.max(0, ov.trap)))
      : defaultTrapCount,
  );
  for (let i = 0; i < trapCount && floors.length > 0; i++) {
    const idx = rng.int(0, floors.length - 1);
    const c = floors.splice(idx, 1)[0];
    setCell(grid, c.x, c.y, 'trap');
    pois.push({ x: c.x, y: c.y, type: 'trap' });
  }

  // ── Outline remaining floor with walls ──
  outlineWalls(grid);

  // ── Build labeled regions from ward assignments ──
  const regions: LabeledRegion[] = [];
  for (const leaf of leaves) {
    if (!leaf.building || !leaf.wardLabel) continue;
    const b = leaf.building;
    const cells: { x: number; y: number }[] = [];
    for (let dy = 0; dy < b.h; dy++) {
      for (let dx = 0; dx < b.w; dx++) {
        cells.push({ x: b.x + dx, y: b.y + dy });
      }
    }
    regions.push({
      label: leaf.wardLabel,
      preferredAnchor: {
        x: Math.floor(b.x + b.w / 2),
        y: Math.floor(b.y + b.h / 2),
      },
      cells,
    });
  }

  const tiles: Tile[][] = typeGridToTiles(grid);

  const notes = applyPoiNotes(tiles, {
    pois,
    themeId,
    generatorId: 'village',
    regions,
  });

  return { tiles, notes, width, height };
}
