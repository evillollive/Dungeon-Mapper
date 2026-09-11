import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocalDisplay } from '../useLocalDisplay';
import LocalPlayerDisplay from '../../components/LocalPlayerDisplay';
import { DISPLAY_LEASE_MS, type DisplayMessage } from '../../utils/displayProtocol';
import { createDefaultProject } from '../mapStateUtils';
import { projectForAudience } from '../../utils/audienceProjection';

vi.mock('../../components/PlayerPreview', () => ({
  default: () => <div>Projected player content</div>,
}));

class Channel {
  static instances: Channel[] = [];
  messages: DisplayMessage[] = [];
  onmessage?: (event: MessageEvent<unknown>) => void;
  constructor() { Channel.instances.push(this); }
  postMessage(message: DisplayMessage) { this.messages.push(message); }
  close() {}
  receive(message: DisplayMessage) { this.onmessage?.({ data: message } as MessageEvent<unknown>); }
}
const projection = projectForAudience(createDefaultProject().levels[0]);
const identity = { version: 1 as const, sessionId: 's', displayId: 'd', clientId: 'c' };

describe('local display connection lifecycle', () => {
  beforeEach(() => { Channel.instances = []; vi.useFakeTimers(); vi.stubGlobal('BroadcastChannel', Channel); });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('retains actionable popup-blocked guidance when a blank acknowledgement arrives', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const { result } = renderHook(() => useLocalDisplay('s'));
    const channel = Channel.instances[0];
    act(() => result.current.open());
    expect(result.current.status).toMatch(/Popup blocked/);
    // Obtain the generated display identity from the requested URL.
    const url = new URL(String(vi.mocked(window.open).mock.calls[0][0]));
    const hello = { ...identity, displayId: url.searchParams.get('display')!, type: 'hello' as const };
    act(() => channel.receive(hello));
    act(() => result.current.open());
    const blank = channel.messages.at(-1)!;
    act(() => channel.receive({ ...hello, type: 'ack', revision: 'revision' in blank ? blank.revision : 0 }));
    expect(result.current.status).toMatch(/Popup blocked/);
  });

  it('requires explicit show after connection and drops automatic publishes after pause', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const { result } = renderHook(() => useLocalDisplay('s'));
    act(() => result.current.open());
    const url = new URL(String(vi.mocked(window.open).mock.calls[0][0]));
    const channel = Channel.instances[0];
    act(() => channel.receive({ ...identity, displayId: url.searchParams.get('display')!, type: 'hello' }));
    act(() => result.current.publish(projection));
    expect(channel.messages.some(m => m.type === 'snapshot')).toBe(false);
    act(() => result.current.publish(projection, true));
    expect(result.current.live).toBe(true);
    act(() => result.current.pause());
    const length = channel.messages.length;
    act(() => result.current.publish(projection));
    expect(channel.messages).toHaveLength(length);
    expect(result.current.live).toBe(false);
    expect(channel.messages.at(-1)?.type).toBe('blank');
  });

  it('expires a silent host and cannot flash an old snapshot when its timer was throttled', () => {
    render(<LocalPlayerDisplay sessionId="s" displayId="d" />);
    const channel = Channel.instances[0];
    const hello = channel.messages[0];
    const base = { ...hello, epoch: 'e' };
    act(() => channel.receive({ ...base, type: 'blank', revision: 1 }));
    act(() => channel.receive({ ...base, type: 'snapshot', revision: 2, projection }));
    expect(screen.getByText('Projected player content')).toBeInTheDocument();
    // Advance wall time without running timers, as a suspended browser may do.
    vi.setSystemTime(Date.now() + DISPLAY_LEASE_MS + 1);
    act(() => channel.receive({ ...base, type: 'snapshot', revision: 3, projection }));
    expect(screen.queryByText('Projected player content')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Disconnected and blank');
    act(() => channel.receive({ ...base, type: 'snapshot', revision: 4, projection }));
    expect(screen.queryByText('Projected player content')).not.toBeInTheDocument();
  });

  it('blanks on lease timeout and reconnect starts a different client identity', () => {
    render(<LocalPlayerDisplay sessionId="s" displayId="d" />);
    const channel = Channel.instances[0];
    const hello = channel.messages[0];
    act(() => channel.receive({ ...hello, type: 'blank', epoch: 'e', revision: 1 }));
    act(() => channel.receive({ ...hello, type: 'snapshot', epoch: 'e', revision: 2, projection }));
    act(() => vi.advanceTimersByTime(DISPLAY_LEASE_MS + 1000));
    expect(screen.queryByText('Projected player content')).not.toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'Reconnect display' }).click());
    expect(Channel.instances[1].messages[0].clientId).not.toBe(hello.clientId);
    expect(screen.queryByText('Projected player content')).not.toBeInTheDocument();
  });
});
