import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportMapSVG } from '../export';
import { renderMapToCanvas } from '../renderMap';
import { deriveRenderableTiles } from '../derivedRenderMap';
import { createDefaultMap } from '../../hooks/mapStateUtils';
import { getTheme } from '../../themes';
import type { DungeonMap } from '../../types/map';
import { DEFAULT_EDGE_BLEND, DEFAULT_HAND_DRAWN, DEFAULT_LIGHTING_ATMOSPHERE, DEFAULT_PAPER_TEXTURE } from '../../types/map';

const blobs: Blob[] = [];
const EASTWARD_FLOW_DEGREES = 90;

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
  const map = createDefaultMap('Export Test');
  map.meta.width = 4;
  map.meta.height = 4;
  map.tiles = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => ({ type: 'empty' as const })));
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
    const map = createDefaultMap('Canvas Export');
    map.meta.width = 3;
    map.meta.height = 2;
    map.tiles = Array.from({ length: 2 }, () => Array.from({ length: 3 }, () => ({ type: 'empty' as const })));

    const canvas = renderMapToCanvas(map, {
      tileSize: 12,
      themeId: 'dungeon',
      viewMode: 'gm',
    });

    expect(canvas.width).toBe(36);
    expect(canvas.height).toBe(24);
  });

  it('renders a 128×128 full-stack map without changing dimensions', () => {
    const map = createDefaultMap('Full Stack Profile');
    map.meta.width = 128;
    map.meta.height = 128;
    map.tiles = Array.from({ length: 128 }, (_, y) =>
      Array.from({ length: 128 }, (_, x) => ({ type: (x + y) % 9 === 0 ? 'wall' as const : 'floor' as const }))
    );
    map.fogEnabled = true;
    map.fog = Array.from({ length: 128 }, (_, y) =>
      Array.from({ length: 128 }, (_, x) => (x + y) % 17 === 0)
    );
    map.paperTexture = DEFAULT_PAPER_TEXTURE;
    map.edgeBlend = DEFAULT_EDGE_BLEND;
    map.handDrawn = DEFAULT_HAND_DRAWN;
    map.lightingAtmosphere = DEFAULT_LIGHTING_ATMOSPHERE;
    map.rivers = [{ id: 1, controlPoints: [{ x: 0, y: 64 }, { x: 64, y: 60 }, { x: 127, y: 70 }], width: 2, type: 'water', flowDirection: EASTWARD_FLOW_DEGREES }];
    map.markers = [{ id: 1, x: 12, y: 12, shape: 'circle', color: '#ff0000', size: 2 }];
    map.lightSources = [{ id: 1, x: 64, y: 64, radius: 12, color: '#ffffff', label: 'Torch' }];

    const canvas = renderMapToCanvas(map, {
      tileSize: 1,
      themeId: 'dungeon',
      viewMode: 'gm',
    });

    expect(canvas.width).toBe(128);
    expect(canvas.height).toBe(128);
  });

  it('derives room shapes into renderable tiles for all render paths', async () => {
    const map = createDefaultMap('Room Shape Export');
    map.meta.width = 5;
    map.meta.height = 5;
    map.meta.tileSize = 10;
    map.tiles = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ({ type: 'empty' as const })));
    map.roomShapes = [{ id: 1, x: 1, y: 1, width: 3, height: 3 }];

    const derived = deriveRenderableTiles(map);
    expect(derived[1][1].type).toBe('wall');
    expect(derived[2][2].type).toBe('floor');

    exportMapSVG(map, getTheme('dungeon'), undefined, { includeTexture: false, includeEdgeBlend: false, includeHandDrawn: false, includeLighting: false });
    const svg = await blobs[0].text();
    expect(svg).toContain('x="10" y="10" width="10" height="10"');
    expect(svg).toContain('x="20" y="20" width="10" height="10"');
  });

  it('escapes or drops unsafe SVG export attributes', async () => {
    const map = smallMap();
    map.markers = [{ id: 1, x: 1, y: 1, shape: 'circle', color: '#f00" onload="alert(1)', size: 1 }];
    map.stamps = [{ id: 1, stampId: 'evil', x: 1, y: 1, rotation: 0, scale: 1, flipX: false, flipY: false, opacity: 1, locked: false }];

    exportMapSVG(map, getTheme('dungeon'), undefined, {
      customStamps: [{
        id: 'evil',
        name: 'Evil',
        category: 'custom',
        viewBox: '0 0 512 512',
        imageDataUrl: 'javascript:alert(1)',
      }],
    });
    const svg = await blobs[0].text();

    expect(svg).not.toContain('javascript:alert');
    expect(svg).not.toContain('onload=');
  });
});
