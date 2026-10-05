import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { DungeonProject } from '../types/map';
import { changeLibraryProject, duplicateLibraryProject, listProjects, recordProjectOpened, type LibraryChange, type ProjectStatus, type ProjectSummary } from '../utils/projectRepository';
import { decodeProject } from '../utils/projectSchema';
import { downloadRecoveryData } from '../utils/storage';
import { exportProjectJSON, importProjectJSON } from '../utils/export';
import { renderMapToCanvas } from '../utils/renderMap';
import './ProjectLibrary.css';
import OfflineStatus from './OfflineStatus';
import Icon from './Icon';
import FirstUseIllustration from './FirstUseIllustration';
import LibraryOverview from './LibraryOverview';
import type { ImportedCreatorPackage } from '../utils/creatorPackageImport';
import { CREATOR_PACKAGE_LIMITS } from '../utils/creatorProject';
import { compareCreatorPackageOrigins, readCreatorPackageOrigin,
  type CreatorPackageOrigin, type CreatorPackageComparison as PackageComparison } from '../utils/creatorPackageOrigin';
import CreatorPackageComparison from './CreatorPackageComparison';

const CreatorShareDialog = lazy(() => import('./CreatorShareDialog'));
const CreatorPreviewImages = lazy(() => import('./CreatorShareDialog').then(module => ({ default: module.CreatorPreviewImages })));

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
  saveHealth?: ReactNode;
  saveNeedsAttention?: boolean;
  projectId?: string;
  disabled: boolean;
  onOpen: (id: string) => Promise<void>;
  onCreate: (sampleFirst?: boolean) => void;
  onImport: (project: DungeonProject) => boolean;
  onChangedActive: (id: string) => Promise<void>;
  onDeleted: (id: string) => void;
}
interface ComparisonTarget { name: string; origin: CreatorPackageOrigin }

export default function ProjectLibrary({ projectId, disabled, onOpen, onCreate, onImport, onChangedActive, onDeleted, saveHealth, saveNeedsAttention }: Props) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState<ProjectSummary | null>(null);
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [candidate, setCandidate] = useState<DungeonProject | null>(null);
  const [creatorCandidate, setCreatorCandidate] = useState<ImportedCreatorPackage | null>(null);
  const [creatorPreviewFailed, setCreatorPreviewFailed] = useState(false);
  const [comparison, setComparison] = useState<{ name: string; value: PackageComparison } | null>(null);
  const [sharing, setSharing] = useState<DungeonProject | null>(null);
  const [reading, setReading] = useState(false);
  const importEpoch = useRef(0);
  const creatorImportController = useRef<AbortController | null>(null);
  const comparisonInput = useRef<HTMLInputElement | null>(null);
  const comparisonTarget = useRef<ComparisonTarget | null>(null);
  const comparisonReturnFocus = useRef<HTMLButtonElement | null>(null);
  const invalidateImport = useCallback(() => { importEpoch.current++; creatorImportController.current?.abort(); }, []);
  const heading = useRef<HTMLHeadingElement>(null);
  const entryHeading = useRef<HTMLHeadingElement>(null);
  const refresh = async () => { setProjects(await listProjects()); };
  useEffect(() => {
    let cancelled = false;
    listProjects().then(items => { if (!cancelled) setProjects(items); })
      .catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : 'Could not read Your maps.'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    entryHeading.current?.focus({ preventScroll: true });
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
  const readCreator = async (files: File[], directory = false, target?: ComparisonTarget) => {
    if (!files.length) return;
    const epoch = ++importEpoch.current;
    creatorImportController.current?.abort();
    const job = new AbortController(); creatorImportController.current = job;
    setReading(true); setCandidate(null); setCreatorCandidate(null); setCreatorPreviewFailed(false); setComparison(null); setError('');
    try {
      if (!directory && files[0].size > CREATOR_PACKAGE_LIMITS.zipBytes) throw new Error('Creator ZIP downloads must not exceed 32 MiB.');
      const { inspectCreatorZip, inspectCreatorDirectory } = await import('../utils/creatorPackageImport');
      job.signal.throwIfAborted();
      const loaded = directory ? await inspectCreatorDirectory(files, job.signal)
        : await inspectCreatorZip(new Uint8Array(await files[0].arrayBuffer()), job.signal);
      if (epoch === importEpoch.current && !job.signal.aborted) {
        if (target) setComparison({ name: target.name,
          value: compareCreatorPackageOrigins(target.origin, loaded.project.creatorPackageOrigin) });
        setCandidate(loaded.project); setCreatorCandidate(loaded);
      }
    } catch (error) {
      if (epoch === importEpoch.current && !job.signal.aborted) setError(error instanceof Error ? error.message : 'Creator package import failed. No project was changed.');
    } finally {
      if (epoch === importEpoch.current) { setReading(false); creatorImportController.current = null; }
    }
  };
  return <main className="project-library">
    <input ref={comparisonInput} type="file" accept=".zip,application/zip" hidden aria-label="Compare creator package file"
      onChange={event => {
        const file = event.target.files?.[0], target = comparisonTarget.current;
        event.target.value = ''; comparisonTarget.current = null;
        if (file && target) void readCreator([file], false, target);
      }} />
    <header className="library-masthead"><h1 ref={entryHeading} tabIndex={-1}>Dungeon Mapper</h1>
      {recent && <div className="library-continue"><button className="library-primary" disabled={locked} aria-describedby="library-recent-name"
        onClick={() => void run(async () => { await recordProjectOpened(recent.id); await onOpen(recent.id); })}><Icon name="play" /> Continue last map</button>
        <span id="library-recent-name">{recent.name}</span></div>}
      <OfflineStatus blocked={locked} />
      <button disabled={locked} onClick={() => void run(refresh)}>Refresh library</button></header>
    <div className="library-entry">
      <LibraryOverview disabled={locked} onCreate={onCreate} />
      {saveHealth && <div className={saveNeedsAttention ? 'library-save-attention' : 'library-save'}>{saveHealth}</div>}
    </div>
    <section className="library-intro" id="your-maps" tabIndex={-1}>
      <div><p className="library-eyebrow">NEXT ADVENTURE, SAME TABLE</p><h2 ref={heading} tabIndex={-1}>Your maps</h2>
        <p>Stored on this device. Export a backup to keep another copy.</p>
        <p className="library-muted">No account needed. Library search and saved projects work locally. Backups and previews include DM-only content.</p></div>
      <div className="library-actions">
        <button className="library-primary" disabled={locked} onClick={() => onCreate()}><Icon name="create" /> Create map</button>
        <button disabled={locked} onClick={() => onCreate(true)}><Icon name="image" /> Open a sample</button>
        <label className={`library-file ${locked ? 'disabled' : ''}`}><span className="icon-label"><Icon name="import" />Import project</span>
          <input type="file" accept=".json,application/json" aria-label="Import project" disabled={locked} onChange={async event => {
            const file = event.target.files?.[0]; event.target.value = '';
            if (!file) return;
            const epoch = ++importEpoch.current;
            creatorImportController.current?.abort();
            setReading(true); setCandidate(null); setCreatorCandidate(null); setComparison(null); setError('');
            try { const loaded = await importProjectJSON(file); if (epoch === importEpoch.current) setCandidate(loaded); }
            catch (error) { if (epoch === importEpoch.current) setError(error instanceof Error ? error.message : 'Import failed.'); }
            finally { if (epoch === importEpoch.current) setReading(false); }
          }} /></label>
        <label className={`library-file ${locked ? 'disabled' : ''}`}><span>Import creator package</span>
          <input type="file" accept=".zip,application/zip" aria-label="Import creator package" disabled={locked} onChange={event => {
            const file = event.target.files?.[0]; event.target.value = '';
            if (file) void readCreator([file]);
          }} /></label>
        <label className={`library-file ${locked ? 'disabled' : ''}`}><span>Import creator folder</span>
          <input type="file" multiple aria-label="Import creator folder" disabled={locked}
            ref={element => { element?.setAttribute('webkitdirectory', ''); }}
            onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void readCreator(files, true); }} /></label></div>
    </section>
    {disabled && <p role="status">Project actions are paused until your current work is saved. Recovery and backup controls remain above.</p>}
    {error && <p className="library-error" role="alert">{error}</p>}
    {reading && <section aria-label="Reading import"><p>Reading project without changing your work...</p>
      <button onClick={() => { invalidateImport(); setReading(false); }}>Cancel import</button></section>}
    {candidate && <section className="library-import" aria-label="Import preview">
      <h2>Import {candidate.name}</h2><p>{candidate.levels.length} levels. This makes a new editable project. Existing work is not replaced.</p>
      {candidate.levels.map((level, index) => <p key={index}>{level.meta.name}: {level.meta.width} x {level.meta.height}, {level.notes.length} notes</p>)}
      {comparison && <CreatorPackageComparison comparison={comparison.value} name={comparison.name} />}
      {creatorCandidate && <>
        <p><strong>Creator copy, not a player-safe display.</strong> {creatorCandidate.manifest.profile === 'encounter' ? 'Includes selected DM encounter material.' : 'Includes the full map layout, including secret geometry.'}</p>
        <p>By {creatorCandidate.manifest.author} / {creatorCandidate.manifest.license} / version {creatorCandidate.manifest.contentVersion}</p>
        <p>{creatorCandidate.manifest.description}</p><p>{creatorCandidate.imageMetadataWarning}</p>
        <Suspense fallback={<p role="status">Opening creator previews...</p>}><CreatorPreviewImages files={creatorCandidate.previews}
          onError={message => { setCreatorPreviewFailed(true); setError(message); }} /></Suspense>
        <details><summary>Inherited source notices</summary>{creatorCandidate.sourceNotices.map((source, index) => <p key={index}>
          {source.title} / {source.author} / {source.license}<br />{source.url}<br />{source.notice}</p>)}</details>
      </>}
      <button className="library-primary" disabled={locked || (creatorCandidate !== null && creatorPreviewFailed)}
        onClick={() => {
          try {
            if (onImport(structuredClone(candidate))) { setCandidate(null); setCreatorCandidate(null); setComparison(null); }
            else setError('The new project was not opened. Your preview is retained. Resolve the save/recovery warning, then try again.');
          } catch (error) { setError(error instanceof Error ? error.message : 'The new project could not be opened. Your preview is retained.'); }
        }}>Import as new project</button>
      <button onClick={() => {
        setCandidate(null); setCreatorCandidate(null); setComparison(null);
        if (comparison) {
          if (comparisonReturnFocus.current?.isConnected) comparisonReturnFocus.current.focus();
          else heading.current?.focus();
        }
      }}>Cancel import</button>
    </section>}
    <div className="library-filters">
      <label>Search names and tags<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Crypt, campaign, one-shot..." /></label>
      <div className="library-actions" role="group" aria-label="Project collection">
        {(['active', 'archived', 'trash'] as const).map(value => <button key={value} aria-pressed={status === value}
          onClick={() => { setStatus(value); setEdit(null); }}>{value === 'active' ? 'Recent maps' : value === 'archived' ? 'Archive' : 'Trash'}</button>)}
      </div>
    </div>
    <p role="status">{busy ? 'Reading local projects...' : `${visible.length} ${visible.length === 1 ? 'project' : 'projects'}`}</p>
    {!busy && visible.length === 0 && <section className="library-empty">
      {!query && status === 'active' && !error && <FirstUseIllustration scene="create" />}
      <div><h2>{query ? 'No matching maps' : status === 'active' ? 'A new adventure starts here' : 'Nothing here yet'}</h2>
        <p>{query ? 'Try another name or tag, or change the collection filter.' : 'Create a map or import an editable JSON backup. Nothing is automatically deleted.'}</p></div>
    </section>}
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
          {!item.diagnostic && <button disabled={locked} onClick={() => {
            try { setSharing(decodeProject(item.original)); }
            catch (error) { setError(error instanceof Error ? error.message : 'The saved sharing source could not be read.'); }
          }}>Share a creator copy</button>}
        </div>
        {!item.diagnostic && <details><summary>Manage {item.name}</summary><div className="library-actions">
          <button disabled={locked} onClick={event => {
            try {
              const origin = readCreatorPackageOrigin(decodeProject(item.original).creatorPackageOrigin);
              if (!origin) throw new Error('This map has no saved original creator-package receipt. Import the original ZIP as a separate project before comparing versions.');
              comparisonTarget.current = { name: item.name, origin };
              comparisonReturnFocus.current = event.currentTarget;
              setError('');
              comparisonInput.current?.click();
            } catch (error) { setError(error instanceof Error ? error.message : 'The original creator-package receipt could not be read.'); }
          }}>Compare creator package</button>
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
    {sharing && <Suspense fallback={<p role="status">Opening creator sharing...</p>}>
      <CreatorShareDialog project={sharing} onClose={() => setSharing(null)} />
    </Suspense>}
  </main>;
}
