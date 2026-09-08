import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MapHeader from '../MapHeader';
import SaveHealth from '../SaveHealth';
import { createDefaultProject } from '../../hooks/mapStateUtils';
import { downloadRecoveryData, loadRecoveryRecords } from '../../utils/storage';
import { exportProjectJSON } from '../../utils/export';

vi.mock('../../utils/storage', () => ({
  downloadRecoveryData: vi.fn(),
  loadRecoveryRecords: vi.fn(),
}));
vi.mock('../../utils/export', () => ({
  exportProjectJSON: vi.fn(),
  importProjectJSON: vi.fn(),
  exportMapPNG: vi.fn(),
}));

describe('save trust controls', () => {
  it('displays 40 x 40 and arbitrary valid dimensions without resizing on render', () => {
    const project = createDefaultProject();
    const map = { ...project.levels[0], meta: { ...project.levels[0].meta, width: 40, height: 37 } };
    const noop = vi.fn();
    const props = {
      map, project, onSetName: noop, onResize: noop, onSetTileSize: noop,
      onClear: noop, onNew: noop, onLoadProject: noop, onExportSVG: noop,
      onUndo: noop, onRedo: noop, canUndo: false, canRedo: false,
      printMode: false, onTogglePrintMode: noop, uiScale: 1,
      uiScaleOptions: [1], onSetUIScale: noop, getCanvas: () => null,
      viewMode: 'gm' as const, onToggleViewMode: noop, onShowShortcuts: noop,
      onOpenExportDialog: noop, onOpenGenerateHub: noop,
      layoutDensity: 'rail' as const, onSetLayoutDensity: noop,
    };
    const { rerender } = render(<MapHeader {...props} />);
    expect(screen.getByRole('combobox', { name: 'Map width in tiles' })).toHaveValue('40');
    expect(screen.getByRole('combobox', { name: 'Map height in tiles' })).toHaveValue('37');
    expect(noop).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Map width in tiles' }), { target: { value: '48' } });
    expect(noop).toHaveBeenCalledWith(48, 37);
    rerender(<MapHeader {...props} map={{ ...map, meta: { ...map.meta, height: 40 } }} />);
    expect(screen.getByRole('combobox', { name: 'Map height in tiles' })).toHaveValue('40');
  });

  it('keeps in-memory backup and retry available after saving fails', () => {
    const project = createDefaultProject();
    const retry = vi.fn();
    render(<SaveHealth state={{ phase: 'failed', message: 'Quota exceeded' }} project={project} onRetry={retry} onRecover={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Save failed');
    expect(screen.getByText(/Backups include DM-only content/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Export backup' }));
    expect(exportProjectJSON).toHaveBeenCalledWith(project);
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('offers the untouched unsupported original, not a blank project backup', async () => {
    const original = { schemaVersion: 999, project: { unknown: 'preserve' } };
    vi.mocked(loadRecoveryRecords).mockResolvedValue([]);
    render(<SaveHealth state={{ phase: 'restore-failed', message: 'Unsupported version' }}
      original={original} project={createDefaultProject()} onRetry={vi.fn()} onRecover={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Export backup' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download original' }));
    expect(downloadRecoveryData).toHaveBeenCalledWith(original);
    fireEvent.click(screen.getByRole('button', { name: 'Recovery copies' }));
    await waitFor(() => expect(screen.getByText('No recovery copies are available on this device.')).toBeInTheDocument());
  });

  it('does not conflate being offline with a failed local save', () => {
    render(<SaveHealth state={{ phase: 'saved' }} project={createDefaultProject()} onRetry={vi.fn()} onRecover={vi.fn()} />);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    fireEvent(window, new Event('offline'));
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saved on this device');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });
});
