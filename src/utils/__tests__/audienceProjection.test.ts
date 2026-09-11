import { beforeEach, describe, expect, it, vi } from 'vitest';
import { projectForAudience } from '../audienceProjection';
import { audienceFixture, PRIVATE_SENTINEL } from '../../test/audienceFixture';
import { decodeProject, encodeProject } from '../projectSchema';
import { exportMapSVG, exportHighResPNG } from '../export';
import { getTheme } from '../../themes';
import { renderMapToCanvas, renderPlayerProjection } from '../renderMap';
import { applyTileUpdates } from '../tileEditing';
import { floodFill } from '../mapUtils';

describe('audience projection', () => {
  it('removes private sentinels from every DTO field without changing source data', () => {
    const project = audienceFixture();
    const before = JSON.stringify(project);
    const dto = projectForAudience(project.levels[0], project.customThemes, project.customStamps);
    expect(JSON.stringify(dto)).not.toContain(PRIVATE_SENTINEL);
    expect(JSON.stringify(project)).toBe(before);
    expect(dto.map.meta.name).toBe('The Watchtower');
    expect(dto.map.notes).toEqual([{ id: 2, x: 2, y: 2, label: 'A worn inscription', description: 'The stairs lead upward.' }]);
    expect(dto.map.tokens?.map(t => t.label)).toEqual(['Scout', 'Guide']);
    expect(dto.map.initiative).toEqual([1]);
    expect(dto.map.tiles[7][7]).toEqual({ type: 'empty' });
    expect(dto.map.tiles[1][1].noteId).toBeUndefined();
    expect(dto.customStamps).toEqual([]);
    expect(dto.map).not.toHaveProperty('roomShapes');
    expect(dto.map).not.toHaveProperty('rivers');
    expect(dto.map).not.toHaveProperty('levels');
  });

  it('keeps legacy descriptions private across save, import and explicit publication', () => {
    const original = audienceFixture();
    const project = decodeProject(encodeProject(original));
    expect(project).toEqual(original);
    const map = project.levels[0];
    map.notes[0].published = true;
    expect(projectForAudience(map).map.notes[0]).toMatchObject({ label: 'Note', description: '' });
    expect(map.notes[0].description).toBe(PRIVATE_SENTINEL);
    map.notes[0].publicLabel = 'Published title';
    map.notes[0].publicDescription = 'Published body';
    expect(projectForAudience(map).map.notes[0]).toMatchObject({ label: 'Published title', description: 'Published body' });
    map.notes[0].published = false;
    expect(projectForAudience(map).map.notes.some(n => n.id === 1)).toBe(false);
  });

  it('validates publication, entity visibility and discovery fields on import', () => {
    for (const mutate of [
      (p: ReturnType<typeof audienceFixture>) => Object.assign(p.levels[0].notes[0], { published: 'yes' }),
      (p: ReturnType<typeof audienceFixture>) => Object.assign(p.levels[0].tokens![0], { hidden: 1 }),
      (p: ReturnType<typeof audienceFixture>) => Object.assign(p.levels[0].tiles[0][0], { discovered: 'yes' }),
      (p: ReturnType<typeof audienceFixture>) => Object.assign(p.levels[0].meta, { publicName: false }),
    ]) {
      const project = audienceFixture();
      mutate(project);
      expect(() => decodeProject(project)).toThrow('Invalid project');
    }
  });

  it('excludes unknown custom-theme dictionary fields after a valid import', () => {
    const project = audienceFixture();
    project.levels[0].meta.theme = 'custom-theme:stone';
    project.customThemes = [{
      id: 'custom-theme:stone', name: PRIVATE_SENTINEL, baseThemeId: 'dungeon', gridColor: '#fff',
      tileColors: { floor: '#333' }, tileLabels: {}, customTiles: [],
    }];
    Object.assign(project.customThemes[0].tileColors, { privateExtension: PRIVATE_SENTINEL });
    const decoded = decodeProject(project);
    const dto = projectForAudience(decoded.levels[0], decoded.customThemes);
    expect(dto.customThemes[0].tileColors).toEqual({ floor: '#333' });
    expect(JSON.stringify(dto)).not.toContain(PRIVATE_SENTINEL);
  });

  it('masks secrets independently of fog and clears discovery when painted over', () => {
    const map = audienceFixture().levels[0];
    map.fogEnabled = false;
    let safe = projectForAudience(map).map;
    expect([safe.tiles[1][1].type, safe.tiles[1][2].type, safe.tiles[2][1].type, safe.tiles[2][2].type])
      .toEqual(['wall', 'floor', 'door-h', 'door-v']);
    map.tiles[1][1].discovered = true;
    expect(projectForAudience(map).map.tiles[1][1].type).toBe('secret-door');
    const replaced = applyTileUpdates(map.tiles, [{ x: 1, y: 1, type: 'trap' }], 8, 8)!;
    expect(replaced[1][1].discovered).toBeUndefined();
    expect(floodFill(map.tiles, 1, 1, 'secret-door', 'floor')[1][1].discovered).toBeUndefined();
    map.fogEnabled = true;
    map.fog![1][1] = true;
    safe = projectForAudience(map).map;
    expect(safe.tiles[1][1].type).toBe('empty');
  });

  it('uses one known/current policy with no lights, explored cells and full token footprints', () => {
    const map = audienceFixture().levels[0];
    map.dynamicFogEnabled = true;
    map.lightSources = [];
    map.tokens = [{ id: 1, x: 1, y: 1, kind: 'monster', label: 'Remembered', size: 2 }];
    map.fog = map.fog!.map(row => row.map(() => true));
    map.explored = map.fog.map(row => row.map(() => false));
    map.explored[1][1] = map.explored[1][2] = map.explored[2][1] = true;
    expect(projectForAudience(map).map.tokens).toEqual([]);
    map.explored[2][2] = true;
    let dto = projectForAudience(map);
    expect(dto.map.tokens).toHaveLength(1);
    expect(dto.map.notes).toHaveLength(1);
    expect(dto.map.explored![1][1]).toBe(true);
    expect(dto.map.fog![1][1]).toBe(true);
    expect(dto.map.tiles[1][1].type).toBe('wall');
    map.tokens = [{ id: 1, x: 2, y: 2, kind: 'player', label: 'Scout' }];
    dto = projectForAudience(map);
    expect(dto.map.fog![2][2]).toBe(false);
    expect(dto.map.explored![2][2]).toBe(false);
    map.tokens[0].hidden = true;
    expect(projectForAudience(map).map.fog![2][2]).toBe(true);
    map.lightSources = [{ id: 1, x: 2, y: 2, radius: 2, label: PRIVATE_SENTINEL, color: '#fff' }];
    expect(projectForAudience(map).map.fog![2][2]).toBe(false);
  });

  it('uses derived room walls for sight and never sends geometry behind fog', () => {
    const map = audienceFixture().levels[0];
    map.tiles = map.tiles.map(row => row.map(() => ({ type: 'empty' })));
    map.roomShapes = [{ id: 1, x: 1, y: 1, width: 4, height: 4 }];
    map.dynamicFogEnabled = true;
    map.fog = map.fog!.map(row => row.map(() => true));
    map.lightSources = [];
    map.tokens = [{ id: 1, x: 2, y: 2, label: 'Scout', kind: 'player' }];
    const dto = projectForAudience(map);
    expect(dto.map.tiles[1][2].type).toBe('wall');
    expect(dto.map.tiles[7][7].type).toBe('empty');
    expect(dto.map.fog![7][7]).toBe(true);
  });

  it('does not leak private geometry via long lines, rotated stamps or images', () => {
    const map = audienceFixture().levels[0];
    map.wallSegments = [{ id: 1, points: [{ x: 1, y: 1 }, { x: 6, y: 1 }], thickness: 0.1, color: PRIVATE_SENTINEL }];
    map.pathSegments = [{ id: 1, points: [{ x: 1, y: 1 }, { x: 6, y: 1 }], width: 0.2, color: PRIVATE_SENTINEL }];
    map.annotations!.push({ id: 2, points: [{ x: 1, y: 1 }, { x: 6, y: 1 }], width: 0.1, color: PRIVATE_SENTINEL, kind: 'player' });
    map.stamps!.push({ id: 2, stampId: PRIVATE_SENTINEL, x: 4, y: 1, scale: 2, rotation: 45, opacity: 1, flipX: false, flipY: false, locked: false });
    const dto = projectForAudience(map);
    expect(JSON.stringify(dto)).not.toContain(PRIVATE_SENTINEL);
    expect(dto.map.wallSegments).toEqual([]);
    expect(dto.map.pathSegments).toEqual([]);
    expect(dto.map.stamps).toEqual([]);
    expect(dto.map.backgroundImage).toBeUndefined();
  });
});

describe('audience export parity', () => {
  const blobs: Blob[] = [];
  beforeEach(() => {
    blobs.length = 0;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: (blob: Blob) => { blobs.push(blob); return 'blob:export'; } });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });
  it('omits sentinels and hidden geometry from SVG source, not just visible pixels', async () => {
    const project = audienceFixture();
    exportMapSVG(project.levels[0], getTheme('dungeon'), undefined, { viewMode: 'player', customStamps: project.customStamps });
    const svg = await blobs[0].text();
    expect(svg).not.toContain(PRIVATE_SENTINEL);
    expect(svg).not.toContain('>1</text>');
    expect(svg).toContain('>2</text>');
    expect(svg).not.toContain('x="140" y="140" width="20" height="20"');
    const downloads = vi.mocked(HTMLAnchorElement.prototype.click).mock.instances;
    expect(downloads[0].download).toBe('The_Watchtower.svg');
  });
  it('renders the same safe canvas commands for direct player export and preview', () => {
    const map = audienceFixture().levels[0];
    const context = document.createElement('canvas').getContext('2d')!;
    const calls = vi.spyOn(context, 'fillText');
    renderMapToCanvas(map, { tileSize: 20, themeId: 'dungeon', viewMode: 'player' });
    const exportedText = calls.mock.calls.slice();
    calls.mockClear();
    renderPlayerProjection(projectForAudience(map), { tileSize: 20 });
    expect(calls.mock.calls).toEqual(exportedText);
    expect(JSON.stringify(calls.mock.calls)).not.toContain(PRIVATE_SENTINEL);
  });
  it('rejects failed PNG encoding and preserves the source project', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(null));
    const map = audienceFixture().levels[0];
    const before = JSON.stringify(map);
    await expect(exportHighResPNG(map, { dpi: 10, themeId: 'dungeon', printMode: false, viewMode: 'player', pagePresetId: 'none' }))
      .rejects.toThrow('PNG rendering failed');
    expect(JSON.stringify(map)).toBe(before);
  });
});
