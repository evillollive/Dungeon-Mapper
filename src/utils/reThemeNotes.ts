/**
 * Re-label auto-generated notes when the map theme changes. Notes that
 * were created by a procedural generator (`kind: 'room'` or `kind: 'poi'`)
 * have their labels updated to match the new theme; user-created notes
 * (no `kind`) are returned unchanged. Descriptions are always preserved
 * so any user-authored details survive the switch.
 */

import type { MapNote, Tile, TileType } from '../types/map';
import { poiLabelFor, poiLabelIsRoom } from './generators/poi';
import { getRoomPalette } from './generators/roomKinds';

/**
 * Tile types placed by generators as point-of-interest markers. A note
 * anchored on one of these tiles was labeled via `poiLabelFor` and can
 * be re-labeled by calling the same function with the new theme.
 */
const POI_TILE_TYPES: ReadonlySet<TileType> = new Set<TileType>([
  'start', 'stairs-down', 'stairs-up', 'treasure', 'trap',
]);

/**
 * Result of re-theming notes. `notes` is the updated list; `removedIds`
 * contains the ids of notes that were removed (e.g. room-archetype notes
 * when the new theme has no room palette) so the caller can clear stale
 * `noteId` references on tiles.
 */
export interface ReThemeResult {
  notes: MapNote[];
  removedIds: Set<number>;
}

/**
 * Re-label auto-generated notes for `newThemeId`. See module docblock
 * for the full policy.
 *
 * POI notes (anchored on start / stairs / treasure / trap tiles) are
 * re-labeled via `poiLabelFor(newThemeId, tileType)`. Room-archetype
 * notes (anchored on floor tiles, `kind: 'room'`) are re-labeled from
 * the new theme's room palette; if the new theme has no room palette
 * these notes are removed (their ids appear in `removedIds`).
 */
export function reThemeNotes(
  notes: MapNote[],
  tiles: Tile[][],
  newThemeId: string,
): ReThemeResult {
  const generated = notes.filter(n => n.kind === 'room' || n.kind === 'poi');
  if (generated.length === 0) return { notes, removedIds: new Set() };

  // ── Classify generated notes ──────────────────────────────────────
  // "POI notes" sit on a POI tile and can be re-labeled via poiLabelFor.
  // "Room-archetype notes" sit on floor tiles (or any non-POI tile) with
  // kind === 'room' and need the room palette.
  const poiNotes: MapNote[] = [];
  const roomArchNotes: MapNote[] = [];
  for (const n of generated) {
    const tileType = tiles[n.y]?.[n.x]?.type;
    if (tileType && POI_TILE_TYPES.has(tileType)) {
      poiNotes.push(n);
    } else if (n.kind === 'room') {
      roomArchNotes.push(n);
    } else {
      // kind === 'poi' on a non-POI tile (edge case); treat as POI and
      // keep the current label since we can't derive a better one.
      poiNotes.push(n);
    }
  }

  // ── Re-label POI notes ────────────────────────────────────────────
  // Group by underlying tile type so we can apply the suffix convention
  // (e.g. "Cargo Cache 1", "Cargo Cache 2") when multiple notes of the
  // same tile type exist.
  const poiByType = new Map<TileType, MapNote[]>();
  for (const n of poiNotes) {
    const t = tiles[n.y]?.[n.x]?.type ?? 'floor';
    const list = poiByType.get(t) ?? [];
    list.push(n);
    poiByType.set(t, list);
  }

  const newPoiLabels = new Map<number, string>();
  const newPoiKinds = new Map<number, 'room' | 'poi'>();
  for (const [tileType, group] of poiByType) {
    // Sort by position for stable suffix ordering.
    const sorted = [...group].sort((a, b) =>
      a.y !== b.y ? a.y - b.y : a.x - b.x,
    );
    for (let i = 0; i < sorted.length; i++) {
      const n = sorted[i];
      if (POI_TILE_TYPES.has(tileType)) {
        const label = poiLabelFor(
          newThemeId,
          tileType,
          sorted.length > 1 ? i + 1 : undefined,
        );
        newPoiLabels.set(n.id, label);
        // Update kind: a POI whose new-theme label names a room should
        // become kind 'room' (and vice versa) to stay consistent.
        const isRoom = poiLabelIsRoom(newThemeId, tileType);
        newPoiKinds.set(n.id, isRoom ? 'room' : 'poi');
      }
      // Non-POI-tile POI notes keep their original label (set above).
    }
  }

  // ── Re-label room-archetype notes ─────────────────────────────────
  const palette = getRoomPalette(newThemeId);
  const newRoomLabels = new Map<number, string>();
  const removedIds = new Set<number>();

  if (palette && palette.length > 0 && roomArchNotes.length > 0) {
    // Sort by position for deterministic assignment.
    const sorted = [...roomArchNotes].sort((a, b) =>
      a.y !== b.y ? a.y - b.y : a.x - b.x,
    );

    // The first room note (in reading order) gets a 'large' archetype
    // when one exists, mirroring the generators' convention of assigning
    // the hero space label to the most prominent room.
    const largeKinds = palette.filter(k => k.size === 'large');
    const otherKinds = palette.filter(k => k.size !== 'large');
    const fallback = otherKinds.length > 0 ? otherKinds : palette;

    // First pass: assign base labels (without suffixes).
    const baseLabels: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0 && largeKinds.length > 0) {
        baseLabels.push(largeKinds[0].label);
      } else {
        const offset = largeKinds.length > 0 ? i - 1 : i;
        baseLabels.push(fallback[offset % fallback.length].label);
      }
    }

    // Count occurrences so we only suffix labels that appear > 1 time.
    const labelCounts = new Map<string, number>();
    for (const l of baseLabels) {
      labelCounts.set(l, (labelCounts.get(l) ?? 0) + 1);
    }
    const labelSeen = new Map<string, number>();
    for (let i = 0; i < sorted.length; i++) {
      const base = baseLabels[i];
      const count = labelCounts.get(base) ?? 1;
      const idx = (labelSeen.get(base) ?? 0) + 1;
      labelSeen.set(base, idx);
      const label = count > 1 ? `${base} ${idx}` : base;
      newRoomLabels.set(sorted[i].id, label);
    }
  } else if (roomArchNotes.length > 0) {
    // New theme has no room palette — remove room-archetype notes.
    for (const n of roomArchNotes) {
      removedIds.add(n.id);
    }
  }

  // ── Rebuild the notes array ───────────────────────────────────────
  const updatedNotes = notes
    .filter(n => !removedIds.has(n.id))
    .map(n => {
      const poiLabel = newPoiLabels.get(n.id);
      if (poiLabel !== undefined) {
        const kind = newPoiKinds.get(n.id) ?? n.kind;
        return { ...n, label: poiLabel, kind };
      }
      const roomLabel = newRoomLabels.get(n.id);
      if (roomLabel !== undefined) {
        return { ...n, label: roomLabel };
      }
      return n;
    });

  return { notes: updatedNotes, removedIds };
}
