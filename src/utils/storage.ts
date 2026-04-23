import type { DungeonMap } from '../types/map';

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

export async function saveMap(map: DungeonMap): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(map, AUTOSAVE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[dungeon-mapper] Failed to save map:', err);
  }
}

export async function loadMap(): Promise<DungeonMap | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(AUTOSAVE_KEY);
      req.onsuccess = () => resolve((req.result as DungeonMap) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function migrateFromLocalStorage(): Promise<void> {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const map = JSON.parse(raw) as DungeonMap;
    await saveMap(map);
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
