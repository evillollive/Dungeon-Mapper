export interface EditorViewport { zoom: number; pan: { x: number; y: number } }

export function readEditorViewport(key?: string): EditorViewport | null {
  if (!key) return null;
  try {
    const value = JSON.parse(sessionStorage.getItem(`dungeon-mapper:viewport:${key}`) ?? 'null');
    return value && Number.isFinite(value.zoom) && value.zoom >= 0.05 && value.zoom <= 4 &&
      Number.isFinite(value.pan?.x) && Number.isFinite(value.pan?.y) ? value : null;
  } catch {
    console.warn('Viewport preference could not be read. Project saving is unaffected.');
    return null;
  }
}

export function writeEditorViewport(key: string, value: EditorViewport) {
  try {
    sessionStorage.setItem(`dungeon-mapper:viewport:${key}`, JSON.stringify(value));
  } catch {
    console.warn('Viewport preference could not be retained in this tab. Project saving is unaffected.');
  }
}
