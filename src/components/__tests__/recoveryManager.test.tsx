import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RecoveryManager from '../RecoveryManager';
import ProjectChooser from '../ProjectChooser';
import { createDefaultProject } from '../../hooks/mapStateUtils';
import { deleteCheckpoint, listProjects } from '../../utils/projectRepository';
import { downloadRecoveryData } from '../../utils/storage';

vi.mock('../../utils/projectRepository', () => ({ deleteCheckpoint: vi.fn(), listProjects: vi.fn() }));
vi.mock('../../utils/storage', () => ({ downloadRecoveryData: vi.fn() }));

describe('recovery and project controls', () => {
  it('previews whole-project scope, cancels without writes, and leaves failed restores retryable', async () => {
    const data = { ...createDefaultProject(), name: 'Old campaign' };
    const recover = vi.fn().mockRejectedValueOnce(new Error('Quota exceeded')).mockResolvedValue(undefined);
    render(<RecoveryManager records={[{ savedAt: '', data, reason: 'Clear level' }]}
      currentName="Current campaign" disabled={false} onRecover={recover} onRefresh={vi.fn()} />);
    fireEvent.click(screen.getByText('Preview copy 1'));
    expect(screen.getByRole('region', { name: 'Recovery preview' })).toHaveTextContent('32 x 32');
    expect(screen.getByRole('region', { name: 'Recovery preview' })).toHaveTextContent('Local project identity stays unchanged');
    fireEvent.click(screen.getByText('Cancel preview'));
    expect(recover).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Preview copy 1'));
    fireEvent.click(screen.getByText('Restore whole project'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Quota exceeded'));
    expect(screen.getByRole('region', { name: 'Recovery preview' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Restore whole project'));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Recovery preview' })).not.toBeInTheDocument());
    expect(recover).toHaveBeenLastCalledWith(data);
  });

  it('retains invalid sources for download without offering an inferred repair', () => {
    const data = { schemaVersion: 999, payload: 'private' };
    render(<RecoveryManager records={[{ savedAt: '', data }]} currentName="Current" disabled={false}
      onRecover={vi.fn()} onRefresh={vi.fn()} />);
    fireEvent.click(screen.getByText('Preview copy 1'));
    expect(screen.getByRole('alert')).toHaveTextContent('schema version 999');
    expect(screen.queryByText('Restore whole project')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Download copy 1'));
    expect(downloadRecoveryData).toHaveBeenCalledWith(data, 'dungeon-recovery-1.json');
    expect(screen.queryByText(/Delete checkpoint/)).not.toBeInTheDocument();
  });

  it('requires confirmation and targets only the identified checkpoint for deletion', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const data = createDefaultProject();
    const refresh = vi.fn();
    render(<RecoveryManager records={[{ id: 'checkpoint', projectId: 'local', data, savedAt: '' }]}
      currentName="Current" disabled={false} onRecover={vi.fn()} onRefresh={refresh} />);
    fireEvent.click(screen.getByText('Delete checkpoint 1'));
    expect(deleteCheckpoint).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Delete checkpoint 1'));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(deleteCheckpoint).toHaveBeenCalledWith('local', 'checkpoint', data);
    confirm.mockRestore();
  });

  it('shows invalid-project diagnostics and download without opening a blank project', async () => {
    vi.mocked(listProjects).mockResolvedValue([{ id: 'bad', name: 'Unreadable project', diagnostic: 'Future schema', original: {}, updatedAt: '', status: 'active', tags: [], lastOpenedAt: '' }]);
    const change = vi.fn();
    render(<ProjectChooser name="Current project" disabled={false} locked={false} onRename={vi.fn()} onSwitch={change} />);
    fireEvent.click(screen.getByText('Switch project'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Future schema'));
    expect(screen.getByText('Open Unreadable project')).toBeDisabled();
    expect(change).not.toHaveBeenCalled();
  });

  it('offers healthy choices without a placeholder project-name editor after startup failure', async () => {
    vi.mocked(listProjects).mockResolvedValue([{ id: 'healthy', name: 'Healthy project', original: {}, updatedAt: '', status: 'active', tags: [], lastOpenedAt: '' }]);
    const change = vi.fn().mockRejectedValue(new Error('Target read failed'));
    render(<ProjectChooser name="" unavailable disabled={false} locked onRename={vi.fn()} onSwitch={change} />);
    expect(screen.queryByRole('textbox', { name: 'Project name' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Switch project'));
    await waitFor(() => expect(screen.getByText('Open Healthy project')).toBeEnabled());
    fireEvent.click(screen.getByText('Open Healthy project'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Target read failed'));
    expect(screen.getByText('Open Healthy project')).toBeEnabled();
  });
});
