import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MapCanvas from '../MapCanvas';
import { createDefaultMap } from '../../hooks/mapStateUtils';

class TestPointerEvent extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(type: string, init: PointerEventInit) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? 'mouse';
  }
}
function props(): ComponentProps<typeof MapCanvas> {
  return {
    map: createDefaultMap('Gestures'), activeTool: 'paint', activeTile: 'floor', themeId: 'dungeon',
    printMode: false, viewMode: 'gm', gmShowFog: false, selectedNoteId: null,
    drawColor: '#ff0000', drawWidth: 1, gmDrawColor: '#ff0000', gmDrawWidth: 1,
    markerShape: 'circle', markerColor: '#ff0000', markerSize: 1,
    onSetTile: vi.fn(), onSetTiles: vi.fn(), onFillTile: vi.fn(), onAddNote: vi.fn(), onSelectNote: vi.fn(),
    onEraseTiles: vi.fn(), onSetFogCells: vi.fn(), onAddToken: vi.fn(), onMoveToken: vi.fn(), onRemoveToken: vi.fn(),
    onAddAnnotation: vi.fn(), onRemoveAnnotation: vi.fn(), onAddMarker: vi.fn(), onRemoveMarker: vi.fn(),
    onMoveStamp: vi.fn(), onUpdateRiver: vi.fn(), onAddRoomShape: vi.fn(), onUpdateRoomShape: vi.fn(),
    onAddRiver: vi.fn(), onUndo: vi.fn(),
  };
}
const pointer = (canvas: HTMLElement, type: string, x: number, y: number, pointerType = 'mouse', pointerId = 1) =>
  fireEvent(canvas, new TestPointerEvent(type, { bubbles: true, clientX: x * 20 + 5, clientY: y * 20 + 5, pointerType, pointerId }));

describe('canvas gesture commit boundaries', () => {
  beforeEach(() => {
    vi.stubGlobal('PointerEvent', TestPointerEvent);
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, width: 640, height: 640, left: 0, top: 0, right: 640, bottom: 640, toJSON() {},
    });
    HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
    HTMLCanvasElement.prototype.releasePointerCapture = vi.fn();
    HTMLCanvasElement.prototype.hasPointerCapture = () => true;
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it.each(['mouse', 'touch', 'pen'])('groups a %s paint stroke and interpolates skipped cells', type => {
    const p = props();
    render(<MapCanvas {...p} />);
    const canvas = screen.getByRole('application');
    pointer(canvas, 'pointermove', 0, 0, type);
    pointer(canvas, 'pointerdown', 1, 1, type);
    pointer(canvas, 'pointermove', 4, 1, type);
    expect(p.onSetTiles).not.toHaveBeenCalled();
    expect(p.onSetTile).not.toHaveBeenCalled();
    pointer(canvas, 'pointerup', 4, 1, type);
    expect(p.onSetTiles).toHaveBeenCalledExactlyOnceWith([1, 2, 3, 4].map(x => ({ x, y: 1, type: 'floor' })));
  });
  it.each(['pointercancel', 'Escape', 'resize', 'blur', 'tool-change', 'wheel-pan', 'keyboard-pan', 'history-change'])('discards a paint preview after %s and accepts a fresh stroke', interruption => {
    const p = props();
    const { rerender } = render(<MapCanvas {...p} />);
    const canvas = screen.getByRole('application');
    pointer(canvas, 'pointerdown', 1, 1);
    pointer(canvas, 'pointermove', 3, 1);
    if (interruption === 'pointercancel') pointer(canvas, 'pointercancel', 3, 1);
    else if (interruption === 'wheel-pan') fireEvent.wheel(canvas, { shiftKey: true, deltaY: 20 });
    else if (interruption === 'keyboard-pan') fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    else if (interruption === 'Escape') fireEvent.keyDown(window, { key: 'Escape' });
    else if (interruption === 'tool-change') rerender(<MapCanvas {...p} activeTool="erase" />);
    else if (interruption === 'history-change') rerender(<MapCanvas {...p} map={{ ...p.map, tokens: [] }} />);
    else fireEvent(window, new Event(interruption));
    pointer(canvas, 'pointerup', 3, 1);
    expect(p.onSetTile).not.toHaveBeenCalled();
    expect(p.onSetTiles).not.toHaveBeenCalled();
    rerender(<MapCanvas {...p} />);
    pointer(canvas, 'pointerdown', 2, 2);
    pointer(canvas, 'pointerup', 2, 2);
    expect(p.onSetTile).toHaveBeenCalledTimes(1);
  });
  it('interpolates from the last visited cell after retracing a stroke', () => {
    const p = props();
    render(<MapCanvas {...p} />);
    const canvas = screen.getByRole('application');
    pointer(canvas, 'pointerdown', 1, 1);
    pointer(canvas, 'pointermove', 4, 1);
    pointer(canvas, 'pointermove', 1, 1);
    pointer(canvas, 'pointermove', 1, 4);
    pointer(canvas, 'pointerup', 1, 4);
    expect(p.onSetTiles).toHaveBeenCalledExactlyOnceWith([
      ...[1, 2, 3, 4].map(x => ({ x, y: 1, type: 'floor' })),
      ...[2, 3, 4].map(y => ({ x: 1, y, type: 'floor' })),
    ]);
  });
  it('retains polygon vertices while moving to the visible completion control', () => {
    const p = props();
    render(<MapCanvas {...p} activeTool="room-poly" />);
    const canvas = screen.getByRole('application');
    for (const [x, y] of [[1, 1], [4, 1], [4, 4]]) {
      pointer(canvas, 'pointerdown', x, y);
      pointer(canvas, 'pointerup', x, y);
    }
    HTMLCanvasElement.prototype.hasPointerCapture = () => false;
    fireEvent.pointerOut(canvas, { pointerId: 1 });
    expect(screen.getByRole('button', { name: 'Finish polygon' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Finish polygon' }));
    expect(p.onAddRoomShape).toHaveBeenCalledTimes(1);
  });
  it('ignores initial resize observation but cancels on a real canvas size change', () => {
    let resize!: (entries: { contentRect: { width: number; height: number } }[]) => void;
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: typeof resize) { resize = callback; }
      observe() {}
      disconnect() {}
    });
    const p = props();
    render(<MapCanvas {...p} />);
    const canvas = screen.getByRole('application');
    pointer(canvas, 'pointerdown', 1, 1, 'pen');
    act(() => resize([{ contentRect: { width: 640, height: 640 } }]));
    pointer(canvas, 'pointerup', 1, 1, 'pen');
    expect(p.onSetTile).toHaveBeenCalledTimes(1);
    pointer(canvas, 'pointerdown', 2, 2, 'pen');
    act(() => resize([{ contentRect: { width: 600, height: 640 } }]));
    pointer(canvas, 'pointerup', 2, 2, 'pen');
    expect(p.onSetTile).toHaveBeenCalledTimes(1);
  });
  it.each(['move-token', 'move-stamp', 'river'] as const)('stages %s moves and commits only once', activeTool => {
    const p = props();
    p.map.tokens = [{ id: 1, x: 1, y: 1, kind: 'player', label: 'A' }];
    p.map.stamps = [{ id: 1, stampId: 'unknown-test', x: 1, y: 1, rotation: 0, scale: 1, opacity: 1, flipX: false, flipY: false }];
    p.map.rivers = [{ id: 1, controlPoints: [{ x: 1.25, y: 1.25 }, { x: 5, y: 5 }], width: 1, type: 'water', flowDirection: 45 }];
    render(<MapCanvas {...p} activeTool={activeTool} />);
    const canvas = screen.getByRole('application');
    pointer(canvas, 'pointerdown', 1, 1);
    pointer(canvas, 'pointermove', 2, 2);
    pointer(canvas, 'pointermove', 3, 3);
    const callback = activeTool === 'move-token' ? p.onMoveToken : activeTool === 'move-stamp' ? p.onMoveStamp : p.onUpdateRiver;
    expect(callback).not.toHaveBeenCalled();
    pointer(canvas, 'pointerup', 3, 3);
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it('does not place a discrete object or commit defog on cancellation', () => {
    const p = props();
    const { rerender } = render(<MapCanvas {...p} activeTool="note" />);
    const canvas = screen.getByRole('application');
    pointer(canvas, 'pointerdown', 1, 1);
    pointer(canvas, 'pointercancel', 1, 1);
    pointer(canvas, 'pointerup', 1, 1);
    expect(p.onAddNote).not.toHaveBeenCalled();
    rerender(<MapCanvas {...p} viewMode="player" activeTool="defog" />);
    pointer(canvas, 'pointerdown', 1, 1, 'touch');
    pointer(canvas, 'pointermove', 3, 1, 'touch');
    pointer(canvas, 'pointercancel', 3, 1, 'touch');
    pointer(canvas, 'pointerup', 3, 1, 'touch');
    expect(p.onSetFogCells).not.toHaveBeenCalled();
  });
  it('abandons room geometry when a second touch starts navigation', () => {
    const p = props();
    render(<MapCanvas {...p} activeTool="room-rect" />);
    const canvas = screen.getByRole('application');
    pointer(canvas, 'pointerdown', 1, 1, 'touch', 1);
    pointer(canvas, 'pointermove', 3, 3, 'touch', 1);
    pointer(canvas, 'pointerdown', 5, 5, 'touch', 2);
    pointer(canvas, 'pointermove', 7, 7, 'touch', 2);
    pointer(canvas, 'pointerup', 7, 7, 'touch', 2);
    pointer(canvas, 'pointerup', 3, 3, 'touch', 1);
    expect(p.onAddRoomShape).not.toHaveBeenCalled();
    expect(p.onUndo).not.toHaveBeenCalled();
    pointer(canvas, 'pointerdown', 2, 2);
    pointer(canvas, 'pointermove', 4, 4);
    pointer(canvas, 'pointerup', 4, 4);
    expect(p.onAddRoomShape).toHaveBeenCalledTimes(1);
  });
});
