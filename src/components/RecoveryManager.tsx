import { useState } from 'react';
import type { DungeonProject } from '../types/map';
import { decodeProject } from '../utils/projectSchema';
import { deleteCheckpoint } from '../utils/projectRepository';
import { downloadRecoveryData, type RecoveryRecord } from '../utils/storage';

interface Props {
  records: RecoveryRecord[];
  currentName: string;
  disabled: boolean;
  onRecover: (project: DungeonProject) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export default function RecoveryManager({ records, currentName, disabled, onRecover, onRefresh }: Props) {
  const [preview, setPreview] = useState<{ project: DungeonProject; record: RecoveryRecord } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inspect = (record: RecoveryRecord) => {
    try {
      if (record.diagnostic) throw new Error(record.diagnostic);
      const raw = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;
      setPreview({ project: decodeProject(raw), record });
      setError('');
    } catch (error) {
      setPreview(null);
      setError(error instanceof Error ? error.message : 'Invalid recovery data. Download the retained source.');
    }
  };
  return <section aria-label="Recovery manager" className="recovery-manager">
    <p>Preview restores the whole project into <strong>{currentName || 'the current project'}</strong>, not just one level.
      The current committed predecessor is retained on restore. Cancel writes nothing.</p>
    <p>Up to 20 durable checkpoints per project are kept until explicitly deleted. At the limit, checkpoint saves stop rather than evict a copy.
      The previous-save slot rotates on ordinary saves. Legacy archives remain downloadable. Undo is memory-only.</p>
    {error && <p role="alert">{error} The source has not been changed.</p>}
    {records.length === 0 && <p>No recovery copies are available on this device.</p>}
    {records.map((record, index) => <div className="recovery-entry" key={`${record.id ?? index}-${record.savedAt}`}>
      <strong>{record.reason ?? 'Recovery copy'}</strong>
      <small>{record.savedAt ? new Date(record.savedAt).toLocaleString() : 'Original source, timestamp unavailable'}</small>
      {record.diagnostic && <p>{record.diagnostic}</p>}
      <button className="header-btn" disabled={busy} onClick={() => inspect(record)}>Preview copy {index + 1}</button>
      <button className="header-btn" onClick={() => downloadRecoveryData(record.data, `dungeon-recovery-${index + 1}.json`)}>Download copy {index + 1}</button>
      {record.id && record.projectId && <button className="header-btn" disabled={busy} onClick={async () => {
        if (!window.confirm('Permanently delete this checkpoint only? Download it first for an external backup. The current project and other copies are not deleted.')) return;
        setBusy(true);
        try {
          await deleteCheckpoint(record.projectId!, record.id!, record.data);
          setPreview(null);
          await onRefresh();
          setError('');
        } catch (error) { setError(error instanceof Error ? error.message : 'Checkpoint deletion failed.'); }
        finally { setBusy(false); }
      }}>Delete checkpoint {index + 1}</button>}
    </div>)}
    <label>Preview a recovery file <input type="file" accept=".json,application/json" disabled={busy}
      onChange={async event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setBusy(true);
        try { inspect({ savedAt: '', reason: file.name, data: await file.text() }); }
        catch (error) { setError(error instanceof Error ? error.message : 'Could not read recovery file.'); }
        finally { setBusy(false); }
      }} /></label>
    {preview && <section aria-label="Recovery preview" className="save-repair-preview">
      <h3>{preview.project.name || 'Untitled project'}</h3>
      <p>Source: {preview.record.reason ?? 'Recovery copy'}. All {preview.project.levels.length} levels and project assets replace the current contents.
        Local project identity stays unchanged. This private preview includes DM-only content.</p>
      <p>Source scope: {preview.record.projectId ? `local project ${preview.record.projectId}` : 'legacy archive or imported file'}.
        {' '}Saved {preview.record.savedAt ? new Date(preview.record.savedAt).toLocaleString() : 'at an unknown time'}.</p>
      <table><thead><tr><th>Level</th><th>Dimensions</th><th>Notes</th><th>Tokens</th></tr></thead>
        <tbody>{preview.project.levels.map((level, index) => <tr key={index}>
          <td>{index + 1}. {level.meta.name}</td><td>{level.meta.width} x {level.meta.height}</td>
          <td>{level.notes.length}</td><td>{level.tokens?.length ?? 0}</td>
        </tr>)}</tbody></table>
      <p>{preview.project.customThemes?.length ?? 0} custom themes, {preview.project.customStamps?.length ?? 0} custom stamps,
        {' '}{preview.project.sceneTemplates?.length ?? 0} scene templates. Memory undo resets after restore.</p>
      <button className="header-btn" onClick={() => downloadRecoveryData(preview.record.data)}>Download preview source</button>
      <button className="header-btn" disabled={busy || disabled} onClick={async () => {
        setBusy(true);
        try {
          await onRecover(preview.project);
          setPreview(null);
          setError('');
          await onRefresh();
        } catch (error) { setError(error instanceof Error ? error.message : 'Restore did not commit.'); }
        finally { setBusy(false); }
      }}>Restore whole project</button>
      <button className="header-btn" disabled={busy} onClick={() => setPreview(null)}>Cancel preview</button>
    </section>}
  </section>;
}
