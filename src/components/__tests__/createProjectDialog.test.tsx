import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateProjectDialog from '../CreateProjectDialog';
import { PREMADE_MAP_SUMMARIES } from '../../utils/premadeMaps';
import { readTraceImage, renderCreationPreviews } from '../../utils/projectCreation';
import type { TraceImage } from '../../utils/projectCreation';
import type { DungeonProject } from '../../types/map';

vi.mock('../../utils/projectCreation', async importOriginal => ({
  ...await importOriginal<typeof import('../../utils/projectCreation')>(),
  readTraceImage: vi.fn(),
  renderCreationPreviews: vi.fn(),
}));

const previewUrl = 'data:image/png;base64,preview';
const image: TraceImage = { dataUrl: 'data:image/png;base64,local', width: 800, height: 400 };
const choose = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
async function preview() {
  choose('Preview map');
  await screen.findByRole('img');
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(renderCreationPreviews).mockImplementation(async project => project.levels.map(() => previewUrl));
  vi.mocked(readTraceImage).mockResolvedValue(image);
});
afterEach(cleanup);

describe('guided creation', () => {
  it('accepts the explicit sample entry point without opening or creating a project', () => {
    const onCreate = vi.fn();
    render(<CreateProjectDialog initialPath="sample" onCancel={vi.fn()} onCreate={onCreate} />);
    expect(screen.getByRole('button', { name: 'Ready to play' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Ready-to-play sample')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('uses initialPath only on mount and keeps the starting point choices available', () => {
    const props = { onCancel: vi.fn(), onCreate: vi.fn() };
    const { rerender } = render(<CreateProjectDialog {...props} initialPath="blank" />);
    expect(screen.getByRole('button', { name: 'Start blank' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Width (tiles)')).toBeInTheDocument();
    choose('Ready to play');
    rerender(<CreateProjectDialog {...props} initialPath="trace" />);
    expect(screen.getByRole('button', { name: 'Ready to play' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Ready-to-play sample')).toBeInTheDocument();
  });

  it('previews every sample level without touching the editor, then passes distinct content only on confirmation', async () => {
    const onCreate = vi.fn(() => true);
    render(<CreateProjectDialog onCancel={vi.fn()} onCreate={onCreate} />);
    const sample = PREMADE_MAP_SUMMARIES.find(item => item.levelCount > 1)!;
    fireEvent.change(screen.getByLabelText('Ready-to-play sample'), { target: { value: sample.id } });
    await preview();
    expect(onCreate).not.toHaveBeenCalled();
    const candidate = vi.mocked(renderCreationPreviews).mock.calls[0][0];
    expect(candidate.levels).toHaveLength(sample.levelCount);
    fireEvent.change(screen.getByLabelText('Preview level'), { target: { value: '1' } });
    expect(screen.getByRole('img')).toHaveAccessibleName(expect.stringContaining(candidate.levels[1].meta.name));
    choose('Use this map');
    expect(onCreate).toHaveBeenCalledOnce();
    expect(onCreate.mock.calls[0][0]).toEqual(candidate);
    expect(onCreate.mock.calls[0][0]).not.toBe(candidate);
    expect(screen.getByRole('button', { name: 'Use this map' })).toBeDisabled();
  });

  it('shows configurable generator options, all algorithms, and repeatable previews after going back', async () => {
    const onCreate = vi.fn(() => true);
    render(<CreateProjectDialog onCancel={vi.fn()} onCreate={onCreate} />);
    choose('Generate a map');
    fireEvent.change(screen.getByLabelText('Environment / theme'), { target: { value: 'wilderness' } });
    fireEvent.change(screen.getByLabelText('Map size'), { target: { value: '24x18' } });
    fireEvent.change(screen.getByLabelText('Complexity'), { target: { value: '1.4' } });
    fireEvent.click(screen.getByText('Advanced: seed and algorithm'));
    fireEvent.change(screen.getByLabelText('Seed'), { target: { value: 'repeat me' } });
    fireEvent.change(screen.getByLabelText('Algorithm'), { target: { value: 'cavern' } });
    await preview();
    const first = vi.mocked(renderCreationPreviews).mock.calls[0][0];
    expect(first.levels[0].meta).toMatchObject({ width: 24, height: 18, theme: 'wilderness' });
    choose('Back to options');
    expect(screen.getByLabelText('Seed')).toHaveValue('repeat me');
    await preview();
    expect(vi.mocked(renderCreationPreviews).mock.calls[1][0]).toEqual(first);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('creates an adjustable blank map with cloned asset libraries', async () => {
    const source: DungeonProject = {
      name: 'Original', levels: [], activeLevelIndex: 0, stairLinks: [],
      customThemes: [{ id: 'custom-theme:one', name: 'My theme', baseThemeId: 'dungeon', gridColor: '#ffffff', tileColors: {}, tileLabels: {}, customTiles: [] }],
      customStamps: [], sceneTemplates: [],
    };
    const onCreate = vi.fn(() => true);
    render(<CreateProjectDialog onCancel={vi.fn()} onCreate={onCreate} sourceProject={source} />);
    choose('Start blank');
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Quiet garden' } });
    fireEvent.change(screen.getByLabelText('Width (tiles)'), { target: { value: '28' } });
    fireEvent.change(screen.getByLabelText('Height (tiles)'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Environment / theme'), { target: { value: 'custom-theme:one' } });
    await preview();
    choose('Use this map');
    const candidate = onCreate.mock.calls[0][0];
    expect(candidate.name).toBe('Quiet garden');
    expect(candidate.levels[0].meta).toMatchObject({ width: 28, height: 20, theme: 'custom-theme:one' });
    expect(candidate.customThemes).toEqual(source.customThemes);
    expect(candidate.customThemes).not.toBe(source.customThemes);
    expect(candidate.levels[0].tiles.flat().every(tile => tile.type === 'empty')).toBe(true);
  });

  it('holds a full trace reference preview and preserves opacity and alignment', async () => {
    const onCreate = vi.fn(() => true);
    render(<CreateProjectDialog onCancel={vi.fn()} onCreate={onCreate} />);
    choose('Trace an image');
    expect(screen.getByRole('button', { name: 'Preview map' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Background image'), { target: { files: [new File(['pixels'], 'map.png', { type: 'image/png' })] } });
    await screen.findByText(/Image ready/);
    fireEvent.change(screen.getByLabelText('Image opacity: 50%'), { target: { value: '0.7' } });
    await preview();
    expect(screen.getByText(/Reference alignment preview/)).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
    choose('Use this map');
    expect(onCreate.mock.calls[0][0].levels[0].backgroundImage).toEqual({ dataUrl: image.dataUrl, scale: 1.6, offsetX: 0, offsetY: 5, opacity: 0.7 });
  });

  it('shows upload errors and allows choosing the same file again', async () => {
    vi.mocked(readTraceImage).mockRejectedValueOnce(new Error('Choose a PNG, JPEG, or WebP image.'));
    render(<CreateProjectDialog onCancel={vi.fn()} onCreate={vi.fn()} />);
    choose('Trace an image');
    const file = new File(['pixels'], 'map.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Background image'), { target: { files: [file] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a PNG');
    expect(screen.getByRole('button', { name: 'Preview map' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Background image'), { target: { files: [file] } });
    await screen.findByText(/Image ready/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cancels an in-flight upload on path changes and ignores a stale response', async () => {
    const pending = deferred<TraceImage>();
    vi.mocked(readTraceImage).mockReturnValueOnce(pending.promise);
    render(<CreateProjectDialog onCancel={vi.fn()} onCreate={vi.fn()} />);
    choose('Trace an image');
    fireEvent.change(screen.getByLabelText('Background image'), { target: { files: [new File(['a'], 'first.png')] } });
    const signal = vi.mocked(readTraceImage).mock.calls[0][1];
    choose('Start blank');
    expect(signal.aborted).toBe(true);
    await act(async () => { pending.resolve(image); });
    choose('Trace an image');
    expect(screen.queryByText(/Image ready/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview map' })).toBeDisabled();
  });

  it('ignores the earlier upload when a second file wins', async () => {
    const first = deferred<TraceImage>();
    vi.mocked(readTraceImage).mockReturnValueOnce(first.promise);
    render(<CreateProjectDialog onCancel={vi.fn()} onCreate={vi.fn()} />);
    choose('Trace an image');
    fireEvent.change(screen.getByLabelText('Background image'), { target: { files: [new File(['a'], 'first.png')] } });
    fireEvent.change(screen.getByLabelText('Background image'), { target: { files: [new File(['b'], 'second.png')] } });
    await screen.findByText(/Image ready: 800/);
    await act(async () => { first.resolve({ ...image, width: 1234 }); });
    expect(screen.getByText(/Image ready: 800/)).toBeInTheDocument();
  });

  it.each(['Cancel', 'Escape', 'unmount'])('aborts uploads on %s without ever creating a project', async action => {
    const pending = deferred<TraceImage>();
    vi.mocked(readTraceImage).mockReturnValue(pending.promise);
    const onCreate = vi.fn();
    const onCancel = vi.fn();
    const { unmount } = render(<CreateProjectDialog onCancel={onCancel} onCreate={onCreate} />);
    choose('Trace an image');
    fireEvent.change(screen.getByLabelText('Background image'), { target: { files: [new File(['a'], 'pending.png')] } });
    if (action === 'unmount') unmount();
    else if (action === 'Escape') fireEvent.keyDown(document, { key: 'Escape' });
    else choose('Cancel');
    expect(vi.mocked(readTraceImage).mock.calls[0][1].aborted).toBe(true);
    await act(async () => { pending.resolve(image); });
    expect(onCreate).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(action === 'unmount' ? 0 : 1);
  });

  it('disables creation until rendering finishes and offers retry after visible failure', async () => {
    const pending = deferred<string[]>();
    vi.mocked(renderCreationPreviews).mockReturnValueOnce(pending.promise);
    const onCreate = vi.fn();
    render(<CreateProjectDialog onCancel={vi.fn()} onCreate={onCreate} />);
    choose('Preview map');
    expect(screen.getByRole('button', { name: 'Use this map' })).toBeDisabled();
    await act(async () => { pending.reject(new Error('Canvas unavailable')); });
    expect(screen.getByRole('alert')).toHaveTextContent('Canvas unavailable');
    choose('Use this map');
    expect(onCreate).not.toHaveBeenCalled();
    choose('Retry preview');
    await screen.findByRole('img');
    expect(screen.getByRole('button', { name: 'Use this map' })).toBeEnabled();
  });

  it('keeps an unmodified candidate after the parent rejects or throws during creation', async () => {
    const onCreate = vi.fn((project: DungeonProject) => { project.name = 'Parent mutation'; return false; });
    render(<CreateProjectDialog onCancel={vi.fn()} onCreate={onCreate} />);
    await preview();
    const original = structuredClone(vi.mocked(renderCreationPreviews).mock.calls[0][0]);
    choose('Use this map');
    expect(screen.getByRole('alert')).toHaveTextContent('not opened');
    onCreate.mockImplementationOnce(() => { throw new Error('Blocked'); });
    choose('Use this map');
    expect(screen.getByRole('alert')).toHaveTextContent('could not be opened');
    onCreate.mockReturnValueOnce(true);
    choose('Use this map');
    expect(onCreate.mock.calls[2][0]).toEqual(original);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('discards stale rendering after returning to options', async () => {
    const pending = deferred<string[]>();
    vi.mocked(renderCreationPreviews).mockReturnValueOnce(pending.promise);
    render(<CreateProjectDialog onCancel={vi.fn()} onCreate={vi.fn()} />);
    choose('Preview map');
    choose('Back to options');
    expect(vi.mocked(renderCreationPreviews).mock.calls[0][1].aborted).toBe(true);
    await act(async () => { pending.resolve([previewUrl]); });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview map' })).toBeEnabled();
  });

  it('blocks creation if the encoded preview cannot be displayed, with a working retry', async () => {
    const onCreate = vi.fn();
    render(<CreateProjectDialog onCancel={vi.fn()} onCreate={onCreate} />);
    await preview();
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('alert')).toHaveTextContent('could not be displayed');
    expect(screen.getByRole('button', { name: 'Use this map' })).toBeDisabled();
    choose('Retry preview');
    await screen.findByRole('img');
    expect(screen.getByRole('button', { name: 'Use this map' })).toBeEnabled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('cancels a preview without committing and aborts preview work on unmount', async () => {
    const onCreate = vi.fn();
    const onCancel = vi.fn();
    const { unmount } = render(<CreateProjectDialog onCancel={onCancel} onCreate={onCreate} />);
    await preview();
    choose('Cancel');
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onCreate).not.toHaveBeenCalled();
    unmount();
    expect(vi.mocked(renderCreationPreviews).mock.calls[0][1].aborted).toBe(true);
  });

  it('traps focus, skips collapsed advanced controls, and restores the opener', async () => {
    const user = userEvent.setup();
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const { unmount } = render(<CreateProjectDialog onCancel={vi.fn()} onCreate={vi.fn()} />);
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(cancel).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Preview map' })).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    choose('Generate a map');
    screen.getByText('Advanced: seed and algorithm').focus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Preview map' })).toHaveFocus();
    opener.focus();
    expect(cancel).toHaveFocus();
    await preview();
    await waitFor(() => expect(screen.getByRole('heading', { level: 3 })).toHaveFocus());
    await user.tab();
    expect(cancel).toHaveFocus();
    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });
});
