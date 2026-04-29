import type { DungeonMap, DungeonProject } from '../types/map';
import { isDungeonProject } from '../types/map';

const DB_NAME = 'dungeon-mapper';
const STORE_NAME = 'maps';
const AUTOSAVE_KEY = 'autosave';
const LEGACY_KEY = 'dungeon-mapper-autosave';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Wrap a bare `DungeonMap` into a 1-level `DungeonProject`. Used for
 * backward-compatible migration from older saves and single-map imports.
 */
export function wrapMapAsProject(map: DungeonMap): DungeonProject {
  return {
    name: map.meta.name || 'New Dungeon',
    levels: [map],
    activeLevelIndex: 0,
    stairLinks: [],
    customThemes: [],
  };
}

export async function saveProject(project: DungeonProject): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(project, AUTOSAVE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[dungeon-mapper] Failed to save project:', err);
  }
}

/** @deprecated Use `saveProject` instead. Kept for migration path only. */
export async function saveMap(map: DungeonMap): Promise<void> {
  return saveProject(wrapMapAsProject(map));
}

/**
 * Load the autosaved project from IndexedDB. If the stored data is a
 * legacy bare `DungeonMap` (no `levels` array), it is automatically
 * wrapped into a 1-level project.
 */
export async function loadProject(): Promise<DungeonProject | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(AUTOSAVE_KEY);
      req.onsuccess = () => {
        const data = req.result;
        if (!data) { resolve(null); return; }
        if (isDungeonProject(data)) {
          resolve(data);
        } else {
          // Legacy bare DungeonMap — wrap it.
          resolve(wrapMapAsProject(data as DungeonMap));
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** @deprecated Use `loadProject` instead. */
export async function loadMap(): Promise<DungeonMap | null> {
  const project = await loadProject();
  if (!project) return null;
  return project.levels[project.activeLevelIndex] ?? project.levels[0] ?? null;
}

export async function migrateFromLocalStorage(): Promise<void> {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const map = JSON.parse(raw) as DungeonMap;
    await saveProject(wrapMapAsProject(map));
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* ignore */ }
}

export function clearSavedMap(): void {
  openDB().then(db => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(AUTOSAVE_KEY);
  }).catch(err => {
    console.warn('[dungeon-mapper] Failed to clear saved map:', err);
  });
}
