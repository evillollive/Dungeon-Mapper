import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import PlayerPreview from './PlayerPreview';
import { blankDisplay, displayChannel, DISPLAY_LEASE_MS, isDisplayMessage, receiveDisplay, type DisplayMessage } from '../utils/displayProtocol';
import '../player-preview.css';
import '../session-workspace.css';

export default function LocalPlayerDisplay({ sessionId, displayId }: { sessionId: string; displayId: string }) {
  const [state, setState] = useState(blankDisplay);
  const current = useRef(state);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState('Display blank. Ask the DM to show a level.');
  useEffect(() => {
    if (!displayId || typeof BroadcastChannel === 'undefined') return;
    const identity = { sessionId, displayId, clientId: crypto.randomUUID() };
    const channel = new BroadcastChannel(displayChannel(sessionId, displayId));
    let lastSeen = Date.now();
    let expired = false;
    current.current = blankDisplay();
    const send = (type: 'hello' | 'heartbeat') => channel.postMessage({ ...identity, version: 1, type } satisfies DisplayMessage);
    send('hello');
    channel.onmessage = ({ data }: MessageEvent<unknown>) => {
      if (expired || !isDisplayMessage(data) || data.sessionId !== sessionId || data.displayId !== displayId ||
          data.clientId !== identity.clientId || data.type === 'hello' || data.type === 'ack') return;
      if (Date.now() - lastSeen > DISPLAY_LEASE_MS) { disconnect(); return; }
      lastSeen = Date.now();
      const next = receiveDisplay(current.current, data, identity);
      if (next !== current.current) {
        current.current = next;
        // A blank removes the old canvas before another queued snapshot is handled.
        flushSync(() => { setState(next); setMessage('Display paused. Waiting for the DM.'); });
        channel.postMessage({ ...identity, version: 1, type: 'ack', revision: next.revision } satisfies DisplayMessage);
      }
    };
    const disconnect = () => {
      expired = true;
      current.current = blankDisplay();
      flushSync(() => {
        setState(current.current);
        setMessage('Disconnected and blank. Reconnect here, or ask the DM to reopen this display.');
      });
    };
    const timer = window.setInterval(() => {
      if (expired) return;
      if (Date.now() - lastSeen > DISPLAY_LEASE_MS) disconnect();
      else send(current.current.epoch === null ? 'hello' : 'heartbeat');
    }, 1000);
    window.addEventListener('pagehide', disconnect);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', disconnect);
      channel.close();
    };
  }, [sessionId, displayId, attempt]);
  if (state.projection) return <div className="player-preview-host"><PlayerPreview projection={state.projection} /></div>;
  return <main className="display-neutral">
    <p className="session-eyebrow">LOCAL PLAYER DISPLAY</p>
    <h1>Waiting at the table</h1>
    <p role="status">{message}</p>
    {(!displayId || typeof BroadcastChannel === 'undefined') && <p role="alert">Local display is unavailable. Ask the DM to use the same-window player preview.</p>}
    <button type="button" onClick={() => { current.current = blankDisplay(); setState(current.current); setAttempt(a => a + 1); }}>Reconnect display</button>
    <p>This read-only window receives only the shared map. No online multiplayer.</p>
  </main>;
}
