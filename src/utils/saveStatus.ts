import type { SaveState } from './saveCoordinator';

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
