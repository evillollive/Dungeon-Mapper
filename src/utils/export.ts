import type { DungeonMap } from '../types/map';
import type { TileTheme } from '../themes/index';

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

export function exportMapPNG(canvas: HTMLCanvasElement, name: string, printFriendly = false): void {
  if (printFriendly) {
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    ctx.drawImage(canvas, 0, 0);
    const url = offscreen.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_') || 'dungeon'}.png`;
    a.click();
    return;
  }
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/\s+/g, '_') || 'dungeon'}.png`;
  a.click();
}

export function exportMapSVG(map: DungeonMap, theme: TileTheme): void {
  const { width, height, tileSize, name } = map.meta;
  const svgW = width * tileSize;
  const svgH = height * tileSize;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
  svg += `<rect width="${svgW}" height="${svgH}" fill="${theme.tileColors['empty']}"/>`;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = map.tiles[y]?.[x];
      if (!tile || tile.type === 'empty') continue;
      const fill = theme.tileColors[tile.type];
      svg += `<rect x="${x * tileSize}" y="${y * tileSize}" width="${tileSize}" height="${tileSize}" fill="${fill}" stroke="#2d3561" stroke-width="0.5"/>`;
    }
  }

  svg += `<g stroke="#2d3561" stroke-width="0.5" opacity="0.5">`;
  for (let x = 0; x <= width; x++) svg += `<line x1="${x * tileSize}" y1="0" x2="${x * tileSize}" y2="${svgH}"/>`;
  for (let y = 0; y <= height; y++) svg += `<line x1="0" y1="${y * tileSize}" x2="${svgW}" y2="${y * tileSize}"/>`;
  svg += `</g>`;

  map.notes.forEach(note => {
    const ncx = note.x * tileSize + tileSize / 2;
    const ncy = note.y * tileSize + tileSize / 2;
    const r = tileSize * 0.38;
    svg += `<circle cx="${ncx}" cy="${ncy}" r="${r}" fill="#f0c040" stroke="#8b6914" stroke-width="1"/>`;
    svg += `<text x="${ncx}" y="${ncy + 1}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.max(8, tileSize * 0.45)}" font-family="monospace" fill="#1a1a2e" font-weight="bold">${note.id}</text>`;
  });

  svg += `</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/\s+/g, '_') || 'dungeon'}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
