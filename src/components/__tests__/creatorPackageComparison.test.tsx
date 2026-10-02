import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectLibrary from '../ProjectLibrary';
import { creatorOriginFixture } from '../../test/creatorPackageFixture';
import { createDefaultProject } from '../../hooks/mapStateUtils';
import { encodeProject } from '../../utils/projectSchema';
import { listProjects, type ProjectSummary } from '../../utils/projectRepository';
import { inspectCreatorZip, type ImportedCreatorPackage } from '../../utils/creatorPackageImport';
import { renderMapToCanvas } from '../../utils/renderMap';
import type { CreatorPackageOrigin } from '../../utils/creatorPackageOrigin';
import type { DungeonProject } from '../../types/map';

vi.mock('../../utils/projectRepository', () => ({ listProjects: vi.fn() }));
vi.mock('../../utils/creatorPackageImport', () => ({ inspectCreatorZip: vi.fn(), inspectCreatorDirectory: vi.fn() }));
vi.mock('../../utils/renderMap', () => ({ renderMapToCanvas: vi.fn() }));
vi.mock('../OfflineStatus', () => ({ default: () => null }));

function source(origin: unknown = creatorOriginFixture()): ProjectSummary {
  const project = createDefaultProject();
  project.name = 'Locally edited vault';
  project.levels[0].tiles[0][0].type = 'wall';
  project.creatorPackageOrigin = origin;
  return { id: 'existing', name: project.name, status: 'active', tags: [], lastOpenedAt: '',
    updatedAt: '2026-09-30T00:00:00Z',
    original: { ...encodeProject(project), localProjectId: 'existing', storageRevision: 'existing-revision' } };
}
function incoming(origin: CreatorPackageOrigin): ImportedCreatorPackage {
  const project = createDefaultProject();
  project.name = origin.title;
  project.creatorPackageOrigin = structuredClone(origin);
  return {
    manifest: { format: 'dungeon-mapper-creator-package', version: 1,
      catalog: 'dungeon-mapper-builtins-2026-09-30', packageId: origin.packageId, contentVersion: origin.contentVersion,
      title: origin.title, author: origin.author, license: 'CC-BY-4.0',
      profile: origin.profile, description: 'Selected creator file', levelNames: ['Level 1'],
      members: origin.files.filter(file => file.path !== 'manifest.json') },
    project, previews: [], sourceNotices: [], imageMetadataWarning: 'Review image metadata.',
  };
}
function revision(): CreatorPackageOrigin {
  const origin = creatorOriginFixture();
  origin.contentVersion = '1.1.0';
  origin.files.find(file => file.path === 'manifest.json')!.sha256 = 'a'.repeat(64);
  origin.files.find(file => file.path === 'map.json')!.sha256 = 'b'.repeat(64);
  return origin;
}
const handlers = () => ({
  projectId: 'existing', disabled: false, onOpen: vi.fn().mockResolvedValue(undefined),
  onCreate: vi.fn(), onImport: vi.fn<(project: DungeonProject) => boolean>().mockReturnValue(true),
  onChangedActive: vi.fn().mockResolvedValue(undefined), onDeleted: vi.fn(),
});
async function selectComparison() {
  const card = await screen.findByRole('article', { name: 'Locally edited vault' });
  fireEvent.click(within(card).getByText('Manage Locally edited vault', { exact: true }));
  const trigger = within(card).getByRole('button', { name: 'Compare creator package' });
  fireEvent.click(trigger);
  fireEvent.change(screen.getByLabelText('Compare creator package file'), {
    target: { files: [new File(['zip fixture'], 'selected.zip')] },
  });
  return trigger;
}
beforeEach(() => {
  vi.mocked(listProjects).mockResolvedValue([source()]);
  vi.mocked(inspectCreatorZip).mockResolvedValue(incoming(revision()));
  vi.mocked(renderMapToCanvas).mockReturnValue({ toDataURL: () => 'data:image/png;base64,test' } as HTMLCanvasElement);
});
afterEach(() => vi.resetAllMocks());

describe('explicit offline creator package comparison', () => {
  it('compares with the original receipt and imports only after confirmation as an independent object', async () => {
    const baseline = source(), before = structuredClone(baseline);
    vi.mocked(listProjects).mockResolvedValue([baseline]);
    const props = handlers();
    render(<ProjectLibrary {...props} />);
    await selectComparison();
    const comparison = await screen.findByRole('region', { name: 'Creator package comparison' });
    expect(within(comparison).getByRole('heading', { name: 'Compare with Locally edited vault' })).toHaveFocus();
    expect(comparison).toHaveTextContent('original imported package, not your current edits');
    expect(comparison).toHaveTextContent('1.0.0');
    expect(comparison).toHaveTextContent('1.1.0');
    expect(comparison).toHaveTextContent('2 package files differ');
    expect(comparison).toHaveTextContent('not verified publisher identity');
    expect(props.onImport).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Import as new project' }));
    expect(props.onImport).toHaveBeenCalledOnce();
    const candidate = vi.mocked(inspectCreatorZip).mock.results[0].value;
    expect(props.onImport.mock.calls[0][0]).not.toBe((await candidate).project);
    expect(baseline).toEqual(before);
  });

  it('keeps different package IDs explicit without calling the file an authenticated update', async () => {
    const other = revision();
    other.packageId = 'different-map';
    vi.mocked(inspectCreatorZip).mockResolvedValue(incoming(other));
    const props = handlers();
    render(<ProjectLibrary {...props} />);
    await selectComparison();
    const comparison = await screen.findByRole('region', { name: 'Creator package comparison' });
    expect(comparison).toHaveTextContent('Different package ID');
    expect(comparison).toHaveTextContent('not an upstream update');
    expect(props.onImport).not.toHaveBeenCalled();
  });

  it('highlights unchanged labels with changed bytes and never silently replaces a local map', async () => {
    const changed = revision();
    changed.contentVersion = '1.0.0';
    vi.mocked(inspectCreatorZip).mockResolvedValue(incoming(changed));
    const props = handlers();
    render(<ProjectLibrary {...props} />);
    await selectComparison();
    expect(await screen.findByText(/version label is unchanged, but package bytes differ/)).toBeVisible();
    expect(props.onChangedActive).not.toHaveBeenCalled();
    expect(props.onImport).not.toHaveBeenCalled();
  });

  it('does not confuse local edits with changes to an identical original package', async () => {
    vi.mocked(inspectCreatorZip).mockResolvedValue(incoming(creatorOriginFixture()));
    render(<ProjectLibrary {...handlers()} />);
    await selectComparison();
    expect(await screen.findByText(/All imported package file bytes match/)).toBeVisible();
  });

  it('cancels without importing and restores focus to the comparison action', async () => {
    const props = handlers();
    render(<ProjectLibrary {...props} />);
    const trigger = await selectComparison();
    await screen.findByRole('region', { name: 'Creator package comparison' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel import' }));
    expect(screen.queryByRole('region', { name: 'Creator package comparison' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(props.onImport).not.toHaveBeenCalled();
  });

  it.each([undefined, { version: 99, retained: 'future receipt' }])('explains unavailable baseline data without changing the project', async origin => {
    const item = source(origin);
    if (origin === undefined) {
      const project = createDefaultProject();
      project.name = item.name;
      item.original = { ...encodeProject(project), localProjectId: item.id, storageRevision: 'original' };
    }
    vi.mocked(listProjects).mockResolvedValue([item]);
    const props = handlers();
    render(<ProjectLibrary {...props} />);
    const card = await screen.findByRole('article', { name: item.name });
    fireEvent.click(within(card).getByText(`Manage ${item.name}`));
    fireEvent.click(within(card).getByRole('button', { name: 'Compare creator package' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/receipt/);
    expect(inspectCreatorZip).not.toHaveBeenCalled();
    expect(props.onImport).not.toHaveBeenCalled();
  });

  it('ignores a cancelled comparison result and resets comparison context on ordinary import', async () => {
    let complete: ((value: ImportedCreatorPackage) => void) | undefined;
    vi.mocked(inspectCreatorZip).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    const props = handlers();
    render(<ProjectLibrary {...props} />);
    await selectComparison();
    await waitFor(() => expect(inspectCreatorZip).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel import' }));
    await act(async () => { complete!(incoming(revision())); });
    expect(screen.queryByRole('region', { name: 'Creator package comparison' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Import creator package'), { target: { files: [new File(['zip'], 'ordinary.zip')] } });
    await screen.findByRole('region', { name: 'Import preview' });
    expect(screen.queryByRole('region', { name: 'Creator package comparison' })).not.toBeInTheDocument();
    expect(props.onImport).not.toHaveBeenCalled();
  });
});
