import { useCallback, useEffect, useRef, useState } from 'react';
import type { DungeonProject } from '../types/map';
import { changeLibraryProject, duplicateLibraryProject, listProjects, recordProjectOpened, type LibraryChange, type ProjectStatus, type ProjectSummary } from '../utils/projectRepository';
import { decodeProject } from '../utils/projectSchema';
import { downloadRecoveryData } from '../utils/storage';
import { exportProjectJSON, importProjectJSON } from '../utils/export';
import { renderMapToCanvas } from '../utils/renderMap';
import './ProjectLibrary.css';
import OfflineStatus from './OfflineStatus';

export function ProjectThumbnail({ item }: { item: ProjectSummary }) {
  const [attempt, setAttempt] = useState(0);
  const [image, setImage] = useState('');
  const [caption, setCaption] = useState('Geometry preview');
  const [error, setError] = useState('');
  useEffect(() => {
    const frame = requestAnimationFrame(() => { try {
      const project = decodeProject(item.original);
      const map = project.levels[project.activeLevelIndex];
      if (map.backgroundImage) {
        setImage(map.backgroundImage.dataUrl);
        setCaption('Background reference preview');
        setError('');
        return;
      }
      const canvas = renderMapToCanvas(map, { tileSize: Math.min(12, 360 / Math.max(map.meta.width, map.meta.height)),
        themeId: map.meta.theme ?? 'dungeon', customThemes: project.customThemes, customStamps: project.customStamps });
      const url = canvas.toDataURL();
      if (url === 'data:,') throw new Error('The browser could not create the preview.');
      setImage(url);
      setCaption('Geometry preview. Uploaded image layers may not appear.');
      setError('');
    } catch (error) {
      setImage('');
      setError(error instanceof Error ? error.message : 'Preview could not be rendered.');
    } });
    return () => cancelAnimationFrame(frame);
  }, [item.original, attempt]);
  return <div className="library-thumbnail">
    {image && !error ? <figure><img src={image} alt={`Map preview of ${item.name}`} onError={() => setError('Preview image unavailable. Your saved map is unchanged.')} /><figcaption>{caption}</figcaption></figure>
      : error ? <div><p>Thumbnail unavailable</p><small>{error}</small><button onClick={() => setAttempt(value => value + 1)}>Retry thumbnail</button></div>
        : <p>Rendering thumbnail...</p>}
  </div>;
}

interface Props {
  projectId?: string;
  disabled: boolean;
  onOpen: (id: string) => Promise<void>;
  onCreate: (sampleFirst?: boolean) => void;
  onImport: (project: DungeonProject) => boolean;
  onChangedActive: (id: string) => Promise<void>;
  onDeleted: (id: string) => void;
}

export default function ProjectLibrary({ projectId, disabled, onOpen, onCreate, onImport, onChangedActive, onDeleted }: Props) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState<ProjectSummary | null>(null);
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [candidate, setCandidate] = useState<DungeonProject | null>(null);
  const [reading, setReading] = useState(false);
  const importEpoch = useRef(0);
  const invalidateImport = useCallback(() => { importEpoch.current++; }, []);
  const heading = useRef<HTMLHeadingElement>(null);
  const refresh = async () => { setProjects(await listProjects()); };
  useEffect(() => {
    let cancelled = false;
    listProjects().then(items => { if (!cancelled) setProjects(items); })
      .catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : 'Could not read Your maps.'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    heading.current?.focus();
    return () => { cancelled = true; invalidateImport(); };
  }, [invalidateImport]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await action(); }
    catch (error) { setError(error instanceof Error ? error.message : 'The library action failed. Your source is retained.'); }
    finally { setBusy(false); }
  };
  const change = (item: ProjectSummary, change: LibraryChange) => run(async () => {
    await changeLibraryProject(item, change);
    if ('delete' in change) onDeleted(item.id);
    setEdit(null);
    await refresh();
    if (item.id === projectId && !('delete' in change) && (!('status' in change) || change.status === 'active')) await onChangedActive(item.id);
    heading.current?.focus();
  });
  const visible = projects.filter(item => item.status === status &&
    `${item.name} ${item.tags.join(' ')}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => (b.lastOpenedAt || b.updatedAt).localeCompare(a.lastOpenedAt || a.updatedAt));
  const recent = projects.filter(item => item.status === 'active' && !item.diagnostic)
    .sort((a, b) => (b.lastOpenedAt || b.updatedAt).localeCompare(a.lastOpenedAt || a.updatedAt))[0];
  const locked = busy || disabled || reading;
  return <main className="project-library">
    <header className="library-masthead"><span>DUNGEON MAPPER / LOCAL COLLECTION</span>
      <OfflineStatus blocked={locked} />
      <button disabled={locked} onClick={() => void run(refresh)}>Refresh library</button></header>
    <section className="library-intro">
      <div><p className="library-eyebrow">NEXT ADVENTURE, SAME TABLE</p><h1 ref={heading} tabIndex={-1}>Your maps</h1>
        <p>Stored on this device. Export a backup to keep another copy.</p>
        <p className="library-muted">No account needed. Library search and saved projects work locally. Backups and previews include DM-only content.</p></div>
      <div className="library-actions">
        {recent && <div className="library-continue"><button className="library-primary" disabled={locked} aria-describedby="library-recent-name"
          onClick={() => void run(async () => { await recordProjectOpened(recent.id); await onOpen(recent.id); })}>Continue last map</button>
          <span id="library-recent-name">{recent.name}</span></div>}
        <button className="library-primary" disabled={locked} onClick={() => onCreate()}>Create map</button>
        <button disabled={locked} onClick={() => onCreate(true)}>Open a sample</button>
        <label className={`library-file ${locked ? 'disabled' : ''}`}>Import project
          <input type="file" accept=".json,application/json" aria-label="Import project" disabled={locked} onChange={async event => {
            const file = event.target.files?.[0]; event.target.value = '';
            if (!file) return;
            const epoch = ++importEpoch.current;
            setReading(true); setCandidate(null); setError('');
            try { const loaded = await importProjectJSON(file); if (epoch === importEpoch.current) setCandidate(loaded); }
            catch (error) { if (epoch === importEpoch.current) setError(error instanceof Error ? error.message : 'Import failed.'); }
            finally { if (epoch === importEpoch.current) setReading(false); }
          }} /></label></div>
    </section>
    {disabled && <p role="status">Project actions are paused until your current work is saved. Recovery and backup controls remain above.</p>}
    {error && <p className="library-error" role="alert">{error}</p>}
    {reading && <section aria-label="Reading import"><p>Reading project without changing your work...</p>
      <button onClick={() => { importEpoch.current++; setReading(false); }}>Cancel import</button></section>}
    {candidate && <section className="library-import" aria-label="Import preview">
      <h2>Import {candidate.name}</h2><p>{candidate.levels.length} levels. This makes a new editable project. Existing work is not replaced.</p>
      {candidate.levels.map((level, index) => <p key={index}>{level.meta.name}: {level.meta.width} x {level.meta.height}, {level.notes.length} notes</p>)}
      <button className="library-primary" disabled={locked} onClick={() => { if (onImport(candidate)) setCandidate(null); }}>Import as new project</button>
      <button onClick={() => setCandidate(null)}>Cancel import</button>
    </section>}
    <div className="library-filters">
      <label>Search names and tags<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Crypt, campaign, one-shot..." /></label>
      <div className="library-actions" role="group" aria-label="Project collection">
        {(['active', 'archived', 'trash'] as const).map(value => <button key={value} aria-pressed={status === value}
          onClick={() => { setStatus(value); setEdit(null); }}>{value === 'active' ? 'Recent maps' : value === 'archived' ? 'Archive' : 'Trash'}</button>)}
      </div>
    </div>
    <p role="status">{busy ? 'Reading local projects...' : `${visible.length} ${visible.length === 1 ? 'project' : 'projects'}`}</p>
    {!busy && visible.length === 0 && <section className="library-empty"><h2>{query ? 'No matching maps' : status === 'active' ? 'A new adventure starts here' : 'Nothing here yet'}</h2>
      <p>{query ? 'Try another name or tag, or change the collection filter.' : 'Create a map or import an editable JSON backup. Nothing is automatically deleted.'}</p></section>}
    <div className="library-grid">{visible.map(item => <article className="library-card" key={item.id} aria-label={item.name}>
      <ProjectThumbnail item={item} />
      <div className="library-card-body"><h2>{item.name || 'Untitled project'}</h2>
        <p className="library-muted">{item.id === projectId ? 'Current project. ' : ''}{item.updatedAt ? `Saved ${new Date(item.updatedAt).toLocaleDateString()}` : 'Saved date unavailable'}</p>
        <p>{item.tags.join(' / ') || 'No tags yet'}</p>
        {item.diagnostic && <p role="alert">{item.diagnostic}</p>}
        <div className="library-actions">
          {status === 'active' && <button className="library-primary" disabled={locked || !!item.diagnostic} onClick={() => void run(async () => {
            await recordProjectOpened(item.id); await onOpen(item.id);
          })}>{item.id === projectId ? 'Continue' : 'Open'} {item.name}</button>}
          {status !== 'active' && <button disabled={locked || !!item.diagnostic} onClick={() => void change(item, { status: 'active' })}>Restore {item.name}</button>}
          <button disabled={busy} onClick={() => {
            if (item.diagnostic) downloadRecoveryData(item.original, `project-${item.id}-source.json`);
            else exportProjectJSON(decodeProject(item.original));
          }}>{item.diagnostic ? 'Download retained source' : 'Export backup'}</button>
        </div>
        {!item.diagnostic && <details><summary>Manage {item.name}</summary><div className="library-actions">
          <button disabled={locked} onClick={() => { setEdit(item); setName(item.name); setTags(item.tags.join(', ')); }}>Rename and tags</button>
          <button disabled={locked} onClick={() => void run(async () => {
            const id = await duplicateLibraryProject(item);
            await refresh();
            await onOpen(id);
          })}>Duplicate</button>
          {status === 'active' && <button disabled={locked} onClick={() => void change(item, { status: 'archived' })}>Archive</button>}
          {status !== 'trash' ? <button disabled={locked} onClick={() => {
            if (window.confirm(`Move "${item.name}" to Trash? Restore it any time. No automatic deletion.`)) void change(item, { status: 'trash' });
          }}>Move to Trash</button> : <button className="library-danger" disabled={locked} onClick={() => {
            if (window.confirm(`Permanently delete "${item.name}" and its previous save and all recovery checkpoints? This cannot be undone. Export a backup first. Legacy migration originals, if any, are retained separately.`)) void change(item, { delete: true });
          }}>Delete permanently</button>}
        </div></details>}
        {edit?.id === item.id && <form onSubmit={event => { event.preventDefault(); void change(item, { name, tags: tags.split(',') }); }}>
          <label>Project title<input value={name} onChange={event => setName(event.target.value)} required /></label>
          <label>Tags, separated by commas<input value={tags} onChange={event => setTags(event.target.value)} /></label>
          <button disabled={locked || !name.trim()}>Save name and tags</button><button type="button" onClick={() => setEdit(null)}>Cancel changes</button>
        </form>}
      </div>
    </article>)}</div>
  </main>;
}
