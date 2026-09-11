// F05 v1. Fixed geometry and placements, with no clock or random inputs.
export function denseMapFixture() {
  const width = 128;
  const grid = cell => Array.from({ length: width }, (_, y) =>
    Array.from({ length: width }, (_, x) => cell(x, y)));
  const furnishingKeys = ['table', 'chair', 'bed', 'shelf', 'crate', 'barrel', 'altar', 'rubble'];
  return {
    name: 'F05 dense dungeon v1', activeLevelIndex: 0, stairLinks: [],
    levels: [{
      meta: { name: 'F05 dense dungeon v1', publicName: 'The crowded halls',
        width, height: width, tileSize: 32, theme: 'dungeon-folio-v1' },
      tiles: grid((x, y) => ({
        type: x === 0 || y === 0 || x === 127 || y === 127 ? 'wall'
          : x % 16 === 0 ? (y % 16 === 8 ? 'door-v' : 'wall')
          : y % 16 === 0 ? (x % 16 === 8 ? 'door-h' : 'wall')
          : y % 16 === 12 && x % 16 > 9 ? 'water' : 'floor',
        ...(x % 16 < 6 ? { floorMaterial: 'folio-worn-wood-v1' }
          : x % 16 > 10 ? { floorMaterial: 'folio-earth-v1' } : {}),
      })),
      tokens: Array.from({ length: 100 }, (_, i) => ({
        id: i + 1, x: 3 + (i % 10) * 12, y: 3 + Math.floor(i / 10) * 12,
        kind: i < 8 ? 'player' : i % 3 ? 'monster' : 'npc',
        label: i === 0 ? 'Scout' : `Occupant ${i + 1}`,
        icon: i < 8 ? 'warrior' : 'skull', size: i > 8 && i % 7 === 0 ? 2 : 1,
      })),
      notes: Array.from({ length: 100 }, (_, i) => ({
        id: i + 1, x: 5 + (i % 10) * 12, y: 5 + Math.floor(i / 10) * 12,
        label: `Private room ${i + 1}`, description: 'F05_PRIVATE_SENTINEL',
        published: i % 2 === 0, publicLabel: `Chamber ${i + 1}`,
        publicDescription: 'A worn passage between the halls.',
      })),
      stamps: Array.from({ length: 200 }, (_, i) => ({
        id: i + 1, stampId: `folio-furnishings-v1-${furnishingKeys[i % 8]}`,
        x: 6 + (i % 20) * 6, y: 6 + Math.floor(i / 20) * 12,
        rotation: i % 4 * 90, scale: i % 8 === 0 ? 2 : 1,
        flipX: i % 3 === 0, flipY: i % 5 === 0, opacity: 0.85, locked: false,
      })),
      roomShapes: Array.from({ length: 16 }, (_, i) => ({
        id: i + 1, x: 34 + i % 4 * 16, y: 34 + Math.floor(i / 4) * 16,
        width: 10, height: 10, shapeType: i % 2 ? 'circle' : 'rect', fillTile: 'floor',
      })),
      rivers: [{ id: 1, controlPoints: [{ x: 108, y: 5 }, { x: 116, y: 52 }, { x: 108, y: 121 }],
        width: 2, type: 'water', flowDirection: 90, color: '#547b7a' }],
      wallSegments: [{ id: 1, points: [{ x: 8, y: 100 }, { x: 28, y: 100 }], color: '#293330', thickness: 0.1 }],
      pathSegments: [{ id: 1, points: [{ x: 8, y: 102 }, { x: 28, y: 106 }], color: '#8b7355', width: 0.3 }],
      fogEnabled: true, dynamicFogEnabled: true,
      fog: grid(() => true), explored: grid((x, y) => x < 32 && y < 32),
      lightSources: Array.from({ length: 12 }, (_, i) => ({
        id: i + 1, x: 8 + i % 4 * 32, y: 8 + Math.floor(i / 4) * 32,
        radius: 6, color: '#f97316', label: `Lantern ${i + 1}`,
      })),
      initiative: Array.from({ length: 100 }, (_, i) => i + 1),
      annotations: [], markers: [], artStylePreset: 'classic',
      paperTexture: { enabled: true, pattern: 'parchment', opacity: 0.6, grain: 0.3, vignette: 0.25 },
      edgeBlend: { enabled: true, style: 'dither', intensity: 0.35, opacity: 0.6 },
      lightingAtmosphere: { enabled: true, aoIntensity: 0.4, aoRadius: 0.35,
        stampShadowOpacity: 0.3, stampShadowOffset: 0.1, colorGrading: 'none',
        colorGradingIntensity: 0.25, opacity: 0.8 },
    }],
  };
}

export function summarizeSamples(samples) {
  if (!samples.length || samples.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error('Expected nonempty, finite, nonnegative timing samples.');
  }
  const sorted = [...samples].sort((a, b) => a - b);
  return { count: samples.length, medianMs: sorted[Math.ceil(sorted.length / 2) - 1],
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1], maxMs: sorted.at(-1), samplesMs: samples };
}
