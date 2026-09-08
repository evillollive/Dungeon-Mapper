import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Prototype } from './Prototype';

vi.mock('../../utils/renderMap', () => ({
  renderMapToCanvas: () => document.createElement('canvas'),
}));

beforeEach(() => { window.history.replaceState(null, '', '/#library'); });

describe('isolated UX-00 prototype', () => {
  it('opens a sample, prepares play, and retains only demo progress', async () => {
    const user = userEvent.setup();
    render(<Prototype />);
    await user.click(screen.getByRole('button', { name: 'Open a sample' }));
    await user.click(screen.getByRole('button', { name: 'Use The Sunken Crypt sample' }));
    expect(screen.getByRole('heading', { name: 'Edit', exact: true })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Prepare session' }));
    expect(screen.getByText(/Legacy descriptions stay DM-private/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start demo session' }));
    await user.click(screen.getByRole('button', { name: 'Next turn' }));
    await user.click(screen.getByRole('button', { name: 'End session' }));
    await user.click(screen.getByRole('button', { name: 'Keep demo session progress' }));
    expect(screen.getByRole('button', { name: 'Resume demo session' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Authored sample unchanged');
  });

  it('shows empty and error scenarios for all four surfaces', () => {
    render(<Prototype />);
    for (const route of ['library', 'edit', 'run', 'player']) {
      fireEvent.change(screen.getByLabelText('Screen'), { target: { value: route } });
      fireEvent.change(screen.getByLabelText('Scenario'), { target: { value: 'empty' } });
      expect(screen.getByText({
        library: 'Your first adventure starts here',
        edit: 'A blank canvas, not a checklist.',
        run: 'No participants yet',
        player: 'Waiting for your DM',
      }[route]!)).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Scenario'), { target: { value: 'error' } });
      expect(screen.getByText({
        library: 'Could not open the local library',
        edit: 'Changes could not be saved',
        run: 'Player display could not open',
        player: 'Display disconnected',
      }[route]!)).toBeInTheDocument();
    }
  });

  it('blanks a paused player preview and has no DM controls inside the player surface', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/?study=1#run');
    render(<Prototype />);
    await user.click(screen.getByRole('button', { name: 'Pause display' }));
    await user.click(screen.getByRole('button', { name: 'Open player preview' }));
    expect(screen.getByText('A moment at the table')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit', exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reveal area' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Screen')).not.toBeInTheDocument();
  });

  it('cancels creation and filters without changing the demo collection', async () => {
    const user = userEvent.setup();
    render(<Prototype />);
    await user.click(screen.getByRole('button', { name: 'Create map' }));
    await user.click(screen.getByRole('button', { name: 'Cancel creation' }));
    await user.type(screen.getByRole('searchbox'), 'not present');
    expect(screen.getByText('No matching maps')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('button', { name: 'Open map' })).toBeInTheDocument();
  });
});
