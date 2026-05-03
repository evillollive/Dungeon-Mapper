import { useCallback } from 'react';
import type { DungeonMap, DungeonProject, MapNote, PlacedStamp, Tile } from '../types/map';
import type { ClipboardBuffer } from './mapStateUtils';
import { nextIdAfter, updateActiveLevel } from './mapStateUtils';

let clipboard: ClipboardBuffer | null = null;

export function getClipboard(): ClipboardBuffer | null {
  return clipboard;
}

export function useMapClipboard(
  map: DungeonMap,
  setProject: React.Dispatch<React.SetStateAction<DungeonProject>>,
  debouncedSave: (proj: DungeonProject) => void,
  activeLevelIndex: number,
  pushHistory: (prev: DungeonMap, levelIdx: number) => void,
  setNextNoteId: React.Dispatch<React.SetStateAction<number>>,
) {
  const copySelection = useCallback((sel: { x: number; y: number; w: number; h: number }) => {
    const { tiles: mapTiles, notes: mapNotes, meta } = map;
    const mapStamps = map.stamps;
    const bufTiles: Tile[][] = [];
    for (let dy = 0; dy < sel.h; dy++) {
      const row: Tile[] = [];
      for (let dx = 0; dx < sel.w; dx++) {
        const ty = sel.y + dy;
        const tx = sel.x + dx;
        if (ty >= 0 && ty < meta.height && tx >= 0 && tx < meta.width) {
          row.push({ ...mapTiles[ty][tx] });
        } else {
          row.push({ type: 'empty' });
        }
      }
      bufTiles.push(row);
    }
    const bufNotes: MapNote[] = mapNotes
      .filter(n => n.x >= sel.x && n.x < sel.x + sel.w && n.y >= sel.y && n.y < sel.y + sel.h)
      .map(n => ({ ...n, x: n.x - sel.x, y: n.y - sel.y }));
    const bufStamps: PlacedStamp[] = (mapStamps ?? [])
      .filter(s => s.x >= sel.x && s.x < sel.x + sel.w && s.y >= sel.y && s.y < sel.y + sel.h)
      .map(s => ({ ...s, x: s.x - sel.x, y: s.y - sel.y }));
    clipboard = { tiles: bufTiles, notes: bufNotes, stamps: bufStamps, width: sel.w, height: sel.h };
  }, [map]);

  const cutSelection = useCallback((sel: { x: number; y: number; w: number; h: number }) => {
    copySelection(sel);
    setProject(prev => {
      pushHistory(prev.levels[activeLevelIndex], activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => {
        const newTiles = m.tiles.map(row => row.map(t => ({ ...t })));
        for (let dy = 0; dy < sel.h; dy++) {
          const ty = sel.y + dy;
          if (ty < 0 || ty >= m.meta.height) continue;
          for (let dx = 0; dx < sel.w; dx++) {
            const tx = sel.x + dx;
            if (tx < 0 || tx >= m.meta.width) continue;
            newTiles[ty][tx] = { type: 'empty' };
          }
        }
        const notesToRemove = new Set(
          m.notes
            .filter(n => n.x >= sel.x && n.x < sel.x + sel.w && n.y >= sel.y && n.y < sel.y + sel.h)
            .map(n => n.id)
        );
        for (let y = 0; y < m.meta.height; y++) {
          for (let x = 0; x < m.meta.width; x++) {
            if (newTiles[y][x].noteId !== undefined && notesToRemove.has(newTiles[y][x].noteId!)) {
              const next = { ...newTiles[y][x] };
              delete next.noteId;
              newTiles[y][x] = next;
            }
          }
        }
        const stampsToRemove = new Set(
          (m.stamps ?? [])
            .filter(s => s.x >= sel.x && s.x < sel.x + sel.w && s.y >= sel.y && s.y < sel.y + sel.h)
            .map(s => s.id)
        );
        return {
          ...m,
          tiles: newTiles,
          notes: m.notes.filter(n => !notesToRemove.has(n.id)),
          stamps: (m.stamps ?? []).filter(s => !stampsToRemove.has(s.id)),
        };
      });
      debouncedSave(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copySelection, debouncedSave, activeLevelIndex]);

  const pasteClipboard = useCallback((ox: number, oy: number) => {
    if (!clipboard) return;
    const buf = clipboard;
    setProject(prev => {
      pushHistory(prev.levels[activeLevelIndex], activeLevelIndex);
      const updated = updateActiveLevel(prev, activeLevelIndex, m => {
        const newTiles = m.tiles.map(row => row.map(t => ({ ...t })));
        const idOffset = nextIdAfter(m.notes) - 1;
        const idMap = new Map<number, number>();
        for (const n of buf.notes) idMap.set(n.id, n.id + idOffset);
        for (let dy = 0; dy < buf.height; dy++) {
          const ty = oy + dy;
          if (ty < 0 || ty >= m.meta.height) continue;
          for (let dx = 0; dx < buf.width; dx++) {
            const tx = ox + dx;
            if (tx < 0 || tx >= m.meta.width) continue;
            const src = buf.tiles[dy][dx];
            const next: Tile = { type: src.type };
            if (src.theme) next.theme = src.theme;
            if (src.noteId !== undefined) {
              const remapped = idMap.get(src.noteId);
              if (remapped !== undefined) next.noteId = remapped;
            }
            newTiles[ty][tx] = next;
          }
        }
        const remappedNotes: MapNote[] = buf.notes.map(n => ({
          ...n, id: n.id + idOffset, x: n.x + ox, y: n.y + oy,
        }));
        const validNotes = remappedNotes.filter(
          n => n.x >= 0 && n.x < m.meta.width && n.y >= 0 && n.y < m.meta.height
        );
        const stampIdOffset = nextIdAfter(m.stamps) - 1;
        const remappedStamps: PlacedStamp[] = (buf.stamps ?? []).map(s => ({
          ...s, id: s.id + stampIdOffset, x: s.x + ox, y: s.y + oy,
        }));
        const validStamps = remappedStamps.filter(
          s => s.x >= 0 && s.x < m.meta.width && s.y >= 0 && s.y < m.meta.height
        );
        return {
          ...m,
          tiles: newTiles,
          notes: [...m.notes, ...validNotes],
          stamps: [...(m.stamps ?? []), ...validStamps],
        };
      });
      debouncedSave(updated);
      return updated;
    });
    if (buf.notes.length > 0) {
      const highestGen = nextIdAfter(buf.notes) - 1;
      setNextNoteId(prev => prev + highestGen);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave, activeLevelIndex]);

  return { copySelection, cutSelection, pasteClipboard };
}
