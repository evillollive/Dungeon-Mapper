import { useState, useCallback, useRef } from 'react';
import type { DungeonMap, DungeonProject } from '../types/map';
import type { LevelHistory } from './mapStateUtils';
import { createHistorySnapshot, MAX_HISTORY_SIZE, restoreHistorySnapshot, updateActiveLevel } from './mapStateUtils';

export function useMapHistory(
  setProject: React.Dispatch<React.SetStateAction<DungeonProject>>,
  debouncedSave: (proj: DungeonProject) => void,
  activeLevelIndex: number,
) {
  const historyRef = useRef<Map<number, LevelHistory>>(new Map());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  function getHistory(levelIdx: number): LevelHistory {
    let h = historyRef.current.get(levelIdx);
    if (!h) {
      h = { past: [], future: [] };
      historyRef.current.set(levelIdx, h);
    }
    return h;
  }

  function pushHistory(prev: DungeonMap, levelIdx: number) {
    const snap = createHistorySnapshot(prev);
    const h = getHistory(levelIdx);
    h.past = [...h.past.slice(-(MAX_HISTORY_SIZE - 1)), snap];
    h.future = [];
    setCanUndo(true);
    setCanRedo(false);
  }

  const undo = useCallback(() => {
    const h = getHistory(activeLevelIndex);
    if (h.past.length === 0) return;
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      const previous = h.past[h.past.length - 1];
      h.past = h.past.slice(0, -1);
      h.future = [...h.future, createHistorySnapshot(prevMap)];
      const updated = updateActiveLevel(prev, activeLevelIndex, m => restoreHistorySnapshot(m, previous));
      debouncedSave(updated);
      setCanUndo(h.past.length > 0);
      setCanRedo(true);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const redo = useCallback(() => {
    const h = getHistory(activeLevelIndex);
    if (h.future.length === 0) return;
    setProject(prev => {
      const prevMap = prev.levels[activeLevelIndex];
      const next = h.future[h.future.length - 1];
      h.future = h.future.slice(0, -1);
      h.past = [...h.past, createHistorySnapshot(prevMap)];
      const updated = updateActiveLevel(prev, activeLevelIndex, m => restoreHistorySnapshot(m, next));
      debouncedSave(updated);
      setCanUndo(true);
      setCanRedo(h.future.length > 0);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  return { historyRef, canUndo, canRedo, setCanUndo, setCanRedo, getHistory, pushHistory, undo, redo };
}
