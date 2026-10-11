import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SessionWorkspace from '../SessionWorkspace';
import { createDefaultProject } from '../../hooks/mapStateUtils';
import { loadProject } from '../../utils/projectRepository';
import { listSessions } from '../../utils/sessionRepository';

vi.mock('../../utils/projectRepository', () => ({ loadProject: vi.fn() }));
vi.mock('../../utils/sessionRepository', async importOriginal => ({
  ...await importOriginal<typeof import('../../utils/sessionRepository')>(),
  listSessions: vi.fn(),
}));

function projectWithFog(fogEnabled: boolean) {
  const project = createDefaultProject();
  project.levels[0].fogEnabled = fogEnabled;
  return project;
}

async function renderPrepare(fogEnabled: boolean) {
  vi.mocked(loadProject).mockResolvedValue({ project: projectWithFog(fogEnabled), revision: 'r1', projectId: 'p1' });
  vi.mocked(listSessions).mockResolvedValue([]);
  render(<SessionWorkspace sessionId={null} sourceId="p1" />);
  await screen.findByRole('heading', { name: 'Set the table' });
  await screen.findByText(/Starting visibility:/);
}

afterEach(() => vi.resetAllMocks());

describe('Prepare session fog safety', () => {
  it('warns that the whole level is visible when fog is off and links to fog controls in Edit', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, href: 'http://localhost/?prepare=p1', assign });
    await renderPrepare(false);
    expect(screen.getByText('Whole level visible. Fog is off.')).toBeVisible();
    expect(screen.queryByText('A starting area is visible.')).not.toBeInTheDocument();
    expect(screen.getByRole('note', { name: 'Fog is off for this level.' })).toBeVisible();
    expect(screen.getByLabelText(/players will see the whole level when I show it/)).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Start session' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Turn on fog in Edit' }));
    const target = new URL(String(assign.mock.calls[0][0]));
    expect(Object.fromEntries(target.searchParams)).toEqual({ project: 'p1', panel: 'tactical' });
    vi.unstubAllGlobals();
  });

  it('does not show the fog-off warning when fog is enabled', async () => {
    await renderPrepare(true);
    expect(screen.queryByRole('note', { name: 'Fog is off for this level.' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Manual-fog play is intentional/)).toBeInTheDocument();
  });
});
