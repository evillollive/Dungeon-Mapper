import type { SaveState } from './saveCoordinator';
import type { IconName } from '../assets/interfaceIcons';

export const SAVE_PHASE_ICONS: Record<SaveState['phase'], IconName> = {
  restoring: 'refresh',
  unsaved: 'save',
  saving: 'save',
  replacing: 'refresh',
  saved: 'saved',
  failed: 'warning',
  conflict: 'warning',
  'restore-failed': 'warning',
};

export const SAVE_PHASE_LABELS: Record<SaveState['phase'], string> = {
  restoring: 'Restoring device storage',
  unsaved: 'Not saved yet',
  saving: 'Saving',
  replacing: 'Opening project safely',
  saved: 'Saved on this device',
  failed: 'Save failed',
  conflict: 'Save conflict',
  'restore-failed': 'Could not restore your project',
};
