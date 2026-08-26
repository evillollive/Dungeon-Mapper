import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MapCanvas from '../MapCanvas';
import { createDefaultMap } from '../../hooks/mapStateUtils';

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
});
