import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ExportDialog from '../ExportDialog';
import { createDefaultMap } from '../../hooks/mapStateUtils';
import { exportHighResPNG } from '../../utils/export';

vi.mock('../ExportPreview', () => ({ default: () => null }));
vi.mock('../../utils/export', () => ({
  exportHighResPNG: vi.fn(), exportMapSVG: vi.fn(), exportProjectJSON: vi.fn(),
}));

afterEach(() => vi.resetAllMocks());

describe('export cancellation feedback', () => {
  it('acknowledges cancellation immediately but keeps controls locked until the operation settles', async () => {
    let finish!: (reason: unknown) => void;
    let signal: AbortSignal | undefined;
    vi.mocked(exportHighResPNG).mockImplementationOnce((_map, options) => {
      signal = options.signal;
      return new Promise((_resolve, reject) => { finish = reject; });
    }).mockResolvedValue(undefined);
    render(<ExportDialog map={createDefaultMap()} themeId="dungeon" printMode={false}
      viewMode="gm" initialChoice="print" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download page 1', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel export', exact: true }));
    expect(signal?.aborted).toBe(true);
    expect(screen.getByText('Cancelling export. Waiting for the current operation to finish.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancellation requested' })).toBeDisabled();
    expect(screen.getByLabelText('Resolution (DPI)')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Download page 1', exact: true })).not.toBeInTheDocument();
    expect(exportHighResPNG).toHaveBeenCalledOnce();

    await act(async () => { finish(signal!.reason); });
    expect(screen.getByText('Export cancelled. Completed downloads are kept; your project is unchanged.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Download page 1', exact: true })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Download page 1', exact: true }));
    await screen.findByText('Download requested. Your project is unchanged. Check your browser downloads.');
    expect(exportHighResPNG).toHaveBeenCalledTimes(2);
    expect(vi.mocked(exportHighResPNG).mock.calls[1][1].signal?.aborted).toBe(false);
  });
});
