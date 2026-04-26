import type { MapNote, Tile, TileType } from '../../types/map';
import { reorderNotesReadingOrder } from './common';
import { poiLabelFor, poiLabelIsRoom } from './poi';

/**
 * POI / Notes engine.
 *
 * `applyPoiNotes` is the **sole** writer of `MapNote` entries and tile
 * `noteId` fields produced by the procedural generators. Callers stop
 * building notes themselves — they declare:
 *   - which POI tiles got placed (`pois`),
 *   - which carved rooms / detected natural areas should receive their
 *     own room-kind note (`regions`),
 *   - the active theme + generator id so labels resolve correctly.
 *
 * The engine then:
 *   A. Builds one `MapNote` per POI in placement order. Duplicate POI
 *      types are suffixed (`Treasure 1`, `Treasure 2`, …); single
 *      occurrences keep their bare label. The `kind: 'room' | 'poi'`
 *      tag is decided per the existing rule: a POI is `room` only when
 *      its theme label names a room AND it does not sit inside any
 *      labeled region (which would already own that room designation).
 *   B. Appends one `MapNote` per labeled region. Each region note is
 *      anchored on its `preferredAnchor` if that cell is unannotated
 *      (and, for generators that require it, of an allowed tile type);
 *      otherwise on the cell from `cells` whose distance to the
 *      region's fractional geometric center is smallest, with a
 *      |dy|-then-|dx| tiebreaker so symmetric regions don't bias the
 *      anchor toward the top-left.
 *   C. Stamps `noteId` onto each anchored tile (POI cells unconditionally,
 *      region cells only when the tile didn't already get a noteId from a
 *      POI in step A).
 *   D. Re-orders the final note list left-to-right, top-to-bottom via
 *      `reorderNotesReadingOrder` so the notes panel reads naturally
 *      and per-label suffixes follow reading order.
 *
 * Validity contract (enforced by construction):
 *   - Every tile carrying a `noteId` references exactly one note.
 *   - No `kind: 'room'` note nests inside another `kind: 'room'` note.
 *   - Note ids are 1..N in reading order after `reorderNotesReadingOrder`.
 *
 * Self-healing: if a region's preferred anchor is unavailable, the
 * fractional-center fallback always picks a candidate from the supplied
 * cells (when at least one is unannotated). If none is free, the note
 * still appears in the panel anchored on `preferredAnchor` without a
 * tile-side `noteId` link, mirroring the existing behavior.
 */

/** POI types the engine knows how to label. */
export type EnginePoiType =
  | 'start' | 'stairs-up' | 'stairs-down' | 'treasure' | 'trap';

export interface PoiPlacement {
  x: number;
  y: number;
  type: EnginePoiType;
}

export interface LabeledRegion {
  /** Display label for this region (e.g. "Bridge", "Glade"). The engine
   *  re-suffixes duplicates among the regions in this list. */
  label: string;
  /** Preferred anchor cell — the room center or area centroid. Used as
   *  the note position when free. */
  preferredAnchor: { x: number; y: number };
  /** All cells belonging to this region. Used both for the
   *  point-in-region test (POI kind decision) and as the candidate set
   *  for the fallback anchor. Should include `preferredAnchor`. */
  cells: { x: number; y: number }[];
  /** Optional restriction on which tile types may carry this region's
   *  note. When supplied, both the preferred anchor and any fallback
   *  candidate must have a `tile.type` in this set. The rooms-and-
   *  corridors generator passes `{'floor'}` here (matching legacy
   *  behavior); cavern / open-terrain leave this undefined so any
   *  unannotated cell in the region's open footprint can host the note. */
  validAnchorTypes?: ReadonlySet<TileType>;
}

export interface ApplyPoiNotesOptions {
  pois: PoiPlacement[];
  themeId?: string;
  generatorId?: 'cavern' | 'open-terrain';
  /** Labeled regions whose own room-kind notes will be appended after
   *  the POI notes. Empty / omitted = no region notes. */
  regions?: LabeledRegion[];
}

/**
 * Build all generator notes for a finished tile grid. Mutates `tiles`
 * by stamping `noteId` onto POI / region anchor cells and returns the
 * resulting (reordered, renumbered) notes list.
 */
export function applyPoiNotes(tiles: Tile[][], opts: ApplyPoiNotesOptions): MapNote[] {
  const { pois, themeId, generatorId, regions = [] } = opts;

  // Pre-compute region cell membership for fast point-in-region tests
  // when deciding a POI's kind. A single Set keyed by `y*MAX_W + x` is
  // enough since the engine only cares whether *any* region contains
  // the cell — region identity is irrelevant for the POI kind decision.
  // Using a string key keeps the engine independent of map width.
  const regionCellKeys = new Set<string>();
  for (const r of regions) {
    for (const c of r.cells) regionCellKeys.add(cellKey(c.x, c.y));
  }

  // ----------------------------------------------------------------- A
  // POI notes
  const counts = new Map<string, number>();
  for (const p of pois) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
  const seen = new Map<string, number>();
  const notes: MapNote[] = [];
  for (let i = 0; i < pois.length; i++) {
    const p = pois[i];
    const total = counts.get(p.type) ?? 1;
    const ord = (seen.get(p.type) ?? 0) + 1;
    seen.set(p.type, ord);
    const id = i + 1;
    const labelIsRoom = poiLabelIsRoom(themeId, p.type, generatorId);
    const insideLabeledRegion = regionCellKeys.has(cellKey(p.x, p.y));
    const kind: 'room' | 'poi' = labelIsRoom && !insideLabeledRegion ? 'room' : 'poi';
    notes.push({
      id,
      x: p.x,
      y: p.y,
      label: poiLabelFor(themeId, p.type, total > 1 ? ord : undefined, generatorId),
      description: '',
      kind,
    });
    if (tiles[p.y]?.[p.x]) tiles[p.y][p.x] = { ...tiles[p.y][p.x], noteId: id };
  }

  // ----------------------------------------------------------------- B
  // Region notes
  if (regions.length > 0) {
    const regionCounts = new Map<string, number>();
    for (const r of regions) {
      regionCounts.set(r.label, (regionCounts.get(r.label) ?? 0) + 1);
    }
    const regionSeen = new Map<string, number>();
    let nextId = notes.reduce((m, n) => Math.max(m, n.id), 0) + 1;
    for (const r of regions) {
      const total = regionCounts.get(r.label) ?? 1;
      const ord = (regionSeen.get(r.label) ?? 0) + 1;
      regionSeen.set(r.label, ord);
      const label = total > 1 ? `${r.label} ${ord}` : r.label;
      const anchor = pickRegionAnchor(tiles, r);
      const id = nextId++;
      notes.push({
        id,
        x: anchor.x,
        y: anchor.y,
        label,
        description: '',
        kind: 'room',
      });
      // Stamp the tile noteId only when the chosen anchor cell is free
      // (no existing noteId). When all candidate cells were occupied the
      // anchor falls back to `preferredAnchor`, which may already host a
      // POI note — leave that POI's noteId in place so it remains the
      // primary tile-side anchor.
      const t = tiles[anchor.y]?.[anchor.x];
      if (t && t.noteId === undefined) {
        tiles[anchor.y][anchor.x] = { ...t, noteId: id };
      }
    }
  }

  // ----------------------------------------------------------------- D
  return reorderNotesReadingOrder(tiles, notes);
}

/** String key for the region-membership Set. Independent of map width. */
function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Choose the anchor cell for a labeled region's note. Preference order:
 *   1. `r.preferredAnchor` if it's unannotated and (when `validAnchorTypes`
 *      is set) of an allowed tile type.
 *   2. The cell from `r.cells` closest to the region's fractional
 *      geometric center, restricted by the same constraints. Ties are
 *      broken by smaller |dy| then smaller |dx| so the chosen cell
 *      hugs the region's visual middle instead of biasing toward the
 *      top-left of the cell list.
 *   3. As a last resort `r.preferredAnchor` again — the note still
 *      appears in the panel even if no tile-side `noteId` link is made.
 */
function pickRegionAnchor(
  tiles: Tile[][],
  r: LabeledRegion
): { x: number; y: number } {
  const isAllowed = (x: number, y: number): boolean => {
    const t = tiles[y]?.[x];
    if (!t) return false;
    if (t.noteId !== undefined) return false;
    if (r.validAnchorTypes && !r.validAnchorTypes.has(t.type)) return false;
    return true;
  };
  if (isAllowed(r.preferredAnchor.x, r.preferredAnchor.y)) {
    return { x: r.preferredAnchor.x, y: r.preferredAnchor.y };
  }
  // Fractional geometric center of the region's cells. Using the mean
  // of all cells (rather than a stored integer "center") keeps the
  // distance metric centered on the visual middle even for asymmetric
  // regions, so equidistant integer cells around the center don't tie.
  let sx = 0;
  let sy = 0;
  for (const c of r.cells) {
    sx += c.x;
    sy += c.y;
  }
  const mx = r.cells.length > 0 ? sx / r.cells.length : r.preferredAnchor.x;
  const my = r.cells.length > 0 ? sy / r.cells.length : r.preferredAnchor.y;
  let bestDist = Infinity;
  let bestAbsDy = Infinity;
  let bestAbsDx = Infinity;
  let best: { x: number; y: number } | undefined;
  for (const c of r.cells) {
    if (!isAllowed(c.x, c.y)) continue;
    const dx = c.x - mx;
    const dy = c.y - my;
    const dist = dx * dx + dy * dy;
    const absDy = Math.abs(dy);
    const absDx = Math.abs(dx);
    if (
      dist < bestDist ||
      (dist === bestDist && absDy < bestAbsDy) ||
      (dist === bestDist && absDy === bestAbsDy && absDx < bestAbsDx)
    ) {
      bestDist = dist;
      bestAbsDy = absDy;
      bestAbsDx = absDx;
      best = { x: c.x, y: c.y };
    }
  }
  if (best) return best;
  return { x: r.preferredAnchor.x, y: r.preferredAnchor.y };
}
