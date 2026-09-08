import { useEffect } from 'react';
import type { EditorAction } from '../utils/editorActions';

export function useGlobalShortcuts(actions: EditorAction[], enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const target = event.target;
      if (target instanceof HTMLElement &&
          (target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])') || target.isContentEditable)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      for (const command of actions) {
        if (!command.enabled || !command.binding?.match(event)) continue;
        if (command.binding.preventDefault !== false) event.preventDefault();
        command.action();
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions, enabled]);
}
