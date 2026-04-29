import type { ToolType } from '../types/map';

/**
 * Single source of truth for all global keyboard shortcuts.
 *
 * Every binding here is consumed by:
 *   1. `useGlobalShortcuts` — to actually listen for the keydown and
 *      dispatch the corresponding action.
 *   2. `ShortcutsHelp` — the in-app overlay that lists what every key
 *      does, grouped by `category`.
 *
 * Adding or renaming a shortcut should be done in exactly one place: the
 * `BUILTIN_BINDINGS` array returned by `buildKeyBindings`. The README and
 * tooltips refer back here so they can never drift apart.
 */

export type ShortcutCategory = 'Tools' | 'View' | 'File' | 'Edit' | 'Canvas' | 'Help';

/**
 * A single keyboard shortcut. `keys` is the user-facing label rendered in
 * the help overlay (e.g. `Ctrl+S`), and `match` is the predicate used by
 * the global handler to decide whether a `KeyboardEvent` should fire this
 * binding's `action`.
 *
 * `preventDefault` defaults to `true` so we don't accidentally let the
 * browser handle e.g. `Ctrl+S` as a save-page action.
 */
export interface KeyBinding {
  id: string;
  category: ShortcutCategory;
  keys: string;
  description: string;
  /**
   * Whether the binding should fire when focus is currently inside an
   * editable element (`<input>`, `<textarea>`, `<select>`,
   * `[contenteditable]`). Default: `false`. Editing-related shortcuts
   * like Undo/Redo and the Escape-on-modal handler set this to `true`.
   */
  fireInEditable?: boolean;
  /**
   * Whether the binding should fire while a modal dialog
   * (`[role="dialog"][aria-modal="true"]`) is open. Default: `false`. The
   * modal owns its own focus trap and should not race with global keys.
   */
  fireInModal?: boolean;
  match: (e: KeyboardEvent) => boolean;
  action: () => void;
  preventDefault?: boolean;
}

/**
 * Action callbacks the registry depends on. Wired in `App.tsx` and passed
 * to `buildKeyBindings` so this module stays free of React state.
 */
export interface ShortcutActions {
  setActiveTool: (tool: ToolType) => void;
  undo: () => void;
  redo: () => void;
  togglePrintMode: () => void;
  toggleViewMode: () => void;
  openGenerateMap: () => void;
  showShortcuts: () => void;
  triggerNewMap: () => void;
  triggerImport: () => void;
  triggerExportJSON: () => void;
  triggerExportPNG: () => void;
  triggerExportSVG: () => void;
  /** Open the print-optimized export dialog (Ctrl+Shift+P). */
  openExportDialog: () => void;
  cycleTheme: (direction: 1 | -1) => void;
  cycleActiveTile: (direction: 1 | -1) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  fitToScreen: () => void;
  uiScaleUp: () => void;
  uiScaleDown: () => void;
  /** Whether the GM toolbar is currently mounted. Tile/theme cycling is
   *  GM-only, so the bindings short-circuit when the player toolbar is
   *  active. */
  isGmView: () => boolean;
  /** Copy the current selection to clipboard (Ctrl+C). */
  copySelection: () => void;
  /** Cut the current selection to clipboard (Ctrl+X). */
  cutSelection: () => void;
  /** Paste clipboard contents at the current selection position (Ctrl+V). */
  pasteClipboard: () => void;
  /** Toggle the FOV / Line-of-Sight tool (O key). */
  toggleFov: () => void;
  /** Cycle to the next dungeon level (PageDown). */
  nextLevel: () => void;
  /** Cycle to the previous dungeon level (PageUp). */
  prevLevel: () => void;
}

const isPlainKey = (e: KeyboardEvent) =>
  !e.ctrlKey && !e.metaKey && !e.altKey;

const isCtrlOrMeta = (e: KeyboardEvent) => e.ctrlKey || e.metaKey;

export function buildKeyBindings(actions: ShortcutActions): KeyBinding[] {
  const tool = (id: string, key: string, label: string, t: ToolType): KeyBinding => ({
    id,
    category: 'Tools',
    keys: key.toUpperCase(),
    description: label,
    match: e => isPlainKey(e) && !e.shiftKey && e.key.toLowerCase() === key.toLowerCase(),
    action: () => actions.setActiveTool(t),
  });

  return [
    // ── Tools ──
    tool('tool.paint',  'p', 'Paint tool',     'paint'),
    tool('tool.erase',  'e', 'Erase tool',     'erase'),
    tool('tool.fill',   'f', 'Flood Fill tool','fill'),
    tool('tool.note',   'n', 'Add Note tool',  'note'),
    tool('tool.line',   'l', 'Line tool',      'line'),
    tool('tool.rect',   'r', 'Rectangle tool', 'rect'),
    tool('tool.select', 's', 'Select tool',    'select'),
    tool('tool.reveal', 'v', 'Reveal fog (drag rectangle)', 'reveal'),
    tool('tool.hide',   'h', 'Hide fog (drag rectangle)',   'hide'),
    {
      id: 'tool.fov',
      category: 'Tools',
      keys: 'O',
      description: 'Line-of-Sight / FOV tool — click a cell to see what is visible from it',
      match: e => isPlainKey(e) && !e.shiftKey && e.key.toLowerCase() === 'o',
      action: actions.toggleFov,
    },
    tool('tool.measure', 'm', 'Measure / Distance tool', 'measure'),
    tool('tool.linkStair', 'k', 'Link Stairs tool — connect stairs between levels', 'link-stair'),
    {
      id: 'tool.light',
      category: 'Tools',
      keys: 'I',
      description: 'Light Source tool — place a light source on a cell (Illuminate)',
      match: e => isPlainKey(e) && !e.shiftKey && e.key.toLowerCase() === 'i',
      action: () => actions.setActiveTool('light'),
    },
    {
      id: 'tool.gmdraw',
      category: 'Tools',
      keys: 'D',
      description: 'GM Draw tool — freehand annotations visible only in Edit mode',
      match: e => isPlainKey(e) && !e.shiftKey && e.key.toLowerCase() === 'd',
      action: () => { if (actions.isGmView()) actions.setActiveTool('gmdraw'); },
    },

    // ── View ──
    {
      id: 'view.printMode',
      category: 'View',
      keys: 'Shift+P',
      description: 'Toggle Print / B&W mode',
      match: e => isPlainKey(e) && e.shiftKey && e.key.toLowerCase() === 'p',
      action: actions.togglePrintMode,
    },
    {
      id: 'view.viewMode',
      category: 'View',
      keys: 'Shift+V',
      description: 'Toggle Edit ↔ Present mode',
      match: e => isPlainKey(e) && e.shiftKey && e.key.toLowerCase() === 'v',
      action: actions.toggleViewMode,
    },
    {
      id: 'view.themeNext',
      category: 'View',
      keys: 'T',
      description: 'Cycle to next theme (Edit mode only)',
      match: e => isPlainKey(e) && !e.shiftKey && e.key.toLowerCase() === 't',
      action: () => { if (actions.isGmView()) actions.cycleTheme(1); },
    },
    {
      id: 'view.themePrev',
      category: 'View',
      keys: 'Shift+T',
      description: 'Cycle to previous theme (Edit mode only)',
      match: e => isPlainKey(e) && e.shiftKey && e.key.toLowerCase() === 't',
      action: () => { if (actions.isGmView()) actions.cycleTheme(-1); },
    },
    {
      id: 'view.tileNext',
      category: 'View',
      keys: ']',
      description: 'Cycle to next tile in palette (Edit mode only)',
      match: e => isPlainKey(e) && e.key === ']',
      action: () => { if (actions.isGmView()) actions.cycleActiveTile(1); },
    },
    {
      id: 'view.tilePrev',
      category: 'View',
      keys: '[',
      description: 'Cycle to previous tile in palette (Edit mode only)',
      match: e => isPlainKey(e) && e.key === '[',
      action: () => { if (actions.isGmView()) actions.cycleActiveTile(-1); },
    },
    {
      id: 'view.uiScaleUp',
      category: 'View',
      keys: 'Ctrl+= / Ctrl++',
      description: 'Increase UI scale',
      // Browsers send `=` for the unshifted key on US layouts (which is
      // visually `+` with shift). Accept both so users can press either.
      match: e => isCtrlOrMeta(e) && !e.altKey && (e.key === '=' || e.key === '+'),
      action: actions.uiScaleUp,
    },
    {
      id: 'view.uiScaleDown',
      category: 'View',
      keys: 'Ctrl+-',
      description: 'Decrease UI scale',
      match: e => isCtrlOrMeta(e) && !e.altKey && (e.key === '-' || e.key === '_'),
      action: actions.uiScaleDown,
    },

    // ── Canvas ──
    {
      id: 'canvas.zoomIn',
      category: 'Canvas',
      keys: '+',
      description: 'Zoom in',
      match: e => isPlainKey(e) && (e.key === '+' || e.key === '='),
      action: actions.zoomIn,
    },
    {
      id: 'canvas.zoomOut',
      category: 'Canvas',
      keys: '-',
      description: 'Zoom out',
      match: e => isPlainKey(e) && (e.key === '-' || e.key === '_'),
      action: actions.zoomOut,
    },
    {
      id: 'canvas.zoomReset',
      category: 'Canvas',
      keys: '0',
      description: 'Reset zoom to 100%',
      match: e => isPlainKey(e) && e.key === '0',
      action: actions.zoomReset,
    },
    {
      id: 'canvas.fit',
      category: 'Canvas',
      keys: '1',
      description: 'Fit map to screen',
      match: e => isPlainKey(e) && e.key === '1',
      action: actions.fitToScreen,
    },
    {
      id: 'canvas.pan',
      category: 'Canvas',
      keys: 'Arrow keys',
      description: 'Pan the canvas (focus the canvas first)',
      // Arrow keys are handled directly on the canvas element via React's
      // onKeyDown so they only fire when the canvas is focused. This entry
      // is purely documentation for the help overlay.
      match: () => false,
      action: () => { /* documentation only */ },
    },

    // ── Edit ──
    {
      id: 'edit.undo',
      category: 'Edit',
      keys: 'Ctrl+Z',
      description: 'Undo (up to 50 steps)',
      fireInEditable: false,
      match: e => isCtrlOrMeta(e) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z',
      action: actions.undo,
    },
    {
      id: 'edit.redo',
      category: 'Edit',
      keys: 'Ctrl+Y / Ctrl+Shift+Z',
      description: 'Redo',
      match: e => isCtrlOrMeta(e) && !e.altKey && (
        e.key.toLowerCase() === 'y' ||
        (e.shiftKey && e.key.toLowerCase() === 'z')
      ),
      action: actions.redo,
    },
    {
      id: 'edit.copy',
      category: 'Edit',
      keys: 'Ctrl+C',
      description: 'Copy selection to clipboard',
      match: e => isCtrlOrMeta(e) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'c',
      action: actions.copySelection,
    },
    {
      id: 'edit.cut',
      category: 'Edit',
      keys: 'Ctrl+X',
      description: 'Cut selection to clipboard',
      match: e => isCtrlOrMeta(e) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'x',
      action: actions.cutSelection,
    },
    {
      id: 'edit.paste',
      category: 'Edit',
      keys: 'Ctrl+V',
      description: 'Paste clipboard at selection / cursor',
      match: e => isCtrlOrMeta(e) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'v',
      action: actions.pasteClipboard,
    },

    // ── File ──
    {
      id: 'file.generate',
      category: 'File',
      keys: 'G',
      description: 'Open Generate Map dialog',
      match: e => isPlainKey(e) && !e.shiftKey && e.key.toLowerCase() === 'g',
      action: () => { if (actions.isGmView()) actions.openGenerateMap(); },
    },
    {
      id: 'file.new',
      category: 'File',
      keys: 'Ctrl+Alt+N',
      description: 'New map (Ctrl+N also works in some browsers)',
      // Some browsers (Chrome, Firefox on Windows/Linux) reserve Ctrl+N
      // for opening a new browser window and won't deliver it to web
      // pages, so Ctrl+Alt+N is the documented alternate. We still try
      // Ctrl+N — it works in Safari and Edge.
      match: e => isCtrlOrMeta(e) && e.key.toLowerCase() === 'n' &&
        (e.altKey || (!e.shiftKey)),
      action: actions.triggerNewMap,
    },
    {
      id: 'file.open',
      category: 'File',
      keys: 'Ctrl+O',
      description: 'Import map from JSON (browser may intercept; use the ↑ Import button as fallback)',
      match: e => isCtrlOrMeta(e) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'o',
      action: actions.triggerImport,
    },
    {
      id: 'file.exportJson',
      category: 'File',
      keys: 'Ctrl+S',
      description: 'Export map as JSON (browser may intercept; use the ↓ JSON button as fallback)',
      match: e => isCtrlOrMeta(e) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 's',
      action: actions.triggerExportJSON,
    },
    {
      id: 'file.exportPng',
      category: 'File',
      keys: 'Ctrl+Shift+S',
      description: 'Export map as PNG image',
      match: e => isCtrlOrMeta(e) && !e.altKey && e.shiftKey && e.key.toLowerCase() === 's',
      action: actions.triggerExportPNG,
    },
    {
      id: 'file.exportSvg',
      category: 'File',
      keys: 'Ctrl+Alt+S',
      description: 'Export map as SVG',
      match: e => isCtrlOrMeta(e) && e.altKey && e.key.toLowerCase() === 's',
      action: actions.triggerExportSVG,
    },
    {
      id: 'file.printExport',
      category: 'File',
      keys: 'Ctrl+Shift+P',
      description: 'Print-optimized export (high-DPI PNG with page tiling)',
      match: e => isCtrlOrMeta(e) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'p',
      action: actions.openExportDialog,
    },

    // ── Help ──
    {
      id: 'help.shortcuts',
      category: 'Help',
      keys: '?',
      description: 'Show keyboard shortcuts',
      match: e => isPlainKey(e) && e.shiftKey && (e.key === '?' || e.key === '/'),
      action: actions.showShortcuts,
    },

    // ── Levels ──
    {
      id: 'view.nextLevel',
      category: 'View',
      keys: 'PageDown',
      description: 'Switch to the next dungeon level',
      match: e => isPlainKey(e) && !e.shiftKey && e.key === 'PageDown',
      action: actions.nextLevel,
    },
    {
      id: 'view.prevLevel',
      category: 'View',
      keys: 'PageUp',
      description: 'Switch to the previous dungeon level',
      match: e => isPlainKey(e) && !e.shiftKey && e.key === 'PageUp',
      action: actions.prevLevel,
    },
  ];
}

/**
 * Public list of static (toolbar/button) shortcut hints, used by `Toolbar`
 * tooltips so the labels stay in sync with the registry without forcing
 * those components to import the full action wiring.
 */
export const TOOL_SHORTCUTS: Record<ToolType, string | undefined> = {
  paint: 'P',
  erase: 'E',
  fill: 'F',
  note: 'N',
  line: 'L',
  rect: 'R',
  select: 'S',
  reveal: 'V',
  hide: 'H',
  defog: undefined,
  pdraw: undefined,
  perase: undefined,
  'token-player': undefined,
  'token-npc': undefined,
  'token-monster': undefined,
  'token-monster-md': undefined,
  'token-monster-lg': undefined,
  'move-token': undefined,
  'remove-token': undefined,
  marker: undefined,
  'remove-marker': undefined,
  fov: 'O',
  measure: 'M',
  light: 'I',
  'remove-light': undefined,
  'link-stair': 'K',
  gmdraw: 'D',
  gmerase: undefined,
};
