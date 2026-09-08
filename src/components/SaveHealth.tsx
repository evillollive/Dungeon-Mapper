import { useEffect, useState } from 'react';
import type { DungeonProject } from '../types/map';
import type { SaveState } from '../utils/saveCoordinator';
import { downloadRecoveryData, loadRecoveryRecords, type RecoveryRecord } from '../utils/storage';
import { exportProjectJSON, importProjectJSON } from '../utils/export';

interface Props {
  state: SaveState;
  project: DungeonProject;
  onRetry: () => void;
  original?: unknown;
  onRecover: (project: DungeonProject) => Promise<void>;
}

const LABELS: Record<SaveState['phase'], string> = {
  restoring: 'Restoring device storage',
  unsaved: 'Not saved yet',
  saving: 'Saving',
  saved: 'Saved on this device',
  failed: 'Save failed',
  conflict: 'Save conflict',
  'restore-failed': 'Could not restore your project',
};

export default function SaveHealth({ state, project, onRetry, original, onRecover }: Props) {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [records, setRecords] = useState<RecoveryRecord[] | null>(null);
  const [error, setError] = useState('');
  const [recovering, setRecovering] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const blocked = state.phase === 'restore-failed' || state.phase === 'restoring';
  const failed = ['failed', 'conflict', 'restore-failed'].includes(state.phase);
  const showRecovery = async () => {
    try {
      setRecords(await loadRecoveryRecords());
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not read recovery copies.');
    }
  };
  return (
    <section className={`save-health${failed ? ' save-health-error' : ''}`} aria-label="Device save and recovery">
      <div className="save-health-summary">
        <strong role="status" aria-live="polite">{LABELS[state.phase]}</strong>
        {offline && <span>Offline</span>}
        {!blocked && <button type="button" className="header-btn" onClick={() => {
          try {
            exportProjectJSON(project);
            setError('');
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Could not export the project backup.');
          }
        }}>Export backup</button>}
        {state.phase === 'failed' && <button type="button" className="header-btn" onClick={onRetry}>Retry save</button>}
        {original !== undefined && <button type="button" className="header-btn" onClick={() => downloadRecoveryData(original)}>Download original</button>}
        {state.phase === 'restore-failed' && <button type="button" className="header-btn" onClick={() => window.location.reload()}>Retry restore</button>}
        {state.phase !== 'restoring' && <button type="button" className="header-btn" onClick={() => { void showRecovery(); }}>Recovery copies</button>}
      </div>
      {failed && <p role="alert">{state.message} {blocked ? 'The original record has not been replaced.' : 'Your current work is still in memory. Keep this tab open or export a backup.'}</p>}
      {state.phase !== 'restoring' && <small>Backups include DM-only content. Device saves and local recovery copies are not external backups. Undo is memory-only.</small>}
      {error && <p role="alert">{error}</p>}
      {error && !blocked && <button type="button" className="header-btn"
        onClick={() => downloadRecoveryData(project, 'dungeon-in-memory-recovery.json')}>
        Download raw in-memory recovery data
      </button>}
      {state.phase === 'restore-failed' && original !== undefined && (
        <label>Import recovery file
          <input type="file" accept=".json,application/json" disabled={recovering} onChange={async event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            setRecovering(true);
            try {
              const loaded = await importProjectJSON(file);
              if (window.confirm('Use this recovery project? The unreadable original will be retained on this device. Download it first for an external copy.')) {
                await onRecover(loaded);
                setError('');
              }
            } catch (error) {
              setError(error instanceof Error ? error.message : 'Recovery import failed.');
            } finally {
              setRecovering(false);
            }
          }} />
        </label>
      )}
      {records !== null && (
        <div className="save-recovery-list">
          <p>Download a copy, then import it to recover. Replacement copies retain up to five saved projects; the previous save is also retained.</p>
          {records.length === 0 && <p>No recovery copies are available on this device.</p>}
          {records.map((record, index) => (
            <button className="header-btn" type="button" key={`${record.savedAt}-${index}`}
              onClick={() => downloadRecoveryData(record.data, `dungeon-recovery-${index + 1}.json`)}>
              Download {record.savedAt ? `recovery copy (${new Date(record.savedAt).toLocaleString()})` : 'original localStorage save'}
            </button>
          ))}
          <button className="header-btn" type="button" onClick={() => setRecords(null)}>Close recovery copies</button>
        </div>
      )}
    </section>
  );
}
