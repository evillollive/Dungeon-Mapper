import { useCallback, useRef, useState } from 'react';
import type { DungeonMap, River, TileType } from '../types/map';
import { bresenhamLine } from '../utils/canvasGeometry';
import { applyTileUpdates } from '../utils/tileEditing';

/** Preview edits locally. Neither autosave nor history sees an interrupted gesture. */
export function useCanvasDraft(source: DungeonMap) {
  const [preview, setPreview] = useState<DungeonMap | null>(null);
  const draft = useRef<DungeonMap | null>(null);
  const commits = useRef(new Map<string, () => void>());
  const stage = useCallback((key: string, update: (map: DungeonMap) => DungeonMap, commit: () => void) => {
    const current = draft.current ?? source;
    const next = update(current);
    if (next === current) return;
    draft.current = next;
    commits.current.set(key, commit);
    setPreview(draft.current);
  }, [source]);
  const cancel = useCallback(() => {
    draft.current = null;
    commits.current.clear();
    setPreview(null);
  }, []);
  const finish = useCallback(() => {
    const pending = [...commits.current.values()];
    cancel();
    pending.forEach(commit => commit());
  }, [cancel]);
  return { map: preview ?? source, stage, cancel, finish };
}

export function useCanvasEditingDraft(source: DungeonMap, callbacks: {
  commitTile: (x: number, y: number, type: TileType) => void;
  onSetTiles: (updates: { x: number; y: number; type: TileType }[]) => void;
  commitMoveToken: (id: number, x: number, y: number) => void;
  commitMoveStamp?: (id: number, x: number, y: number) => void;
  commitUpdateRiver?: (id: number, patch: Partial<Omit<River, 'id'>>) => void;
}) {
  const draft = useCanvasDraft(source);
  const { stage } = draft;
  const { commitTile, onSetTiles, commitMoveToken, commitMoveStamp, commitUpdateRiver } = callbacks;
  const paintCells = useRef(new Map<string, { x: number; y: number; type: TileType }>());
  const lastPaintCell = useRef<{ x: number; y: number } | null>(null);
  const onSetTile = useCallback((x: number, y: number, type: TileType) => {
    const previous = paintCells.current.size ? lastPaintCell.current : null;
    const points = previous ? bresenhamLine(previous.x, previous.y, x, y) : [{ x, y }];
    lastPaintCell.current = { x, y };
    for (const point of points) paintCells.current.set(`${point.x},${point.y}`, { ...point, type });
    const updates = [...paintCells.current.values()];
    stage('paint', m => {
      const tiles = applyTileUpdates(m.tiles, updates, m.meta.width, m.meta.height);
      return tiles ? { ...m, tiles } : m;
    }, () => updates.length === 1 ? commitTile(x, y, type) : onSetTiles(updates));
  }, [stage, commitTile, onSetTiles]);
  const onMoveToken = useCallback((id: number, x: number, y: number) => {
    stage('token', m => ({ ...m, tokens: m.tokens?.map(t => t.id === id ? {
      ...t, x: Math.max(0, Math.min(m.meta.width - (t.size ?? 1), x)),
      y: Math.max(0, Math.min(m.meta.height - (t.size ?? 1), y)),
    } : t) }), () => commitMoveToken(id, x, y));
  }, [stage, commitMoveToken]);
  const onMoveStamp = useCallback((id: number, x: number, y: number) => {
    stage('stamp', m => ({ ...m, stamps: m.stamps?.map(s => s.id === id ? {
      ...s, x: Math.max(0, Math.min(m.meta.width - 1, x)), y: Math.max(0, Math.min(m.meta.height - 1, y)),
    } : s) }), () => commitMoveStamp?.(id, x, y));
  }, [stage, commitMoveStamp]);
  const onUpdateRiver = useCallback((id: number, patch: Partial<Omit<River, 'id'>>) => {
    stage('river', m => ({ ...m, rivers: m.rivers?.map(r => r.id === id ? { ...r, ...patch } : r) }),
      () => commitUpdateRiver?.(id, patch));
  }, [stage, commitUpdateRiver]);
  return { ...draft, paintCells, onSetTile, onMoveToken, onMoveStamp, onUpdateRiver };
}
