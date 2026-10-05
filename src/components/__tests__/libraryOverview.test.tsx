import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LibraryOverview from '../LibraryOverview';

describe('Library overview', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('explains the product and routes its starting actions without creating a project itself', () => {
    const onCreate = vi.fn();
    render(<LibraryOverview disabled={false} onCreate={onCreate} />);
    expect(screen.getByRole('heading', { name: 'Make battle maps that look great fast.' })).toBeVisible();
    expect(screen.getByRole('img')).toHaveAccessibleName(/Lantern Crypt/);
    expect(screen.getByRole('list')).toHaveAccessibleName('From first draft to the table');
    fireEvent.click(screen.getByRole('button', { name: 'Explore a sample' }));
    expect(onCreate).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Create a map' }));
    expect(onCreate).toHaveBeenLastCalledWith();
    expect(screen.getByRole('link', { name: 'Go to your maps' })).toHaveAttribute('href', '#your-maps');
  });

  it('remembers explicit collapse and reopening, keeping focus on the overview control', () => {
    const props = { disabled: false, onCreate: vi.fn() };
    const first = render(<LibraryOverview {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse overview' }));
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Explore a sample' })).not.toBeInTheDocument();
    first.unmount();
    const second = render(<LibraryOverview {...props} />);
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    expect(screen.getByRole('button', { name: 'Collapse overview' })).toHaveFocus();
    second.unmount();
    render(<LibraryOverview {...props} />);
    expect(screen.getByRole('button', { name: 'Explore a sample' })).toBeVisible();
  });

  it('keeps preference controls available while project actions are locked', () => {
    const onCreate = vi.fn();
    render(<LibraryOverview disabled onCreate={onCreate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Explore a sample' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create a map' }));
    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Collapse overview' })).toBeEnabled();
  });

  it('reports unavailable preference storage without blocking the overview', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<LibraryOverview disabled={false} onCreate={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('could not be read');
    fireEvent.click(screen.getByRole('button', { name: 'Collapse overview' }));
    expect(screen.getByRole('status')).toHaveTextContent('only apply to this visit');
    expect(screen.getByRole('button', { name: 'Overview' })).toBeEnabled();
  });
});
