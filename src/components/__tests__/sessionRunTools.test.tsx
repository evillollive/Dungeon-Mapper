import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SessionWorkspace from '../SessionWorkspace';
import { createDefaultProject } from '../../hooks/mapStateUtils';
import { readRecord } from '../../utils/storage';
import { loadSession, newSession, saveSession, type SessionRecord } from '../../utils/sessionRepository';
import type { DungeonMap } from '../../types/map';

vi.mock('../../utils/storage', async importOriginal => ({
  ...await importOriginal<typeof import('../../utils/storage')>(),
  readRecord: vi.fn(),
}));
vi.mock('../../utils/sessionRepository', async importOriginal => ({
  ...await importOriginal<typeof import('../../utils/sessionRepository')>(),
  loadSession: vi.fn(),
  saveSession: vi.fn(),
}));

class TestPointerEvent extends MouseEvent {
  pointerId: number;
  constructor(type: string, init: PointerEventInit) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}
const SIZE = 12, PIXELS = 20;

/** A fogged 12 x 12 level: a wall down column 6 and one party token at 2, 2. */
function session(): SessionRecord {
  const project = createDefaultProject();
  const level = project.levels[0];
  level.meta.width = SIZE;
  level.meta.height = SIZE;
  level.tiles = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, (_, x) => ({ type: x === 6 ? 'wall' as const : 'floor' as const })));
  level.fogEnabled = true;
  level.fog = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => true));
  level.tokens = [{ id: 1, x: 2, y: 2, kind: 'player', label: 'Scout' }];
  level.notes = [];
  return newSession(project, 'p1', 'r1');
}

async function renderRun() {
  const record = session();
  vi.mocked(readRecord).mockResolvedValue(record);
  vi.mocked(loadSession).mockResolvedValue(record);
  vi.mocked(saveSession).mockImplementation(async next => ({ ...next, storageRevision: crypto.randomUUID() }));
  render(<SessionWorkspace sessionId={record.id} sourceId={null} />);
  await screen.findByRole('main', { name: 'DM Run workspace' });
  return screen.getByRole('img', { name: /^Private DM map/ });
}
const tool = (name: string) => fireEvent.click(screen.getByRole('button', { name, exact: true }));
const pointer = (canvas: HTMLElement, type: string, x: number, y: number) =>
  fireEvent(canvas, new TestPointerEvent(type, { bubbles: true, button: 0, clientX: x * PIXELS + 5, clientY: y * PIXELS + 5 }));
const click = (canvas: HTMLElement, x: number, y: number) => {
  pointer(canvas, 'pointerdown', x, y);
  pointer(canvas, 'pointerup', x, y);
  fireEvent.click(canvas, { clientX: x * PIXELS + 5, clientY: y * PIXELS + 5 });
};
const drag = (canvas: HTMLElement, from: [number, number], to: [number, number]) => {
  pointer(canvas, 'pointerdown', ...from);
  pointer(canvas, 'pointermove', ...to);
  pointer(canvas, 'pointerup', ...to);
  fireEvent.click(canvas, { clientX: to[0] * PIXELS + 5, clientY: to[1] * PIXELS + 5 });
};
const savedLevel = async (count: number): Promise<DungeonMap> => {
  await waitFor(() => expect(saveSession).toHaveBeenCalledTimes(count));
  await screen.findByText('Session saved on this device.');
  return vi.mocked(saveSession).mock.calls[count - 1][0].progress.project.levels[0];
};
const overlay = (name: string) => document.querySelector(`.session-overlay [data-overlay="${name}"]`);
const notice = (text: string | RegExp) => expect(screen.getAllByRole('status').some(item =>
  typeof text === 'string' ? item.textContent?.includes(text) : text.test(item.textContent ?? ''))).toBe(true);

describe('Run table tools', () => {
  beforeEach(() => {
    vi.stubGlobal('PointerEvent', TestPointerEvent);
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, width: SIZE * PIXELS, height: SIZE * PIXELS, left: 0, top: 0, right: SIZE * PIXELS, bottom: SIZE * PIXELS, toJSON() {},
    });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.resetAllMocks(); });

  it('wipes fog cell by cell with the defog brush in one undoable action', async () => {
    const canvas = await renderRun();
    tool('Defog brush');
    pointer(canvas, 'pointerdown', 1, 1);
    pointer(canvas, 'pointermove', 4, 1);
    expect(overlay('brush')).toBeInTheDocument();
    expect(saveSession).not.toHaveBeenCalled();
    pointer(canvas, 'pointermove', 4, 3);
    pointer(canvas, 'pointerup', 4, 3);
    const level = await savedLevel(1);
    const cleared = level.fog!.flatMap((row, y) => row.flatMap((hidden, x) => hidden ? [] : [`${x},${y}`]));
    expect(cleared.sort()).toEqual(['1,1', '2,1', '3,1', '4,1', '4,2', '4,3'].sort());
    expect(overlay('brush')).not.toBeInTheDocument();
    notice('Brushed fog off 6 cells');
    fireEvent.click(screen.getByRole('button', { name: 'Undo session map action' }));
    expect((await savedLevel(2)).fog!.every(row => row.every(Boolean))).toBe(true);
  });

  it('keeps the two-click distance measure and adds private circle, cone and line shapes', async () => {
    const canvas = await renderRun();
    tool('Measure');
    click(canvas, 0, 0);
    notice('Measure start: 0, 0');
    click(canvas, 3, 4);
    notice('Distance: 5.00 cells');
    notice('4 squares (20 ft)');
    expect(overlay('measure')).toHaveAttribute('d', 'M0.5 0.5L3.5 4.5');
    for (const [value, label] of [['circle', 'Circle'], ['cone', 'Cone'], ['line', 'Line']]) {
      fireEvent.change(screen.getByLabelText('Measure shape'), { target: { value } });
      expect(overlay('measure')).not.toBeInTheDocument();
      drag(canvas, [2, 2], [5, 2]);
      notice(`${label} template from 2, 2`);
      notice('3 squares (15 ft)');
      expect(overlay('measure')).toHaveClass(`is-${value}`);
    }
    fireEvent.change(screen.getByLabelText('Feet per cell'), { target: { value: '10' } });
    drag(canvas, [2, 2], [2, 6]);
    notice('4 squares (40 ft)');
    tool('Reveal');
    expect(overlay('measure')).not.toBeInTheDocument();
    expect(saveSession).not.toHaveBeenCalled();
  });

  it('shows line of sight from a cell without changing the session', async () => {
    const canvas = await renderRun();
    tool('Line of sight');
    click(canvas, 2, 2);
    // The wall column is lit; nothing behind it is.
    const visible = SIZE * 7;
    notice(`Line of sight from 2, 2: ${visible} of ${SIZE * SIZE} cells`);
    expect(overlay('sight')).toHaveAttribute('d', Array.from({ length: SIZE }, (_, y) => `M0 ${y}h7v1h-7Z`).join(''));
    expect(overlay('sight-origin')).toBeInTheDocument();
    click(canvas, 2, 2);
    expect(overlay('sight')).not.toBeInTheDocument();
    expect(saveSession).not.toHaveBeenCalled();
  });

  it('places, removes and clears area markers as session map actions', async () => {
    const canvas = await renderRun();
    tool('Place marker');
    fireEvent.change(screen.getByLabelText('Marker shape'), { target: { value: 'square' } });
    fireEvent.change(screen.getByLabelText('Marker color'), { target: { value: '#3b82f6' } });
    fireEvent.change(screen.getByLabelText('Marker radius'), { target: { value: '2' } });
    click(canvas, 8, 8);
    expect((await savedLevel(1)).markers).toEqual([{ id: 1, x: 8, y: 8, shape: 'square', color: '#3b82f6', size: 2 }]);
    notice('Marker placed at 8, 8');
    click(canvas, 3, 9);
    expect((await savedLevel(2)).markers).toHaveLength(2);
    tool('Remove marker');
    click(canvas, 0, 0);
    notice('No marker covers 0, 0');
    click(canvas, 9, 9);
    expect((await savedLevel(3)).markers).toEqual([expect.objectContaining({ id: 2, x: 3, y: 9 })]);
    fireEvent.click(screen.getByRole('button', { name: 'Clear all markers' }));
    expect((await savedLevel(4)).markers).toEqual([]);
    expect(screen.getByRole('button', { name: 'Clear all markers' })).toBeDisabled();
  });

  it('turns dynamic fog on and off and forgets explored areas', async () => {
    await renderRun();
    const toggle = screen.getByRole('checkbox', { name: /^Dynamic fog/ });
    expect(toggle).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Forget explored areas' })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    const on = await savedLevel(1);
    expect(on.dynamicFogEnabled).toBe(true);
    expect(on.explored![2][2]).toBe(true);
    expect(on.explored![2][9]).toBe(false);
    expect(screen.getByRole('checkbox', { name: /^Dynamic fog/ })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Forget explored areas' }));
    await savedLevel(2);
    fireEvent.click(screen.getByRole('checkbox', { name: /^Dynamic fog/ }));
    expect((await savedLevel(3)).dynamicFogEnabled).toBe(false);
    notice('Dynamic fog off');
  });

  it('applies every new tool from the keyboard cell fields', async () => {
    await renderRun();
    const apply = (x: number, y: number) => {
      fireEvent.change(screen.getByLabelText('Cell X'), { target: { value: String(x) } });
      fireEvent.change(screen.getByLabelText('Cell Y'), { target: { value: String(y) } });
      fireEvent.click(screen.getByRole('button', { name: 'Apply to cell' }));
    };
    tool('Defog brush');
    apply(3, 3);
    expect((await savedLevel(1)).fog![3][3]).toBe(false);
    tool('Line of sight');
    apply(2, 2);
    expect(overlay('sight')).toBeInTheDocument();
    tool('Measure');
    fireEvent.change(screen.getByLabelText('Measure shape'), { target: { value: 'cone' } });
    apply(1, 1);
    apply(1, 5);
    notice('Cone template from 1, 1');
    tool('Place marker');
    apply(4, 4);
    expect((await savedLevel(2)).markers).toHaveLength(1);
  });
});
