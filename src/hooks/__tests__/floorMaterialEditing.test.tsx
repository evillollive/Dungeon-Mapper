import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMapState } from '../useMapState';
import FloorMaterialPicker from '../../components/FloorMaterialPicker';
import { deriveRenderableTiles } from '../../utils/derivedRenderMap';

describe('floor finish authoring', () => {
  it('offers labeled finish choices and an explicit return to flagstone', () => {
    const onChange = vi.fn();
    render(<FloorMaterialPicker value="folio-worn-wood-v1" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Worn wood floor' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Earth floor' }));
    expect(onChange).toHaveBeenLastCalledWith('folio-earth-v1');
    fireEvent.click(screen.getByRole('button', { name: 'Flagstone floor' }));
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('paints, undoes, redoes, copies and erases finishes through the existing editor actions', () => {
    const { result } = renderHook(() => useMapState());
    act(() => result.current.setTheme('dungeon-folio-v1'));
    act(() => result.current.setActiveFloorMaterial('folio-worn-wood-v1'));
    act(() => result.current.setTile(2, 2, 'floor'));
    expect(result.current.map.tiles[2][2]).toMatchObject({ type: 'floor', floorMaterial: 'folio-worn-wood-v1' });
    act(() => result.current.undo());
    expect(result.current.map.tiles[2][2].type).toBe('empty');
    act(() => result.current.redo());
    expect(result.current.map.tiles[2][2].floorMaterial).toBe('folio-worn-wood-v1');
    act(() => result.current.copySelection({ x: 2, y: 2, w: 1, h: 1 }));
    act(() => result.current.pasteClipboard(4, 4));
    expect(result.current.map.tiles[4][4].floorMaterial).toBe('folio-worn-wood-v1');
    act(() => result.current.setActiveFloorMaterial(undefined));
    act(() => result.current.setTile(4, 4, 'floor'));
    expect(result.current.map.tiles[4][4].floorMaterial).toBeUndefined();
    act(() => result.current.setTile(2, 2, 'empty'));
    expect(result.current.map.tiles[2][2].floorMaterial).toBeUndefined();
  });

  it('fills room-derived floors as one undoable finish edit without changing the room', () => {
    const { result } = renderHook(() => useMapState());
    act(() => result.current.setTheme('dungeon-folio-v1'));
    act(() => result.current.addRoomShape({ x: 1, y: 1, width: 6, height: 6, fillTile: 'floor' }));
    const rooms = result.current.map.roomShapes;
    const base = result.current.map.tiles;
    act(() => result.current.setActiveFloorMaterial('folio-earth-v1'));
    act(() => result.current.fillTiles(3, 3, 'floor'));
    expect(result.current.map.roomShapes).toBe(rooms);
    expect(deriveRenderableTiles(result.current.map)[3][3].floorMaterial).toBe('folio-earth-v1');
    expect(result.current.map.tiles.map(row => row.map(tile => tile.type))).toEqual(base.map(row => row.map(tile => tile.type)));
    const unchanged = result.current.project;
    act(() => result.current.fillTiles(3, 3, 'floor'));
    expect(result.current.project).toBe(unchanged);
    act(() => result.current.undo());
    expect(deriveRenderableTiles(result.current.map)[3][3].floorMaterial).toBeUndefined();
    expect(result.current.map.roomShapes).toBe(rooms);
  });

  it('does not add a selected Folio finish when painting under another theme', () => {
    const { result } = renderHook(() => useMapState());
    act(() => result.current.setTheme('dungeon-folio-v1'));
    act(() => result.current.setActiveFloorMaterial('folio-earth-v1'));
    act(() => result.current.setTheme('starship'));
    act(() => result.current.setTiles([{ x: 1, y: 1, type: 'floor' }, { x: 2, y: 1, type: 'floor' }]));
    expect(result.current.map.tiles[1][1].floorMaterial).toBeUndefined();
    expect(result.current.map.tiles[1][2].floorMaterial).toBeUndefined();
  });
});
