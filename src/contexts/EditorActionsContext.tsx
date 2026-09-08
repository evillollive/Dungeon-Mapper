import { createContext, useContext } from 'react';
import type { ActionId, EditorAction } from '../utils/editorActions';

export const EditorActionsContext = createContext<EditorAction[]>([]);

export function useEditorAction(id: ActionId) {
  const actions = useContext(EditorActionsContext);
  const action = actions.find(item => item.id === id);
  if (!action) throw new Error(`Missing editor action: ${id}`);
  return action;
}
