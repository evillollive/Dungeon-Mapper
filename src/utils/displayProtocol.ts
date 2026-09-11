import type { PlayerProjection } from './audienceProjection';

export const DISPLAY_VERSION = 1;
export const DISPLAY_LEASE_MS = 5000;
export type DisplayMessage =
  | { version: 1; sessionId: string; displayId: string; clientId: string; type: 'hello' | 'heartbeat' }
  | { version: 1; sessionId: string; displayId: string; clientId: string; type: 'ack'; revision: number }
  | { version: 1; sessionId: string; displayId: string; clientId: string; type: 'blank'; revision: number; epoch: string }
  | { version: 1; sessionId: string; displayId: string; clientId: string; type: 'snapshot'; revision: number; epoch: string; projection: PlayerProjection };

export interface DisplayState {
  revision: number;
  epoch: string | null;
  projection: PlayerProjection | null;
}
export const blankDisplay = (): DisplayState => ({ revision: -1, epoch: null, projection: null });
export const displayChannel = (sessionId: string, displayId: string) => `dungeon-display-v1:${sessionId}:${displayId}`;

export function isDisplayMessage(raw: unknown): raw is DisplayMessage {
  if (typeof raw !== 'object' || raw === null) return false;
  const m = raw as Record<string, unknown>;
  if (m.version !== 1 || !['sessionId', 'displayId', 'clientId'].every(k => typeof m[k] === 'string' && m[k] !== '')) return false;
  if (m.type === 'hello' || m.type === 'heartbeat') return true;
  if (!Number.isSafeInteger(m.revision) || Number(m.revision) < 0) return false;
  if (m.type === 'ack') return true;
  if (typeof m.epoch !== 'string' || !m.epoch) return false;
  if (m.type === 'blank') return true;
  if (m.type !== 'snapshot' || typeof m.projection !== 'object' || m.projection === null) return false;
  const p = m.projection as Partial<PlayerProjection>;
  return p.version === 1 && p.audience === 'player' && !!p.map && Array.isArray(p.map.tiles) &&
    !!p.map.meta && Array.isArray(p.map.notes) && Array.isArray(p.customThemes) && Array.isArray(p.customStamps);
}

export function receiveDisplay(state: DisplayState, message: DisplayMessage,
  identity: { sessionId: string; displayId: string; clientId: string }): DisplayState {
  if (message.sessionId !== identity.sessionId || message.displayId !== identity.displayId ||
      message.clientId !== identity.clientId || !('revision' in message) || message.revision <= state.revision) return state;
  if (message.type === 'blank') return { revision: message.revision, epoch: message.epoch, projection: null };
  if (message.type !== 'snapshot' || state.epoch === null || message.epoch !== state.epoch) return state;
  return { ...state, revision: message.revision, projection: message.projection };
}
