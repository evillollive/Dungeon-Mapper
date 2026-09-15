import { INTERFACE_ICON_PATHS, type IconName } from '../assets/interfaceIcons';
import './Icon.css';

export type { IconName } from '../assets/interfaceIcons';

export default function Icon({ name, size = 20 }: { name: IconName; size?: 16 | 20 | 24 }) {
  return <svg className="ui-icon" data-icon={name} width={`${size / 16}em`} height={`${size / 16}em`}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={INTERFACE_ICON_PATHS[name]} />
  </svg>;
}
