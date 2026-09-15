import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { gzipSync } from 'node:zlib';
import { FIRST_USE_ILLUSTRATIONS, type FirstUseScene } from '../../assets/firstUseIllustrations';
import { createDefaultProject } from '../../hooks/mapStateUtils';
import FirstUseIllustration from '../FirstUseIllustration';
import ExportDialog from '../ExportDialog';

describe('first-use illustration contract', () => {
  it('retains three original, bounded path-only sources', () => {
    expect(Object.keys(FIRST_USE_ILLUSTRATIONS)).toEqual(['create', 'backup', 'display']);
    for (const layers of Object.values(FIRST_USE_ILLUSTRATIONS)) {
      expect(layers.length).toBeLessThanOrEqual(12);
      for (const layer of layers) expect(layer.d).toMatch(/^[MmLlHhVvCcSsQqTtAaZz\d\s.,-]+$/);
    }
    expect(gzipSync(JSON.stringify(FIRST_USE_ILLUSTRATIONS)).byteLength).toBeLessThan(2500);
  });

  it.each(Object.keys(FIRST_USE_ILLUSTRATIONS) as FirstUseScene[])('keeps %s decorative and independent of user data', scene => {
    const { container } = render(<section aria-label="Existing guidance"><FirstUseIllustration scene={scene} /><p>Guidance remains text.</p></section>);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 240 144');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.querySelector('image, use, text, foreignObject, script, a, animate, [tabindex], [href]')).toBeNull();
    expect(container.querySelectorAll('path')).toHaveLength(FIRST_USE_ILLUSTRATIONS[scene].length);
    expect(screen.getByRole('region')).toHaveTextContent('Guidance remains text.');
  });

  it('keeps the private backup warning and download action alongside artwork', () => {
    const project = createDefaultProject();
    const { container } = render(<ExportDialog map={project.levels[0]} project={project}
      themeId="dungeon" printMode={false} viewMode="gm" initialChoice="backup" onClose={vi.fn()} />);
    expect(container.querySelector('[data-scene="backup"]')).not.toBeNull();
    expect(screen.getByText(/Never send this backup to players/)).toBeInTheDocument();
    expect(screen.getByText(/Keep this file outside browser storage/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download private backup' })).toBeEnabled();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
