import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlayerPreview from '../PlayerPreview';
import SelectionInspector from '../SelectionInspector';
import AudienceSettings from '../AudienceSettings';
import NotesPanel from '../NotesPanel';
import { projectForAudience } from '../../utils/audienceProjection';
import { audienceFixture, PRIVATE_SENTINEL } from '../../test/audienceFixture';
import { useMapState } from '../../hooks/useMapState';
import { useAudienceEditing } from '../../hooks/useAudienceEditing';
import { createHistorySnapshot, restoreHistorySnapshot } from '../../hooks/mapStateUtils';
import type { ComponentProps } from 'react';
import type { DungeonMap } from '../../types/map';

function inspectorProps(): ComponentProps<typeof SelectionInspector> {
  const map = audienceFixture().levels[0];
  return {
    map, themeId: 'dungeon', themeName: 'Dungeon', notes: map.notes, tokens: map.tokens!, stamps: map.stamps!,
    lightSources: [], selectedPlacedStampId: null, selectedTokenId: null, selectedNoteId: 1,
    onUpdateNote: vi.fn(), onDeleteNote: vi.fn(), onSelectNote: vi.fn(), onUpdateToken: vi.fn(),
    onRemoveToken: vi.fn(), onSelectToken: vi.fn(), onUpdateStamp: vi.fn(), onRemoveStamp: vi.fn(),
    onBringStampToFront: vi.fn(), onSendStampToBack: vi.fn(), onSelectPlacedStamp: vi.fn(), onRemoveLightSource: vi.fn(),
  };
}

describe('audience controls', () => {
  it('renders only public content, counts and read-only viewport controls', () => {
    const project = audienceFixture();
    const projection = projectForAudience(project.levels[0], project.customThemes, project.customStamps);
    const { container } = render(<PlayerPreview projection={projection} />);
    expect(container.innerHTML).not.toContain(PRIVATE_SENTINEL);
    expect(screen.getByRole('img', { name: 'The Watchtower. 2 visible tokens. 1 published notes.' })).toBeVisible();
    expect(screen.getByText('The stairs lead upward.')).toBeVisible();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual(['Zoom out', 'Fit map', 'Zoom in']);
    expect(screen.getByRole('img', { name: 'Minimap: The Watchtower' })).toBeVisible();
  });
  it('publishes separate public fields in one explicit Apply and cancels drafts', () => {
    const props = inspectorProps();
    render(<SelectionInspector {...props} />);
    fireEvent.change(screen.getByLabelText('Public note title'), { target: { value: 'Public title' } });
    fireEvent.change(screen.getByLabelText('Public note text'), { target: { value: 'Public text' } });
    fireEvent.click(screen.getByLabelText('Publish note to players'));
    expect(props.onUpdateNote).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(props.onUpdateNote).toHaveBeenCalledExactlyOnceWith(1, PRIVATE_SENTINEL, PRIVATE_SENTINEL, {
      x: 1, y: 1, publicLabel: 'Public title', publicDescription: 'Public text', published: true,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel changes' }));
    expect(screen.getByLabelText('Publish note to players')).not.toBeChecked();
    expect(screen.getByLabelText('Note description')).toHaveValue(PRIVATE_SENTINEL);
  });
  it('persists publication through note movement and restores it with undo', () => {
    const { result } = renderHook(() => useMapState());
    let id = 0;
    act(() => { id = result.current.addNote(1, 1); });
    act(() => result.current.updateNote(id, 'Private', 'Private text', {
      x: 1, y: 1, published: true, publicLabel: 'Public', publicDescription: 'Visible text',
    }));
    expect(result.current.map.notes[0].published).toBe(true);
    act(() => result.current.updateNote(id, 'Private', 'Private text', { x: 2, y: 2 }));
    expect(result.current.map.notes[0]).toMatchObject({ published: true, publicDescription: 'Visible text', x: 2 });
    act(() => result.current.undo());
    act(() => result.current.undo());
    expect(result.current.map.notes[0].published).toBeUndefined();
    act(() => result.current.redo());
    expect(result.current.map.notes[0].publicLabel).toBe('Public');
  });
  it('keeps title and discovery undoable without changing fog or private names', () => {
    let project = audienceFixture();
    const snapshots: DungeonMap[] = [];
    const save = vi.fn();
    const { result } = renderHook(() => useAudienceEditing(
      action => { project = typeof action === 'function' ? action(project) : action; },
      save, 0, map => snapshots.push(map),
    ));
    act(() => result.current.setPublicName('The gate'));
    act(() => result.current.setSecretDiscovered(1, 1, true));
    expect(project.levels[0].tiles[1][1].discovered).toBe(true);
    expect(project.levels[0].meta.name).toBe(PRIVATE_SENTINEL);
    expect(project.levels[0].fog).toEqual(audienceFixture().levels[0].fog);
    expect(save).toHaveBeenCalledTimes(2);
    const restored = restoreHistorySnapshot(project.levels[0], createHistorySnapshot(snapshots[1]));
    expect(restored.tiles[1][1].discovered).toBeUndefined();
    expect(restored.meta.publicName).toBe('The gate');
  });
  it('exposes private defaults and visible discovery controls', () => {
    const onDiscover = vi.fn();
    render(<AudienceSettings map={audienceFixture().levels[0]} customThemes={[]} onClose={vi.fn()}
      onSetPublicName={vi.fn()} onDiscover={onDiscover} onInspect={vi.fn()} onPreview={vi.fn()} />);
    expect(screen.getByText(/Existing notes remain private/)).toBeVisible();
    fireEvent.click(screen.getByLabelText('Discovered secret-door at (1, 1)'));
    expect(onDiscover).toHaveBeenCalledWith(1, 1, true);
  });
  it('never materializes a discovered room door into the base geometry', () => {
    const { result } = renderHook(() => useMapState());
    let room = 0;
    act(() => { room = result.current.addRoomShape({ x: 1, y: 1, width: 4, height: 4,
      doorHints: [{ edge: 'n', offset: 1, type: 'secret-door' }] }); });
    act(() => result.current.setSecretDiscovered(2, 1, true));
    expect(result.current.map.tiles[1][2]).toMatchObject({ type: 'empty', discovered: true, discoveredType: 'secret-door' });
    act(() => result.current.updateRoomShape(room, { x: 5 }));
    expect(result.current.map.tiles[1][2]).toEqual({ type: 'empty' });
    act(() => result.current.undo());
    expect(result.current.map.tiles[1][2].discovered).toBe(true);
    act(() => result.current.removeRoomShape(room));
    expect(result.current.map.tiles[1][2]).toEqual({ type: 'empty' });
  });
  it('does not retain an editable note form after changing to read-only', () => {
    const props: ComponentProps<typeof NotesPanel> = {
      notes: [{ id: 1, x: 0, y: 0, label: 'Note', description: 'Text' }], selectedNoteId: null,
      onSelectNote: vi.fn(), onUpdateNote: vi.fn(), onDeleteNote: vi.fn(), onActivateNoteTool: vi.fn(),
    };
    const { rerender } = render(<NotesPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit note 1: Note' }));
    expect(screen.getByLabelText('Room description')).toBeVisible();
    rerender(<NotesPanel {...props} readOnly />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save', exact: true })).not.toBeInTheDocument();
  });
});
