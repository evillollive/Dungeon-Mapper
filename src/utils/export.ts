import type { DungeonMap } from '../types/map';

export function exportMapJSON(map: DungeonMap): void {
  const json = JSON.stringify(map, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${map.meta.name.replace(/\s+/g, '_') || 'dungeon'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importMapJSON(file: File): Promise<DungeonMap> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const map = JSON.parse(e.target?.result as string) as DungeonMap;
        resolve(map);
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function exportMapPNG(canvas: HTMLCanvasElement, name: string): void {
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/\s+/g, '_') || 'dungeon'}.png`;
  a.click();
}
