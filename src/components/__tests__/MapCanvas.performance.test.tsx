import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MapCanvas from '../MapCanvas';
import { createDefaultMap } from '../../hooks/mapStateUtils';
import { EdgeBlendCache } from '../../utils/edgeBlend';

const EMPTY_ARRAY = [] as const;
const noop = () => {};
const noopReturnNull = () => null;

function mapCanvasProps(): React.ComponentProps<typeof MapCanvas> {
  const map = createDefaultMap('Perf');
  map.notes = [{ id: 1, x: 1, y: 1, label: 'Hidden', description: '' }];
  map.tokens = [{ id: 1, kind: 'monster', x: 2, y: 2, label: 'Hidden monster' }];
  map.initiative = [1];

  return {
    map,
    activeTool: 'paint',
    activeTile: 'floor',
    themeId: 'dungeon',
    customThemes: EMPTY_ARRAY,
    customStamps: EMPTY_ARRAY,
    printMode: false,
    viewMode: 'player',
    gmShowFog: false,
    selectedNoteId: null,
    selectedTokenId: null,
    drawColor: '#ff0000',
    drawWidth: 2,
    gmDrawColor: '#00ff00',
    gmDrawWidth: 2,
    onSetTile: noop,
    onSetTiles: noop,
    onFillTile: noop,
    onAddNote: noop,
    onSelectNote: noop,
    onEraseTiles: noop,
    onSetFogCells: noop,
    onAddToken: noopReturnNull,
    onMoveToken: noop,
    onRemoveToken: noop,
    onAddAnnotation: noop,
    onRemoveAnnotation: noop,
    onAddMarker: noopReturnNull,
    onRemoveMarker: noop,
    markerShape: 'circle',
    markerColor: '#ff0000',
    markerSize: 1,
  };
}

describe('MapCanvas render performance', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not redraw the main canvas on unchanged player fog rerenders', async () => {
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    const props = mapCanvasProps();
    const { rerender } = render(<MapCanvas {...props} />);

    await waitFor(() => expect(getContextSpy).toHaveBeenCalledTimes(2));

    rerender(<MapCanvas {...props} />);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(getContextSpy).toHaveBeenCalledTimes(2);
  });

  it('retains edge strips for token and fog edits and frees them on unmount', () => {
    const prepare = vi.spyOn(EdgeBlendCache.prototype, 'prepare');
    const clear = vi.spyOn(EdgeBlendCache.prototype, 'clear');
    const props = mapCanvasProps();
    props.viewMode = 'gm';
    props.map.tiles[0][0] = { type: 'floor' };
    props.map.tiles[0][1] = { type: 'wall' };
    props.map.edgeBlend = { enabled: true, style: 'dither', intensity: 0.35, opacity: 0.6 };
    const { rerender, unmount } = render(<MapCanvas {...props} />);
    const cache = prepare.mock.contexts[0];
    expect(cache).toBeInstanceOf(EdgeBlendCache);
    expect(cache.stats.entries).toBeGreaterThan(0);
    const initial = cache.stats;
    clear.mockClear();
    rerender(<MapCanvas {...props} map={{ ...props.map,
      tokens: props.map.tokens?.map(token => ({ ...token, x: token.x + 1 })),
      fogEnabled: true, fog: props.map.tiles.map(row => row.map(() => true)),
    }} gmShowFog />);
    expect(clear).not.toHaveBeenCalled();
    expect(cache.stats.misses).toBe(initial.misses);
    expect(cache.stats.hits).toBeGreaterThan(initial.hits);
    unmount();
    expect(cache.stats).toMatchObject({ rasterBytes: 0, entries: 0 });
  });

  it.each(['project', 'dimensions', 'theme', 'custom themes', 'player', 'print', 'disabled'] as const)(
    'invalidates edge strips on %s changes',
    change => {
      const prepare = vi.spyOn(EdgeBlendCache.prototype, 'prepare');
      const clear = vi.spyOn(EdgeBlendCache.prototype, 'clear');
      const props = mapCanvasProps();
      props.viewMode = 'gm';
      props.map.tiles[0][0] = { type: 'floor' };
      props.map.tiles[0][1] = { type: 'wall' };
      props.map.edgeBlend = { enabled: true, style: 'dither', intensity: 0.35, opacity: 0.6 };
      const { rerender } = render(<MapCanvas {...props} viewportKey="first:0" />);
      const cache = prepare.mock.contexts[0];
      expect(cache.stats.rasterBytes).toBeGreaterThan(0);
      clear.mockClear();
      const next = { ...props, viewportKey: 'first:0' };
      if (change === 'project') next.viewportKey = 'second:0';
      if (change === 'dimensions') next.map = { ...props.map, meta: { ...props.map.meta, width: 8 } };
      if (change === 'theme') next.themeId = 'wilderness';
      if (change === 'custom themes') next.customThemes = [];
      if (change === 'player') next.viewMode = 'player';
      if (change === 'print') next.printMode = true;
      if (change === 'disabled') next.map = { ...props.map, edgeBlend: { ...props.map.edgeBlend, enabled: false } };
      rerender(<MapCanvas {...next} />);
      expect(clear).toHaveBeenCalled();
      if (change === 'print' || change === 'disabled') expect(cache.stats.rasterBytes).toBe(0);
    },
  );
});
