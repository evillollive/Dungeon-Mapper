import { useState } from 'react';
import { listProjects, type ProjectSummary } from '../utils/projectRepository';
import { downloadRecoveryData } from '../utils/storage';

interface Props {
  projectId?: string;
  name: string;
  disabled: boolean;
  locked: boolean;
  unavailable?: boolean;
  onRename: (name: string) => void;
  onSwitch: (id: string) => Promise<void>;
}

export default function ProjectChooser({ projectId, name, disabled, locked, unavailable, onRename, onSwitch }: Props) {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <section className="project-chooser" aria-label="Local projects">
    {unavailable
      ? <p>Open another saved project without changing the unavailable project or its retained sources.</p>
      : <label>Project name <input aria-label="Project name" value={name} disabled={locked}
        onChange={event => onRename(event.target.value)} /></label>}
    <button className="header-btn" disabled={busy} onClick={async () => {
      setBusy(true);
      try { setProjects(await listProjects()); setError(''); }
      catch (error) { setError(error instanceof Error ? error.message : 'Could not read local projects.'); }
      finally { setBusy(false); }
    }}>Switch project</button>
    {error && <p role="alert">{error}</p>}
    {projects !== null && <div className="project-choices">
      <p>New, imported, and sample projects are separate device copies. Switching clears memory undo, not saved projects.</p>
      {projects.length === 0 && <p>No committed projects yet.</p>}
      {projects.filter(item => item.status === 'active').map(item => <div className="project-choice" key={item.id}>
        <strong>{item.name || 'Untitled project'}</strong>
        <small>{item.id === projectId ? 'Current project' : item.id} {item.updatedAt && ` | ${new Date(item.updatedAt).toLocaleString()}`}</small>
        {item.diagnostic && <p role="alert">{item.diagnostic} Source retained. Download includes private content.</p>}
        <button className="header-btn" disabled={disabled || busy || item.id === projectId || !!item.diagnostic}
          onClick={async () => {
            setBusy(true);
            try { await onSwitch(item.id); setProjects(null); setError(''); }
            catch (error) { setError(error instanceof Error ? error.message : 'Project switch failed.'); }
            finally { setBusy(false); }
          }}>Open {item.name || 'Untitled project'}</button>
        <button className="header-btn" onClick={() => downloadRecoveryData(item.original, `project-${item.id}.json`)}>Download retained source</button>
      </div>)}
      <small>Downloads include DM-only content. There is no project deletion in this chooser.</small>
      <button className="header-btn" disabled={busy} onClick={() => setProjects(null)}>Close projects</button>
    </div>}
  </section>;
}
