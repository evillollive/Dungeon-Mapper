import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreatorShareDialog from '../CreatorShareDialog';
import ProjectLibrary from '../ProjectLibrary';
import { creatorPackageFixture } from '../../test/creatorPackageFixture';
import { prepareCreatorPackage, type PreparedCreatorPackage } from '../../utils/creatorPackage';
import { inspectCreatorZip, inspectCreatorDirectory } from '../../utils/creatorPackageImport';
import { encodeCreatorZip } from '../../utils/creatorZip';
import { creatorSHA256 } from '../../utils/creatorPackageFormat';
import { listProjects } from '../../utils/projectRepository';
import { createDefaultProject } from '../../hooks/mapStateUtils';
import type { DungeonProject } from '../../types/map';

vi.mock('../../utils/creatorPackage', async original => ({
  ...await original<typeof import('../../utils/creatorPackage')>(), prepareCreatorPackage: vi.fn(),
}));
vi.mock('../../utils/creatorZip', () => ({ encodeCreatorZip: vi.fn() }));
vi.mock('../../utils/creatorPackageImport', () => ({ inspectCreatorZip: vi.fn(), inspectCreatorDirectory: vi.fn() }));
vi.mock('../../utils/creatorPackageFormat', async original => ({
  ...await original<typeof import('../../utils/creatorPackageFormat')>(), creatorSHA256: vi.fn(),
}));
vi.mock('../../utils/projectRepository', () => ({ listProjects: vi.fn() }));
vi.mock('../OfflineStatus', () => ({ default: () => null }));

const prepared: PreparedCreatorPackage = {
  manifest: {
    format: 'dungeon-mapper-creator-package', version: 1, packageId: 'shared-map', contentVersion: '1.0.0',
    catalog: 'dungeon-mapper-builtins-2026-09-30', profile: 'layout', title: 'Shared vault',
    author: 'Test creator', description: '', license: 'CC-BY-4.0', levelNames: ['Level 1'], members: [],
  },
  files: [{ path: 'ATTRIBUTION.json', bytes: new TextEncoder().encode('{}') }],
  omissions: [{ path: 'project.privateField', reason: 'unknown-field' }], imageMetadata: [],
};
function fillSelection() {
  fireEvent.change(screen.getByLabelText('Publication title'), { target: { value: 'Shared vault' } });
  fireEvent.change(screen.getByLabelText('Your creator credit'), { target: { value: 'Test creator' } });
  fireEvent.change(screen.getByLabelText('Contribution license'), { target: { value: 'CC-BY-4.0' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review rights and assets' }));
}
beforeEach(() => {
  vi.mocked(prepareCreatorPackage).mockResolvedValue(structuredClone(prepared));
  vi.mocked(encodeCreatorZip).mockResolvedValue(new Uint8Array([1, 2, 3]));
  vi.mocked(creatorSHA256).mockResolvedValue('a'.repeat(64));
  vi.mocked(listProjects).mockResolvedValue([]);
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:creator-test');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.resetAllMocks(); });

describe('creator sharing review', () => {
  it('requires explicit identity, license, rights and exact-copy acknowledgements', async () => {
    const source = creatorPackageFixture(), original = structuredClone(source);
    const view = render(<CreatorShareDialog project={source} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Publication title')).toHaveValue('');
    expect(screen.getByLabelText('Contribution license')).toHaveValue('');
    fillSelection();
    expect(screen.getByRole('button', { name: 'Build exact review copy' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /I have declared inherited sources/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Build exact review copy' }));
    const download = await screen.findByRole('button', { name: 'Download creator ZIP' });
    expect(download).toBeDisabled();
    expect(encodeCreatorZip).not.toHaveBeenCalled();
    expect(prepareCreatorPackage).toHaveBeenCalledWith(original, expect.objectContaining({
      profile: 'layout', license: 'CC-BY-4.0', rightsConfirmed: true,
      levels: expect.arrayContaining([expect.objectContaining({ name: 'Level 1' })]),
    }), expect.any(AbortSignal));
    fireEvent.click(screen.getByRole('checkbox', { name: /I reviewed this exact creator copy/ }));
    fireEvent.click(download);
    await screen.findByText(/Nothing was uploaded/);
    expect(encodeCreatorZip).toHaveBeenCalledTimes(1);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(source).toEqual(original);
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:creator-test');
  });

  it('does not implicitly select private encounter content and clears it when returning to layout', () => {
    render(<CreatorShareDialog project={creatorPackageFixture()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Sharing profile'), { target: { value: 'encounter' } });
    const level = screen.getByRole('group', { name: /Source level 1/ });
    const note = within(level).getByRole('checkbox', { name: /Encounter objective/ });
    expect(note).not.toBeChecked();
    fireEvent.click(note);
    expect(note).toBeChecked();
    fireEvent.change(screen.getByLabelText('Sharing profile'), { target: { value: 'layout' } });
    fireEvent.change(screen.getByLabelText('Sharing profile'), { target: { value: 'encounter' } });
    expect(within(level).getByRole('checkbox', { name: /Encounter objective/ })).not.toBeChecked();
  });

  it('holds controls during cancellation until cleanup completes and permits retry with a fresh controller', async () => {
    let finish: ((value: PreparedCreatorPackage) => void) | undefined;
    vi.mocked(prepareCreatorPackage).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<CreatorShareDialog project={creatorPackageFixture()} onClose={vi.fn()} />);
    fillSelection();
    fireEvent.click(screen.getByRole('checkbox', { name: /I have declared inherited sources/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Build exact review copy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel preparation' }));
    const first = vi.mocked(prepareCreatorPackage).mock.calls[0][2];
    expect(first.aborted).toBe(true);
    expect(screen.getByRole('button', { name: 'Cancellation requested' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Build exact review copy' })).toBeDisabled();
    await act(async () => { finish!(structuredClone(prepared)); });
    await screen.findByText(/Sharing preparation cancelled/);
    expect(screen.queryByRole('button', { name: 'Download creator ZIP' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Build exact review copy' }));
    await screen.findByRole('button', { name: 'Download creator ZIP' });
    expect(vi.mocked(prepareCreatorPackage).mock.calls[1][2]).not.toBe(first);
  });

  it('keeps failed packaging visible and never fabricates a download', async () => {
    vi.mocked(prepareCreatorPackage).mockRejectedValue(new Error('Asset rights are missing'));
    render(<CreatorShareDialog project={creatorPackageFixture()} onClose={vi.fn()} />);
    fillSelection();
    fireEvent.click(screen.getByRole('checkbox', { name: /I have declared inherited sources/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Build exact review copy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Asset rights are missing');
    expect(screen.queryByRole('button', { name: 'Download creator ZIP' })).not.toBeInTheDocument();
  });
});

describe('creator package Library intake', () => {
  const props = () => ({ disabled: false, onOpen: vi.fn().mockResolvedValue(undefined), onCreate: vi.fn(),
    onImport: vi.fn<(project: DungeonProject) => boolean>().mockReturnValue(true),
    onChangedActive: vi.fn().mockResolvedValue(undefined), onDeleted: vi.fn() });
  const imported = () => ({ manifest: structuredClone(prepared.manifest), project: createDefaultProject(),
    previews: [], sourceNotices: [], imageMetadataWarning: 'Original image metadata is retained.' });

  it('previews a verified package but creates nothing until confirmation, with an independent copy', async () => {
    const candidate = imported(), handlers = props();
    vi.mocked(inspectCreatorZip).mockResolvedValue(candidate);
    render(<ProjectLibrary {...handlers} />);
    await screen.findByText('0 projects');
    fireEvent.change(screen.getByLabelText('Import creator package'), { target: { files: [new File(['zip'], 'map.zip')] } });
    await screen.findByRole('region', { name: 'Import preview' });
    expect(handlers.onImport).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Import as new project' }));
    expect(handlers.onImport).toHaveBeenCalledWith(candidate.project);
    expect(handlers.onImport.mock.calls[0][0]).not.toBe(candidate.project);
  });

  it('ignores a late cancelled import result and never changes existing projects', async () => {
    let resolve: ((value: ReturnType<typeof imported>) => void) | undefined;
    vi.mocked(inspectCreatorZip).mockImplementation(() => new Promise(done => { resolve = done; }));
    const handlers = props();
    render(<ProjectLibrary {...handlers} />);
    await screen.findByText('0 projects');
    fireEvent.change(screen.getByLabelText('Import creator package'), { target: { files: [new File(['zip'], 'map.zip')] } });
    await waitFor(() => expect(inspectCreatorZip).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel import' }));
    await act(async () => { resolve!(imported()); });
    expect(screen.queryByRole('region', { name: 'Import preview' })).not.toBeInTheDocument();
    expect(handlers.onImport).not.toHaveBeenCalled();
    expect(vi.mocked(inspectCreatorZip).mock.calls[0][1].aborted).toBe(true);
  });

  it('accepts the explicit folder route without treating its members as private backups', async () => {
    vi.mocked(inspectCreatorDirectory).mockResolvedValue(imported());
    render(<ProjectLibrary {...props()} />);
    await screen.findByText('0 projects');
    const input = screen.getByLabelText('Import creator folder');
    expect(input).toHaveAttribute('webkitdirectory');
    fireEvent.change(input, { target: { files: [new File(['{}'], 'manifest.json')] } });
    await screen.findByRole('region', { name: 'Import preview' });
    expect(inspectCreatorDirectory).toHaveBeenCalledOnce();
    expect(inspectCreatorZip).not.toHaveBeenCalled();
  });

  it('keeps a refused new-project import visible with an actionable retry', async () => {
    vi.mocked(inspectCreatorZip).mockResolvedValue(imported());
    const handlers = props();
    handlers.onImport.mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<ProjectLibrary {...handlers} />);
    await screen.findByText('0 projects');
    fireEvent.change(screen.getByLabelText('Import creator package'), { target: { files: [new File(['zip'], 'map.zip')] } });
    await screen.findByRole('region', { name: 'Import preview' });
    fireEvent.click(screen.getByRole('button', { name: 'Import as new project' }));
    expect(screen.getByRole('alert')).toHaveTextContent('preview is retained');
    expect(screen.getByRole('button', { name: 'Import as new project' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Import as new project' }));
    expect(screen.queryByRole('region', { name: 'Import preview' })).not.toBeInTheDocument();
    expect(handlers.onImport).toHaveBeenCalledTimes(2);
  });
});
