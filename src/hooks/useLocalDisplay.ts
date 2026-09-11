import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayerProjection } from '../utils/audienceProjection';
import { displayChannel, DISPLAY_LEASE_MS, isDisplayMessage, type DisplayMessage } from '../utils/displayProtocol';

export function useLocalDisplay(sessionId: string) {
  const [displayId] = useState(() => crypto.randomUUID());
  const [status, setStatus] = useState('Not connected. Open the player display.');
  const [guidance, setGuidance] = useState('');
  const [live, setLive] = useState(false);
  const connection = useRef<{
    channel: BroadcastChannel; clientId: string; epoch: string; revision: number;
    lastSeen: number; lastAck: number; pendingSince: number; live: boolean;
  } | null>(null);
  const send = useCallback((projection?: PlayerProjection) => {
    const c = connection.current;
    if (!c?.clientId) return;
    c.revision++;
    if (!c.pendingSince) c.pendingSince = Date.now();
    const base = { version: 1 as const, sessionId, displayId, clientId: c.clientId, revision: c.revision, epoch: c.epoch };
    const message: DisplayMessage = projection ? { ...base, type: 'snapshot', projection } : { ...base, type: 'blank' };
    c.channel.postMessage(message);
  }, [sessionId, displayId]);
  const pause = useCallback(() => {
    const c = connection.current;
    if (c) {
      c.live = false;
      c.epoch = crypto.randomUUID();
      send();
    }
    setLive(false);
    setStatus(c?.clientId ? 'Blank requested. Waiting for display acknowledgement.' : 'Display blank. Open or reconnect the player window.');
  }, [send]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(displayChannel(sessionId, displayId));
    const c = { channel, clientId: '', epoch: crypto.randomUUID(), revision: 0, lastSeen: 0, lastAck: 0, pendingSince: 0, live: false };
    connection.current = c;
    channel.onmessage = ({ data }: MessageEvent<unknown>) => {
      if (!isDisplayMessage(data) || data.sessionId !== sessionId || data.displayId !== displayId) return;
      if (data.type === 'hello') {
        setGuidance('');
        c.lastSeen = Date.now();
        if (c.clientId !== data.clientId) {
          c.clientId = data.clientId;
          c.pendingSince = 0;
          pause();
        } else if (!c.live) send();
      } else if (data.clientId === c.clientId && (data.type === 'ack' || data.type === 'heartbeat')) {
        c.lastSeen = Date.now();
        if (data.type === 'ack' && data.revision === c.revision && data.revision > c.lastAck) {
          c.lastAck = data.revision;
          c.pendingSince = 0;
          setStatus(c.live ? `Live. Display acknowledged revision ${c.lastAck}.` : 'Connected and blank. Choose Show this level.');
        }
      }
    };
    const timer = window.setInterval(() => {
      if (!c.clientId) return;
      if (Date.now() - c.lastSeen > DISPLAY_LEASE_MS || (c.pendingSince && Date.now() - c.pendingSince > DISPLAY_LEASE_MS)) {
        pause();
        c.clientId = '';
        c.pendingSince = 0;
        setStatus('Disconnected. Display will blank. Reopen the player display, then Show this level.');
      } else {
        channel.postMessage({ version: 1, sessionId, displayId, clientId: c.clientId, type: 'heartbeat' } satisfies DisplayMessage);
      }
    }, 1000);
    const leave = () => { c.live = false; c.epoch = crypto.randomUUID(); send(); };
    window.addEventListener('pagehide', leave);
    return () => {
      leave();
      window.clearInterval(timer);
      window.removeEventListener('pagehide', leave);
      channel.close();
      connection.current = null;
    };
  }, [sessionId, displayId, pause, send]);

  const publish = useCallback((projection: PlayerProjection, explicitly = false) => {
    const c = connection.current;
    if (!c?.clientId || Date.now() - c.lastSeen > DISPLAY_LEASE_MS) {
      if (explicitly) setStatus('No connected display. Open it first, or use Player preview.');
      return;
    }
    if (!explicitly && !c.live) return;
    c.live = true;
    setLive(true);
    send(projection);
    setStatus('Publishing. Waiting for display acknowledgement.');
  }, [send]);

  const open = useCallback(() => {
    pause();
    setGuidance('');
    if (typeof BroadcastChannel === 'undefined') {
      setGuidance('This browser has no local display transport. Use Player preview in this window.');
      return;
    }
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('player', sessionId);
    url.searchParams.set('display', displayId);
    const popup = window.open(url, `dungeon-player-${sessionId}`);
    if (!popup) setGuidance('Popup blocked. Allow popups for this site and choose Open player display again, or use Player preview.');
  }, [sessionId, displayId, pause]);
  return { open, pause, publish, live, status: guidance || status };
}
