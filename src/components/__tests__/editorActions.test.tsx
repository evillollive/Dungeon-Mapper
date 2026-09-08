import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildKeyBindings } from '../../hooks/keyBindings';
import { useGlobalShortcuts } from '../../hooks/useGlobalShortcuts';
import { buildEditorActions, TOOL_ACTIONS, actionMode, type ActionState, type EditorAction } from '../../utils/editorActions';
import { EditorActionsContext } from '../../contexts/EditorActionsContext';
import { extraIds, shortcutFixture } from '../../test/editorActionFixture';
import ActionButton from '../ActionButton';
import CommandPalette from '../CommandPalette';
import MobileToolbar from '../MobileToolbar';
import NotesPanel from '../NotesPanel';
import { contrastRatio, parseHexColor } from '../../utils/accessibility';

const ready: ActionState = {
  viewMode: 'gm', canUndo: true, canRedo: true, hasSelection: true,
  hasClipboard: true, hasStamp: true, canNextLevel: true, canPreviousLevel: true,
};
function registry(onCall = vi.fn(), state = ready) {
  const bindings = buildKeyBindings(shortcutFixture(onCall, state.viewMode === 'gm'));
  return buildEditorActions(bindings, [
    ...Object.values(TOOL_ACTIONS).filter(id => !bindings.some(binding => binding.id === id)),
    ...extraIds,
  ].map(id => ({ id, label: id, action: () => onCall(id) })), state);
}
function Shortcuts({ actions, enabled = true }: { actions: EditorAction[]; enabled?: boolean }) {
  useGlobalShortcuts(actions, enabled);
  return <><input aria-label="Text" /><div contentEditable suppressContentEditableWarning aria-label="Editable text"><span>Text</span></div></>;
}

describe('UX-03 shared action parity', () => {
  it('keeps semantic UI colors above text and focus contrast thresholds', () => {
    const css = readFileSync('src/design-tokens.css', 'utf8');
    const color = (name: string) => parseHexColor(css.match(new RegExp(`--${name}: (#[a-f0-9]+)`))![1])!;
    for (const surface of ['surface-base', 'surface-panel', 'surface-raised', 'surface-active']) {
      for (const text of ['text-primary', 'text-secondary', 'accent']) {
        expect(contrastRatio(color(text), color(surface))).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrastRatio(color('focus'), color(surface))).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(color('border'), color(surface))).toBeGreaterThanOrEqual(3);
    }
    expect(contrastRatio(color('action-ink'), color('action-primary'))).toBeGreaterThanOrEqual(4.5);
  });
  it('retains all 68 UX-00 shortcut identities, including canvas-local pan documentation', () => {
    const inventory = readFileSync('docs/UX-00-COMMAND-INVENTORY.md', 'utf8').split('## Command palette crosswalk')[0];
    const ids = [...inventory.matchAll(/^\| `([^`]+)` \|/gm)].map(match => match[1]);
    const bindings = buildKeyBindings(shortcutFixture());
    expect(bindings.map(binding => binding.id).sort()).toEqual(ids.sort());
    expect(bindings).toHaveLength(68);
    expect(new Set(registry().map(action => action.id)).size).toBe(registry().length);
    for (const id of Object.values(TOOL_ACTIONS)) expect(registry().find(action => action.id === id)).toBeDefined();
    for (const action of registry()) expect(action.category).not.toBe('');
  });

  it.each(['gm', 'player'] as const)('guards each incompatible command even if called directly in %s', viewMode => {
    const call = vi.fn();
    for (const action of registry(call, { ...ready, viewMode })) {
      if (actionMode(action.id) === 'both' || actionMode(action.id) === viewMode) continue;
      expect(action.enabled).toBe(false);
      expect(action.unavailableReason).toMatch(/Available in/);
      action.action();
    }
    expect(call).not.toHaveBeenCalled();
  });

  it('gates unavailable history, clipboard, selected stamps, and level edges', () => {
    const call = vi.fn();
    const commands = registry(call, {
      ...ready, canUndo: false, canRedo: false, hasSelection: false, hasClipboard: false,
      hasStamp: false, canNextLevel: false, canPreviousLevel: false,
    });

    for (const id of ['edit.undo', 'edit.redo', 'edit.copy', 'edit.cut', 'edit.paste',
      'tools.rotateStampCW', 'tools.flipStampH', 'tools.flipStampV', 'tools.deleteStamp', 'view.nextLevel', 'view.prevLevel']) {
      const action = commands.find(action => action.id === id)!;
      expect(action.enabled).toBe(false);
      action.action();
    }
    expect(call).not.toHaveBeenCalled();
  });

  it('preserves all DM-operated token tools and mobile sight/marker utilities', () => {
    const call = vi.fn();
    const actions = registry(call, { ...ready, viewMode: 'player' });
    for (const tool of ['token-player', 'token-npc', 'token-monster', 'token-monster-md', 'token-monster-lg',
      'move-token', 'remove-token', 'marker', 'remove-marker', 'light', 'remove-light'] as const) {
      const action = actions.find(action => action.id === TOOL_ACTIONS[tool])!;
      expect(action.enabled).toBe(true);
      action.action();
      expect(call).toHaveBeenLastCalledWith('tool', tool);
    }
    const sight = actions.find(action => action.id === 'tool.fov')!;
    expect(sight.enabled).toBe(true);
    sight.action();
    expect(call).toHaveBeenLastCalledWith('fov');
  });

  it('dispatches the same handler from a button, keyboard, palette and mobile menu', async () => {
    const call = vi.fn();
    const actions = registry(call);
    const { rerender } = render(<EditorActionsContext.Provider value={actions}>
      <Shortcuts actions={actions} /><ActionButton id="file.exportJson">Backup</ActionButton>
    </EditorActionsContext.Provider>);
    fireEvent.click(screen.getByRole('button', { name: 'Backup' }));
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    expect(call.mock.calls).toEqual([['json'], ['json']]);
    Element.prototype.scrollIntoView = vi.fn();
    rerender(<CommandPalette open commands={actions} onClose={() => {}} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'editable backup' } });
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    await waitFor(() => expect(call).toHaveBeenCalledTimes(3));
    rerender(<EditorActionsContext.Provider value={actions}><MobileToolbar viewMode="gm" activeTool="paint" /></EditorActionsContext.Provider>);
    fireEvent.click(screen.getByRole('button', { name: 'All actions' }));
    fireEvent.click(screen.getByRole('button', { name: /Export editable backup/ }));
    await waitFor(() => expect(call).toHaveBeenCalledTimes(4));
    expect(call.mock.calls.every(args => args[0] === 'json')).toBe(true);
  });

  it('offers every registry action in the mobile menu with identical disabled state', () => {
    const actions = registry();
    const { container } = render(<EditorActionsContext.Provider value={actions}><MobileToolbar viewMode="gm" activeTool="paint" /></EditorActionsContext.Provider>);
    fireEvent.click(screen.getByRole('button', { name: 'All actions' }));
    for (const action of actions) {
      const button = container.querySelector<HTMLButtonElement>(`.shell-menu-actions [data-action="${action.id}"]`);
      expect(button).not.toBeNull();
      expect(button?.disabled).toBe(!action.enabled);
    }
  });

  it('does not steal shortcuts from text inputs, editable descendants, dialogs, or inactive routes', () => {
    const call = vi.fn();
    const actions = registry(call);
    const { rerender } = render(<Shortcuts actions={actions} />);
    fireEvent.keyDown(screen.getByLabelText('Text'), { key: 'p' });
    fireEvent.keyDown(screen.getByLabelText('Text'), { key: 'k', ctrlKey: true });
    fireEvent.keyDown(screen.getByText('Text'), { key: 'p' });
    expect(call).not.toHaveBeenCalled();
    rerender(<><Shortcuts actions={actions} /><div role="dialog" aria-modal="true" /></>);
    fireEvent.keyDown(window, { key: 'p' });
    expect(call).not.toHaveBeenCalled();
    rerender(<Shortcuts actions={actions} enabled={false} />);
    fireEvent.keyDown(window, { key: 'p' });
    expect(call).not.toHaveBeenCalled();
    rerender(<Shortcuts actions={registry(call, { ...ready, viewMode: 'player' })} />);
    fireEvent.keyDown(window, { key: 'p' });
    expect(call).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'b' });
    expect(call).toHaveBeenCalledWith('tool', 'pdraw');
  });

  it('returns focus after palette cancellation and hides no-op note editing in DM view', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const { rerender } = render(<button>Open commands</button>);
    screen.getByRole('button').focus();
    rerender(<><button>Open commands</button><CommandPalette open commands={registry()} onClose={() => {}} /></>);
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveFocus());
    rerender(<button>Open commands</button>);
    expect(screen.getByRole('button')).toHaveFocus();
    render(<NotesPanel readOnly notes={[{ id: 1, x: 0, y: 0, label: 'Room', description: 'Retained note' }]}
      selectedNoteId={null} onSelectNote={vi.fn()} onUpdateNote={vi.fn()} onDeleteNote={vi.fn()} onActivateNoteTool={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Add Note|Edit note|Delete note/ })).not.toBeInTheDocument();
    expect(screen.getByText('Retained note')).toBeInTheDocument();
  });
});
