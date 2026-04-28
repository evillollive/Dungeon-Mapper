import { useEffect, useMemo, useRef } from 'react';
import type { KeyBinding, ShortcutActions } from './keyBindings';
import { buildKeyBindings } from './keyBindings';

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (EDITABLE_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  return false;
}

function isModalOpen(): boolean {
  return document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
}

/**
 * Single global `keydown` listener that owns every app-wide shortcut.
 *
 * The listener skips bindings when:
 *   - The user is typing in an editable element (`<input>`, `<textarea>`,
 *     `<select>`, `[contenteditable]`), unless the binding opts in via
 *     `fireInEditable`.
 *   - A modal dialog is open (`[role="dialog"][aria-modal="true"]`),
 *     unless the binding opts in via `fireInModal`. The modal is
 *     responsible for its own Escape/Enter handling.
 *
 * `actions` is captured once via a ref so the bindings (and therefore the
 * `keydown` listener) don't need to rebind on every render. Each binding
 * dispatches through the ref so it always sees the latest closure.
 *
 * @returns The active `KeyBinding[]` so the help overlay can render the
 *   same list the listener is using.
 */
export function useGlobalShortcuts(actions: ShortcutActions): KeyBinding[] {
  // Keep a ref to the latest actions so binding callbacks invoked from the
  // `keydown` handler always see the freshest closure without rebuilding
  // the binding list (and therefore the listener) on every render. The
  // ref is updated in an effect so the assignment never happens during
  // render itself.
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  });

  const bindings = useMemo<KeyBinding[]>(() => {
    // The dispatch object is captured into the binding closures once.
    // Each method calls through `actionsRef.current` at invocation time
    // (i.e. when the user presses the key), never during render.
    /* eslint-disable react-hooks/refs -- the dispatch wrapper is built
       during render, but each method defers reading `actionsRef.current`
       until invocation time inside the keydown handler. Building the
       wrapper once keeps the global keydown listener stable across
       renders. */
    const dispatch: ShortcutActions = {
      setActiveTool:    t => actionsRef.current.setActiveTool(t),
      undo:             () => actionsRef.current.undo(),
      redo:             () => actionsRef.current.redo(),
      togglePrintMode:  () => actionsRef.current.togglePrintMode(),
      toggleViewMode:   () => actionsRef.current.toggleViewMode(),
      openGenerateMap:  () => actionsRef.current.openGenerateMap(),
      showShortcuts:    () => actionsRef.current.showShortcuts(),
      triggerNewMap:    () => actionsRef.current.triggerNewMap(),
      triggerImport:    () => actionsRef.current.triggerImport(),
      triggerExportJSON:() => actionsRef.current.triggerExportJSON(),
      triggerExportPNG: () => actionsRef.current.triggerExportPNG(),
      triggerExportSVG: () => actionsRef.current.triggerExportSVG(),
      openExportDialog:() => actionsRef.current.openExportDialog(),
      cycleTheme:       d => actionsRef.current.cycleTheme(d),
      cycleActiveTile:  d => actionsRef.current.cycleActiveTile(d),
      zoomIn:           () => actionsRef.current.zoomIn(),
      zoomOut:          () => actionsRef.current.zoomOut(),
      zoomReset:        () => actionsRef.current.zoomReset(),
      fitToScreen:      () => actionsRef.current.fitToScreen(),
      uiScaleUp:        () => actionsRef.current.uiScaleUp(),
      uiScaleDown:      () => actionsRef.current.uiScaleDown(),
      isGmView:         () => actionsRef.current.isGmView(),
      copySelection:    () => actionsRef.current.copySelection(),
      cutSelection:     () => actionsRef.current.cutSelection(),
      pasteClipboard:   () => actionsRef.current.pasteClipboard(),
      toggleFov:        () => actionsRef.current.toggleFov(),
    };
    return buildKeyBindings(dispatch);
    /* eslint-enable react-hooks/refs */
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const editable = isEditableTarget(e.target);
      const modal = isModalOpen();
      for (const b of bindings) {
        if (editable && !b.fireInEditable) continue;
        if (modal && !b.fireInModal) continue;
        if (!b.match(e)) continue;
        if (b.preventDefault !== false) {
          e.preventDefault();
        }
        b.action();
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [bindings]);

  return bindings;
}
