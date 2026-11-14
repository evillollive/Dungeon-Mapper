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

describe('Welcome page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
    vi.mocked(listProjects).mockResolvedValue([]);
  });
  it('greets someone with no maps and routes its start buttons without creating anything itself', async () => {
    const handlers = props();
    render(<ProjectLibrary {...handlers} />);
    const title = await screen.findByRole('heading', { level: 1, name: 'Make the map tonight, and run it tomorrow.' });
    expect(title).toHaveFocus();
    expect(screen.getByText(/free map builder for tabletop RPGs/)).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Your maps', exact: true })).not.toBeInTheDocument();
    const [explore] = screen.getAllByRole('button', { name: 'Explore a sample map' });
    fireEvent.click(explore);
    expect(handlers.onCreate).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getAllByRole('button', { name: 'Create a map' })[1]);
    expect(handlers.onCreate).toHaveBeenLastCalledWith();
    expect(screen.getAllByRole('link', { name: 'Get started' })).toHaveLength(2);
    screen.getAllByRole('link', { name: 'Get started' }).forEach(link => expect(link).toHaveAttribute('href', '#welcome-start'));
    expect(screen.getByRole('link', { name: 'See how it works' })).toHaveAttribute('href', '#welcome-how');
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/evillollive/Dungeon-Mapper');
  });
  it('shows a still map and no video players until the videos are published', async () => {
    const { container } = render(<ProjectLibrary {...props()} />);
    await screen.findByRole('heading', { level: 1 });
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('img', { name: /an inn map included as a sample/ })).toBeVisible();
    expect(screen.queryByText(/Watch the walkthrough/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'YouTube' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map(item => item.querySelector('h3')?.textContent).filter(Boolean))
      .toEqual(['Build the map', 'Decide what players see', 'Show it at the table', 'No paid tier', 'Your maps stay with you', 'Open source']);
  });
  it('moves between Welcome and Your maps, remembering the choice in the address', async () => {
    render(<ProjectLibrary {...props()} />);
    await screen.findByRole('heading', { level: 1, name: 'Make the map tonight, and run it tomorrow.' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Your maps' })[0]);
    expect(await screen.findByRole('heading', { name: 'Your maps', exact: true })).toBeVisible();
    expect(new URL(window.location.href).searchParams.get('view')).toBe('library');
    expect(screen.getByRole('heading', { name: 'Dungeon Mapper', exact: true })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Welcome', exact: true }));
    expect(screen.getByRole('heading', { level: 1, name: 'Make the map tonight, and run it tomorrow.' })).toBeVisible();
    expect(new URL(window.location.href).searchParams.has('view')).toBe(false);
  });
  it('opens Your maps for returning users, for ?view=library, and whenever saving needs attention', async () => {
    vi.mocked(listProjects).mockResolvedValue([item('a', 'Crypt')]);
    const first = render(<ProjectLibrary {...props()} />);
    expect(await screen.findByRole('heading', { name: 'Your maps', exact: true })).toBeVisible();
    first.unmount();
    vi.mocked(listProjects).mockResolvedValue([]);
    window.history.replaceState(null, '', '/?view=library');
    const second = render(<ProjectLibrary {...props()} />);
    expect(screen.getByRole('heading', { name: 'Your maps', exact: true })).toBeVisible();
    second.unmount();
    window.history.replaceState(null, '', '/');
    const health = <div role="region" aria-label="Save controls" />;
    const { rerender } = render(<ProjectLibrary {...props()} saveHealth={health} />);
    await screen.findByRole('heading', { level: 1, name: 'Make the map tonight, and run it tomorrow.' });
    rerender(<ProjectLibrary {...props()} saveHealth={health} saveNeedsAttention />);
    expect(await screen.findByRole('region', { name: 'Save controls' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Your maps', exact: true })).toBeVisible();
  });
});

describe('Your maps library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    vi.mocked(listProjects).mockResolvedValue([item('a', 'Crypt', ['undead']), item('b', 'Forest', ['travel'])]);
    vi.mocked(renderMapToCanvas).mockReturnValue({ toDataURL: () => 'data:image/png;base64,test' } as HTMLCanvasElement);
  });
  it('shows creation artwork only for an empty active collection, not search or trash', async () => {
    vi.mocked(listProjects).mockResolvedValue([]);
    window.history.replaceState(null, '', '/?view=library');
    const handlers = props();
    const { container } = render(<ProjectLibrary {...handlers} />);
    await screen.findByRole('heading', { name: 'A new adventure starts here' });
    expect(container.querySelector('[data-scene="create"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Create map', exact: true }));
    expect(handlers.onCreate).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } });
    expect(container.querySelector('[data-scene]')).toBeNull();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Trash', exact: true }));
    expect(container.querySelector('[data-scene]')).toBeNull();
  });
  it('does not dress a failed collection load as a successful empty-state illustration', async () => {
    vi.mocked(listProjects).mockRejectedValue(new Error('Storage unavailable'));
    const { container } = render(<ProjectLibrary {...props()} />);
    await screen.findByRole('alert');
    expect(container.querySelector('[data-scene]')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('Storage unavailable');
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
  it('keeps routine save controls below the overview and prioritizes failures without remounting them', async () => {
    const handlers = props();
    const saveHealth = <div role="region" aria-label="Save controls"><input aria-label="Recovery choice" /></div>;
    const { rerender } = render(<ProjectLibrary {...handlers} saveHealth={saveHealth} />);
    await screen.findByRole('article', { name: 'Crypt' });
    expect(screen.getByRole('heading', { name: 'Dungeon Mapper', exact: true })).toHaveFocus();
    const controls = screen.getByRole('region', { name: 'Save controls' });
    expect(controls.parentElement).toHaveClass('library-save');
    fireEvent.change(screen.getByLabelText('Recovery choice'), { target: { value: 'selected checkpoint' } });
    rerender(<ProjectLibrary {...handlers} saveHealth={saveHealth} saveNeedsAttention />);
    expect(controls.parentElement).toHaveClass('library-save-attention');
    expect(screen.getByLabelText('Recovery choice')).toHaveValue('selected checkpoint');
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
