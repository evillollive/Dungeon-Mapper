import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ShortcutsHelp from '../ShortcutsHelp';
import ExportDialog from '../ExportDialog';
import { createDefaultMap } from '../../hooks/mapStateUtils';
import type { KeyBinding } from '../../hooks/keyBindings';

describe('ShortcutsHelp', () => {
  const mockBindings: KeyBinding[] = [
    { id: 'paint', key: 'P', keys: 'P', label: 'Paint tool', description: 'Paint tool', category: 'Tools', action: () => {}, match: () => false },
    { id: 'erase', key: 'E', keys: 'E', label: 'Erase tool', description: 'Erase tool', category: 'Tools', action: () => {}, match: () => false },
    { id: 'undo', key: 'Z', keys: 'Ctrl+Z', label: 'Undo', description: 'Undo', category: 'Edit', action: () => {}, match: () => false },
  ] as unknown as KeyBinding[];

  it('renders without crashing', () => {
    const onClose = vi.fn();
    render(<ShortcutsHelp bindings={mockBindings} onClose={onClose} />);
    expect(screen.getByText(/Keyboard Shortcuts/)).toBeInTheDocument();
  });

  it('displays keybinding labels', () => {
    const onClose = vi.fn();
    render(<ShortcutsHelp bindings={mockBindings} onClose={onClose} />);
    expect(screen.getByText('Paint tool')).toBeInTheDocument();
    expect(screen.getByText('Erase tool')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<ShortcutsHelp bindings={mockBindings} onClose={onClose} />);
    const closeBtn = screen.getByLabelText(/Close/);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ExportDialog', () => {
  it('renders without crashing', () => {
    const onClose = vi.fn();
    const map = createDefaultMap();
    render(
      <ExportDialog
        map={map}
        themeId="dungeon"
        printMode={false}
        viewMode="gm"
        onClose={onClose}
      />
    );
    expect(screen.getByText(/Print-Optimized Export/)).toBeInTheDocument();
  });

  it('calls onClose when cancel button clicked', () => {
    const onClose = vi.fn();
    const map = createDefaultMap();
    render(
      <ExportDialog
        map={map}
        themeId="dungeon"
        printMode={false}
        viewMode="gm"
        onClose={onClose}
      />
    );
    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows export button', () => {
    const onClose = vi.fn();
    const map = createDefaultMap();
    render(
      <ExportDialog
        map={map}
        themeId="dungeon"
        printMode={false}
        viewMode="gm"
        onClose={onClose}
      />
    );
    // The dialog renders with an export action button
    const exportBtn = screen.getByRole('button', { name: /Export PNG/i });
    expect(exportBtn).toBeInTheDocument();
  });
});
