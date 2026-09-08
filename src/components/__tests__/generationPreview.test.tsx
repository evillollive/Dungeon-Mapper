import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GenerateHub from '../GenerateHub';
import { renderMapToCanvas } from '../../utils/renderMap';

vi.mock('../../utils/renderMap', () => ({ renderMapToCanvas: vi.fn() }));

describe('existing advanced generation preview', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(renderMapToCanvas).mockReturnValue({ toDataURL: () => 'data:image/png;base64,preview' } as HTMLCanvasElement);
  });
  it('does not commit until Use this map and preserves seeded output when returning to options', () => {
    const onGenerate = vi.fn();
    render(<GenerateHub themeId="dungeon" initialWidth={16} initialHeight={16} hasExistingContent
      onCancel={vi.fn()} onGenerate={onGenerate} onLoadProject={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Seed'), { target: { value: 'ux02-seed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate', exact: true }));
    expect(screen.getByRole('region', { name: 'Generated map preview' })).toBeInTheDocument();
    expect(onGenerate).not.toHaveBeenCalled();
    const first = vi.mocked(renderMapToCanvas).mock.calls.at(-1)![0];
    fireEvent.click(screen.getByRole('button', { name: 'Back to options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate', exact: true }));
    expect(vi.mocked(renderMapToCanvas).mock.calls.at(-1)![0].tiles).toEqual(first.tiles);
    fireEvent.click(screen.getByRole('button', { name: 'Use this map' }));
    expect(onGenerate).toHaveBeenCalledOnce();
    expect(onGenerate.mock.calls[0][0].tiles).toEqual(first.tiles);
    expect(onGenerate.mock.calls[0][2]).toBeUndefined();
  });
  it('cancels a generated preview without committing it', () => {
    const onCancel = vi.fn();
    const onGenerate = vi.fn();
    render(<GenerateHub themeId="dungeon" initialWidth={16} initialHeight={16} hasExistingContent
      onCancel={onCancel} onGenerate={onGenerate} onLoadProject={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onGenerate).not.toHaveBeenCalled();
  });
});
