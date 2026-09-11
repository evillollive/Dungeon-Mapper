import { useState, type ComponentProps } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import NotesPanel from '../NotesPanel';
import InitiativePanel from '../InitiativePanel';
import IconPicker from '../IconPicker';
import ContextPanel from '../ContextPanel';
import type { Token } from '../../types/map';

const note = { id: 1, x: 2, y: 3, label: 'Room', description: 'Text' };
const notesProps = (): ComponentProps<typeof NotesPanel> => ({
  notes: [note], selectedNoteId: null, onSelectNote: vi.fn(), onUpdateNote: vi.fn(),
  onDeleteNote: vi.fn(), onActivateNoteTool: vi.fn(),
});
const tokens: Token[] = [
  { id: 1, x: 1, y: 1, kind: 'player', label: 'Scout' },
  { id: 2, x: 2, y: 1, kind: 'player', label: 'Mage' },
];
const initiativeProps = (): ComponentProps<typeof InitiativePanel> => ({
  tokens, initiative: [1, 2], selectedTokenId: null, onSelectToken: vi.fn(),
  onRenameToken: vi.fn(), onReorder: vi.fn(), onClear: vi.fn(), viewMode: 'gm',
});

describe('keyboard notes', () => {
  it('edits spaces and multiline text without selecting the row, then restores focus', async () => {
    const user = userEvent.setup();
    const props = notesProps();
    render(<NotesPanel {...props} />);
    await user.click(screen.getByRole('button', { name: 'Edit note 1: Room' }));
    expect(screen.getByLabelText('Room name')).toHaveFocus();
    await user.clear(screen.getByLabelText('Room name'));
    await user.keyboard('The long hall');
    await user.tab();
    await user.clear(screen.getByLabelText('Room description'));
    await user.keyboard('First line{Enter}Second line with spaces');
    await user.tab();
    await user.keyboard(' ');
    expect(props.onUpdateNote).toHaveBeenCalledExactlyOnceWith(1, 'The long hall', 'First line\nSecond line with spaces');
    expect(props.onSelectNote).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Edit note 1: Room' })).toHaveFocus();
  });

  it('cancels drafts with Escape and keeps selection a separate native action', async () => {
    const user = userEvent.setup();
    const props = notesProps();
    const { container } = render(<NotesPanel {...props} />);
    await user.click(screen.getByRole('button', { name: 'Edit note 1: Room' }));
    await user.keyboard(' changes{Escape}');
    expect(props.onUpdateNote).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Edit note 1: Room' })).toHaveFocus();
    screen.getByRole('button', { name: 'Select note 1: Room' }).focus();
    await user.keyboard('{Enter}');
    expect(props.onSelectNote).toHaveBeenCalledExactlyOnceWith(1);
    expect(container.querySelector('button button, [role="button"] input, [role="button"] textarea')).toBeNull();
  });

  it('retains readable descriptions without authoring controls in read-only mode', () => {
    render(<NotesPanel {...notesProps()} readOnly />);
    expect(screen.getByText('Text')).toBeVisible();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});

describe('keyboard initiative', () => {
  it('renames without toggling selection, supports spaces and restores the rename action', async () => {
    const user = userEvent.setup();
    const props = initiativeProps();
    render(<InitiativePanel {...props} />);
    await user.click(screen.getByRole('button', { name: 'Rename Scout' }));
    expect(screen.getByRole('textbox', { name: 'Name for Scout' })).toHaveFocus();
    await user.clear(screen.getByRole('textbox'));
    await user.keyboard('First Scout{Enter}');
    expect(props.onRenameToken).toHaveBeenCalledExactlyOnceWith(1, 'First Scout');
    expect(props.onSelectToken).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Rename Scout' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' cancelled{Escape}');
    expect(props.onRenameToken).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Rename Scout' })).toHaveFocus();
  });

  describe('conditional icon dialog focus', () => {
    it('registers on open, stays above a responsive sheet and restores focus on close', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      function Workspace({ open, mobile }: { open: boolean; mobile: boolean }) {
        return <>
          <ContextPanel mobile={mobile} onClose={vi.fn()}><button>Sheet action</button></ContextPanel>
          <IconPicker open={open} onSelect={vi.fn()} onCancel={onCancel} />
        </>;
      }
      const { rerender } = render(<Workspace open={false} mobile={false} />);
      screen.getByRole('button', { name: 'Sheet action' }).focus();
      rerender(<Workspace open mobile={false} />);
      expect(screen.getByRole('textbox', { name: 'Search icons' })).toHaveFocus();
      rerender(<Workspace open mobile />);
      expect(screen.getByRole('textbox', { name: 'Search icons' })).toHaveFocus();
      screen.getByRole('button', { name: 'Sheet action' }).focus();
      expect(screen.getByRole('textbox', { name: 'Search icons' })).toHaveFocus();
      await user.tab({ shift: true });
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(onCancel).toHaveBeenCalledOnce();
      rerender(<Workspace open={false} mobile />);
      expect(screen.getByRole('button', { name: 'Sheet action' })).toHaveFocus();
    });
  });

  it('preserves save-on-blur without swallowing the next action', async () => {
    const user = userEvent.setup();
    const props = initiativeProps();
    render(<InitiativePanel {...props} />);
    await user.click(screen.getByRole('button', { name: 'Rename Scout' }));
    await user.keyboard(' leader');
    await user.tab();
    expect(props.onRenameToken).toHaveBeenCalledExactlyOnceWith(1, 'Scout leader');
    expect(props.onSelectToken).not.toHaveBeenCalled();
  });

  it('reorders with buttons and shortcuts while preserving selection focus', async () => {
    const user = userEvent.setup();
    function Panel() {
      const [order, setOrder] = useState([1, 2]);
      return <InitiativePanel {...initiativeProps()} initiative={order} onReorder={(from, to) => {
        setOrder(previous => { const next = [...previous]; const [id] = next.splice(from, 1); next.splice(to, 0, id); return next; });
      }} />;
    }
    render(<Panel />);
    const select = screen.getByRole('button', { name: /Scout, position/ });
    select.focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(select).toHaveFocus();
    expect(select).toHaveAccessibleName('Scout, position 2. Use Alt+Up/Down to reorder');
    expect(screen.getByRole('status')).toHaveTextContent('Scout moved to position 2 of 2.');
    expect(screen.getByRole('button', { name: 'Move Scout down' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Move Scout up' }));
    expect(select).toHaveAccessibleName('Scout, position 1. Use Alt+Up/Down to reorder');
  });

  it('maps displayed positions to original indices when a stale id is present', async () => {
    const user = userEvent.setup();
    const props = initiativeProps();
    render(<InitiativePanel {...props} initiative={[999, 1, 2]} />);
    await user.click(screen.getByRole('button', { name: 'Move Mage up' }));
    expect(props.onReorder).toHaveBeenCalledExactlyOnceWith(2, 1);
  });

  it('keeps read-only entries selectable but exposes no rename or reorder actions', async () => {
    const user = userEvent.setup();
    const props = initiativeProps();
    render(<InitiativePanel {...props} viewMode="player" />);
    const row = screen.getByRole('group', { name: 'Scout, position 1' });
    const select = within(row).getByRole('button');
    expect(select).toHaveAccessibleName('Scout, position 1');
    select.focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(props.onReorder).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Rename|Move .* up|Move .* down|Clear/ })).not.toBeInTheDocument();
  });
});
