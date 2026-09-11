import type { PropsWithChildren } from 'react';
import { EditorActionsContext } from '../contexts/EditorActionsContext';
import type { ActionId, EditorAction, EditorPanel } from '../utils/editorActions';
import { TOOL_ACTIONS } from '../utils/editorActions';
import { buildKeyBindings, type ShortcutActions } from '../hooks/keyBindings';

export function shortcutFixture(onCall: (name: string, ...args: unknown[]) => void = () => {}, gm = true): ShortcutActions {
  return {
    setActiveTool: tool => onCall('tool', tool),
    undo: () => onCall('undo'), redo: () => onCall('redo'),
    togglePrintMode: () => onCall('print'), toggleViewMode: () => onCall('mode'),
    openGenerateMap: () => onCall('generate'), showShortcuts: () => onCall('help'),
    triggerNewMap: () => onCall('new'), triggerImport: () => onCall('import'),
    triggerExportJSON: () => onCall('json'), triggerExportPNG: () => onCall('png'),
    triggerExportSVG: () => onCall('svg'), openExportDialog: () => onCall('export'),
    cycleTheme: dir => onCall('theme', dir), cycleActiveTile: dir => onCall('tile', dir),
    zoomIn: () => onCall('zoomIn'), zoomOut: () => onCall('zoomOut'),
    zoomReset: () => onCall('zoomReset'), fitToScreen: () => onCall('fit'),
    uiScaleUp: () => onCall('scaleUp'), uiScaleDown: () => onCall('scaleDown'),
    isGmView: () => gm, copySelection: () => onCall('copy'), cutSelection: () => onCall('cut'),
    pasteClipboard: () => onCall('paste'), toggleFov: () => onCall('fov'),
    nextLevel: () => onCall('next'), prevLevel: () => onCall('previous'),
    rotateStampCW: () => onCall('rotate'), flipStampH: () => onCall('flipH'),
    flipStampV: () => onCall('flipV'), deleteStamp: () => onCall('delete'),
    openCommandPalette: () => onCall('palette'),
  };
}

export const panelIds: EditorPanel[] = ['build', 'decorate', 'look', 'levels', 'tactical', 'notes', 'encounter', 'info'];
export const extraIds: ActionId[] = [
  'file.library', 'file.samples', 'file.clear', 'file.recovery', 'dialog.settings',
  'dialog.templates', 'dialog.customTheme', 'dialog.export', 'dialog.audience', 'view.playerPreview', 'file.playerPng', 'file.playerSvg', 'session.prepare',
  ...panelIds.map(panel => `panel.${panel}` as const),
];
export function EditorFixture({ children, onAction = () => {} }: PropsWithChildren<{ onAction?: (id: ActionId) => void }>) {
  const ids = [...new Set([...buildKeyBindings(shortcutFixture()).map(binding => binding.id), ...Object.values(TOOL_ACTIONS), ...extraIds])];
  const actions: EditorAction[] = ids.map(id => ({
    id, label: id, category: 'Test', enabled: true, action: () => onAction(id),
  }));
  return <EditorActionsContext.Provider value={actions}>{children}</EditorActionsContext.Provider>;
}
