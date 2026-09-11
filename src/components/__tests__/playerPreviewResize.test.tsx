import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PlayerPreview from '../PlayerPreview';
import { projectForAudience } from '../../utils/audienceProjection';
import { audienceFixture } from '../../test/audienceFixture';
import { renderPlayerProjection } from '../../utils/renderMap';

vi.mock('../../utils/renderMap', () => ({ renderPlayerProjection: vi.fn() }));

describe('player preview resize scheduling', () => {
  const frames = new Map<number, FrameRequestCallback>();
  const disconnect = vi.fn();
  let notifyResize: () => void;
  let width: number;
  let nextFrame: number;
  const projection = () => projectForAudience(audienceFixture().levels[0]);
  const flushFrame = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    act(() => callbacks.forEach(callback => callback(0)));
  };

  beforeEach(() => {
    width = 300;
    nextFrame = 0;
    frames.clear();
    disconnect.mockClear();
    vi.stubGlobal('innerHeight', 1000);
    vi.stubGlobal('devicePixelRatio', 1);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.stubGlobal('ResizeObserver', class implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        notifyResize = () => callback([], this);
      }
      observe() {}
      unobserve() {}
      disconnect = disconnect;
    });
    vi.mocked(renderPlayerProjection).mockReset().mockImplementation((value, options) => {
      const canvas = document.createElement('canvas');
      canvas.width = value.map.meta.width * options.tileSize;
      canvas.height = value.map.meta.height * options.tileSize;
      return canvas;
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('coalesces observer notifications outside layout delivery and skips self-induced resizes', () => {
    render(<PlayerPreview projection={projection()} />);
    expect(renderPlayerProjection).toHaveBeenCalledTimes(1);
    width = 400;
    act(() => { notifyResize(); notifyResize(); window.dispatchEvent(new Event('resize')); });
    expect(renderPlayerProjection).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(1);
    flushFrame();
    expect(renderPlayerProjection).toHaveBeenCalledTimes(2);
    act(() => notifyResize());
    flushFrame();
    expect(renderPlayerProjection).toHaveBeenCalledTimes(2);
    vi.stubGlobal('innerHeight', 400);
    fireEvent(window, new Event('resize'));
    flushFrame();
    expect(renderPlayerProjection).toHaveBeenCalledTimes(3);
  });

  it('redraws changed projections, zoom and pixel density even with the same viewport width', () => {
    const original = projection();
    const { rerender } = render(<PlayerPreview projection={original} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in', exact: true }));
    expect(renderPlayerProjection).toHaveBeenCalledTimes(2);
    const revised = { ...original, map: { ...original.map, notes: [] } };
    rerender(<PlayerPreview projection={revised} />);
    expect(renderPlayerProjection).toHaveBeenLastCalledWith(revised, expect.any(Object));
    expect(renderPlayerProjection).toHaveBeenCalledTimes(3);
    vi.stubGlobal('devicePixelRatio', 2);
    fireEvent(window, new Event('resize'));
    flushFrame();
    expect(renderPlayerProjection).toHaveBeenCalledTimes(4);
  });

  it('cancels stale frames on projection changes and unmount', () => {
    const { rerender, unmount } = render(<PlayerPreview projection={projection()} />);
    act(() => notifyResize());
    expect(frames.size).toBe(1);
    rerender(<PlayerPreview projection={projection()} />);
    expect(frames.size).toBe(0);
    act(() => notifyResize());
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(2);
    expect(frames.size).toBe(0);
    fireEvent(window, new Event('resize'));
    expect(frames.size).toBe(0);
  });
});
