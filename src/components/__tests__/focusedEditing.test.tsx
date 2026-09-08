import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import SelectionInspector from '../SelectionInspector';
import StampPicker from '../StampPicker';
import LevelTabs from '../LevelTabs';
import { createDefaultMap } from '../../hooks/mapStateUtils';
import { useEditorSelection } from '../../hooks/useEditorSelection';
import { useCanvasDraft } from '../../hooks/useCanvasDraft';
import { moveRegionContents } from '../../utils/regionEditing';
import { readEditorViewport, writeEditorViewport } from '../../utils/editorViewport';
import { useMapState } from '../../hooks/useMapState';

function props(): ComponentProps<typeof SelectionInspector> {
  return {
    map: createDefaultMap('Editing'), themeId: 'dungeon', themeName: 'Dungeon',
    selectedPlacedStampId: null, selectedTokenId: null, selectedNoteId: null,
    stamps: [], tokens: [], notes: [], lightSources: [],
    onUpdateStamp: vi.fn(), onRemoveStamp: vi.fn(), onBringStampToFront: vi.fn(), onSendStampToBack: vi.fn(),
    onSelectPlacedStamp: vi.fn(), onUpdateToken: vi.fn(), onRemoveToken: vi.fn(), onSelectToken: vi.fn(),
    onUpdateNote: vi.fn(), onDeleteNote: vi.fn(), onSelectNote: vi.fn(), onRemoveLightSource: vi.fn(),
    onUpdateRoomShape: vi.fn(), onRemoveRoomShape: vi.fn(), onUpdateRiver: vi.fn(), onRemoveRiver: vi.fn(), onDeselect: vi.fn(),
  };
}

describe('focused editing contracts', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  it('keeps exactly one selection and clears it across scope changes, removal and resize', () => {
    const map = createDefaultMap('Scope');
    map.tokens = [{ id: 1, x: 0, y: 0, kind: 'player', label: 'A' }];
    map.notes = [{ id: 1, x: 0, y: 1, label: 'B', description: '' }];
    const { result, rerender } = renderHook(({ scope, map }) => useEditorSelection(scope, map), { initialProps: { scope: 'project:0:gm', map } });
    act(() => result.current.select({ kind: 'token', id: 1 }));
    act(() => result.current.select({ kind: 'note', id: 1 }));
    expect(result.current.selection).toEqual({ kind: 'note', id: 1 });
    rerender({ scope: 'project:1:gm', map });
    expect(result.current.selection).toBeNull();
    act(() => result.current.select({ kind: 'token', id: 1 }));
    rerender({ scope: 'project:1:gm', map: { ...map, tokens: [] } });
    rerender({ scope: 'project:1:gm', map });
    expect(result.current.selection).toBeNull();
    act(() => result.current.select({ kind: 'region', bounds: { x: 8, y: 8, w: 2, h: 2 } }));
    rerender({ scope: 'project:1:gm', map: { ...map, meta: { ...map.meta, width: 5 } } });
    expect(result.current.selection).toBeNull();
  });
  it('discards interrupted previews and commits only the latest move once', () => {
    const source = createDefaultMap('Draft');
    const commit = vi.fn();
    const { result } = renderHook(() => useCanvasDraft(source));
    act(() => result.current.stage('move', m => ({ ...m, meta: { ...m.meta, name: 'Preview' } }), commit));
    expect(result.current.map.meta.name).toBe('Preview');
    expect(commit).not.toHaveBeenCalled();
    act(() => result.current.cancel());
    expect(result.current.map).toBe(source);
    act(() => {
      result.current.stage('move', m => ({ ...m, meta: { ...m.meta, name: 'First' } }), () => commit('first'));
      result.current.stage('move', m => ({ ...m, meta: { ...m.meta, name: 'Last' } }), () => commit('last'));
    });
    act(() => result.current.finish());
    expect(commit).toHaveBeenCalledExactlyOnceWith('last');
  });
  it('applies a whole note edit once, cancels drafts and moves its tile reference with undo', () => {
    const p = props();
    p.notes = [{ id: 1, x: 1, y: 1, label: 'Old', description: '' }];
    p.selectedNoteId = 1;
    render(<SelectionInspector {...p} />);
    fireEvent.change(screen.getByLabelText('Note label'), { target: { value: 'Draft' } });
    expect(p.onUpdateNote).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByLabelText('Note label'), { key: 'Escape' });
    expect(screen.getByLabelText('Note label')).toHaveValue('Old');
    fireEvent.change(screen.getByLabelText('Note label'), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText('X'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(p.onUpdateNote).toHaveBeenCalledExactlyOnceWith(1, 'New', '', { x: 2, y: 1 });
    const { result } = renderHook(() => useMapState());
    let id = 0;
    act(() => { id = result.current.addNote(1, 1); });
    act(() => result.current.updateNote(id, 'Moved', 'Text', { x: 2, y: 2 }));
    expect(result.current.map.tiles[1][1].noteId).toBeUndefined();
    expect(result.current.map.tiles[2][2].noteId).toBe(id);
    act(() => result.current.undo());
    expect(result.current.map.notes[0]).toMatchObject({ x: 1, y: 1 });
    expect(result.current.map.tiles[1][1].noteId).toBe(id);
  });
  it('exposes room material/geometry and river point deletion without canvas gestures', () => {
    const p = props();
    p.map.roomShapes = [{ id: 1, x: 1, y: 1, width: 3, height: 3 }];
    p.map.rivers = [{ id: 1, controlPoints: [{ x: 1, y: 1 }, { x: 3, y: 3 }], width: 1, type: 'water', flowDirection: 45 }];
    const { rerender } = render(<SelectionInspector {...p} selectedRoomShapeId={1} />);
    fireEvent.change(screen.getByLabelText('Room shape'), { target: { value: 'circle' } });
    fireEvent.change(screen.getByLabelText('Room material'), { target: { value: 'water' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(p.onUpdateRoomShape).toHaveBeenCalledWith(1, expect.objectContaining({ shapeType: 'circle', fillTile: 'water' }));
    rerender(<SelectionInspector {...p} selectedRiverId={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove point 1' }));
    expect(p.onUpdateRiver).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(p.onUpdateRiver).toHaveBeenCalledWith(1, expect.objectContaining({ controlPoints: [{ x: 3, y: 3 }] }));
  });
  it('moves overlapping tile regions without changing IDs or unrelated objects', () => {
    const map = createDefaultMap('Region');
    map.tiles[1][1] = { type: 'floor', noteId: 1 };
    map.notes = [{ id: 1, x: 1, y: 1, label: 'Move', description: 'Keep' }];
    map.stamps = [{ id: 1, stampId: 'chair', x: 1, y: 1, rotation: 0, scale: 1, opacity: 1, flipX: false, flipY: false }];
    const moved = moveRegionContents(map, { x: 1, y: 1, w: 2, h: 2 }, 1, 0);
    expect(moved.tiles[1][1].type).toBe('empty');
    expect(moved.tiles[1][2]).toEqual(map.tiles[1][1]);
    expect(moved.notes[0]).toEqual({ ...map.notes[0], x: 2 });
    expect(moved.stamps?.[0]).toEqual({ ...map.stamps[0], x: 2 });
    expect(moveRegionContents(map, { x: 1, y: 1, w: 2, h: 2 }, -2, 0)).toBe(map);
  });
  it('accepts exact fractional river coordinates without rounding existing geometry', () => {
    const p = props();
    p.map.rivers = [{ id: 1, controlPoints: [{ x: 1 / 3, y: 5 / 6 }], width: 1, type: 'water', flowDirection: 0 }];
    render(<SelectionInspector {...p} selectedRiverId={1} />);
    fireEvent.change(screen.getByLabelText('River width'), { target: { value: '2' } });
    expect(screen.getByRole('form')).toBeValid();
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(p.onUpdateRiver).toHaveBeenCalledWith(1, expect.objectContaining({ controlPoints: p.map.rivers[0].controlPoints, width: 2 }));
  });
  it('preserves fractional and off-map polygon vertices during material edits', () => {
    const p = props();
    p.map.roomShapes = [{ id: 1, x: 8, y: 8, width: 40, height: 40, shapeType: 'polygon',
      vertices: [{ x: 8.5, y: 8 }, { x: 48, y: 8 }, { x: 48, y: 48 }], fillTile: 'floor' }];
    render(<SelectionInspector {...p} selectedRoomShapeId={1} />);
    fireEvent.change(screen.getByLabelText('Room material'), { target: { value: 'water' } });
    expect(screen.getByRole('form')).toBeValid();
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(p.onUpdateRoomShape).toHaveBeenCalledWith(1, { ...p.map.roomShapes[0], fillTile: 'water' });
  });
  it('searches custom assets alongside built-ins and retains favorites without changing the project', () => {
    const p: ComponentProps<typeof StampPicker> = {
      activeTool: 'stamp', selectedStampId: null, themeId: 'dungeon', onSetTool: vi.fn(), onSelectStamp: vi.fn(), onClearStamps: vi.fn(),
      customStamps: [{ id: 'custom-test', name: 'My Lantern', category: 'custom', viewBox: '0 0 1 1' }],
    };
    const { unmount } = render(<StampPicker {...p} />);
    fireEvent.change(screen.getByLabelText('Search stamps'), { target: { value: 'My Lantern' } });
    fireEvent.click(screen.getByRole('button', { name: 'Favorite My Lantern' }));
    unmount();
    render(<StampPicker {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Favorite stamps only' }));
    expect(screen.getByRole('button', { name: 'My Lantern', exact: true })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'My Lantern', exact: true }));
    expect(p.onSelectStamp).toHaveBeenCalledWith('custom-test');
  });
  it('retains only valid per-tab viewport preferences', () => {
    writeEditorViewport('project:0', { zoom: 0.1, pan: { x: 20, y: -50 } });
    expect(readEditorViewport('project:0')).toEqual({ zoom: 0.1, pan: { x: 20, y: -50 } });
    expect(readEditorViewport('other:0')).toBeNull();
    sessionStorage.setItem('dungeon-mapper:viewport:project:0', '{"zoom":100}');
    expect(readEditorViewport('project:0')).toBeNull();
  });
  it('groups token placement with its icon and provides independent move, edit and delete undo', () => {
    const { result } = renderHook(() => useMapState());
    let id = 0;
    act(() => { id = result.current.addToken('player', 1, 1, 'Scout', 1, 'warrior')!; });
    act(() => result.current.undo());
    expect(result.current.map.tokens).toEqual([]);
    expect(result.current.map.initiative).toEqual([]);
    act(() => result.current.redo());
    expect(result.current.map.tokens?.[0].icon).toBe('warrior');
    act(() => result.current.moveToken(id, 2, 2));
    act(() => result.current.undo());
    expect(result.current.map.tokens?.[0]).toMatchObject({ x: 1, y: 1 });
    act(() => result.current.updateToken(id, { label: 'Changed' }));
    act(() => result.current.undo());
    expect(result.current.map.tokens?.[0].label).toBe('Scout');
    act(() => result.current.removeToken(id));
    act(() => result.current.undo());
    expect(result.current.map.tokens?.[0].id).toBe(id);
    expect(result.current.map.initiative).toContain(id);
  });
  it.each(['annotations', 'markers', 'lightSources'] as const)('keeps %s placement and clear actions undoable', layer => {
    const { result } = renderHook(() => useMapState());
    act(() => {
      if (layer === 'annotations') result.current.addAnnotation({ kind: 'gm', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], color: '#ff0000', width: 1 });
      else if (layer === 'markers') result.current.addMarker('circle', 1, 1, '#ff0000', 1);
      else result.current.addLightSource(1, 1, 3, '#ffffff', 'Torch');
    });
    expect(result.current.map[layer]).toHaveLength(1);
    act(() => result.current.undo());
    expect(result.current.map[layer] ?? []).toHaveLength(0);
    act(() => result.current.redo());
    act(() => {
      if (layer === 'annotations') result.current.clearAnnotations();
      else if (layer === 'markers') result.current.clearMarkers();
      else result.current.clearLightSources();
    });
    expect(result.current.map[layer]).toHaveLength(0);
    act(() => result.current.undo());
    expect(result.current.map[layer]).toHaveLength(1);
  });
  it('reorders levels with Alt+arrows while ordinary arrows keep navigating', () => {
    const onReorder = vi.fn(), onSwitch = vi.fn();
    render(<LevelTabs levels={[createDefaultMap('First'), createDefaultMap('Second')]} activeIndex={0}
      onReorder={onReorder} onSwitch={onSwitch} onAdd={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} onDuplicate={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'First' }), { key: 'ArrowRight', altKey: true });
    expect(onReorder).toHaveBeenCalledWith(0, 1);
    expect(onSwitch).not.toHaveBeenCalled();
  });
});
