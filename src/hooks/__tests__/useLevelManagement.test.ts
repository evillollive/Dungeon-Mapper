import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultMap, createDefaultProject } from '../mapStateUtils';
import { useLevelManagement } from '../useLevelManagement';

type Dependencies = Parameters<typeof useLevelManagement>;
type Actions = ReturnType<typeof useLevelManagement>;

function createDependencies(): Dependencies {
  let project = {
    ...createDefaultProject(),
    levels: [createDefaultMap('First'), createDefaultMap('Second')],
  };
  return [
    vi.fn<Dependencies[0]>(update => {
      project = typeof update === 'function' ? update(project) : update;
    }),
    vi.fn(), 0, vi.fn(), { current: new Map() },
    vi.fn<Dependencies[5]>(() => ({ past: [], future: [] })),
    vi.fn(), vi.fn(), vi.fn(), vi.fn(), 2, vi.fn(() => true),
  ];
}

const actions: [string, (actions: Actions) => void][] = [
  ['switch level', actions => actions.switchLevel(1)],
  ['add level', actions => actions.addLevel('Third')],
  ['rename level', actions => actions.renameLevel(0, 'Renamed')],
  ['delete level', actions => actions.deleteLevel(1)],
  ['duplicate level', actions => actions.duplicateLevel(0)],
  ['reorder levels', actions => actions.reorderLevels(0, 1)],
  ['rename project', actions => actions.setProjectName('Renamed')],
  ['add stair link', actions => actions.addStairLink({
    fromLevel: 0, fromCell: { x: 1, y: 1 }, toLevel: 1, toCell: { x: 2, y: 2 },
  })],
  ['remove stair link', actions => actions.removeStairLink(0, 1, 1)],
];

describe('level management callback lifecycle', () => {
  it.each(actions)('uses the current dispatcher to %s', (_name, run) => {
    const dependencies = createDependencies();
    const oldDispatch = dependencies[0];
    const { result, rerender } = renderHook(
      ({ dependencies }) => useLevelManagement(...dependencies),
      { initialProps: { dependencies } },
    );
    const currentDispatch = vi.fn<Dependencies[0]>();
    const updated: Dependencies = [...dependencies];
    updated[0] = currentDispatch;
    rerender({ dependencies: updated });
    act(() => run(result.current));
    expect(currentDispatch).toHaveBeenCalled();
    expect(oldDispatch).not.toHaveBeenCalled();
  });

  it('refreshes history and ID helpers when switching levels', () => {
    const dependencies = createDependencies();
    const { result, rerender } = renderHook(
      ({ dependencies }) => useLevelManagement(...dependencies),
      { initialProps: { dependencies } },
    );
    const getHistory = vi.fn<Dependencies[5]>(() => ({ past: [], future: [] }));
    const syncIds = vi.fn();
    const updated: Dependencies = [...dependencies];
    updated[5] = getHistory;
    updated[8] = syncIds;
    rerender({ dependencies: updated });
    act(() => result.current.switchLevel(1));
    expect(getHistory).toHaveBeenCalledWith(1);
    expect(syncIds).toHaveBeenCalledWith(expect.objectContaining({ meta: expect.objectContaining({ name: 'Second' }) }));
    expect(dependencies[5]).not.toHaveBeenCalled();
    expect(dependencies[8]).not.toHaveBeenCalled();
  });
});
