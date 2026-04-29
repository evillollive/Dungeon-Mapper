import { useCallback } from 'react';
import type { DungeonMap, DungeonProject, StairLink } from '../types/map';
import type { LevelHistory } from './mapStateUtils';
import { createDefaultMap } from './mapStateUtils';

export function useLevelManagement(
  setProject: React.Dispatch<React.SetStateAction<DungeonProject>>,
  debouncedSave: (proj: DungeonProject) => void,
  activeLevelIndex: number,
  setActiveLevelIndex: React.Dispatch<React.SetStateAction<number>>,
  historyRef: React.MutableRefObject<Map<number, LevelHistory>>,
  getHistory: (levelIdx: number) => LevelHistory,
  setCanUndo: React.Dispatch<React.SetStateAction<boolean>>,
  setCanRedo: React.Dispatch<React.SetStateAction<boolean>>,
  syncIdsToLevel: (level: DungeonMap) => void,
  setSelectedNoteId: React.Dispatch<React.SetStateAction<number | null>>,
) {
  const switchLevel = useCallback((idx: number) => {
    setProject(prev => {
      if (idx < 0 || idx >= prev.levels.length || idx === activeLevelIndex) return prev;
      const updated = { ...prev, activeLevelIndex: idx };
      debouncedSave(updated);
      return updated;
    });
    setActiveLevelIndex(idx);
    setProject(prev => {
      const level = prev.levels[idx];
      if (level) {
        syncIdsToLevel(level);
        const h = getHistory(idx);
        setCanUndo(h.past.length > 0);
        setCanRedo(h.future.length > 0);
      }
      setSelectedNoteId(null);
      return prev;
    });

  }, [debouncedSave, activeLevelIndex]);

  const addLevel = useCallback((name?: string) => {
    setProject(prev => {
      const idx = prev.levels.length;
      const fresh = createDefaultMap(name ?? `Level ${idx + 1}`);
      const updated: DungeonProject = {
        ...prev, levels: [...prev.levels, fresh], activeLevelIndex: idx,
      };
      debouncedSave(updated);
      setActiveLevelIndex(idx);
      syncIdsToLevel(fresh);
      setCanUndo(false);
      setCanRedo(false);
      setSelectedNoteId(null);
      return updated;
    });

  }, [debouncedSave]);

  const renameLevel = useCallback((idx: number, name: string) => {
    setProject(prev => {
      if (idx < 0 || idx >= prev.levels.length) return prev;
      const newLevels = prev.levels.map((lvl, i) =>
        i === idx ? { ...lvl, meta: { ...lvl.meta, name } } : lvl,
      );
      const updated = { ...prev, levels: newLevels };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const deleteLevel = useCallback((idx: number) => {
    setProject(prev => {
      if (prev.levels.length <= 1 || idx < 0 || idx >= prev.levels.length) return prev;
      const newLevels = prev.levels.filter((_, i) => i !== idx);
      const newLinks = prev.stairLinks
        .filter(l => l.fromLevel !== idx && l.toLevel !== idx)
        .map(l => ({
          ...l,
          fromLevel: l.fromLevel > idx ? l.fromLevel - 1 : l.fromLevel,
          toLevel: l.toLevel > idx ? l.toLevel - 1 : l.toLevel,
        }));
      let newActive = activeLevelIndex;
      if (idx === activeLevelIndex) newActive = Math.min(idx, newLevels.length - 1);
      else if (idx < activeLevelIndex) newActive = activeLevelIndex - 1;
      const newHistoryMap = new Map<number, LevelHistory>();
      for (const [key, val] of historyRef.current.entries()) {
        if (key === idx) continue;
        newHistoryMap.set(key > idx ? key - 1 : key, val);
      }
      historyRef.current = newHistoryMap;
      const updated: DungeonProject = {
        ...prev, levels: newLevels, stairLinks: newLinks, activeLevelIndex: newActive,
      };
      debouncedSave(updated);
      setActiveLevelIndex(newActive);
      syncIdsToLevel(newLevels[newActive]);
      const h = getHistory(newActive);
      setCanUndo(h.past.length > 0);
      setCanRedo(h.future.length > 0);
      setSelectedNoteId(null);
      return updated;
    });

  }, [debouncedSave, activeLevelIndex]);

  const duplicateLevel = useCallback((idx: number) => {
    setProject(prev => {
      if (idx < 0 || idx >= prev.levels.length) return prev;
      const source = prev.levels[idx];
      const copy: DungeonMap = JSON.parse(JSON.stringify(source));
      copy.meta = { ...copy.meta, name: `${source.meta.name} (copy)` };
      const newIdx = idx + 1;
      const newLevels = [...prev.levels.slice(0, newIdx), copy, ...prev.levels.slice(newIdx)];
      const newLinks = prev.stairLinks.map(l => ({
        ...l,
        fromLevel: l.fromLevel >= newIdx ? l.fromLevel + 1 : l.fromLevel,
        toLevel: l.toLevel >= newIdx ? l.toLevel + 1 : l.toLevel,
      }));
      const newHistoryMap = new Map<number, LevelHistory>();
      for (const [key, val] of historyRef.current.entries()) {
        newHistoryMap.set(key >= newIdx ? key + 1 : key, val);
      }
      historyRef.current = newHistoryMap;
      const updated: DungeonProject = {
        ...prev, levels: newLevels, stairLinks: newLinks, activeLevelIndex: newIdx,
      };
      debouncedSave(updated);
      setActiveLevelIndex(newIdx);
      syncIdsToLevel(copy);
      setCanUndo(false);
      setCanRedo(false);
      setSelectedNoteId(null);
      return updated;
    });

  }, [debouncedSave]);

  const reorderLevels = useCallback((fromIdx: number, toIdx: number) => {
    setProject(prev => {
      if (fromIdx === toIdx || fromIdx < 0 || fromIdx >= prev.levels.length) return prev;
      const clamped = Math.max(0, Math.min(prev.levels.length - 1, toIdx));
      if (fromIdx === clamped) return prev;
      const newLevels = [...prev.levels];
      const [moved] = newLevels.splice(fromIdx, 1);
      newLevels.splice(clamped, 0, moved);
      const ordered = [...prev.levels.keys()];
      const reordered = [...ordered];
      const [movedIdx] = reordered.splice(fromIdx, 1);
      reordered.splice(clamped, 0, movedIdx);
      const indexMap = new Map<number, number>();
      for (let i = 0; i < reordered.length; i++) indexMap.set(reordered[i], i);
      const newLinks = prev.stairLinks.map(l => ({
        ...l,
        fromLevel: indexMap.get(l.fromLevel) ?? l.fromLevel,
        toLevel: indexMap.get(l.toLevel) ?? l.toLevel,
      }));
      const newHistoryMap = new Map<number, LevelHistory>();
      for (const [key, val] of historyRef.current.entries()) {
        newHistoryMap.set(indexMap.get(key) ?? key, val);
      }
      historyRef.current = newHistoryMap;
      const newActive = indexMap.get(activeLevelIndex) ?? activeLevelIndex;
      const updated: DungeonProject = {
        ...prev, levels: newLevels, stairLinks: newLinks, activeLevelIndex: newActive,
      };
      debouncedSave(updated);
      setActiveLevelIndex(newActive);
      return updated;
    });
  }, [debouncedSave, activeLevelIndex]);

  const setProjectName = useCallback((name: string) => {
    setProject(prev => {
      const updated = { ...prev, name };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const addStairLink = useCallback((link: StairLink) => {
    setProject(prev => {
      const filtered = prev.stairLinks.filter(
        l => !(l.fromLevel === link.fromLevel && l.fromCell.x === link.fromCell.x && l.fromCell.y === link.fromCell.y)
      );
      const updated: DungeonProject = { ...prev, stairLinks: [...filtered, link] };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const removeStairLink = useCallback((fromLevel: number, fromX: number, fromY: number) => {
    setProject(prev => {
      const filtered = prev.stairLinks.filter(
        l => !(
          (l.fromLevel === fromLevel && l.fromCell.x === fromX && l.fromCell.y === fromY) ||
          (l.toLevel === fromLevel && l.toCell.x === fromX && l.toCell.y === fromY)
        )
      );
      const updated: DungeonProject = { ...prev, stairLinks: filtered };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  return {
    switchLevel, addLevel, renameLevel, deleteLevel,
    duplicateLevel, reorderLevels, setProjectName,
    addStairLink, removeStairLink,
  };
}
