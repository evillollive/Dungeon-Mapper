import { describe, expect, it } from 'vitest';
import { LAUNCH_SAMPLES, buildLaunchSample } from '../launchSamples';
import { PREMADE_MAP_SUMMARIES, buildPremadeProject } from '../premadeMaps';
import { decodeProject, encodeProject } from '../projectSchema';
import { projectForAudience } from '../audienceProjection';
import { getStampDef } from '../stampCatalog';
import { ICON_BY_ID } from '../iconLibrary';
import { FOLIO_TOKEN_BY_ID } from '../../assets/folio-tokens-v1/catalog';
import { getTheme } from '../../themes';

describe('ART-06 authored launch encounters', () => {
  it('keeps the old default sample and offers exactly three separate launch copies', () => {
    expect(PREMADE_MAP_SUMMARIES[0].id).toBe('sunken-crypt');
    expect(LAUNCH_SAMPLES).toHaveLength(3);
    expect(() => buildLaunchSample('missing')).toThrow('Unknown launch sample');
  });

  it.each(LAUNCH_SAMPLES)('$id preserves content, uses available artwork and creates fresh copies', summary => {
    expect(PREMADE_MAP_SUMMARIES).toContainEqual(summary);
    const a = buildPremadeProject(summary.id);
    const b = buildPremadeProject(summary.id);
    expect(a).toEqual(b);
    const decoded = decodeProject(encodeProject(a));
    const map = decoded.levels[0];
    expect(map.tiles).toEqual(a.levels[0].tiles);
    expect(getTheme(map.meta.theme!).id).toBe(summary.themeId);
    expect(map.meta.width).toBe(24); expect(map.meta.height).toBe(24);
    for (const stamp of map.stamps!) expect(getStampDef(stamp.stampId), stamp.stampId).toBeDefined();
    for (const token of map.tokens!) {
      expect(ICON_BY_ID.has(token.icon!) || FOLIO_TOKEN_BY_ID.has(token.icon!), token.icon).toBe(true);
    }
    const publicMap = projectForAudience(map).map;
    expect(publicMap.notes).toHaveLength(2);
    expect(publicMap.tokens!.every(token => !token.hidden)).toBe(true);
    const serialized = JSON.stringify(publicMap);
    for (const note of map.notes) expect(serialized).not.toContain(note.description);
    for (const token of map.tokens!.filter(token => token.hidden)) expect(serialized).not.toContain(token.label);
    a.levels[0].tiles[0][0].type = 'treasure';
    a.levels[0].notes[0].description = 'Changed';
    a.levels[0].stamps![0].rotation = 42;
    expect(b).toEqual(buildLaunchSample(summary.id));
  });

  it.each(LAUNCH_SAMPLES)('$id connects all walkable spaces, notes and token positions to arrival', summary => {
    const map = buildLaunchSample(summary.id).levels[0];
    const party = map.tokens!.find(token => token.kind === 'player')!;
    const pending = [[party.x, party.y]];
    const visited = new Set<string>();
    while (pending.length) {
      const [x, y] = pending.pop()!;
      const key = `${x},${y}`;
      const tile = map.tiles[y]?.[x];
      if (!tile || visited.has(key) || ['background', 'empty', 'wall', 'water', 'pillar'].includes(tile.type)) continue;
      visited.add(key);
      pending.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    for (const item of [...map.notes, ...map.tokens!]) {
      expect(visited.has(`${item.x},${item.y}`), `${summary.id}: ${item.x},${item.y}`).toBe(true);
    }
    map.tiles.forEach((row, y) => row.forEach((tile, x) => {
      if (!['background', 'empty', 'wall', 'water', 'pillar'].includes(tile.type)) {
        expect(visited.has(`${x},${y}`), `Isolated ${tile.type} at ${x},${y}`).toBe(true);
      }
    }));
  });
});
