import { useCallback, useState } from 'react';
import type { DungeonMap } from '../types/map';

export type RegionSelection = { x: number; y: number; w: number; h: number };
export type ObjectKind = 'token' | 'note' | 'stamp' | 'room' | 'river';
export type EditorSelection = { kind: ObjectKind; id: number } | { kind: 'region'; bounds: RegionSelection } | null;

export function useEditorSelection(scope: string, map: DungeonMap) {
  const [stored, setStored] = useState<{ scope: string; selection: EditorSelection }>({ scope, selection: null });
  if (stored.scope !== scope) setStored({ scope, selection: null });
  const candidate = stored.scope === scope ? stored.selection : null;
  const collections = { token: map.tokens, note: map.notes, stamp: map.stamps, room: map.roomShapes, river: map.rivers };
  const selection = candidate?.kind === 'region'
    ? candidate.bounds.x >= 0 && candidate.bounds.y >= 0 && candidate.bounds.w > 0 && candidate.bounds.h > 0 &&
      candidate.bounds.x + candidate.bounds.w <= map.meta.width && candidate.bounds.y + candidate.bounds.h <= map.meta.height ? candidate : null
    : candidate && collections[candidate.kind]?.some(item => item.id === candidate.id) ? candidate : null;
  if (candidate && !selection) setStored({ scope, selection: null });
  const select = useCallback((selection: EditorSelection) => setStored({ scope, selection }), [scope]);
  return { selection, select };
}
