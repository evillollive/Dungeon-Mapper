import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DungeonMap } from '../types/map';
import { loadProject } from '../utils/projectRepository';
import { downloadRecoveryData, readRecord, type LoadedProject } from '../utils/storage';
import { endSession, listSessions, loadSession, MAX_SESSION_CHECKPOINTS, newSession, saveSession,
  SessionHistory, stepTurn, type SessionRecord } from '../utils/sessionRepository';
import { projectForAudience } from '../utils/audienceProjection';
import { renderMapToCanvas } from '../utils/renderMap';
import { useLocalDisplay } from '../hooks/useLocalDisplay';
import { deriveRenderableTiles } from '../utils/derivedRenderMap';
import { computePlayerFOV, mergeExplored } from '../utils/dynamicFog';
import { computeLightVisible } from '../utils/lightSources';
import PlayerPreview from './PlayerPreview';
import '../player-preview.css';
import '../session-workspace.css';

function navigate(params: Record<string, string>) {
  const url = new URL(window.location.href);
  url.search = new URLSearchParams(params).toString();
  window.location.assign(url);
}
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'The operation failed. Download recovery before leaving.';

export default function SessionWorkspace({ sessionId, sourceId }: { sessionId: string | null; sourceId: string | null }) {
  const [loaded, setLoaded] = useState<SessionRecord | null>(null);
  const [source, setSource] = useState<LoadedProject | null>(null);
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof listSessions>>>([]);
  const [error, setError] = useState('');
  const [original, setOriginal] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [preview, setPreview] = useState(false);
  const startLock = useRef(false);
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        if (sessionId) {
          const raw = await readRecord(`session:${sessionId}`);
          if (!cancelled) setOriginal(raw);
          const session = await loadSession(sessionId);
          if (!cancelled) setLoaded(session);
        } else if (sourceId) {
          const project = await loadProject(sourceId);
          const records = await listSessions(sourceId);
          if (!cancelled) { setSource(project); setSessions(records); }
        } else throw new Error('No source map selected. Return to Your maps and open a project.');
      } catch (failure) { if (!cancelled) setError(errorMessage(failure)); }
    };
    void restore();
    return () => { cancelled = true; };
  }, [sessionId, sourceId]);
  if (loaded) return <RunSession initial={loaded} />;
  const project = source?.project;
  const map = project?.levels[project.activeLevelIndex];
  const projection = map && projectForAudience(map, project?.customThemes, project?.customStamps);
  return <main className="session-workspace prepare-workspace">
    <header className="session-heading">
      <div><p className="session-eyebrow">PREPARE / LOCAL SESSION</p><h1>Set the table</h1></div>
      <button onClick={() => navigate(sourceId ? { project: sourceId } : { view: 'library' })}>Return to Edit</button>
    </header>
    {error && <section className="session-error" role="alert"><p>{error}</p>
      <button onClick={() => window.location.reload()}>Retry loading</button>
      {original !== undefined && <button onClick={() => downloadRecoveryData(original, 'session-original-recovery.json')}>Download retained session</button>}
    </section>}
    {!project && !error && <p role="status">Loading saved map and sessions...</p>}
    {project && map && projection && <>
      <section className="session-card">
        <p className="session-eyebrow">SOURCE MAP</p><h2>{project.name}</h2>
        <p>Start from the saved revision of {map.meta.name}. Session actions save separately. Your authored geometry stays untouched.</p>
        <ul className="prepare-checklist">
          <li><strong>Starting visibility:</strong> {projection.map.fog?.every(row => row.every(Boolean)) ? 'No known starting area. Reveal in Run before sharing.' : 'A starting area is visible.'}</li>
          <li><strong>Party sight:</strong> {(map.tokens ?? []).some(t => t.kind === 'player' && !t.hidden) ? 'Party sight source present.' : 'No visible party sight source. Manual reveal is available.'}</li>
          <li><strong>Fog policy:</strong> {!map.fogEnabled ? 'Fog is off. All geography is visible.' : map.dynamicFogEnabled ? 'Dynamic sight and exploration.' : 'Manual reveal only.'}</li>
          <li><strong>Content:</strong> {projection.map.notes.length} public notes; {projection.map.tokens?.length ?? 0} visible tokens. Review Audience & secrets in Edit for publication changes.</li>
          <li><strong>Player window:</strong> Starts blank. Only Show this level publishes. Local trusted browser, not remote multiplayer.</li>
        </ul>
        <button onClick={() => setPreview(p => !p)}>{preview ? 'Close player preview' : 'Player preview'}</button>
        <label className="session-confirm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I reviewed visibility and public content. Manual-fog play is intentional if no sight source exists.</label>
        <button className="session-primary" disabled={!confirmed || busy || !!error} onClick={async () => {
          if (startLock.current || !source?.projectId || !source.revision) return;
          startLock.current = true;
          setBusy(true);
          const record = newSession(project, source.projectId, source.revision);
          try {
            const saved = await saveSession(record, null);
            navigate({ session: saved.id });
          } catch (failure) { setOriginal(record); setError(errorMessage(failure)); setBusy(false); startLock.current = false; }
        }}>{busy ? 'Starting session...' : 'Start session'}</button>
      </section>
      {preview && <PlayerPreview projection={projection} />}
      <section className="session-card"><h2>Continue a session</h2>
        <p>Undo is available during this visit only. Source and named checkpoints survive reloads.</p>
        {sessions.length === 0 && <p>No sessions for this source map yet.</p>}
        {sessions.map(item => <article className="session-saved-row" key={item.id}>
          {item.record ? <><div><strong>{item.record.progress.project.name}</strong>
            <p>{item.record.status} / {new Date(item.record.updatedAt).toLocaleString()} / round {item.record.progress.round}</p></div>
            <button onClick={() => navigate({ session: item.id })}>Open session</button></> :
            <><p role="alert">{item.error}</p><button onClick={() => downloadRecoveryData(item.original, 'session-original-recovery.json')}>Download retained session</button></>}
        </article>)}
      </section>
    </>}
  </main>;
}

function RunSession({ initial }: { initial: SessionRecord }) {
  const [record, setRecord] = useState(initial);
  const recordRef = useRef(initial);
  const revision = useRef(initial.storageRevision);
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [level, setLevel] = useState(initial.progress.project.activeLevelIndex);
  const [tool, setTool] = useState<'reveal' | 'hide' | 'move' | 'measure' | 'ping'>('reveal');
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [cell, setCell] = useState({ x: 0, y: 0 });
  const [measureFrom, setMeasureFrom] = useState<{ x: number; y: number } | null>(null);
  const [notice, setNotice] = useState('');
  const [checkpointName, setCheckpointName] = useState('');
  const [preview, setPreview] = useState(false);
  const [ending, setEnding] = useState(false);
  const [history] = useState(() => new SessionHistory());
  const { open, pause, publish, live, status } = useLocalDisplay(record.id);
  const project = record.progress.project;
  const map = project.levels[level];
  const encounter = project.levels[record.progress.encounterLevel];
  const published = record.progress.publishedLevel;
  const projection = useMemo(() => published === null ? null :
    projectForAudience(project.levels[published], project.customThemes, project.customStamps), [project, published]);
  const previewProjection = useMemo(() => projectForAudience(map, project.customThemes, project.customStamps), [map, project.customThemes, project.customStamps]);
  const disabled = busy || !!error || record.status !== 'active';
  const canvas = useRef<HTMLCanvasElement>(null);

  const persist = useCallback(async (next: SessionRecord) => {
    locked.current = true;
    recordRef.current = next;
    setRecord(next);
    setBusy(true);
    setError('');
    try {
      const saved = await saveSession(next, revision.current);
      revision.current = saved.storageRevision;
      recordRef.current = saved;
      setRecord(saved);
      return true;
    } catch (failure) {
      pause();
      setError(errorMessage(failure));
      return false;
    } finally { locked.current = false; setBusy(false); }
  }, [pause]);
  const commit = (next: SessionRecord) => {
    if (locked.current || error) return;
    void persist(next);
  };
  useEffect(() => {
    if (projection && !busy && !error && record.status === 'active') publish(projection);
  }, [projection, busy, error, record.status, publish]);
  useEffect(() => {
    if (!busy && !error) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy, error]);
  useEffect(() => {
    const target = canvas.current;
    if (!target || preview) return;
    const viewport = target.parentElement;
    const draw = () => {
      const size = Math.max(1, Math.min(Math.ceil((viewport?.clientWidth ?? 800) *
        Math.min(2, window.devicePixelRatio || 1) / map.meta.width), Math.floor(4096 / Math.max(map.meta.width, map.meta.height))));
      const rendered = renderMapToCanvas(map, { tileSize: size, themeId: map.meta.theme ?? 'dungeon',
        customThemes: project.customThemes, customStamps: project.customStamps, viewMode: 'gm' });
      target.width = rendered.width;
      target.height = rendered.height;
      const context = target.getContext('2d');
      context?.drawImage(rendered, 0, 0);
      if (context) {
        context.strokeStyle = '#ff9569';
        context.lineWidth = Math.max(2, size / 16);
        context.strokeRect(cell.x * size, cell.y * size, size, size);
      }
    };
    draw();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(draw);
    if (viewport) observer?.observe(viewport);
    return () => observer?.disconnect();
  }, [map, project.customThemes, project.customStamps, cell, preview]);

  const changeMap = (next: DungeonMap, retainHistory = true) => {
    if (disabled || locked.current) return;
    if (retainHistory) history.push(level, map);
    if (next.fogEnabled && next.dynamicFogEnabled) {
      const tiles = deriveRenderableTiles(next);
      const players = computePlayerFOV(tiles, (next.tokens ?? []).filter(t => !t.hidden), project.customThemes);
      const lights = computeLightVisible(tiles, next.lightSources, project.customThemes);
      const explored = next.explored ?? next.tiles.map(row => row.map(() => false));
      next = { ...next, explored: mergeExplored(explored, new Set([...(players ?? []), ...(lights ?? [])]), next.meta.width, next.meta.height) };
    }
    commit({ ...record, progress: { ...record.progress, project: { ...project,
      levels: project.levels.map((item, index) => index === level ? next : item) } } });
  };
  const apply = (x: number, y: number) => {
    if (disabled || locked.current) return;
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= map.meta.width || y >= map.meta.height) {
      setNotice('Choose a cell inside the map.');
      return;
    }
    setCell({ x, y });
    if (tool === 'reveal' || tool === 'hide') {
      const fog = (map.fog ?? map.tiles.map(row => row.map(() => true))).map(row => [...row]);
      fog[y][x] = tool === 'hide';
      changeMap({ ...map, fog, fogEnabled: true });
      setNotice(`${tool === 'hide' ? 'Manual fog restored' : 'Cell revealed'} at ${x}, ${y}. Dynamic sight can still reveal a hidden cell.`);
    } else if (tool === 'move') {
      const selected = map.tokens?.find(t => t.id === tokenId);
      if (!selected) { setNotice('Choose a token, then its destination.'); return; }
      if (x + (selected.size ?? 1) > map.meta.width || y + (selected.size ?? 1) > map.meta.height) {
        setNotice('The token footprint must fit inside this level.'); return;
      }
      changeMap({ ...map, tokens: map.tokens?.map(t => t.id === selected.id ? { ...t, x, y } : t) });
      setNotice(`Moved ${selected.label} to ${x}, ${y}.`);
    } else if (tool === 'measure') {
      if (!measureFrom) { setMeasureFrom({ x, y }); setNotice(`Measure start: ${x}, ${y}. Choose the end cell.`); }
      else {
        setNotice(`Distance: ${Math.hypot(x - measureFrom.x, y - measureFrom.y).toFixed(2)} cells. No game-system movement rules applied.`);
        setMeasureFrom(null);
      }
    } else {
      if (!live || published !== level) { setNotice('Show this level in the connected display before pinging.'); return; }
      const pinged = projectForAudience({ ...map, markers: [...(map.markers ?? []),
        { id: Math.max(0, ...(map.markers ?? []).map(m => m.id)) + 1, x, y, shape: 'circle', color: '#ff9569', size: 1 }] },
      project.customThemes, project.customStamps);
      if ((pinged.map.markers?.length ?? 0) === (projection?.map.markers?.length ?? 0)) {
        setNotice('Ping withheld: its footprint intersects unknown geography.'); return;
      }
      publish(pinged);
      setNotice(`Ping sent at ${x}, ${y}. Clear ping removes it from the display.`);
    }
  };
  return <main className="session-workspace" aria-label="DM Run workspace">
    <header className="session-heading">
      <div><p className="session-eyebrow">RUN / TRUSTED DM WORKSPACE</p><h1>{project.name}</h1></div>
      <div className="session-actions">
        <button className="session-blank" onClick={pause}>Pause / blank now</button>
        <button onClick={open}>Open player display</button>
        <button onClick={() => setPreview(p => !p)}>{preview ? 'Close player preview' : 'Player preview'}</button>
      </div>
    </header>
    <section className={`session-display-bar ${live ? 'is-live' : ''}`} aria-label="Display status">
      <strong>{live ? 'LIVE' : 'BLANK'}</strong><p role="status">{status}</p>
      <p>{published === null ? 'No level published.' : `Publication target: ${project.levels[published].meta.name}`}</p>
      <button className="session-primary" disabled={disabled} onClick={() => {
        commit({ ...record, progress: { ...record.progress, publishedLevel: level } });
        publish(previewProjection, true);
      }}>Show this level</button>
    </section>
    <div className="session-save-line"><span role="status">{busy ? 'Saving session...' : error ? 'Session save failed. Recovery available.' : 'Session saved on this device.'}</span>
      <span>Authored map unchanged. Undo lasts for this visit only.</span>
      <button onClick={() => downloadRecoveryData(recordRef.current, 'dm-session-recovery.json')}>Download session recovery</button>
    </div>
    {error && <section className="session-error" role="alert"><p>{error}</p><p>Edits are paused. Retry a storage failure; for a conflict, download recovery before reloading.</p>
      <button disabled={busy} onClick={() => { if (!locked.current) void persist(recordRef.current); }}>Retry session save</button>
      <button onClick={() => window.location.reload()}>Reload saved session</button>
    </section>}
    {record.status !== 'active' ? <section className="session-card">
      <h2>{record.status === 'saved' ? 'Session progress saved' : 'Session changes discarded'}</h2>
      <p>The authored project is unchanged. The source checkpoint and last end checkpoint are retained.</p>
      <button disabled={busy || !!error} onClick={() => { history.clear(); commit({ ...record, status: 'active' }); }}>Resume session</button>
      <button disabled={busy || !!error} onClick={() => navigate({ prepare: record.sourceProjectId })}>Back to Prepare</button>
    </section> : <>
      <section className="session-inspection">
        <label>Inspect DM level <select aria-label="Inspect DM level" value={level} disabled={busy} onChange={e => {
          setLevel(Number(e.target.value)); setCell({ x: 0, y: 0 }); setTokenId(null); setMeasureFrom(null);
          setNotice('Inspecting another level does not change the player display.');
        }}>{project.levels.map((item, index) => <option key={index} value={index}>{item.meta.name}</option>)}</select></label>
        <p>Inspection is private. Use Show this level to change the player view.</p>
      </section>
      {preview ? <><p className="session-preview-label">DM preview of the inspected level. This does not publish it.</p><PlayerPreview projection={previewProjection} /></> :
        <div className="session-run-grid">
          <section className="session-card session-tools" aria-label="Routine play actions">
            <h2>At the table</h2>
            <div className="session-tool-buttons">{(['reveal', 'hide', 'move', 'measure', 'ping'] as const).map(value =>
              <button key={value} aria-pressed={tool === value} disabled={disabled} onClick={() => { setTool(value); setMeasureFrom(null); }}>
                {{ reveal: 'Reveal cell', hide: 'Hide cell', move: 'Move token', measure: 'Measure', ping: 'Ping' }[value]}
              </button>)}</div>
            {tool === 'move' && <label>Token <select aria-label="Session token" value={tokenId ?? ''} onChange={e => setTokenId(Number(e.target.value))}>
              <option value="" disabled>Choose token</option>{(map.tokens ?? []).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select></label>}
            <p>Click a cell or enter a destination. Coordinates start at zero.</p>
            <form onSubmit={event => { event.preventDefault(); apply(cell.x, cell.y); }}>
              <label>Cell X <input type="number" min={0} max={map.meta.width - 1} required value={cell.x} onChange={e => setCell(c => ({ ...c, x: Number(e.target.value) }))} /></label>
              <label>Cell Y <input type="number" min={0} max={map.meta.height - 1} required value={cell.y} onChange={e => setCell(c => ({ ...c, y: Number(e.target.value) }))} /></label>
              <button disabled={disabled} type="submit">Apply to cell</button>
            </form>
            <button disabled={disabled || !history.has(level)} onClick={() => {
              const prior = history.pop(level);
              if (prior) changeMap(prior, false);
            }}>Undo session map action</button>
            <button disabled={!live} onClick={() => { if (projection) publish(projection); }}>Clear ping</button>
            <p role="status">{notice}</p>
          </section>
          <section className="session-map-panel" aria-label="Private DM map">
            <div className="session-map-caption"><strong>{map.meta.name}</strong><span>DM ONLY / {map.meta.width} x {map.meta.height}</span></div>
            <div className="session-map-scroll" tabIndex={0} role="region" aria-label="DM map viewport">
              <canvas ref={canvas} aria-label={`Private DM map: ${map.meta.name}. Use cell controls for keyboard actions.`} role="img"
                onClick={event => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  apply(Math.floor((event.clientX - rect.left) / rect.width * map.meta.width),
                    Math.floor((event.clientY - rect.top) / rect.height * map.meta.height));
                }} />
            </div>
          </section>
          <section className="session-card session-encounter" aria-label="Session encounter">
            <p className="session-eyebrow">ENCOUNTER / RULES NEUTRAL</p>
            <h2>Round {record.progress.round}</h2>
            <p>Current turn: {encounter.tokens?.find(t => t.id === encounter.initiative?.[record.progress.turn])?.label ?? 'No entry on this level'}</p>
            <p>Turn {record.progress.turn + 1}. Encounter: {encounter.meta.name}. DM inspection does not change the encounter.</p>
            <div className="session-actions">
              <button disabled={disabled || !encounter.initiative?.length || (record.progress.round === 1 && record.progress.turn === 0)} onClick={() => commit({ ...record, progress: stepTurn(record.progress, -1) })}>Previous turn</button>
              <button disabled={disabled || !encounter.initiative?.length} onClick={() => commit({ ...record, progress: stepTurn(record.progress, 1) })}>Next turn</button>
            </div>
            <ol>{encounter.initiative?.map((id, index) => <li key={id} aria-current={index === record.progress.turn ? 'step' : undefined}>{encounter.tokens?.find(t => t.id === id)?.label}</li>)}</ol>
            {!encounter.initiative?.length && <p>Add party tokens and initiative in Edit before starting a new session.</p>}
            {level !== record.progress.encounterLevel && <button disabled={disabled || !map.initiative?.length} onClick={() => {
              if (window.confirm('Start the encounter on the inspected level at round 1, turn 1?')) commit({ ...record,
                progress: { ...record.progress, encounterLevel: level, round: 1, turn: 0 } });
            }}>Start encounter on this level</button>}
            <details><summary>Private notes</summary>{map.notes.map(note => <article key={note.id}><h3>{note.label}</h3><p>{note.description}</p></article>)}</details>
          </section>
        </div>}
      <section className="session-card session-checkpoints"><h2>Session checkpoints</h2>
        <p>Source checkpoint retained permanently. Keep up to {MAX_SESSION_CHECKPOINTS} named checkpoints; download and explicitly delete one when full.</p>
        <form onSubmit={event => { event.preventDefault(); if (disabled || locked.current) return;
          commit({ ...record, checkpoints: [...record.checkpoints, { id: crypto.randomUUID(), label: checkpointName.trim(),
            createdAt: new Date().toISOString(), progress: structuredClone(record.progress) }] }); setCheckpointName('');
        }}>
          <label>Checkpoint name <input required maxLength={100} value={checkpointName} onChange={e => setCheckpointName(e.target.value)} /></label>
          <button disabled={disabled || !checkpointName.trim() || record.checkpoints.length >= MAX_SESSION_CHECKPOINTS}>Save checkpoint</button>
        </form>
        {record.checkpoints.map(checkpoint => <article className="session-saved-row" key={checkpoint.id}>
          <strong>{checkpoint.label}</strong>
          <button disabled={disabled} onClick={() => {
            if (!window.confirm(`Restore "${checkpoint.label}"? Current progress will be retained as the last recovery checkpoint.`)) return;
            pause(); history.clear(); setLevel(checkpoint.progress.project.activeLevelIndex); setCell({ x: 0, y: 0 }); setTokenId(null);
            commit({ ...record, endCheckpoint: structuredClone(record.progress), progress: structuredClone(checkpoint.progress) });
          }}>Restore checkpoint</button>
          <button onClick={() => downloadRecoveryData(checkpoint, 'session-checkpoint.json')}>Download checkpoint</button>
          <button disabled={disabled} onClick={() => {
            if (window.confirm(`Delete session checkpoint "${checkpoint.label}"? Download it first if needed.`)) commit({ ...record, checkpoints: record.checkpoints.filter(c => c.id !== checkpoint.id) });
          }}>Delete checkpoint</button>
        </article>)}
      </section>
      <footer className="session-card">
        <button disabled={disabled} onClick={() => { pause(); setEnding(true); }}>End session</button>
        <button disabled={disabled} onClick={() => { pause(); navigate({ prepare: record.sourceProjectId }); }}>Leave and resume later</button>
        {ending && <section aria-label="End session choices">
          <h2>How should this session end?</h2>
          <p>Save retains play progress separately. Discard restores the source checkpoint from session start. Neither option changes the authored project. The last pre-end state is retained for recovery.</p>
          <button disabled={disabled} onClick={() => { pause(); history.clear(); commit(endSession(record, false)); setEnding(false); }}>Save session progress</button>
          <button disabled={disabled} onClick={() => {
            if (window.confirm('Discard all session changes since the original session start? The authored map stays unchanged and the pre-end recovery is retained.')) {
              pause(); history.clear(); commit(endSession(record, true)); setEnding(false);
            }
          }}>Discard changes since session start</button>
          <button onClick={() => setEnding(false)}>Keep running</button>
        </section>}
      </footer>
    </>}
    {record.endCheckpoint && <details className="session-card"><summary>Last recovery checkpoint</summary>
      <p>Retained before the last restore or end action. Download before replacing it with another restore or end.</p>
      <button onClick={() => downloadRecoveryData(record.endCheckpoint, 'session-last-recovery.json')}>Download last recovery checkpoint</button>
    </details>}
  </main>;
}
