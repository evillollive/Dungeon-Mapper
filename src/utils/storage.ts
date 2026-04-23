import type { DungeonMap } from '../types/map';

const STORAGE_KEY = 'dungeon-mapper-autosave';

export function saveMap(map: DungeonMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage quota exceeded or unavailable
  }
}

export function loadMap(): DungeonMap | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DungeonMap;
  } catch {
    return null;
  }
}

export function clearSavedMap(): void {
  localStorage.removeItem(STORAGE_KEY);
}
