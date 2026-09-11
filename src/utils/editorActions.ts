import type { BindingId, KeyBinding } from '../hooks/keyBindings';
import type { ToolType, ViewMode } from '../types/map';

export type EditorPanel = 'build' | 'decorate' | 'look' | 'levels' | 'tactical' | 'notes' | 'encounter' | 'info';
export type ActionId = BindingId | `panel.${EditorPanel}` | `theme.${string}`
  | 'tool.stamp' | 'tool.move-stamp' | 'tool.remove-stamp'
  | 'tool.wall-erase' | 'tool.path-erase' | 'tool.river-erase'
  | 'file.library' | 'file.samples' | 'file.clear' | 'file.recovery'
  | 'dialog.settings' | 'dialog.templates' | 'dialog.customTheme' | 'dialog.export'
  | 'dialog.audience' | 'view.playerPreview' | 'file.playerPng' | 'file.playerSvg' | 'session.prepare';

export const TOOL_ACTIONS: Record<ToolType, ActionId> = {
  paint: 'tool.paint', erase: 'tool.erase', fill: 'tool.fill', note: 'tool.note',
  line: 'tool.line', rect: 'tool.rect', 'room-rect': 'tool.roomRect',
  'room-circle': 'tool.roomCircle', 'room-poly': 'tool.roomPoly', 'room-cut': 'tool.roomCut',
  select: 'tool.select', reveal: 'tool.reveal', hide: 'tool.hide', fov: 'tool.fov',
  measure: 'tool.measure', 'link-stair': 'tool.linkStair', wall: 'tool.wall',
  path: 'tool.path', river: 'tool.river', light: 'tool.light', gmdraw: 'tool.gmdraw',
  gmerase: 'tool.gmerase', 'token-player': 'tool.tokenPlayer', 'token-npc': 'tool.tokenNpc',
  'token-monster': 'tool.tokenMonster', 'token-monster-md': 'tool.tokenMonsterMd',
  'token-monster-lg': 'tool.tokenMonsterLg', 'move-token': 'tool.moveToken',
  'remove-token': 'tool.removeToken', marker: 'tool.marker', 'remove-marker': 'tool.removeMarker',
  'remove-light': 'tool.removeLight', pdraw: 'tool.pdraw', perase: 'tool.perase',
  defog: 'tool.defog', stamp: 'tool.stamp', 'move-stamp': 'tool.move-stamp',
  'remove-stamp': 'tool.remove-stamp', 'wall-erase': 'tool.wall-erase',
  'path-erase': 'tool.path-erase', 'river-erase': 'tool.river-erase',
};

const DM_ONLY = new Set<ActionId>(['tool.pdraw', 'tool.perase', 'tool.defog']);
const BOTH_TOOLS = new Set<ActionId>([
  'tool.reveal', 'tool.hide', 'tool.measure', 'tool.tokenPlayer', 'tool.moveToken', 'tool.removeToken',
  'tool.tokenNpc', 'tool.tokenMonster', 'tool.tokenMonsterMd', 'tool.tokenMonsterLg',
  'tool.fov', 'tool.marker', 'tool.removeMarker', 'tool.light', 'tool.removeLight',
]);

export function actionMode(id: ActionId): 'gm' | 'player' | 'both' {
  if (DM_ONLY.has(id)) return 'player';
  if (id.startsWith('tool.') && !BOTH_TOOLS.has(id)) return 'gm';
  if (id.startsWith('tools.') || id.startsWith('theme.') ||
      ['view.themeNext', 'view.themePrev', 'view.tileNext', 'view.tilePrev',
        'edit.copy', 'edit.cut', 'edit.paste', 'file.generate', 'file.clear',
        'dialog.templates', 'dialog.customTheme', 'dialog.audience', 'panel.build', 'panel.decorate', 'panel.look',
        'panel.info', 'panel.levels'].includes(id)) return 'gm';
  return 'both';
}

export function actionDestination(id: ActionId): string {
  if (id === 'session.prepare') return 'Session';
  if (id === 'dialog.audience' || id === 'view.playerPreview') return 'Audience';
  if (id === 'file.playerPng' || id === 'file.playerSvg') return 'Export';
  if (id.startsWith('panel.')) return id.slice(6);
  if (id.startsWith('theme.') || id.includes('theme') || id === 'view.printMode' || id === 'dialog.customTheme') return 'Look';
  if (id.startsWith('canvas.')) return 'Canvas zoom';
  if (id.includes('uiScale') || id === 'dialog.settings' || id === 'file.clear') return 'Settings';
  if (id.includes('Level') || id === 'tool.linkStair') return 'Levels';
  if (id.startsWith('help.')) return 'Help';
  if (id.includes('export') || id === 'file.printExport' || id === 'dialog.export') return 'Export';
  if (id.startsWith('file.')) return 'Project';
  if (DM_ONLY.has(id) || ['tool.reveal', 'tool.hide', 'tool.fov', 'tool.measure', 'tool.light', 'tool.removeLight'].includes(id)) return 'Fog & sight';
  if (id.includes('token') || id.includes('Token') || id.includes('Stamp') || id.includes('stamp') ||
      id.includes('marker') || id.includes('Marker') || ['tool.note', 'tool.gmdraw', 'tool.gmerase', 'dialog.templates'].includes(id)) return 'Decorate';
  return 'Build';
}

export interface EditorAction {
  id: ActionId;
  label: string;
  category: string;
  shortcut?: string;
  enabled: boolean;
  unavailableReason?: string;
  action: () => void;
  binding?: KeyBinding;
}

export interface ActionState {
  viewMode: ViewMode;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  hasClipboard: boolean;
  hasStamp: boolean;
  canPreviousLevel: boolean;
  canNextLevel: boolean;
  canPrepareSession?: boolean;
}

export type ExtraAction = Pick<EditorAction, 'id' | 'label' | 'action'>;

const LABELS: Partial<Record<ActionId, string>> = {
  'view.viewMode': 'Toggle Edit / DM view',
  'file.new': 'Create map',
  'file.open': 'Import project JSON',
  'file.exportJson': 'Export editable backup (includes DM content)',
  'file.exportPng': 'DM canvas PNG (includes editor overlays)',
  'file.exportSvg': 'DM level SVG (includes private content)',
  'file.printExport': 'Print / high-resolution PNG',
  'file.generate': 'Advanced generator',
  'tool.pdraw': 'Shared drawing (DM operated)',
  'tool.perase': 'Erase shared drawing',
  'tool.defog': 'Defog brush',
  'view.uiScaleUp': 'Increase interface text size',
  'view.uiScaleDown': 'Decrease interface text size',
};

export function buildEditorActions(bindings: KeyBinding[], extras: ExtraAction[], state: ActionState): EditorAction[] {
  const inputs = [
    ...bindings.filter(b => b.id !== 'canvas.pan').map(binding => ({
      id: binding.id, label: LABELS[binding.id] ?? binding.description.split(' \u2014 ')[0],
      action: binding.action, binding, shortcut: binding.keys,
    })),
    ...extras.map(item => ({ ...item, binding: undefined, shortcut: undefined })),
  ];
  return inputs.map(item => {
    const mode = actionMode(item.id);
    let unavailableReason = mode !== 'both' && mode !== state.viewMode
      ? `Available in ${mode === 'gm' ? 'Edit' : 'DM view'}` : undefined;
    if (item.id === 'edit.undo' && !state.canUndo) unavailableReason = 'No action to undo';
    if (item.id === 'edit.redo' && !state.canRedo) unavailableReason = 'No action to redo';
    if (['edit.copy', 'edit.cut'].includes(item.id) && !state.hasSelection) unavailableReason = 'Select a region first';
    if (item.id === 'edit.paste' && !state.hasClipboard) unavailableReason = 'Copy a region first';
    if (item.id.startsWith('tools.') && !state.hasStamp) unavailableReason = 'Select a placed stamp first';
    if (item.id === 'view.nextLevel' && !state.canNextLevel) unavailableReason = 'Already on the last level';
    if (item.id === 'view.prevLevel' && !state.canPreviousLevel) unavailableReason = 'Already on the first level';
    if (item.id === 'session.prepare' && !state.canPrepareSession) unavailableReason = 'Save this project before preparing a session';
    return {
      ...item, category: actionDestination(item.id), enabled: !unavailableReason, unavailableReason,
      action: () => { if (!unavailableReason) item.action(); },
    };
  });
}
