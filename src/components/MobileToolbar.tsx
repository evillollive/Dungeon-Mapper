import { useContext, useState } from 'react';
import { EditorActionsContext } from '../contexts/EditorActionsContext';
import { ActionMenu } from './MapHeader';
import ActionButton from './ActionButton';
import type { ToolType, ViewMode } from '../types/map';
import { TOOL_ACTIONS } from '../utils/editorActions';

export default function MobileToolbar({ viewMode, activeTool }: { viewMode: ViewMode; activeTool: ToolType }) {
  const commands = useContext(EditorActionsContext);
  const [open, setOpen] = useState(false);
  const tools = viewMode === 'gm' ? ['tool.paint', 'tool.select'] as const : ['tool.pdraw', 'tool.defog'] as const;
  return <div className="shell-mobile-tools">
    {tools.map(id => <ActionButton key={id} id={id} pressed={TOOL_ACTIONS[activeTool] === id}>
      {id === 'tool.paint' ? 'Paint' : id === 'tool.select' ? 'Select' : id === 'tool.pdraw' ? 'Draw' : 'Defog'}
    </ActionButton>)}
    <ActionButton id="edit.undo" icon="undo">Undo</ActionButton>
    <button type="button" onClick={event => { event.currentTarget.focus(); setOpen(true); }}>All actions</button>
    {open && <ActionMenu title="All actions" onClose={() => setOpen(false)}
      ids={commands.map(command => command.id)} />}
  </div>;
}
