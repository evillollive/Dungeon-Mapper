import { describe, expect, it } from 'vitest';
import { blankDisplay, isDisplayMessage, receiveDisplay, type DisplayMessage } from '../displayProtocol';
import { projectForAudience } from '../audienceProjection';
import { createDefaultProject } from '../../hooks/mapStateUtils';

const identity = { sessionId: 'session', displayId: 'display', clientId: 'client' };
const base = { ...identity, version: 1 as const };
const blank = (revision: number, epoch = 'epoch'): DisplayMessage => ({ ...base, type: 'blank', revision, epoch });
const snapshot = (revision: number, epoch = 'epoch'): DisplayMessage => ({
  ...base, type: 'snapshot', revision, epoch, projection: projectForAudience(createDefaultProject().levels[0]),
});
describe('projection-only local display protocol', () => {
  it('starts blank and refuses snapshots without a blank handshake', () => {
    expect(receiveDisplay(blankDisplay(), snapshot(5), identity).projection).toBeNull();
    const ready = receiveDisplay(blankDisplay(), blank(1), identity);
    expect(receiveDisplay(ready, snapshot(2), identity).projection?.audience).toBe('player');
  });
  it('ignores stale, reordered and wrong-identity packets', () => {
    const state = receiveDisplay(receiveDisplay(blankDisplay(), blank(1), identity), snapshot(4), identity);
    expect(receiveDisplay(state, snapshot(2), identity)).toBe(state);
    expect(receiveDisplay(state, blank(3), identity)).toBe(state);
    for (const key of ['sessionId', 'displayId', 'clientId'] as const) {
      expect(receiveDisplay(state, { ...snapshot(5), [key]: 'other' }, identity)).toBe(state);
    }
  });
  it('blank rotates the epoch so queued snapshots cannot flash even with a higher revision', () => {
    const state = receiveDisplay(receiveDisplay(blankDisplay(), blank(1), identity), snapshot(2), identity);
    const paused = receiveDisplay(state, blank(3, 'paused'), identity);
    expect(paused.projection).toBeNull();
    expect(receiveDisplay(paused, snapshot(4), identity)).toBe(paused);
    expect(receiveDisplay(paused, snapshot(5, 'paused'), identity).projection).not.toBeNull();
  });
  it('reload and disconnection require a fresh client handshake, not a cached snapshot', () => {
    expect(receiveDisplay(blankDisplay(), snapshot(7), { ...identity, clientId: 'reload' }).projection).toBeNull();
    expect(receiveDisplay(blankDisplay(), snapshot(8), identity).projection).toBeNull();
  });
  it('rejects foreign protocol versions and malformed envelopes', () => {
    expect(isDisplayMessage({ ...blank(1), version: 2 })).toBe(false);
    expect(isDisplayMessage({ ...blank(1), revision: -1 })).toBe(false);
    expect(isDisplayMessage({ ...snapshot(1), projection: { project: 'private' } })).toBe(false);
    expect(isDisplayMessage(snapshot(1))).toBe(true);
  });
  it('sends only the allowlisted audience projection, never source project or private fields', () => {
    const project = createDefaultProject();
    project.name = 'PRIVATE_SENTINEL';
    const map = project.levels[0];
    map.meta.name = 'PRIVATE_SENTINEL';
    map.notes = [{ id: 1, x: 0, y: 0, label: 'PRIVATE_SENTINEL', description: 'PRIVATE_SENTINEL' }];
    const packet = { ...snapshot(2), projection: projectForAudience(map) };
    expect(JSON.stringify(packet)).not.toContain('PRIVATE_SENTINEL');
    expect(packet).not.toHaveProperty('project');
  });
});
