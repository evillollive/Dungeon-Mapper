import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectLibrary from '../ProjectLibrary';
import { changeLibraryProject, duplicateLibraryProject, listProjects, recordProjectOpened, type ProjectSummary } from '../../utils/projectRepository';
import { createDefaultProject } from '../../hooks/mapStateUtils';
import { encodeProject } from '../../utils/projectSchema';
import { importProjectJSON } from '../../utils/export';
import { renderMapToCanvas } from '../../utils/renderMap';

vi.mock('../../utils/projectRepository', () => ({ listProjects: vi.fn(), changeLibraryProject: vi.fn(), duplicateLibraryProject: vi.fn(), recordProjectOpened: vi.fn() }));
vi.mock('../../utils/export', () => ({ importProjectJSON: vi.fn(), exportProjectJSON: vi.fn() }));
vi.mock('../../utils/renderMap', () => ({ renderMapToCanvas: vi.fn() }));
const item = (id: string, name: string, tags: string[] = []): ProjectSummary => ({
  id, name, tags, status: 'active', lastOpenedAt: '', updatedAt: '2026-09-08T00:00:00Z',
  original: { ...encodeProject({ ...createDefaultProject(), name }), localProjectId: id, storageRevision: `${id}-rev` },
});
const props = () => ({ projectId: 'a', disabled: false, onOpen: vi.fn().mockResolvedValue(undefined),
  onCreate: vi.fn(), onImport: vi.fn().mockReturnValue(true), onChangedActive: vi.fn().mockResolvedValue(undefined), onDeleted: vi.fn() });

describe('Your maps library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listProjects).mockResolvedValue([item('a', 'Crypt', ['undead']), item('b', 'Forest', ['travel'])]);
    vi.mocked(renderMapToCanvas).mockReturnValue({ toDataURL: () => 'data:image/png;base64,test' } as HTMLCanvasElement);
  });
  it('searches names and tags locally and opens a result directly', async () => {
    const handlers = props();
    render(<ProjectLibrary {...handlers} />);
    await screen.findByRole('article', { name: 'Forest' });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'UNDEAD' } });
    expect(screen.queryByRole('article', { name: 'Forest' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue Crypt' }));
    await waitFor(() => expect(handlers.onOpen).toHaveBeenCalledWith('a'));
    expect(recordProjectOpened).toHaveBeenCalledWith('a');
  });
  it('offers a direct recent-project action above the card collection', async () => {
    const handlers = props();
    render(<ProjectLibrary {...handlers} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Continue last map', exact: true }));
    await waitFor(() => expect(handlers.onOpen).toHaveBeenCalledWith('a'));
    expect(recordProjectOpened).toHaveBeenCalledWith('a');
  });

  it('duplicates portable content without using its local identity', async () => {
    const handlers = props();
    vi.mocked(duplicateLibraryProject).mockResolvedValue('new-copy');
    render(<ProjectLibrary {...handlers} />);
    const forest = await screen.findByRole('article', { name: 'Forest' });
    fireEvent.click(within(forest).getByRole('button', { name: 'Duplicate' }));
    await waitFor(() => expect(handlers.onOpen).toHaveBeenCalledWith('new-copy'));
    expect(duplicateLibraryProject).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
    expect(handlers.onImport).not.toHaveBeenCalled();
  });
  it('saves name/tags through guarded catalog mutation and refreshes active identity', async () => {
    const handlers = props();
    render(<ProjectLibrary {...handlers} />);
    const crypt = await screen.findByRole('article', { name: 'Crypt' });
    fireEvent.click(within(crypt).getByRole('button', { name: 'Rename and tags' }));
    fireEvent.change(screen.getByLabelText('Project title'), { target: { value: 'Deep Crypt' } });
    fireEvent.change(screen.getByLabelText('Tags, separated by commas'), { target: { value: 'undead, session 2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name and tags' }));
    await waitFor(() => expect(changeLibraryProject).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), { name: 'Deep Crypt', tags: ['undead', ' session 2'] }));
    await waitFor(() => expect(handlers.onChangedActive).toHaveBeenCalledWith('a'));
  });
  it('keeps a failed thumbnail visible without blocking open', async () => {
    vi.mocked(renderMapToCanvas).mockImplementation(() => { throw new Error('Canvas unavailable'); });
    render(<ProjectLibrary {...props()} />);
    await waitFor(() => expect(screen.getAllByText('Canvas unavailable')).toHaveLength(2));
    expect(screen.getAllByRole('button', { name: 'Retry thumbnail' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Open Forest' })).toBeEnabled();
  });
  it('previews imported backups and cancels without creating a project', async () => {
    const handlers = props();
    vi.mocked(importProjectJSON).mockResolvedValue({ ...createDefaultProject(), name: 'Backup' });
    render(<ProjectLibrary {...handlers} />);
    await screen.findByRole('article', { name: 'Crypt' });
    fireEvent.change(screen.getByLabelText('Import project'), { target: { files: [new File(['{}'], 'map.json')] } });
    await screen.findByRole('region', { name: 'Import preview' });
    expect(handlers.onImport).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel import' }));
    expect(screen.queryByRole('region', { name: 'Import preview' })).not.toBeInTheDocument();
    expect(handlers.onImport).not.toHaveBeenCalled();
  });
  it('requires explicit confirmation for trash and permanent deletion', async () => {
    const trashed = { ...item('c', 'Old Crypt'), status: 'trash' as const };
    vi.mocked(listProjects).mockResolvedValue([trashed]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ProjectLibrary {...props()} />);
    await waitFor(() => expect(screen.queryByText('Reading local projects...')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Trash', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    expect(changeLibraryProject).not.toHaveBeenCalled();
    vi.mocked(window.confirm).mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    await waitFor(() => expect(changeLibraryProject).toHaveBeenCalledWith(trashed, { delete: true }));
  });
});
