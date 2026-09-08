import { useEffect, useState } from 'react';
import type { DungeonProject } from '../types/map';
import type { SaveState } from '../utils/saveCoordinator';
import { downloadRecoveryData, type RecoveryRecord } from '../utils/storage';
import { projectRecoveryRecords } from '../utils/projectRepository';
import RecoveryManager from './RecoveryManager';
import { exportProjectJSON, importProjectJSON } from '../utils/export';
import { previewFogRepair, type FogRepairPreview } from '../utils/projectSchema';

interface Props {
  projectId?: string;
  onRefreshCheckpoints?: () => Promise<void>;
  state: SaveState;
  project: DungeonProject;
  onRetry: () => void;
  original?: unknown;
  onRecover: (project: DungeonProject, reason?: 'Fog repair') => Promise<void>;
}

const LABELS: Record<SaveState['phase'], string> = {
  restoring: 'Restoring device storage',
  unsaved: 'Not saved yet',
  saving: 'Saving',
  replacing: 'Opening project safely',
  saved: 'Saved on this device',
  failed: 'Save failed',
  conflict: 'Save conflict',
  'restore-failed': 'Could not restore your project',
};

export default function SaveHealth({ state, project, projectId, onRefreshCheckpoints, onRetry, original, onRecover }: Props) {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [records, setRecords] = useState<RecoveryRecord[] | null>(null);
  const [error, setError] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [repair, setRepair] = useState<(FogRepairPreview & { original: unknown }) | null>(null);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const blocked = state.phase === 'restore-failed' || state.phase === 'restoring' || state.restorationBlocked;
  const failed = ['failed', 'conflict', 'restore-failed'].includes(state.phase);
  const showRecovery = async () => {
    try {
      setRecords(await projectRecoveryRecords(projectId));
      await onRefreshCheckpoints?.();
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
        {state.phase === 'restore-failed' && original !== undefined && <button type="button" className="header-btn"
          disabled={recovering} onClick={() => {
            try {
              setRepair({ ...previewFogRepair(original), original });
              setError('');
            } catch (error) {
              setError(error instanceof Error ? error.message : 'Could not prepare a fog repair.');
            }
          }}>Review fog repair</button>}
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
      {repair && <section className="save-repair-preview" aria-label="Fog repair preview">
        <h3>Review fog dimension repair</h3>
        <p>Only fog dimensions change. Added fog cells are covered; added explored cells are unexplored.
          Cells outside the map are excluded from the repaired copy, not from the untouched original.</p>
        <ul>{repair.changes.map(change => <li key={`${change.levelIndex}-${change.layer}`}>
          Level {change.levelIndex + 1}, {change.levelName}: {change.layer} {change.fromWidth} x {change.fromHeight}
          {' to '}{change.toWidth} x {change.toHeight}. {change.addedCells} added, {change.excludedCells} excluded.
        </li>)}</ul>
        <p>The saved project is retained as a local recovery copy on commit. Download the original for an external copy.</p>
        <button className="header-btn" type="button" onClick={() => downloadRecoveryData(repair.original)}>
          Download repair original
        </button>
        <button className="header-btn" type="button" disabled={recovering} onClick={async () => {
          setRecovering(true);
          try {
            await onRecover(repair.project, 'Fog repair');
            setRepair(null);
            setRecords(null);
            setError('');
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Could not save the repaired project.');
          } finally {
            setRecovering(false);
          }
        }}>Use repaired project</button>
        <button className="header-btn" type="button" disabled={recovering} onClick={() => setRepair(null)}>Cancel repair</button>
      </section>}
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
          <RecoveryManager records={records} currentName={project.name}
            disabled={!['saved', 'unsaved', 'restore-failed'].includes(state.phase)}
            onRecover={onRecover} onRefresh={showRecovery} />
          <label>Review a fog repair file
            <input type="file" accept=".json,application/json" disabled={recovering} onChange={async event => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              setRecovering(true);
              try {
                const raw = await file.text();
                setRepair({ ...previewFogRepair(raw), original: raw });
                setError('');
              } catch (error) {
                setError(error instanceof Error ? error.message : 'Could not read the repair file.');
              } finally {
                setRecovering(false);
              }
            }} />
          </label>
          <button className="header-btn" type="button" onClick={() => setRecords(null)}>Close recovery copies</button>
        </div>
      )}
    </section>
  );
}
