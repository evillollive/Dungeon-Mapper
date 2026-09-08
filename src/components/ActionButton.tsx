import type { ReactNode } from 'react';
import { useEditorAction } from '../contexts/EditorActionsContext';
import type { ActionId } from '../utils/editorActions';
import Icon, { type IconName } from './Icon';

export default function ActionButton({ id, children, icon, pressed, onInvoked }: {
  id: ActionId; children?: ReactNode; icon?: IconName; pressed?: boolean; onInvoked?: () => void;
}) {
  const command = useEditorAction(id);
  return <button type="button" className="action-button" data-action={id}
    disabled={!command.enabled} aria-pressed={pressed}
    title={command.unavailableReason ?? `${command.label}${command.shortcut ? ` [${command.shortcut}]` : ''}`}
    onClick={event => { event.currentTarget.focus(); command.action(); onInvoked?.(); }}>
    {icon && <Icon name={icon} />}
    <span>{children ?? command.label}</span>
  </button>;
}
