import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { gzipSync } from 'node:zlib';
import { INTERFACE_ICON_PATHS } from '../../assets/interfaceIcons';
import { SAVE_PHASE_ICONS, SAVE_PHASE_LABELS } from '../../utils/saveStatus';
import type { SaveState } from '../../utils/saveCoordinator';
import { createDefaultProject } from '../../hooks/mapStateUtils';
import Icon from '../Icon';
import SaveHealth from '../SaveHealth';

describe('original interface icon family', () => {
  it('keeps 32 distinct, lightweight SVG sources without external assets', () => {
    const paths = Object.values(INTERFACE_ICON_PATHS);
    expect(paths).toHaveLength(32);
    expect(new Set(paths).size).toBe(32);
    for (const path of paths) expect(path).toMatch(/^[MmLlHhVvCcSsQqTtAaZz\d\s.,-]+$/);
    expect(gzipSync(JSON.stringify(INTERFACE_ICON_PATHS)).byteLength).toBeLessThan(3000);
  });

  it.each([16, 20, 24] as const)('scales %s-unit icons with text without changing control names', size => {
    const { container } = render(<button><Icon name="create" size={size} />Create map</button>);
    expect(screen.getByRole('button', { name: 'Create map' })).toHaveAccessibleName('Create map');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('width', `${size / 16}em`);
    expect(svg).toHaveAttribute('height', `${size / 16}em`);
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).not.toHaveAttribute('tabindex');
    expect(svg?.querySelector('path')).toHaveAttribute('d', INTERFACE_ICON_PATHS.create);
  });

  it.each(Object.keys(SAVE_PHASE_LABELS) as SaveState['phase'][])('preserves the %s save meaning', phase => {
    const project = createDefaultProject();
    render(<SaveHealth state={{ phase }} project={project} onRetry={vi.fn()} onRecover={vi.fn()} />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(SAVE_PHASE_LABELS[phase]);
    expect(status.querySelector('svg')).toHaveAttribute('data-icon', SAVE_PHASE_ICONS[phase]);
    expect(SAVE_PHASE_ICONS[phase] === 'saved').toBe(phase === 'saved');
  });
});
