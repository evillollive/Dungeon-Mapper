import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportMapSVG } from '../export';
import { renderMapToCanvas } from '../renderMap';
import { createDefaultMap } from '../../hooks/mapStateUtils';
import { getTheme } from '../../themes';
import type { DungeonMap } from '../../types/map';

const blobs: Blob[] = [];

function installDownloadMocks() {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn((blob: Blob) => {
      blobs.push(blob);
      return `blob:test-${blobs.length}`;
    }),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
}

function smallMap(): DungeonMap {
  const map = createDefaultMap('Export Test', 4, 4);
  map.tiles[1][1] = { type: 'floor' };
  map.tiles[1][2] = { type: 'floor' };
  map.fogEnabled = true;
  map.fog = Array.from({ length: 4 }, () => Array<boolean>(4).fill(false));
  return map;
}

describe('export and render helpers', () => {
  beforeEach(() => {
    blobs.length = 0;
    installDownloadMocks();
  });

  it('SVG player export hides multi-cell tokens when any footprint cell is fogged', async () => {
    const map = smallMap();
    map.tokens = [{ id: 1, kind: 'monster', x: 1, y: 1, size: 2, label: 'Ogre' }];
    map.fog![2][2] = true;

    exportMapSVG(map, getTheme('dungeon'), undefined, { viewMode: 'player' });
    const svg = await blobs[0].text();

    expect(svg).not.toContain('O</text>');
  });

  it('SVG dynamic-fog player export keeps explored notes visible and unexplored notes hidden', async () => {
    const map = smallMap();
    map.dynamicFogEnabled = true;
    map.notes = [
      { id: 1, x: 1, y: 1, label: 'Explored', description: '' },
      { id: 2, x: 2, y: 2, label: 'Hidden', description: '' },
    ];
    map.fog![1][1] = true;
    map.fog![2][2] = true;
    map.explored = Array.from({ length: 4 }, () => Array<boolean>(4).fill(false));
    map.explored[1][1] = true;

    exportMapSVG(map, getTheme('dungeon'), undefined, { viewMode: 'player' });
    const svg = await blobs[0].text();

    expect(svg).toContain('>1</text>');
    expect(svg).not.toContain('>2</text>');
    expect(svg).toContain('rgba(107,114,128,0.55)');
    expect(svg).toContain('fill="#6b7280"');
  });

  it('renderMapToCanvas returns an offscreen canvas at the requested tile size', () => {
    const map = createDefaultMap('Canvas Export', 3, 2);

    const canvas = renderMapToCanvas(map, {
      tileSize: 12,
      themeId: 'dungeon',
      viewMode: 'gm',
    });

    expect(canvas.width).toBe(36);
    expect(canvas.height).toBe(24);
  });
});
