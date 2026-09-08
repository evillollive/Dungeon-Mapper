import type { DungeonMap } from '../types/map';
import type { RegionSelection } from '../hooks/useEditorSelection';

export function moveRegionContents(map: DungeonMap, region: RegionSelection, dx: number, dy: number): DungeonMap {
  const { x, y, w, h } = region;
  if (![x, y, w, h, dx, dy].every(Number.isInteger) || w < 1 || h < 1 ||
    x < 0 || y < 0 || x + w > map.meta.width || y + h > map.meta.height ||
    x + dx < 0 || y + dy < 0 || x + dx + w > map.meta.width || y + dy + h > map.meta.height ||
    (dx === 0 && dy === 0)) return map;
  const inside = (point: { x: number; y: number }, ox = x, oy = y) => point.x >= ox && point.y >= oy && point.x < ox + w && point.y < oy + h;
  const notes = map.notes.filter(n => inside(n) || !inside(n, x + dx, y + dy))
    .map(n => inside(n) ? { ...n, x: n.x + dx, y: n.y + dy } : n);
  const noteIds = new Set(notes.map(n => n.id));
  const tiles = map.tiles.map(row => row.map(tile => tile.noteId !== undefined && !noteIds.has(tile.noteId) ? { ...tile, noteId: undefined } : tile));
  for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) tiles[row][col] = { type: 'empty' };
  for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) tiles[y + dy + row][x + dx + col] = { ...map.tiles[y + row][x + col] };
  return {
    ...map, tiles, notes,
    stamps: map.stamps?.map(s => inside(s) ? { ...s, x: s.x + dx, y: s.y + dy } : s),
  };
}
